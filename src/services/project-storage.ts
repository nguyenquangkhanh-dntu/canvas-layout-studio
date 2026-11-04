import { createStore, del, get, set, type UseStore } from 'idb-keyval';
import type { Project } from '../models/project';
import { validateProject } from './import-export';

/**
 * Lưu trữ trong trình duyệt: ưu tiên IndexedDB (dung lượng lớn, phù hợp ảnh base64),
 * tự chuyển sang localStorage nếu IndexedDB không khả dụng (ví dụ chế độ riêng tư hạn chế).
 */

export interface ProjectSummary {
  id: string;
  name: string;
  updatedAt: string;
  moduleCount: number;
}

interface KV {
  get<T>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<void>;
  del(key: string): Promise<void>;
}

function idbKV(store: UseStore): KV {
  return {
    get: <T,>(k: string) => get<T>(k, store),
    set: (k, v) => set(k, v, store),
    del: (k) => del(k, store),
  };
}

const lsKV: KV = {
  async get<T>(k: string) {
    const raw = localStorage.getItem(`cls:${k}`);
    return raw ? (JSON.parse(raw) as T) : undefined;
  },
  async set(k, v) {
    localStorage.setItem(`cls:${k}`, JSON.stringify(v));
  },
  async del(k) {
    localStorage.removeItem(`cls:${k}`);
  },
};

let kvPromise: Promise<KV> | null = null;

function kv(): Promise<KV> {
  if (!kvPromise) {
    kvPromise = (async () => {
      try {
        if (typeof indexedDB === 'undefined') throw new Error('no idb');
        const store = createStore('canvas-layout-studio', 'kv');
        const k = idbKV(store);
        await k.set('__probe', 1);
        return k;
      } catch {
        return lsKV;
      }
    })();
  }
  return kvPromise;
}

export async function storageKind(): Promise<'indexeddb' | 'localstorage'> {
  return (await kv()) === lsKV ? 'localstorage' : 'indexeddb';
}

export async function loadIndex(): Promise<ProjectSummary[]> {
  return (await (await kv()).get<ProjectSummary[]>('index')) ?? [];
}

export async function saveProject(project: Project, moduleCount: number): Promise<void> {
  const store = await kv();
  await store.set(`project:${project.id}`, project);
  const index = (await loadIndex()).filter((p) => p.id !== project.id);
  index.unshift({ id: project.id, name: project.name, updatedAt: project.updatedAt, moduleCount });
  await store.set('index', index.slice(0, 100));
  await store.set('last', project.id);
}

export async function loadProject(id: string): Promise<Project | null> {
  const raw = await (await kv()).get<unknown>(`project:${id}`);
  if (!raw) return null;
  const res = validateProject(raw);
  return res.ok ? res.project : null;
}

export async function loadLastProject(): Promise<Project | null> {
  const id = await (await kv()).get<string>('last');
  return id ? loadProject(id) : null;
}

export async function deleteProject(id: string): Promise<void> {
  const store = await kv();
  await store.del(`project:${id}`);
  await store.set('index', (await loadIndex()).filter((p) => p.id !== id));
}

export async function loadValue<T>(key: string): Promise<T | undefined> {
  return (await kv()).get<T>(key);
}

export async function saveValue(key: string, value: unknown): Promise<void> {
  await (await kv()).set(key, value);
}

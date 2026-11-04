import { create } from 'zustand';
import { produce, type Draft } from 'immer';
import type { LayoutNode, ModuleType, NodeProps, PropValue } from '../models/node';
import { createEmptyProject, type PageSettings, type Project } from '../models/project';
import type { StyleProps } from '../models/style';
import { BOX_STYLE_KEYS, TYPE_STYLE_KEYS, applyThemeToPage, applyThemeToTree, getTheme, themeStyleFor } from '../models/presets';
import { COLUMN_MIN_WIDTH, createNode, getDef } from '../modules/registry';
import { canDrop, cloneWithNewIds, insertAt, locate, moveTo, removeById, subtreeDepth, walk } from './tree';
import { uid } from '../utils/id';
import type { CourseData } from '../models/course';
import { calloutStyle } from '../modules/defs/learning';

/* ------------------------------------------------------------------ Kiểu dữ liệu */

export interface NodeInfo {
  node: LayoutNode;
  parentId: string | null;
  depth: number;
  index: number;
}

export interface Template {
  id: string;
  name: string;
  node: LayoutNode;
  createdAt: string;
}

export interface StylePreset {
  id: string;
  name: string;
  style: StyleProps;
}

interface Snapshot {
  nodes: LayoutNode[];
  page: PageSettings;
  course: CourseData;
  name: string;
}

export type SaveStatus = 'saved' | 'unsaved' | 'saving' | 'error';
export type Device = 'desktop' | 'tablet' | 'mobile';
export const DEVICE_WIDTH: Record<Device, number> = { desktop: 1000, tablet: 768, mobile: 390 };

export interface CommitOptions {
  /** Các thao tác liên tiếp có cùng key (vd. gõ chữ, kéo thanh trượt) được gộp thành một bước lịch sử. */
  key?: string;
  select?: string | null;
}

export interface EditorState {
  project: Project;
  index: Map<string, NodeInfo>;
  selectedId: string | null;
  hoveredId: string | null;

  past: Snapshot[];
  future: Snapshot[];
  lastCommit: { key?: string; at: number };

  clipboard: LayoutNode | null;
  styleClipboard: StyleProps | null;

  saveStatus: SaveStatus;
  saveError?: string;
  /** Tăng mỗi khi dự án thay đổi; dùng cho tự động lưu. */
  revision: number;

  templates: Template[];
  stylePresets: StylePreset[];

  // Giao diện
  mode: 'design' | 'preview';
  device: Device;
  zoom: number;
  fitZoom: boolean;
  leftOpen: boolean;
  rightOpen: boolean;
  leftTab: 'library' | 'layers';
  /** Mô phỏng cách Canvas lọc CSS ngay trong bản xem trước. */
  previewCanvasSafe: boolean;
}

export const HISTORY_LIMIT = 150;
const COALESCE_MS = 1200;

/* ------------------------------------------------------------------ Hàm trợ giúp */

export function buildIndex(nodes: LayoutNode[]): Map<string, NodeInfo> {
  const map = new Map<string, NodeInfo>();
  const visit = (list: LayoutNode[], parentId: string | null, depth: number) => {
    list.forEach((node, index) => {
      map.set(node.id, { node, parentId, depth, index });
      if (node.children) visit(node.children, node.id, depth + 1);
    });
  };
  visit(nodes, null, 1);
  return map;
}

function snapshot(p: Project): Snapshot {
  return { nodes: p.nodes, page: p.page, course: p.course, name: p.name };
}

function applyStylePatch(style: Draft<StyleProps>, patch: Partial<StyleProps>) {
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) delete (style as Record<string, unknown>)[k];
    else (style as Record<string, unknown>)[k] = v;
  }
}

function setIn(obj: Record<string, unknown>, path: string, value: unknown) {
  const parts = path.split('.');
  let cur: Record<string, unknown> | unknown[] = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    const next = (cur as Record<string, unknown>)[key];
    if (typeof next !== 'object' || next === null) return;
    cur = next as Record<string, unknown>;
  }
  (cur as Record<string, unknown>)[parts[parts.length - 1]] = value;
}

/** Vị trí chèn mặc định khi nhấp vào module trong thư viện hoặc dán. */
export function defaultInsertTarget(state: EditorState, type: ModuleType, depth = 1): { parentId: string | null; index: number } {
  const nodes = state.project.nodes;
  const sel = state.selectedId ? state.index.get(state.selectedId) : undefined;
  if (sel) {
    const n = sel.node;
    if (n.type === 'columns' && n.children?.length) {
      const col = n.children[0];
      if (canDrop(nodes, col.id, { type, depth }).ok) return { parentId: col.id, index: col.children?.length ?? 0 };
    }
    if (getDef(n.type).isContainer && canDrop(nodes, n.id, { type, depth }).ok) {
      return { parentId: n.id, index: n.children?.length ?? 0 };
    }
    if (canDrop(nodes, sel.parentId, { type, depth }).ok) return { parentId: sel.parentId, index: sel.index + 1 };
  }
  return { parentId: null, index: nodes.length };
}

/* ------------------------------------------------------------------ Store */

export interface EditorActions {
  loadProject(project: Project, opts?: { keepHistory?: boolean; status?: SaveStatus }): void;
  newProject(name?: string): void;
  setName(name: string): void;
  commit(recipe: (draft: Draft<Project>) => void, opts?: CommitOptions): boolean;

  select(id: string | null): void;
  hover(id: string | null): void;

  insertNode(node: LayoutNode, parentId: string | null, index: number): { ok: boolean; reason?: string };
  addNode(node: LayoutNode): { ok: boolean; reason?: string };
  moveNode(id: string, parentId: string | null, index: number): { ok: boolean; reason?: string };
  moveBy(id: string, delta: -1 | 1): void;
  removeNode(id: string): boolean;
  duplicateNode(id: string): string | null;
  updateProps(id: string, patch: NodeProps, opts?: CommitOptions): void;
  setPropPath(id: string, path: string, value: PropValue, opts?: CommitOptions): void;
  updateStyle(id: string, patch: Partial<StyleProps>, opts?: CommitOptions): void;
  rename(id: string, name: string): void;
  toggleHidden(id: string): void;
  toggleLocked(id: string): void;
  setColumns(id: string, patch: { count?: number; ratios?: number[]; minColWidth?: number; stackOnMobile?: boolean; valign?: string }): void;
  setPage(patch: Partial<PageSettings>, opts?: CommitOptions): void;
  /** Sửa dữ liệu khóa học dùng chung (một bước lịch sử, hoặc gộp theo key). */
  updateCourse(recipe: (course: Draft<CourseData>) => void, opts?: CommitOptions): void;
  updatePageStyle(patch: Partial<StyleProps>, opts?: CommitOptions): void;

  copy(id?: string): boolean;
  paste(): boolean;
  copyStyle(id: string): void;
  pasteStyle(id: string): void;
  resetStyle(id: string): void;
  applyTheme(themeId: string, scope: 'node' | 'page', nodeId?: string): void;

  saveTemplate(id: string, name: string): Template | null;
  deleteTemplate(id: string): void;
  saveStylePreset(name: string, nodeId: string): StylePreset | null;
  deleteStylePreset(id: string): void;
  applyStylePreset(presetId: string, nodeId: string): void;
  setTemplates(t: Template[]): void;
  setStylePresets(p: StylePreset[]): void;

  undo(): void;
  redo(): void;

  setSaveStatus(s: SaveStatus, error?: string): void;
  setUi(patch: Partial<Pick<EditorState, 'mode' | 'device' | 'zoom' | 'fitZoom' | 'leftOpen' | 'rightOpen' | 'leftTab' | 'previewCanvasSafe'>>): void;
}

export type Store = EditorState & EditorActions;

function initialState(): EditorState {
  const project = createEmptyProject();
  return {
    project,
    index: buildIndex(project.nodes),
    selectedId: null,
    hoveredId: null,
    past: [],
    future: [],
    lastCommit: { at: 0 },
    clipboard: null,
    styleClipboard: null,
    saveStatus: 'saved',
    revision: 0,
    templates: [],
    stylePresets: [],
    mode: 'design',
    device: 'desktop',
    zoom: 1,
    fitZoom: true,
    leftOpen: true,
    rightOpen: true,
    leftTab: 'library',
    previewCanvasSafe: false,
  };
}

export const useEditor = create<Store>()((set, get) => ({
  ...initialState(),

  loadProject(project, opts) {
    set((s) => ({
      project,
      index: buildIndex(project.nodes),
      selectedId: null,
      hoveredId: null,
      past: opts?.keepHistory ? s.past : [],
      future: opts?.keepHistory ? s.future : [],
      lastCommit: { at: 0 },
      saveStatus: opts?.status ?? 'unsaved',
      revision: s.revision + 1,
    }));
  },

  newProject(name) {
    get().loadProject(createEmptyProject(name));
  },

  setName(name) {
    get().commit((d) => { d.name = name.slice(0, 160) || 'Bài học'; }, { key: 'project-name' });
  },

  commit(recipe, opts = {}) {
    const s = get();
    const next = produce(s.project, recipe);
    if (next === s.project) return false;
    const now = Date.now();
    const coalesce = !!opts.key && opts.key === s.lastCommit.key && now - s.lastCommit.at < COALESCE_MS;
    const past = coalesce ? s.past : [...s.past, snapshot(s.project)].slice(-HISTORY_LIMIT);
    const index = buildIndex(next.nodes);
    let selectedId = opts.select !== undefined ? opts.select : s.selectedId;
    if (selectedId && !index.has(selectedId)) selectedId = null;
    set({
      project: { ...next, updatedAt: new Date().toISOString() },
      index,
      past,
      future: [],
      lastCommit: { key: opts.key, at: now },
      selectedId,
      saveStatus: 'unsaved',
      revision: s.revision + 1,
    });
    return true;
  },

  select(id) {
    if (get().selectedId !== id) set({ selectedId: id, lastCommit: { at: 0 } });
  },
  hover(id) {
    if (get().hoveredId !== id) set({ hoveredId: id });
  },

  insertNode(node, parentId, index) {
    const check = canDrop(get().project.nodes, parentId, { type: node.type, depth: subtreeDepth(node) });
    if (!check.ok) return check;
    get().commit((d) => { insertAt(d.nodes as LayoutNode[], parentId, index, node); }, { select: node.id });
    return { ok: true };
  },

  addNode(node) {
    const t = defaultInsertTarget(get(), node.type, subtreeDepth(node));
    return get().insertNode(node, t.parentId, t.index);
  },

  moveNode(id, parentId, index) {
    const s = get();
    const info = s.index.get(id);
    if (!info) return { ok: false, reason: 'Không tìm thấy module.' };
    if (info.node.locked) return { ok: false, reason: 'Module đang bị khóa.' };
    if (getDef(info.node.type).draggable === false) return { ok: false, reason: 'Không thể di chuyển cột riêng lẻ.' };
    const check = canDrop(s.project.nodes, parentId, { type: info.node.type, depth: subtreeDepth(info.node), id });
    if (!check.ok) return check;
    get().commit((d) => { moveTo(d.nodes as LayoutNode[], id, parentId, index); }, { select: id });
    return { ok: true };
  },

  moveBy(id, delta) {
    const info = get().index.get(id);
    if (!info || info.node.locked) return;
    const target = delta < 0 ? info.index - 1 : info.index + 2;
    const siblings = info.parentId ? get().index.get(info.parentId)!.node.children! : get().project.nodes;
    if (target < 0 || target > siblings.length) return;
    get().moveNode(id, info.parentId, target);
  },

  removeNode(id) {
    const info = get().index.get(id);
    if (!info || info.node.locked) return false;
    if (info.node.type === 'column') return false;
    return get().commit((d) => { removeById(d.nodes as LayoutNode[], id); }, { select: null });
  },

  duplicateNode(id) {
    const info = get().index.get(id);
    if (!info || info.node.type === 'column') return null;
    const copy = cloneWithNewIds(info.node);
    copy.name = `${info.node.name} (bản sao)`.slice(0, 120);
    copy.locked = false;
    const ok = get().commit((d) => { insertAt(d.nodes as LayoutNode[], info.parentId, info.index + 1, copy); }, { select: copy.id });
    return ok ? copy.id : null;
  },

  updateProps(id, patch, opts) {
    get().commit((d) => {
      const loc = locate(d.nodes as LayoutNode[], id);
      if (!loc || loc.node.locked) return;
      Object.assign(loc.node.props, patch);
    }, { key: opts?.key, select: opts?.select });
  },

  setPropPath(id, path, value, opts) {
    get().commit((d) => {
      const loc = locate(d.nodes as LayoutNode[], id);
      if (!loc || loc.node.locked) return;
      setIn(loc.node.props as Record<string, unknown>, path, value);
    }, { key: opts?.key });
  },

  updateStyle(id, patch, opts) {
    get().commit((d) => {
      const loc = locate(d.nodes as LayoutNode[], id);
      if (!loc || loc.node.locked) return;
      applyStylePatch(loc.node.style as Draft<StyleProps>, patch);
    }, { key: opts?.key });
  },

  rename(id, name) {
    get().commit((d) => {
      const loc = locate(d.nodes as LayoutNode[], id);
      if (loc) loc.node.name = name.slice(0, 120);
    }, { key: `rename:${id}` });
  },

  toggleHidden(id) {
    get().commit((d) => {
      const loc = locate(d.nodes as LayoutNode[], id);
      if (!loc) return;
      if (loc.node.hidden) delete loc.node.hidden;
      else loc.node.hidden = true;
    });
  },

  toggleLocked(id) {
    get().commit((d) => {
      const loc = locate(d.nodes as LayoutNode[], id);
      if (!loc) return;
      if (loc.node.locked) delete loc.node.locked;
      else loc.node.locked = true;
    });
  },

  setColumns(id, patch) {
    get().commit((d) => {
      const loc = locate(d.nodes as LayoutNode[], id);
      if (!loc || loc.node.type !== 'columns' || loc.node.locked) return;
      const n = loc.node;
      const props = n.props as Record<string, PropValue>;
      const children = (n.children ??= []);
      const count = Math.min(4, Math.max(2, Math.round(patch.count ?? (props.count as number) ?? children.length)));
      if (patch.count !== undefined && patch.minColWidth === undefined && count !== props.count) {
        props.minColWidth = COLUMN_MIN_WIDTH[count];
      }
      // Thêm cột còn thiếu.
      while (children.length < count) {
        children.push(createNode('column', { name: `Cột ${children.length + 1}`, props: { ratio: 1, minWidth: 240, stack: true } }) as Draft<LayoutNode>);
      }
      // Bớt cột: dồn nội dung của cột bị bỏ vào cột cuối cùng còn lại, không làm mất module nào.
      if (children.length > count) {
        const removed = children.splice(count);
        const last = children[count - 1];
        last.children ??= [];
        for (const col of removed) last.children.push(...(col.children ?? []));
      }
      props.count = count;
      const oldRatios = Array.isArray(props.ratios) ? (props.ratios as number[]) : [];
      const ratios = (patch.ratios ?? oldRatios).slice(0, count);
      while (ratios.length < count) ratios.push(1);
      props.ratios = ratios.map((r) => (Number.isFinite(r) && r > 0 ? Math.min(12, r) : 1));
      if (patch.minColWidth !== undefined) props.minColWidth = patch.minColWidth;
      if (patch.stackOnMobile !== undefined) props.stackOnMobile = patch.stackOnMobile;
      if (patch.valign !== undefined) props.valign = patch.valign;
      children.forEach((c, i) => {
        c.props.ratio = (props.ratios as number[])[i];
        c.props.minWidth = props.minColWidth as number;
        c.props.stack = props.stackOnMobile !== false;
      });
    }, { key: patch.minColWidth !== undefined ? `cols:${id}:min` : undefined });
  },

  setPage(patch, opts) {
    get().commit((d) => { Object.assign(d.page, patch); }, { key: opts?.key });
  },

  updateCourse(recipe, opts) {
    get().commit((d) => { recipe(d.course); }, { key: opts?.key });
  },

  updatePageStyle(patch, opts) {
    get().commit((d) => { applyStylePatch(d.page.style as Draft<StyleProps>, patch); }, { key: opts?.key });
  },

  copy(id) {
    const target = id ?? get().selectedId;
    const info = target ? get().index.get(target) : undefined;
    if (!info || info.node.type === 'column') return false;
    set({ clipboard: JSON.parse(JSON.stringify(info.node)) });
    return true;
  },

  paste() {
    const clip = get().clipboard;
    if (!clip) return false;
    const copy = cloneWithNewIds(clip);
    copy.locked = false;
    return get().addNode(copy).ok;
  },

  copyStyle(id) {
    const info = get().index.get(id);
    if (info) set({ styleClipboard: JSON.parse(JSON.stringify(info.node.style)) });
  },

  pasteStyle(id) {
    const style = get().styleClipboard;
    if (!style) return;
    get().commit((d) => {
      const loc = locate(d.nodes as LayoutNode[], id);
      if (!loc || loc.node.locked) return;
      // Chỉ dán phong cách (nền, viền, bóng, chữ...), giữ kích thước và vị trí của module đích.
      for (const k of [...BOX_STYLE_KEYS, ...TYPE_STYLE_KEYS, 'borderLeftWidth', 'borderLeftColor'] as (keyof StyleProps)[]) {
        const v = style[k];
        if (v === undefined) delete (loc.node.style as Record<string, unknown>)[k];
        else (loc.node.style as Record<string, unknown>)[k] = JSON.parse(JSON.stringify(v));
      }
    });
  },

  resetStyle(id) {
    get().commit((d) => {
      const loc = locate(d.nodes as LayoutNode[], id);
      if (!loc || loc.node.locked) return;
      let base = getDef(loc.node.type).defaultStyle();
      if (loc.node.type === 'callout') {
        // Callout: khôi phục màu theo biến thể hiện tại.
        base = { ...base, ...calloutStyle(String(loc.node.props.variant ?? 'callout')) };
      }
      loc.node.style = base as Draft<StyleProps>;
    });
  },

  applyTheme(themeId, scope, nodeId) {
    const theme = getTheme(themeId);
    if (!theme) return;
    if (scope === 'node' && nodeId) {
      get().commit((d) => {
        const loc = locate(d.nodes as LayoutNode[], nodeId);
        if (!loc || loc.node.locked) return;
        loc.node.style = themeStyleFor(loc.node as LayoutNode, theme) as Draft<StyleProps>;
      });
    } else {
      get().commit((d) => {
        d.page = applyThemeToPage(d.page as PageSettings, theme) as Draft<PageSettings>;
        applyThemeToTree(d.nodes as LayoutNode[], theme);
      });
    }
  },

  saveTemplate(id, name) {
    const info = get().index.get(id);
    if (!info || info.node.type === 'column') return null;
    const t: Template = { id: uid('tpl'), name: name.trim().slice(0, 80) || info.node.name, node: JSON.parse(JSON.stringify(info.node)), createdAt: new Date().toISOString() };
    set({ templates: [t, ...get().templates] });
    return t;
  },
  deleteTemplate(id) {
    set({ templates: get().templates.filter((t) => t.id !== id) });
  },
  saveStylePreset(name, nodeId) {
    const info = get().index.get(nodeId);
    if (!info) return null;
    const style: StyleProps = {};
    for (const k of [...BOX_STYLE_KEYS, ...TYPE_STYLE_KEYS] as (keyof StyleProps)[]) {
      if (info.node.style[k] !== undefined) (style as Record<string, unknown>)[k] = JSON.parse(JSON.stringify(info.node.style[k]));
    }
    const p: StylePreset = { id: uid('sty'), name: name.trim().slice(0, 60) || 'Phong cách của tôi', style };
    set({ stylePresets: [p, ...get().stylePresets] });
    return p;
  },
  deleteStylePreset(id) {
    set({ stylePresets: get().stylePresets.filter((p) => p.id !== id) });
  },
  applyStylePreset(presetId, nodeId) {
    const preset = get().stylePresets.find((p) => p.id === presetId);
    if (!preset) return;
    get().commit((d) => {
      const loc = locate(d.nodes as LayoutNode[], nodeId);
      if (!loc || loc.node.locked) return;
      for (const k of [...BOX_STYLE_KEYS, ...TYPE_STYLE_KEYS] as (keyof StyleProps)[]) {
        const v = preset.style[k];
        if (v === undefined) delete (loc.node.style as Record<string, unknown>)[k];
        else (loc.node.style as Record<string, unknown>)[k] = JSON.parse(JSON.stringify(v));
      }
    });
  },
  setTemplates(templates) { set({ templates }); },
  setStylePresets(stylePresets) { set({ stylePresets }); },

  undo() {
    const s = get();
    const prev = s.past[s.past.length - 1];
    if (!prev) return;
    const index = buildIndex(prev.nodes);
    set({
      project: { ...s.project, ...prev, updatedAt: new Date().toISOString() },
      index,
      past: s.past.slice(0, -1),
      future: [snapshot(s.project), ...s.future].slice(0, HISTORY_LIMIT),
      lastCommit: { at: 0 },
      selectedId: s.selectedId && index.has(s.selectedId) ? s.selectedId : null,
      saveStatus: 'unsaved',
      revision: s.revision + 1,
    });
  },

  redo() {
    const s = get();
    const next = s.future[0];
    if (!next) return;
    const index = buildIndex(next.nodes);
    set({
      project: { ...s.project, ...next, updatedAt: new Date().toISOString() },
      index,
      past: [...s.past, snapshot(s.project)].slice(-HISTORY_LIMIT),
      future: s.future.slice(1),
      lastCommit: { at: 0 },
      selectedId: s.selectedId && index.has(s.selectedId) ? s.selectedId : null,
      saveStatus: 'unsaved',
      revision: s.revision + 1,
    });
  },

  setSaveStatus(saveStatus, saveError) { set({ saveStatus, saveError }); },
  setUi(patch) { set(patch); },
}));

export function resetEditorForTests() {
  useEditor.setState(initialState());
}

/** Đếm số module để hiển thị trong danh sách dự án. */
export function moduleCount(nodes: LayoutNode[]): number {
  let c = 0;
  walk(nodes, () => c++);
  return c;
}

import type { LayoutNode, NodeProps, PropValue } from '../models/node';
import { SCHEMA_ID, SCHEMA_VERSION, defaultPage, type PageSettings, type Project } from '../models/project';
import type { Corners, Gradient, Shadow, Sides, SizeValue, StyleProps } from '../models/style';
import { MAX_DEPTH, canContain, hasDef } from '../modules/registry';
import { sanitizeRichHtml } from './html-sanitizer';
import { sanitizeBlockHtml } from './block-sanitizer';
import { readTable } from '../modules/defs/table';
import { safeColor, safeFontFamily, safeHref, safeImageSrc, safeNumber } from './safe-values';
import { uid } from '../utils/id';
import { DEFAULT_TYPES, defaultCourse, defaultProgressFlag, isDateKey, type CourseData, type Holiday, type LinkTarget, type Session, type SessionType } from '../models/course';

export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_NODES = 3000;

export type ValidationResult = { ok: true; project: Project; warnings: string[] } | { ok: false; errors: string[] };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/* ------------------------------------------------------------------ Style */

function size(v: unknown): SizeValue | undefined {
  if (!isObj(v)) return undefined;
  const unit = v.unit;
  if (unit !== 'px' && unit !== '%' && unit !== 'rem' && unit !== 'auto') return undefined;
  const value = safeNumber(v.value, 0, 100000);
  return value === undefined ? undefined : { value, unit };
}
function sides(v: unknown): Sides | undefined {
  if (!isObj(v)) return undefined;
  const out: Sides = {};
  for (const k of ['t', 'r', 'b', 'l'] as const) {
    const n = safeNumber(v[k], -2000, 2000);
    if (n !== undefined) out[k] = n;
  }
  return Object.keys(out).length ? out : undefined;
}
function corners(v: unknown): Corners | undefined {
  if (!isObj(v)) return undefined;
  const out: Corners = {};
  for (const k of ['tl', 'tr', 'br', 'bl'] as const) {
    const n = safeNumber(v[k], 0, 1000);
    if (n !== undefined) out[k] = n;
  }
  return Object.keys(out).length ? out : undefined;
}
function shadow(v: unknown): Shadow | undefined {
  if (!isObj(v)) return undefined;
  const preset = v.preset;
  if (!['none', 'sm', 'md', 'lg', 'custom'].includes(String(preset))) return undefined;
  return {
    preset: preset as Shadow['preset'],
    x: safeNumber(v.x, -500, 500) ?? 0,
    y: safeNumber(v.y, -500, 500) ?? 0,
    blur: safeNumber(v.blur, 0, 500) ?? 0,
    spread: safeNumber(v.spread, -500, 500) ?? 0,
    color: safeColor(v.color) ?? 'rgba(15, 23, 42, 0.16)',
  };
}
function gradient(v: unknown): Gradient | null | undefined {
  if (v === null) return null;
  if (!isObj(v)) return undefined;
  const from = safeColor(v.from), to = safeColor(v.to);
  if (!from || !to) return undefined;
  return { from, to, angle: safeNumber(v.angle, -360, 360) ?? 135 };
}
const oneOf = <T extends string>(v: unknown, list: readonly T[]): T | undefined => (list.includes(v as T) ? (v as T) : undefined);

export function normalizeStyle(raw: unknown): StyleProps {
  if (!isObj(raw)) return {};
  const s: StyleProps = {};
  for (const k of ['width', 'maxWidth', 'minWidth', 'height', 'minHeight', 'maxHeight'] as const) {
    const v = size(raw[k]);
    if (v) s[k] = v;
  }
  const set = <K extends keyof StyleProps>(k: K, v: StyleProps[K] | undefined) => { if (v !== undefined) s[k] = v; };
  set('align', oneOf(raw.align, ['left', 'center', 'right'] as const));
  set('bg', safeColor(raw.bg));
  set('gradient', gradient(raw.gradient));
  set('color', safeColor(raw.color));
  set('borderStyle', oneOf(raw.borderStyle, ['none', 'solid', 'dashed', 'dotted'] as const));
  set('borderWidth', safeNumber(raw.borderWidth, 0, 100));
  set('borderColor', safeColor(raw.borderColor));
  set('borderLeftWidth', safeNumber(raw.borderLeftWidth, 0, 100));
  set('borderLeftColor', safeColor(raw.borderLeftColor));
  set('radius', corners(raw.radius));
  set('shadow', shadow(raw.shadow));
  set('padding', sides(raw.padding));
  set('margin', sides(raw.margin));
  set('gap', safeNumber(raw.gap, 0, 500));
  set('fontFamily', safeFontFamily(raw.fontFamily));
  set('fontSize', safeNumber(raw.fontSize, 6, 200));
  set('fontWeight', safeNumber(raw.fontWeight, 100, 900));
  set('fontStyle', oneOf(raw.fontStyle, ['normal', 'italic'] as const));
  set('lineHeight', safeNumber(raw.lineHeight, 0.5, 5));
  set('letterSpacing', safeNumber(raw.letterSpacing, -20, 50));
  set('textAlign', oneOf(raw.textAlign, ['left', 'center', 'right', 'justify'] as const));
  set('paragraphSpacing', safeNumber(raw.paragraphSpacing, 0, 200));
  return s;
}

/* ------------------------------------------------------------------ Props */

function propValue(v: unknown, depth = 0): PropValue | undefined {
  if (depth > 6) return undefined;
  if (v === null || typeof v === 'boolean') return v;
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
  if (typeof v === 'string') return v.length > 20_000_000 ? undefined : v;
  if (Array.isArray(v)) return v.slice(0, 500).map((x) => propValue(x, depth + 1)).filter((x): x is PropValue => x !== undefined);
  if (isObj(v)) {
    const out: Record<string, PropValue> = {};
    for (const [k, x] of Object.entries(v).slice(0, 100)) {
      const pv = propValue(x, depth + 1);
      if (pv !== undefined) out[k] = pv;
    }
    return out;
  }
  return undefined;
}

function normalizeProps(type: string, raw: unknown): NodeProps {
  const out: NodeProps = {};
  if (!isObj(raw)) return out;
  for (const [k, v] of Object.entries(raw)) {
    const pv = propValue(v);
    if (pv !== undefined) out[k] = pv;
  }
  // Làm sạch các trường nhạy cảm theo loại module.
  if (type === 'text' && typeof out.html === 'string') out.html = sanitizeRichHtml(out.html);
  if (type === 'image' && typeof out.src === 'string') out.src = safeImageSrc(out.src) ?? '';
  if (type === 'button' && typeof out.href === 'string') out.href = safeHref(out.href) ?? '';
  if (type === 'html' && typeof out.html === 'string') out.html = sanitizeBlockHtml(out.html);
  if (type === 'table' && out.rows !== undefined) out.rows = readTable(out.rows) as unknown as PropValue;
  return out;
}

/* ------------------------------------------------------------------ Node / Project */

export function validateProject(data: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isObj(data)) return { ok: false, errors: ['Tệp không chứa đối tượng JSON hợp lệ.'] };
  if (data.schema !== SCHEMA_ID) return { ok: false, errors: ['Tệp không phải dự án Canvas LMS Layout Studio (thiếu hoặc sai trường "schema").'] };
  const version = data.version;
  if (typeof version !== 'number') return { ok: false, errors: ['Thiếu số phiên bản dữ liệu ("version").'] };
  if (version > SCHEMA_VERSION) {
    return { ok: false, errors: [`Dự án được tạo bằng phiên bản dữ liệu ${version}, mới hơn phiên bản ứng dụng hỗ trợ (${SCHEMA_VERSION}). Hãy cập nhật ứng dụng.`] };
  }
  const migrated = migrate(data);
  if (!Array.isArray(migrated.nodes)) return { ok: false, errors: ['Thiếu danh sách module ("nodes").'] };

  let count = 0;
  const ids = new Set<string>();
  const normNode = (raw: unknown, depth: number, parentType: LayoutNode['type'] | null): LayoutNode | null => {
    if (!isObj(raw)) { warnings.push('Bỏ qua một module không đúng định dạng.'); return null; }
    if (++count > MAX_NODES) { if (count === MAX_NODES + 1) errors.push(`Dự án có hơn ${MAX_NODES} module, vượt giới hạn.`); return null; }
    const type = raw.type;
    if (typeof type !== 'string' || !hasDef(type)) { warnings.push(`Bỏ qua module có loại không xác định: ${String(type)}.`); return null; }
    if (!canContain(parentType, type)) { warnings.push(`Bỏ qua module "${type}" đặt sai vị trí.`); return null; }
    if (depth > MAX_DEPTH + 1) { warnings.push('Bỏ qua module lồng quá sâu.'); return null; }
    let id = typeof raw.id === 'string' && /^[\w-]{1,64}$/.test(raw.id) ? raw.id : uid();
    if (ids.has(id)) id = uid();
    ids.add(id);
    const node: LayoutNode = {
      id,
      type,
      name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.slice(0, 120) : type,
      props: normalizeProps(type, raw.props),
      style: normalizeStyle(raw.style),
    };
    if (raw.hidden === true) node.hidden = true;
    if (raw.locked === true) node.locked = true;
    if (isObj(raw.meta) && typeof raw.meta.preset === 'string') node.meta = { preset: raw.meta.preset.slice(0, 60) };
    const isContainer = ['container', 'columns', 'column', 'grid', 'callout'].includes(type);
    if (isContainer) {
      const kids = Array.isArray(raw.children) ? raw.children : [];
      node.children = kids.map((c) => normNode(c, depth + 1, type)).filter((c): c is LayoutNode => !!c);
    }
    return node;
  };
  const nodes = migrated.nodes.map((n: unknown) => normNode(n, 1, null)).filter((n: LayoutNode | null): n is LayoutNode => !!n);
  if (errors.length) return { ok: false, errors };

  const course = normalizeCourse(migrated.course, warnings);
  const pageRaw = isObj(migrated.page) ? migrated.page : {};
  const def = defaultPage();
  const page: PageSettings = {
    style: isObj(pageRaw.style) ? normalizeStyle(pageRaw.style) : def.style,
    accent: safeColor(pageRaw.accent) ?? def.accent,
    headingColor: safeColor(pageRaw.headingColor) ?? def.headingColor,
    themeId: typeof pageRaw.themeId === 'string' ? pageRaw.themeId.slice(0, 40) : undefined,
  };
  const now = new Date().toISOString();
  const project: Project = {
    schema: SCHEMA_ID,
    version: SCHEMA_VERSION,
    id: typeof migrated.id === 'string' && /^[\w-]{1,64}$/.test(migrated.id) ? migrated.id : uid('prj'),
    name: typeof migrated.name === 'string' && migrated.name.trim() ? migrated.name.slice(0, 160) : 'Dự án nhập',
    createdAt: typeof migrated.createdAt === 'string' ? migrated.createdAt : now,
    updatedAt: typeof migrated.updatedAt === 'string' ? migrated.updatedAt : now,
    page,
    course,
    nodes,
  };
  return { ok: true, project, warnings: [...new Set(warnings)] };
}

/**
 * Nâng cấp dữ liệu từ phiên bản cũ.
 * v1 → v2: thêm dữ liệu khóa học dùng chung.
 * v2 → v3: số tiết cho buổi học, cờ "tính tiến độ" cho loại buổi, tổng số tiết (giá trị mặc định do normalizeCourse điền).
 */
function migrate(data: Record<string, unknown>): Record<string, unknown> & { nodes?: unknown } {
  const out = { ...data };
  if ((data.version as number) < 2 || !isObj(out.course)) out.course = defaultCourse();
  return out;
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');

/** Kiểm tra và làm sạch dữ liệu khóa học. */
export function normalizeCourse(raw: unknown, warnings: string[] = []): CourseData {
  const def = defaultCourse();
  if (!isObj(raw)) return def;
  const types: SessionType[] = (Array.isArray(raw.types) ? raw.types : [])
    .filter(isObj)
    .slice(0, 20)
    .map((t, i) => ({
      id: typeof t.id === 'string' && /^[\w-]{1,40}$/.test(t.id) ? t.id : `t${i}`,
      name: str(t.name, 60) || 'Loại buổi',
      color: safeColor(t.color) ?? '#1f5f8b',
      progress: typeof t.progress === 'boolean' ? t.progress : defaultProgressFlag(typeof t.id === 'string' ? t.id : ''),
    }));
  const holidays: Holiday[] = (Array.isArray(raw.holidays) ? raw.holidays : [])
    .filter(isObj)
    .filter((h) => isDateKey(h.date))
    .slice(0, 200)
    .map((h) => ({ date: h.date as string, name: str(h.name, 80) || 'Ngày nghỉ' }));
  const ids = new Set<string>();
  const rawSessions = Array.isArray(raw.sessions) ? raw.sessions : [];
  if (rawSessions.length > 1000) warnings.push('Chỉ giữ 1000 buổi học đầu tiên.');
  const sessions: Session[] = [];
  for (const x of rawSessions.slice(0, 1000)) {
    if (!isObj(x) || !isDateKey(x.date)) { warnings.push('Bỏ qua buổi học thiếu ngày hợp lệ.'); continue; }
    let id = typeof x.id === 'string' && /^[\w-]{1,64}$/.test(x.id) ? x.id : uid('s');
    if (ids.has(id)) id = uid('s');
    ids.add(id);
    const url = typeof x.url === 'string' ? safeHref(x.url) ?? '' : '';
    if (typeof x.url === 'string' && x.url && !url) warnings.push('Bỏ liên kết không an toàn trong một buổi học.');
    sessions.push({
      id,
      date: x.date as string,
      time: str(x.time, 40),
      type: typeof x.type === 'string' ? x.type.slice(0, 40) : 'bh',
      title: str(x.title, 200) || 'Buổi học',
      label: str(x.label, 30),
      tip: str(x.tip, 500),
      periods: Math.round(safeNumber(x.periods, 0, 20) ?? 0),
      url,
      target: (['auto', 'same', 'new'].includes(x.target as string) ? x.target : 'auto') as LinkTarget,
    });
  }
  const total = safeNumber(raw.totalSessions, 1, 200);
  const totalPeriods = Math.round(safeNumber(raw.totalPeriods, 0, 2000) ?? 0);
  return {
    start: isDateKey(raw.start) ? raw.start : def.start,
    end: isDateKey(raw.end) ? raw.end : def.end,
    totalSessions: total === undefined ? def.totalSessions : Math.round(total),
    totalPeriods,
    types: types.length ? types : DEFAULT_TYPES.map((t) => ({ ...t })),
    holidays,
    sessions,
  };
}

export function parseProjectJson(text: string): ValidationResult {
  if (text.length > MAX_FILE_BYTES) return { ok: false, errors: ['Tệp quá lớn (giới hạn 25 MB).'] };
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, errors: ['Tệp không phải JSON hợp lệ.'] };
  }
  return validateProject(data);
}

export function serializeProject(project: Project): string {
  return JSON.stringify({ ...project, updatedAt: new Date().toISOString() }, null, 2);
}

export function safeFileName(name: string, ext: string): string {
  const base = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^\w-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 60);
  return `${base || 'bai-hoc'}.${ext}`;
}

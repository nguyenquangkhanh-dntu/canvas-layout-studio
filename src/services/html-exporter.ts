import type { LayoutNode } from '../models/node';
import type { PageSettings, Project } from '../models/project';
import { getDef } from '../modules/registry';
import type { HChild, HNode, RenderCtx, RenderMode } from '../modules/types';
import { getProps } from '../modules/types';
import { todayKey } from '../models/course';
import { RUNTIME_SCRIPT } from './runtime-script';
import { imageDef, toEmbedUrl, videoDef } from '../modules/defs/media';
import { CANVAS_CSS, CANVAS_CSS_NOTES, CANVAS_ELEMENT_ATTRS, CANVAS_GLOBAL_ATTRS } from './canvas-whitelist';
import { cssToString, mergeCss, styleToCss, type CssMap } from './css';
import { sanitizeRichHtml } from './html-sanitizer';
import { sanitizeBlockHtml } from './block-sanitizer';
import { inlineRichHtml, richCss, richLinkVars } from './rich-style';
import { dataUrlBytes, escapeAttr, escapeHtml, isDataUrl, isExternalUrl, safeImageSrc } from './safe-values';

export type IssueLevel = 'error' | 'warning' | 'info';

export interface ExportIssue {
  level: IssueLevel;
  code: string;
  message: string;
  count: number;
  modules: string[];
}

export interface ExportOptions {
  mode: Exclude<RenderMode, 'editor'>;
  /** Chỉ xuất các module này (cùng khung gốc của trang). */
  nodeIds?: string[];
  /** Canvas: thay box-shadow (bị Canvas loại bỏ) bằng viền mảnh. */
  shadowFallback?: boolean;
  /** Class bao ngoài dùng làm phạm vi CSS (HTML độc lập/PNG). */
  scope?: string;
  /** Ngày dùng cho "hôm nay" (mặc định: ngày hiện tại). */
  today?: string;
}

export interface ExportResult {
  /** Canvas: HTML fragment. Độc lập/PNG: phần thân (không có <html>). */
  body: string;
  /** CSS (rỗng với chế độ Canvas vì toàn bộ style đã inline). */
  css: string;
  /** Tài liệu HTML đầy đủ (chỉ chế độ độc lập). */
  document: string;
  /** Có cần script tương tác (nút sao chép code) hay không. */
  hasScript: boolean;
  issues: ExportIssue[];
}

export const ROOT_CLASS = 'cls-layout-root';

/* ------------------------------------------------------------------ Thu thập cảnh báo */

class IssueBag {
  private map = new Map<string, ExportIssue>();
  add(level: IssueLevel, code: string, message: string, moduleName?: string) {
    const cur = this.map.get(code);
    if (cur) {
      cur.count++;
      if (moduleName && !cur.modules.includes(moduleName)) cur.modules.push(moduleName);
    } else {
      this.map.set(code, { level, code, message, count: 1, modules: moduleName ? [moduleName] : [] });
    }
  }
  list(): ExportIssue[] {
    const order: Record<IssueLevel, number> = { error: 0, warning: 1, info: 2 };
    return [...this.map.values()].sort((a, b) => order[a.level] - order[b.level]);
  }
}

/* ------------------------------------------------------------------ Dựng cây HNode */

function auditNode(node: LayoutNode, mode: ExportOptions['mode'], bag: IssueBag) {
  if (node.type === 'image') {
    const p = getProps(node, imageDef);
    const src = safeImageSrc(p.src);
    if (!src) {
      bag.add('warning', 'image-empty', 'Có module ảnh chưa có ảnh hoặc URL không hợp lệ; module này được bỏ qua khi xuất.', node.name);
      return;
    }
    if (!p.alt) bag.add('warning', 'image-alt', 'Ảnh chưa có văn bản thay thế (alt). Nên bổ sung để hỗ trợ trình đọc màn hình.', node.name);
    if (isDataUrl(src)) {
      if (mode === 'canvas') {
        bag.add('error', 'canvas-data-image', 'Canvas xóa ảnh nhúng dạng base64 khi lưu trang. Hãy tải ảnh lên mục Files của khóa học, sao chép URL ảnh và dán vào ô "URL ảnh".', node.name);
      } else if (dataUrlBytes(src) > 400_000) {
        bag.add('warning', 'image-large', 'Ảnh nhúng lớn hơn 400 KB làm tệp HTML nặng. Cân nhắc dùng URL hoặc giảm kích thước ảnh.', node.name);
      }
    } else if (isExternalUrl(src)) {
      bag.add('info', 'image-external', 'Ảnh lấy từ URL bên ngoài sẽ không hiển thị nếu mất kết nối hoặc URL bị xóa.', node.name);
    } else if (src.startsWith('/') && mode !== 'canvas') {
      bag.add('info', 'image-canvas-files', 'Ảnh dùng địa chỉ Files của Canvas (bắt đầu bằng /courses/...) chỉ hiện khi dán vào Canvas, không hiện trong HTML độc lập và PNG.', node.name);
    }
  }
  if (node.type === 'html') {
    const html = typeof node.props.html === 'string' ? node.props.html : '';
    if (mode === 'canvas' && /<img[^>]+src\s*=\s*["']?data:/i.test(html)) {
      bag.add('error', 'canvas-data-image', 'Canvas xóa ảnh nhúng dạng base64 khi lưu trang. Hãy tải ảnh lên mục Files của khóa học, sao chép URL ảnh và dán vào ô "URL ảnh".', node.name);
    }
    if (mode !== 'canvas' && /<img[^>]+src\s*=\s*["']?\//i.test(html)) {
      bag.add('info', 'image-canvas-files', 'Ảnh dùng địa chỉ Files của Canvas (bắt đầu bằng /courses/...) chỉ hiện khi dán vào Canvas, không hiện trong HTML độc lập và PNG.', node.name);
    }
    if (/<(script|iframe)/i.test(html)) {
      bag.add('info', 'html-block-filtered', 'Khối HTML được lọc theo danh sách Canvas khi xuất: script và sự kiện bị bỏ; khung nhúng (iframe) chỉ giữ địa chỉ https.', node.name);
    }
  }
  if (node.type === 'video') {
    const p = getProps(node, videoDef);
    if (!toEmbedUrl(p.url || '')) {
      bag.add('warning', 'video-url', 'URL video không phải YouTube hoặc Vimeo nên được xuất thành liên kết thường.', node.name);
    } else {
      bag.add('info', 'video-embed', 'Video nhúng bằng iframe: Canvas cho phép iframe nhưng quản trị viên có thể giới hạn tên miền. Hãy kiểm tra trên trang thật.', node.name);
    }
  }
  if (mode === 'canvas' && node.type === 'schedule') {
    const size = node.props.size;
    if (size === 'mini') bag.add('info', 'canvas-schedule-mini', 'Lịch học mini xuất một tháng cố định (tháng đang hiển thị), không có dòng "Buổi tới". Xuất lại khi muốn đổi tháng.', node.name);
    else bag.add('info', 'canvas-schedule', 'Trong Canvas, Lịch học hiện mọi tháng có buổi học xếp dọc, nút ‹ › là liên kết nhảy tháng; tooltip là tooltip mặc định của trình duyệt và không đánh dấu "hôm nay".', node.name);
  }
  if (mode === 'canvas' && node.type === 'progress' && node.props.basis !== 'manual') {
    bag.add('info', 'canvas-progress', 'Tiến độ khóa học trong Canvas được tính tại ngày xuất và không tự cập nhật. Xuất lại sau mỗi buổi, hoặc dùng cách tính "Thủ công".', node.name);
  }
  if (node.type === 'curriculum' && node.props.sticky === true && mode === 'canvas') {
    bag.add('info', 'canvas-sticky', 'Cột đầu của Chương trình học dùng position: sticky để giữ cố định khi cuộn ngang; hãy kiểm tra trên Canvas và ứng dụng di động.', node.name);
  }
  if (node.type === 'code' && node.props.showCopy === true && mode === 'canvas') {
    bag.add('info', 'canvas-copy-button', 'Nút "Sao chép" của Code Block chỉ có ở HTML độc lập; Canvas không chạy JavaScript trong nội dung trang.', node.name);
  }
}

export function buildTree(project: Pick<Project, 'page' | 'nodes' | 'course'>, opts: ExportOptions, bag = new IssueBag()): HNode {
  const page = project.page;
  const nodeById = new Map<string, LayoutNode>();
  const walk = (list: LayoutNode[]) => list.forEach((n) => { nodeById.set(n.id, n); if (n.children) walk(n.children); });
  walk(project.nodes);

  const ctx: RenderCtx = {
    mode: opts.mode,
    page,
    course: project.course,
    today: opts.today ?? todayKey(),
    children(node, itemStyle) {
      return (node.children ?? []).filter((c) => !c.hidden).map((c) => withItemStyle(renderNode(c), itemStyle));
    },
  };
  const renderNode = (node: LayoutNode): HNode => {
    auditNode(node, opts.mode, bag);
    return withMarker(getDef(node.type).render(node, ctx), node);
  };

  const roots = opts.nodeIds
    ? opts.nodeIds.map((id) => nodeById.get(id)).filter((n): n is LayoutNode => !!n)
    : project.nodes.filter((n) => !n.hidden);

  return {
    tag: 'div',
    attrs: { class: ROOT_CLASS },
    style: rootStyle(page),
    children: roots.map(renderNode),
  };
}

export function rootStyle(page: PageSettings): CssMap {
  return mergeCss({ display: 'flex', 'flex-direction': 'column' }, styleToCss(page.style));
}

/**
 * Class đánh dấu loại module trên phần tử gốc (Canvas giữ class, bỏ data-*),
 * để khi nhập lại HTML từ Canvas, công cụ nhận ra chính xác từng module.
 */
export const MARKER_PREFIX = 'cls-m-';

function withMarker(h: HNode, node: LayoutNode): HNode {
  if (h.tag === '#fragment') return h;
  const marks = [`${MARKER_PREFIX}${node.type}`];
  if (node.type === 'schedule' && node.props.size === 'mini') marks.push('cls-s-mini');
  if (node.type === 'callout' && typeof node.props.variant === 'string' && /^[\w-]{1,30}$/.test(node.props.variant)) marks.push(`cls-v-${node.props.variant}`);
  const cur = h.attrs?.class;
  return { ...h, attrs: { ...(h.attrs ?? {}), class: cur ? `${cur} ${marks.join(' ')}` : marks.join(' ') } };
}

function withItemStyle(h: HNode, itemStyle?: CssMap): HNode {
  if (!itemStyle || h.tag === '#fragment') return h;
  return { ...h, style: mergeCss(itemStyle, h.style) };
}

/* ------------------------------------------------------------------ Chế độ Canvas: style inline */

const TAG_MAP_CANVAS: Record<string, string> = { section: 'div', header: 'div', footer: 'div', nav: 'div', main: 'div', mark: 'span', s: 'del' };

interface FontState { family: string; size: number; lineHeight: string; style: string }

function parsePx(v: string | undefined, parent: number): number | undefined {
  if (!v) return undefined;
  const m = /^([\d.]+)(px|em|rem|%)?$/.exec(v.trim());
  if (!m) return undefined;
  const n = parseFloat(m[1]);
  if (m[2] === 'em') return n * parent;
  if (m[2] === 'rem') return n * 16;
  if (m[2] === '%') return (n / 100) * parent;
  return n;
}

function filterCanvasCss(css: CssMap | undefined, font: FontState, bag: IssueBag, opts: ExportOptions): { css: CssMap; font: FontState } {
  const out: CssMap = {};
  const next: FontState = { ...font };
  if (!css) return { css: out, font: next };
  if (css['font-family']) next.family = css['font-family'];
  const size = parsePx(css['font-size'], font.size);
  if (size !== undefined) next.size = size;
  if (css['line-height']) next.lineHeight = css['line-height'];
  if (css['font-style']) next.style = css['font-style'];

  for (const [prop, value] of Object.entries(css)) {
    if (prop === 'font-weight') continue;
    if (prop === 'box-shadow') {
      if (value !== 'none') {
        bag.add('warning', 'css:box-shadow', CANVAS_CSS_NOTES['box-shadow']);
        if (opts.shadowFallback && !css.border && !css['border-style']) out.border = '1px solid #dbe1e8';
      }
      continue;
    }
    if (CANVAS_CSS.has(prop)) out[prop] = value;
    else bag.add('warning', `css:${prop}`, CANVAS_CSS_NOTES[prop] ?? `Canvas loại bỏ thuộc tính CSS "${prop}".`);
  }
  if (css['font-weight']) {
    // Canvas không giữ font-weight, nhưng giữ thuộc tính rút gọn "font".
    delete out['font-family']; delete out['font-size']; delete out['line-height']; delete out['font-style'];
    const st = next.style === 'italic' ? 'italic ' : '';
    out.font = `${st}${css['font-weight']} ${round(next.size)}px/${next.lineHeight} ${next.family}`;
  }
  return { css: out, font: next };
}

const round = (n: number) => Math.round(n * 100) / 100;

function canvasAttrs(tag: string, attrs: Record<string, string> | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!attrs) return out;
  const allowed = CANVAS_ELEMENT_ATTRS[tag];
  for (const [k, v] of Object.entries(attrs)) {
    if (CANVAS_GLOBAL_ATTRS.has(k) || k.startsWith('aria-') || allowed?.has(k)) out[k] = v;
  }
  return out;
}

function attrsToString(attrs: Record<string, string>): string {
  return Object.entries(attrs)
    .map(([k, v]) => (v === '' ? ` ${k}` : ` ${k}="${escapeAttr(v)}"`))
    .join('');
}

const VOID = new Set(['img', 'br', 'hr', 'source', 'track', 'col', 'area', 'embed', 'param']);

function serializeCanvas(h: HChild, font: FontState, bag: IssueBag, opts: ExportOptions, page: PageSettings, indent: number, raw = false): string {
  if (typeof h === 'string') return escapeHtml(h);
  if (h.tag === '#fragment') return (h.children ?? []).map((c) => serializeCanvas(c, font, bag, opts, page, indent, raw)).join('');
  if (h.tag === 'button') return ''; // Canvas không cho <button>; nút tương tác chỉ có ở bản độc lập.
  const tag = TAG_MAP_CANVAS[h.tag] ?? h.tag;
  const { css, font: childFont } = filterCanvasCss(h.style, font, bag, opts);
  const attrs = canvasAttrs(tag, h.attrs);
  const style = cssToString(css);
  if (style) attrs.style = style;
  // Bên trong <pre> khoảng trắng có nghĩa: không xuống dòng/thụt lề khi in HTML.
  const pre = raw || tag === 'pre';
  const lead = raw ? '' : `\n${'  '.repeat(indent)}`;
  if (VOID.has(tag)) return `${lead}<${tag}${attrsToString(attrs)}>`;
  let inner: string;
  if (h.rich) {
    inner = inlineRichHtml(sanitizeRichHtml(h.rich.html), { accent: page.accent, headingColor: page.headingColor }, h.rich.paragraphSpacing, h.rich.link);
  } else if (h.raw !== undefined) {
    inner = sanitizeBlockHtml(h.raw, { forCanvas: true });
  } else {
    const kids = h.children ?? [];
    const block = !pre && kids.some((c) => typeof c !== 'string');
    inner = kids.map((c) => serializeCanvas(c, childFont, bag, opts, page, indent + 1, pre)).join('');
    if (block) inner += lead;
  }
  return `${lead}<${tag}${attrsToString(attrs)}>${inner}</${tag}>`;
}

/* ------------------------------------------------------------------ Chế độ độc lập / PNG: class CSS */

function serializeClassed(root: HNode, scope: string, page: PageSettings, mode: ExportOptions['mode']): { body: string; css: string } {
  const rules: string[] = [];
  let counter = 0;
  const ser = (h: HChild, indent: number, raw = false): string => {
    if (typeof h === 'string') return escapeHtml(h);
    if (h.tag === '#fragment') return (h.children ?? []).map((c) => ser(c, indent, raw)).join('');
    if (h.tag === 'button') {
      if (mode !== 'standalone') return '';
    }
    const attrs: Record<string, string> = { ...(h.attrs ?? {}) };
    const classes: string[] = attrs.class ? [attrs.class] : [];
    const css: CssMap = { ...(h.style ?? {}) };
    if (h.rich) {
      classes.push('cls-rt');
      css['--cls-ps'] = `${h.rich.paragraphSpacing}px`;
      Object.assign(css, richLinkVars(h.rich.link));
    }
    if (Object.keys(css).length) {
      if (h === root) {
        rules.push(`${scope} { ${cssToString(css)}; }`);
      } else {
        const cls = `c${++counter}`;
        classes.push(cls);
        rules.push(`${scope} .${cls} { ${cssToString(css)}; }`);
      }
    }
    if (classes.length) attrs.class = classes.join(' ');
    else delete attrs.class;
    const pre = raw || h.tag === 'pre';
    const lead = raw ? '' : `\n${'  '.repeat(indent)}`;
    if (VOID.has(h.tag)) return `${lead}<${h.tag}${attrsToString(attrs)}>`;
    let inner: string;
    if (h.rich) inner = sanitizeRichHtml(h.rich.html);
    else if (h.raw !== undefined) inner = sanitizeBlockHtml(h.raw);
    else {
      const kids = h.children ?? [];
      inner = kids.map((c) => ser(c, indent + 1, pre)).join('');
      if (!pre && kids.some((c) => typeof c !== 'string')) inner += lead;
    }
    return `${lead}<${h.tag}${attrsToString(attrs)}>${inner}</${h.tag}>`;
  };
  const body = ser(root, 0).trim();
  const base = [
    `${scope}, ${scope} * { box-sizing: border-box; }`,
    `${scope} img { max-width: 100%; }`,
    richCss(scope, { accent: page.accent, headingColor: page.headingColor }),
  ];
  return { body, css: [...base, ...rules].join('\n') };
}

/** Script đi kèm HTML độc lập (nút sao chép, lịch học, tiến độ). */
export const COPY_SCRIPT = RUNTIME_SCRIPT;

export function needsScript(body: string): boolean {
  return /data-cls-(copy|cal|prog)/.test(body);
}

/* ------------------------------------------------------------------ API */

export function exportProject(project: Pick<Project, 'page' | 'nodes' | 'name' | 'course'>, opts: ExportOptions): ExportResult {
  const bag = new IssueBag();
  const tree = buildTree(project, opts, bag);
  const page = project.page;
  if (!tree.children?.length) bag.add('warning', 'empty', 'Trang chưa có module nào để xuất.');

  if (opts.mode === 'canvas') {
    const ps = page.style;
    const font: FontState = {
      family: ps.fontFamily ?? 'inherit',
      size: ps.fontSize ?? 16,
      lineHeight: String(ps.lineHeight ?? 1.5),
      style: 'normal',
    };
    const body = serializeCanvas(tree, font, bag, opts, page, 0).trim();
    bag.add('info', 'canvas-test', 'Hãy dán thử vào một trang Canvas chưa xuất bản và xem lại trên máy tính lẫn điện thoại trước khi công bố cho sinh viên.');
    return { body, css: '', document: '', hasScript: false, issues: bag.list() };
  }

  const scope = opts.scope ? `.${opts.scope}` : `.${ROOT_CLASS}`;
  if (opts.scope) tree.attrs = { class: `${ROOT_CLASS} ${opts.scope}` };
  const { body, css } = serializeClassed(tree, scope, page, opts.mode);
  const hasScript = opts.mode === 'standalone' && needsScript(body);
  const title = escapeHtml(project.name || 'Bài học');
  const document =
    opts.mode === 'standalone'
      ? `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
body { margin: 0; padding: 32px 16px; background-color: #ffffff; }
${css}
</style>
</head>
<body>
${body}
${hasScript ? COPY_SCRIPT : ''}
</body>
</html>
`
      : '';
  return { body, css, document, hasScript, issues: bag.list() };
}

/** Thay CSS nội tuyến trong tài liệu độc lập bằng liên kết tới styles.css (dùng cho gói ZIP). */
export function documentWithExternalCss(project: Pick<Project, 'name'>, body: string, hasScript: boolean): string {
  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(project.name || 'Bài học')}</title>
<link rel="stylesheet" href="styles.css">
</head>
<body>
${body}
${hasScript ? COPY_SCRIPT : ''}
</body>
</html>
`;
}

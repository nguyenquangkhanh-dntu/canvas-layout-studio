import type { LayoutNode, ModuleType, NodeProps } from '../models/node';
import type { BorderStyle, Corners, Sides, StyleProps } from '../models/style';
import { createColumns, createNode, getDef, MAX_DEPTH } from '../modules/registry';
import { createCallout } from '../modules/library';
import { getCalloutVariant } from '../models/callouts';
import { miniScheduleStyle } from '../modules/defs/schedule';
import { toEmbedUrl } from '../modules/defs/media';
import { MAX_TABLE_COLS, MAX_TABLE_ROWS, type TableCell } from '../modules/defs/table';
import { sanitizeRichHtml } from './html-sanitizer';
import { sanitizeBlockHtml } from './block-sanitizer';
import { safeColor, safeHref, safeImageSrc } from './safe-values';

/**
 * Nhập HTML từ Canvas (hoặc HTML bất kỳ) thành các module của công cụ.
 *
 * 1. Đọc bằng DOMParser (trình duyệt tự sửa thẻ đóng mở sai), bỏ script/style/form và thuộc tính on*.
 * 2. Dọn mã thừa (tùy chọn): style và class của Word, đoạn trống, span lồng vô nghĩa, font-family, cỡ chữ pt.
 * 3. Trang do chính công cụ xuất ra có class đánh dấu "cls-m-<loại>" (Canvas giữ class) nên được dựng lại chính xác.
 * 4. Trang soạn tay: đoán cấu trúc (tiêu đề, đoạn văn, danh sách, ảnh, video, bảng, khối có nền/viền...).
 * 5. Phần không nhận diện được giữ nguyên trong module "Khối HTML" (đã lọc an toàn), không bỏ mất nội dung.
 */

export const MAX_IMPORT_CHARS = 2_000_000;

export interface ImportOptions {
  /** 'modules': chuyển thành module; 'raw': giữ nguyên thành một Khối HTML. */
  mode: 'modules' | 'raw';
  cleanup: boolean;
  /** Bảng dàn trang 1 hàng, 2 đến 4 ô: giữ thành Khối HTML hay chuyển thành cột. */
  layoutTables?: 'keep' | 'columns';
}

export interface ImportReport {
  /** Số module theo tên loại (Heading, Đoạn văn, Bảng...). */
  counts: [string, number][];
  modules: number;
  /** Module nhận diện chính xác nhờ class đánh dấu của công cụ. */
  exact: number;
  htmlBlocks: string[];
  warnings: string[];
  cleaned: { wordStyles: number; emptyParagraphs: number; spans: number; fonts: number; scripts: number };
}

export interface ImportResult {
  nodes: LayoutNode[];
  report: ImportReport;
  /** Gợi ý tên dự án (tiêu đề đầu tiên của trang). */
  title: string;
}

const INLINE = new Set([
  'a', 'abbr', 'acronym', 'b', 'bdo', 'big', 'br', 'cite', 'code', 'del', 'dfn', 'em', 'font', 'i', 'ins', 'kbd', 'label',
  'mark', 'q', 's', 'samp', 'small', 'span', 'strike', 'strong', 'sub', 'sup', 'time', 'tt', 'u', 'var',
]);
const TRANSPARENT = new Set(['div', 'section', 'article', 'header', 'footer', 'main', 'nav', 'center', 'body', 'aside', 'figure']);
const DROP = 'script, style, link, meta, noscript, template, object, embed, form, input, button, select, textarea, title, base, svg, canvas';
const MEDIA = 'img, iframe, table, video, audio, object, embed';
const MARK = 'cls-m-';

class Ctx {
  counts = new Map<string, number>();
  exact = 0;
  htmlBlocks: string[] = [];
  warnings = new Set<string>();
  canvasImages = 0;
  constructor(public opts: ImportOptions) {}
  count(n: LayoutNode) {
    const label = n.type === 'text' ? n.name : getDef(n.type).label;
    this.counts.set(label, (this.counts.get(label) ?? 0) + 1);
  }
}

/* ------------------------------------------------------------------ Tiện ích đọc CSS */

function decls(style: string | null): Map<string, string> {
  const m = new Map<string, string>();
  for (const d of (style ?? '').split(';')) {
    const i = d.indexOf(':');
    if (i > 0) m.set(d.slice(0, i).trim().toLowerCase(), d.slice(i + 1).trim().replace(/\s*!important$/i, ''));
  }
  return m;
}

function toPx(v: string | undefined): number | undefined {
  if (!v) return undefined;
  const m = /^(-?[\d.]+)(px|pt|em|rem)?$/i.exec(v.trim());
  if (!m) return v.trim() === '0' ? 0 : undefined;
  const n = parseFloat(m[1]);
  const u = (m[2] ?? 'px').toLowerCase();
  const px = u === 'pt' ? (n * 4) / 3 : u === 'em' || u === 'rem' ? n * 16 : n;
  return Math.round(px * 10) / 10;
}

function boxSides(v: string | undefined): Sides | undefined {
  if (!v) return undefined;
  const parts = v.trim().split(/\s+/).map(toPx);
  if (!parts.length || parts.some((x) => x === undefined)) return undefined;
  const [t, r = t, b = t, l = r] = parts as number[];
  return { t, r, b, l };
}

function parseBorder(v: string | undefined): { width?: number; style?: BorderStyle; color?: string } {
  const out: { width?: number; style?: BorderStyle; color?: string } = {};
  if (!v) return out;
  // Tách theo khoảng trắng nhưng giữ nguyên rgb(...)
  for (const tok of v.match(/rgba?\([^)]*\)|hsla?\([^)]*\)|\S+/g) ?? []) {
    if (/^(solid|dashed|dotted|none|double|groove|ridge|inset|outset)$/i.test(tok)) out.style = (['dashed', 'dotted', 'none'].includes(tok.toLowerCase()) ? tok.toLowerCase() : 'solid') as BorderStyle;
    else if (toPx(tok) !== undefined) out.width = toPx(tok);
    else if (safeColor(tok)) out.color = safeColor(tok);
  }
  return out;
}

/** Chuyển style nội tuyến của một khối thành StyleProps của công cụ (nền, chữ, viền, bo góc, khoảng cách). */
export function styleFromCss(style: string | null): StyleProps {
  const d = decls(style);
  const s: StyleProps = {};
  const bg = safeColor(d.get('background-color')) ?? (d.get('background') ? safeColor(d.get('background')!.split(/\s+/)[0]) : undefined);
  if (bg && !/^(transparent|inherit|initial)$/i.test(bg)) s.bg = bg;
  const color = safeColor(d.get('color'));
  if (color) s.color = color;
  const b = parseBorder(d.get('border'));
  const bs = d.get('border-style'), bw = toPx(d.get('border-width')), bc = safeColor(d.get('border-color'));
  if (b.style || bs) s.borderStyle = (b.style ?? (['dashed', 'dotted', 'none'].includes(bs!) ? bs : 'solid')) as BorderStyle;
  if (b.width !== undefined || bw !== undefined) s.borderWidth = b.width ?? bw;
  if (b.color || bc) s.borderColor = b.color ?? bc;
  if (s.borderWidth && !s.borderStyle) s.borderStyle = 'solid';
  const bl = parseBorder(d.get('border-left'));
  const blw = bl.width ?? toPx(d.get('border-left-width'));
  if (blw && (bl.style ?? d.get('border-left-style') ?? 'solid') !== 'none') {
    s.borderLeftWidth = blw;
    s.borderLeftColor = bl.color ?? safeColor(d.get('border-left-color')) ?? '#1f5f8b';
  }
  const r = d.get('border-radius');
  if (r) {
    const v = r.trim().split(/\s+/).map(toPx);
    if (v.length && v.every((x) => x !== undefined)) {
      const [tl, tr = tl, br = tl, bl2 = tr] = v as number[];
      s.radius = { tl, tr, br, bl: bl2 } as Corners;
    }
  }
  const pad = boxSides(d.get('padding'));
  if (pad) s.padding = pad;
  for (const [k, side] of [['padding-top', 't'], ['padding-right', 'r'], ['padding-bottom', 'b'], ['padding-left', 'l']] as const) {
    const v = toPx(d.get(k));
    if (v !== undefined) s.padding = { ...(s.padding ?? {}), [side]: v };
  }
  const ta = d.get('text-align');
  if (ta && ['left', 'center', 'right', 'justify'].includes(ta)) s.textAlign = ta as StyleProps['textAlign'];
  const mw = d.get('max-width');
  if (mw && /px$/.test(mw)) s.maxWidth = { value: toPx(mw)!, unit: 'px' };
  return s;
}

const hasBox = (s: StyleProps) => !!(s.bg || (s.borderStyle && s.borderStyle !== 'none' && (s.borderWidth ?? 1) > 0) || s.borderLeftWidth || (s.padding && Object.values(s.padding).some((x) => (x ?? 0) > 0)));

/* ------------------------------------------------------------------ Chuẩn hóa */

function prepare(doc: Document, root: HTMLElement, ctx: Ctx, cleanup: boolean): { wordStyles: number; emptyParagraphs: number; spans: number; fonts: number; scripts: number } {
  const stat = { wordStyles: 0, emptyParagraphs: 0, spans: 0, fonts: 0, scripts: 0 };
  // Chú thích HTML (gồm cả khối điều kiện của Word).
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_COMMENT);
  const comments: Node[] = [];
  while (walker.nextNode()) comments.push(walker.currentNode);
  comments.forEach((c) => c.parentNode?.removeChild(c));
  root.querySelectorAll(DROP).forEach((el) => { if (/^(script|style|link)$/i.test(el.tagName)) stat.scripts++; el.remove(); });
  let jsLinks = 0;
  root.querySelectorAll('*').forEach((el) => {
    for (const a of [...el.attributes]) {
      const n = a.name.toLowerCase();
      if (n.startsWith('on')) el.removeAttribute(a.name);
      else if ((n === 'href' || n === 'src') && /^\s*(javascript|vbscript|data:text)/i.test(a.value)) { el.removeAttribute(a.name); jsLinks++; }
    }
  });
  if (jsLinks) ctx.warnings.add(`${jsLinks} liên kết javascript: đã bị chặn.`);
  if (stat.scripts) ctx.warnings.add(`Đã bỏ ${stat.scripts} thẻ script/style (Canvas cũng không giữ các thẻ này).`);
  if (!cleanup) return stat;

  const fonts = new Set<string>();
  root.querySelectorAll('*').forEach((el) => {
    const tag = el.tagName.toLowerCase();
    if (tag.includes(':')) { el.replaceWith(...el.childNodes); stat.wordStyles++; return; } // <o:p>, <w:...>
    for (const a of [...el.attributes]) {
      const n = a.name.toLowerCase();
      if (n.startsWith('data-') || n === 'lang' || n === 'xml:lang' || /^(mce|aria-describedby)/.test(n)) el.removeAttribute(a.name);
    }
    const cls = el.getAttribute('class');
    if (cls) {
      const keep = cls.split(/\s+/).filter((c) => c && !/^(Mso|mce|x_)/i.test(c));
      if (keep.length !== cls.split(/\s+/).filter(Boolean).length) stat.wordStyles++;
      if (keep.length) el.setAttribute('class', keep.join(' ')); else el.removeAttribute('class');
    }
    const st = el.getAttribute('style');
    if (st) {
      const kept: string[] = [];
      for (const [k, v] of decls(st)) {
        if (k.startsWith('mso-') || k.startsWith('-ms-') || k === 'tab-stops' || k === 'text-indent' && v === '0cm') { stat.wordStyles++; continue; }
        if (k === 'font-family') { fonts.add(v.split(',')[0].replace(/['"]/g, '').trim()); stat.fonts++; continue; }
        if (k === 'font-size' && /pt$/i.test(v)) { const px = toPx(v); if (px) kept.push(`font-size: ${Math.round(px)}px`); continue; }
        if (/(^| )(margin|margin-(top|bottom))$/.test(k) && /cm|in|pt/.test(v)) { stat.wordStyles++; continue; }
        kept.push(`${k}: ${v}`);
      }
      if (kept.length) el.setAttribute('style', kept.join('; ')); else el.removeAttribute('style');
    }
  });
  if (fonts.size) ctx.warnings.add(`Font ${[...fonts].slice(0, 3).map((f) => `"${f}"`).join(', ')} được bỏ, dùng font của trang.`);
  // <font> → span (giữ màu), span không thuộc tính → bỏ thẻ, giữ nội dung.
  root.querySelectorAll('font').forEach((el) => {
    const span = doc.createElement('span');
    const color = safeColor(el.getAttribute('color'));
    if (color) span.setAttribute('style', `color: ${color}`);
    span.append(...el.childNodes);
    el.replaceWith(span);
  });
  for (let pass = 0; pass < 3; pass++) {
    root.querySelectorAll('span').forEach((el) => {
      if (!el.attributes.length) { el.replaceWith(...el.childNodes); stat.spans++; }
    });
  }
  // Đoạn trống (&nbsp;, <br>) không chứa ảnh/bảng/iframe.
  root.querySelectorAll('p, div, h1, h2, h3, h4, h5, h6, li').forEach((el) => {
    if (el.querySelector(MEDIA + ', hr')) return;
    if ((el.textContent ?? '').replace(/[\s ​]/g, '') === '' && !el.closest('td, th')) {
      if (el.tagName === 'LI' && el.parentElement && el.parentElement.children.length > 1) { el.remove(); stat.emptyParagraphs++; return; }
      if (el.tagName !== 'LI') { el.remove(); stat.emptyParagraphs++; }
    }
  });
  return stat;
}

/* ------------------------------------------------------------------ Bảng */

function cellText(el: Element): string {
  const clone = el.cloneNode(true) as Element;
  clone.querySelectorAll('br').forEach((b) => b.replaceWith('\n'));
  clone.querySelectorAll('p, div, li').forEach((b) => { b.append('\n'); });
  return (clone.textContent ?? '').replace(/[ \t ]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{2,}/g, '\n').trim();
}

const ALLOWED_IN_CELL = new Set(['a', 'strong', 'b', 'em', 'i', 'u', 'span', 'br', 'p', 'code', 'sub', 'sup', 'small', 'del', 's', 'strike', 'div']);

/** Bảng dữ liệu: ô chỉ chứa chữ (có thể đậm, nghiêng, liên kết), không gộp ô. */
export function isDataTable(t: HTMLTableElement): boolean {
  if (t.querySelector('table')) return false;
  const rows = [...t.rows];
  if (!rows.length || rows.length > MAX_TABLE_ROWS) return false;
  for (const r of rows) {
    if (r.cells.length > MAX_TABLE_COLS) return false;
    for (const c of r.cells) {
      if ((c.colSpan ?? 1) > 1 || (c.rowSpan ?? 1) > 1) return false;
      if ([...c.querySelectorAll('*')].some((e) => !ALLOWED_IN_CELL.has(e.tagName.toLowerCase()))) return false;
    }
  }
  return true;
}

/** Bảng dàn trang: một hàng, 2 đến 4 ô, ô chứa ảnh hoặc nhiều đoạn. */
export function isLayoutTable(t: HTMLTableElement): boolean {
  const rows = [...t.rows];
  if (rows.length !== 1) return false;
  const n = rows[0].cells.length;
  return n >= 2 && n <= 4 && [...rows[0].cells].some((c) => !!c.querySelector('img, p, ul, ol, h1, h2, h3, h4, h5, h6, div, iframe'));
}

function tableNode(t: HTMLTableElement): LayoutNode {
  const rows = [...t.rows];
  const header = !!t.tHead || (rows.length > 1 && [...rows[0].cells].every((c) => c.tagName === 'TH'));
  const width = Math.max(1, ...rows.map((r) => r.cells.length));
  const data: TableCell[][] = rows.map((r) => {
    const cells: TableCell[] = [...r.cells].map((c) => {
      const a = c.querySelector('a[href]');
      return { text: cellText(c), url: a ? safeHref(a.getAttribute('href')) ?? '' : '' };
    });
    while (cells.length < width) cells.push({ text: '', url: '' });
    return cells;
  });
  const firstCol = rows.length > 1 && rows.slice(header ? 1 : 0).every((r) => r.cells[0]?.tagName === 'TH');
  const caption = t.caption ? cellText(t.caption) : '';
  const headCell = rows[0]?.cells[0];
  const headBg = header && headCell ? safeColor(decls(headCell.getAttribute('style')).get('background-color')) : undefined;
  const props: NodeProps = { rows: data as unknown as NodeProps[string], header, firstCol, caption, striped: !header || rows.length > 3 };
  if (linksPlain(t)) props.linkUnderline = false;
  if (headBg) props.headBg = headBg;
  return createNode('table', { name: 'Bảng', props });
}

/* ------------------------------------------------------------------ Chuyển đổi */

function htmlBlock(html: string, ctx: Ctx, reason: string): LayoutNode | null {
  const clean = sanitizeBlockHtml(html);
  if (!clean.trim()) return null;
  ctx.htmlBlocks.push(reason);
  return createNode('html', { name: 'Khối HTML', props: { html: clean, source: 'Nhập từ Canvas' } });
}

function richNode(html: string): LayoutNode | null {
  let clean = sanitizeRichHtml(html).trim();
  if (!clean || !clean.replace(/<[^>]+>/g, '').replace(/&nbsp;|\s/g, '')) return null;
  const isList = /^<(ul|ol)\b/i.test(clean);
  const props: NodeProps = { html: clean };
  // Liên kết đều không gạch chân, đều giữ màu chữ: chuyển thành tùy chọn của khối để chỉnh được trong bảng Thuộc tính.
  if (/<a\b/i.test(clean)) {
    const tpl = document.createElement('template');
    tpl.innerHTML = clean;
    const links = [...tpl.content.querySelectorAll<HTMLAnchorElement>('a')];
    const noLine = links.every((a) => a.style.textDecoration === 'none' || a.style.textDecorationLine === 'none');
    const inherit = links.every((a) => a.style.color === 'inherit');
    if (noLine || inherit) {
      links.forEach((a) => {
        if (noLine) { a.style.removeProperty('text-decoration'); a.style.removeProperty('text-decoration-line'); }
        if (inherit) a.style.removeProperty('color');
        if (!a.getAttribute('style')?.trim()) a.removeAttribute('style');
      });
      clean = tpl.innerHTML;
      props.html = clean;
      if (noLine) props.linkUnderline = false;
      if (inherit) props.linkColor = 'inherit';
    }
  }
  return createNode('text', { name: isList ? 'Danh sách' : 'Đoạn văn', props });
}

/** Mọi liên kết trong phần tử đều bỏ gạch chân. */
function linksPlain(el: Element): boolean {
  const links = [...el.querySelectorAll('a[href]')];
  return links.length > 0 && links.every((a) => /text-decoration(-line)?:\s*none/i.test(a.getAttribute('style') ?? ''));
}

function videoUrl(src: string): string | null {
  const m = /youtube(?:-nocookie)?\.com\/embed\/([A-Za-z0-9_-]{6,15})/.exec(src);
  if (m) return `https://www.youtube.com/watch?v=${m[1]}`;
  const e = toEmbedUrl(src);
  if (e?.provider === 'vimeo') return src.replace('player.vimeo.com/video/', 'vimeo.com/');
  return e ? src : null;
}

function imageNode(img: HTMLImageElement, ctx: Ctx, caption?: string): LayoutNode | null {
  const raw = img.getAttribute('src') ?? '';
  const src = safeImageSrc(raw);
  if (!src) { ctx.warnings.add('Bỏ qua ảnh có địa chỉ không hợp lệ.'); return null; }
  if (src.startsWith('/')) ctx.canvasImages++;
  const style: StyleProps = {};
  const w = Number(img.getAttribute('width')) || toPx(decls(img.getAttribute('style')).get('width'));
  if (w && w > 0 && w < 2000) style.maxWidth = { value: Math.round(w), unit: 'px' };
  const props: NodeProps = { src, alt: img.getAttribute('alt') ?? '' };
  if (caption) { props.caption = caption; props.showCaption = true; }
  return createNode('image', { name: caption ? 'Ảnh có chú thích' : 'Ảnh', props, style });
}

function buttonFrom(el: Element): LayoutNode | null {
  const kids = [...el.childNodes].filter((n) => !(n.nodeType === 3 && !(n.textContent ?? '').trim()));
  if (kids.length !== 1 || !(kids[0] instanceof Element) || kids[0].tagName !== 'A') return null;
  const a = kids[0];
  const d = decls(a.getAttribute('style'));
  const bg = safeColor(d.get('background-color')) ?? (d.get('background') ? safeColor(d.get('background')!.split(/\s+/)[0]) : undefined);
  if (!bg || !(d.get('padding') || /inline-block|block/.test(d.get('display') ?? ''))) return null;
  const style: StyleProps = { bg };
  const color = safeColor(d.get('color'));
  if (color) style.color = color;
  return createNode('button', { name: 'Nút', props: { label: (a.textContent ?? '').trim() || 'Mở', href: safeHref(a.getAttribute('href')) ?? '#', newTab: a.getAttribute('target') === '_blank' }, style });
}

/** Chuyển các phần tử con của một khối thành danh sách module. */
function convertChildren(parent: Element, ctx: Ctx, depth: number): LayoutNode[] {
  const out: LayoutNode[] = [];
  let rich: string[] = [];
  let inline: string[] = [];
  const push = (n: LayoutNode | null) => { if (n) out.push(n); };
  const endInline = () => {
    const html = inline.join('').trim();
    if (html.replace(/<br\s*\/?>/gi, '').replace(/&nbsp;|\s/g, '')) rich.push(`<p>${html}</p>`);
    inline = [];
  };
  const flush = () => { endInline(); if (rich.length) push(richNode(rich.join(''))); rich = []; };

  for (const child of [...parent.childNodes]) {
    if (child.nodeType === 3) { if ((child.textContent ?? '').trim()) inline.push(escapeText(child.textContent ?? '')); continue; }
    if (!(child instanceof Element)) continue;
    const el = child;
    const tag = el.tagName.toLowerCase();
    const cls = el.getAttribute('class') ?? '';

    if (cls.includes(MARK)) { flush(); for (const n of fromMarker(el, ctx, depth)) push(n); continue; }
    if (INLINE.has(tag) && !el.querySelector(MEDIA)) { inline.push(el.outerHTML); continue; }
    endInline();

    if (/^h[1-6]$/.test(tag)) {
      flush();
      const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
      if (text) push(createNode('heading', { name: 'Tiêu đề', props: { text, level: Number(tag[1]), ...headingLink(el, text) } }));
      continue;
    }
    if (tag === 'p' || tag === 'li') {
      const ph = tag === 'p' ? pseudoHeading(el) : null;
      if (ph) { flush(); push(ph); continue; }
      const btn = buttonFrom(el);
      if (btn) { flush(); push(btn); continue; }
      if (el.querySelector(MEDIA)) { flush(); for (const n of convertChildren(el, ctx, depth)) push(n); continue; }
      rich.push(el.outerHTML);
      continue;
    }
    if (tag === 'ul' || tag === 'ol') {
      if (el.querySelector(MEDIA)) { flush(); push(htmlBlock(el.outerHTML, ctx, 'Danh sách có ảnh, bảng hoặc khung nhúng')); continue; }
      if (isChecklist(el)) { flush(); push(checklistFrom(el)); continue; }
      rich.push(el.outerHTML);
      continue;
    }
    if (tag === 'blockquote') {
      flush();
      if (el.querySelector(MEDIA + ', ul, ol, h1, h2, h3')) { push(htmlBlock(el.outerHTML, ctx, 'Trích dẫn có nội dung phức tạp')); continue; }
      const cite = el.querySelector('cite');
      const citeText = cite ? (cite.textContent ?? '').trim() : '';
      cite?.closest('p')?.remove();
      push(createNode('quote', { name: 'Trích dẫn', props: { text: cellText(el).replace(/^[\s"“]+|[\s"”]+$/g, ''), cite: citeText.replace(/^[-–\s]+/, '') } }));
      continue;
    }
    if (tag === 'pre') {
      flush();
      const lang = /language-([\w#+-]+)/.exec(el.querySelector('code')?.getAttribute('class') ?? '')?.[1] ?? '';
      push(createNode('code', { name: 'Code', props: { code: (el.textContent ?? '').replace(/\n$/, ''), language: lang.toUpperCase(), title: '', showCopy: true } }));
      continue;
    }
    if (tag === 'hr') { flush(); push(createNode('divider')); continue; }
    if (tag === 'img') { flush(); push(imageNode(el as HTMLImageElement, ctx)); continue; }
    if (tag === 'figure' && el.querySelector('img') && !el.querySelector('table, iframe')) {
      flush();
      const cap = el.querySelector('figcaption');
      push(imageNode(el.querySelector('img')!, ctx, cap ? (cap.textContent ?? '').trim() : undefined));
      continue;
    }
    if (tag === 'iframe') {
      flush();
      const url = videoUrl(el.getAttribute('src') ?? '');
      push(url ? createNode('video', { name: 'Video', props: { url, title: el.getAttribute('title') ?? 'Video' } }) : htmlBlock(el.outerHTML, ctx, 'Khung nhúng (iframe) không phải YouTube hoặc Vimeo'));
      continue;
    }
    if (tag === 'table') {
      flush();
      const t = el as HTMLTableElement;
      if (isDataTable(t)) push(tableNode(t));
      else if (ctx.opts.layoutTables === 'columns' && isLayoutTable(t) && depth < MAX_DEPTH - 2) push(columnsFromLayoutTable(t, ctx, depth));
      else push(htmlBlock(el.outerHTML, ctx, isLayoutTable(t) ? 'Bố cục nhiều cột dựng bằng bảng dàn trang' : 'Bảng có ô gộp, ảnh hoặc nội dung phức tạp'));
      continue;
    }
    if (TRANSPARENT.has(tag)) {
      const style = styleFromCss(el.getAttribute('style'));
      if (hasBox(style) && depth < MAX_DEPTH - 2) {
        flush();
        const kids = convertChildren(el, ctx, depth + 1);
        if (kids.length) push(createNode('container', { name: 'Khối', style: { ...style, gap: 12 }, children: kids }));
        continue;
      }
      // Khối bọc không có hình thức riêng: lấy nội dung bên trong.
      flush();
      for (const n of convertChildren(el, ctx, depth)) push(n);
      continue;
    }
    flush();
    push(htmlBlock(el.outerHTML, ctx, `Thẻ <${tag}> chưa có module tương ứng`));
  }
  flush();
  return out;
}

/**
 * Đoạn văn chỉ gồm một dòng chữ đậm cỡ lớn (kiểu "tiêu đề" gõ tay trong Canvas hoặc Word) → Heading.
 * Chỉ nhận khi cỡ chữ từ 20px trở lên để không đổi nhầm đoạn văn thường.
 */
function pseudoHeading(p: Element): LayoutNode | null {
  const text = (p.textContent ?? '').replace(/\s+/g, ' ').trim();
  if (!text || text.length > 120 || p.querySelector('br, a, img')) return null;
  const bold = [...p.querySelectorAll('strong, b')].map((b) => (b.textContent ?? '').replace(/\s+/g, ' ').trim()).join(' ').trim();
  if (bold !== text) return null;
  let size = 0;
  for (const el of [p, ...p.querySelectorAll('*')]) size = Math.max(size, toPx(decls(el.getAttribute('style')).get('font-size')) ?? 0);
  if (size < 20) return null;
  return createNode('heading', { name: 'Tiêu đề', props: { text, level: size >= 24 ? 2 : 3 } });
}

/** Tiêu đề mà cả dòng là một liên kết: giữ liên kết, cách mở và kiểu gạch chân. */
function headingLink(h: Element, text: string): NodeProps {
  const a = h.querySelector('a[href]');
  if (!a || (a.textContent ?? '').replace(/\s+/g, ' ').trim() !== text) return {};
  const href = safeHref(a.getAttribute('href'));
  if (!href) return {};
  const newTab = a.getAttribute('target') === '_blank';
  const internal = href.startsWith('/') || /\/courses\/\d+/.test(href);
  const target = newTab === !internal ? 'auto' : newTab ? 'new' : 'same';
  return { href, target, underline: !/text-decoration:\s*none/i.test(a.getAttribute('style') ?? '') };
}

function escapeText(t: string): string {
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function isChecklist(el: Element): boolean {
  const items = [...el.children];
  return items.length > 0 && items.every((li) => /^[\s]*[☐☑✓✔□■]/.test(li.textContent ?? ''));
}

function checklistFrom(el: Element): LayoutNode {
  const items = [...el.children].map((li, i) => {
    const t = (li.textContent ?? '').trim();
    return { id: `c${i + 1}`, text: t.replace(/^[☐☑✓✔□■]\s*/, ''), checked: /^[☑✓✔■]/.test(t) };
  });
  return createNode('checklist', { name: 'Checklist', props: { items } });
}

function columnsFromLayoutTable(t: HTMLTableElement, ctx: Ctx, depth: number): LayoutNode {
  const cells = [...t.rows[0].cells];
  const cols = createColumns(cells.length, { name: `${cells.length} cột` });
  cols.children!.forEach((col, i) => {
    col.children = convertChildren(cells[i], ctx, depth + 2);
    const w = Number(cells[i].getAttribute('width')) || toPx(decls(cells[i].getAttribute('style')).get('width'));
    if (w && w > 40) col.props.ratio = Math.max(0.5, Math.round((w / 200) * 10) / 10);
  });
  if (cols.children!.some((c) => c.props.ratio !== 1)) cols.props.ratios = cols.children!.map((c) => c.props.ratio as number);
  return cols;
}

/* ------------------------------------------------------------------ Trang do công cụ xuất ra */

function markerType(el: Element): ModuleType | null {
  const m = /(?:^|\s)cls-m-([a-z]+)(?:\s|$)/.exec(el.getAttribute('class') ?? '');
  return (m?.[1] as ModuleType | undefined) ?? null;
}

function fromMarker(el: Element, ctx: Ctx, depth: number): LayoutNode[] {
  const type = markerType(el);
  const style = () => styleFromCss(el.getAttribute('style'));
  const exact = (n: LayoutNode | null): LayoutNode[] => { if (!n) return []; ctx.exact++; return [n]; };
  const kidsOf = (parent: Element, skip?: Element | null) => {
    const holder = parent.cloneNode(false) as Element;
    for (const c of [...parent.childNodes]) if (c !== skip) holder.appendChild(c.cloneNode(true));
    return convertChildren(holder, ctx, depth + 1);
  };
  switch (type) {
    case 'heading': {
      const level = Number(/^H([1-6])$/.exec(el.tagName)?.[1] ?? 2);
      const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
      return exact(createNode('heading', { name: 'Tiêu đề', props: { text, level, ...headingLink(el, text) } }));
    }
    case 'text': return exact(richNode(el.innerHTML));
    case 'quote': {
      const ps = el.querySelectorAll('p');
      const cite = el.querySelector('cite');
      return exact(createNode('quote', { name: 'Trích dẫn', props: { text: (ps[0]?.textContent ?? '').trim(), cite: (cite?.textContent ?? '').trim() } }));
    }
    case 'checklist': {
      const items = [...el.querySelectorAll('li')].map((li, i) => {
        const spans = li.querySelectorAll('span');
        return { id: `c${i + 1}`, text: (spans[1]?.textContent ?? li.textContent ?? '').trim(), checked: (spans[0]?.textContent ?? '').includes('☑') };
      });
      return exact(createNode('checklist', { name: 'Checklist', props: { items } }));
    }
    case 'code': {
      const head = el.querySelector(':scope > div > span')?.textContent ?? '';
      const [a, b] = head.split(' · ');
      return exact(createNode('code', { name: 'Code', props: { code: el.querySelector('pre')?.textContent ?? '', title: b !== undefined ? a : '', language: b ?? a ?? '', showCopy: true } }));
    }
    case 'image': {
      const img = el.querySelector('img');
      const cap = el.querySelector('figcaption');
      if (!img) return [];
      return exact(imageNode(img, ctx, cap ? (cap.textContent ?? '').trim() : undefined));
    }
    case 'video': {
      const f = el.querySelector('iframe');
      const a = el.querySelector('a');
      const url = f ? videoUrl(f.getAttribute('src') ?? '') : a ? safeHref(a.getAttribute('href')) : null;
      return exact(createNode('video', { name: 'Video', props: { url: url ?? '', title: f?.getAttribute('title') ?? a?.textContent ?? 'Video' } }));
    }
    case 'button': return exact(buttonFrom(el) ?? createNode('button', { props: { label: (el.textContent ?? '').trim(), href: safeHref(el.querySelector('a')?.getAttribute('href')) ?? '#' } }));
    case 'divider': {
      const b = parseBorder(decls(el.getAttribute('style')).get('border-top'));
      return exact(createNode('divider', { props: { thickness: b.width ?? 1, lineStyle: b.style ?? 'solid', color: b.color ?? '#d5dce3' } }));
    }
    case 'spacer': return exact(createNode('spacer', { props: { height: toPx(decls(el.getAttribute('style')).get('height')) ?? 32 } }));
    case 'table': {
      const t = el.querySelector('table');
      return t ? exact(tableNode(t)) : [];
    }
    case 'html': return exact(htmlBlock(el.innerHTML, ctx, 'Khối HTML có sẵn trong trang'));
    case 'container': {
      const title = [...el.children].find((c) => /^H[1-6]$/.test(c.tagName) && !markerType(c));
      const props: NodeProps = {};
      if (title) { props.showTitle = true; props.title = (title.textContent ?? '').trim(); props.titleLevel = Number(title.tagName[1]); }
      if (/flex-direction:\s*row/.test(el.getAttribute('style') ?? '')) props.direction = 'row';
      return exact(createNode('container', { name: title ? props.title as string : 'Khối', props, style: { ...style(), gap: 12 }, children: kidsOf(el, title ?? null) }));
    }
    case 'callout': {
      const variant = /(?:^|\s)cls-v-([\w-]+)/.exec(el.getAttribute('class') ?? '')?.[1] ?? 'callout';
      const v = getCalloutVariant(variant);
      const node = createCallout(v);
      const head = [...el.children].find((c) => !markerType(c) && c.tagName === 'DIV' && !!c.querySelector('h3, span'));
      if (head) {
        const h3 = head.querySelector('h3');
        const icon = head.querySelector('span[aria-hidden]');
        node.props.showTitle = !!h3;
        if (h3) node.props.title = (h3.textContent ?? '').trim();
        node.props.showIcon = !!icon;
        if (icon) node.props.icon = (icon.textContent ?? '').trim();
      } else { node.props.showTitle = false; node.props.showIcon = false; }
      node.children = kidsOf(el, head ?? null);
      return exact(node);
    }
    case 'columns': {
      const cols = [...el.children].filter((c) => markerType(c) === 'column');
      if (cols.length < 2 || cols.length > 4 || depth >= MAX_DEPTH - 2) return convertChildren(el, ctx, depth);
      const node = createColumns(cols.length);
      const ratios: number[] = [];
      node.children!.forEach((col, i) => {
        const flex = /flex:\s*([\d.]+)\s+1\s+(\d+)px/.exec(cols[i].getAttribute('style') ?? '');
        const ratio = flex ? Number(flex[1]) || 1 : 1;
        ratios.push(ratio);
        col.props.ratio = ratio;
        col.children = convertChildren(cols[i], ctx, depth + 2);
      });
      node.props.ratios = ratios;
      return exact(node);
    }
    case 'grid': {
      const min = /minmax\((\d+)px/.exec(el.getAttribute('style') ?? '');
      return exact(createNode('grid', { props: { minColWidth: min ? Number(min[1]) : 220 }, children: convertChildren(el, ctx, depth + 1) }));
    }
    case 'schedule':
    case 'progress':
    case 'curriculum': {
      ctx.warnings.add('Lịch học, Tiến độ, Chương trình học được dựng lại với dữ liệu khóa học của dự án hiện tại. Muốn giữ đúng ngày học, hãy mở tệp JSON của dự án gốc.');
      if (type === 'curriculum') return exact(curriculumFrom(el));
      if (type === 'schedule' && /cls-s-mini/.test(el.getAttribute('class') ?? '')) return exact(createNode('schedule', { name: 'Lịch học mini', props: { size: 'mini' }, style: miniScheduleStyle() }));
      return exact(createNode(type));
    }
    default:
      return convertChildren(el, ctx, depth);
  }
}

function curriculumFrom(el: Element): LayoutNode {
  const t = el.querySelector('table');
  if (!t) return createNode('curriculum');
  const headRows = t.tHead ? [...t.tHead.rows] : [];
  const bodyRows = t.tBodies[0] ? [...t.tBodies[0].rows] : [];
  if (!headRows.length || !bodyRows.length) return createNode('curriculum');
  const titles = [...headRows[0].cells].slice(1).map((c) => (c.textContent ?? '').trim());
  const dates = headRows[1] ? [...headRows[1].cells].slice(1).map((c) => (c.textContent ?? '').trim()) : titles.map(() => '');
  const links = [...headRows[0].cells].slice(1).map((c) => safeHref(c.querySelector('a')?.getAttribute('href')) ?? '');
  const rows = bodyRows.map((r) => (r.cells[0]?.textContent ?? '').trim());
  const cells = bodyRows.map((r) => [...r.cells].slice(1).map((c) => ({
    text: cellText(c), em: /border:\s*2px solid/.test(c.getAttribute('style') ?? ''), url: safeHref(c.querySelector('a')?.getAttribute('href')) ?? '',
  })));
  const tbody = t.tBodies[0];
  return createNode('curriculum', {
    props: {
      ...(tbody && linksPlain(tbody) ? { linkUnderline: false } : {}),
      rowHeader: (headRows[0].cells[0]?.textContent ?? 'Tiết').trim(), dateRowLabel: headRows[1] ? (headRows[1].cells[0]?.textContent ?? 'Ngày').trim() : 'Ngày',
      rows, cols: titles.map((title, i) => ({ title, date: dates[i] ?? '', url: links[i] })), cells,
    },
  });
}

/* ------------------------------------------------------------------ API */

export function importCanvasHtml(input: string, opts: ImportOptions): ImportResult {
  const ctx = new Ctx(opts);
  const doc = new DOMParser().parseFromString(input.slice(0, MAX_IMPORT_CHARS), 'text/html');
  if (input.length > MAX_IMPORT_CHARS) ctx.warnings.add('Mã quá dài, chỉ đọc 2 triệu ký tự đầu.');
  let root: HTMLElement = doc.body;
  // Bản xuất của công cụ có khung ngoài .cls-layout-root: đọc từ khung này.
  const own = root.querySelector<HTMLElement>('.cls-layout-root');
  if (own) root = own;
  const cleaned = prepare(doc, root, ctx, opts.cleanup);

  let nodes: LayoutNode[];
  if (opts.mode === 'raw') {
    const n = htmlBlock(root.innerHTML, ctx, 'Giữ nguyên toàn bộ trang theo lựa chọn');
    nodes = n ? [n] : [];
  } else {
    nodes = convertChildren(root, ctx, 1);
  }
  const visit = (list: LayoutNode[]) => list.forEach((n) => { ctx.count(n); if (n.children) visit(n.children.filter((c) => c.type !== 'column')); n.children?.filter((c) => c.type === 'column').forEach((c) => visit(c.children ?? [])); });
  visit(nodes);
  if (ctx.canvasImages) ctx.warnings.add(`${ctx.canvasImages} ảnh dùng địa chỉ Files của Canvas, cần đăng nhập nên trong công cụ hiện khung giữ chỗ. Khi dán lại vào Canvas ảnh vẫn hiện bình thường.`);
  if (!nodes.length) ctx.warnings.add('Không tìm thấy nội dung nào để nhập.');
  let title = '';
  const findTitle = (list: LayoutNode[]) => { for (const n of list) { if (title) return; if (n.type === 'heading') title = String(n.props.text); else if (n.children) findTitle(n.children); } };
  findTitle(nodes);
  if (!title) {
    // Theo thứ tự trong trang: tiêu đề thật hoặc đoạn chữ đậm cỡ lớn đầu tiên.
    for (const el of [...root.querySelectorAll('h1, h2, h3, p')].slice(0, 30)) {
      title = el.tagName === 'P' ? String(pseudoHeading(el)?.props.text ?? '') : el.textContent ?? '';
      if (title.trim()) break;
    }
  }
  if (!title) title = (doc.title ?? '').trim();
  title = title.replace(/\s+/g, ' ').trim().slice(0, 120);
  const counts = [...ctx.counts.entries()].sort((a, b) => b[1] - a[1]);
  return {
    nodes,
    title,
    report: {
      counts,
      modules: counts.reduce((n, [, c]) => n + c, 0) - (ctx.counts.get('Khối HTML') ?? 0),
      exact: ctx.exact,
      htmlBlocks: ctx.htmlBlocks,
      warnings: [...ctx.warnings],
      cleaned,
    },
  };
}

/** Thử chuyển một Khối HTML thành module (kể cả bảng dàn trang thành cột). */
export function convertHtmlBlock(html: string): ImportResult {
  return importCanvasHtml(html, { mode: 'modules', cleanup: true, layoutTables: 'columns' });
}

/* ------------------------------------------------------------------ Định dạng lại mã */

const FMT_BLOCK = new Set(['div', 'p', 'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'figure', 'figcaption', 'section', 'article', 'aside', 'header', 'footer', 'pre', 'hr', 'iframe', 'img', 'caption', 'dl', 'dt', 'dd']);

/** Thụt lề mã HTML cho dễ đọc (không đổi nội dung). */
export function formatHtml(html: string): string {
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  const lines: string[] = [];
  const open = (el: Element) => `<${el.tagName.toLowerCase()}${[...el.attributes].map((a) => ` ${a.name}="${a.value.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"`).join('')}>`;
  const walk = (node: Node, depth: number) => {
    const ind = '  '.repeat(depth);
    if (node.nodeType === 3) { const t = (node.textContent ?? '').trim(); if (t) lines.push(ind + escapeText(t)); return; }
    if (!(node instanceof Element)) return;
    const tag = node.tagName.toLowerCase();
    const blockKids = [...node.children].some((c) => FMT_BLOCK.has(c.tagName.toLowerCase()));
    if (tag === 'pre' || !FMT_BLOCK.has(tag) || !blockKids) { lines.push(ind + node.outerHTML); return; }
    lines.push(ind + open(node));
    node.childNodes.forEach((c) => walk(c, depth + 1));
    lines.push(`${ind}</${tag}>`);
  };
  tpl.content.childNodes.forEach((c) => walk(c, 0));
  return lines.join('\n');
}


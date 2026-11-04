import createDOMPurify, { type DOMPurify } from 'dompurify';
import { CANVAS_CSS, CANVAS_ELEMENTS, CANVAS_ELEMENT_ATTRS, CANVAS_GLOBAL_ATTRS } from './canvas-whitelist';
import { safeHref, safeImageSrc } from './safe-values';

/**
 * Làm sạch HTML của module "Khối HTML" (mã nhập từ Canvas hoặc do giảng viên viết).
 * Chỉ giữ thẻ, thuộc tính và CSS mà Canvas cho phép; loại bỏ script, sự kiện on*,
 * giao thức javascript:, CSS có url() không an toàn, position: fixed.
 */

/** Thẻ HTML5 Canvas bỏ, được đổi sang thẻ Canvas giữ khi xuất cho Canvas. */
const RENAME_FOR_CANVAS: Record<string, string> = { section: 'div', header: 'div', footer: 'div', nav: 'div', main: 'div', mark: 'span', s: 'del' };

const BLOCK_TAGS = [
  ...[...CANVAS_ELEMENTS].filter((t) => !['object', 'embed', 'param'].includes(t)),
  ...Object.keys(RENAME_FOR_CANVAS),
];

const BLOCK_ATTRS = [
  ...CANVAS_GLOBAL_ATTRS,
  ...new Set(Object.values(CANVAS_ELEMENT_ATTRS).flatMap((s) => [...s])),
  'rel', 'controls',
];

/** CSS được giữ: danh sách Canvas + font-weight (Canvas bỏ, nhưng vẫn hiển thị đúng trong trình thiết kế và bản độc lập). */
const BLOCK_CSS = new Set([...CANVAS_CSS, 'font-weight']);

export function sanitizeBlockStyle(style: string): string {
  const out: string[] = [];
  for (const decl of style.split(';')) {
    const i = decl.indexOf(':');
    if (i < 0) continue;
    const prop = decl.slice(0, i).trim().toLowerCase();
    let value = decl.slice(i + 1).trim().replace(/\s*!important$/i, '');
    if (!prop || !value || value.length > 500 || !BLOCK_CSS.has(prop)) continue;
    if (/expression\s*\(|javascript:|@import|[<>\\]|behavior\s*:/i.test(value)) continue;
    if (/url\s*\(/i.test(value)) {
      // Chỉ cho url(https://...) (ảnh nền); mọi dạng khác bị bỏ.
      const urls = [...value.matchAll(/url\s*\(\s*(['"]?)([^'")]*)\1\s*\)/gi)];
      if (!urls.length || urls.some((m) => !/^https:\/\/[^\s'"()]+$/i.test(m[2]))) continue;
    }
    if (prop === 'position' && !/^(static|relative|absolute|sticky)$/i.test(value)) continue;
    value = value.replace(/\s+/g, ' ');
    out.push(`${prop}: ${value}`);
  }
  return out.join('; ');
}

let purifier: DOMPurify | null = null;

function getPurifier(): DOMPurify {
  if (purifier) return purifier;
  const p = createDOMPurify(window);
  p.addHook('uponSanitizeAttribute', (node, data) => {
    const name = data.attrName;
    const tag = node.nodeName.toLowerCase();
    if (name === 'style') {
      data.attrValue = sanitizeBlockStyle(data.attrValue);
      if (!data.attrValue) data.keepAttr = false;
    } else if (name === 'href' || name === 'longdesc' || name === 'cite') {
      const safe = safeHref(data.attrValue);
      if (safe) data.attrValue = safe;
      else data.keepAttr = false;
    } else if (name === 'src') {
      const v = data.attrValue.trim();
      const safe = tag === 'iframe' ? (/^https:\/\//i.test(v) ? safeHref(v) : undefined) : safeImageSrc(v);
      if (safe) data.attrValue = safe;
      else data.keepAttr = false;
    } else if (name === 'target') {
      data.attrValue = '_blank';
    } else if (name === 'class') {
      // Bỏ class của Word (MsoNormal...) và class nội bộ của trình soạn thảo.
      const cls = data.attrValue.split(/\s+/).filter((c) => c && !/^(Mso|mce)/i.test(c) && /^[\w-]{1,60}$/.test(c));
      if (cls.length) data.attrValue = cls.join(' ');
      else data.keepAttr = false;
    } else if (name === 'id') {
      if (!/^[A-Za-z][\w-]{0,60}$/.test(data.attrValue)) data.keepAttr = false;
    } else if (name === 'sandbox' || name === 'allow') {
      data.attrValue = data.attrValue.replace(/[^\w\s;:'.*-]/g, '');
    }
  });
  p.addHook('afterSanitizeAttributes', (node) => {
    if (node.nodeName === 'A' && node.getAttribute('target') === '_blank') node.setAttribute('rel', 'noopener noreferrer');
  });
  purifier = p;
  return p;
}

export interface BlockSanitizeOptions {
  /** Đổi thẻ HTML5 Canvas không giữ (section, header...) sang thẻ tương đương. */
  forCanvas?: boolean;
}

export function sanitizeBlockHtml(html: string, opts: BlockSanitizeOptions = {}): string {
  if (typeof html !== 'string' || !html.trim()) return '';
  const clean = getPurifier().sanitize(html.slice(0, 2_000_000), {
    ALLOWED_TAGS: BLOCK_TAGS,
    ALLOWED_ATTR: BLOCK_ATTRS,
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: true,
    ADD_ATTR: ['target'],
  }) as string;
  if (!opts.forCanvas) return clean;
  const doc = document.implementation.createHTMLDocument('');
  doc.body.innerHTML = clean;
  for (const [from, to] of Object.entries(RENAME_FOR_CANVAS)) {
    doc.body.querySelectorAll(from).forEach((el) => {
      const n = doc.createElement(to);
      for (const a of [...el.attributes]) n.setAttribute(a.name, a.value);
      n.append(...el.childNodes);
      el.replaceWith(n);
    });
  }
  // Canvas bỏ font-weight; giữ độ đậm cho tiêu đề bằng thẻ <strong> thì không cần, ở đây chỉ bỏ thuộc tính.
  doc.body.querySelectorAll<HTMLElement>('[style]').forEach((el) => {
    el.style.removeProperty('font-weight');
    if (!el.getAttribute('style')?.trim()) el.removeAttribute('style');
  });
  return doc.body.innerHTML;
}

/**
 * HTML để hiển thị trong trình thiết kế: thay iframe và ảnh cần đăng nhập Canvas
 * bằng khung giữ chỗ (không tải nội dung bên ngoài vào ứng dụng).
 */
export function editorBlockHtml(html: string): string {
  const clean = sanitizeBlockHtml(html);
  if (!/<(iframe|img|video|audio)/i.test(clean)) return clean;
  const doc = document.implementation.createHTMLDocument('');
  doc.body.innerHTML = clean;
  const box = (label: string, el: Element) => {
    const d = doc.createElement('div');
    d.setAttribute('data-block-placeholder', '');
    d.setAttribute('style', 'display:flex;align-items:center;justify-content:center;min-height:90px;padding:10px;border:1px dashed #b9c6d2;border-radius:6px;background:#f2f5f8;color:#5b6b77;font-size:13px;text-align:center');
    const w = el.getAttribute('width');
    if (w && /^\d+$/.test(w)) d.style.maxWidth = `${w}px`;
    d.textContent = label;
    el.replaceWith(d);
  };
  doc.body.querySelectorAll('iframe').forEach((el) => {
    let host = '';
    try { host = new URL(el.getAttribute('src') ?? '').host; } catch { /* bỏ qua */ }
    box(`Khung nhúng${host ? `: ${host}` : ''} (hiện khi xem trước hoặc trên Canvas)`, el);
  });
  doc.body.querySelectorAll('video, audio').forEach((el) => box('Video/âm thanh nhúng (hiện trên Canvas)', el));
  doc.body.querySelectorAll('img').forEach((el) => {
    const src = el.getAttribute('src') ?? '';
    if (src.startsWith('/')) box(`Ảnh từ Files của Canvas${el.getAttribute('alt') ? `: ${el.getAttribute('alt')}` : ''} (hiện khi dán vào Canvas)`, el);
  });
  return doc.body.innerHTML;
}

import { HEADING_SIZES } from '../modules/defs/layout';
import { MONO_FONT } from '../models/style';
import { cssToString, type CssMap } from './css';

/**
 * Quy tắc trình bày bên trong khối Rich Text.
 * Cùng một bộ quy tắc được dùng ở dạng class CSS (trình thiết kế, HTML độc lập, PNG)
 * và ở dạng style inline (HTML cho Canvas, vì Canvas không cho thẻ <style>).
 */
export interface RichTheme {
  accent: string;
  headingColor: string;
}

/** Kiểu liên kết trong một khối Rich Text. */
export interface RichLink {
  underline: boolean;
  /** 'accent': màu nhấn của trang; 'inherit': giữ màu chữ của đoạn. */
  color: 'accent' | 'inherit';
}

export const DEFAULT_RICH_LINK: RichLink = { underline: true, color: 'accent' };

/** Biến CSS cho kiểu liên kết (trình thiết kế, HTML độc lập, PNG); rỗng nếu là mặc định. */
export function richLinkVars(link: RichLink | undefined): CssMap {
  const out: CssMap = {};
  if (link && !link.underline) out['--cls-lu'] = 'none';
  // 'inherit' trong biến CSS là từ khóa của chính biến; currentcolor cho thuộc tính color = màu kế thừa.
  if (link && link.color === 'inherit') out['--cls-lc'] = 'currentcolor';
  return out;
}

export function richRules(theme: RichTheme, ps: string, link?: RichLink | 'vars'): Record<string, CssMap> {
  const a: CssMap = link === 'vars'
    ? { color: `var(--cls-lc, ${theme.accent})`, 'text-decoration': 'var(--cls-lu, underline)' }
    : { color: link?.color === 'inherit' ? 'inherit' : theme.accent, 'text-decoration': link && !link.underline ? 'none' : 'underline' };
  const headings: Record<string, CssMap> = {};
  for (let i = 1; i <= 6; i++) {
    headings[`h${i}`] = { margin: `0 0 ${ps}`, color: theme.headingColor, 'font-size': `${HEADING_SIZES[i]}px`, 'line-height': '1.3' };
  }
  return {
    p: { margin: `0 0 ${ps}` },
    ...headings,
    ul: { margin: `0 0 ${ps}`, 'padding-left': '1.6em' },
    ol: { margin: `0 0 ${ps}`, 'padding-left': '1.6em' },
    li: { margin: '0 0 4px' },
    'li > p': { margin: '0' },
    'li > ul': { margin: '4px 0 0' },
    'li > ol': { margin: '4px 0 0' },
    blockquote: { margin: `0 0 ${ps}`, padding: '4px 0 4px 16px', 'border-left': `3px solid ${theme.accent}`, color: '#475569' },
    pre: { margin: `0 0 ${ps}`, padding: '12px 14px', 'background-color': '#f1f4f8', 'border-radius': '6px', 'white-space': 'pre', 'overflow-x': 'auto', 'font-family': MONO_FONT, 'font-size': '15px' },
    code: { 'font-family': MONO_FONT, 'font-size': '0.92em', 'background-color': '#eef2f6', padding: '1px 5px', 'border-radius': '4px' },
    'pre > code': { 'background-color': 'transparent', padding: '0', 'font-size': '1em' },
    a,
  };
}

/** CSS dạng class, áp vào phần tử có class `cls-rt` bên trong `scope`. */
export function richCss(scope: string, theme: RichTheme): string {
  const rules = richRules(theme, 'var(--cls-ps, 12px)', 'vars');
  const lines = Object.entries(rules).map(([sel, css]) => `${scope} .cls-rt ${sel} { ${cssToString(css)}; }`);
  lines.push(`${scope} .cls-rt > :last-child { margin-bottom: 0; }`);
  lines.push(`${scope} .cls-rt > :first-child { margin-top: 0; }`);
  return lines.join('\n');
}

function parseStyle(s: string | null): CssMap {
  const out: CssMap = {};
  if (!s) return out;
  for (const decl of s.split(';')) {
    const i = decl.indexOf(':');
    if (i > 0) out[decl.slice(0, i).trim()] = decl.slice(i + 1).trim();
  }
  return out;
}

/**
 * Viết các quy tắc Rich Text thành style inline (cho Canvas).
 * Style người dùng đặt (màu, căn lề...) được giữ và ưu tiên.
 * `html` phải là HTML đã được làm sạch.
 */
export function inlineRichHtml(html: string, theme: RichTheme, paragraphSpacing: number, link?: RichLink): string {
  const rules = richRules(theme, `${paragraphSpacing}px`, link ?? DEFAULT_RICH_LINK);
  const doc = new DOMParser().parseFromString(`<div id="cls-root">${html}</div>`, 'text/html');
  const root = doc.getElementById('cls-root')!;

  const apply = (el: Element) => {
    const tag = el.tagName.toLowerCase();
    const parentTag = el.parentElement?.tagName.toLowerCase();
    let base: CssMap = { ...(rules[tag] ?? {}) };
    if (parentTag === 'li' && rules[`li > ${tag}`]) base = { ...base, ...rules[`li > ${tag}`] };
    if (parentTag === 'pre' && tag === 'code') base = { ...base, ...rules['pre > code'] };
    if (el.parentElement === root) {
      if (el === root.lastElementChild) base['margin-bottom'] = '0';
      if (el === root.firstElementChild && /^(h[1-6]|p|ul|ol)$/.test(tag)) base['margin-top'] = '0';
    }
    // Canvas không có <s>/<mark>: đổi sang thẻ tương đương được hỗ trợ.
    let target = el;
    if (tag === 's') {
      const del = doc.createElement('del');
      while (el.firstChild) del.appendChild(el.firstChild);
      for (const a of Array.from(el.attributes)) del.setAttribute(a.name, a.value);
      el.replaceWith(del);
      target = del;
    }
    // Canvas bỏ qua rel; xóa để HTML gọn và không sinh cảnh báo.
    target.removeAttribute('rel');
    const own = parseStyle(target.getAttribute('style'));
    // Khai báo sau thắng khai báo trước, nên margin-bottom: 0 vẫn đè được margin rút gọn.
    const merged = collapseMargin({ ...base, ...own });
    if (Object.keys(merged).length) target.setAttribute('style', cssToString(merged));
    for (const child of Array.from(target.children)) apply(child);
  };
  for (const child of Array.from(root.children)) apply(child);
  return root.innerHTML;
}

/** Gộp margin rút gọn và các margin-* ghi đè thành một khai báo margin duy nhất. */
function collapseMargin(css: CssMap): CssMap {
  if (!css.margin) return css;
  const parts = css.margin.trim().split(/\s+/);
  if (parts.length > 4) return css;
  const [t, r = t, b = t, l = r] = parts;
  const sides: Record<string, string> = { top: t, right: r, bottom: b, left: l };
  let touched = false;
  for (const k of ['top', 'right', 'bottom', 'left']) {
    if (css[`margin-${k}`] !== undefined) { sides[k] = css[`margin-${k}`]; touched = true; }
  }
  if (!touched) return css;
  const out: CssMap = {};
  for (const [k, v] of Object.entries(css)) {
    if (k.startsWith('margin-')) continue;
    out[k] = k === 'margin' ? `${sides.top} ${sides.right} ${sides.bottom} ${sides.left}` : v;
  }
  return out;
}

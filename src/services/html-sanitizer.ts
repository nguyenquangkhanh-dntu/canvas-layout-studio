import createDOMPurify, { type DOMPurify } from 'dompurify';
import { safeColor, safeFontFamily, safeHref } from './safe-values';

/**
 * Làm sạch HTML của khối Rich Text. Chỉ giữ các thẻ định dạng văn bản,
 * loại bỏ script, sự kiện on*, giao thức javascript: và CSS không an toàn.
 */

export const RICH_TAGS = [
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'del', 'strike', 'code', 'a', 'ul', 'ol', 'li',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'blockquote', 'pre', 'sub', 'sup',
];

const STYLE_RULES: Record<string, (v: string) => string | undefined> = {
  color: (v) => safeColor(v),
  'background-color': (v) => safeColor(v),
  'font-family': (v) => safeFontFamily(v),
  'font-size': (v) => (/^\d{1,3}(\.\d+)?(px|em|rem|%)$/.test(v) ? v : undefined),
  'line-height': (v) => (/^\d{1,2}(\.\d+)?(px|em)?$/.test(v) ? v : undefined),
  'text-align': (v) => (['left', 'center', 'right', 'justify'].includes(v) ? v : undefined),
  'text-decoration': (v) => (/^(none|underline|line-through)( (underline|line-through))?$/.test(v) ? v : undefined),
};

export function sanitizeInlineStyle(style: string): string {
  const out: string[] = [];
  for (const decl of style.split(';')) {
    const i = decl.indexOf(':');
    if (i < 0) continue;
    const prop = decl.slice(0, i).trim().toLowerCase();
    const value = decl.slice(i + 1).trim();
    const rule = STYLE_RULES[prop];
    const safe = rule?.(value);
    if (safe) out.push(`${prop}: ${safe}`);
  }
  return out.join('; ');
}

let purifier: DOMPurify | null = null;

function getPurifier(): DOMPurify {
  if (purifier) return purifier;
  const p = createDOMPurify(window);
  p.addHook('uponSanitizeAttribute', (node, data) => {
    const name = data.attrName;
    if (name === 'style') {
      data.attrValue = sanitizeInlineStyle(data.attrValue);
      if (!data.attrValue) data.keepAttr = false;
    } else if (name === 'href') {
      const safe = safeHref(data.attrValue);
      if (safe) data.attrValue = safe;
      else data.keepAttr = false;
    } else if (name === 'target') {
      data.attrValue = '_blank';
    } else if (name === 'type') {
      if (node.nodeName !== 'OL' || !/^[1aAiI]$/.test(data.attrValue)) data.keepAttr = false;
    } else if (name === 'start') {
      if (!/^\d{1,4}$/.test(data.attrValue)) data.keepAttr = false;
    }
  });
  p.addHook('afterSanitizeAttributes', (node) => {
    if (node.nodeName === 'A' && node.getAttribute('target') === '_blank') {
      node.setAttribute('rel', 'noopener noreferrer');
    }
  });
  purifier = p;
  return p;
}

export function sanitizeRichHtml(html: string): string {
  if (typeof html !== 'string' || !html) return '';
  return getPurifier().sanitize(html, {
    ALLOWED_TAGS: RICH_TAGS,
    ALLOWED_ATTR: ['href', 'target', 'rel', 'style', 'type', 'start'],
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
  }) as string;
}

/** Lấy văn bản thuần từ HTML (dùng cho tên module, tìm kiếm...). */
export function htmlToText(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = sanitizeRichHtml(html);
  return (div.textContent ?? '').replace(/\s+/g, ' ').trim();
}

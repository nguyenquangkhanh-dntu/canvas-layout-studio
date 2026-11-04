/**
 * Kiểm tra giá trị trước khi đưa vào CSS/HTML.
 * Mọi chuỗi do người dùng nhập (màu, font, URL) đều đi qua đây để tránh chèn CSS/JS.
 */

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const FUNC = /^(rgb|rgba|hsl|hsla)\(\s*[-\d.%\s,/]+\)$/i;
const NAMED = /^[a-z]{3,20}$/i;

export function safeColor(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const v = value.trim();
  if (!v || v.length > 64) return undefined;
  if (HEX.test(v) || FUNC.test(v)) return v;
  if (NAMED.test(v) && !/^(expression|url|javascript)$/i.test(v)) return v.toLowerCase();
  return undefined;
}

export function safeFontFamily(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const v = value.trim();
  if (!v || v.length > 200) return undefined;
  // Chỉ chữ, số, khoảng trắng, dấu phẩy, gạch ngang, gạch dưới và dấu nháy.
  return /^[\p{L}\p{N}\s,"'_-]+$/u.test(v) ? v : undefined;
}

export function safeNumber(value: unknown, min = -10000, max = 10000): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return Math.min(max, Math.max(min, value));
}

const SAFE_PROTOCOLS = ['http:', 'https:', 'mailto:', 'tel:'];

/** URL an toàn cho liên kết: http(s), mailto, tel, đường dẫn tương đối, #anchor. */
export function safeHref(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const v = value.trim();
  if (!v || v.length > 2048) return undefined;
  // Loại bỏ ký tự điều khiển hay bị dùng để né bộ lọc ("java\tscript:").
  const compact = v.replace(/[\u0000-\u001F\u007F\s]+/g, '');
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(compact);
  if (!scheme) return v.startsWith('//') ? undefined : v; // tương đối hoặc #anchor
  return SAFE_PROTOCOLS.includes(scheme[1].toLowerCase() + ':') ? v : undefined;
}

/** URL ảnh: http(s), tương đối hoặc data:image (không cho data:image/svg+xml vì có thể chứa script). */
export function safeImageSrc(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const v = value.trim();
  if (!v) return undefined;
  if (/^data:image\/(png|jpe?g|gif|webp|avif);base64,[a-z0-9+/=\s]+$/i.test(v)) return v;
  if (v.length > 2048) return undefined;
  const href = safeHref(v);
  if (!href || /^(mailto|tel):/i.test(href)) return undefined;
  return href;
}

export function isDataUrl(src: string): boolean {
  return /^data:/i.test(src);
}

export function isExternalUrl(src: string): boolean {
  return /^https?:\/\//i.test(src);
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function escapeAttr(text: string): string {
  return escapeHtml(text);
}

/** Ước lượng kích thước (byte) của data URL base64. */
export function dataUrlBytes(src: string): number {
  const i = src.indexOf(',');
  if (i < 0) return 0;
  return Math.round(((src.length - i - 1) * 3) / 4);
}

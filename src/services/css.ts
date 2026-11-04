import type { Corners, Shadow, Sides, SizeValue, StyleProps } from '../models/style';
import { safeColor, safeFontFamily, safeNumber } from './safe-values';

/** Bảng thuộc tính CSS dạng kebab-case, giữ thứ tự chèn. */
export type CssMap = Record<string, string>;

export type StylePart = 'size' | 'margin' | 'align' | 'background' | 'color' | 'border' | 'radius' | 'shadow' | 'padding' | 'gap' | 'type';

export const ALL_PARTS: StylePart[] = ['size', 'margin', 'align', 'background', 'color', 'border', 'radius', 'shadow', 'padding', 'gap', 'type'];
/** Phần "khung ngoài" của module: vị trí, kích thước, khoảng cách ngoài. */
export const OUTER_PARTS: StylePart[] = ['size', 'margin', 'align'];
/** Phần "hộp" của module: nền, viền, bo góc, bóng, khoảng cách trong. */
export const BOX_PARTS: StylePart[] = ['background', 'color', 'border', 'radius', 'shadow', 'padding', 'type', 'gap'];

const px = (n: number) => `${round(n)}px`;
const round = (n: number) => Math.round(n * 100) / 100;

export function sizeToCss(v: SizeValue | undefined): string | undefined {
  if (!v) return undefined;
  if (v.unit === 'auto') return 'auto';
  const n = safeNumber(v.value, 0, 100000);
  if (n === undefined) return undefined;
  return `${round(n)}${v.unit}`;
}

function sidesToCss(prefix: 'padding' | 'margin', s: Sides | undefined, out: CssMap, autoLR = false) {
  if (!s && !autoLR) return;
  const t = safeNumber(s?.t), r = safeNumber(s?.r), b = safeNumber(s?.b), l = safeNumber(s?.l);
  const right = autoLR ? undefined : r;
  const left = autoLR ? undefined : l;
  if (!autoLR && t !== undefined && r !== undefined && b !== undefined && l !== undefined) {
    out[prefix] = t === r && r === b && b === l ? px(t) : t === b && r === l ? `${px(t)} ${px(r)}` : `${px(t)} ${px(r)} ${px(b)} ${px(l)}`;
    return;
  }
  if (t !== undefined) out[`${prefix}-top`] = px(t);
  if (right !== undefined) out[`${prefix}-right`] = px(right);
  if (b !== undefined) out[`${prefix}-bottom`] = px(b);
  if (left !== undefined) out[`${prefix}-left`] = px(left);
}

export function radiusToCss(c: Corners | undefined): string | undefined {
  if (!c) return undefined;
  const v = [c.tl, c.tr, c.br, c.bl].map((x) => safeNumber(x, 0, 1000));
  if (v.every((x) => x === undefined)) return undefined;
  const [tl, tr, br, bl] = v.map((x) => x ?? 0);
  return tl === tr && tr === br && br === bl ? px(tl) : `${px(tl)} ${px(tr)} ${px(br)} ${px(bl)}`;
}

export function shadowToCss(s: Shadow | undefined): string | undefined {
  if (!s) return undefined;
  if (s.preset === 'none') return 'none';
  const color = safeColor(s.color) ?? 'rgba(15, 23, 42, 0.16)';
  const n = (x: number) => safeNumber(x, -500, 500) ?? 0;
  return `${px(n(s.x))} ${px(n(s.y))} ${px(Math.max(0, n(s.blur)))} ${px(n(s.spread))} ${color}`;
}

/**
 * Chuyển StyleProps thành CSS. Đây là hàm dùng chung cho trình thiết kế, HTML Canvas,
 * HTML độc lập và PNG - bảo đảm bản xem trước và bản xuất giống nhau.
 */
export function styleToCss(style: StyleProps | undefined, parts: StylePart[] = ALL_PARTS): CssMap {
  const out: CssMap = {};
  if (!style) return out;
  const has = (p: StylePart) => parts.includes(p);

  if (has('size')) {
    for (const [key, prop] of [
      ['width', 'width'], ['minWidth', 'min-width'], ['maxWidth', 'max-width'],
      ['height', 'height'], ['minHeight', 'min-height'], ['maxHeight', 'max-height'],
    ] as const) {
      const v = sizeToCss(style[key]);
      if (v) out[prop] = v;
    }
  }

  if (has('margin') || has('align')) {
    const align = has('align') ? style.align : undefined;
    if (has('margin')) sidesToCss('margin', style.margin, out, align === 'center' || align === 'right' || align === 'left');
    if (align === 'center') { out['margin-left'] = 'auto'; out['margin-right'] = 'auto'; }
    else if (align === 'right') { out['margin-left'] = 'auto'; out['margin-right'] = px(safeNumber(style.margin?.r) ?? 0); }
    else if (align === 'left') { out['margin-left'] = px(safeNumber(style.margin?.l) ?? 0); out['margin-right'] = 'auto'; }
  }

  if (has('background')) {
    const g = style.gradient;
    const from = safeColor(g?.from), to = safeColor(g?.to);
    if (g && from && to) {
      out.background = `linear-gradient(${safeNumber(g.angle, -360, 360) ?? 135}deg, ${from}, ${to})`;
    } else {
      const bg = safeColor(style.bg);
      if (bg) out['background-color'] = bg;
    }
  }

  if (has('color')) {
    const c = safeColor(style.color);
    if (c) out.color = c;
  }

  if (has('border')) {
    if (style.borderStyle === 'none') {
      out.border = 'none';
    } else if (style.borderStyle) {
      const w = safeNumber(style.borderWidth, 0, 100) ?? 1;
      const c = safeColor(style.borderColor) ?? '#d0d7de';
      out.border = `${px(w)} ${style.borderStyle} ${c}`;
    }
    const lw = safeNumber(style.borderLeftWidth, 0, 100);
    if (lw !== undefined) {
      out['border-left'] = lw === 0 ? 'none' : `${px(lw)} solid ${safeColor(style.borderLeftColor) ?? '#1f5f8b'}`;
    }
  }

  if (has('radius')) {
    const r = radiusToCss(style.radius);
    if (r) out['border-radius'] = r;
  }

  if (has('shadow')) {
    const s = shadowToCss(style.shadow);
    if (s) out['box-shadow'] = s;
  }

  if (has('padding')) sidesToCss('padding', style.padding, out);

  if (has('gap')) {
    const g = safeNumber(style.gap, 0, 500);
    if (g !== undefined) out.gap = px(g);
  }

  if (has('type')) {
    const ff = safeFontFamily(style.fontFamily);
    if (ff) out['font-family'] = ff;
    const fs = safeNumber(style.fontSize, 6, 200);
    if (fs !== undefined) out['font-size'] = px(fs);
    const fw = safeNumber(style.fontWeight, 100, 900);
    if (fw !== undefined) out['font-weight'] = String(Math.round(fw / 100) * 100);
    if (style.fontStyle === 'italic' || style.fontStyle === 'normal') out['font-style'] = style.fontStyle;
    const lh = safeNumber(style.lineHeight, 0.5, 5);
    if (lh !== undefined) out['line-height'] = String(round(lh));
    const ls = safeNumber(style.letterSpacing, -20, 50);
    if (ls !== undefined) out['letter-spacing'] = px(ls);
    if (style.textAlign && ['left', 'center', 'right', 'justify'].includes(style.textAlign)) out['text-align'] = style.textAlign;
  }

  return out;
}

export function mergeCss(...maps: (CssMap | undefined | false)[]): CssMap {
  const out: CssMap = {};
  for (const m of maps) if (m) Object.assign(out, m);
  return out;
}

export function cssToString(css: CssMap): string {
  return Object.entries(css)
    .filter(([, v]) => v !== '' && v !== undefined)
    .map(([k, v]) => `${k}: ${v}`)
    .join('; ');
}

/** CSS kebab-case -> đối tượng style của React. */
export function cssToReact(css: CssMap | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!css) return out;
  for (const [k, v] of Object.entries(css)) {
    out[k.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())] = v;
  }
  return out;
}

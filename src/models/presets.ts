import type { LayoutNode } from './node';
import type { PageSettings } from './project';
import { DEFAULT_FONT, SHADOW_PRESETS, type StyleProps } from './style';

/** Các khóa style thuộc "phong cách hộp" - được preset thay thế, không đụng tới nội dung hay kích thước. */
export const BOX_STYLE_KEYS: (keyof StyleProps)[] = [
  'bg', 'gradient', 'color', 'borderStyle', 'borderWidth', 'borderColor', 'radius', 'shadow', 'padding',
];
export const TYPE_STYLE_KEYS: (keyof StyleProps)[] = ['fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'lineHeight', 'letterSpacing', 'textAlign'];

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  page: StyleProps;
  accent: string;
  headingColor: string;
  container: StyleProps;
  code: StyleProps;
}

const r = (n: number) => ({ tl: n, tr: n, br: n, bl: n });
const p = (n: number) => ({ t: n, r: n, b: n, l: n });
const shadow = (k: 'sm' | 'md' | 'lg') => ({ ...SHADOW_PRESETS[k], preset: k });
const darkCode: StyleProps = { bg: '#16212e', color: '#e6edf3' };

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'minimal', name: 'Minimal', description: 'Không nền, không viền, chỉ khoảng trắng',
    page: { fontFamily: DEFAULT_FONT, color: '#1f2a37', bg: undefined }, accent: '#1f2a37', headingColor: '#111827',
    container: { bg: 'transparent', gradient: null, borderStyle: 'none', radius: r(0), shadow: { ...shadow('sm'), preset: 'none' }, padding: p(0) },
    code: { bg: '#f3f4f6', color: '#111827' },
  },
  {
    id: 'academic', name: 'Academic', description: 'Nền giấy ấm, chữ có chân, viền mảnh',
    page: { fontFamily: '"Times New Roman", Times, "Liberation Serif", serif', color: '#2a2622' }, accent: '#7a2e2e', headingColor: '#3b2a1a',
    container: { bg: '#fffdf8', gradient: null, borderStyle: 'solid', borderWidth: 1, borderColor: '#e3dccb', radius: r(4), shadow: { ...shadow('sm'), preset: 'none' }, padding: p(28) },
    code: { bg: '#f6f2e9', color: '#2a2622' },
  },
  {
    id: 'modern', name: 'Modern', description: 'Bo góc lớn, bóng đổ mềm',
    page: { fontFamily: DEFAULT_FONT, color: '#1e293b' }, accent: '#0f766e', headingColor: '#0f3d3a',
    container: { bg: '#ffffff', gradient: null, borderStyle: 'none', radius: r(18), shadow: shadow('md'), padding: p(28) },
    code: darkCode,
  },
  {
    id: 'professional', name: 'Professional', description: 'Xanh navy, viền xám, gọn gàng',
    page: { fontFamily: DEFAULT_FONT, color: '#1f2a37' }, accent: '#1f4e79', headingColor: '#1f4e79',
    container: { bg: '#f8fafc', gradient: null, borderStyle: 'solid', borderWidth: 1, borderColor: '#dbe3ec', radius: r(8), shadow: { ...shadow('sm'), preset: 'none' }, padding: p(24) },
    code: darkCode,
  },
  {
    id: 'soft', name: 'Soft Color', description: 'Màu pastel dịu, bo tròn',
    page: { fontFamily: DEFAULT_FONT, color: '#2b3445' }, accent: '#5a67d8', headingColor: '#3c3f8f',
    container: { bg: '#f3f4ff', gradient: null, borderStyle: 'none', radius: r(22), shadow: { ...shadow('sm'), preset: 'none' }, padding: p(28) },
    code: { bg: '#2d2f55', color: '#eef0ff' },
  },
  {
    id: 'dark', name: 'Dark', description: 'Nền tối, chữ sáng',
    page: { fontFamily: DEFAULT_FONT, color: '#e2e8f0', bg: '#0f172a', padding: p(24) }, accent: '#38bdf8', headingColor: '#f8fafc',
    container: { bg: '#1e293b', gradient: null, color: '#e2e8f0', borderStyle: 'solid', borderWidth: 1, borderColor: '#334155', radius: r(12), shadow: { ...shadow('sm'), preset: 'none' }, padding: p(24) },
    code: { bg: '#020617', color: '#e2e8f0' },
  },
  {
    id: 'technical', name: 'Technical', description: 'Phong cách tài liệu kỹ thuật',
    page: { fontFamily: DEFAULT_FONT, color: '#24292f' }, accent: '#0969da', headingColor: '#1f2328',
    container: { bg: '#f6f8fa', gradient: null, borderStyle: 'solid', borderWidth: 1, borderColor: '#d0d7de', radius: r(6), shadow: { ...shadow('sm'), preset: 'none' }, padding: p(20) },
    code: { bg: '#0d1117', color: '#e6edf3' },
  },
];

export function getTheme(id: string): ThemePreset | undefined {
  return THEME_PRESETS.find((t) => t.id === id);
}

function patchKeys(style: StyleProps, patch: StyleProps, keys: (keyof StyleProps)[]): StyleProps {
  const next: StyleProps = { ...style };
  for (const k of keys) {
    if (k in patch) (next as Record<string, unknown>)[k] = patch[k];
  }
  return next;
}

/** Áp dụng phong cách cho một module (chỉ style, giữ nguyên nội dung). */
export function themeStyleFor(node: LayoutNode, theme: ThemePreset): StyleProps {
  switch (node.type) {
    case 'container':
    case 'grid':
      return patchKeys(node.style, { ...theme.container, color: theme.container.color }, BOX_STYLE_KEYS);
    case 'code':
      return { ...node.style, ...theme.code };
    case 'heading':
      return { ...node.style, color: theme.headingColor };
    case 'text':
    case 'checklist':
    case 'quote':
      return { ...node.style, color: theme.container.color ?? theme.page.color };
    default:
      return patchKeys(node.style, theme.container, BOX_STYLE_KEYS);
  }
}

/** Áp dụng cho toàn trang: style trang + mọi container (trừ Section trong suốt) + tiêu đề + code. */
export function applyThemeToTree(nodes: LayoutNode[], theme: ThemePreset) {
  const visit = (n: LayoutNode) => {
    if (n.type === 'container' && n.props.tag !== 'section' && n.props.direction !== 'row') n.style = themeStyleFor(n, theme);
    else if (n.type === 'code') n.style = themeStyleFor(n, theme);
    else if (n.type === 'heading' || (n.type === 'text' && theme.id === 'dark')) {
      // Bỏ màu riêng để màu tiêu đề/màu chữ của trang có hiệu lực.
      const { color: _drop, ...rest } = n.style;
      void _drop;
      n.style = rest;
    }
    n.children?.forEach(visit);
  };
  nodes.forEach(visit);
}

export function applyThemeToPage(page: PageSettings, theme: ThemePreset): PageSettings {
  const style: StyleProps = { ...page.style, fontFamily: theme.page.fontFamily, color: theme.page.color, bg: theme.page.bg, padding: theme.page.padding };
  if (!theme.page.bg) delete style.bg;
  if (!theme.page.padding) delete style.padding;
  return { ...page, style, accent: theme.accent, headingColor: theme.headingColor, themeId: theme.id };
}

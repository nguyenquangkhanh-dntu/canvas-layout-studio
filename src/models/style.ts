/**
 * Mô hình style của một module. Mọi giá trị là tùy chọn:
 * `undefined` = không thiết lập (kế thừa), còn 0 là giá trị thật và luôn được xuất ra.
 */
export type SizeUnit = 'px' | '%' | 'rem' | 'auto';

export interface SizeValue {
  value: number;
  unit: SizeUnit;
}

export interface Sides {
  t?: number;
  r?: number;
  b?: number;
  l?: number;
}

export interface Corners {
  tl?: number;
  tr?: number;
  br?: number;
  bl?: number;
}

export type ShadowPreset = 'none' | 'sm' | 'md' | 'lg' | 'custom';

export interface Shadow {
  preset: ShadowPreset;
  x: number;
  y: number;
  blur: number;
  spread: number;
  color: string;
}

export interface Gradient {
  from: string;
  to: string;
  angle: number;
}

export type BorderStyle = 'none' | 'solid' | 'dashed' | 'dotted';
export type BlockAlign = 'left' | 'center' | 'right';
export type TextAlign = 'left' | 'center' | 'right' | 'justify';

export interface StyleProps {
  width?: SizeValue;
  maxWidth?: SizeValue;
  minWidth?: SizeValue;
  height?: SizeValue;
  minHeight?: SizeValue;
  maxHeight?: SizeValue;
  /** Căn khối (trái/giữa/phải) - dùng margin auto. */
  align?: BlockAlign;

  bg?: string;
  gradient?: Gradient | null;
  color?: string;

  borderStyle?: BorderStyle;
  borderWidth?: number;
  borderColor?: string;
  /** Viền trái riêng (dùng cho callout). */
  borderLeftWidth?: number;
  borderLeftColor?: string;
  radius?: Corners;
  shadow?: Shadow;

  padding?: Sides;
  margin?: Sides;
  gap?: number;

  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  fontStyle?: 'normal' | 'italic';
  lineHeight?: number;
  letterSpacing?: number;
  textAlign?: TextAlign;
  /** Khoảng cách giữa các đoạn trong khối văn bản (px). */
  paragraphSpacing?: number;
}

export const SIZE_KEYS = ['width', 'maxWidth', 'minWidth', 'height', 'minHeight', 'maxHeight'] as const;
export type SizeKey = (typeof SIZE_KEYS)[number];

/** Bộ font an toàn cho tiếng Việt (không dùng Georgia vì thiếu dấu tiếng Việt). */
export const FONT_STACKS: { label: string; value: string }[] = [
  { label: 'Segoe UI (mặc định)', value: '"Segoe UI", Roboto, "Helvetica Neue", Arial, Tahoma, "Liberation Sans", sans-serif' },
  { label: 'Arial', value: 'Arial, "Liberation Sans", sans-serif' },
  { label: 'Tahoma', value: 'Tahoma, Verdana, sans-serif' },
  { label: 'Verdana', value: 'Verdana, Tahoma, sans-serif' },
  { label: 'Calibri', value: 'Calibri, Carlito, "Segoe UI", sans-serif' },
  { label: 'Times New Roman', value: '"Times New Roman", Times, "Liberation Serif", serif' },
  { label: 'Cambria', value: 'Cambria, Caladea, "Times New Roman", serif' },
  { label: 'Courier New', value: '"Courier New", Courier, monospace' },
  { label: 'Consolas', value: 'Consolas, "Courier New", monospace' },
];

export const DEFAULT_FONT = FONT_STACKS[0].value;
export const MONO_FONT = '"Courier New", Consolas, monospace';

export const SHADOW_PRESETS: Record<Exclude<ShadowPreset, 'none' | 'custom'>, Omit<Shadow, 'preset'>> = {
  sm: { x: 0, y: 1, blur: 3, spread: 0, color: 'rgba(15, 23, 42, 0.14)' },
  md: { x: 0, y: 6, blur: 16, spread: -2, color: 'rgba(15, 23, 42, 0.16)' },
  lg: { x: 0, y: 16, blur: 36, spread: -6, color: 'rgba(15, 23, 42, 0.24)' },
};

export function shadowFromPreset(preset: ShadowPreset, base?: Shadow): Shadow {
  if (preset === 'none') return { ...(base ?? { x: 0, y: 4, blur: 12, spread: 0, color: 'rgba(15, 23, 42, 0.16)' }), preset };
  if (preset === 'custom') return { ...(base ?? { x: 0, y: 4, blur: 12, spread: 0, color: 'rgba(15, 23, 42, 0.16)' }), preset };
  return { ...SHADOW_PRESETS[preset], preset };
}

export const SWATCHES = [
  '#ffffff', '#f8fafc', '#eef2f6', '#e2e8f0', '#94a3b8', '#475569', '#1f2a37', '#000000',
  '#1f5f8b', '#1f4e79', '#2563eb', '#0e7490', '#0f766e', '#15803d', '#65a30d', '#ca8a04',
  '#ea580c', '#b42318', '#be185d', '#7c3aed', '#fef3c7', '#fde2e1', '#dcfce7', '#e0f2fe',
];

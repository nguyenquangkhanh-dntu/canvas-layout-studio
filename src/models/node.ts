import type { StyleProps } from './style';

export type ModuleType =
  | 'container'
  | 'columns'
  | 'column'
  | 'grid'
  | 'spacer'
  | 'divider'
  | 'heading'
  | 'text'
  | 'quote'
  | 'callout'
  | 'checklist'
  | 'code'
  | 'image'
  | 'video'
  | 'button'
  | 'schedule'
  | 'curriculum'
  | 'progress'
  | 'table'
  | 'html';

export const MODULE_TYPES: readonly ModuleType[] = [
  'container', 'columns', 'column', 'grid', 'spacer', 'divider', 'heading', 'text',
  'quote', 'callout', 'checklist', 'code', 'image', 'video', 'button', 'schedule', 'curriculum', 'progress', 'table', 'html',
];

/** Giá trị thuộc tính nội dung được phép lưu (dữ liệu JSON thuần). */
export type PropValue = string | number | boolean | null | PropValue[] | { [key: string]: PropValue };
export type NodeProps = Record<string, PropValue>;

/**
 * Một module trên trang. Cây module là nguồn dữ liệu duy nhất;
 * HTML chỉ là kết quả xuất ra, không bao giờ là dữ liệu gốc.
 */
export interface LayoutNode {
  id: string;
  type: ModuleType;
  /** Tên nội bộ hiển thị trong trình thiết kế, không xuất ra HTML. */
  name: string;
  props: NodeProps;
  style: StyleProps;
  children?: LayoutNode[];
  hidden?: boolean;
  locked?: boolean;
  meta?: { preset?: string };
}

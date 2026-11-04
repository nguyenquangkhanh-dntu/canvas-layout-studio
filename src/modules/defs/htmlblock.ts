import type { ModuleDef } from '../types';
import { getProps } from '../types';
import { styleToCss } from '../../services/css';

/* ------------------------------------------------------------------ Khối HTML */

export type HtmlBlockProps = {
  html: string;
  /** Ghi chú nguồn gốc (vd. "Nhập từ Canvas"), chỉ hiện trong trình thiết kế. */
  source: string;
};

/**
 * Giữ nguyên một đoạn HTML (thường là phần nhập từ Canvas mà công cụ chưa chuyển được thành module).
 * Mã luôn được làm sạch theo danh sách thẻ/thuộc tính/CSS của Canvas khi hiển thị và khi xuất.
 */
export const htmlBlockDef: ModuleDef<HtmlBlockProps> = {
  type: 'html',
  label: 'Khối HTML',
  icon: 'html',
  isContainer: false,
  defaultProps: () => ({ html: '<p>Dán hoặc viết mã HTML ở bảng Thuộc tính.</p>', source: '' }),
  defaultStyle: () => ({}),
  groups: ['layout', 'background', 'border', 'spacing'],
  render(node) {
    const p = getProps(node, htmlBlockDef);
    return {
      tag: 'div',
      nodeId: node.id,
      style: styleToCss(node.style),
      raw: typeof p.html === 'string' ? p.html : '',
    };
  },
};

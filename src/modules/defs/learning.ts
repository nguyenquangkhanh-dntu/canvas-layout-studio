import type { HChild, ModuleDef } from '../types';
import { getProps } from '../types';
import { mergeCss, styleToCss } from '../../services/css';
import { safeColor } from '../../services/safe-values';
import { getCalloutVariant } from '../../models/callouts';

export type CalloutProps = {
  variant: string;
  title: string;
  showTitle: boolean;
  icon: string;
  showIcon: boolean;
  titleColor: string;
};

/**
 * Khối học liệu (Mục tiêu, Ghi chú, Cảnh báo, Ví dụ, Bài tập...).
 * Là container: phần thân chứa các module con nên có thể thêm văn bản, ảnh, code...
 */
export const calloutDef: ModuleDef<CalloutProps> = {
  type: 'callout',
  label: 'Callout',
  icon: 'callout',
  isContainer: true,
  accepts: (t) => t !== 'column',
  defaultProps: () => {
    const v = getCalloutVariant('callout');
    return { variant: v.id, title: v.title, showTitle: true, icon: v.emoji, showIcon: true, titleColor: v.titleColor };
  },
  defaultStyle: () => calloutStyle('callout'),
  groups: ['layout', 'typography', 'background', 'border', 'shadow', 'spacing'],
  render(node, ctx) {
    const p = getProps(node, calloutDef);
    const v = getCalloutVariant(p.variant);
    const children: HChild[] = [];
    if (p.showTitle || p.showIcon) {
      const head: HChild[] = [];
      if (p.showIcon && p.icon) {
        head.push({ tag: 'span', attrs: { 'aria-hidden': 'true' }, style: { 'font-size': '1.25em', 'line-height': '1' }, children: [p.icon.slice(0, 8)] });
      }
      if (p.showTitle) {
        head.push({
          tag: 'h3',
          style: { margin: '0', 'font-size': '20px', 'line-height': '1.3', color: safeColor(p.titleColor) ?? v.titleColor },
          editable: { nodeId: node.id, field: 'title', placeholder: 'Tiêu đề' },
          children: [p.title],
        });
      }
      children.push({ tag: 'div', style: { display: 'flex', 'align-items': 'center', gap: '10px' }, children: head });
    }
    children.push(...ctx.children(node));
    return {
      tag: 'aside',
      nodeId: node.id,
      style: mergeCss({ display: 'flex', 'flex-direction': 'column' }, styleToCss(node.style)),
      children,
    };
  },
};

export function calloutStyle(variantId: string) {
  const v = getCalloutVariant(variantId);
  return {
    bg: v.bg,
    // Màu chữ riêng để callout luôn đọc được kể cả khi trang dùng nền tối.
    color: '#1f2a37',
    borderLeftWidth: 5,
    borderLeftColor: v.bar,
    radius: { tl: 10, tr: 10, br: 10, bl: 10 },
    padding: { t: 18, r: 22, b: 18, l: 22 },
    gap: 10,
  };
}

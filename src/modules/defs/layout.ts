import type { ModuleDef, HChild } from '../types';
import { getProps } from '../types';
import { OUTER_PARTS, mergeCss, styleToCss, type CssMap } from '../../services/css';
import { safeColor, safeNumber } from '../../services/safe-values';
import type { BorderStyle } from '../../models/style';

const notColumn = (t: string) => t !== 'column';

export const HEADING_SIZES: Record<number, number> = { 1: 32, 2: 28, 3: 22, 4: 20, 5: 18, 6: 16 };

/* ------------------------------------------------------------------ Container */

export type ContainerProps = {
  title: string;
  showTitle: boolean;
  titleLevel: number;
  titleColor: string;
  direction: 'column' | 'row';
  alignItems: 'stretch' | 'flex-start' | 'center' | 'flex-end';
  tag: 'div' | 'section' | 'article';
};

export const containerDef: ModuleDef<ContainerProps> = {
  type: 'container',
  label: 'Container',
  icon: 'box',
  isContainer: true,
  accepts: notColumn,
  defaultProps: () => ({ title: 'Tiêu đề khối', showTitle: false, titleLevel: 3, titleColor: '', direction: 'column', alignItems: 'stretch', tag: 'div' }),
  defaultStyle: () => ({
    bg: '#ffffff', borderStyle: 'solid', borderWidth: 1, borderColor: '#e2e8f0',
    radius: { tl: 12, tr: 12, br: 12, bl: 12 }, padding: { t: 24, r: 24, b: 24, l: 24 }, gap: 16,
  }),
  groups: ['layout', 'flex', 'typography', 'background', 'border', 'shadow', 'spacing'],
  render(node, ctx) {
    const p = getProps(node, containerDef);
    const row = p.direction === 'row';
    const level = Math.min(6, Math.max(1, Math.round(p.titleLevel || 3)));
    const children: HChild[] = [];
    if (p.showTitle) {
      children.push({
        tag: `h${level}`,
        style: {
          margin: '0',
          color: safeColor(p.titleColor) ?? ctx.page.headingColor,
          'font-size': `${HEADING_SIZES[level]}px`,
          'line-height': '1.3',
          ...(row ? { flex: '1 1 100%' } : {}),
        },
        editable: { nodeId: node.id, field: 'title', placeholder: 'Tiêu đề khối' },
        children: [p.title],
      });
    }
    children.push(...ctx.children(node, row ? { flex: '1 1 200px', 'min-width': '0' } : undefined));
    return {
      tag: p.tag,
      nodeId: node.id,
      style: mergeCss(
        { display: 'flex', 'flex-direction': p.direction, ...(row ? { 'flex-wrap': 'wrap' } : {}), 'align-items': p.alignItems },
        styleToCss(node.style),
      ),
      children,
    };
  },
};

/* ------------------------------------------------------------------ Columns */

export type ColumnsProps = {
  count: number;
  ratios: number[];
  minColWidth: number;
  stackOnMobile: boolean;
  valign: 'stretch' | 'flex-start' | 'center' | 'flex-end';
};

export const columnsDef: ModuleDef<ColumnsProps> = {
  type: 'columns',
  label: 'Columns',
  icon: 'columns2',
  isContainer: true,
  accepts: (t) => t === 'column',
  defaultProps: () => ({ count: 2, ratios: [1, 1], minColWidth: 240, stackOnMobile: true, valign: 'stretch' }),
  defaultStyle: () => ({ gap: 24 }),
  groups: ['layout', 'background', 'border', 'shadow', 'spacing'],
  render(node, ctx) {
    const p = getProps(node, columnsDef);
    return {
      tag: 'div',
      nodeId: node.id,
      style: mergeCss(
        { display: 'flex', 'flex-wrap': p.stackOnMobile ? 'wrap' : 'nowrap', 'align-items': p.valign },
        styleToCss(node.style),
      ),
      children: ctx.children(node),
    };
  },
};

export type ColumnProps = { ratio: number; minWidth: number; stack: boolean };

export const columnDef: ModuleDef<ColumnProps> = {
  type: 'column',
  label: 'Cột',
  icon: 'column',
  isContainer: true,
  draggable: false,
  accepts: notColumn,
  defaultProps: () => ({ ratio: 1, minWidth: 240, stack: true }),
  defaultStyle: () => ({ gap: 16 }),
  groups: ['typography', 'background', 'border', 'shadow', 'spacing'],
  render(node, ctx) {
    const p = getProps(node, columnDef);
    const ratio = safeNumber(p.ratio, 0.1, 12) ?? 1;
    const basis = p.stack ? Math.round(ratio * (safeNumber(p.minWidth, 60, 2000) ?? 240)) : 0;
    return {
      tag: 'div',
      nodeId: node.id,
      style: mergeCss(
        { flex: `${ratio} 1 ${basis}px`, 'min-width': '0', display: 'flex', 'flex-direction': 'column' },
        styleToCss(node.style),
      ),
      children: ctx.children(node),
    };
  },
};

/* ------------------------------------------------------------------ Grid */

export type GridProps = { minColWidth: number };

export const gridDef: ModuleDef<GridProps> = {
  type: 'grid',
  label: 'Grid',
  icon: 'grid',
  isContainer: true,
  accepts: notColumn,
  defaultProps: () => ({ minColWidth: 220 }),
  defaultStyle: () => ({ gap: 16 }),
  groups: ['layout', 'background', 'border', 'shadow', 'spacing'],
  render(node, ctx) {
    const p = getProps(node, gridDef);
    const min = safeNumber(p.minColWidth, 60, 1200) ?? 220;
    return {
      tag: 'div',
      nodeId: node.id,
      style: mergeCss(
        { display: 'grid', 'grid-template-columns': `repeat(auto-fit, minmax(${min}px, 1fr))` },
        styleToCss(node.style),
      ),
      children: ctx.children(node),
    };
  },
};

/* ------------------------------------------------------------------ Spacer */

export type SpacerProps = { height: number };

export const spacerDef: ModuleDef<SpacerProps> = {
  type: 'spacer',
  label: 'Spacer',
  icon: 'spacer',
  isContainer: false,
  defaultProps: () => ({ height: 32 }),
  defaultStyle: () => ({}),
  groups: ['spacing'],
  render(node) {
    const p = getProps(node, spacerDef);
    return {
      tag: 'div',
      nodeId: node.id,
      attrs: { 'aria-hidden': 'true' },
      style: mergeCss({ height: `${safeNumber(p.height, 0, 2000) ?? 32}px` }, styleToCss(node.style, ['margin'])),
    };
  },
};

/* ------------------------------------------------------------------ Divider */

export type DividerProps = { thickness: number; lineStyle: BorderStyle; color: string };

export const dividerDef: ModuleDef<DividerProps> = {
  type: 'divider',
  label: 'Divider',
  icon: 'divider',
  isContainer: false,
  defaultProps: () => ({ thickness: 1, lineStyle: 'solid', color: '#d5dce3' }),
  defaultStyle: () => ({ margin: { t: 8, r: 0, b: 8, l: 0 } }),
  groups: ['layout', 'spacing'],
  render(node) {
    const p = getProps(node, dividerDef);
    const style = p.lineStyle === 'none' ? 'solid' : p.lineStyle;
    const line: CssMap = {
      border: 'none',
      'border-top': `${safeNumber(p.thickness, 1, 40) ?? 1}px ${style} ${safeColor(p.color) ?? '#d5dce3'}`,
      height: '0',
    };
    return { tag: 'hr', nodeId: node.id, style: mergeCss(line, styleToCss(node.style, [...OUTER_PARTS])) };
  },
};

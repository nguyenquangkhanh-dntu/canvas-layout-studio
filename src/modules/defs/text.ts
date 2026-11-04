import type { HChild, HNode, ModuleDef } from '../types';
import { getProps } from '../types';
import { BOX_PARTS, OUTER_PARTS, mergeCss, styleToCss } from '../../services/css';
import { safeColor, safeHref, safeNumber } from '../../services/safe-values';
import { resolveTarget, type LinkTarget } from '../../models/course';
import { MONO_FONT } from '../../models/style';
import type { PropValue } from '../../models/node';
import { HEADING_SIZES } from './layout';

/* ------------------------------------------------------------------ Heading */

export type HeadingProps = {
  text: string;
  level: number;
  /** Liên kết cho cả dòng tiêu đề (để trống: không có liên kết). */
  href: string;
  /** 'auto': trang trong Canvas mở cùng tab, trang ngoài mở tab mới. */
  target: LinkTarget;
  underline: boolean;
};

export const headingDef: ModuleDef<HeadingProps> = {
  type: 'heading',
  label: 'Heading',
  icon: 'heading',
  isContainer: false,
  defaultProps: () => ({ text: 'Tiêu đề', level: 2, href: '', target: 'auto', underline: true }),
  defaultStyle: () => ({ margin: { t: 0, r: 0, b: 0, l: 0 } }),
  groups: ['layout', 'typography', 'background', 'border', 'spacing'],
  render(node, ctx) {
    const p = getProps(node, headingDef);
    const level = Math.min(6, Math.max(1, Math.round(p.level || 2)));
    const href = p.href ? safeHref(p.href) : undefined;
    const underline = p.underline !== false;
    const style = mergeCss(
      { color: ctx.page.headingColor, 'font-size': `${HEADING_SIZES[level]}px`, 'line-height': '1.3', margin: '0' },
      styleToCss(node.style),
    );
    if (!href || ctx.mode === 'editor') {
      // Trình thiết kế: vẫn sửa chữ trực tiếp; tiêu đề có liên kết hiện gạch chân như bản xuất.
      return {
        tag: `h${level}`,
        nodeId: node.id,
        attrs: href ? { title: `Liên kết: ${href}` } : undefined,
        editable: { nodeId: node.id, field: 'text', placeholder: 'Nhập tiêu đề' },
        style: href && underline ? mergeCss(style, { 'text-decoration': 'underline' }) : style,
        children: [p.text],
      };
    }
    const attrs: Record<string, string> = { href };
    if (resolveTarget({ url: href, target: p.target }) === 'new') { attrs.target = '_blank'; attrs.rel = 'noopener noreferrer'; }
    return {
      tag: `h${level}`,
      nodeId: node.id,
      style,
      children: [{ tag: 'a', attrs, style: { color: 'inherit', 'text-decoration': underline ? 'underline' : 'none' }, children: [p.text] }],
    };
  },
};

/* ------------------------------------------------------------------ Text (Rich Text) */

export type TextProps = {
  html: string;
  /** Gạch chân liên kết trong khối. */
  linkUnderline: boolean;
  /** Màu liên kết: màu nhấn của trang hoặc giữ màu chữ của đoạn. */
  linkColor: 'accent' | 'inherit';
};

export const textDef: ModuleDef<TextProps> = {
  type: 'text',
  label: 'Rich Text',
  icon: 'richtext',
  isContainer: false,
  defaultProps: () => ({ html: '<p>Nhập nội dung đoạn văn tại đây.</p>', linkUnderline: true, linkColor: 'accent' }),
  defaultStyle: () => ({ paragraphSpacing: 12 }),
  groups: ['layout', 'typography', 'background', 'border', 'shadow', 'spacing'],
  render(node) {
    const p = getProps(node, textDef);
    return {
      tag: 'div',
      nodeId: node.id,
      style: styleToCss(node.style),
      rich: {
        nodeId: node.id, html: p.html, paragraphSpacing: safeNumber(node.style.paragraphSpacing, 0, 200) ?? 12,
        link: { underline: p.linkUnderline !== false, color: p.linkColor === 'inherit' ? 'inherit' : 'accent' },
      },
    };
  },
};

/* ------------------------------------------------------------------ Quote */

export type QuoteProps = { text: string; cite: string; barColor: string };

export const quoteDef: ModuleDef<QuoteProps> = {
  type: 'quote',
  label: 'Quote',
  icon: 'quote',
  isContainer: false,
  defaultProps: () => ({ text: 'Một câu trích dẫn đáng nhớ liên quan đến bài học.', cite: 'Tác giả', barColor: '' }),
  defaultStyle: () => ({
    padding: { t: 12, r: 20, b: 12, l: 20 }, margin: { t: 0, r: 0, b: 0, l: 0 }, fontStyle: 'italic',
    color: '#334155', bg: '#f8fafc', radius: { tl: 0, tr: 8, br: 8, bl: 0 },
  }),
  groups: ['layout', 'typography', 'background', 'border', 'shadow', 'spacing'],
  render(node, ctx) {
    const p = getProps(node, quoteDef);
    const children: HChild[] = [
      { tag: 'p', style: { margin: '0' }, editable: { nodeId: node.id, field: 'text', multiline: true, placeholder: 'Nội dung trích dẫn' }, children: [p.text] },
    ];
    if (p.cite) {
      children.push({
        tag: 'p',
        style: { margin: '8px 0 0', 'font-size': '0.85em', 'font-style': 'normal', color: '#5b6b77' },
        children: ['- ', { tag: 'cite', style: { 'font-style': 'normal' }, editable: { nodeId: node.id, field: 'cite' }, children: [p.cite] }],
      });
    }
    return {
      tag: 'blockquote',
      nodeId: node.id,
      style: mergeCss({ 'border-left': `4px solid ${safeColor(p.barColor) ?? ctx.page.accent}` }, styleToCss(node.style)),
      children,
    };
  },
};

/* ------------------------------------------------------------------ Checklist */

export type ChecklistItem = { id: string; text: string; checked: boolean };
export type ChecklistProps = { items: ChecklistItem[]; markColor: string };

export const checklistDef: ModuleDef<ChecklistProps> = {
  type: 'checklist',
  label: 'Checklist',
  icon: 'checklist',
  isContainer: false,
  defaultProps: () => ({
    items: [
      { id: 'c1', text: 'Đọc tài liệu chương 1', checked: true },
      { id: 'c2', text: 'Làm bài tập thực hành', checked: false },
      { id: 'c3', text: 'Nộp bài trên Canvas', checked: false },
    ],
    markColor: '',
  }),
  defaultStyle: () => ({ gap: 8 }),
  groups: ['layout', 'typography', 'background', 'border', 'shadow', 'spacing'],
  render(node, ctx) {
    const p = getProps(node, checklistDef);
    const mark = safeColor(p.markColor) ?? ctx.page.accent;
    const items = Array.isArray(p.items) ? p.items : [];
    return {
      tag: 'ul',
      nodeId: node.id,
      style: mergeCss({ 'list-style': 'none', margin: '0', padding: '0', display: 'flex', 'flex-direction': 'column' }, styleToCss(node.style)),
      children: items.map((it, i): HNode => ({
        tag: 'li',
        style: { display: 'flex', gap: '10px', 'align-items': 'flex-start', margin: '0' },
        children: [
          { tag: 'span', attrs: { 'aria-hidden': 'true' }, style: { color: mark, 'flex-shrink': '0', 'line-height': 'inherit' }, children: [it.checked ? '☑' : '☐'] },
          { tag: 'span', editable: { nodeId: node.id, field: `items.${i}.text`, placeholder: 'Mục mới' }, children: [String(it.text ?? '')] },
        ],
      })),
    };
  },
};

export function normalizeChecklistItems(value: PropValue | undefined): ChecklistItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is Record<string, PropValue> => typeof v === 'object' && v !== null && !Array.isArray(v))
    .map((v, i) => ({ id: typeof v.id === 'string' ? v.id : `c${i}`, text: typeof v.text === 'string' ? v.text : '', checked: v.checked === true }));
}

/* ------------------------------------------------------------------ Code */

export type CodeProps = { code: string; language: string; title: string; showCopy: boolean };

export const codeDef: ModuleDef<CodeProps> = {
  type: 'code',
  label: 'Code Block',
  icon: 'code',
  isContainer: false,
  defaultProps: () => ({ code: 'GET /api/books HTTP/1.1\nHost: localhost:5000\nAccept: application/json', language: 'HTTP', title: '', showCopy: true }),
  defaultStyle: () => ({
    bg: '#16212e', color: '#e6edf3', radius: { tl: 10, tr: 10, br: 10, bl: 10 },
    padding: { t: 16, r: 18, b: 16, l: 18 }, fontSize: 15, gap: 10,
  }),
  groups: ['layout', 'typography', 'background', 'border', 'shadow', 'spacing'],
  render(node, ctx) {
    const p = getProps(node, codeDef);
    const outer = styleToCss(node.style, OUTER_PARTS);
    const box = styleToCss(node.style, BOX_PARTS.filter((x) => x !== 'type'));
    const fontSize = safeNumber(node.style.fontSize, 8, 40) ?? 15;
    const header: HChild[] = [];
    const label = [p.title, p.language].filter(Boolean).join(' · ');
    if (label) header.push({ tag: 'span', style: { 'font-size': '13px', color: '#9fb0c0' }, children: [label] });
    if (p.showCopy && ctx.mode === 'standalone') {
      header.push({
        tag: 'button',
        attrs: { type: 'button', 'data-cls-copy': '' },
        style: {
          'font-size': '13px', 'font-family': 'inherit', color: '#e6edf3', 'background-color': 'transparent',
          border: '1px solid #3b4b5c', 'border-radius': '6px', padding: '3px 10px', cursor: 'pointer',
        },
        children: ['Sao chép'],
      });
    }
    const children: HChild[] = [];
    if (header.length) {
      children.push({ tag: 'div', style: { display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', gap: '12px' }, children: header });
    }
    children.push({
      tag: 'pre',
      style: {
        margin: '0', 'white-space': 'pre', 'overflow-x': 'auto', 'font-family': node.style.fontFamily && !/Segoe/.test(node.style.fontFamily) ? node.style.fontFamily : MONO_FONT,
        'font-size': `${fontSize}px`, 'line-height': '1.55', color: 'inherit',
      },
      children: [{ tag: 'code', style: { 'font-family': 'inherit' }, editable: { nodeId: node.id, field: 'code', multiline: true, placeholder: '// code' }, children: [p.code] }],
    });
    return {
      tag: 'div',
      nodeId: node.id,
      style: mergeCss({ display: 'flex', 'flex-direction': 'column' }, outer, box),
      children,
    };
  },
};

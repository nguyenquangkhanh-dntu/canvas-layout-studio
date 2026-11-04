import type { HChild, HNode, ModuleDef } from '../types';
import { getProps } from '../types';
import type { PropValue } from '../../models/node';
import { mergeCss, styleToCss, type CssMap } from '../../services/css';
import { safeColor, safeHref, safeNumber } from '../../services/safe-values';

/**
 * Chương trình học: bảng Tiết × Buổi (như thời khóa biểu), hoặc danh sách theo buổi.
 * Là bảng tĩnh nên xuất ra Canvas gần như y hệt bản thiết kế.
 */

export type CurrCol = { title: string; date: string; url: string };
export type CurrCell = { text: string; em: boolean; url: string };

export type CurriculumProps = {
  layout: 'grid' | 'list';
  rowHeader: string;
  dateRowLabel: string;
  upper: boolean;
  tint: boolean;
  sticky: boolean;
  headBg: string;
  subBg: string;
  colWidth: number;
  rows: string[];
  cols: CurrCol[];
  cells: CurrCell[][];
  /** Gạch chân liên kết trong ô và tiêu đề buổi. */
  linkUnderline: boolean;
};

/** Màu nhạt cho từng buổi, lấy từ bảng màu học liệu của công cụ. */
export const CURR_TINTS = ['#ffffff', '#eef7f1', '#fdf8e4', '#f3f0fb', '#ecf3fa', '#fdf2e6', '#fbeef3'];

const isObj = (v: unknown): v is Record<string, PropValue> => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown) => (typeof v === 'string' ? v : '');

/** Đọc dữ liệu bảng an toàn từ props (dữ liệu có thể đến từ tệp JSON). */
export function readCurriculum(p: CurriculumProps): { rows: string[]; cols: CurrCol[]; cells: CurrCell[][] } {
  const rows = (Array.isArray(p.rows) ? p.rows : []).map(str).slice(0, 40);
  const cols = (Array.isArray(p.cols) ? (p.cols as unknown[]) : []).filter(isObj).slice(0, 40).map((c) => ({ title: str(c.title), date: str(c.date), url: str(c.url) }));
  const rawCells = Array.isArray(p.cells) ? (p.cells as unknown[]) : [];
  const cells = rows.map((_, r) => {
    const row = Array.isArray(rawCells[r]) ? (rawCells[r] as unknown[]) : [];
    return cols.map((_, c) => {
      const x = row[c];
      return isObj(x) ? { text: str(x.text), em: x.em === true, url: str(x.url) } : { text: '', em: false, url: '' };
    });
  });
  return { rows, cols, cells };
}

function cellChildren(cell: CurrCell, underline = true): HChild[] {
  const lines = cell.text.split('\n');
  const content: HChild[] = [];
  lines.forEach((l, i) => { if (i) content.push({ tag: 'br' }); content.push(l); });
  const href = safeHref(cell.url);
  return href ? [{ tag: 'a', attrs: { href }, style: { color: 'inherit', 'text-decoration': underline ? 'underline' : 'none' }, children: content }] : content;
}

export const curriculumDef: ModuleDef<CurriculumProps> = {
  type: 'curriculum',
  label: 'Chương trình học',
  icon: 'curriculum',
  isContainer: false,
  defaultProps: () => ({
    layout: 'grid', rowHeader: 'Tiết', dateRowLabel: 'Ngày', upper: true, tint: true, sticky: true,
    headBg: '#163a56', subBg: '#24557c', colWidth: 180, linkUnderline: true,
    rows: ['Tiết 1', 'Tiết 2', 'Tiết 3'],
    cols: [{ title: 'Buổi 1', date: '', url: '' }, { title: 'Buổi 2', date: '', url: '' }, { title: 'Buổi 3', date: '', url: '' }],
    cells: [0, 1, 2].map(() => [0, 1, 2].map(() => ({ text: '', em: false, url: '' }))),
  }),
  defaultStyle: () => ({ fontSize: 15 }),
  groups: ['layout', 'typography', 'shadow', 'spacing'],
  render(node, ctx) {
    const p = getProps(node, curriculumDef);
    const { rows, cols, cells } = readCurriculum(p);
    const editor = ctx.mode === 'editor';
    const up = (t: string) => (p.upper ? t.toLocaleUpperCase('vi-VN') : t);
    const headBg = safeColor(p.headBg) ?? '#163a56';
    const subBg = safeColor(p.subBg) ?? '#24557c';
    const fontSize = safeNumber(node.style.fontSize, 10, 24) ?? 15;
    const outer = styleToCss({ ...node.style, fontSize: undefined }, ['size', 'margin', 'align', 'shadow']);
    const cellStyle = (c: number, cell: CurrCell): CssMap =>
      cell.em
        ? { 'background-color': '#fdf1f0', color: '#b42318', border: '2px solid #b42318' }
        : { 'background-color': p.tint ? CURR_TINTS[c % CURR_TINTS.length] : '#ffffff', color: '#1f2a37', border: '1px solid #dbe3ec' };
    const cellAttrs = (r: number, c: number) => (editor ? { 'data-cur-r': String(r), 'data-cur-c': String(c) } : undefined);

    if (p.layout === 'list') {
      return {
        tag: 'div',
        nodeId: node.id,
        style: mergeCss({ display: 'flex', 'flex-direction': 'column', gap: '14px', 'font-size': `${fontSize}px` }, outer),
        children: cols.map((col, c): HNode => {
          const head = `${col.title}${col.date ? ` · ${col.date}` : ''}`;
          const href = safeHref(col.url);
          return {
            tag: 'div',
            style: { border: '1px solid #dbe3ec', 'border-radius': '10px', overflow: 'hidden' },
            children: [
              {
                tag: 'div', attrs: cellAttrs(-1, c),
                style: { 'background-color': headBg, color: '#ffffff', padding: '10px 14px', 'font-size': `${fontSize + 1}px` },
                children: [{ tag: 'strong', children: [href ? { tag: 'a', attrs: { href }, style: { color: '#ffffff', 'text-decoration': p.linkUnderline !== false ? 'underline' : 'none' }, children: [head] } : head] }],
              },
              {
                tag: 'table',
                style: { width: '100%', 'border-collapse': 'collapse' },
                children: [{
                  tag: 'tbody',
                  children: rows.map((rl, r): HNode => {
                    const cell = cells[r][c];
                    const cs = cellStyle(c, cell);
                    return {
                      tag: 'tr',
                      children: [
                        { tag: 'th', style: { width: '84px', padding: '8px 10px', 'text-align': 'left', 'font-size': '13px', color: '#1f5f8b', 'background-color': '#f3f6fa', 'border-top': '1px solid #e5eaf0', 'vertical-align': 'top' }, children: [rl] },
                        { tag: 'td', attrs: cellAttrs(r, c), style: mergeCss({ padding: '8px 12px', 'vertical-align': 'top' }, cs, cell.em ? {} : { border: 'none', 'border-top': '1px solid #e5eaf0' }), children: cellChildren(cell, p.linkUnderline !== false) },
                      ],
                    };
                  }),
                }],
              },
            ],
          };
        }),
      };
    }

    const w = safeNumber(p.colWidth, 100, 320) ?? 180;
    const stick: CssMap = p.sticky ? { position: 'sticky', left: '0' } : {};
    const headRow: HNode = {
      tag: 'tr',
      children: [
        { tag: 'th', style: mergeCss({ width: ctx.mode === 'png' ? '72px' : '96px', padding: '12px 8px', 'background-color': headBg, color: '#ffffff', 'font-size': '14px' }, stick), children: [up(p.rowHeader)] },
        ...cols.map((col, c): HNode => {
          const href = safeHref(col.url);
          return {
            tag: 'th', attrs: cellAttrs(-1, c),
            style: { ...(ctx.mode === 'png' ? {} : { width: `${w}px` }), padding: '12px 8px', 'background-color': headBg, color: '#ffffff', 'font-size': '14px', 'text-align': 'center' },
            children: [href ? { tag: 'a', attrs: { href }, style: { color: '#ffffff', 'text-decoration': 'none' }, children: [up(col.title)] } : up(col.title)],
          };
        }),
      ],
    };
    const thead: HChild[] = [headRow];
    if (cols.some((c) => c.date)) {
      thead.push({
        tag: 'tr',
        children: [
          { tag: 'th', style: mergeCss({ padding: '8px', 'background-color': subBg, color: '#dfe9f3', 'font-size': '13px' }, stick), children: [up(p.dateRowLabel)] },
          ...cols.map((col): HNode => ({ tag: 'th', style: { padding: '8px', 'background-color': subBg, color: '#ffffff', 'font-size': '13px', 'text-align': 'center' }, children: [col.date] })),
        ],
      });
    }
    return {
      tag: 'div',
      nodeId: node.id,
      // Ảnh PNG không cuộn được: bỏ độ rộng tối thiểu để cả bảng nằm trong khung (chữ xuống dòng).
      style: mergeCss(ctx.mode === 'png'
        ? { overflow: 'hidden', border: '1px solid #dbe3ec', 'border-radius': '10px' }
        : { 'overflow-x': 'auto', 'overflow-y': 'hidden', border: '1px solid #dbe3ec', 'border-radius': '10px' }, outer),
      children: [{
        tag: 'table',
        style: mergeCss({ 'border-collapse': 'collapse', width: '100%', 'table-layout': 'fixed', 'font-size': `${ctx.mode === 'png' ? Math.min(fontSize, 13) : fontSize}px`, 'line-height': '1.45' },
          ctx.mode === 'png' ? { 'overflow-wrap': 'break-word' } : { 'min-width': `${96 + cols.length * w}px` }),
        children: [
          { tag: 'thead', children: thead },
          {
            tag: 'tbody',
            children: rows.map((rl, r): HNode => ({
              tag: 'tr',
              children: [
                { tag: 'th', style: mergeCss({ padding: '10px 8px', 'background-color': '#f3f6fa', color: '#1f5f8b', 'font-size': '14px', border: '1px solid #dbe3ec', 'text-align': 'center' }, stick), children: [rl] },
                ...cols.map((_, c): HNode => ({ tag: 'td', attrs: cellAttrs(r, c), style: mergeCss({ padding: ctx.mode === 'png' ? '8px' : '10px 12px', 'vertical-align': 'top' }, cellStyle(c, cells[r][c])), children: cellChildren(cells[r][c], p.linkUnderline !== false) })),
              ],
            })),
          },
        ],
      }],
    };
  },
};

/**
 * Đọc bảng dán từ Excel/Google Sheets (cột cách nhau bằng Tab).
 * Hàng đầu: tiêu đề cột; hàng bắt đầu bằng "Ngày" (tùy chọn) là ngày; cột đầu: tên hàng.
 */
export function parsePastedTable(text: string): Pick<CurriculumProps, 'rowHeader' | 'rows' | 'cols' | 'cells'> | null {
  const lines = text.replace(/\r/g, '').split('\n').filter((l) => l.trim()).map((l) => l.split('\t'));
  if (lines.length < 2 || lines[0].length < 2) return null;
  const head = lines.shift()!;
  let dates: string[] | null = null;
  if (lines[0] && /^ng[aà]y$/i.test(lines[0][0].trim())) dates = lines.shift()!;
  const cols = head.slice(1, 41).map((t, i) => ({ title: t.trim() || `Buổi ${i + 1}`, date: dates ? (dates[i + 1] ?? '').trim() : '', url: '' }));
  const body = lines.slice(0, 40);
  return {
    rowHeader: head[0].trim() || 'Tiết',
    rows: body.map((r) => r[0].trim()),
    cols,
    cells: body.map((r) => cols.map((_, i) => {
      const t = (r[i + 1] ?? '').trim();
      return { text: t, em: /^(NGHIỆM THU|KIỂM TRA|THI )/u.test(t), url: '' };
    })),
  };
}

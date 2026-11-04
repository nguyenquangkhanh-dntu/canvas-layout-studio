import type { HChild, HNode, ModuleDef } from '../types';
import { getProps } from '../types';
import type { PropValue } from '../../models/node';
import { OUTER_PARTS, mergeCss, styleToCss, type CssMap } from '../../services/css';
import { safeColor, safeHref } from '../../services/safe-values';

/* ------------------------------------------------------------------ Bảng */

export type TableCell = { text: string; url: string };

export type TableProps = {
  /** Hàng × cột; hàng đầu là tiêu đề khi header = true. */
  rows: TableCell[][];
  header: boolean;
  /** Cột đầu in đậm như tiêu đề hàng. */
  firstCol: boolean;
  striped: boolean;
  borders: 'all' | 'rows';
  headBg: string;
  headColor: string;
  caption: string;
  compact: boolean;
  /** Gạch chân liên kết trong ô. */
  linkUnderline: boolean;
};

const BORDER = '#d5dce3';
export const MAX_TABLE_ROWS = 200;
export const MAX_TABLE_COLS = 20;

const cell = (text = '', url = ''): TableCell => ({ text, url });

/** Đọc dữ liệu bảng an toàn (dữ liệu nhập từ JSON có thể thiếu hoặc lệch số cột). */
export function readTable(rows: PropValue | undefined): TableCell[][] {
  if (!Array.isArray(rows)) return [[cell()]];
  const out = rows.slice(0, MAX_TABLE_ROWS).map((r) =>
    (Array.isArray(r) ? r : []).slice(0, MAX_TABLE_COLS).map((c) => {
      if (typeof c === 'string') return cell(c);
      if (c && typeof c === 'object' && !Array.isArray(c)) {
        return cell(typeof c.text === 'string' ? c.text : '', typeof c.url === 'string' ? c.url : '');
      }
      return cell();
    }),
  );
  const width = Math.max(1, ...out.map((r) => r.length));
  return (out.length ? out : [[]]).map((r) => [...r, ...Array.from({ length: width - r.length }, () => cell())]);
}

/** Văn bản ô: xuống dòng thành <br>, có liên kết thì bọc <a>. */
function cellChildren(c: TableCell, underline = true): HChild[] {
  const lines = c.text.split('\n');
  const text: HChild[] = lines.flatMap((l, i) => (i ? [{ tag: 'br' } as HNode, l] : [l]));
  const href = c.url ? safeHref(c.url) : undefined;
  if (!href) return text;
  const attrs: Record<string, string> = { href };
  if (/^https?:\/\//i.test(href)) { attrs.target = '_blank'; attrs.rel = 'noopener noreferrer'; }
  return [{ tag: 'a', attrs, style: { color: 'inherit', 'text-decoration': underline ? 'underline' : 'none' }, children: text }];
}

export const tableDef: ModuleDef<TableProps> = {
  type: 'table',
  label: 'Bảng',
  icon: 'table',
  isContainer: false,
  defaultProps: () => ({
    rows: [
      [cell('Tuần'), cell('Nội dung'), cell('Hạn nộp')],
      [cell('1'), cell('Giới thiệu học phần'), cell('')],
      [cell('2'), cell('Bài tập 1'), cell('Chủ nhật')],
    ],
    header: true, firstCol: false, striped: true, borders: 'rows', headBg: '#163a56', headColor: '#ffffff', caption: '', compact: false, linkUnderline: true,
  }),
  defaultStyle: () => ({ fontSize: 15 }),
  groups: ['layout', 'typography', 'spacing'],
  render(node, ctx) {
    const p = getProps(node, tableDef);
    const rows = readTable(p.rows as unknown as PropValue);
    const editor = ctx.mode === 'editor';
    const headBg = safeColor(p.headBg) ?? '#163a56';
    const headColor = safeColor(p.headColor) ?? '#ffffff';
    const pad = p.compact ? '5px 8px' : '9px 12px';
    const fontSize = node.style.fontSize ?? 15;
    const line = (last: boolean): CssMap => (p.borders === 'all' ? { border: `1px solid ${BORDER}` } : last ? {} : { 'border-bottom': `1px solid ${BORDER}` });
    const attrs = (r: number, c: number) => (editor ? { 'data-tb-r': String(r), 'data-tb-c': String(c) } : undefined);

    const head = p.header ? rows[0] : null;
    const body = p.header ? rows.slice(1) : rows;
    const children: HChild[] = [];
    if (p.caption) {
      children.push({ tag: 'caption', style: { 'caption-side': 'top', 'text-align': 'left', padding: '0 0 8px', 'font-size': '0.9em', color: '#475569' }, editable: { nodeId: node.id, field: 'caption' }, children: [p.caption] });
    }
    if (head) {
      children.push({
        tag: 'thead',
        children: [{
          tag: 'tr',
          children: head.map((c, i): HNode => ({
            tag: 'th', attrs: mergeAttrs(attrs(0, i), { scope: 'col' }),
            style: mergeCss({ padding: pad, 'text-align': 'left', 'vertical-align': 'bottom', 'background-color': headBg, color: headColor, 'font-weight': '700' }, p.borders === 'all' ? { border: `1px solid ${headBg}` } : {}),
            children: cellChildren(c, p.linkUnderline !== false),
          })),
        }],
      });
    }
    children.push({
      tag: 'tbody',
      children: body.map((row, ri): HNode => {
        const r = p.header ? ri + 1 : ri;
        const zebra: CssMap = p.striped && ri % 2 === 1 ? { 'background-color': '#f7f9fb' } : {};
        return {
          tag: 'tr',
          style: zebra,
          children: row.map((c, ci): HNode => {
            const isHead = p.firstCol && ci === 0;
            return {
              tag: isHead ? 'th' : 'td',
              attrs: mergeAttrs(attrs(r, ci), isHead ? { scope: 'row' } : {}),
              style: mergeCss({ padding: pad, 'text-align': 'left', 'vertical-align': 'top' }, line(ri === body.length - 1), isHead ? { 'font-weight': '700', color: '#163a56' } : {}),
              children: cellChildren(c, p.linkUnderline !== false),
            };
          }),
        };
      }),
    });
    return {
      tag: 'div',
      nodeId: node.id,
      style: mergeCss({ 'overflow-x': 'auto' }, styleToCss(node.style, OUTER_PARTS)),
      children: [{
        tag: 'table',
        style: mergeCss(
          { width: '100%', 'border-collapse': 'collapse', 'font-size': `${fontSize}px`, 'line-height': '1.45' },
          styleToCss({ color: node.style.color, fontFamily: node.style.fontFamily, textAlign: node.style.textAlign }),
          p.borders === 'rows' ? { 'border-top': `2px solid ${headBg}`, 'border-bottom': `1px solid ${BORDER}` } : {},
        ),
        children,
      }],
    };
  },
};

function mergeAttrs(a: Record<string, string> | undefined, b: Record<string, string>): Record<string, string> | undefined {
  const out = { ...(a ?? {}), ...b };
  return Object.keys(out).length ? out : undefined;
}

/** Bảng dán từ Excel (các cột cách nhau bằng Tab). */
export function parseTsvTable(text: string): TableCell[][] | null {
  const lines = text.replace(/\r\n?/g, '\n').split('\n').filter((l) => l.trim() !== '');
  if (!lines.length) return null;
  const rows = lines.slice(0, MAX_TABLE_ROWS).map((l) => l.split('\t').slice(0, MAX_TABLE_COLS).map((t) => cell(t.trim())));
  if (rows.length === 1 && rows[0].length === 1) return null;
  return readTable(rows as unknown as PropValue);
}

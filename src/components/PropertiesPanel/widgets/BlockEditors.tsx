import { useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Plus, Trash2, Wand2 } from 'lucide-react';
import { useEditor } from '../../../editor/store';
import { useWidgetUi } from '../../../editor/widget-ui';
import { locate } from '../../../editor/tree';
import type { LayoutNode, NodeProps } from '../../../models/node';
import { getProps } from '../../../modules/types';
import { MAX_TABLE_COLS, MAX_TABLE_ROWS, parseTsvTable, readTable, tableDef, type TableCell } from '../../../modules/defs/table';
import { htmlBlockDef } from '../../../modules/defs/htmlblock';
import { safeHref } from '../../../services/safe-values';
import { convertHtmlBlock, formatHtml } from '../../../services/html-importer';
import { sanitizeBlockHtml } from '../../../services/block-sanitizer';
import { Btn, ColorInput, Field, Hint, IconBtn, Section, Segmented, TextArea, TextInput, Toggle, uiStyles } from '../../ui/controls';
import { toast, toastError } from '../../ui/Toasts';
import s from './widgets.module.css';
import { LINK_UNDERLINE_LABEL } from '../link-label';

type Upd = (patch: NodeProps, key?: string) => void;
const useUpd = (node: LayoutNode): Upd => (patch, key) => useEditor.getState().updateProps(node.id, patch, { key: key ? `prop:${node.id}:${key}` : undefined });
const emptyCell = (): TableCell => ({ text: '', url: '' });

/* ------------------------------------------------------------------ Bảng */

export function TableEditor({ node }: { node: LayoutNode }) {
  const p = getProps(node, tableDef);
  const rows = readTable(p.rows as unknown as NodeProps[string]);
  const upd = useUpd(node);
  const sel = useWidgetUi((u) => (u.cell?.nodeId === node.id ? u.cell : null));
  const [paste, setPaste] = useState('');
  const nCols = rows[0]?.length ?? 1;
  const setRows = (next: TableCell[][], key?: string) => upd({ rows: next as unknown as NodeProps[string] }, key);
  const valid = sel && sel.r >= 0 && sel.r < rows.length && sel.c < nCols;
  const select = (r: number, c: number) => useWidgetUi.getState().setCell({ nodeId: node.id, r, c });
  const copy = () => rows.map((r) => r.map((c) => ({ ...c })));

  const withCell = (patch: Partial<TableCell>, key?: string) => {
    if (!valid) return;
    const next = copy();
    next[sel.r][sel.c] = { ...next[sel.r][sel.c], ...patch };
    setRows(next, key);
  };
  const insertRow = (at: number) => {
    if (rows.length >= MAX_TABLE_ROWS) return toastError(`Bảng tối đa ${MAX_TABLE_ROWS} hàng.`);
    const next = copy();
    next.splice(at, 0, Array.from({ length: nCols }, emptyCell));
    setRows(next);
    select(at, valid ? sel.c : 0);
  };
  const insertCol = (at: number) => {
    if (nCols >= MAX_TABLE_COLS) return toastError(`Bảng tối đa ${MAX_TABLE_COLS} cột.`);
    setRows(copy().map((r) => { r.splice(at, 0, emptyCell()); return r; }));
    select(valid ? sel.r : 0, at);
  };
  const urlOk = (u: string) => u === '' || !!safeHref(u);
  const headerRow = p.header && valid && sel.r === 0;

  return (
    <>
      {valid && <style>{`[data-node-id="${node.id}"] [data-tb-r="${sel.r}"][data-tb-c="${sel.c}"] { box-shadow: inset 0 0 0 3px #2f7cb3 !important; }`}</style>}
      <Section title="Ô đang chọn" id="table-cell">
        {!valid ? (
          <Hint>Nhấp một ô trên bảng để sửa nội dung.</Hint>
        ) : (
          <>
            <div className={s.cellHead}>{headerRow ? 'Tiêu đề' : `Hàng ${p.header ? sel.r : sel.r + 1}`} · Cột {sel.c + 1}</div>
            <Field label="Nội dung" stack hint="Enter để xuống dòng trong ô.">
              <TextArea value={rows[sel.r][sel.c].text} rows={3} onChange={(v) => withCell({ text: v }, `cell-${sel.r}-${sel.c}`)} />
            </Field>
            <Field label="Liên kết" stack hint={urlOk(rows[sel.r][sel.c].url) ? undefined : <span className={s.err}>Liên kết không hợp lệ, sẽ không được xuất.</span>}>
              <TextInput value={rows[sel.r][sel.c].url} placeholder="Không bắt buộc" onChange={(v) => withCell({ url: v.trim() }, `cell-url-${sel.r}-${sel.c}`)} />
            </Field>
            <div className={uiStyles.row}>
              <IconBtn small label="Thêm hàng phía trên" onClick={() => insertRow(sel.r)}><ArrowUp size={13} /></IconBtn>
              <IconBtn small label="Thêm hàng phía dưới" onClick={() => insertRow(sel.r + 1)}><ArrowDown size={13} /></IconBtn>
              <IconBtn small label="Thêm cột bên trái" onClick={() => insertCol(sel.c)}><ArrowLeft size={13} /></IconBtn>
              <IconBtn small label="Thêm cột bên phải" onClick={() => insertCol(sel.c + 1)}><ArrowRight size={13} /></IconBtn>
            </div>
            <div className={uiStyles.row}>
              <Btn size="sm" variant="danger" disabled={rows.length <= 1} onClick={() => { setRows(rows.filter((_, i) => i !== sel.r)); useWidgetUi.getState().setCell(null); }}><Trash2 size={13} /> Xóa hàng</Btn>
              <Btn size="sm" variant="danger" disabled={nCols <= 1} onClick={() => { setRows(rows.map((r) => r.filter((_, i) => i !== sel.c))); useWidgetUi.getState().setCell(null); }}><Trash2 size={13} /> Xóa cột</Btn>
            </div>
          </>
        )}
      </Section>
      <Section title="Hàng và cột" id="table-structure">
        <div className={uiStyles.row}>
          <Btn size="sm" onClick={() => insertRow(rows.length)}><Plus size={13} /> Thêm hàng</Btn>
          <Btn size="sm" onClick={() => insertCol(nCols)}><Plus size={13} /> Thêm cột</Btn>
        </div>
        <Hint>{p.header ? rows.length - 1 : rows.length} hàng dữ liệu × {nCols} cột{p.header ? ', thêm 1 hàng tiêu đề' : ''}.</Hint>
      </Section>
      <Section title="Dán từ Excel" id="table-paste" defaultOpen={false}>
        <TextArea value={paste} rows={5} mono placeholder="Chọn vùng bảng trong Excel, Ctrl+C rồi dán vào đây" onChange={setPaste} />
        <Hint>Hàng đầu được dùng làm tiêu đề nếu bật "Hàng tiêu đề".</Hint>
        <div className={uiStyles.row}>
          <Btn size="sm" variant="primary" onClick={() => {
            const t = parseTsvTable(paste);
            if (!t) return toastError('Chưa nhận ra bảng. Hãy sao chép từ Excel (các cột cách nhau bằng phím Tab).');
            setRows(t);
            useWidgetUi.getState().setCell(null);
            toast(`Đã nhập ${t.length} hàng × ${t[0].length} cột. Có thể Hoàn tác (Ctrl+Z).`);
          }}>Thay bằng dữ liệu đã dán</Btn>
          <Btn size="sm" onClick={() => setPaste(rows.map((r) => r.map((c) => c.text.replace(/\n/g, ' ')).join('\t')).join('\n'))}>Lấy bảng hiện tại</Btn>
        </div>
      </Section>
      <Section title="Hiển thị" id="table-look">
        <Toggle checked={p.header} onChange={(v) => upd({ header: v })} label="Hàng đầu là tiêu đề" />
        <Toggle checked={p.firstCol} onChange={(v) => upd({ firstCol: v })} label="Cột đầu in đậm (tiêu đề hàng)" />
        <Toggle checked={p.striped} onChange={(v) => upd({ striped: v })} label="Tô xen kẽ các hàng" />
        <Toggle checked={p.compact} onChange={(v) => upd({ compact: v })} label="Gọn (ô thấp hơn)" />
        <Toggle checked={p.linkUnderline !== false} onChange={(v) => upd({ linkUnderline: v })} label={`${LINK_UNDERLINE_LABEL} (liên kết trong ô)`} />
        <Field label="Đường kẻ"><Segmented value={p.borders} onChange={(v) => upd({ borders: v })} options={[{ value: 'rows', label: 'Giữa các hàng' }, { value: 'all', label: 'Mọi ô' }]} /></Field>
        <Field label="Màu tiêu đề"><ColorInput value={p.headBg} allowTransparent={false} onChange={(v) => v && upd({ headBg: v }, 'headBg')} /></Field>
        <Field label="Chữ tiêu đề"><ColorInput value={p.headColor} allowTransparent={false} onChange={(v) => v && upd({ headColor: v }, 'headColor')} /></Field>
        <Field label="Chú thích bảng" hint="Hiện phía trên bảng. Để trống nếu không cần."><TextInput value={p.caption} maxLength={200} placeholder="Bảng 1. Lịch nộp bài" onChange={(v) => upd({ caption: v }, 'caption')} /></Field>
        <Hint>Bảng rộng hơn trang sẽ cuộn ngang trên điện thoại và trong Canvas.</Hint>
      </Section>
    </>
  );
}

/* ------------------------------------------------------------------ Khối HTML */

export function HtmlBlockEditor({ node }: { node: LayoutNode }) {
  const p = getProps(node, htmlBlockDef);
  const upd = useUpd(node);
  const html = typeof p.html === 'string' ? p.html : '';
  const cleanLen = sanitizeBlockHtml(html).length;

  const tryConvert = () => {
    const res = convertHtmlBlock(html);
    const nodes = res.nodes;
    if (!nodes.length || (nodes.length === 1 && nodes[0].type === 'html')) return toastError('Không chuyển được thêm: nội dung này cần giữ nguyên dạng HTML.');
    const ok = useEditor.getState().commit((d) => {
      const loc = locate(d.nodes as LayoutNode[], node.id);
      if (!loc || loc.node.locked) return;
      loc.siblings.splice(loc.index, 1, ...nodes);
    });
    if (!ok) return toastError('Không chuyển được (module đang khóa hoặc vị trí không cho phép).');
    useEditor.getState().select(nodes[0].id);
    const left = nodes.filter((n) => n.type === 'html').length;
    toast(`Đã chuyển thành ${nodes.length} module${left ? `, còn ${left} Khối HTML` : ''}. Không ưng thì Hoàn tác (Ctrl+Z).`);
  };

  return (
    <Section title="Mã HTML" id="html-code">
      {p.source && <div className={s.cellHead}>{p.source}</div>}
      <TextArea value={html} rows={14} mono ariaLabel="Mã HTML" onChange={(v) => upd({ html: v }, 'html')} />
      <Hint>Khi hiển thị và khi xuất, mã được lọc theo danh sách thẻ, thuộc tính và CSS mà Canvas cho phép. Script và sự kiện (onclick...) luôn bị loại bỏ.{cleanLen < html.trim().length * 0.6 && html.length > 40 ? ' Một phần mã sẽ bị loại bỏ khi xuất.' : ''}</Hint>
      <div className={uiStyles.row}>
        <Btn size="sm" onClick={() => upd({ html: formatHtml(html) })}>Định dạng lại mã</Btn>
        <Btn size="sm" variant="primary" onClick={tryConvert}><Wand2 size={13} /> Thử chuyển thành module</Btn>
      </div>
      <Hint>"Thử chuyển thành module" tách mã thành Tiêu đề, Đoạn văn, Ảnh, Bảng..., bảng dàn trang thành các cột. Không ưng thì Hoàn tác.</Hint>
    </Section>
  );
}

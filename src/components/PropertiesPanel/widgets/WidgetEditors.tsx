import { useState, type ReactElement } from 'react';
import { ArrowLeft, ArrowRight, Plus, Trash2, X } from 'lucide-react';
import { useEditor } from '../../../editor/store';
import { useWidgetUi } from '../../../editor/widget-ui';
import { locate } from '../../../editor/tree';
import type { LayoutNode, NodeProps } from '../../../models/node';
import type { StyleProps } from '../../../models/style';
import { WD_SHORT, addDays, countsProgress, ddmm, isDateKey, monthLabel, monthRange, periodTotals, periodsOf, resolveMonth, sortedSessions, todayKey, weekdayMon0 } from '../../../models/course';
import { getProps } from '../../../modules/types';
import { miniScheduleStyle, scheduleDef, type ScheduleSize } from '../../../modules/defs/schedule';
import { curriculumDef, parsePastedTable, readCurriculum, type CurrCell, type CurrCol } from '../../../modules/defs/curriculum';
import { progressDef } from '../../../modules/defs/progress';
import { safeHref } from '../../../services/safe-values';
import { Btn, ColorInput, Field, Hint, IconBtn, NumberInput, Section, Segmented, Select, TextArea, TextInput, Toggle, uiStyles } from '../../ui/controls';
import { toast, toastError } from '../../ui/Toasts';
import { CourseEditor, RepeatSection, TermSection, TotalPeriodsField, emptySession } from './CourseEditor';
import { uid } from '../../../utils/id';
import s from './widgets.module.css';
import { LINK_UNDERLINE_LABEL } from '../link-label';

type Upd = (patch: NodeProps, key?: string) => void;
const useUpd = (node: LayoutNode): Upd => (patch, key) => useEditor.getState().updateProps(node.id, patch, { key: key ? `prop:${node.id}:${key}` : undefined });

/* ------------------------------------------------------------------ Lịch học */

const SIZE_ICON: Record<ScheduleSize, ReactElement> = {
  full: (
    <svg width="46" height="30" viewBox="0 0 46 30" aria-hidden="true"><rect x=".5" y=".5" width="45" height="29" rx="3" fill="#fff" stroke="#c6d1dc" /><rect x="4" y="3" width="18" height="3" rx="1" fill="#163a56" /><rect x="4" y="9" width="10" height="6" rx="1" fill="#1f5f8b" /><rect x="18" y="9" width="10" height="6" rx="1" fill="#e5eaf0" /><rect x="32" y="9" width="10" height="6" rx="1" fill="#0f766e" /><rect x="4" y="19" width="10" height="6" rx="1" fill="#e5eaf0" /><rect x="18" y="19" width="10" height="6" rx="1" fill="#1f5f8b" /><rect x="32" y="19" width="10" height="6" rx="1" fill="#e5eaf0" /></svg>
  ),
  compact: (
    <svg width="46" height="30" viewBox="0 0 46 30" aria-hidden="true"><rect x=".5" y=".5" width="45" height="29" rx="3" fill="#fff" stroke="#c6d1dc" /><rect x="4" y="3" width="14" height="3" rx="1" fill="#163a56" />{[0, 1, 2, 3, 4, 5].map((i) => <g key={i}><circle cx={7 + i * 6.5} cy="13" r="1.6" fill={i % 2 ? '#1f5f8b' : '#cbd5e1'} /><circle cx={7 + i * 6.5} cy="21" r="1.6" fill={i === 3 ? '#b42318' : '#cbd5e1'} /></g>)}</svg>
  ),
  mini: (
    <svg width="46" height="30" viewBox="0 0 46 30" aria-hidden="true"><rect x="12.5" y=".5" width="21" height="29" rx="3" fill="#fff" stroke="#c6d1dc" />{[0, 1, 2].map((r) => [0, 1, 2].map((c) => <circle key={`${r}${c}`} cx={17 + c * 6} cy={10 + r * 7} r="2.2" fill={(r + c) % 3 === 0 ? '#1f5f8b' : '#e5eaf0'} />))}</svg>
  ),
};

export function ScheduleEditor({ node }: { node: LayoutNode }) {
  const p = getProps(node, scheduleDef);
  const course = useEditor((st) => st.project.course);
  const upd = useUpd(node);
  const month = resolveMonth(p.month, course, todayKey());
  const months = monthRange(course, month);
  const mini = p.size === 'mini';

  const setSize = (size: ScheduleSize) => {
    if (size === p.size) return;
    useEditor.getState().commit((d) => {
      const loc = locate(d.nodes as LayoutNode[], node.id);
      if (!loc || loc.node.locked) return;
      loc.node.props.size = size;
      if (size === 'mini') {
        loc.node.style = { ...loc.node.style, ...miniScheduleStyle() } as StyleProps;
        if (loc.node.name === 'Lịch học') loc.node.name = 'Lịch học mini';
      } else if (p.size === 'mini') {
        const { maxWidth: _drop, ...rest } = loc.node.style;
        void _drop;
        loc.node.style = { ...rest, padding: { t: 20, r: 20, b: 20, l: 20 } };
        if (loc.node.name === 'Lịch học mini') loc.node.name = 'Lịch học';
      }
    });
  };

  return (
    <>
      <Section title="Lịch học" id="schedule">
        <div className={s.sizes} role="group" aria-label="Kích thước lịch">
          {([['full', 'Đầy đủ'], ['compact', 'Gọn'], ['mini', 'Mini']] as [ScheduleSize, string][]).map(([k, l]) => (
            <button key={k} type="button" aria-pressed={p.size === k} onClick={() => setSize(k)}>{SIZE_ICON[k]}{l}</button>
          ))}
        </div>
        <Hint>{mini ? 'Mini: vòng tròn tô màu, không chữ trong ô. Hợp cột bên rộng 220 đến 320px.' : p.size === 'compact' ? 'Gọn: ô nhỏ, chấm màu, không nhãn.' : 'Đầy đủ: nhãn trong ô, cột tuần, danh sách buổi học.'}</Hint>
        {mini ? (
          <Field label="Kiểu tiêu đề" stack hint={!p.showTitle ? 'Chỉ hiện tháng. Hợp khi phía trên đã có tiêu đề riêng.' : p.titleStyle === 'split' ? 'Tiêu đề nhỏ ở trên, tháng ở dưới.' : `Hiện "${p.title || 'Lịch học'} - Tháng ...", sinh viên nhìn là biết ngay. Cột hẹp thì chữ tự xuống dòng.`}>
            <Segmented
              value={!p.showTitle ? 'month' : p.titleStyle === 'split' ? 'split' : 'inline'}
              onChange={(v) => upd(v === 'month' ? { showTitle: false } : { showTitle: true, titleStyle: v })}
              options={[{ value: 'inline', label: 'Gộp một dòng' }, { value: 'split', label: 'Tách hai dòng' }, { value: 'month', label: 'Chỉ tháng' }]}
            />
          </Field>
        ) : (
          <Field label="Tiêu đề"><Toggle checked={p.showTitle} onChange={(v) => upd({ showTitle: v })} label={p.showTitle ? 'Hiện' : 'Ẩn'} /></Field>
        )}
        {p.showTitle && <Field label="Nội dung tiêu đề" hint="Hoặc nhấp vào tiêu đề trên lịch để sửa trực tiếp."><TextInput value={p.title} maxLength={120} onChange={(v) => upd({ title: v }, 'title')} /></Field>}
        <Field label="Tháng hiển thị" hint={mini ? 'Khi xuất cho Canvas, lịch mini hiện đúng tháng này.' : 'Tự động: tháng hiện tại nếu đang trong học kỳ.'}>
          <Select value={p.month === 'auto' ? 'auto' : month} onChange={(v) => upd({ month: v })} options={[{ value: 'auto', label: `Tự động (${monthLabel(resolveMonth('auto', course, todayKey()))})` }, ...months.map((m) => ({ value: m, label: monthLabel(m) }))]} />
        </Field>
        <Field label="Tuần bắt đầu"><Segmented value={p.weekStart} onChange={(v) => upd({ weekStart: v })} options={[{ value: 'mon', label: 'Thứ Hai' }, { value: 'sun', label: 'Chủ Nhật' }]} /></Field>
        {mini ? (
          <Toggle checked={p.showNext} onChange={(v) => upd({ showNext: v })} label='Hiện dòng "Buổi tới"' />
        ) : (
          <>
            <Toggle checked={p.showWeekNo} onChange={(v) => upd({ showWeekNo: v })} label="Hiện cột tuần học" />
            <Field label="Đánh dấu ngày"><Segmented value={p.markStyle} onChange={(v) => upd({ markStyle: v })} options={[{ value: 'fill', label: 'Tô nền' }, { value: 'dot', label: 'Chỉ nhãn' }, { value: 'ring', label: 'Viền' }]} /></Field>
            {p.size === 'full' && <Toggle checked={p.showLabels} onChange={(v) => upd({ showLabels: v })} label="Hiện tên ngắn trong ô" />}
            <Toggle checked={p.showLegend} onChange={(v) => upd({ showLegend: v })} label="Hiện chú thích màu" />
            <Field label="Danh sách dưới lịch">
              <Select value={p.showAgenda} onChange={(v) => upd({ showAgenda: v })} options={[{ value: 'month', label: 'Buổi trong tháng' }, { value: 'all', label: 'Cả học kỳ' }, { value: 'none', label: 'Không hiện' }]} />
            </Field>
          </>
        )}
        <Toggle checked={p.dimPast} onChange={(v) => upd({ dimPast: v })} label="Làm mờ buổi đã qua" />
        {(mini ? p.showNext : p.showAgenda !== 'none') && (
          <Toggle checked={p.linkUnderline !== false} onChange={(v) => upd({ linkUnderline: v })} label={`${LINK_UNDERLINE_LABEL} (${mini ? 'dòng "Buổi tới"' : 'danh sách buổi học'})`} />
        )}
        <Hint>{mini ? 'Trong Canvas: một tháng cố định, ngày tô màu là liên kết có tooltip.' : 'Trong Canvas: mọi tháng có buổi học xếp dọc, ‹ › là liên kết nhảy tháng.'}</Hint>
      </Section>
      <CourseEditor month={month} nodeId={node.id} onMonth={(m) => upd({ month: m }, 'month')} />
    </>
  );
}

/* ------------------------------------------------------------------ Chương trình học */

export function CurriculumEditor({ node }: { node: LayoutNode }) {
  const p = getProps(node, curriculumDef);
  const data = readCurriculum(p);
  const upd = useUpd(node);
  const cell = useWidgetUi((u) => (u.cell?.nodeId === node.id ? u.cell : null));
  const course = useEditor((st) => st.project.course);
  const [paste, setPaste] = useState('');

  const setData = (patch: Partial<typeof data>, key?: string) => upd({ ...(patch as NodeProps) }, key);
  const cols = data.cols, rows = data.rows, cells = data.cells;
  const withCell = (r: number, c: number, patch: Partial<CurrCell>, key?: string) => {
    const next = cells.map((row) => row.map((x) => ({ ...x })));
    next[r][c] = { ...next[r][c], ...patch };
    setData({ cells: next }, key);
  };
  const withCol = (c: number, patch: Partial<CurrCol>, key?: string) => {
    const next = cols.map((x) => ({ ...x }));
    next[c] = { ...next[c], ...patch };
    setData({ cols: next }, key);
  };
  const urlOk = (u: string) => u === '' || !!safeHref(u);

  const selectedValid = cell && cell.c < cols.length && (cell.r === -1 || cell.r < rows.length);
  return (
    <>
      {selectedValid && (
        <style>{`[data-node-id="${node.id}"] [data-cur-r="${cell.r}"][data-cur-c="${cell.c}"] { box-shadow: inset 0 0 0 3px #1f5f8b !important; }`}</style>
      )}
      <Section title="Ô đang chọn" id="curr-cell">
        {!selectedValid ? (
          <Hint>Nhấp một ô hoặc tiêu đề cột trên bảng để sửa.</Hint>
        ) : cell.r === -1 ? (
          <>
            <div className={s.cellHead}>Cột {cell.c + 1}</div>
            <Field label="Tiêu đề"><TextInput value={cols[cell.c].title} onChange={(v) => withCol(cell.c, { title: v }, `col-title-${cell.c}`)} /></Field>
            <Field label="Ngày"><TextInput value={cols[cell.c].date} placeholder="dd/mm" maxLength={20} onChange={(v) => withCol(cell.c, { date: v }, `col-date-${cell.c}`)} /></Field>
            <Field label="Liên kết" stack hint={urlOk(cols[cell.c].url) ? undefined : <span className={s.err}>Liên kết không hợp lệ, sẽ không được xuất.</span>}>
              <TextInput value={cols[cell.c].url} placeholder="https://.../pages/buoi-01" onChange={(v) => withCol(cell.c, { url: v.trim() }, `col-url-${cell.c}`)} />
            </Field>
            <div className={uiStyles.row}>
              <IconBtn small label="Chuyển cột sang trái" disabled={cell.c === 0} onClick={() => moveCol(cell.c, -1)}><ArrowLeft size={13} /></IconBtn>
              <IconBtn small label="Chuyển cột sang phải" disabled={cell.c === cols.length - 1} onClick={() => moveCol(cell.c, 1)}><ArrowRight size={13} /></IconBtn>
              <Btn size="sm" variant="danger" disabled={cols.length <= 1} onClick={() => {
                setData({ cols: cols.filter((_, i) => i !== cell.c), cells: cells.map((row) => row.filter((_, i) => i !== cell.c)) });
                useWidgetUi.getState().setCell(null);
              }}><Trash2 size={13} /> Xóa cột</Btn>
            </div>
          </>
        ) : (
          <>
            <div className={s.cellHead}>{rows[cell.r]} · {cols[cell.c].title}</div>
            <Field label="Nội dung" stack><TextArea value={cells[cell.r][cell.c].text} rows={3} onChange={(v) => withCell(cell.r, cell.c, { text: v }, `cell-${cell.r}-${cell.c}`)} /></Field>
            <Toggle checked={cells[cell.r][cell.c].em} onChange={(v) => withCell(cell.r, cell.c, { em: v })} label="Nhấn mạnh (viền đỏ, như Nghiệm thu)" />
            <Field label="Liên kết" stack hint={urlOk(cells[cell.r][cell.c].url) ? undefined : <span className={s.err}>Liên kết không hợp lệ, sẽ không được xuất.</span>}>
              <TextInput value={cells[cell.r][cell.c].url} placeholder="Không bắt buộc" onChange={(v) => withCell(cell.r, cell.c, { url: v.trim() }, `cell-url-${cell.r}-${cell.c}`)} />
            </Field>
          </>
        )}
      </Section>
      <Section title="Hàng và cột" id="curr-structure">
        <div className={uiStyles.row}>
          <Btn size="sm" onClick={() => {
            const n = cols.length;
            setData({ cols: [...cols, { title: `Buổi ${n + 1}`, date: '', url: '' }], cells: cells.map((row) => [...row, { text: '', em: false, url: '' }]) });
            useWidgetUi.getState().setCell({ nodeId: node.id, r: -1, c: n });
          }}><Plus size={13} /> Thêm buổi (cột)</Btn>
          <Btn size="sm" onClick={() => setData({ rows: [...rows, `Hàng ${rows.length + 1}`], cells: [...cells, cols.map(() => ({ text: '', em: false, url: '' }))] })}><Plus size={13} /> Thêm hàng</Btn>
        </div>
        <div className={s.rowsEdit}>
          {rows.map((r, i) => (
            <div key={i} className={uiStyles.row}>
              <TextInput value={r} ariaLabel={`Tên hàng ${i + 1}`} maxLength={40} onChange={(v) => { const next = [...rows]; next[i] = v; setData({ rows: next }, `row-${i}`); }} />
              <IconBtn small label={`Xóa hàng ${r}`} disabled={rows.length <= 1} onClick={() => setData({ rows: rows.filter((_, j) => j !== i), cells: cells.filter((_, j) => j !== i) })}><X size={13} /></IconBtn>
            </div>
          ))}
        </div>
        <Hint>{rows.length} hàng × {cols.length} cột.</Hint>
      </Section>
      <Section title="Dán từ Excel" id="curr-paste" defaultOpen={false}>
        <TextArea value={paste} rows={5} mono placeholder="Chọn vùng bảng trong Excel, Ctrl+C rồi dán vào đây" onChange={setPaste} />
        <Hint>Hàng đầu: tiêu đề cột (Buổi 1, Buổi 2...). Hàng bắt đầu bằng "Ngày" (không bắt buộc) là ngày. Cột đầu: tên hàng (Tiết 7...). Ô bắt đầu bằng "NGHIỆM THU" tự được nhấn mạnh.</Hint>
        <div className={uiStyles.row}>
          <Btn size="sm" variant="primary" onClick={() => {
            const t = parsePastedTable(paste);
            if (!t) return toastError('Chưa nhận ra bảng. Hãy sao chép từ Excel (các cột cách nhau bằng phím Tab).');
            upd({ rowHeader: t.rowHeader, rows: t.rows, cols: t.cols as unknown as NodeProps[string], cells: t.cells as unknown as NodeProps[string] });
            useWidgetUi.getState().setCell(null);
            toast(`Đã nhập ${t.rows.length} hàng × ${t.cols.length} cột. Có thể Hoàn tác (Ctrl+Z).`);
          }}>Thay bằng dữ liệu đã dán</Btn>
          <Btn size="sm" onClick={() => setPaste([[p.rowHeader, ...cols.map((c) => c.title)], [p.dateRowLabel, ...cols.map((c) => c.date)], ...rows.map((r, i) => [r, ...cells[i].map((x) => x.text.replace(/\n/g, ' '))])].map((l) => l.join('\t')).join('\n'))}>Lấy bảng hiện tại</Btn>
        </div>
      </Section>
      <Section title="Ngày theo Lịch học" id="curr-sync" defaultOpen={false}>
        <Btn size="sm" onClick={() => {
          const ds = sortedSessions(course).filter((x) => countsProgress(course, x)).map((x) => x.date).filter((d, i, a) => a.indexOf(d) === i);
          if (!ds.length) return toastError('Dữ liệu khóa học chưa có buổi học.');
          setData({ cols: cols.map((c, i) => (ds[i] ? { ...c, date: ddmm(ds[i]) } : c)) });
          toast(`Đã điền ngày cho ${Math.min(ds.length, cols.length)} cột.`);
        }}>Điền hàng "Ngày" từ buổi học</Btn>
        <Hint>Lấy ngày của các buổi được tính tiến độ (mặc định Buổi học, Thực hành) theo thứ tự, điền lần lượt vào các cột.</Hint>
      </Section>
      <Section title="Hiển thị" id="curr-look">
        <Segmented value={p.layout} onChange={(v) => upd({ layout: v })} options={[{ value: 'grid', label: 'Bảng' }, { value: 'list', label: 'Danh sách theo buổi' }]} />
        <Hint>Dạng danh sách đọc tốt trên điện thoại.</Hint>
        <Field label="Tiêu đề cột đầu"><TextInput value={p.rowHeader} maxLength={30} onChange={(v) => upd({ rowHeader: v }, 'rowHeader')} /></Field>
        <Field label="Nhãn hàng ngày"><TextInput value={p.dateRowLabel} maxLength={30} onChange={(v) => upd({ dateRowLabel: v }, 'dateRowLabel')} /></Field>
        <Field label="Rộng mỗi cột"><NumberInput value={p.colWidth} unit="px" min={100} max={320} onChange={(v) => v && upd({ colWidth: v }, 'colWidth')} /></Field>
        <Toggle checked={p.upper} onChange={(v) => upd({ upper: v })} label="Viết hoa tiêu đề" />
        <Toggle checked={p.tint} onChange={(v) => upd({ tint: v })} label="Tô màu nhạt theo từng buổi" />
        <Toggle checked={p.sticky} onChange={(v) => upd({ sticky: v })} label="Giữ cột đầu khi cuộn ngang" />
        <Toggle checked={p.linkUnderline !== false} onChange={(v) => upd({ linkUnderline: v })} label={`${LINK_UNDERLINE_LABEL} (liên kết trong ô)`} />
        <Field label="Màu đầu bảng"><ColorInput value={p.headBg} allowTransparent={false} onChange={(v) => v && upd({ headBg: v }, 'headBg')} /></Field>
        <Field label="Màu hàng ngày"><ColorInput value={p.subBg} allowTransparent={false} onChange={(v) => v && upd({ subBg: v }, 'subBg')} /></Field>
      </Section>
    </>
  );

  function moveCol(c: number, d: -1 | 1) {
    const t = c + d;
    if (t < 0 || t >= cols.length) return;
    const sw = <T,>(arr: T[]) => { const a = [...arr]; [a[c], a[t]] = [a[t], a[c]]; return a; };
    setData({ cols: sw(cols), cells: cells.map(sw) });
    useWidgetUi.getState().setCell({ nodeId: node.id, r: -1, c: t });
  }
}

/* ------------------------------------------------------------------ Tiến độ */

export function ProgressEditor({ node }: { node: LayoutNode }) {
  const p = getProps(node, progressDef);
  const upd = useUpd(node);
  return (
    <>
      <Section title="Tiến độ" id="progress">
        <Field label="Cách tính" stack>
          <Segmented value={p.basis} onChange={(v) => upd({ basis: v })} options={[{ value: 'date', label: 'Theo ngày' }, { value: 'session', label: 'Theo buổi' }, { value: 'periods', label: 'Theo số tiết' }, { value: 'manual', label: 'Thủ công' }]} />
        </Field>
        {p.basis === 'manual' && <Field label="Phần trăm"><NumberInput value={p.manual} unit="%" min={0} max={100} onChange={(v) => upd({ manual: v ?? 0 }, 'manual')} /></Field>}
        {p.basis === 'periods' && <TotalPeriodsField />}
        {(p.basis === 'session' || p.basis === 'periods') && (
          <Toggle checked={p.countToday !== false} onChange={(v) => upd({ countToday: v })} label="Tính buổi hôm nay là đã học" />
        )}
        <Hint>{p.basis === 'date' ? 'Hôm nay so với ngày bắt đầu và kết thúc học kỳ.' : p.basis === 'session' ? 'Số buổi đã học trên tổng số buổi (chỉ các loại buổi được đánh dấu "Tiến độ").' : p.basis === 'periods' ? 'Số tiết đã học trên tổng số tiết học phần. Nhập số tiết của từng ngày ở mục "Ngày học" bên dưới.' : 'Giảng viên tự nhập.'} Trong Canvas, giá trị được tính tại ngày xuất.</Hint>
        <Field label="Tiêu đề"><Toggle checked={p.showTitle} onChange={(v) => upd({ showTitle: v })} label={p.showTitle ? 'Hiện' : 'Ẩn'} /></Field>
        {p.showTitle && <Field label="Nội dung tiêu đề"><TextInput value={p.title} maxLength={80} onChange={(v) => upd({ title: v }, 'title')} /></Field>}
        <Field label="Kiểu"><Segmented value={p.look} onChange={(v) => upd({ look: v })} options={[{ value: 'bar', label: 'Thanh' }, { value: 'weeks', label: 'Ô theo tuần' }]} /></Field>
        <Field label="Cỡ"><Segmented value={p.size} onChange={(v) => upd({ size: v })} options={[{ value: 'normal', label: 'Thường' }, { value: 'small', label: 'Nhỏ' }]} /></Field>
        <Toggle checked={p.showMilestones} onChange={(v) => upd({ showMilestones: v })} label='Hiện mốc (loại "Nghiệm thu, kiểm tra")' />
        <Field label="Màu"><ColorInput value={p.color} allowTransparent={false} onChange={(v) => v && upd({ color: v }, 'color')} /></Field>
      </Section>
      {p.basis !== 'manual' && <DaysSection />}
      {p.basis !== 'manual' && <RepeatSection onDone={() => undefined} />}
      <TermSection defaultOpen={p.basis === 'date'} />
    </>
  );
}

/** Nhập nhanh ngày học và số tiết; ghi thẳng vào dữ liệu khóa học dùng chung với Lịch học. */
function DaysSection() {
  const course = useEditor((st) => st.project.course);
  const upd = useEditor.getState().updateCourse;
  const list = sortedSessions(course);
  const today = todayKey();
  const { planned, sessions } = periodTotals(course);
  const progressTypes = course.types.filter((t) => t.progress);

  const addDay = () => {
    const last = list[list.length - 1];
    const date = last ? addDays(last.date, 7) : course.start;
    const n = sessions + 1;
    const base = emptySession(date, last && countsProgress(course, last) ? last.type : progressTypes[0]?.id ?? course.types[0]?.id ?? 'bh');
    upd((c) => { c.sessions.push({ ...base, id: uid('s'), time: last?.time ?? '', periods: last ? periodsOf(last) : 0, title: `Buổi ${n}`, label: `Buổi ${n}` }); });
    setTimeout(() => {
      const rows = document.querySelectorAll<HTMLInputElement>('[data-days] input[type="date"]');
      rows[rows.length - 1]?.focus();
    }, 30);
  };

  return (
    <Section title="Ngày học" id="progress-days">
      <p className={s.shared}>Dùng chung với Lịch học: thêm, sửa ở đây thì Lịch học và Lịch học mini cũng cập nhật.</p>
      <div className={s.days} data-days role="table" aria-label="Ngày học và số tiết">
        <div className={s.dayHead} role="row"><span role="columnheader">Ngày</span><span role="columnheader">Thứ</span><span role="columnheader">Số tiết</span><span role="columnheader">Loại</span><span /></div>
        {list.length ? list.map((x) => (
          <div key={x.id} role="row" className={x.date === today ? s.today : undefined}>
            <input type="date" aria-label="Ngày học" value={x.date} onChange={(e) => isDateKey(e.target.value) && upd((c) => { const t = c.sessions.find((y) => y.id === x.id); if (t) t.date = e.target.value; }, { key: `day:${x.id}:date` })} />
            <span className={s.wd}>{WD_SHORT[weekdayMon0(x.date)]}</span>
            <input type="number" aria-label="Số tiết" min={0} max={20} value={periodsOf(x) || ''} placeholder="0" onChange={(e) => {
              const v = Math.max(0, Math.min(20, Math.round(Number(e.target.value) || 0)));
              upd((c) => { const t = c.sessions.find((y) => y.id === x.id); if (t) t.periods = v; }, { key: `day:${x.id}:periods` });
            }} />
            <select aria-label="Loại buổi" value={x.type} onChange={(e) => upd((c) => { const t = c.sessions.find((y) => y.id === x.id); if (t) t.type = e.target.value; })}>
              {course.types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <button type="button" aria-label={`Xóa ngày ${ddmm(x.date)}`} title="Xóa" onClick={() => upd((c) => { c.sessions = c.sessions.filter((y) => y.id !== x.id); })}><X size={13} /></button>
          </div>
        )) : <span className={s.none}>Chưa có ngày học. Bấm "Thêm ngày" hoặc dùng "Tạo lịch lặp hằng tuần".</span>}
      </div>
      <div className={uiStyles.row}>
        <Btn size="sm" onClick={addDay}><Plus size={13} /> Thêm ngày</Btn>
        <span className={s.sum} style={{ marginLeft: 'auto' }}>{sessions} buổi · {planned} tiết</span>
      </div>
      <Hint>Thêm ngày: lấy ngày sau buổi cuối 7 ngày và cùng số tiết, sửa lại nếu cần. Tiêu đề, liên kết, ghi chú sửa ở Lịch học (không bắt buộc).</Hint>
    </Section>
  );
}

/** Mục "Khóa học" trong Cài đặt trang (khi chưa chọn module). */
export function PageCourseSections() {
  const course = useEditor((st) => st.project.course);
  const [month, setMonth] = useState(() => resolveMonth('auto', course, todayKey()));
  return (
    <>
      <TermSection />
      <CourseEditor month={month} onMonth={setMonth} showTerm={false} sessionsOpen={false} />
    </>
  );
}

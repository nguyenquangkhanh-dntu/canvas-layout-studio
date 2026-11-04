import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useEditor } from '../../../editor/store';
import { useWidgetUi } from '../../../editor/widget-ui';
import {
  WD_LONG, holidayMap, isDateKey, monthLabel, periodTotals, periodsFromTime, repeatDates, shiftMonth, shortDate, sortedSessions, typeOf,
  type LinkTarget, type Session,
} from '../../../models/course';
import { safeHref } from '../../../services/safe-values';
import { uid } from '../../../utils/id';
import { Btn, ColorInput, Field, Hint, IconBtn, NumberInput, Section, Select, TextArea, TextInput, Toggle, uiStyles } from '../../ui/controls';
import { toast, toastError } from '../../ui/Toasts';
import s from './widgets.module.css';

const validUrl = (u: string) => u === '' || (/^(https?:\/\/[^\s]+|\/[^\s]*|#[\w-]*)$/i.test(u) && !!safeHref(u));

export function emptySession(date: string, type: string): Session {
  return { id: '', date, time: '', type, title: '', label: '', tip: '', periods: 0, url: '', target: 'auto' };
}

/**
 * Trình sửa dữ liệu khóa học dùng chung: buổi học theo tháng, tạo lịch lặp, ngày nghỉ, loại buổi, học kỳ.
 * `month`/`onMonth` để danh sách đi theo tháng đang hiển thị của lịch (nếu có).
 */
export function CourseEditor({ month, onMonth, nodeId, showTerm = true, sessionsOpen = true }: { month: string; onMonth: (m: string) => void; nodeId?: string; showTerm?: boolean; sessionsOpen?: boolean }) {
  const course = useEditor((st) => st.project.course);
  const newSession = useWidgetUi((u) => u.newSession);
  const [draft, setDraft] = useState<Session | null>(null);
  const [errors, setErrors] = useState<{ title?: string; url?: string }>({});

  // Nhấp đúp vào một ngày trên lịch: mở form thêm buổi học cho ngày đó.
  useEffect(() => {
    if (!newSession || (nodeId && newSession.nodeId !== nodeId)) return;
    onMonth(newSession.date.slice(0, 7));
    setDraft(emptySession(newSession.date, course.types[0]?.id ?? 'bh'));
    setErrors({});
    useWidgetUi.getState().clearNewSession();
    setTimeout(() => document.getElementById('ss-title')?.focus(), 50);
  }, [newSession, nodeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const items = useMemo(() => sortedSessions(course).filter((x) => x.date.slice(0, 7) === month), [course, month]);
  const st = useEditor.getState;

  const save = () => {
    if (!draft) return;
    const e: typeof errors = {};
    if (!draft.title.trim()) e.title = 'Nhập tiêu đề buổi học.';
    if (!isDateKey(draft.date)) e.title = 'Chọn ngày học.';
    if (!validUrl(draft.url.trim())) e.url = 'URL phải bắt đầu bằng https:// hoặc / (trang trong Canvas).';
    setErrors(e);
    if (Object.keys(e).length) return;
    const periods = draft.periods > 0 ? Math.min(20, Math.round(draft.periods)) : periodsFromTime(draft.time);
    const clean: Session = { ...draft, periods, title: draft.title.trim(), label: draft.label.trim(), tip: draft.tip.trim(), time: draft.time.trim(), url: draft.url.trim() };
    st().updateCourse((c) => {
      if (clean.id) {
        const i = c.sessions.findIndex((x) => x.id === clean.id);
        if (i >= 0) c.sessions[i] = clean;
      } else {
        c.sessions.push({ ...clean, id: uid('s') });
      }
    });
    onMonth(clean.date.slice(0, 7));
    setDraft(null);
    toast('Đã lưu buổi học.');
  };

  const remove = (id: string) => {
    st().updateCourse((c) => { c.sessions = c.sessions.filter((x) => x.id !== id); });
    if (draft?.id === id) setDraft(null);
  };

  return (
    <>
      <Section title="Buổi học" id="course-sessions" defaultOpen={sessionsOpen}>
        <p className={s.shared}>Dữ liệu khóa học dùng chung: Lịch học, Lịch học mini, Tiến độ và hàng "Ngày" của Chương trình học cùng đọc dữ liệu này.</p>
        <div className={s.monthBar}>
          <IconBtn small label="Tháng trước" onClick={() => onMonth(shiftMonth(month, -1))}><ChevronLeft size={14} /></IconBtn>
          <b>{monthLabel(month)}</b>
          <IconBtn small label="Tháng sau" onClick={() => onMonth(shiftMonth(month, 1))}><ChevronRight size={14} /></IconBtn>
          <span className={s.count}>{items.length} mục</span>
        </div>
        {draft ? (
          <SessionForm draft={draft} setDraft={setDraft} errors={errors} onSave={save} onCancel={() => setDraft(null)} onDelete={draft.id ? () => remove(draft.id) : undefined} />
        ) : (
          <Btn size="sm" variant="primary" onClick={() => { setErrors({}); setDraft(emptySession(`${month}-01`, course.types[0]?.id ?? 'bh')); }}>
            <Plus size={13} /> Thêm buổi học
          </Btn>
        )}
        <ul className={s.list}>
          {items.length ? items.map((x) => (
            <li key={x.id}>
              <i style={{ background: typeOf(course, x.type).color }} />
              <span className={s.d}>{shortDate(x.date)}</span>
              <span className={s.t} title={x.title}>{x.title}</span>
              <span className={s.a}>
                <button type="button" onClick={() => { setErrors({}); setDraft({ ...x }); }}>Sửa</button>
                <button type="button" aria-label={`Xóa ${x.title}`} onClick={() => remove(x.id)}>Xóa</button>
              </span>
            </li>
          )) : <li className={s.empty}>Tháng này chưa có buổi học. Bấm "Thêm buổi học" hoặc nhấp đúp vào một ngày trên lịch.</li>}
        </ul>
        <Hint>Tổng cộng {course.sessions.length} mục trong học kỳ.</Hint>
      </Section>
      <RepeatSection onDone={(m) => onMonth(m)} />
      <HolidaySection />
      <TypesSection />
      {showTerm && <TermSection />}
    </>
  );
}

function SessionForm({ draft, setDraft, errors, onSave, onCancel, onDelete }: {
  draft: Session; setDraft: (s: Session) => void; errors: { title?: string; url?: string }; onSave: () => void; onCancel: () => void; onDelete?: () => void;
}) {
  const types = useEditor((st) => st.project.course.types);
  const set = (patch: Partial<Session>) => setDraft({ ...draft, ...patch });
  // Số tiết tự đi theo ô giờ cho tới khi người dùng tự sửa.
  const autoPeriods = draft.periods === 0 || draft.periods === periodsFromTime(draft.time);
  const inferred = periodsFromTime(draft.time);
  return (
    <div className={s.form}>
      <b className={s.formTitle}>{draft.id ? 'Sửa buổi học' : 'Thêm buổi học'}</b>
      <Field label="Ngày"><input id="ss-date" className={uiStyles.input} type="date" value={draft.date} onChange={(e) => set({ date: e.target.value })} /></Field>
      <Field label="Giờ / tiết"><TextInput value={draft.time} placeholder="Tiết 7-12 hoặc 13:00" maxLength={40} onChange={(v) => set(autoPeriods ? { time: v, periods: periodsFromTime(v) } : { time: v })} /></Field>
      <Field label="Số tiết" hint={inferred && draft.periods === inferred ? `Tự điền từ "${draft.time.trim()}". Sửa được.` : 'Dùng cho Tiến độ tính theo số tiết.'}>
        <NumberInput value={draft.periods || undefined} min={0} max={20} placeholder={inferred ? String(inferred) : '0'} onChange={(v) => set({ periods: v ? Math.round(v) : 0 })} />
      </Field>
      <Field label="Loại"><Select value={draft.type} onChange={(v) => set({ type: v })} options={types.map((t) => ({ value: t.id, label: t.name }))} /></Field>
      <Field label="Tiêu đề" stack hint={errors.title ? <span className={s.err}>{errors.title}</span> : undefined}>
        <input id="ss-title" className={uiStyles.input} value={draft.title} maxLength={200} placeholder="Buổi 8: Xác thực với JWT" onChange={(e) => set({ title: e.target.value })} />
      </Field>
      <Field label="Nhãn trong ô" hint="Để trống thì lấy phần trước dấu hai chấm của tiêu đề."><TextInput value={draft.label} maxLength={30} placeholder="Buổi 8" onChange={(v) => set({ label: v })} /></Field>
      <Field label="Nội dung tooltip" stack><TextArea value={draft.tip} rows={2} onChange={(v) => set({ tip: v })} /></Field>
      <Field label="URL bài giảng" stack hint={errors.url ? <span className={s.err}>{errors.url}</span> : 'Mở trang bài giảng trong Canvas, sao chép địa chỉ trên thanh trình duyệt.'}>
        <TextInput value={draft.url} placeholder="https://.../courses/1234/pages/buoi-08" maxLength={2048} onChange={(v) => set({ url: v })} />
      </Field>
      <Field label="Mở liên kết">
        <Select<LinkTarget> value={draft.target} onChange={(v) => set({ target: v })} options={[{ value: 'auto', label: 'Tự động' }, { value: 'same', label: 'Cùng tab' }, { value: 'new', label: 'Tab mới' }]} />
      </Field>
      <div className={uiStyles.row}>
        <Btn size="sm" variant="primary" onClick={onSave}>Lưu</Btn>
        <Btn size="sm" onClick={onCancel}>Hủy</Btn>
        {onDelete && <Btn size="sm" variant="danger" onClick={onDelete}><Trash2 size={13} /> Xóa</Btn>}
      </div>
    </div>
  );
}

export function RepeatSection({ onDone, defaultOpen = false }: { onDone: (month: string) => void; defaultOpen?: boolean }) {
  const course = useEditor((st) => st.project.course);
  const [wd, setWd] = useState(2);
  const [from, setFrom] = useState(course.start);
  const [to, setTo] = useState(course.end);
  const [time, setTime] = useState('');
  const [periods, setPeriods] = useState<number | undefined>(undefined);
  const [type, setType] = useState(course.types[0]?.id ?? 'bh');
  const [url, setUrl] = useState('');
  const [n0, setN0] = useState<number | undefined>(1);
  const [titles, setTitles] = useState('');
  const [skip, setSkip] = useState(true);
  const dates = useMemo(() => repeatDates(wd, from, to, skip ? new Set(holidayMap(course).keys()) : new Set()), [wd, from, to, skip, course]);

  const create = () => {
    if (!dates.length) return toastError('Không có ngày nào phù hợp. Kiểm tra lại khoảng ngày.');
    if (url && !validUrl(url.replace(/\{n\}/g, '1'))) return toastError('URL mẫu phải bắt đầu bằng https:// hoặc /.');
    const list = titles.split('\n').map((t) => t.split('\t').join(' ').trim()).filter(Boolean);
    const start = n0 ?? 1;
    useEditor.getState().updateCourse((c) => {
      dates.forEach((d, i) => c.sessions.push({
        id: uid('s'), date: d, time: time.trim(), type, title: list[i] ?? `Buổi ${start + i}`, label: `Buổi ${start + i}`, tip: '',
        periods: periods && periods > 0 ? Math.min(20, Math.round(periods)) : periodsFromTime(time),
        url: url.replace(/\{n\}/g, String(start + i).padStart(2, '0')), target: 'auto',
      }));
    });
    onDone(dates[0].slice(0, 7));
    toast(`Đã tạo ${dates.length} buổi học. Có thể Hoàn tác (Ctrl+Z).`);
  };

  return (
    <Section title="Tạo lịch lặp hằng tuần" id="course-repeat" defaultOpen={defaultOpen}>
      <Field label="Thứ"><Select value={wd} onChange={setWd} options={WD_LONG.map((w, i) => ({ value: i, label: w }))} /></Field>
      <Field label="Từ ngày"><input className={uiStyles.input} type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
      <Field label="Đến ngày"><input className={uiStyles.input} type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
      <Field label="Giờ / tiết"><TextInput value={time} placeholder="Tiết 7-12" onChange={setTime} /></Field>
      <Field label="Số tiết mỗi buổi"><NumberInput value={periods} min={0} max={20} placeholder={periodsFromTime(time) ? String(periodsFromTime(time)) : '0'} onChange={setPeriods} /></Field>
      <Field label="Loại"><Select value={type} onChange={setType} options={course.types.map((t) => ({ value: t.id, label: t.name }))} /></Field>
      <Field label="Bắt đầu từ buổi"><NumberInput value={n0} min={1} max={200} onChange={setN0} /></Field>
      <Field label="URL mẫu" stack hint="{n} được thay bằng số thứ tự buổi (01, 02...). Để trống nếu chưa có."><TextInput value={url} placeholder="https://.../pages/buoi-{n}" onChange={setUrl} /></Field>
      <Field label="Tên các buổi" stack hint={'Mỗi dòng một buổi, dán từ Excel được. Hết danh sách thì đặt tên "Buổi n".'}><TextArea value={titles} rows={3} onChange={setTitles} /></Field>
      <Toggle checked={skip} onChange={setSkip} label="Bỏ qua ngày nghỉ" />
      <Btn size="sm" variant="primary" onClick={create}>Tạo {dates.length} buổi học</Btn>
    </Section>
  );
}

function HolidaySection() {
  const holidays = useEditor((st) => st.project.course.holidays);
  const [date, setDate] = useState('');
  const [name, setName] = useState('');
  const sorted = [...holidays].sort((a, b) => a.date.localeCompare(b.date));
  return (
    <Section title={`Ngày nghỉ (${holidays.length})`} id="course-holidays" defaultOpen={false}>
      <ul className={s.list}>
        {sorted.map((h) => (
          <li key={h.date} className={s.hol}>
            <span className={s.d}>{shortDate(h.date)}</span>
            <span className={s.t}>{h.name}</span>
            <span className={s.a}><button type="button" onClick={() => useEditor.getState().updateCourse((c) => { c.holidays = c.holidays.filter((x) => x.date !== h.date); })}>Xóa</button></span>
          </li>
        ))}
        {!sorted.length && <li className={s.empty}>Chưa có ngày nghỉ.</li>}
      </ul>
      <div className={uiStyles.row}>
        <input className={uiStyles.input} style={{ flex: '0 0 136px' }} type="date" aria-label="Ngày nghỉ" value={date} onChange={(e) => setDate(e.target.value)} />
        <TextInput value={name} placeholder="Tên ngày nghỉ" ariaLabel="Tên ngày nghỉ" onChange={setName} />
        <Btn size="sm" onClick={() => {
          if (!isDateKey(date)) return toastError('Chọn ngày nghỉ.');
          useEditor.getState().updateCourse((c) => { c.holidays = c.holidays.filter((x) => x.date !== date).concat({ date, name: name.trim() || 'Ngày nghỉ' }); });
          setDate(''); setName('');
        }}>Thêm</Btn>
      </div>
      <Hint>Ngày nghỉ được tô xám trên lịch; tạo lịch lặp sẽ bỏ qua các ngày này.</Hint>
    </Section>
  );
}

function TypesSection() {
  const course = useEditor((st) => st.project.course);
  const upd = useEditor.getState().updateCourse;
  return (
    <Section title={`Loại buổi học (${course.types.length})`} id="course-types" defaultOpen={false}>
      {course.types.map((t, i) => {
        const used = course.sessions.some((x) => x.type === t.id);
        return (
          <div key={t.id} className={uiStyles.row}>
            <div style={{ width: 110 }}><ColorInput value={t.color} allowTransparent={false} ariaLabel={`Màu ${t.name}`} onChange={(v) => v && upd((c) => { c.types[i].color = v; }, { key: `type-color:${t.id}` })} /></div>
            <TextInput value={t.name} ariaLabel="Tên loại" maxLength={60} onChange={(v) => upd((c) => { c.types[i].name = v; }, { key: `type-name:${t.id}` })} />
            <label className={s.prog} title="Cộng vào Tiến độ (số buổi, số tiết)">
              <input type="checkbox" checked={t.progress} aria-label={`Tính ${t.name} vào tiến độ`} onChange={(e) => upd((c) => { c.types[i].progress = e.target.checked; })} />
              Tiến độ
            </label>
            <IconBtn small label={used ? 'Đang có buổi học dùng loại này' : `Xóa loại ${t.name}`} disabled={used || course.types.length <= 1} onClick={() => upd((c) => { c.types.splice(i, 1); })}><Trash2 size={13} /></IconBtn>
          </div>
        );
      })}
      <Btn size="sm" onClick={() => upd((c) => { c.types.push({ id: uid('t'), name: 'Loại mới', color: ['#7c3aed', '#be185d', '#0369a1'][c.types.length % 3], progress: true }); })}><Plus size={13} /> Thêm loại</Btn>
      <Hint>Ô "Tiến độ": loại được cộng vào Tiến độ khóa học. Loại không tính vẫn hiện trên Lịch học như cũ. Ngày có nhiều buổi được tô theo loại "{typeOf(course, 'nt').name}" hoặc "{typeOf(course, 'hn').name}" trước.</Hint>
    </Section>
  );
}

export function TermSection({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const course = useEditor((st) => st.project.course);
  const upd = useEditor.getState().updateCourse;
  return (
    <Section title="Học kỳ" id="course-term" defaultOpen={defaultOpen}>
      <Field label="Bắt đầu"><input className={uiStyles.input} type="date" value={course.start} onChange={(e) => isDateKey(e.target.value) && upd((c) => { c.start = e.target.value; }, { key: 'term-start' })} /></Field>
      <Field label="Kết thúc"><input className={uiStyles.input} type="date" value={course.end} onChange={(e) => isDateKey(e.target.value) && upd((c) => { c.end = e.target.value; }, { key: 'term-end' })} /></Field>
      <Field label="Tổng số buổi"><NumberInput value={course.totalSessions} min={1} max={200} onChange={(v) => v && upd((c) => { c.totalSessions = Math.round(v); }, { key: 'term-total' })} /></Field>
      <TotalPeriodsField />
      <Hint>Dùng để đánh số tuần học và tính Tiến độ khóa học.</Hint>
    </Section>
  );
}

/** Tổng số tiết học phần, kèm nhắc số tiết đã xếp ngày. */
export function TotalPeriodsField() {
  const course = useEditor((st) => st.project.course);
  const { planned } = periodTotals(course);
  const tp = course.totalPeriods;
  const hint = tp > 0
    ? planned < tp ? `Đã xếp ngày cho ${planned} tiết, còn ${tp - planned} tiết chưa có ngày.` : planned > tp ? `Các buổi đã nhập có ${planned} tiết, nhiều hơn tổng; Tiến độ dùng ${planned}.` : `Đã xếp ngày đủ ${planned} tiết.`
    : `Để trống thì cộng từ các buổi đã nhập (đang có ${planned} tiết).`;
  return (
    <Field label="Tổng số tiết học phần" hint={hint}>
      <NumberInput value={tp || undefined} min={0} max={2000} placeholder={String(planned)} onChange={(v) => useEditor.getState().updateCourse((c) => { c.totalPeriods = v ? Math.round(v) : 0; }, { key: 'term-periods' })} />
    </Field>
  );
}

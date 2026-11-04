/**
 * Dữ liệu khóa học dùng chung của dự án (Cài đặt trang → Khóa học).
 * Lịch học, Lịch học mini, Tiến độ khóa học và hàng "Ngày" của Chương trình học cùng đọc dữ liệu này.
 * Ngày lưu dạng chuỗi "YYYY-MM-DD" theo lịch địa phương, không dùng múi giờ.
 */

export interface SessionType {
  id: string;
  name: string;
  color: string;
  /** Buổi thuộc loại này có được cộng vào Tiến độ (số buổi, số tiết) hay không. */
  progress: boolean;
}

export interface Holiday {
  date: string;
  name: string;
}

export type LinkTarget = 'auto' | 'same' | 'new';

export interface Session {
  id: string;
  date: string;
  /** Giờ hoặc tiết, dạng chữ tự do: "Tiết 7-12", "13:00-16:30", "23:59". */
  time: string;
  type: string;
  title: string;
  /** Nhãn ngắn trong ô lịch; để trống thì tự tạo từ tiêu đề. */
  label: string;
  /** Ghi chú hiện trong tooltip. */
  tip: string;
  /** Số tiết của buổi; 0 = chưa đặt (tự suy ra từ "Tiết 7-12" trong ô giờ). */
  periods: number;
  url: string;
  target: LinkTarget;
}

export interface CourseData {
  start: string;
  end: string;
  totalSessions: number;
  /** Tổng số tiết học phần; 0 = cộng từ các buổi đã nhập. */
  totalPeriods: number;
  types: SessionType[];
  holidays: Holiday[];
  sessions: Session[];
}

export const DEFAULT_TYPES: SessionType[] = [
  { id: 'bh', name: 'Buổi học', color: '#1f5f8b', progress: true },
  { id: 'th', name: 'Thực hành', color: '#0f766e', progress: true },
  { id: 'nt', name: 'Nghiệm thu, kiểm tra', color: '#b42318', progress: false },
  { id: 'hn', name: 'Hạn nộp', color: '#a16207', progress: false },
];

/** Loại buổi được ưu tiên tô màu khi một ngày có nhiều buổi. */
const PRIORITY = ['nt', 'hn'];

/* ------------------------------------------------------------------ Ngày tháng */

export const pad2 = (n: number) => String(n).padStart(2, '0');
export const dateKey = (y: number, m: number, d: number) => `${y}-${pad2(m)}-${pad2(d)}`;
export const isDateKey = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
export const isMonthKey = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}$/.test(v);
const parts = (k: string) => k.split('-').map(Number);
export const dayNum = (k: string) => {
  const [y, m, d] = parts(k);
  return Date.UTC(y, m - 1, d) / 864e5;
};
export const fromDayNum = (n: number) => {
  const dt = new Date(n * 864e5);
  return dateKey(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
};
export const addDays = (k: string, n: number) => fromDayNum(dayNum(k) + n);
/** Thứ trong tuần, 0 = Thứ Hai ... 6 = Chủ Nhật. */
export const weekdayMon0 = (k: string) => (new Date(dayNum(k) * 864e5).getUTCDay() + 6) % 7;
export const todayKey = (d = new Date()) => dateKey(d.getFullYear(), d.getMonth() + 1, d.getDate());

export const WD_SHORT = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
export const WD_LONG = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];
export const shortDate = (k: string) => {
  const [, m, d] = parts(k);
  return `${WD_SHORT[weekdayMon0(k)]} ${pad2(d)}/${pad2(m)}`;
};
export const longDate = (k: string) => {
  const [y, m, d] = parts(k);
  return `${WD_LONG[weekdayMon0(k)]}, ${pad2(d)}/${pad2(m)}/${y}`;
};
export const ddmm = (k: string) => {
  const [, m, d] = parts(k);
  return `${pad2(d)}/${pad2(m)}`;
};
export const monthLabel = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  return `Tháng ${m}, ${y}`;
};
export const monthShort = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  return `Tháng ${m}/${y}`;
};
export const shiftMonth = (ym: string, delta: number) => {
  let [y, m] = ym.split('-').map(Number);
  m += delta;
  while (m > 12) { m -= 12; y++; }
  while (m < 1) { m += 12; y--; }
  return `${y}-${pad2(m)}`;
};

export interface DayCell {
  key: string;
  inMonth: boolean;
}

/** Lưới tháng: các hàng 7 ngày, tuần bắt đầu Thứ Hai hoặc Chủ Nhật. */
export function monthGrid(ym: string, weekStart: 'mon' | 'sun'): DayCell[][] {
  const [y, m] = ym.split('-').map(Number);
  const first = dateKey(y, m, 1);
  const days = new Date(y, m, 0).getDate();
  const offset = weekStart === 'mon' ? weekdayMon0(first) : (weekdayMon0(first) + 1) % 7;
  const rows: DayCell[][] = [];
  let cur = addDays(first, -offset);
  const count = Math.ceil((offset + days) / 7);
  for (let r = 0; r < count; r++) {
    const row: DayCell[] = [];
    for (let c = 0; c < 7; c++) {
      row.push({ key: cur, inMonth: cur.slice(0, 7) === ym });
      cur = addDays(cur, 1);
    }
    rows.push(row);
  }
  return rows;
}

export const weekdayHeads = (weekStart: 'mon' | 'sun') => (weekStart === 'mon' ? WD_SHORT : ['CN', ...WD_SHORT.slice(0, 6)]);

/* ------------------------------------------------------------------ Truy vấn */

export function sortedSessions(c: CourseData): Session[] {
  return [...c.sessions].sort((a, b) => dayNum(a.date) - dayNum(b.date) || a.time.localeCompare(b.time));
}

export function sessionsByDate(c: CourseData): Map<string, Session[]> {
  const map = new Map<string, Session[]>();
  for (const s of sortedSessions(c)) {
    const list = map.get(s.date);
    if (list) list.push(s);
    else map.set(s.date, [s]);
  }
  return map;
}

export function holidayMap(c: CourseData): Map<string, string> {
  return new Map(c.holidays.map((h) => [h.date, h.name]));
}

export function typeOf(c: CourseData, id: string): SessionType {
  return c.types.find((t) => t.id === id) ?? { id, name: 'Khác', color: '#64748b', progress: false };
}

/** Loại mặc định khi dữ liệu cũ chưa có cờ "tính tiến độ": chỉ Buổi học và Thực hành. */
export const defaultProgressFlag = (typeId: string) => typeId === 'bh' || typeId === 'th';

/** Buổi có được tính vào Tiến độ không (theo loại buổi). */
export function countsProgress(c: CourseData, s: Pick<Session, 'type'>): boolean {
  const t = c.types.find((x) => x.id === s.type);
  return t ? t.progress : defaultProgressFlag(s.type);
}

/**
 * Suy ra số tiết từ chữ trong ô giờ: "Tiết 7-12" → 6, "tiết 1 - 3" → 3, "Tiết 12" → 1, "T7-T11" → 5.
 * Trả về 0 nếu không nhận ra.
 */
export function periodsFromTime(time: string): number {
  const t = time.toLowerCase();
  let m = /(?:ti[eế]t|\bt)\s*(\d{1,2})\s*(?:-|–|đến|->|→)\s*(?:ti[eế]t|t)?\s*(\d{1,2})/.exec(t);
  if (m) {
    const a = Number(m[1]), b = Number(m[2]);
    return b >= a && b - a < 20 ? b - a + 1 : 0;
  }
  m = /ti[eế]t\s*(\d{1,2})(?!\s*[,\d])/.exec(t);
  if (m) return 1;
  m = /ti[eế]t\s*((?:\d{1,2}\s*,\s*)+\d{1,2})/.exec(t);
  if (m) return m[1].split(',').length;
  return 0;
}

/** Số tiết của một buổi: giá trị đã nhập, nếu chưa có thì suy ra từ ô giờ. */
export function periodsOf(s: Pick<Session, 'periods' | 'time'>): number {
  return s.periods > 0 ? s.periods : periodsFromTime(s.time);
}

export function primaryOf(list: Session[]): Session {
  for (const p of PRIORITY) {
    const s = list.find((x) => x.type === p);
    if (s) return s;
  }
  return list[0];
}

export function labelOf(s: Session): string {
  if (s.label.trim()) return s.label.trim();
  const i = s.title.indexOf(':');
  return i > 0 && i <= 16 ? s.title.slice(0, i) : s.title.slice(0, 16);
}

export function isInternalUrl(url: string): boolean {
  return url.startsWith('/') || /\/courses\/\d+/.test(url);
}

export function resolveTarget(s: Pick<Session, 'url' | 'target'>): 'same' | 'new' {
  if (s.target === 'same' || s.target === 'new') return s.target;
  return isInternalUrl(s.url) ? 'same' : 'new';
}

export function monthsWithSessions(c: CourseData): string[] {
  return [...new Set(sortedSessions(c).map((s) => s.date.slice(0, 7)))];
}

/** Tháng hiển thị: "auto" = tháng hiện tại nếu nằm trong khóa học, không thì tháng có buổi đầu tiên. */
export function resolveMonth(month: string | undefined, c: CourseData, today: string): string {
  if (isMonthKey(month)) return month;
  const t = today.slice(0, 7);
  const ms = monthsWithSessions(c);
  if (!ms.length) return t;
  return t >= ms[0] && t <= ms[ms.length - 1] ? t : ms[0];
}

/** Các tháng liên tiếp phủ cả học kỳ và mọi buổi học (tối đa 24). */
export function monthRange(c: CourseData, include: string): string[] {
  const ms = [...monthsWithSessions(c), ...(isDateKey(c.start) ? [c.start.slice(0, 7)] : []), ...(isDateKey(c.end) ? [c.end.slice(0, 7)] : [])].sort();
  let from = ms[0] ?? include;
  let to = ms[ms.length - 1] ?? include;
  if (include < from) from = include;
  if (include > to) to = include;
  const out: string[] = [];
  for (let m = from; m <= to && out.length < 24; m = shiftMonth(m, 1)) out.push(m);
  return out;
}

/** Số tuần học (Tuần 1 = tuần chứa ngày bắt đầu, tính từ Thứ Hai). Trả về 0 nếu ngoài khoảng 1..30. */
export function weekNo(c: CourseData, k: string): number {
  if (!isDateKey(c.start)) return 0;
  const semMon = addDays(c.start, -weekdayMon0(c.start));
  const w = Math.floor((dayNum(addDays(k, -weekdayMon0(k))) - dayNum(semMon)) / 7) + 1;
  return w >= 1 && w <= 30 ? w : 0;
}

export function nextSession(c: CourseData, today: string): Session | undefined {
  return sortedSessions(c).find((s) => dayNum(s.date) >= dayNum(today));
}

/** Các ngày lặp lại theo thứ trong tuần (0 = Thứ Hai) trong khoảng [from, to]. */
export function repeatDates(weekday: number, from: string, to: string, skip: Set<string>): string[] {
  const out: string[] = [];
  if (!isDateKey(from) || !isDateKey(to) || dayNum(to) < dayNum(from)) return out;
  let k = addDays(from, (weekday - weekdayMon0(from) + 7) % 7);
  while (dayNum(k) <= dayNum(to) && out.length < 200) {
    if (!skip.has(k)) out.push(k);
    k = addDays(k, 7);
  }
  return out;
}

export function tooltipText(c: CourseData, date: string, list: Session[]): string {
  const lines = [longDate(date)];
  for (const s of list) {
    lines.push(`${typeOf(c, s.type).name}${s.time ? ` · ${s.time}` : ''}`);
    lines.push(s.title);
    if (s.tip) lines.push(s.tip);
  }
  return lines.join('\n');
}

/* ------------------------------------------------------------------ Tiến độ */

export type ProgressBasis = 'date' | 'session' | 'periods' | 'manual';

export interface ProgressValue {
  pct: number;
  text: string;
  week: number;
  weeks: number;
}

/** Thống kê số tiết: đã xếp ngày, tổng dùng để tính (không nhỏ hơn số đã xếp). */
export function periodTotals(c: CourseData): { planned: number; total: number; sessions: number } {
  const counted = c.sessions.filter((s) => countsProgress(c, s));
  const planned = counted.reduce((n, s) => n + periodsOf(s), 0);
  return { planned, total: Math.max(c.totalPeriods > 0 ? c.totalPeriods : 0, planned), sessions: counted.length };
}

export function progressValue(c: CourseData, basis: ProgressBasis, manual: number, today: string, countToday = true): ProgressValue {
  const weeks = isDateKey(c.end) ? Math.max(1, weekNo(c, c.end)) : 15;
  const clampDay = isDateKey(c.start) && today < c.start ? c.start : isDateKey(c.end) && today > c.end ? c.end : today;
  const week = weekNo(c, clampDay);
  if (basis === 'manual') {
    const pct = Math.max(0, Math.min(100, Math.round(manual)));
    return { pct, text: `${pct}% chương trình`, week, weeks };
  }
  const isDone = (d: string) => (countToday ? dayNum(d) <= dayNum(today) : dayNum(d) < dayNum(today));
  if (basis === 'session' || basis === 'periods') {
    const main = c.sessions.filter((s) => countsProgress(c, s));
    const doneList = main.filter((s) => isDone(s.date));
    const done = doneList.length;
    const totalS = Math.max(done, c.totalSessions || main.length || 1);
    if (basis === 'session') return { pct: Math.round((done / totalS) * 100), text: `Đã học ${done}/${totalS} buổi`, week, weeks };
    const { total } = periodTotals(c);
    const doneP = doneList.reduce((n, s) => n + periodsOf(s), 0);
    const pct = total > 0 ? Math.round((doneP / total) * 100) : 0;
    return { pct, text: `Đã học ${doneP}/${total} tiết · Buổi ${done}/${totalS}`, week, weeks };
  }
  if (!isDateKey(c.start) || !isDateKey(c.end) || c.end <= c.start) return { pct: 0, text: 'Chưa đặt ngày học kỳ', week: 0, weeks };
  const ratio = (dayNum(today) - dayNum(c.start)) / (dayNum(c.end) - dayNum(c.start));
  const pct = Math.round(Math.max(0, Math.min(1, ratio)) * 100);
  return { pct, text: week ? `Tuần ${week}/${weeks}` : today < c.start ? 'Chưa bắt đầu' : 'Đã kết thúc', week, weeks };
}

/* ------------------------------------------------------------------ Mặc định */

export function defaultCourse(today = todayKey()): CourseData {
  const start = addDays(today, -weekdayMon0(today));
  return {
    start,
    end: addDays(start, 7 * 15 - 3),
    totalSessions: 15,
    totalPeriods: 0,
    types: DEFAULT_TYPES.map((t) => ({ ...t })),
    holidays: [],
    sessions: [],
  };
}

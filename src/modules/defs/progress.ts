import type { HChild, HNode, ModuleDef } from '../types';
import { getProps } from '../types';
import { mergeCss, styleToCss } from '../../services/css';
import { safeColor } from '../../services/safe-values';
import { countsProgress, dayNum, longDate, periodTotals, periodsOf, progressValue, shortDate, sortedSessions, weekNo, type ProgressBasis } from '../../models/course';

export type ProgressProps = {
  title: string;
  showTitle: boolean;
  basis: ProgressBasis;
  manual: number;
  look: 'bar' | 'weeks';
  showMilestones: boolean;
  size: 'normal' | 'small';
  color: string;
  /** Buổi học của ngày hôm nay được tính là đã học. */
  countToday: boolean;
};

function tint(hex: string, t: number): string {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return '#d5e3ef';
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.round(c * t + 255 * (1 - t)).toString(16).padStart(2, '0');
  return `#${f(n >> 16)}${f((n >> 8) & 255)}${f(n & 255)}`;
}

/**
 * Tiến độ khóa học. Trình thiết kế và PNG tính theo hôm nay; HTML cho Canvas đóng băng
 * tại ngày xuất (có ghi ngày cập nhật); HTML độc lập có script tự tính lại mỗi lần mở.
 */
export const progressDef: ModuleDef<ProgressProps> = {
  type: 'progress',
  label: 'Tiến độ khóa học',
  icon: 'progress',
  isContainer: false,
  defaultProps: () => ({ title: 'Tiến độ học phần', showTitle: true, basis: 'date', manual: 50, look: 'bar', showMilestones: true, size: 'normal', color: '#1f5f8b', countToday: true }),
  defaultStyle: () => ({
    bg: '#ffffff', borderStyle: 'solid', borderWidth: 1, borderColor: '#e2e8f0',
    radius: { tl: 12, tr: 12, br: 12, bl: 12 }, padding: { t: 20, r: 20, b: 20, l: 20 }, gap: 10,
  }),
  groups: ['layout', 'background', 'border', 'shadow', 'spacing'],
  render(node, ctx) {
    const p = getProps(node, progressDef);
    const c = ctx.course;
    const sm = p.size === 'small';
    const color = safeColor(p.color) ?? '#1f5f8b';
    const v = progressValue(c, p.basis, p.manual, ctx.today, p.countToday !== false);
    const ms = sortedSessions(c).filter((s) => s.type === 'nt');
    const sa = ctx.mode === 'standalone';
    const span = Math.max(1, dayNum(c.end) - dayNum(c.start));
    const pos = (k: string) => Math.max(0, Math.min(100, ((dayNum(k) - dayNum(c.start)) / span) * 100));

    let bar: HNode;
    if (p.look === 'weeks') {
      const msWeeks = new Set(ms.map((s) => weekNo(c, s.date)));
      bar = {
        tag: 'div',
        style: { display: 'flex', gap: '3px' },
        children: Array.from({ length: v.weeks }, (_, i): HNode => {
          const w = i + 1;
          const done = p.basis === 'date' ? v.week > 0 && w < v.week : (w / v.weeks) * 100 <= v.pct;
          const cur = p.basis === 'date' && w === v.week;
          return {
            tag: 'span',
            attrs: mergeAttrs({ title: `Tuần ${w}${msWeeks.has(w) ? ' · có nghiệm thu' : ''}` }, sa ? { 'data-p-w': String(w) } : {}),
            style: mergeCss(
              { display: 'block', flex: '1 1 0', height: sm ? '10px' : '18px', 'border-radius': '3px', 'background-color': done ? color : cur ? tint(color, 0.35) : '#e5eaf0' },
              msWeeks.has(w) && p.showMilestones ? { 'border-bottom': '3px solid #b42318' } : {},
            ),
            children: [],
          };
        }),
      };
    } else {
      const marks: HChild[] = p.showMilestones && p.basis === 'date'
        ? ms.map((s): HNode => ({ tag: 'span', attrs: { title: `${s.title} · ${shortDate(s.date)}` }, style: { position: 'absolute', top: '-3px', left: `${pos(s.date).toFixed(1)}%`, width: '3px', height: sm ? '14px' : '18px', 'margin-left': '-1px', 'background-color': '#b42318', 'border-radius': '2px' }, children: [] }))
        : [];
      bar = {
        tag: 'div',
        style: { position: 'relative', height: sm ? '8px' : '12px', 'border-radius': '999px', 'background-color': '#e5eaf0' },
        children: [{ tag: 'div', attrs: sa ? { 'data-p-fill': '' } : undefined, style: { width: `${v.pct}%`, height: '100%', 'border-radius': '999px', 'background-color': color }, children: [] }, ...marks],
      };
    }

    const children: HChild[] = [{
      tag: 'div',
      style: { display: 'flex', 'justify-content': 'space-between', 'align-items': 'baseline', gap: '8px' },
      children: [
        p.showTitle ? { tag: 'strong', style: { 'font-size': sm ? '14px' : '17px', color: ctx.page.headingColor }, editable: { nodeId: node.id, field: 'title', placeholder: 'Tiến độ' }, children: [p.title] } : { tag: 'span', children: [] },
        { tag: 'strong', attrs: sa ? { 'data-p-pct': '' } : undefined, style: { 'font-size': sm ? '20px' : '28px', color }, children: [`${v.pct}%`] },
      ],
    }, bar, {
      tag: 'div',
      style: { 'font-size': sm ? '13px' : '14px', color: '#475569' },
      children: [{ tag: 'span', attrs: sa ? { 'data-p-txt': '' } : undefined, children: [v.text] }, p.basis !== 'manual' ? ` · ${shortDate(c.start)} đến ${shortDate(c.end)}` : ''],
    }];
    if (p.showMilestones && ms.length && !sm) {
      children.push({
        tag: 'div',
        style: { 'font-size': '13px', color: '#475569', 'line-height': '1.7' },
        children: ms.map((s): HNode => ({
          tag: 'span', style: { display: 'inline-block', margin: '0 16px 0 0' },
          children: [{ tag: 'span', style: { color: '#b42318' }, children: ['◆'] }, ` ${s.title} · ${shortDate(s.date)}`],
        })),
      });
    }
    if ((ctx.mode === 'canvas' || ctx.mode === 'png') && p.basis !== 'manual') {
      children.push({ tag: 'div', style: { 'font-size': '12px', color: '#7b8896' }, children: [`Cập nhật ngày ${longDate(ctx.today).split(', ')[1]}`] });
    }
    const attrs: Record<string, string> = {};
    if (sa && p.basis !== 'manual') {
      attrs['data-cls-prog'] = JSON.stringify({
        basis: p.basis, start: c.start, end: c.end, total: c.totalSessions, tp: periodTotals(c).total, ct: p.countToday !== false ? 1 : 0,
        weeks: v.weeks, color, tint: tint(color, 0.35),
        done: c.sessions.filter((s) => countsProgress(c, s)).map((s) => ({ d: s.date, p: periodsOf(s) })),
        weekStarts: Array.from({ length: v.weeks }, (_, i) => fromStart(c.start, i)),
      });
    }
    return {
      tag: 'div',
      nodeId: node.id,
      attrs,
      style: mergeCss({ display: 'flex', 'flex-direction': 'column' }, styleToCss(node.style), sm ? { gap: '6px' } : {}),
      children,
    };
  },
};

function mergeAttrs(a: Record<string, string>, b: Record<string, string>) {
  return { ...a, ...b };
}

/** Ngày Thứ Hai của tuần thứ i (0-based) tính từ tuần chứa ngày bắt đầu. */
function fromStart(start: string, i: number): string {
  const d = new Date(Date.UTC(+start.slice(0, 4), +start.slice(5, 7) - 1, +start.slice(8, 10)));
  const wd = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - wd + i * 7);
  return d.toISOString().slice(0, 10);
}

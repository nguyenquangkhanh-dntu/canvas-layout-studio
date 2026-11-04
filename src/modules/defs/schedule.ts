import type { HChild, HNode, ModuleDef, RenderCtx } from '../types';
import { getProps } from '../types';
import type { LayoutNode } from '../../models/node';
import { mergeCss, styleToCss, type CssMap } from '../../services/css';
import { safeHref } from '../../services/safe-values';
import {
  dayNum, holidayMap, labelOf, monthGrid, monthLabel, monthRange, monthShort, monthsWithSessions, nextSession, primaryOf,
  resolveMonth, resolveTarget, sessionsByDate, shortDate, sortedSessions, tooltipText, typeOf, weekNo, weekdayHeads,
  weekdayMon0, type CourseData, type Session,
} from '../../models/course';

/**
 * Lịch học (ba cỡ). Cùng một hàm vẽ cho mọi nơi hiển thị:
 *  - editor: một tháng, nút ‹ › đổi tháng hiển thị (data-cal-nav), đánh dấu hôm nay.
 *  - canvas: cỡ Đầy đủ/Gọn xuất mọi tháng có buổi học xếp dọc, ‹ › là liên kết #; cỡ Mini xuất một tháng.
 *  - standalone: mọi tháng liên tiếp + data-* để script chuyển tháng, tooltip, đánh dấu hôm nay.
 *  - png: một tháng, không nút.
 */

export type ScheduleSize = 'full' | 'compact' | 'mini';

export type ScheduleProps = {
  size: ScheduleSize;
  title: string;
  showTitle: boolean;
  /** Cỡ Mini: 'inline' = "Lịch học - Tháng 11/2026" trên một dòng; 'split' = tiêu đề nhỏ ở trên, tháng ở dưới. */
  titleStyle: 'inline' | 'split';
  month: string;
  weekStart: 'mon' | 'sun';
  showWeekNo: boolean;
  markStyle: 'fill' | 'dot' | 'ring';
  showLabels: boolean;
  showLegend: boolean;
  showAgenda: 'month' | 'all' | 'none';
  showNext: boolean;
  dimPast: boolean;
  /** Gạch chân liên kết trong danh sách buổi học và dòng "Buổi tới". */
  linkUnderline: boolean;
};

const BORDER = '#e5eaf0';
const MUTED = '#5b6b77';

function tint(hex: string, t: number): string {
  const n = parseInt(hex.slice(1), 16);
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return '#eef2f6';
  const f = (c: number) => Math.round(c * t + 255 * (1 - t)).toString(16).padStart(2, '0');
  return `#${f(n >> 16)}${f((n >> 8) & 255)}${f(n & 255)}`;
}

function sessionLinkAttrs(s: Session, title?: string): Record<string, string> {
  const attrs: Record<string, string> = { href: safeHref(s.url) || '#' };
  if (resolveTarget(s) === 'new') { attrs.target = '_blank'; attrs.rel = 'noopener noreferrer'; }
  if (title) attrs.title = title;
  return attrs;
}

const blockId = (node: LayoutNode, ym: string) => `lich-${node.id}-${ym}`;

/** Dữ liệu tooltip có cấu trúc cho script của HTML độc lập. */
function tipJson(c: CourseData, date: string, list: Session[]): string {
  return JSON.stringify({ h: tooltipText(c, date, []), s: list.map((s) => ({ k: typeOf(c, s.type).name, c: typeOf(c, s.type).color, m: s.time, t: s.title, n: s.tip })) });
}

/** Các tháng cần vẽ theo nơi hiển thị. */
function monthsFor(mode: RenderCtx['mode'], size: ScheduleSize, c: CourseData, month: string): string[] {
  if (mode === 'editor' || mode === 'png') return [month];
  if (mode === 'standalone') return monthRange(c, month);
  if (size === 'mini') return [month];
  const ms = monthsWithSessions(c);
  return ms.length ? ms : [month];
}

function navEl(node: LayoutNode, ctx: RenderCtx, months: string[], i: number, dir: -1 | 1, mini: boolean): HChild {
  const target = months[i + dir];
  const label = mini ? (dir < 0 ? '‹' : '›') : dir < 0 ? `‹${target ? ` Tháng ${Number(target.slice(5))}` : ''}` : `${target ? `Tháng ${Number(target.slice(5))} ` : ''}›`;
  const linkStyle: CssMap = { color: '#1f5f8b', 'text-decoration': 'none', 'font-size': mini ? '16px' : '14px', padding: mini ? '0 6px' : '0' };
  if (ctx.mode === 'editor') {
    return {
      tag: 'button',
      attrs: { type: 'button', 'data-cal-nav': String(dir), 'aria-label': dir < 0 ? 'Tháng trước' : 'Tháng sau', title: dir < 0 ? 'Tháng trước' : 'Tháng sau' },
      style: { border: mini ? '0' : '1px solid #d5dce3', 'border-radius': '8px', 'background-color': mini ? 'transparent' : '#ffffff', color: '#1f2a37', padding: mini ? '0 6px' : '1px 12px', 'font-size': '16px', 'font-family': 'inherit', cursor: 'pointer', 'line-height': '1.4' },
      children: [mini ? label : dir < 0 ? '‹' : '›'],
    };
  }
  if (ctx.mode === 'png' || !target) return { tag: 'span', style: { 'min-width': '1px' }, children: [] };
  const attrs: Record<string, string> = { href: `#${blockId(node, target)}` };
  if (ctx.mode === 'standalone') attrs['data-cls-nav'] = String(dir);
  return { tag: 'a', attrs, style: linkStyle, children: [label] };
}

/* ------------------------------------------------------------------ Cỡ Đầy đủ / Gọn */

function fullMonth(node: LayoutNode, p: ScheduleProps, ctx: RenderCtx, months: string[], i: number): HNode {
  const ym = months[i];
  const c = ctx.course;
  const map = sessionsByDate(c);
  const hol = holidayMap(c);
  const compact = p.size === 'compact';
  const mode = ctx.mode;
  const live = mode === 'editor' || mode === 'png';
  const rows: HChild[] = [];
  for (const row of monthGrid(ym, p.weekStart)) {
    const cells: HChild[] = [];
    if (p.showWeekNo) {
      const ref = row.find((d) => weekdayMon0(d.key) === 0)?.key ?? row[0].key;
      const w = weekNo(c, ref);
      cells.push({ tag: 'td', style: { 'text-align': 'center', 'vertical-align': 'middle', 'font-size': '12px', color: '#7b8896' }, children: [w ? String(w) : ''] });
    }
    for (const d of row) {
      if (!d.inMonth) { cells.push({ tag: 'td', style: { border: `1px solid ${BORDER}`, 'background-color': '#fafbfc' } }); continue; }
      const day = String(Number(d.key.slice(8)));
      const list = map.get(d.key) ?? [];
      const h = hol.get(d.key);
      const p0 = list.length ? primaryOf(list) : null;
      const color = p0 ? typeOf(c, p0.type).color : '';
      const isToday = live && d.key === ctx.today;
      const past = live && p.dimPast && list.length > 0 && dayNum(d.key) < dayNum(ctx.today);
      const tdStyle: CssMap = {
        border: `1px solid ${BORDER}`, height: compact ? '44px' : '68px', 'vertical-align': 'top', padding: '3px',
        'background-color': p0 && p.markStyle === 'fill' ? tint(color, 0.14) : h ? '#eef1f5' : weekdayMon0(d.key) >= 5 ? '#f8f9fb' : '#ffffff',
      };
      const dn: HNode = {
        tag: 'span',
        attrs: mode === 'standalone' ? { 'data-cls-dn': '' } : undefined,
        style: isToday
          ? { display: 'inline-block', 'min-width': '22px', 'line-height': '22px', 'border-radius': '11px', 'background-color': '#1f5f8b', color: '#ffffff', 'text-align': 'center', 'font-size': '13px' }
          : { 'font-size': '13px', color: '#334155', 'line-height': '22px' },
        children: [day],
      };
      const inner: HChild[] = [dn];
      if (list.length && compact) {
        inner.push({
          tag: 'a',
          attrs: sessionLinkAttrs(p0!, mode === 'canvas' ? tooltipText(c, d.key, list) : undefined),
          style: { display: 'block', 'line-height': '10px', 'text-decoration': 'none' },
          children: list.map((s): HNode => ({ tag: 'span', style: { display: 'inline-block', width: '8px', height: '8px', 'border-radius': '50%', 'background-color': typeOf(c, s.type).color, margin: '0 2px 0 0' }, children: [] })),
        });
      } else if (list.length && p.showLabels) {
        for (const s of list.slice(0, 3)) {
          inner.push({
            tag: 'a',
            attrs: sessionLinkAttrs(s, mode === 'canvas' ? tooltipText(c, d.key, [s]) : undefined),
            style: { display: 'block', margin: '2px 0 0', padding: '1px 5px', 'border-radius': '4px', 'background-color': typeOf(c, s.type).color, color: '#ffffff', 'font-size': '11.5px', 'line-height': '1.4', 'text-decoration': 'none', 'white-space': 'nowrap', overflow: 'hidden' },
            children: [labelOf(s)],
          });
        }
      } else if (list.length) {
        inner.push({ tag: 'a', attrs: sessionLinkAttrs(p0!, mode === 'canvas' ? tooltipText(c, d.key, list) : undefined), style: { display: 'block', height: '24px' }, children: [] });
      }
      if (h && !compact) inner.push({ tag: 'span', style: { display: 'block', 'font-size': '11px', color: '#64748b', 'line-height': '1.3' }, children: [h] });
      const attrs: Record<string, string> = {};
      if (list.length) {
        if (mode === 'standalone') { attrs['data-cls-tip'] = tipJson(c, d.key, list); }
        if (mode === 'editor') attrs.title = tooltipText(c, d.key, list);
      }
      if (mode === 'standalone') attrs['data-cls-day'] = d.key;
      if (mode === 'editor') attrs['data-cal-day'] = d.key;
      const box: CssMap = { 'min-height': '100%', 'border-radius': '6px', padding: '1px 3px' };
      if (p0 && p.markStyle === 'ring') box.border = `2px solid ${color}`;
      if (past) box.opacity = '0.55';
      cells.push({ tag: 'td', attrs, style: tdStyle, children: [{ tag: 'div', style: box, children: inner }] });
    }
    rows.push({ tag: 'tr', children: cells });
  }
  const heads: HChild[] = [];
  if (p.showWeekNo) heads.push({ tag: 'th', style: { width: '42px', padding: '6px 0', 'font-size': '12px', color: MUTED }, children: ['Tuần'] });
  for (const w of weekdayHeads(p.weekStart)) heads.push({ tag: 'th', style: { padding: '6px 0', 'font-size': '13px', color: MUTED, 'text-align': 'center' }, children: [w] });

  const header: HNode = {
    tag: 'div',
    style: { display: 'flex', 'justify-content': 'space-between', 'align-items': 'center', gap: '8px', margin: '0 0 8px' },
    children: [navEl(node, ctx, months, i, -1, false), { tag: 'strong', style: { 'font-size': '17px' }, children: [monthLabel(ym)] }, navEl(node, ctx, months, i, 1, false)],
  };
  const parts: HChild[] = [header, {
    tag: 'table',
    style: { width: '100%', 'border-collapse': 'collapse', 'table-layout': 'fixed' },
    children: [{ tag: 'thead', children: [{ tag: 'tr', children: heads }] }, { tag: 'tbody', children: rows }],
  }];
  if (p.showAgenda === 'month') {
    const items = sortedSessions(c).filter((s) => s.date.slice(0, 7) === ym);
    if (items.length) parts.push(agenda(ctx, items, p));
  }
  const attrs: Record<string, string> = {};
  if (mode === 'canvas' || mode === 'standalone') attrs.id = blockId(node, ym);
  if (mode === 'standalone') attrs['data-cls-month'] = ym;
  return { tag: 'div', attrs, style: { margin: i > 0 && mode === 'canvas' ? '28px 0 0' : '0' }, children: parts };
}

function agenda(ctx: RenderCtx, items: Session[], p: ScheduleProps): HNode {
  const live = ctx.mode === 'editor' || ctx.mode === 'png';
  return {
    tag: 'ul',
    style: { 'list-style': 'none', margin: '10px 0 0', padding: '0', 'font-size': '15px' },
    children: items.map((s): HNode => {
      const past = live && p.dimPast && dayNum(s.date) < dayNum(ctx.today);
      return {
        tag: 'li',
        attrs: ctx.mode === 'standalone' ? { 'data-cls-day': s.date } : undefined,
        style: mergeCss({ padding: '6px 0', 'border-bottom': '1px solid #eef2f5' }, past ? { opacity: '0.55' } : {}),
        children: [
          { tag: 'strong', children: [shortDate(s.date)] },
          ' ',
          { tag: 'span', style: { color: MUTED, 'font-size': '14px' }, children: [s.time] },
          ' · ',
          { tag: 'a', attrs: sessionLinkAttrs(s), style: { color: '#1f5f8b', 'text-decoration': p.linkUnderline !== false ? 'underline' : 'none' }, children: [s.title] },
        ],
      };
    }),
  };
}

function legend(c: CourseData): HNode {
  const items: HChild[] = c.types.map((t): HNode => ({
    tag: 'span',
    style: { display: 'inline-block', margin: '0 14px 0 0', 'white-space': 'nowrap' },
    children: [{ tag: 'span', style: { display: 'inline-block', width: '10px', height: '10px', 'border-radius': '3px', 'background-color': t.color, margin: '0 6px 0 0' }, children: [] }, t.name],
  }));
  if (c.holidays.length) {
    items.push({ tag: 'span', style: { display: 'inline-block', 'white-space': 'nowrap' }, children: [{ tag: 'span', style: { display: 'inline-block', width: '10px', height: '10px', 'border-radius': '3px', 'background-color': '#d5dbe3', margin: '0 6px 0 0' }, children: [] }, 'Ngày nghỉ'] });
  }
  return { tag: 'div', style: { 'font-size': '13px', color: '#475569', 'line-height': '1.8' }, children: items };
}

/* ------------------------------------------------------------------ Cỡ Mini */

function miniMonth(node: LayoutNode, p: ScheduleProps, ctx: RenderCtx, months: string[], i: number): HNode {
  const ym = months[i];
  const c = ctx.course;
  const map = sessionsByDate(c);
  const hol = holidayMap(c);
  const mode = ctx.mode;
  const live = mode === 'editor' || mode === 'png';
  const rows: HChild[] = [];
  for (const row of monthGrid(ym, p.weekStart)) {
    rows.push({
      tag: 'tr',
      children: row.map((d): HNode => {
        if (!d.inMonth) return { tag: 'td', children: [] };
        const day = String(Number(d.key.slice(8)));
        const list = map.get(d.key) ?? [];
        const isToday = live && d.key === ctx.today;
        const tdAttrs: Record<string, string> = {};
        if (mode === 'editor') tdAttrs['data-cal-day'] = d.key;
        const circle: CssMap = { display: 'inline-block', width: '28px', height: '28px', 'line-height': '28px', 'border-radius': '50%', 'font-size': '12px', 'text-align': 'center', 'text-decoration': 'none' };
        if (list.length) {
          const s0 = primaryOf(list);
          const past = live && p.dimPast && dayNum(d.key) < dayNum(ctx.today);
          const attrs = sessionLinkAttrs(s0, mode === 'canvas' || mode === 'editor' ? tooltipText(c, d.key, list) : undefined);
          if (mode === 'standalone') { attrs['data-cls-tip'] = tipJson(c, d.key, list); attrs['data-cls-day'] = d.key; attrs['data-cls-ring'] = ''; }
          return {
            tag: 'td', attrs: tdAttrs, style: { padding: '0', 'text-align': 'center' },
            children: [{
              tag: 'a', attrs,
              style: mergeCss(circle, { 'background-color': typeOf(c, s0.type).color, color: '#ffffff' }, isToday ? { 'box-shadow': '0 0 0 2px #ffffff, 0 0 0 4px #1f2a37' } : {}, past ? { opacity: '0.5' } : {}),
              children: [{ tag: 'strong', children: [day] }],
            }],
          };
        }
        const h = hol.get(d.key);
        const spanAttrs: Record<string, string> = h ? { title: h } : {};
        if (mode === 'standalone') { spanAttrs['data-cls-day'] = d.key; spanAttrs['data-cls-ring'] = ''; }
        return {
          tag: 'td', attrs: tdAttrs, style: { padding: '0', 'text-align': 'center' },
          children: [{
            tag: 'span', attrs: spanAttrs,
            style: mergeCss(circle, { color: h || weekdayMon0(d.key) >= 5 ? '#94a3b8' : '#334155' }, isToday ? { border: '2px solid #1f5f8b', 'line-height': '24px', color: '#1f5f8b' } : {}),
            children: [h ? { tag: 'del', children: [day] } : day],
          }],
        };
      }),
    });
  }
  const inline = p.showTitle && p.titleStyle !== 'split';
  const label: HChild[] = inline
    ? [{ tag: 'span', editable: { nodeId: node.id, field: 'title', placeholder: 'Lịch học' }, children: [p.title] }, ' - ', { tag: 'span', style: { 'white-space': 'nowrap' }, children: [monthShort(ym)] }]
    : [monthShort(ym)];
  const header: HNode = {
    tag: 'div',
    style: { display: 'flex', 'justify-content': 'space-between', 'align-items': inline ? 'flex-start' : 'center', gap: '6px', margin: '0 0 4px' },
    children: [
      { tag: 'strong', style: mergeCss({ 'font-size': inline ? '15px' : '14px', 'line-height': '1.35', 'min-width': '0' }, inline ? { color: ctx.page.headingColor } : {}), children: label },
      { tag: 'span', style: { display: 'flex', gap: '2px', 'flex-shrink': '0' }, children: mode === 'png' || mode === 'canvas' ? [] : [navEl(node, ctx, months, i, -1, true), navEl(node, ctx, months, i, 1, true)] },
    ],
  };
  const attrs: Record<string, string> = {};
  if (mode === 'standalone') { attrs.id = blockId(node, ym); attrs['data-cls-month'] = ym; }
  return {
    tag: 'div',
    attrs,
    children: [header, {
      tag: 'table',
      style: { width: '100%', 'border-collapse': 'separate', 'border-spacing': '2px', 'table-layout': 'fixed', 'text-align': 'center' },
      children: [
        { tag: 'thead', children: [{ tag: 'tr', children: weekdayHeads(p.weekStart).map((w): HNode => ({ tag: 'th', style: { 'font-size': '11px', color: '#8592a0', padding: '0 0 2px' }, children: [w] })) }] },
        { tag: 'tbody', children: rows },
      ],
    }],
  };
}

function nextLine(ctx: RenderCtx, underline: boolean): HNode {
  const nx = nextSession(ctx.course, ctx.today);
  return {
    tag: 'div',
    attrs: ctx.mode === 'standalone' ? { 'data-cls-next': '' } : undefined,
    style: { 'border-top': '1px solid #eef2f5', 'padding-top': '7px', 'font-size': '13px', color: '#475569', 'line-height': '1.45' },
    children: nx
      ? ['Buổi tới: ', { tag: 'strong', children: [shortDate(nx.date)] }, ' · ', { tag: 'a', attrs: sessionLinkAttrs(nx), style: { color: '#1f5f8b', 'text-decoration': underline ? 'underline' : 'none' }, children: [labelOf(nx)] }]
      : ['Không còn buổi học sắp tới.'],
  };
}

/* ------------------------------------------------------------------ Định nghĩa module */

export const scheduleDef: ModuleDef<ScheduleProps> = {
  type: 'schedule',
  label: 'Lịch học',
  icon: 'calendar',
  isContainer: false,
  defaultProps: () => ({
    size: 'full', title: 'Lịch học', showTitle: true, titleStyle: 'inline', month: 'auto', weekStart: 'mon', showWeekNo: true, markStyle: 'fill',
    showLabels: true, showLegend: true, showAgenda: 'month', showNext: true, dimPast: true, linkUnderline: true,
  }),
  defaultStyle: () => ({
    bg: '#ffffff', borderStyle: 'solid', borderWidth: 1, borderColor: '#e2e8f0',
    radius: { tl: 12, tr: 12, br: 12, bl: 12 }, padding: { t: 20, r: 20, b: 20, l: 20 }, gap: 12,
  }),
  groups: ['layout', 'background', 'border', 'shadow', 'spacing'],
  render(node, ctx) {
    const p = getProps(node, scheduleDef);
    const c = ctx.course;
    const mini = p.size === 'mini';
    const month = resolveMonth(p.month, c, ctx.today);
    const months = monthsFor(ctx.mode, p.size, c, month);
    const children: HChild[] = [];
    if (p.showTitle && (!mini || p.titleStyle === 'split')) {
      children.push({
        tag: mini ? 'div' : 'h3',
        style: mini ? { 'font-size': '13px', color: ctx.page.headingColor, margin: '0' } : { margin: '0', 'font-size': '20px', 'line-height': '1.3', color: ctx.page.headingColor },
        editable: { nodeId: node.id, field: 'title', placeholder: 'Lịch học' },
        children: [p.title],
      });
    }
    if (ctx.mode === 'editor' && !c.sessions.length) {
      children.push({ tag: 'div', style: { padding: '8px 10px', 'border-radius': '6px', 'background-color': '#fff8e6', color: '#7a5500', 'font-size': '13px' }, children: ['Chưa có buổi học. Thêm ở bảng Thuộc tính, mục "Buổi học".'] });
    }
    months.forEach((_, i) => children.push(mini ? miniMonth(node, p, ctx, months, i) : fullMonth(node, p, ctx, months, i)));
    if (mini && p.showNext && ctx.mode !== 'canvas') children.push(nextLine(ctx, p.linkUnderline !== false));
    if (!mini && p.showLegend) children.push(legend(c));
    if (!mini && p.showAgenda === 'all') {
      const all = sortedSessions(c);
      if (all.length) children.push({ tag: 'div', children: [{ tag: 'strong', style: { 'font-size': '15px', color: ctx.page.headingColor }, children: ['Tất cả buổi học'] }, agenda(ctx, all, p)] });
    }
    const attrs: Record<string, string> = {};
    if (ctx.mode === 'standalone') {
      attrs['data-cls-cal'] = p.size;
      attrs['data-cls-start'] = month;
      attrs['data-cls-auto'] = p.month === 'auto' ? '1' : '0';
      attrs['data-cls-dim'] = p.dimPast ? '1' : '0';
      if (p.linkUnderline === false) attrs['data-cls-nu'] = '1';
      if (mini && p.showNext) {
        attrs['data-cls-sessions'] = JSON.stringify(sortedSessions(c).map((s) => ({ d: s.date, l: labelOf(s), u: safeHref(s.url) || '#', n: resolveTarget(s) === 'new' ? 1 : 0 })));
      }
    }
    return {
      tag: 'div',
      nodeId: node.id,
      attrs,
      style: mergeCss({ display: 'flex', 'flex-direction': 'column', 'font-family': 'inherit' }, mini ? { 'font-size': '14px' } : {}, styleToCss(node.style)),
      children,
    };
  },
};

/** Style mặc định cho cỡ Mini (dùng khi đổi cỡ hoặc tạo Lịch học mini). */
export function miniScheduleStyle() {
  return {
    bg: '#ffffff', borderStyle: 'solid' as const, borderWidth: 1, borderColor: '#e2e8f0',
    radius: { tl: 12, tr: 12, br: 12, bl: 12 }, padding: { t: 14, r: 14, b: 14, l: 14 }, gap: 8,
    maxWidth: { value: 320, unit: 'px' as const },
  };
}

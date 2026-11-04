import { describe, expect, it } from 'vitest';
import { exportProject } from '../src/services/html-exporter';
import { checkCanvasHtml } from '../src/services/html-checker';
import { createNode } from '../src/modules/registry';
import { LIBRARY } from '../src/modules/library';
import { parsePastedTable } from '../src/modules/defs/curriculum';
import { miniScheduleStyle } from '../src/modules/defs/schedule';
import { RUNTIME_SCRIPT } from '../src/services/runtime-script';
import { parseProjectJson, serializeProject, validateProject } from '../src/services/import-export';
import { progressValue, monthGrid, repeatDates, resolveMonth, weekNo, monthRange } from '../src/models/course';
import { sampleCourse, buildOverviewProject } from '../src/samples/overview-project';
import { projectWith } from './helpers';

const withCourse = (...nodes: ReturnType<typeof createNode>[]) => {
  const p = projectWith(nodes);
  p.course = sampleCourse();
  return p;
};
const TODAY = '2026-10-28';

describe('Dữ liệu khóa học', () => {
  it('lưới tháng bắt đầu Thứ Hai, đủ ngày', () => {
    const g = monthGrid('2026-10', 'mon');
    expect(g[0].map((d) => d.key)).toEqual(['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04']);
    expect(g.flat().filter((d) => d.inMonth).length).toBe(31);
    expect(monthGrid('2026-10', 'sun')[0][0].key).toBe('2026-09-27');
  });

  it('số tuần học tính từ tuần chứa ngày bắt đầu', () => {
    const c = sampleCourse();
    expect(weekNo(c, '2026-08-26')).toBe(1);
    expect(weekNo(c, '2026-08-30')).toBe(1);
    expect(weekNo(c, '2026-08-31')).toBe(2);
    expect(weekNo(c, '2026-10-28')).toBe(10);
  });

  it('tạo lịch lặp bỏ qua ngày nghỉ', () => {
    const d = repeatDates(2, '2026-08-26', '2026-09-16', new Set(['2026-09-02']));
    expect(d).toEqual(['2026-08-26', '2026-09-09', '2026-09-16']);
  });

  it('tháng tự động: tháng hiện tại nếu trong khóa học, không thì tháng có buổi đầu', () => {
    const c = sampleCourse();
    expect(resolveMonth('auto', c, '2026-10-28')).toBe('2026-10');
    expect(resolveMonth('auto', c, '2027-03-01')).toBe('2026-08');
    expect(resolveMonth('2026-09', c, '2026-10-28')).toBe('2026-09');
    expect(monthRange(c, '2026-10')).toEqual(['2026-08', '2026-09', '2026-10', '2026-11', '2026-12']);
  });

  it('tiến độ theo ngày, theo buổi và thủ công', () => {
    const c = sampleCourse();
    expect(progressValue(c, 'session', 0, TODAY)).toMatchObject({ pct: 47, text: 'Đã học 7/15 buổi' });
    expect(progressValue(c, 'date', 0, '2026-08-26').pct).toBe(0);
    expect(progressValue(c, 'date', 0, '2026-12-16').pct).toBe(100);
    expect(progressValue(c, 'date', 0, TODAY).text).toBe('Tuần 10/17');
    expect(progressValue(c, 'manual', 130, TODAY).pct).toBe(100);
  });
});

describe('Xuất Canvas cho Tiện ích', () => {
  const nodes = () => [
    createNode('schedule'),
    createNode('schedule', { props: { size: 'compact' } }),
    createNode('schedule', { props: { size: 'mini' }, style: miniScheduleStyle() }),
    createNode('curriculum'),
    createNode('curriculum', { props: { layout: 'list' } }),
    createNode('progress', { props: { look: 'weeks' } }),
    createNode('progress', { props: { size: 'small' } }),
  ];

  it('chỉ dùng thẻ và CSS Canvas cho phép, không có script hay data-*', () => {
    const res = exportProject(withCourse(...nodes()), { mode: 'canvas', today: TODAY });
    expect(res.body).not.toMatch(/<script|<style|<button|data-cls|data-cal|data-cur|box-shadow|opacity/);
    expect(checkCanvasHtml(res.body).filter((f) => f.level !== 'info')).toEqual([]);
  });

  it('lịch đầy đủ: các tháng có buổi học xếp dọc với liên kết nhảy tháng', () => {
    const s = createNode('schedule');
    const html = exportProject(withCourse(s), { mode: 'canvas', today: TODAY }).body;
    for (const m of ['2026-08', '2026-09', '2026-10']) expect(html).toContain(`id="lich-${s.id}-${m}"`);
    expect(html).toContain(`href="#lich-${s.id}-2026-09"`);
    expect(html).toContain('Tháng 8, 2026');
    // Tooltip mặc định của trình duyệt có nội dung buổi học.
    expect(html).toMatch(/title="Thứ Tư, 07\/10\/2026\nBuổi học · Tiết 7-12\nBuổi 6: LINQ/);
  });

  it('lịch mini: một tháng, ngày có buổi là liên kết, không có "Buổi tới" và "Xem lịch đầy đủ"', () => {
    const s = createNode('schedule', { props: { size: 'mini', month: '2026-09' } });
    const html = exportProject(withCourse(s), { mode: 'canvas', today: TODAY }).body;
    expect(html).toContain('Tháng 9/2026');
    expect(html).not.toContain('Tháng 10/2026');
    expect(html).not.toContain('Buổi tới');
    expect(html).not.toContain('Xem lịch đầy đủ');
    expect(html).toContain('href="https://lms.example.edu.vn/courses/1234/assignments/checkpoint-1"');
    expect(html).toContain('<del>2</del>');
  });

  it('chương trình học: ô nhấn mạnh viền đỏ, cột đầu cố định, liên kết tiêu đề cột', () => {
    const html = exportProject(buildOverviewProject(), { mode: 'canvas', today: TODAY }).body;
    expect(html).toContain('NGHIỆM THU Checkpoint 1');
    expect(html).toMatch(/color: #b42318; border: 2px solid #b42318">NGHIỆM THU Checkpoint 1/);
    expect(html).toContain('position: sticky');
    expect(html).toContain('BUỔI 1');
    expect(html).toContain('26/08');
  });

  it('tiến độ: ghi ngày cập nhật trong bản Canvas', () => {
    const html = exportProject(withCourse(createNode('progress', { props: { basis: 'session' } })), { mode: 'canvas', today: TODAY }).body;
    expect(html).toContain('47%');
    expect(html).toContain('Cập nhật ngày 28/10/2026');
  });
});

describe('Xuất HTML độc lập cho Tiện ích', () => {
  it('kèm script và dữ liệu cho chuyển tháng, tooltip, tiến độ', () => {
    const res = exportProject(buildOverviewProject(), { mode: 'standalone', today: TODAY });
    expect(res.hasScript).toBe(true);
    expect(res.document).toContain('data-cls-cal="mini"');
    expect(res.document).toContain('data-cls-month="2026-12"');
    expect(res.document).toContain('data-cls-tip=');
    expect(res.document).toContain('data-cls-prog=');
    expect(res.document).toContain('Array.prototype.forEach.call(cals');
  });

  it('script đi kèm là JavaScript hợp lệ', () => {
    const code = RUNTIME_SCRIPT.replace(/^<script>/, '').replace(/<\/script>$/, '');
    expect(() => new Function(code)).not.toThrow();
  });

  it('PNG không có nút chuyển tháng và đánh dấu hôm nay', () => {
    const res = exportProject(withCourse(createNode('schedule', { props: { month: '2026-10' } })), { mode: 'png', today: TODAY, scope: 'x' });
    expect(res.body).not.toContain('data-cal-nav');
    expect(res.body).not.toContain('<button');
    expect(res.body).toContain('Tháng 10, 2026');
    expect(res.body).not.toContain('Tháng 9, 2026');
  });
});

describe('Chương trình học trong ảnh PNG', () => {
  it('bảng co vừa khung, không cuộn, không cắt cột', () => {
    const res = exportProject(buildOverviewProject(), { mode: 'png', today: TODAY, scope: 'x' });
    expect(res.body).not.toMatch(/overflow-x: auto/);
    expect(res.body).not.toMatch(/<table[^>]*min-width/);
    expect(res.body).toContain('Lab 7 - Tải lên ảnh bìa sách');
  });
});

describe('Dán bảng từ Excel', () => {
  it('nhận tiêu đề cột, hàng Ngày, tên hàng và ô nghiệm thu', () => {
    const t = parsePastedTable('Tiết\tBuổi 1\tBuổi 2\nNgày\t26/08\t09/09\nTiết 7\tMục tiêu\tÔn Chương 1\nTiết 12\tCủng cố\tNGHIỆM THU Checkpoint 1\r\n')!;
    expect(t.rowHeader).toBe('Tiết');
    expect(t.cols).toEqual([{ title: 'Buổi 1', date: '26/08', url: '' }, { title: 'Buổi 2', date: '09/09', url: '' }]);
    expect(t.rows).toEqual(['Tiết 7', 'Tiết 12']);
    expect(t.cells[1][1]).toEqual({ text: 'NGHIỆM THU Checkpoint 1', em: true, url: '' });
    expect(parsePastedTable('chỉ một dòng')).toBeNull();
  });
});

describe('Dữ liệu dự án v2', () => {
  it('dự án v1 được nâng cấp, có dữ liệu khóa học mặc định', () => {
    const res = validateProject({ schema: 'canvas-layout-studio/project', version: 1, name: 'Cũ', nodes: [{ id: 'a', type: 'heading', props: { text: 'Hi' }, style: {} }] });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.project.version).toBe(3);
    expect(res.project.course.sessions).toEqual([]);
    expect(res.project.course.types.length).toBeGreaterThan(0);
  });

  it('làm sạch dữ liệu khóa học khi nhập', () => {
    const res = validateProject({
      schema: 'canvas-layout-studio/project', version: 2, nodes: [],
      course: {
        start: '2026-08-26', end: 'sai', totalSessions: 9999,
        types: [{ id: 'x', name: 'Loại', color: 'red;background:url(x)' }],
        holidays: [{ date: 'không phải ngày', name: 'X' }, { date: '2026-09-02', name: 'Quốc khánh' }],
        sessions: [{ id: 's1', date: '2026-09-09', title: 'Buổi 1', url: 'javascript:alert(1)' }, { title: 'thiếu ngày' }],
      },
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const c = res.project.course;
    expect(c.end).not.toBe('sai');
    expect(c.totalSessions).toBe(200);
    expect(c.types[0].color).toBe('#1f5f8b');
    expect(c.holidays).toEqual([{ date: '2026-09-02', name: 'Quốc khánh' }]);
    expect(c.sessions).toHaveLength(1);
    expect(c.sessions[0].url).toBe('');
  });

  it('xuất rồi nhập lại giữ nguyên dữ liệu khóa học và tiện ích', () => {
    const p = buildOverviewProject();
    const res = parseProjectJson(serializeProject(p));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.project.course).toEqual(p.course);
    expect(res.project.nodes).toEqual(p.nodes);
  });

  it('thư viện có nhóm Tiện ích với 4 module', () => {
    expect(LIBRARY.filter((e) => e.group === 'utility').map((e) => e.label)).toEqual(['Lịch học', 'Lịch học mini', 'Chương trình học', 'Tiến độ khóa học']);
  });
});

describe('Tiến độ theo số tiết (1.2)', () => {
  it('suy ra số tiết từ ô giờ', async () => {
    const { periodsFromTime } = await import('../src/models/course');
    expect(periodsFromTime('Tiết 7-12')).toBe(6);
    expect(periodsFromTime('tiết 1 - 3')).toBe(3);
    expect(periodsFromTime('Tiết 12')).toBe(1);
    expect(periodsFromTime('T7-T11')).toBe(5);
    expect(periodsFromTime('Tiết 1, 2, 3')).toBe(3);
    expect(periodsFromTime('13:00-16:30')).toBe(0);
  });

  it('cộng tiết theo loại buổi được tính, không trùng tiết nghiệm thu', () => {
    const c = sampleCourse();
    // 7 buổi × 6 tiết đã qua (đến 14/10); 2 buổi nghiệm thu không tính.
    expect(progressValue(c, 'periods', 0, TODAY)).toMatchObject({ pct: 47, text: 'Đã học 42/90 tiết · Buổi 7/15' });
    c.types = c.types.map((t) => (t.id === 'nt' ? { ...t, progress: true } : t));
    expect(progressValue(c, 'periods', 0, TODAY).text).toBe('Đã học 44/90 tiết · Buổi 9/15');
  });

  it('tính hoặc không tính buổi của hôm nay', () => {
    const c = sampleCourse();
    expect(progressValue(c, 'periods', 0, '2026-10-14', true).text).toBe('Đã học 42/90 tiết · Buổi 7/15');
    expect(progressValue(c, 'periods', 0, '2026-10-14', false).text).toBe('Đã học 36/90 tiết · Buổi 6/15');
    expect(progressValue(c, 'session', 0, '2026-10-14', false).text).toBe('Đã học 6/15 buổi');
  });

  it('tổng số tiết: để trống thì cộng từ các buổi, nhập ít hơn thì lấy số đã xếp', () => {
    const c = sampleCourse();
    c.totalPeriods = 0;
    expect(progressValue(c, 'periods', 0, TODAY).text).toBe('Đã học 42/42 tiết · Buổi 7/15');
    c.totalPeriods = 30;
    expect(progressValue(c, 'periods', 0, TODAY).pct).toBe(100);
  });

  it('buổi chưa nhập số tiết thì lấy từ ô giờ (dữ liệu cũ)', () => {
    const c = sampleCourse();
    c.sessions = c.sessions.map((s) => ({ ...s, periods: 0 }));
    expect(progressValue(c, 'periods', 0, TODAY).text).toBe('Đã học 42/90 tiết · Buổi 7/15');
  });

  it('dự án v2 nâng cấp: loại cũ chưa có cờ tiến độ, buổi chưa có số tiết', () => {
    const res = validateProject({
      schema: 'canvas-layout-studio/project', version: 2, nodes: [],
      course: { start: '2026-08-26', end: '2026-12-16', totalSessions: 15, types: [{ id: 'bh', name: 'Buổi học', color: '#1f5f8b' }, { id: 'x', name: 'Khác', color: '#333333' }], holidays: [], sessions: [{ id: 's1', date: '2026-09-09', time: 'Tiết 7-9', type: 'bh', title: 'B1' }] },
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.project.version).toBe(3);
    expect(res.project.course.types.map((t) => t.progress)).toEqual([true, false]);
    expect(res.project.course.sessions[0].periods).toBe(0);
    expect(res.project.course.totalPeriods).toBe(0);
    expect(progressValue(res.project.course, 'periods', 0, '2026-12-01').text).toBe('Đã học 3/3 tiết · Buổi 1/15');
  });

  it('HTML độc lập mang dữ liệu số tiết cho script tự tính lại', () => {
    const res = exportProject(withCourse(createNode('progress', { props: { basis: 'periods' } })), { mode: 'standalone', today: TODAY });
    expect(res.document).toMatch(/&quot;tp&quot;:90/);
    expect(res.document).toMatch(/&quot;d&quot;:&quot;2026-08-26&quot;,&quot;p&quot;:6/);
    expect(res.document).toContain("c.basis === 'periods'");
  });
});

describe('Lịch học mini: tiêu đề gộp một dòng (1.2)', () => {
  it('mặc định "Lịch học - Tháng m/yyyy" trong một dòng, cả bản Canvas', () => {
    const s = createNode('schedule', { props: { size: 'mini', month: '2026-09' } });
    const html = exportProject(withCourse(s), { mode: 'canvas', today: TODAY }).body;
    expect(html).toMatch(/<strong[^>]*>\s*<span>Lịch học<\/span> - \s*<span style="white-space: nowrap">Tháng 9\/2026<\/span>/);
    expect(html.match(/Lịch học/g)).toHaveLength(1);
  });

  it('kiểu tách hai dòng và kiểu chỉ tháng', () => {
    const split = exportProject(withCourse(createNode('schedule', { props: { size: 'mini', month: '2026-09', titleStyle: 'split' } })), { mode: 'canvas', today: TODAY }).body;
    expect(split).toMatch(/Lịch học<\/div>/);
    expect(split).toMatch(/<strong[^>]*>Tháng 9\/2026<\/strong>/);
    const only = exportProject(withCourse(createNode('schedule', { props: { size: 'mini', month: '2026-09', showTitle: false } })), { mode: 'canvas', today: TODAY }).body;
    expect(only).not.toContain('Lịch học');
  });
});

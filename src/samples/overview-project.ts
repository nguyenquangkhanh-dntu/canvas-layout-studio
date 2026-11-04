import { createEmptyProject, type Project } from '../models/project';
import { DEFAULT_TYPES, dateKey, pad2, type CourseData } from '../models/course';
import { createColumns, createNode } from '../modules/registry';
import { miniScheduleStyle } from '../modules/defs/schedule';
import { useEditor } from '../editor/store';

/**
 * Dữ liệu mẫu học phần Lập trình Web API (7 buổi đầu, Thứ Tư, tiết 7-12).
 * Ngày kết thúc học kỳ, tổng số buổi và tổng số tiết là giá trị ví dụ.
 */
const BASE = 'https://lms.example.edu.vn/courses/1234';
const DATES = ['26/08', '09/09', '16/09', '23/09', '30/09', '07/10', '14/10'];
const TOPICS = [
  'Mục tiêu học phần, Web API và REST', 'Giao thức HTTP, request và response', 'Controller, routing và model binding',
  'DTO, phân trang, lọc và sắp xếp', 'Entity Framework Core và SQLite', 'LINQ, CRUD và quan hệ bảng', 'Tải tệp qua Web API',
];
const LABS = [
  'Lab 1 - Cài môi trường & tạo dự án đầu tiên', 'Lab 2 - Kiểm thử endpoint bằng Postman', 'Lab 3 - CRUD đầy đủ cho tài nguyên Sách',
  'Lab 4 - Phân trang, lọc & DTO', 'Lab 5 - Chuyển sang CSDL SQLite', 'Lab 6 - CRUD thực tế qua EF Core', 'Lab 7 - Tải lên ảnh bìa sách',
];
const CELLS = [
  ['Mục tiêu, nội dung học phần', 'Ôn Chương 1', 'Ôn Chương 2', 'Ôn Chương 3', 'Ôn Chương 4', 'Ôn Chương 5', 'Ôn Chương 6'],
  ['Yêu cầu & nội quy lớp', '2.1. Giao thức HTTP: phương thức & mã trạng thái', '3.1. Controller & attribute routing', '4.1. DTO & tách khỏi entity', '5.1. ORM & Entity Framework Core', '6.1. Truy vấn dữ liệu với LINQ', '7.1. Tải tệp lên qua Web API'],
  ['1.1. Web Service & Web API', '2.2. Cấu trúc request & response', '3.2. Model binding: route, query, body', '4.2. Phân trang dữ liệu', '5.2. DbContext & mô hình dữ liệu', '6.2. Thêm, sửa, xoá bản ghi', '7.2. Kiểm tra & lưu trữ tệp'],
  ['1.2. Kiến trúc REST & nguyên tắc thiết kế', '2.3. Kiểm thử với Swagger & Postman', '3.3. Mã trạng thái trong phản hồi', '4.3. Lọc & sắp xếp kết quả', '5.3. Migration & kết nối SQLite', '6.3. Quan hệ giữa các bảng & Include', '7.3. Trả tệp về cho client'],
  LABS,
  ['Củng cố Chương 1 · giao Lab 1', 'Củng cố Chương 2 · trắc nghiệm', 'NGHIỆM THU Checkpoint 1', 'Củng cố Chương 4 · trắc nghiệm', 'NGHIỆM THU Checkpoint 2', 'Củng cố Chương 6 · trắc nghiệm', 'Củng cố Chương 7 · trắc nghiệm'],
];

const key = (dm: string) => { const [d, m] = dm.split('/').map(Number); return dateKey(2026, m, d); };

export function sampleCourse(): CourseData {
  const sessions = DATES.map((dm, i) => ({
    id: `s-b${i + 1}`, date: key(dm), time: 'Tiết 7-12', type: 'bh', title: `Buổi ${i + 1}: ${TOPICS[i]}`, label: `Buổi ${i + 1}`,
    tip: LABS[i], periods: 6, url: `${BASE}/pages/buoi-${pad2(i + 1)}`, target: 'auto' as const,
  }));
  sessions.push(
    { id: 's-cp1', date: '2026-09-16', time: 'Tiết 12', type: 'nt', title: 'Nghiệm thu Checkpoint 1', label: 'Checkpoint 1', tip: 'Nghiệm thu Lab 1 đến Lab 3', periods: 1, url: `${BASE}/assignments/checkpoint-1`, target: 'auto' },
    { id: 's-cp2', date: '2026-09-30', time: 'Tiết 12', type: 'nt', title: 'Nghiệm thu Checkpoint 2', label: 'Checkpoint 2', tip: 'Nghiệm thu Lab 4 và Lab 5', periods: 1, url: `${BASE}/assignments/checkpoint-2`, target: 'auto' },
  );
  return {
    start: '2026-08-26', end: '2026-12-16', totalSessions: 15, totalPeriods: 90,
    types: DEFAULT_TYPES.map((t) => ({ ...t })),
    holidays: [{ date: '2026-09-02', name: 'Quốc khánh' }],
    sessions,
  };
}

/** Mẫu "Tổng quan học phần": Chương trình học + Lịch học mini + Tiến độ ở cột bên + Lịch học đầy đủ. */
export function buildOverviewProject(): Project {
  const p = createEmptyProject('Tổng quan học phần Lập trình Web API');
  p.course = sampleCourse();
  const cols = createColumns(2, { name: 'Nội dung và cột bên', props: { ratios: [3, 1], minColWidth: 200 } });
  const [main, side] = cols.children!;
  main.props.ratio = 3;
  main.props.minWidth = 200;
  side.props.ratio = 1;
  side.props.minWidth = 200;
  main.children = [
    createNode('heading', { name: 'Tiêu đề', props: { text: 'Chương trình học', level: 2 } }),
    createNode('curriculum', {
      props: {
        rowHeader: 'Tiết', dateRowLabel: 'Ngày',
        rows: ['Tiết 7', 'Tiết 8', 'Tiết 9', 'Tiết 10', 'Tiết 11', 'Tiết 12'],
        cols: DATES.map((d, i) => ({ title: `Buổi ${i + 1}`, date: d, url: `${BASE}/pages/buoi-${pad2(i + 1)}` })),
        cells: CELLS.map((row) => row.map((text) => ({ text, em: text.startsWith('NGHIỆM THU'), url: '' }))),
      },
    }),
  ];
  side.children = [
    createNode('schedule', { name: 'Lịch học mini', props: { size: 'mini', title: 'Lịch học' }, style: miniScheduleStyle() }),
    createNode('progress', { name: 'Tiến độ', props: { size: 'small', basis: 'periods', look: 'bar' }, style: { padding: { t: 14, r: 14, b: 14, l: 14 } } }),
  ];
  p.nodes = [
    createNode('heading', { name: 'Tên học phần', props: { text: 'Lập trình Web API · Tổng quan học phần', level: 2 }, style: { fontSize: 30 } }),
    cols,
    createNode('schedule', { name: 'Lịch học', props: { title: 'Lịch học cả học kỳ', showAgenda: 'month' } }),
  ];
  return p;
}

export function loadOverviewProject() {
  useEditor.getState().loadProject(buildOverviewProject());
}

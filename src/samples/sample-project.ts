import type { LayoutNode } from '../models/node';
import { createEmptyProject, type Project } from '../models/project';
import { CALLOUT_VARIANTS } from '../models/callouts';
import { createColumns, createNode } from '../modules/registry';
import { createCallout } from '../modules/library';
import { useEditor } from '../editor/store';
import { sampleCourse } from './overview-project';

const text = (name: string, html: string, style = {}) => createNode('text', { name, props: { html }, style: { paragraphSpacing: 12, ...style } });
const heading = (t: string, level = 2, style = {}) => createNode('heading', { name: t.slice(0, 40), props: { text: t, level }, style: { margin: { t: 0, r: 0, b: 0, l: 0 }, ...style } });
const callout = (id: string, title?: string, bodyHtml?: string): LayoutNode => {
  const v = CALLOUT_VARIANTS.find((x) => x.id === id)!;
  const n = createCallout(v);
  if (title) n.props.title = title;
  if (bodyHtml && n.children?.[0]) n.children[0].props.html = bodyHtml;
  return n;
};

/** Bài học mẫu: Web API cơ bản. Dùng làm ví dụ minh họa và dữ liệu kiểm thử. */
export function buildSampleProject(): Project {
  const p = createEmptyProject('Bài 01 - Giới thiệu Web API');
  p.course = sampleCourse();
  p.page.themeId = 'professional';

  const hero = createNode('container', {
    name: 'Đầu bài',
    style: {
      gradient: { from: '#163a56', to: '#1f5f8b', angle: 120 }, color: '#ffffff', borderStyle: 'none',
      radius: { tl: 14, tr: 14, br: 14, bl: 14 }, padding: { t: 32, r: 32, b: 32, l: 32 }, gap: 10,
    },
    children: [
      text('Nhãn bài học', '<p>Bài học 01 · Lập trình Web API</p>', { fontSize: 15, color: '#cfe2f1' }),
      heading('Web API: khái niệm và kiến trúc cơ bản', 2, { color: '#ffffff', fontSize: 32 }),
      text('Giới thiệu', '<p>Bài này giúp sinh viên hiểu Web API là gì, cách client và server trao đổi dữ liệu qua HTTP, và viết được endpoint đầu tiên bằng ASP.NET Core.</p>', { color: '#e8f1f8' }),
    ],
  });

  const objectives = callout('objectives', 'Mục tiêu học tập', '<p>Sau bài học, sinh viên có thể:</p><ul><li><p>Trình bày khái niệm Web API và mô hình client - server.</p></li><li><p>Phân biệt các phương thức HTTP: GET, POST, PUT, DELETE.</p></li><li><p>Đọc hiểu một request và response dạng JSON.</p></li></ul>');

  const s1Cols = createColumns(2);
  s1Cols.children![0].children = [
    text('Khái niệm', '<p><strong>Web API</strong> là tập hợp các điểm truy cập (endpoint) cho phép chương trình khác gửi yêu cầu và nhận dữ liệu qua giao thức HTTP.</p><p>Thay vì trả về trang HTML cho người dùng, Web API thường trả về dữ liệu <strong>JSON</strong> để ứng dụng web, mobile hoặc desktop tự hiển thị.</p>'),
  ];
  s1Cols.children![1].children = [
    createNode('code', { name: 'Ví dụ request', props: { title: 'Request', language: 'HTTP', code: 'GET /api/books/1 HTTP/1.1\nHost: localhost:5000\nAccept: application/json', showCopy: true } }),
    createNode('code', { name: 'Ví dụ response', props: { title: 'Response', language: 'JSON', code: '{\n  "id": 1,\n  "title": "Lập trình C# cơ bản",\n  "available": true\n}', showCopy: true } }),
  ];
  const section1 = createNode('container', {
    name: 'Phần 1',
    props: { tag: 'section', showTitle: true, title: '1. Web API là gì?', titleLevel: 2 },
    style: { padding: { t: 0, r: 0, b: 0, l: 0 }, gap: 16, bg: undefined, borderStyle: 'none' },
    children: [s1Cols],
  });
  delete section1.style.bg;

  const method = (name: string, color: string, desc: string) =>
    createNode('container', {
      name: `Phương thức ${name}`,
      style: { bg: '#ffffff', borderStyle: 'solid', borderWidth: 1, borderColor: '#dbe3ec', borderLeftWidth: 4, borderLeftColor: color, radius: { tl: 8, tr: 8, br: 8, bl: 8 }, padding: { t: 16, r: 18, b: 16, l: 18 }, gap: 6 },
      children: [heading(name, 3, { color, fontSize: 20 }), text(`Mô tả ${name}`, `<p>${desc}</p>`, { fontSize: 16 })],
    });
  const grid = createNode('grid', {
    name: 'Bảng phương thức',
    props: { minColWidth: 200 },
    style: { gap: 14 },
    children: [
      method('GET', '#1f5f8b', 'Lấy dữ liệu. Không làm thay đổi trạng thái trên server.'),
      method('POST', '#2f7d4f', 'Tạo mới một tài nguyên, dữ liệu gửi trong body.'),
      method('PUT', '#946200', 'Cập nhật toàn bộ một tài nguyên đã có.'),
      method('DELETE', '#b42318', 'Xóa một tài nguyên theo định danh.'),
    ],
  });
  const section2 = createNode('container', {
    name: 'Phần 2',
    props: { tag: 'section', showTitle: true, title: '2. Các phương thức HTTP thường dùng', titleLevel: 2 },
    style: { padding: { t: 0, r: 0, b: 0, l: 0 }, gap: 16, borderStyle: 'none' },
    children: [
      grid,
      callout('important', 'Phân biệt PUT và PATCH', '<p><strong>PUT</strong> gửi lại toàn bộ đối tượng; <strong>PATCH</strong> chỉ gửi các trường cần thay đổi. Dùng sai có thể làm mất dữ liệu của những trường không được gửi.</p>'),
    ],
  });
  delete section2.style.bg;

  const codeExample = createNode('code', {
    name: 'Endpoint đầu tiên',
    props: {
      title: 'Program.cs',
      language: 'C#',
      code: 'var builder = WebApplication.CreateBuilder(args);\nvar app = builder.Build();\n\nvar books = new[] { new { Id = 1, Title = "Lập trình C# cơ bản" } };\n\napp.MapGet("/api/books", () => books);\n\napp.Run();',
      showCopy: true,
    },
  });
  const section3 = createNode('container', {
    name: 'Phần 3',
    props: { tag: 'section', showTitle: true, title: '3. Viết endpoint đầu tiên', titleLevel: 2 },
    style: { padding: { t: 0, r: 0, b: 0, l: 0 }, gap: 16, borderStyle: 'none' },
    children: [
      text('Dẫn nhập', '<p>Với <em>Minimal API</em> của ASP.NET Core, chỉ cần vài dòng để có một endpoint trả về danh sách sách dạng JSON:</p>'),
      codeExample,
      callout('example', 'Thử ngay', '<p>Chạy lệnh <code>dotnet run</code>, sau đó mở trình duyệt tới <code>http://localhost:5000/api/books</code> để xem kết quả JSON.</p>'),
    ],
  });
  delete section3.style.bg;

  const practice = createColumns(2);
  practice.children![0].children = [
    callout('exercise', 'Bài tập', '<ol><li><p>Thêm endpoint <code>GET /api/books/{id}</code> trả về một cuốn sách.</p></li><li><p>Trả về mã 404 khi không tìm thấy.</p></li><li><p>Kiểm tra bằng Postman và chụp màn hình kết quả.</p></li></ol>'),
  ];
  practice.children![1].children = [
    callout('check', 'Kiểm tra nhanh', '<p><strong>Câu hỏi:</strong> Phương thức nào dùng để tạo mới dữ liệu?</p><ol type="A"><li><p>GET</p></li><li><p>POST</p></li><li><p>DELETE</p></li></ol><p><em>Đáp án: B. POST gửi dữ liệu mới trong phần body của request.</em></p>'),
  ];

  const checklist = createNode('checklist', {
    name: 'Việc cần làm',
    props: {
      items: [
        { id: 'c1', text: 'Đọc lại mục 1 và 2 của bài', checked: true },
        { id: 'c2', text: 'Hoàn thành bài tập thực hành', checked: false },
        { id: 'c3', text: 'Nộp ảnh chụp kết quả trên Canvas trước buổi học sau', checked: false },
      ],
    },
  });

  p.nodes = [
    hero,
    objectives,
    section1,
    section2,
    section3,
    createNode('divider', { style: { margin: { t: 4, r: 0, b: 4, l: 0 } } }),
    practice,
    callout('summary', 'Tóm tắt', '<ul><li><p>Web API trao đổi dữ liệu qua HTTP, thường ở dạng JSON.</p></li><li><p>Mỗi phương thức HTTP có một mục đích riêng.</p></li><li><p>ASP.NET Core Minimal API giúp tạo endpoint nhanh với ít mã.</p></li></ul>'),
    createNode('container', {
      name: 'Việc cần làm',
      props: { showTitle: true, title: 'Trước buổi học sau', titleLevel: 3 },
      style: { bg: '#f8fafc', borderStyle: 'solid', borderWidth: 1, borderColor: '#dbe3ec', radius: { tl: 8, tr: 8, br: 8, bl: 8 }, padding: { t: 20, r: 24, b: 20, l: 24 }, gap: 12 },
      children: [checklist],
    }),
    callout('resources', 'Tài liệu tham khảo', '<ul><li><p><a href="https://learn.microsoft.com/aspnet/core/fundamentals/minimal-apis" target="_blank" rel="noopener noreferrer">Microsoft Learn: Minimal APIs</a></p></li><li><p><a href="https://developer.mozilla.org/vi/docs/Web/HTTP/Methods" target="_blank" rel="noopener noreferrer">MDN: HTTP request methods</a></p></li></ul>'),
  ];
  return p;
}

export function loadSampleProject() {
  useEditor.getState().loadProject(buildSampleProject());
}

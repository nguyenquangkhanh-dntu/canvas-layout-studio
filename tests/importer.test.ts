import { describe, expect, it } from 'vitest';
import { convertHtmlBlock, formatHtml, importCanvasHtml, isDataTable, styleFromCss } from '../src/services/html-importer';
import { exportProject } from '../src/services/html-exporter';
import { checkCanvasHtml } from '../src/services/html-checker';
import { sanitizeBlockHtml, sanitizeBlockStyle } from '../src/services/block-sanitizer';
import { buildOverviewProject } from '../src/samples/overview-project';
import { buildSampleProject } from '../src/samples/sample-project';
import { createNode } from '../src/modules/registry';
import type { LayoutNode } from '../src/models/node';
import { projectWith } from './helpers';

const types = (nodes: LayoutNode[]): string[] => nodes.map((n) => n.type);
const all = (nodes: LayoutNode[]): LayoutNode[] => nodes.flatMap((n) => [n, ...all(n.children ?? [])]);

/** HTML kiểu Canvas: dán từ Word, đoạn trống, span lồng, bảng dàn trang, ảnh trong Files. */
const MESSY = `
<p><span style="font-size: 18pt;"><strong>Bài 3: Controller và routing</strong></span></p>
<p>&nbsp;</p>
<p class="MsoNormal" style="mso-line-height-alt: 12pt; margin: 0cm;"><span style="font-family: 'Times New Roman';"><span>Sau bài này sinh viên có thể</span></span> <a href="javascript:alert(1)">xem</a>.</p>
<h2>Mục tiêu</h2>
<ul><li>Hiểu attribute routing</li><li>Dùng model binding</li></ul>
<div style="background-color: #eef5fb; border-left: 4px solid #1f5f8b; padding: 16px;">
  <h3>Lưu ý</h3><p>Nộp bài trước <strong>Chủ nhật</strong>.</p>
</div>
<table style="width: 100%;"><thead><tr><th>Tuần</th><th>Nội dung</th><th>Hạn nộp</th></tr></thead>
<tbody><tr><td>3</td><td><a href="/courses/1/pages/lab-3">Lab 3</a></td><td>22/11</td></tr><tr><td>4</td><td>Lab 4<br>CRUD</td><td>25/11</td></tr></tbody></table>
<table><tr><td width="200"><img src="/courses/1234/files/5678/preview" alt="Sơ đồ routing"></td><td><p>Request đi qua middleware.</p><p>Rồi tới controller.</p></td></tr></table>
<p><iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ" title="Video bài 3"></iframe></p>
<script>alert('x')</script>
<pre><code class="language-csharp">app.MapGet("/", () =&gt; "Hi");</code></pre>
<hr>
<p><a href="https://example.edu" style="display: inline-block; background-color: #1f5f8b; color: #ffffff; padding: 10px 18px;">Mở tài liệu</a></p>
<dl><dt>API</dt><dd>Giao diện lập trình</dd></dl>
`;

describe('Nhập HTML từ Canvas: trang soạn tay', () => {
  const res = importCanvasHtml(MESSY, { mode: 'modules', cleanup: true });
  const flat = all(res.nodes);

  it('đoán đúng cấu trúc và thứ tự module', () => {
    expect(types(res.nodes)).toEqual(['heading', 'text', 'heading', 'text', 'container', 'table', 'html', 'video', 'code', 'divider', 'button', 'html']);
    expect(res.nodes[0].props).toMatchObject({ text: 'Bài 3: Controller và routing', level: 2 });
    expect(res.title).toBe('Bài 3: Controller và routing');
  });

  it('dọn mã thừa của Word, bỏ đoạn trống, span lồng, font và script', () => {
    const html = String(res.nodes[1].props.html);
    expect(html).toContain('Sau bài này sinh viên có thể');
    expect(html).not.toMatch(/Mso|mso-|Times New Roman|&nbsp;|javascript:/);
    expect(res.report.cleaned.emptyParagraphs).toBeGreaterThan(0);
    expect(res.report.cleaned.spans).toBeGreaterThan(0);
    expect(res.report.warnings.join('\n')).toMatch(/javascript:/);
    expect(res.report.warnings.join('\n')).toMatch(/Times New Roman/);
    expect(JSON.stringify(res.nodes)).not.toMatch(/<script|alert\('x'\)/);
  });

  it('khối có nền và vạch trái thành Container giữ style', () => {
    const box = res.nodes[4];
    expect(box.style).toMatchObject({ bg: '#eef5fb', borderLeftWidth: 4, borderLeftColor: '#1f5f8b', padding: { t: 16, r: 16, b: 16, l: 16 } });
    expect(types(box.children!)).toEqual(['heading', 'text']);
  });

  it('bảng dữ liệu thành module Bảng, giữ tiêu đề, xuống dòng và liên kết', () => {
    const t = res.nodes[5];
    expect(t.props.header).toBe(true);
    const rows = t.props.rows as unknown as { text: string; url: string }[][];
    expect(rows[0].map((c) => c.text)).toEqual(['Tuần', 'Nội dung', 'Hạn nộp']);
    expect(rows[1][1]).toEqual({ text: 'Lab 3', url: '/courses/1/pages/lab-3' });
    expect(rows[2][1].text).toBe('Lab 4\nCRUD');
  });

  it('bảng dàn trang giữ nguyên thành Khối HTML, có lý do trong báo cáo', () => {
    expect(String(res.nodes[6].props.html)).toContain('/courses/1234/files/5678/preview');
    expect(res.report.htmlBlocks).toContain('Bố cục nhiều cột dựng bằng bảng dàn trang');
    expect(res.report.htmlBlocks.some((r) => r.includes('<dl>'))).toBe(true);
  });

  it('video YouTube, code, nút bấm được nhận diện', () => {
    expect(res.nodes[7].props.url).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(res.nodes[8].props).toMatchObject({ language: 'CSHARP', code: 'app.MapGet("/", () => "Hi");' });
    expect(res.nodes[10].props).toMatchObject({ label: 'Mở tài liệu', href: 'https://example.edu' });
    expect(res.nodes[10].style.bg).toBe('#1f5f8b');
  });

  it('"Thử chuyển thành module": bảng dàn trang thành 2 cột Ảnh và Đoạn văn', () => {
    const r = convertHtmlBlock(String(res.nodes[6].props.html));
    expect(types(r.nodes)).toEqual(['columns']);
    const [c1, c2] = r.nodes[0].children!;
    expect(types(c1.children!)).toEqual(['image']);
    expect(c1.children![0].props).toMatchObject({ src: '/courses/1234/files/5678/preview', alt: 'Sơ đồ routing' });
    expect(types(c2.children!)).toEqual(['text']);
    expect(r.report.warnings.join(' ')).toMatch(/Files của Canvas/);
  });

  it('báo cáo đếm module theo loại', () => {
    const m = new Map(res.report.counts);
    expect(m.get('Bảng')).toBe(1);
    expect(m.get('Khối HTML')).toBe(2);
    expect(res.report.modules).toBe(flat.length - 2);
  });

  it('chế độ giữ nguyên: một Khối HTML đã lọc an toàn', () => {
    const r = importCanvasHtml(MESSY, { mode: 'raw', cleanup: false });
    expect(types(r.nodes)).toEqual(['html']);
    expect(String(r.nodes[0].props.html)).not.toMatch(/<script|javascript:/);
  });
});

describe('Nhập lại trang do công cụ xuất ra (class đánh dấu)', () => {
  it('bản xuất Canvas có class cls-m-* và vẫn qua bộ kiểm tra Canvas', () => {
    const html = exportProject(buildSampleProject(), { mode: 'canvas' }).body;
    expect(html).toContain('class="cls-m-heading"');
    expect(html).toMatch(/class="cls-m-callout cls-v-\w+"/);
    expect(checkCanvasHtml(html).filter((f) => f.level === 'error')).toEqual([]);
  });

  it('dựng lại đúng loại module, cột, callout và chương trình học', () => {
    const p = buildOverviewProject();
    const html = exportProject(p, { mode: 'canvas', today: '2026-10-28' }).body;
    const r = importCanvasHtml(html, { mode: 'modules', cleanup: true });
    expect(types(r.nodes)).toEqual(types(p.nodes));
    const cols = r.nodes[1];
    expect(cols.props.ratios).toEqual([3, 1]);
    expect(types(cols.children![0].children!)).toEqual(['heading', 'curriculum']);
    expect(types(cols.children![1].children!)).toEqual(['schedule', 'progress']);
    expect(cols.children![1].children![0].props.size).toBe('mini');
    const cur = cols.children![0].children![1].props as Record<string, unknown>;
    expect((cur.cols as { title: string }[]).length).toBe(7);
    expect((cur.cells as { text: string; em: boolean }[][])[5][2]).toMatchObject({ text: 'NGHIỆM THU Checkpoint 1', em: true });
    expect(r.report.exact).toBeGreaterThan(5);
    expect(r.report.htmlBlocks).toEqual([]);
  });

  it('bài học mẫu nhập lại không sinh Khối HTML nào', () => {
    const p = buildSampleProject();
    const r = importCanvasHtml(exportProject(p, { mode: 'canvas' }).body, { mode: 'modules', cleanup: true });
    expect(r.report.htmlBlocks).toEqual([]);
    expect(all(r.nodes).filter((n) => n.type === 'callout').length).toBe(all(p.nodes).filter((n) => n.type === 'callout').length);
  });
});

describe('Module Bảng và Khối HTML', () => {
  it('Bảng xuất Canvas sạch, có th scope và liên kết', () => {
    const t = createNode('table', { props: { rows: [[{ text: 'A', url: '' }, { text: 'B', url: '' }], [{ text: '1', url: 'https://x.vn' }, { text: '2\n3', url: '' }]] } });
    const html = exportProject(projectWith([t]), { mode: 'canvas' }).body;
    expect(html).toContain('<th scope="col"');
    expect(html).toContain('href="https://x.vn"');
    expect(html).toMatch(/2\s*<br>3/);
    expect(checkCanvasHtml(html).filter((f) => f.level !== 'info')).toEqual([]);
  });

  it('Khối HTML: lọc script, on*, javascript:, CSS nguy hiểm; đổi section sang div cho Canvas', () => {
    const dirty = '<section style="position: fixed; color: red; background-image: url(javascript:x)"><p onclick="x()">Hi <a href="javascript:alert(1)">a</a></p><script>x</script><img src="x" onerror="alert(1)"></section>';
    const clean = sanitizeBlockHtml(dirty, { forCanvas: true });
    expect(clean).not.toMatch(/script|onclick|onerror|javascript|fixed/);
    expect(clean).toMatch(/^<div style="color: red">/);
    const node = createNode('html', { props: { html: dirty } });
    const out = exportProject(projectWith([node]), { mode: 'canvas' }).body;
    expect(out).not.toMatch(/script|onclick|javascript/);
    expect(checkCanvasHtml(out).filter((f) => f.level === 'error')).toEqual([]);
  });

  it('CSS của Khối HTML chỉ giữ thuộc tính Canvas, url() chỉ https', () => {
    expect(sanitizeBlockStyle('color: #333; behavior: url(x.htc); opacity: .5; background: url(https://a.vn/b.png) no-repeat')).toBe('color: #333; background: url(https://a.vn/b.png) no-repeat');
    expect(sanitizeBlockStyle('background: url(data:image/png;base64,AA)')).toBe('');
  });

  it('nhận diện bảng dữ liệu và bảng có ô gộp', () => {
    const d = new DOMParser().parseFromString('<table><tr><td colspan="2">x</td></tr></table><table><tr><td><b>a</b></td></tr></table>', 'text/html');
    const [a, b] = [...d.querySelectorAll('table')] as HTMLTableElement[];
    expect(isDataTable(a)).toBe(false);
    expect(isDataTable(b)).toBe(true);
  });

  it('đọc style nội tuyến thành thuộc tính khối', () => {
    expect(styleFromCss('border: 1px dashed #ccc; border-radius: 8px; padding: 10px 20px; text-align: center')).toEqual({
      borderStyle: 'dashed', borderWidth: 1, borderColor: '#ccc', radius: { tl: 8, tr: 8, br: 8, bl: 8 }, padding: { t: 10, r: 20, b: 10, l: 20 }, textAlign: 'center',
    });
  });

  it('định dạng lại mã HTML', () => {
    expect(formatHtml('<div><p>a <b>b</b></p><ul><li>x</li></ul></div>')).toBe('<div>\n  <p>a <b>b</b></p>\n  <ul>\n    <li>x</li>\n  </ul>\n</div>');
  });
});

describe('Heading có liên kết (1.2.1)', () => {
  it('xuất Canvas: cả dòng tiêu đề là liên kết, giữ màu tiêu đề, cách mở theo loại trang', () => {
    const inner = createNode('heading', { props: { text: 'Buổi 3: Controller', level: 2, href: '/courses/1234/pages/buoi-03' } });
    const outer = createNode('heading', { props: { text: 'Tài liệu Microsoft', level: 3, href: 'https://learn.microsoft.com', underline: false } });
    const html = exportProject(projectWith([inner, outer]), { mode: 'canvas' }).body;
    expect(html).toMatch(/<h2[^>]*>\s*<a href="\/courses\/1234\/pages\/buoi-03" style="color: inherit; text-decoration: underline">Buổi 3: Controller<\/a>/);
    expect(html).toMatch(/<a href="https:\/\/learn\.microsoft\.com" target="_blank" style="color: inherit; text-decoration: none">Tài liệu Microsoft<\/a>/);
    expect(checkCanvasHtml(html).filter((f) => f.level !== 'info')).toEqual([]);
  });

  it('liên kết không an toàn không được xuất', () => {
    const h = createNode('heading', { props: { text: 'X', href: 'javascript:alert(1)' } });
    const html = exportProject(projectWith([h]), { mode: 'canvas' }).body;
    expect(html).not.toMatch(/<a|javascript/);
  });

  it('nhập lại giữ liên kết của tiêu đề', () => {
    const h = createNode('heading', { props: { text: 'Buổi 3: Controller', level: 2, href: 'https://x.vn/a', target: 'same', underline: false } });
    const html = exportProject(projectWith([h]), { mode: 'canvas' }).body;
    const r = importCanvasHtml(html, { mode: 'modules', cleanup: true });
    expect(r.nodes[0].props).toMatchObject({ text: 'Buổi 3: Controller', href: 'https://x.vn/a', target: 'same', underline: false });
    const r2 = importCanvasHtml('<h2><a href="/courses/1/pages/p">Trang A</a></h2><h3>Có <a href="/x">một phần</a> liên kết</h3>', { mode: 'modules', cleanup: true });
    expect(r2.nodes[0].props).toMatchObject({ text: 'Trang A', href: '/courses/1/pages/p', target: 'auto', underline: true });
    expect(r2.nodes[1].props.href).toBe('');
  });
});

describe('Tùy chọn gạch chân liên kết (1.2.2)', () => {
  const rt = (props: Record<string, unknown>) => createNode('text', { props: { html: '<p>Xem <a href="https://x.vn" target="_blank">tài liệu</a></p>', ...props } as never });

  it('Rich Text: mặc định gạch chân, màu nhấn; tắt gạch chân và giữ màu chữ khi chọn', () => {
    const def = exportProject(projectWith([rt({})]), { mode: 'canvas' }).body;
    expect(def).toMatch(/<a href="https:\/\/x\.vn" target="_blank" style="color: #[0-9a-f]{6}; text-decoration: underline">/);
    const plain = exportProject(projectWith([rt({ linkUnderline: false, linkColor: 'inherit' })]), { mode: 'canvas' }).body;
    expect(plain).toContain('style="color: inherit; text-decoration: none"');
    const sa = exportProject(projectWith([rt({ linkUnderline: false })]), { mode: 'standalone' });
    expect(sa.css).toContain('--cls-lu: none');
    expect(sa.css).toMatch(/\.cls-rt a \{ color: var\(--cls-lc, #[0-9a-f]{6}\); text-decoration: var\(--cls-lu, underline\)/);
  });

  it('Bảng, Chương trình học, Lịch học, Video: liên kết không gạch chân khi tắt', () => {
    const t = createNode('table', { props: { linkUnderline: false, rows: [[{ text: 'A', url: 'https://a.vn' }]] , header: false } as never });
    const v = createNode('video', { props: { url: 'https://example.com/v.mp4', linkUnderline: false } as never });
    const html = exportProject(projectWith([t, v]), { mode: 'canvas' }).body;
    expect(html.match(/text-decoration: none/g)?.length).toBe(2);
    const p = buildOverviewProject();
    const walk = (ns: LayoutNode[]) => ns.forEach((n) => { if (n.type === 'curriculum' || n.type === 'schedule') n.props.linkUnderline = false; walk(n.children ?? []); });
    walk(p.nodes);
    const ov = exportProject(p, { mode: 'canvas', today: '2026-10-28' }).body;
    expect(ov).not.toMatch(/<a [^>]*style="[^"]*text-decoration: underline/);
  });

  it('nhập từ Canvas giữ lựa chọn không gạch chân thành tùy chọn của khối', () => {
    const r = importCanvasHtml('<p><a href="/a" style="text-decoration: none; color: inherit;">01 - Kỹ năng gõ phím</a></p><table><tr><td><a href="/b" style="text-decoration: none">Lab</a></td></tr></table>', { mode: 'modules', cleanup: true });
    expect(r.nodes[0].props).toMatchObject({ linkUnderline: false, linkColor: 'inherit' });
    expect(String(r.nodes[0].props.html)).toBe('<p><a href="/a">01 - Kỹ năng gõ phím</a></p>');
    expect(r.nodes[1].props.linkUnderline).toBe(false);
    // Xuất lại rồi nhập lại vẫn giữ.
    const again = importCanvasHtml(exportProject(projectWith(r.nodes), { mode: 'canvas' }).body, { mode: 'modules', cleanup: true });
    expect(again.nodes[0].props).toMatchObject({ linkUnderline: false, linkColor: 'inherit' });
  });
});

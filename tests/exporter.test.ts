import { describe, expect, it } from 'vitest';
import { exportProject } from '../src/services/html-exporter';
import { checkCanvasHtml } from '../src/services/html-checker';
import { createColumns, createNode } from '../src/modules/registry';
import { LIBRARY } from '../src/modules/library';
import { projectWith } from './helpers';

const PNG_DATA = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

describe('Xuất HTML cho Canvas (inline)', () => {
  it('chỉ dùng thẻ và CSS Canvas cho phép với toàn bộ thư viện module', () => {
    const nodes = LIBRARY.map((e) => e.create());
    const res = exportProject(projectWith(nodes), { mode: 'canvas' });
    expect(res.css).toBe('');
    expect(res.body).not.toMatch(/<script|<style|<section|<button|<svg/);
    const findings = checkCanvasHtml(res.body).filter((f) => f.level !== 'info');
    expect(findings).toEqual([]);
  });

  it('giữ border-radius 0 px và bo góc riêng từng góc', () => {
    const a = createNode('container', { style: { radius: { tl: 0, tr: 0, br: 0, bl: 0 } } });
    const b = createNode('container', { style: { radius: { tl: 4, tr: 16, br: 0, bl: 8 } } });
    const html = exportProject(projectWith([a, b]), { mode: 'canvas' }).body;
    expect(html).toContain('border-radius: 0px');
    expect(html).toContain('border-radius: 4px 16px 0px 8px');
  });

  it('bỏ box-shadow, cảnh báo và có thể thay bằng viền', () => {
    const c = createNode('container', { style: { borderStyle: undefined, shadow: { preset: 'md', x: 0, y: 6, blur: 16, spread: -2, color: 'rgba(0,0,0,0.2)' } } });
    delete c.style.borderStyle;
    const plain = exportProject(projectWith([c]), { mode: 'canvas' });
    expect(plain.body).not.toContain('box-shadow');
    expect(plain.issues.some((i) => i.code === 'css:box-shadow')).toBe(true);
    const fallback = exportProject(projectWith([c]), { mode: 'canvas', shadowFallback: true });
    expect(fallback.body).toContain('border: 1px solid #dbe1e8');
  });

  it('chuyển font-weight sang thuộc tính rút gọn font', () => {
    const h = createNode('heading', { style: { fontWeight: 400 } });
    const html = exportProject(projectWith([h]), { mode: 'canvas' }).body;
    expect(html).not.toContain('font-weight');
    expect(html).toMatch(/font: 400 28px\/1\.3 &quot;Segoe UI&quot;/);
  });

  it('không xuất module ẩn và tên nội bộ', () => {
    const visible = createNode('heading', { name: 'TEN_NOI_BO_A', props: { text: 'Hiện' } });
    const hidden = createNode('heading', { name: 'TEN_NOI_BO_B', props: { text: 'Ẩn đi' } });
    hidden.hidden = true;
    const html = exportProject(projectWith([visible, hidden]), { mode: 'canvas' }).body;
    expect(html).toContain('Hiện');
    expect(html).not.toContain('Ẩn đi');
    expect(html).not.toContain('TEN_NOI_BO');
    expect(html).not.toContain(visible.id);
  });

  it('báo lỗi ảnh base64 vì Canvas sẽ xóa', () => {
    const img = createNode('image', { props: { src: PNG_DATA, alt: 'x' } });
    const res = exportProject(projectWith([img]), { mode: 'canvas' });
    expect(res.issues.find((i) => i.code === 'canvas-data-image')?.level).toBe('error');
    expect(checkCanvasHtml(res.body).some((f) => f.level === 'error')).toBe(true);
  });

  it('viết style inline cho đoạn văn và danh sách trong Rich Text', () => {
    const t = createNode('text', { props: { html: '<p>A</p><ul><li><p>B</p></li></ul><p>C <s>gạch</s></p>' }, style: { paragraphSpacing: 14 } });
    const html = exportProject(projectWith([t]), { mode: 'canvas' }).body;
    expect(html).toContain('<p style="margin: 0 0 14px 0">A</p>');
    expect(html).toContain('<li style="margin: 0 0 4px"><p style="margin: 0">B</p></li>');
    expect(html).toContain('<del>gạch</del>');
    expect(html).toMatch(/<p style="margin: 0 0 0 0">C/);
  });

  it('không xuất nút sao chép code trong chế độ Canvas', () => {
    const code = createNode('code');
    const res = exportProject(projectWith([code]), { mode: 'canvas' });
    expect(res.body).not.toContain('Sao chép');
    expect(res.body).toContain('<pre');
  });
});

describe('Xuất HTML độc lập', () => {
  it('tạo tài liệu đầy đủ với CSS có phạm vi riêng', () => {
    const res = exportProject(projectWith([createNode('container'), createColumns(3)]), { mode: 'standalone' });
    expect(res.document).toMatch(/^<!doctype html>/);
    expect(res.document).toContain('<meta name="viewport"');
    expect(res.css).toContain('.cls-layout-root .c1 {');
    for (const line of res.css.split('\n').filter((l) => l.includes('{'))) {
      expect(line.trim().startsWith('.cls-layout-root')).toBe(true);
    }
    expect(res.body).not.toContain('style=');
  });

  it('có nút và script sao chép code khi bật', () => {
    const res = exportProject(projectWith([createNode('code')]), { mode: 'standalone' });
    expect(res.hasScript).toBe(true);
    expect(res.document).toContain('data-cls-copy');
    expect(res.document).toContain('navigator.clipboard');
  });

  it('PNG: không có nút và script', () => {
    const res = exportProject(projectWith([createNode('code')]), { mode: 'png', scope: 'cls-png-x' });
    expect(res.body).not.toContain('<button');
    expect(res.css.split('\n').every((l) => !l.includes('{') || l.startsWith('.cls-png-x'))).toBe(true);
  });
});

describe('An toàn', () => {
  it('loại bỏ script, sự kiện và javascript: trong Rich Text', () => {
    const t = createNode('text', {
      props: { html: '<p onclick="alert(1)">Xin chào<script>alert(2)</script><a href="javascript:alert(3)">x</a><img src=x onerror=alert(4)></p>' },
    });
    for (const mode of ['canvas', 'standalone'] as const) {
      const res = exportProject(projectWith([t]), { mode });
      const out = mode === 'canvas' ? res.body : res.document;
      expect(out).not.toMatch(/alert|onerror|onclick|javascript:/);
    }
  });

  it('không cho chèn CSS qua giá trị màu', () => {
    const c = createNode('container', { style: { bg: 'red; background-image: url(javascript:alert(1))' } });
    const html = exportProject(projectWith([c]), { mode: 'canvas' }).body;
    expect(html).not.toContain('javascript');
    expect(html).not.toContain('background-image');
  });

  it('nút liên kết bỏ href nguy hiểm', () => {
    const b = createNode('button', { props: { href: 'javascript:alert(1)', label: 'Bấm' } });
    const html = exportProject(projectWith([b]), { mode: 'canvas' }).body;
    expect(html).toContain('href="#"');
  });
});

describe('Khoảng trắng trong code', () => {
  it('không thêm xuống dòng hay thụt lề bên trong <pre>', () => {
    const code = createNode('code', { props: { code: 'GET /a\n  b', title: '', language: '', showCopy: false } });
    for (const mode of ['canvas', 'standalone'] as const) {
      const body = exportProject(projectWith([code]), { mode }).body;
      expect(body).toMatch(/<pre[^>]*><code[^>]*>GET \/a\n  b<\/code><\/pre>/);
    }
  });
});

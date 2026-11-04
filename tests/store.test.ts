import { beforeEach, describe, expect, it } from 'vitest';
import { resetEditorForTests, useEditor } from '../src/editor/store';
import { createColumns, createNode } from '../src/modules/registry';
import { findNode } from '../src/editor/tree';

const S = () => useEditor.getState();

beforeEach(() => resetEditorForTests());

describe('Thêm, xóa, nhân bản (Test A)', () => {
  it('thêm container, heading, text, image và đồng bộ chỉ mục', () => {
    const c = createNode('container');
    S().addNode(c);
    expect(S().selectedId).toBe(c.id);
    // Đang chọn container -> module tiếp theo được thêm vào bên trong.
    S().addNode(createNode('heading'));
    S().select(c.id);
    S().addNode(createNode('text'));
    S().addNode(createNode('image'));
    const cont = findNode(S().project.nodes, c.id)!;
    expect(cont.children!.map((n) => n.type)).toEqual(['heading', 'text', 'image']);
    expect(S().index.size).toBe(4);
  });

  it('xóa và nhân bản', () => {
    const h = createNode('heading', { props: { text: 'A' } });
    S().addNode(h);
    const copyId = S().duplicateNode(h.id)!;
    expect(S().project.nodes.map((n) => n.id)).toEqual([h.id, copyId]);
    expect(S().project.nodes[1].props.text).toBe('A');
    S().removeNode(h.id);
    expect(S().project.nodes.map((n) => n.id)).toEqual([copyId]);
    expect(S().index.has(h.id)).toBe(false);
  });

  it('không xóa module bị khóa', () => {
    const h = createNode('heading');
    S().addNode(h);
    S().toggleLocked(h.id);
    expect(S().removeNode(h.id)).toBe(false);
    S().updateProps(h.id, { text: 'Đổi' });
    expect(S().project.nodes[0].props.text).toBe('Tiêu đề');
  });
});

describe('Kéo thả: quy tắc thả (Test D)', () => {
  it('di chuyển vào container, giữa các cột và chặn vị trí sai', () => {
    const cols = createColumns(2);
    const c = createNode('container');
    const t = createNode('text');
    S().insertNode(cols, null, 0);
    S().insertNode(c, null, 1);
    S().insertNode(t, null, 2);
    const [col1, col2] = cols.children!;
    expect(S().moveNode(t.id, c.id, 0).ok).toBe(true);
    expect(findNode(S().project.nodes, c.id)!.children![0].id).toBe(t.id);
    expect(S().moveNode(t.id, col1.id, 0).ok).toBe(true);
    expect(S().moveNode(t.id, col2.id, 0).ok).toBe(true);
    expect(findNode(S().project.nodes, col2.id)!.children!.map((n) => n.id)).toEqual([t.id]);
    // Không thả trực tiếp vào Columns, không thả container vào chính nó.
    expect(S().moveNode(t.id, cols.id, 0).ok).toBe(false);
    expect(S().moveNode(c.id, c.id, 0).ok).toBe(false);
    // Cột không di chuyển riêng lẻ.
    expect(S().moveNode(col1.id, null, 0).ok).toBe(false);
    // Không mất dữ liệu sau chuỗi thao tác.
    expect(S().index.size).toBe(5);
  });

  it('sắp xếp lại thứ tự trong cùng danh sách', () => {
    const a = createNode('heading', { props: { text: 'A' } });
    const b = createNode('heading', { props: { text: 'B' } });
    const c = createNode('heading', { props: { text: 'C' } });
    [a, b, c].forEach((n, i) => S().insertNode(n, null, i));
    S().moveNode(a.id, null, 3);
    expect(S().project.nodes.map((n) => n.props.text)).toEqual(['B', 'C', 'A']);
    S().moveBy(a.id, -1);
    expect(S().project.nodes.map((n) => n.props.text)).toEqual(['B', 'A', 'C']);
  });
});

describe('Undo / Redo (Test F)', () => {
  it('hoàn tác và làm lại từng thao tác theo đúng thứ tự', () => {
    const a = createNode('container');
    const b = createNode('heading');
    S().insertNode(a, null, 0); // 1
    S().insertNode(b, null, 1); // 2
    S().updateStyle(a.id, { bg: '#ff0000' }); // 3
    S().moveNode(b.id, null, 0); // 4
    S().removeNode(a.id); // 5
    expect(S().project.nodes.map((n) => n.id)).toEqual([b.id]);
    S().undo();
    expect(S().project.nodes.map((n) => n.id)).toEqual([b.id, a.id]);
    expect(S().project.nodes[1].style.bg).toBe('#ff0000');
    S().undo();
    expect(S().project.nodes.map((n) => n.id)).toEqual([a.id, b.id]);
    S().undo();
    expect(S().project.nodes[0].style.bg).toBe('#ffffff');
    S().redo();
    expect(S().project.nodes[0].style.bg).toBe('#ff0000');
    S().redo();
    S().redo();
    expect(S().project.nodes.map((n) => n.id)).toEqual([b.id]);
  });

  it('gộp các lần gõ liên tiếp thành một bước lịch sử', () => {
    const h = createNode('heading');
    S().insertNode(h, null, 0);
    const before = S().past.length;
    for (const text of ['X', 'Xi', 'Xin', 'Xin chào']) S().updateProps(h.id, { text }, { key: `text:${h.id}` });
    expect(S().past.length).toBe(before + 1);
    S().undo();
    expect(S().project.nodes[0].props.text).toBe('Tiêu đề');
  });
});

describe('Style (Test B)', () => {
  it('đặt và xóa thuộc tính style, radius 0 vẫn được lưu', () => {
    const c = createNode('container');
    S().addNode(c);
    S().updateStyle(c.id, { radius: { tl: 0, tr: 0, br: 0, bl: 0 }, shadow: undefined, bg: '#123456' });
    const st = S().project.nodes[0].style;
    expect(st.radius).toEqual({ tl: 0, tr: 0, br: 0, bl: 0 });
    expect(st.bg).toBe('#123456');
    S().updateStyle(c.id, { bg: undefined });
    expect('bg' in S().project.nodes[0].style).toBe(false);
  });

  it('sao chép và dán style không đụng tới kích thước', () => {
    const a = createNode('container', { style: { bg: '#111111', width: { value: 50, unit: '%' } } });
    const b = createNode('container', { style: { bg: '#eeeeee', width: { value: 300, unit: 'px' } } });
    S().insertNode(a, null, 0);
    S().insertNode(b, null, 1);
    S().copyStyle(a.id);
    S().pasteStyle(b.id);
    const nb = S().project.nodes[1];
    expect(nb.style.bg).toBe('#111111');
    expect(nb.style.width).toEqual({ value: 300, unit: 'px' });
  });

  it('áp dụng preset toàn trang không đổi nội dung', () => {
    const c = createNode('container');
    const h = createNode('heading', { props: { text: 'Giữ nguyên' }, style: { color: '#ff0000' } });
    S().insertNode(c, null, 0);
    S().insertNode(h, null, 1);
    S().applyTheme('modern', 'page');
    const p = S().project;
    expect(p.page.themeId).toBe('modern');
    expect(p.nodes[0].style.radius).toEqual({ tl: 18, tr: 18, br: 18, bl: 18 });
    expect(p.nodes[1].props.text).toBe('Giữ nguyên');
    expect(p.nodes[1].style.color).toBeUndefined();
  });
});

describe('Columns', () => {
  it('giảm số cột không làm mất nội dung', () => {
    const cols = createColumns(3);
    S().insertNode(cols, null, 0);
    const third = cols.children![2];
    const t = createNode('text');
    S().insertNode(t, third.id, 0);
    S().setColumns(cols.id, { count: 2 });
    const n = findNode(S().project.nodes, cols.id)!;
    expect(n.children!.length).toBe(2);
    expect(n.children![1].children!.map((x) => x.id)).toContain(t.id);
    S().setColumns(cols.id, { count: 4, ratios: [2, 1, 1, 1] });
    const m = findNode(S().project.nodes, cols.id)!;
    expect(m.children!.map((c) => c.props.ratio)).toEqual([2, 1, 1, 1]);
  });
});

describe('Copy / paste và mẫu', () => {
  it('dán tạo bản sao với id mới', () => {
    const c = createNode('container', { children: [createNode('heading')] });
    S().insertNode(c, null, 0);
    S().copy(c.id);
    S().select(null);
    expect(S().paste()).toBe(true);
    const [a, b] = S().project.nodes;
    expect(b.id).not.toBe(a.id);
    expect(b.children![0].id).not.toBe(a.children![0].id);
  });

  it('lưu module thành mẫu', () => {
    const c = createNode('container');
    S().insertNode(c, null, 0);
    const t = S().saveTemplate(c.id, 'Khối mẫu');
    expect(t?.name).toBe('Khối mẫu');
    expect(S().templates.length).toBe(1);
  });
});

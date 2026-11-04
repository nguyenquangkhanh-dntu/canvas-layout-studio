import { describe, expect, it } from 'vitest';
import { parseProjectJson, serializeProject, validateProject, safeFileName } from '../src/services/import-export';
import { loadLastProject, loadProject, saveProject } from '../src/services/project-storage';
import { createColumns, createNode } from '../src/modules/registry';
import { projectWith } from './helpers';

describe('Nhập / xuất JSON (Test E, Test I)', () => {
  it('xuất rồi nhập lại cho kết quả giống hệt', () => {
    const p = projectWith([createNode('container', { children: [createNode('heading'), createNode('text')] }), createColumns(2)]);
    const res = parseProjectJson(serializeProject(p));
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.project.nodes).toEqual(p.nodes);
    expect(res.project.page).toEqual(p.page);
  });

  it('từ chối JSON hỏng, sai schema và phiên bản mới hơn', () => {
    expect(parseProjectJson('{oops').ok).toBe(false);
    expect(parseProjectJson('{"hello":1}').ok).toBe(false);
    expect(validateProject({ schema: 'canvas-layout-studio/project', version: 99, nodes: [] }).ok).toBe(false);
  });

  it('bỏ module không hợp lệ và làm sạch dữ liệu nguy hiểm', () => {
    const res = validateProject({
      schema: 'canvas-layout-studio/project',
      version: 1,
      nodes: [
        { id: 'a', type: 'nope', props: {}, style: {} },
        { id: 'b', type: 'column', props: {}, style: {} },
        { id: 'c', type: 'text', props: { html: '<p>Ok<script>alert(1)</script></p>' }, style: { bg: 'red;}x{', fontSize: 'big', padding: { t: 4 } } },
        { id: 'd', type: 'image', props: { src: 'javascript:alert(1)' }, style: {} },
      ],
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.project.nodes.map((n) => n.id)).toEqual(['c', 'd']);
    expect(res.project.nodes[0].props.html).toBe('<p>Ok</p>');
    expect(res.project.nodes[0].style).toEqual({ padding: { t: 4 } });
    expect(res.project.nodes[1].props.src).toBe('');
    expect(res.warnings.length).toBeGreaterThan(0);
  });

  it('tên tệp an toàn, bỏ dấu tiếng Việt', () => {
    expect(safeFileName('Bài 01: Web API đầu tiên', 'json')).toBe('bai-01-web-api-dau-tien.json');
  });
});

describe('Lưu trong trình duyệt (IndexedDB)', () => {
  it('lưu và khôi phục dự án gần nhất', async () => {
    const p = projectWith([createNode('heading', { props: { text: 'Tiếng Việt có dấu' } })]);
    await saveProject(p, 1);
    const loaded = await loadLastProject();
    expect(loaded?.id).toBe(p.id);
    expect(loaded?.nodes[0].props.text).toBe('Tiếng Việt có dấu');
    expect(await loadProject('khong-co')).toBeNull();
  });
});

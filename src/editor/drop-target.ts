import type { LayoutNode } from '../models/node';
import { getDef } from '../modules/registry';
import type { DragData, DropTarget } from './dnd-state';
import type { NodeInfo } from './store';
import { canDrop } from './tree';

/**
 * Tính vị trí thả từ tọa độ con trỏ, dựa trên DOM thực tế của trang thiết kế
 * hoặc của bảng Layers. Không phụ thuộc thư viện kéo thả.
 */

type Orientation = 'column' | 'row';

function orientationOf(node: LayoutNode | null): Orientation {
  if (!node) return 'column';
  if (node.type === 'grid') return 'row';
  if (node.type === 'container' && node.props.direction === 'row') return 'row';
  return 'column';
}

function elFor(id: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-canvas-root] [data-node-id="${CSS.escape(id)}"]`);
}

function listOf(nodes: LayoutNode[], index: Map<string, NodeInfo>, parentId: string | null): LayoutNode[] {
  if (parentId === null) return nodes;
  return index.get(parentId)?.node.children ?? [];
}

/** Vị trí chèn trong danh sách con theo tọa độ con trỏ. */
function indexByPointer(children: LayoutNode[], x: number, y: number, orient: Orientation): number {
  for (let i = 0; i < children.length; i++) {
    const el = elFor(children[i].id);
    if (!el) continue;
    const r = el.getBoundingClientRect();
    if (orient === 'column') {
      if (y < r.top + r.height / 2) return i;
    } else {
      if (y < r.top) return i;
      if (y <= r.bottom && x < r.left + r.width / 2) return i;
    }
  }
  return children.length;
}

function indicatorFor(children: LayoutNode[], index: number, orient: Orientation, containerEl: HTMLElement | null): DropTarget['indicator'] {
  const rects = children.map((c) => elFor(c.id)?.getBoundingClientRect()).filter((r): r is DOMRect => !!r);
  if (!rects.length) {
    const empty = containerEl?.querySelector<HTMLElement>(':scope > [data-empty-slot]') ?? containerEl;
    const r = (empty ?? document.body).getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height, mode: 'box' };
  }
  if (orient === 'row') {
    const ref = index < rects.length ? rects[index] : rects[rects.length - 1];
    const x = index < rects.length ? ref.left - 4 : ref.right + 2;
    return { x, y: ref.top, w: 3, h: ref.height, mode: 'line-v' };
  }
  const ref = index < rects.length ? rects[index] : rects[rects.length - 1];
  const y = index < rects.length ? ref.top - 4 : ref.bottom + 2;
  return { x: ref.left, y, w: ref.width, h: 3, mode: 'line-h' };
}

function finish(nodes: LayoutNode[], _index: Map<string, NodeInfo>, drag: DragData, parentId: string | null, at: number, indicator: DropTarget['indicator']): DropTarget {
  const check = canDrop(nodes, parentId, { type: drag.type, depth: drag.depth, id: drag.kind === 'move' ? drag.id : undefined });
  // Thả về đúng chỗ cũ: hợp lệ nhưng không làm gì.
  return { parentId, index: at, valid: check.ok, reason: check.reason, indicator };
}

export function canvasTarget(x: number, y: number, drag: DragData, nodes: LayoutNode[], index: Map<string, NodeInfo>): DropTarget | null {
  const hit = document.elementsFromPoint(x, y).find((e) => (e as HTMLElement).closest?.('[data-canvas-root]')) as HTMLElement | undefined;
  if (!hit) return null;
  const pageRoot = hit.closest<HTMLElement>('[data-canvas-root]')!;
  if (drag.kind === 'move' && hit.closest(`[data-node-id="${CSS.escape(drag.id)}"]`)) return null;

  const slot = hit.closest<HTMLElement>('[data-empty-slot], [data-node-id]');
  if (!slot) {
    const at = indexByPointer(nodes, x, y, 'column');
    return finish(nodes, index, drag, null, at, indicatorFor(nodes, at, 'column', pageRoot));
  }
  if (slot.hasAttribute('data-empty-slot')) {
    const parentId = slot.getAttribute('data-empty-slot');
    const r = slot.getBoundingClientRect();
    return finish(nodes, index, drag, parentId === '__root__' ? null : parentId, 0, { x: r.left, y: r.top, w: r.width, h: r.height, mode: 'box' });
  }

  const id = slot.getAttribute('data-node-id')!;
  const info = index.get(id);
  if (!info) return null;
  const node = info.node;
  const def = getDef(node.type);
  const r = slot.getBoundingClientRect();
  const parent = info.parentId ? index.get(info.parentId)?.node ?? null : null;
  const parentOrient = orientationOf(parent);

  const canInside = def.isContainer && !node.locked && node.type !== 'columns';
  if (canInside) {
    const band = node.type === 'column' ? 0 : Math.min(14, r.height * 0.2);
    const inside = y >= r.top + band && y <= r.bottom - band;
    if (inside) {
      const kids = node.children ?? [];
      const orient = orientationOf(node);
      const at = indexByPointer(kids, x, y, orient);
      return finish(nodes, index, drag, node.id, at, indicatorFor(kids, at, orient, slot));
    }
  }
  // Trước hoặc sau module dưới con trỏ.
  if (node.type === 'column') return null;
  const after = parentOrient === 'row' ? x > r.left + r.width / 2 : y > r.top + r.height / 2;
  const siblings = listOf(nodes, index, info.parentId);
  const at = info.index + (after ? 1 : 0);
  const parentEl = info.parentId ? elFor(info.parentId) : pageRoot;
  return finish(nodes, index, drag, info.parentId, at, indicatorFor(siblings, at, parentOrient, parentEl));
}

export function layersTarget(x: number, y: number, drag: DragData, nodes: LayoutNode[], index: Map<string, NodeInfo>): DropTarget | null {
  const hit = document.elementsFromPoint(x, y).find((e) => (e as HTMLElement).closest?.('[data-layers-root]')) as HTMLElement | undefined;
  if (!hit) return null;
  const row = hit.closest<HTMLElement>('[data-layer-id]');
  if (!row) {
    const list = hit.closest<HTMLElement>('[data-layers-root]')!;
    const r = list.getBoundingClientRect();
    const rows = list.querySelectorAll('[data-layer-id]');
    const last = rows[rows.length - 1]?.getBoundingClientRect();
    return finish(nodes, index, drag, null, nodes.length, { x: r.left + 8, y: (last?.bottom ?? r.top) + 1, w: r.width - 16, h: 2, mode: 'line-h' });
  }
  const id = row.getAttribute('data-layer-id')!;
  if (drag.kind === 'move' && (id === drag.id || isInside(index, id, drag.id))) return null;
  const info = index.get(id);
  if (!info) return null;
  const r = row.getBoundingClientRect();
  const indent = Number(row.getAttribute('data-depth') ?? 1) * 14;
  const def = getDef(info.node.type);
  const rel = (y - r.top) / r.height;
  if (def.isContainer && info.node.type !== 'columns' && !info.node.locked && (info.node.type === 'column' || (rel > 0.3 && rel < 0.7))) {
    return finish(nodes, index, drag, id, info.node.children?.length ?? 0, { x: r.left + 2, y: r.top, w: r.width - 4, h: r.height, mode: 'box' });
  }
  if (info.node.type === 'column') return null;
  const after = rel >= 0.5;
  return finish(nodes, index, drag, info.parentId, info.index + (after ? 1 : 0), {
    x: r.left + indent, y: after ? r.bottom - 1 : r.top - 1, w: r.width - indent - 4, h: 2, mode: 'line-h',
  });
}

function isInside(index: Map<string, NodeInfo>, id: string, ancestorId: string): boolean {
  let cur = index.get(id)?.parentId ?? null;
  while (cur) {
    if (cur === ancestorId) return true;
    cur = index.get(cur)?.parentId ?? null;
  }
  return false;
}

import type { LayoutNode, ModuleType } from '../models/node';
import { MAX_DEPTH, canContain, getDef } from '../modules/registry';
import { uid } from '../utils/id';

/** Các thao tác thuần trên cây module. Hàm "mutating" được dùng bên trong immer produce. */

export interface Located {
  node: LayoutNode;
  parent: LayoutNode | null;
  siblings: LayoutNode[];
  index: number;
  depth: number;
}

export function locate(nodes: LayoutNode[], id: string, parent: LayoutNode | null = null, depth = 1): Located | null {
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (n.id === id) return { node: n, parent, siblings: nodes, index: i, depth };
    if (n.children) {
      const found = locate(n.children, id, n, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

export function findNode(nodes: LayoutNode[], id: string): LayoutNode | null {
  return locate(nodes, id)?.node ?? null;
}

export function walk(nodes: LayoutNode[], fn: (n: LayoutNode, parent: LayoutNode | null, depth: number) => void, parent: LayoutNode | null = null, depth = 1) {
  for (const n of nodes) {
    fn(n, parent, depth);
    if (n.children) walk(n.children, fn, n, depth + 1);
  }
}

export function countNodes(nodes: LayoutNode[]): number {
  let c = 0;
  walk(nodes, () => c++);
  return c;
}

/** Chiều sâu lớn nhất của cây con tính từ node (node lá = 1). */
export function subtreeDepth(node: LayoutNode): number {
  if (!node.children?.length) return 1;
  return 1 + Math.max(...node.children.map(subtreeDepth));
}

export function isAncestor(nodes: LayoutNode[], ancestorId: string, id: string): boolean {
  const a = findNode(nodes, ancestorId);
  if (!a?.children) return false;
  return !!findNode(a.children, id);
}

export function childrenOf(nodes: LayoutNode[], parentId: string | null): LayoutNode[] | null {
  if (parentId === null) return nodes;
  const p = findNode(nodes, parentId);
  return p?.children ?? null;
}

export interface DropCheck {
  ok: boolean;
  reason?: string;
}

/** Kiểm tra có thể đặt một module (loại + chiều sâu cây con) vào parent hay không. */
export function canDrop(nodes: LayoutNode[], parentId: string | null, child: { type: ModuleType; depth: number; id?: string }): DropCheck {
  let parentType: ModuleType | null = null;
  let parentDepth = 0;
  if (parentId !== null) {
    const loc = locate(nodes, parentId);
    if (!loc) return { ok: false, reason: 'Không tìm thấy vị trí thả.' };
    if (loc.node.locked) return { ok: false, reason: 'Module đích đang bị khóa.' };
    if (child.id && (child.id === parentId || isAncestor(nodes, child.id, parentId))) {
      return { ok: false, reason: 'Không thể thả module vào chính nó.' };
    }
    parentType = loc.node.type;
    parentDepth = loc.depth;
  }
  if (!canContain(parentType, child.type)) {
    if (child.type === 'column') return { ok: false, reason: 'Cột chỉ nằm trong module Columns.' };
    if (parentType === 'columns') return { ok: false, reason: 'Hãy thả vào một cột của Columns.' };
    return { ok: false, reason: `${parentType ? getDef(parentType).label : 'Trang'} không chứa được module này.` };
  }
  if (parentDepth + child.depth > MAX_DEPTH) return { ok: false, reason: `Vượt quá ${MAX_DEPTH} cấp lồng nhau.` };
  return { ok: true };
}

export function insertAt(nodes: LayoutNode[], parentId: string | null, index: number, node: LayoutNode): boolean {
  const list = childrenOf(nodes, parentId);
  if (!list) return false;
  const i = Math.max(0, Math.min(index, list.length));
  list.splice(i, 0, node);
  return true;
}

export function removeById(nodes: LayoutNode[], id: string): LayoutNode | null {
  const loc = locate(nodes, id);
  if (!loc) return null;
  const [removed] = loc.siblings.splice(loc.index, 1);
  return removed;
}

/** Di chuyển node. `index` là vị trí trong danh sách đích trước khi gỡ node ra. */
export function moveTo(nodes: LayoutNode[], id: string, parentId: string | null, index: number): boolean {
  const loc = locate(nodes, id);
  if (!loc) return false;
  const sameParent = (loc.parent?.id ?? null) === parentId;
  let target = index;
  if (sameParent && loc.index < index) target -= 1;
  if (sameParent && target === loc.index) return false;
  const removed = removeById(nodes, id);
  if (!removed) return false;
  return insertAt(nodes, parentId, target, removed);
}

export function cloneWithNewIds(node: LayoutNode): LayoutNode {
  const copy: LayoutNode = JSON.parse(JSON.stringify(node));
  const reassign = (n: LayoutNode) => {
    n.id = uid();
    n.children?.forEach(reassign);
  };
  reassign(copy);
  return copy;
}

export function parentIdOf(nodes: LayoutNode[], id: string): string | null | undefined {
  const loc = locate(nodes, id);
  if (!loc) return undefined;
  return loc.parent?.id ?? null;
}

/** Danh sách id từ gốc tới node (không gồm node). */
export function ancestorsOf(nodes: LayoutNode[], id: string): LayoutNode[] {
  const path: LayoutNode[] = [];
  const dfs = (list: LayoutNode[]): boolean => {
    for (const n of list) {
      if (n.id === id) return true;
      if (n.children) {
        path.push(n);
        if (dfs(n.children)) return true;
        path.pop();
      }
    }
    return false;
  };
  return dfs(nodes) ? path : [];
}

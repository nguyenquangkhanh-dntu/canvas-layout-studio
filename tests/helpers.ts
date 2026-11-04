import type { LayoutNode } from '../src/models/node';
import { createEmptyProject, type Project } from '../src/models/project';

export function projectWith(nodes: LayoutNode[]): Project {
  const p = createEmptyProject('Kiểm thử');
  p.nodes = nodes;
  return p;
}

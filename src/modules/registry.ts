import type { LayoutNode, ModuleType, NodeProps } from '../models/node';
import type { StyleProps } from '../models/style';
import type { ModuleDef } from './types';
import { columnDef, columnsDef, containerDef, dividerDef, gridDef, spacerDef } from './defs/layout';
import { checklistDef, codeDef, headingDef, quoteDef, textDef } from './defs/text';
import { buttonDef, imageDef, videoDef } from './defs/media';
import { calloutDef } from './defs/learning';
import { scheduleDef } from './defs/schedule';
import { curriculumDef } from './defs/curriculum';
import { progressDef } from './defs/progress';
import { tableDef } from './defs/table';
import { htmlBlockDef } from './defs/htmlblock';
import { uid } from '../utils/id';

/**
 * Bảng đăng ký module. Thêm loại module mới = viết một ModuleDef và đăng ký ở đây
 * (cùng view nội dung trong components/PropertiesPanel/content).
 */
const DEFS: Record<ModuleType, ModuleDef<NodeProps>> = {
  container: containerDef as unknown as ModuleDef<NodeProps>,
  columns: columnsDef as unknown as ModuleDef<NodeProps>,
  column: columnDef as unknown as ModuleDef<NodeProps>,
  grid: gridDef as unknown as ModuleDef<NodeProps>,
  spacer: spacerDef as unknown as ModuleDef<NodeProps>,
  divider: dividerDef as unknown as ModuleDef<NodeProps>,
  heading: headingDef as unknown as ModuleDef<NodeProps>,
  text: textDef as unknown as ModuleDef<NodeProps>,
  quote: quoteDef as unknown as ModuleDef<NodeProps>,
  checklist: checklistDef as unknown as ModuleDef<NodeProps>,
  code: codeDef as unknown as ModuleDef<NodeProps>,
  image: imageDef as unknown as ModuleDef<NodeProps>,
  video: videoDef as unknown as ModuleDef<NodeProps>,
  button: buttonDef as unknown as ModuleDef<NodeProps>,
  callout: calloutDef as unknown as ModuleDef<NodeProps>,
  schedule: scheduleDef as unknown as ModuleDef<NodeProps>,
  curriculum: curriculumDef as unknown as ModuleDef<NodeProps>,
  progress: progressDef as unknown as ModuleDef<NodeProps>,
  table: tableDef as unknown as ModuleDef<NodeProps>,
  html: htmlBlockDef as unknown as ModuleDef<NodeProps>,
};

export function getDef(type: ModuleType): ModuleDef<NodeProps> {
  const def = DEFS[type];
  if (!def) throw new Error(`Loại module không xác định: ${type}`);
  return def;
}

export function hasDef(type: string): type is ModuleType {
  return Object.prototype.hasOwnProperty.call(DEFS, type);
}

/** Độ sâu lồng tối đa của cây module. */
export const MAX_DEPTH = 8;

export function canContain(parentType: ModuleType | null, childType: ModuleType): boolean {
  if (parentType === null) return childType !== 'column';
  const def = getDef(parentType);
  if (!def.isContainer) return false;
  return def.accepts ? def.accepts(childType) : true;
}

export interface CreateOptions {
  name?: string;
  props?: NodeProps;
  style?: StyleProps;
  children?: LayoutNode[];
}

export function createNode(type: ModuleType, opts: CreateOptions = {}): LayoutNode {
  const def = getDef(type);
  const node: LayoutNode = {
    id: uid(),
    type,
    name: opts.name ?? def.label,
    props: { ...def.defaultProps(), ...(opts.props ?? {}) },
    style: { ...def.defaultStyle(), ...(opts.style ?? {}) },
  };
  if (def.isContainer) node.children = opts.children ?? [];
  return node;
}

export const COLUMN_MIN_WIDTH: Record<number, number> = { 2: 260, 3: 200, 4: 160 };

export function createColumns(count: number, opts: CreateOptions = {}): LayoutNode {
  const n = Math.min(4, Math.max(2, count));
  const minColWidth = COLUMN_MIN_WIDTH[n];
  return createNode('columns', {
    name: `${n} cột`,
    ...opts,
    props: { count: n, ratios: Array(n).fill(1), minColWidth, stackOnMobile: true, valign: 'stretch', ...(opts.props ?? {}) },
    children:
      opts.children ??
      Array.from({ length: n }, (_, i) =>
        createNode('column', { name: `Cột ${i + 1}`, props: { ratio: 1, minWidth: minColWidth, stack: true } }),
      ),
  });
}

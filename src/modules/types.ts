import type { LayoutNode, ModuleType, NodeProps } from '../models/node';
import type { PageSettings } from '../models/project';
import type { CourseData } from '../models/course';
import type { StyleProps } from '../models/style';
import type { CssMap } from '../services/css';

export type RenderMode = 'editor' | 'canvas' | 'standalone' | 'png';

export type HChild = HNode | string;

/**
 * Cây HTML trung gian. Mỗi module trả về một HNode; cùng một cây được
 * chuyển thành React (trình thiết kế), HTML inline (Canvas) hoặc HTML + CSS (độc lập/PNG).
 *
 * Thẻ đặc biệt:
 *  - '#node'     : vị trí của một module con (chỉ trình thiết kế)
 *  - '#empty'    : vùng trống để thả module (chỉ trình thiết kế)
 *  - '#fragment' : chỉ xuất các phần tử con
 */
export interface HNode {
  tag: string;
  attrs?: Record<string, string>;
  style?: CssMap;
  children?: HChild[];
  /** Có trên phần tử gốc của mỗi module. */
  nodeId?: string;
  /** '#node' / '#empty': id module được tham chiếu. */
  nodeRef?: string;
  /** '#node': style bổ sung do module cha áp lên phần tử gốc của module con. */
  itemStyle?: CssMap;
  /** Văn bản thuần chỉnh sửa trực tiếp (chỉ ảnh hưởng trình thiết kế). */
  editable?: { nodeId: string; field: string; multiline?: boolean; placeholder?: string };
  /** Khối Rich Text: html đã được làm sạch khi xuất. */
  rich?: { nodeId: string; html: string; paragraphSpacing: number; link?: { underline: boolean; color: 'accent' | 'inherit' } };
  /** Khối HTML: mã HTML thô, được làm sạch theo danh sách Canvas khi hiển thị và khi xuất. */
  raw?: string;
}

export interface RenderCtx {
  mode: RenderMode;
  page: PageSettings;
  /** Dữ liệu khóa học dùng chung. */
  course: CourseData;
  /** Ngày hiện tại (YYYY-MM-DD) tại thời điểm vẽ hoặc xuất. */
  today: string;
  /** Hiển thị các module con; itemStyle được trộn vào phần tử gốc của từng con. */
  children(node: LayoutNode, itemStyle?: CssMap): HChild[];
}

export type InspectorGroup = 'layout' | 'flex' | 'typography' | 'background' | 'border' | 'shadow' | 'spacing';

export type IconName =
  | 'box' | 'section' | 'row' | 'columns2' | 'columns3' | 'columns4' | 'grid' | 'spacer' | 'divider'
  | 'heading' | 'text' | 'richtext' | 'quote' | 'callout' | 'list' | 'listOrdered' | 'checklist' | 'code'
  | 'image' | 'imageCaption' | 'video' | 'figure' | 'button' | 'target' | 'key' | 'note' | 'important'
  | 'warning' | 'example' | 'exercise' | 'question' | 'summary' | 'links' | 'column' | 'template'
  | 'calendar' | 'calendarMini' | 'curriculum' | 'progress' | 'table' | 'html';

export interface ModuleDef<P extends NodeProps = NodeProps> {
  type: ModuleType;
  label: string;
  icon: IconName;
  isContainer: boolean;
  /** Module con nào được phép thả vào (chỉ với container). */
  accepts?: (childType: ModuleType) => boolean;
  /** Có thể kéo module này đi nơi khác hay không. */
  draggable?: boolean;
  defaultProps: () => P;
  defaultStyle: () => StyleProps;
  render: (node: LayoutNode, ctx: RenderCtx) => HNode;
  groups: InspectorGroup[];
}

export function getProps<P extends NodeProps>(node: LayoutNode, def: ModuleDef<P>): P {
  return { ...def.defaultProps(), ...(node.props as Partial<P>) } as P;
}

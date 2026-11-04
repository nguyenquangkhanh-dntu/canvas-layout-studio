import { Fragment, createElement, memo, useMemo, type ReactNode } from 'react';
import { useEditor } from '../../editor/store';
import { getDef } from '../../modules/registry';
import type { HChild, HNode, RenderCtx } from '../../modules/types';
import type { PageSettings } from '../../models/project';
import { cssToReact, mergeCss, type CssMap } from '../../services/css';
import { EditableText } from './EditableText';
import { RichTextBlock } from './RichTextBlock';
import { EmptySlot } from './EmptySlot';
import { resolveMonth, shiftMonth, todayKey, type CourseData } from '../../models/course';
import { useWidgetUi } from '../../editor/widget-ui';
import { editorBlockHtml } from '../../services/block-sanitizer';

/** Xử lý nhấp chuột vào phần tương tác của tiện ích trong trình thiết kế. */
function widgetClick(nodeId: string, target: HTMLElement): boolean {
  const st = useEditor.getState();
  const node = st.index.get(nodeId)?.node;
  if (!node) return false;
  const nav = target.closest<HTMLElement>('[data-cal-nav]');
  if (nav && node.type === 'schedule') {
    const cur = resolveMonth(String(node.props.month ?? 'auto'), st.project.course, todayKey());
    const d = Number(nav.dataset.calNav);
    // Đổi tháng hiển thị là thao tác xem, gộp các lần bấm liên tiếp thành một bước lịch sử.
    st.updateProps(nodeId, { month: shiftMonth(cur, d) }, { key: `month:${nodeId}` });
    return true;
  }
  const cell = target.closest<HTMLElement>('[data-cur-r]');
  if (cell && node.type === 'curriculum') {
    useWidgetUi.getState().setCell({ nodeId, r: Number(cell.dataset.curR), c: Number(cell.dataset.curC) });
    return true;
  }
  const tcell = target.closest<HTMLElement>('[data-tb-r]');
  if (tcell && node.type === 'table') {
    useWidgetUi.getState().setCell({ nodeId, r: Number(tcell.dataset.tbR), c: Number(tcell.dataset.tbC) });
    return true;
  }
  return false;
}

function editorCtx(page: PageSettings, course: CourseData): RenderCtx {
  return {
    mode: 'editor',
    page,
    course,
    today: todayKey(),
    children(node, itemStyle) {
      const kids = node.children ?? [];
      if (!kids.length) return [{ tag: '#empty', nodeRef: node.id }];
      return kids.map((c) => ({ tag: '#node', nodeRef: c.id, itemStyle }));
    },
  };
}

interface RenderState {
  /** Module đang được chọn và có thể chỉnh sửa trực tiếp. */
  editableNodeId: string | null;
}

function attrsToProps(attrs: Record<string, string> | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!attrs) return out;
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') out.className = v;
    else if (k === 'allowfullscreen') out.allowFullScreen = true;
    else if (k === 'frameborder') out.frameBorder = v;
    else out[k] = v;
  }
  return out;
}

/** Chuyển HNode thành phần tử React trong trình thiết kế. */
export function renderH(h: HChild, key: string | number, st: RenderState, rootProps?: Record<string, unknown>): ReactNode {
  if (typeof h === 'string') return h;
  if (h.tag === '#node') return <NodeView key={h.nodeRef} id={h.nodeRef!} itemStyle={h.itemStyle} />;
  if (h.tag === '#empty') return <EmptySlot key={`empty-${h.nodeRef}`} parentId={h.nodeRef!} />;
  if (h.tag === '#fragment') return <Fragment key={key}>{(h.children ?? []).map((c, i) => renderH(c, i, st))}</Fragment>;

  const props: Record<string, unknown> = { ...attrsToProps(h.attrs), ...(rootProps ?? {}), style: cssToReact(h.style) };
  if (h.tag === 'a') props.onClick = (e: React.MouseEvent) => e.preventDefault();

  if (h.editable) {
    return (
      <EditableText
        key={key}
        tag={h.tag}
        nodeId={h.editable.nodeId}
        field={h.editable.field}
        text={(h.children ?? []).map((c) => (typeof c === 'string' ? c : '')).join('')}
        multiline={h.editable.multiline}
        placeholder={h.editable.placeholder}
        editable={st.editableNodeId === h.editable.nodeId}
        elementProps={props}
      />
    );
  }
  if (h.rich) {
    return (
      <RichTextBlock
        key={key}
        html={h.rich.html}
        paragraphSpacing={h.rich.paragraphSpacing}
        link={h.rich.link}
        nodeId={h.rich.nodeId}
        editable={st.editableNodeId === h.rich.nodeId}
        elementProps={props}
      />
    );
  }
  if (h.raw !== undefined) {
    return createElement(h.tag, {
      key, ...props,
      onClick: (e: React.MouseEvent) => { if ((e.target as HTMLElement).closest('a')) e.preventDefault(); (props.onClick as ((e: React.MouseEvent) => void) | undefined)?.(e); },
      dangerouslySetInnerHTML: { __html: editorBlockHtml(h.raw) },
    });
  }
  if (h.tag === 'img' || h.tag === 'hr' || h.tag === 'br') return createElement(h.tag, { key, ...props, draggable: false });
  return createElement(h.tag, { key, ...props }, ...(h.children ?? []).map((c, i) => renderH(c, i, st)));
}

export const NodeView = memo(function NodeView({ id, itemStyle }: { id: string; itemStyle?: CssMap }) {
  const node = useEditor((s) => s.index.get(id)?.node);
  const page = useEditor((s) => s.project.page);
  const course = useEditor((s) => s.project.course);
  const selected = useEditor((s) => s.selectedId === id);
  const hovered = useEditor((s) => s.hoveredId === id);
  const design = useEditor((s) => s.mode === 'design');

  const h: HNode | null = useMemo(() => (node ? getDef(node.type).render(node, editorCtx(page, course)) : null), [node, page, course]);
  if (!node || !h) return null;

  const root: HNode = itemStyle ? { ...h, style: mergeCss(itemStyle, h.style) } : h;
  const rootProps: Record<string, unknown> = {
    'data-node-id': node.id,
    'data-module-type': node.type,
    'data-selected': selected ? 'true' : undefined,
    'data-hover': hovered && !selected ? 'true' : undefined,
    'data-hidden': node.hidden ? 'true' : undefined,
    'data-locked': node.locked ? 'true' : undefined,
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation();
      useEditor.getState().select(node.id);
      if (node.type === 'schedule' || node.type === 'curriculum' || node.type === 'table') widgetClick(node.id, e.target as HTMLElement);
    },
    onDoubleClick: node.type === 'schedule' ? (e: React.MouseEvent) => {
      const day = (e.target as HTMLElement).closest<HTMLElement>('[data-cal-day]');
      if (!day || node.locked) return;
      e.stopPropagation();
      useWidgetUi.getState().requestNewSession(node.id, day.dataset.calDay!);
    } : undefined,
    onMouseOver: (e: React.MouseEvent) => {
      e.stopPropagation();
      useEditor.getState().hover(node.id);
    },
  };
  const st: RenderState = { editableNodeId: selected && design && !node.locked ? node.id : null };
  // Module có gốc là '#fragment' (vd. ảnh rỗng ở bản xuất) vẫn cần một phần tử để chọn được.
  if (root.tag === '#fragment') return <div {...(rootProps as object)}>{(root.children ?? []).map((c, i) => renderH(c, i, st))}</div>;
  // Ẩn mã định danh nội bộ của editable con: chỉ module đang chọn được sửa.
  return renderH(root, node.id, { editableNodeId: st.editableNodeId }, rootProps) as ReactNode;
});

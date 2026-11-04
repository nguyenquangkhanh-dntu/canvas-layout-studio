import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { ArrowDown, ArrowUp, Copy, CornerUpLeft, GripVertical, Lock, Plus, Trash2 } from 'lucide-react';
import { useEditor } from '../../editor/store';
import { useDnd, type DragData } from '../../editor/dnd-state';
import { getDef } from '../../modules/registry';
import { findEntry } from '../../modules/library';
import { subtreeDepth } from '../../editor/tree';
import { IconBtn } from '../ui/controls';
import { ModuleIcon } from '../Icon';
import { toastError } from '../ui/Toasts';
import s from './Canvas.module.css';

interface Box { top: number; left: number; width: number; height: number }

const QUICK = ['heading', 'paragraph', 'image', 'container', 'columns2', 'callout', 'bullets', 'code'];

/** Khung chọn, nhãn tên và thanh công cụ ngữ cảnh. Chỉ có trong trình thiết kế. */
export function SelectionOverlay({ wrapRef }: { wrapRef: RefObject<HTMLDivElement | null> }) {
  const selectedId = useEditor((st) => st.selectedId);
  const info = useEditor((st) => (st.selectedId ? st.index.get(st.selectedId) : undefined));
  const dragging = useDnd((st) => !!st.active);
  const [box, setBox] = useState<Box | null>(null);
  const [menu, setMenu] = useState(false);
  const raf = useRef(0);

  useLayoutEffect(() => {
    setMenu(false);
    if (!selectedId) { setBox(null); return; }
    const tick = () => {
      const wrap = wrapRef.current;
      const el = wrap?.querySelector<HTMLElement>(`[data-canvas-root] [data-node-id="${CSS.escape(selectedId)}"]`);
      if (wrap && el) {
        const w = wrap.getBoundingClientRect();
        const r = el.getBoundingClientRect();
        setBox((prev) => {
          const next = { top: r.top - w.top, left: r.left - w.left, width: r.width, height: r.height };
          return prev && prev.top === next.top && prev.left === next.left && prev.width === next.width && prev.height === next.height ? prev : next;
        });
      } else setBox(null);
      raf.current = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf.current);
  }, [selectedId, wrapRef]);

  if (!info || !box || dragging) return null;
  const node = info.node;
  const def = getDef(node.type);
  const st = useEditor.getState;
  const labelTop = box.top < 26 ? box.top + 2 : box.top - 24;
  const barTop = box.top < 34 ? box.top + 4 : box.top - 34;
  const canMove = !node.locked && def.draggable !== false;
  const isColumn = node.type === 'column';

  return (
    <div className={s.overlay} data-selection-overlay>
      <div className={s.selLabel} style={{ top: labelTop, left: box.left - 2 }}>
        <ModuleIcon name={def.icon} size={12} />
        {node.name}
        {node.locked && <Lock size={11} className={s.lock} aria-label="Đang khóa" />}
      </div>
      <div className={s.selBar} style={{ top: barTop, left: Math.max(0, box.left + box.width - 196) }} role="toolbar" aria-label="Thao tác với module">
        {canMove && <DragHandle id={node.id} />}
        <IconBtn small label="Đưa lên (Alt+↑)" disabled={!canMove || info.index === 0} onClick={() => st().moveBy(node.id, -1)}><ArrowUp size={14} /></IconBtn>
        <IconBtn small label="Đưa xuống (Alt+↓)" disabled={!canMove} onClick={() => st().moveBy(node.id, 1)}><ArrowDown size={14} /></IconBtn>
        <IconBtn small label="Chọn module cha" disabled={!info.parentId} onClick={() => info.parentId && st().select(info.parentId)}><CornerUpLeft size={14} /></IconBtn>
        <IconBtn small label="Nhân bản (Ctrl+D)" disabled={isColumn} onClick={() => st().duplicateNode(node.id)}><Copy size={14} /></IconBtn>
        <IconBtn small label="Xóa (Delete)" disabled={node.locked || isColumn} onClick={() => st().removeNode(node.id)}><Trash2 size={14} /></IconBtn>
      </div>
      {!isColumn && (
        <>
          <button
            type="button"
            className={s.quickAdd}
            style={{ top: box.top + box.height + 6, left: box.left + box.width / 2 }}
            aria-label="Thêm module ngay sau"
            title="Thêm module ngay sau"
            aria-expanded={menu}
            onClick={(e) => { e.stopPropagation(); setMenu(!menu); }}
          >
            <Plus size={14} />
          </button>
          {menu && <QuickMenu top={box.top + box.height + 22} left={box.left + box.width / 2} afterId={node.id} onClose={() => setMenu(false)} />}
        </>
      )}
    </div>
  );
}

function DragHandle({ id }: { id: string }) {
  const info = useEditor((st) => st.index.get(id));
  const data: DragData | undefined = info
    ? { kind: 'move', id, label: info.node.name, icon: getDef(info.node.type).icon, type: info.node.type, depth: subtreeDepth(info.node) }
    : undefined;
  const { attributes, listeners, setNodeRef } = useDraggable({ id: `move:${id}`, data });
  return (
    <span ref={setNodeRef} className={s.handle} {...attributes} {...listeners} aria-label="Kéo để di chuyển" title="Kéo để di chuyển" role="button">
      <GripVertical size={14} />
    </span>
  );
}

function QuickMenu({ top, left, afterId, onClose }: { top: number; left: number; afterId: string; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector('button')?.focus();
    const onDown = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) onClose(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey); };
  }, [onClose]);
  return (
    <div ref={ref} className={s.quickMenu} style={{ top, left }} role="menu" onClick={(e) => e.stopPropagation()}>
      {QUICK.map((id) => {
        const entry = findEntry(id)!;
        return (
          <button
            key={id}
            type="button"
            role="menuitem"
            onClick={() => {
              const st = useEditor.getState();
              const info = st.index.get(afterId);
              if (!info) return;
              const res = st.insertNode(entry.create(), info.parentId, info.index + 1);
              if (!res.ok && res.reason) toastError(res.reason);
              onClose();
            }}
          >
            <ModuleIcon name={entry.icon} size={15} />
            {entry.label}
          </button>
        );
      })}
    </div>
  );
}

import { useEffect, useRef, type ReactNode } from 'react';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { useDnd, type DragData } from './dnd-state';
import { canvasTarget, layersTarget } from './drop-target';
import { useEditor } from './store';
import { ModuleIcon } from '../components/Icon';
import { toastError } from '../components/ui/Toasts';
import s from './dnd.module.css';

/**
 * dnd-kit lo phần cảm biến (ngưỡng kéo, chuột/cảm ứng) và lớp phủ khi kéo;
 * vị trí thả được tính từ DOM thật dưới con trỏ (drop-target.ts).
 */
export function DndProvider({ children }: { children: ReactNode }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const active = useDnd((st) => st.active);
  const pointer = useRef({ x: 0, y: 0 });
  const frame = useRef(0);

  useEffect(() => {
    if (!active) return;
    let scrollTimer = 0;
    const compute = () => {
      frame.current = 0;
      const { x, y } = pointer.current;
      const st = useEditor.getState();
      const drag = useDnd.getState().active;
      if (!drag) return;
      const t = layersTarget(x, y, drag, st.project.nodes, st.index) ?? canvasTarget(x, y, drag, st.project.nodes, st.index);
      useDnd.getState().setTarget(t);
    };
    const autoScroll = () => {
      const scroller = document.querySelector<HTMLElement>('[data-canvas-scroller]');
      const layers = document.querySelector<HTMLElement>('[data-layers-scroller]');
      for (const el of [scroller, layers]) {
        if (!el) continue;
        const r = el.getBoundingClientRect();
        const { x, y } = pointer.current;
        if (x < r.left || x > r.right) continue;
        const edge = 56;
        if (y < r.top + edge && y > r.top - 20) el.scrollTop -= Math.ceil((r.top + edge - y) / 4);
        else if (y > r.bottom - edge && y < r.bottom + 20) el.scrollTop += Math.ceil((y - (r.bottom - edge)) / 4);
      }
    };
    const onMove = (e: PointerEvent) => {
      pointer.current = { x: e.clientX, y: e.clientY };
      if (!frame.current) frame.current = requestAnimationFrame(compute);
    };
    window.addEventListener('pointermove', onMove);
    scrollTimer = window.setInterval(() => { autoScroll(); if (!frame.current) frame.current = requestAnimationFrame(compute); }, 40);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.clearInterval(scrollTimer);
      if (frame.current) cancelAnimationFrame(frame.current);
      frame.current = 0;
    };
  }, [active]);

  const onDragStart = (e: DragStartEvent) => {
    const data = e.active.data.current as DragData | undefined;
    if (!data) return;
    const ev = e.activatorEvent as PointerEvent;
    if ('clientX' in ev) pointer.current = { x: ev.clientX, y: ev.clientY };
    document.body.dataset.dragging = 'true';
    window.getSelection()?.removeAllRanges();
    useDnd.getState().setActive(data);
  };

  const onDragEnd = (_e: DragEndEvent) => {
    const { active: drag, target } = useDnd.getState();
    useDnd.getState().setActive(null);
    delete document.body.dataset.dragging;
    if (!drag || !target) return;
    if (!target.valid) {
      if (target.reason) toastError(target.reason);
      return;
    }
    const st = useEditor.getState();
    const res = drag.kind === 'new' ? st.insertNode(drag.create(), target.parentId, target.index) : st.moveNode(drag.id, target.parentId, target.index);
    if (!res.ok && res.reason) toastError(res.reason);
  };

  const onDragCancel = () => {
    useDnd.getState().setActive(null);
    delete document.body.dataset.dragging;
  };

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={onDragCancel} autoScroll={false}>
      {children}
      <DragOverlay dropAnimation={null} style={{ pointerEvents: 'none' }}>
        {active ? (
          <div className={s.overlay}>
            <ModuleIcon name={active.icon} size={15} />
            {active.label}
          </div>
        ) : null}
      </DragOverlay>
      <DropIndicator />
    </DndContext>
  );
}

function DropIndicator() {
  const target = useDnd((st) => st.target);
  const active = useDnd((st) => st.active);
  if (!active || !target) return null;
  const { x, y, w, h, mode } = target.indicator;
  return (
    <div
      className={[s.indicator, mode === 'box' ? s.box : s.line, !target.valid && s.invalid].filter(Boolean).join(' ')}
      style={{ left: x, top: y, width: w, height: h }}
      aria-hidden="true"
    >
      {!target.valid && target.reason && <span className={s.reason}>{target.reason}</span>}
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { ChevronDown, ChevronRight, Copy, Eye, EyeOff, Lock, LockOpen, Trash2 } from 'lucide-react';
import { useEditor } from '../../editor/store';
import { ancestorsOf, subtreeDepth } from '../../editor/tree';
import type { DragData } from '../../editor/dnd-state';
import type { LayoutNode } from '../../models/node';
import { getDef } from '../../modules/registry';
import { ModuleIcon } from '../Icon';
import { IconBtn } from '../ui/controls';
import s from './LayersPanel.module.css';

/** Cây cấu trúc trang: chọn, đổi tên, kéo để sắp xếp, ẩn/khóa, nhân bản, xóa. */
export function LayersPanel() {
  const nodes = useEditor((st) => st.project.nodes);
  const selectedId = useEditor((st) => st.selectedId);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  // Mở các nhánh chứa module đang chọn.
  useEffect(() => {
    if (!selectedId) return;
    const anc = ancestorsOf(useEditor.getState().project.nodes, selectedId);
    if (anc.some((a) => collapsed.has(a.id))) {
      const next = new Set(collapsed);
      anc.forEach((a) => next.delete(a.id));
      setCollapsed(next);
    }
    document.querySelector(`[data-layer-id="${CSS.escape(selectedId)}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (id: string) => {
    const next = new Set(collapsed);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setCollapsed(next);
  };

  return (
    <div className={s.wrap}>
      <div className={s.head}>
        <span>Trang</span>
        <span className={s.headHint}>Kéo để sắp xếp · F2 đổi tên</span>
      </div>
      <div className={s.scroll} data-layers-scroller>
        <ul className={s.tree} role="tree" aria-label="Cấu trúc trang" data-layers-root>
          {nodes.map((n) => <LayerRow key={n.id} node={n} depth={1} collapsed={collapsed} onToggle={toggle} />)}
        </ul>
        {!nodes.length && <p className={s.empty}>Trang chưa có module nào.</p>}
      </div>
    </div>
  );
}

function LayerRow({ node, depth, collapsed, onToggle }: { node: LayoutNode; depth: number; collapsed: Set<string>; onToggle: (id: string) => void }) {
  const selected = useEditor((st) => st.selectedId === node.id);
  const def = getDef(node.type);
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasKids = !!node.children?.length;
  const open = hasKids && !collapsed.has(node.id);
  const canDrag = !node.locked && def.draggable !== false;
  const data: DragData = { kind: 'move', id: node.id, label: node.name, icon: def.icon, type: node.type, depth: subtreeDepth(node) };
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `layer:${node.id}`, data, disabled: !canDrag || editing });
  const st = useEditor.getState;

  useEffect(() => { if (editing) inputRef.current?.select(); }, [editing]);

  return (
    <li role="treeitem" aria-selected={selected} aria-expanded={hasKids ? open : undefined}>
      <div
        ref={setNodeRef}
        className={[s.row, selected && s.selected, isDragging && s.dragging, node.hidden && s.isHidden].filter(Boolean).join(' ')}
        style={{ paddingLeft: 6 + (depth - 1) * 14 }}
        data-layer-id={node.id}
        data-depth={depth}
        {...attributes}
        tabIndex={0}
        {...listeners}
        role="button"
        aria-label={`${node.name} (${def.label})${node.hidden ? ', đang ẩn' : ''}${node.locked ? ', đang khóa' : ''}`}
        onClick={() => st().select(node.id)}
        onDoubleClick={() => setEditing(true)}
        onMouseEnter={() => st().hover(node.id)}
        onMouseLeave={() => st().hover(null)}
        onKeyDown={(e) => {
          if (editing) return;
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); st().select(node.id); }
          if (e.key === 'F2') { e.preventDefault(); setEditing(true); }
          if (e.key === 'ArrowRight' && hasKids && !open) onToggle(node.id);
          if (e.key === 'ArrowLeft' && open) onToggle(node.id);
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            const rows = Array.from(document.querySelectorAll<HTMLElement>('[data-layer-id]'));
            const i = rows.indexOf(e.currentTarget);
            rows[i + (e.key === 'ArrowDown' ? 1 : -1)]?.focus();
          }
        }}
      >
        <button
          type="button"
          className={s.caret}
          tabIndex={-1}
          aria-label={open ? 'Thu gọn' : 'Mở rộng'}
          style={{ visibility: hasKids ? 'visible' : 'hidden' }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onToggle(node.id); }}
        >
          {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </button>
        <span className={s.icon}><ModuleIcon name={def.icon} size={14} /></span>
        {editing ? (
          <input
            ref={inputRef}
            className={s.rename}
            aria-label="Tên module"
            defaultValue={node.name}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            onBlur={(e) => { st().rename(node.id, e.target.value.trim() || def.label); setEditing(false); }}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              if (e.key === 'Escape') setEditing(false);
            }}
          />
        ) : (
          <span className={s.name}>{node.name}</span>
        )}
        <span className={s.actions} onPointerDown={(e) => e.stopPropagation()}>
          {node.type !== 'column' && (
            <>
              <IconBtn small tabIndex={-1} label="Nhân bản" onClick={(e) => { e.stopPropagation(); st().duplicateNode(node.id); }}><Copy size={12} /></IconBtn>
              <IconBtn small tabIndex={-1} label="Xóa" disabled={node.locked} onClick={(e) => { e.stopPropagation(); st().removeNode(node.id); }}><Trash2 size={12} /></IconBtn>
            </>
          )}
        </span>
        <span className={s.flags} onPointerDown={(e) => e.stopPropagation()}>
          <IconBtn small tabIndex={-1} className={node.locked ? s.flagOn : s.flagOff} label={node.locked ? 'Mở khóa' : 'Khóa'} pressed={!!node.locked} onClick={(e) => { e.stopPropagation(); st().toggleLocked(node.id); }}>
            {node.locked ? <Lock size={12} /> : <LockOpen size={12} />}
          </IconBtn>
          <IconBtn small tabIndex={-1} className={node.hidden ? s.flagOn : s.flagOff} label={node.hidden ? 'Hiện module' : 'Ẩn module'} pressed={!!node.hidden} onClick={(e) => { e.stopPropagation(); st().toggleHidden(node.id); }}>
            {node.hidden ? <EyeOff size={12} /> : <Eye size={12} />}
          </IconBtn>
        </span>
      </div>
      {open && (
        <ul role="group" className={s.tree}>
          {node.children!.map((c) => <LayerRow key={c.id} node={c} depth={depth + 1} collapsed={collapsed} onToggle={onToggle} />)}
        </ul>
      )}
    </li>
  );
}

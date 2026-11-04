import { useMemo, useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { ChevronDown, ChevronRight, Search, Trash2, X } from 'lucide-react';
import { GROUP_LABELS, LIBRARY, type LibraryEntry, type LibraryGroup } from '../../modules/library';
import { useEditor, type Template } from '../../editor/store';
import type { DragData } from '../../editor/dnd-state';
import { cloneWithNewIds, subtreeDepth } from '../../editor/tree';
import { getDef } from '../../modules/registry';
import { ModuleIcon } from '../Icon';
import { IconBtn } from '../ui/controls';
import { toast, toastError } from '../ui/Toasts';
import type { IconName } from '../../modules/types';
import s from './ModuleLibrary.module.css';

const GROUPS: LibraryGroup[] = ['layout', 'text', 'media', 'learning', 'utility'];

const fold = (v: string) => v.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').toLowerCase();

export function ModuleLibrary() {
  const [q, setQ] = useState('');
  const [closed, setClosed] = useState<Record<string, boolean>>({});
  const templates = useEditor((st) => st.templates);
  const query = fold(q.trim());

  const filtered = useMemo(
    () => (query ? LIBRARY.filter((e) => fold(`${e.label} ${e.description} ${e.keywords ?? ''}`).includes(query)) : LIBRARY),
    [query],
  );
  const tpl = query ? templates.filter((t) => fold(t.name).includes(query)) : templates;

  return (
    <div className={s.wrap}>
      <div className={s.search}>
        <Search size={14} aria-hidden="true" />
        <input data-library-search placeholder="Tìm module..." aria-label="Tìm module theo tên" value={q} onChange={(e) => setQ(e.target.value)} />
        {q && <IconBtn small label="Xóa tìm kiếm" onClick={() => setQ('')}><X size={13} /></IconBtn>}
      </div>
      <p className={s.tip}>Kéo vào trang, hoặc nhấp để thêm sau module đang chọn.</p>
      <div className={s.list}>
        {GROUPS.map((g) => {
          const items = filtered.filter((e) => e.group === g);
          if (!items.length) return null;
          const open = query ? true : !closed[g];
          return (
            <section key={g} className={s.group}>
              <button type="button" className={s.groupHead} aria-expanded={open} onClick={() => setClosed({ ...closed, [g]: open })}>
                {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                {GROUP_LABELS[g]}
                <span className={s.count}>{items.length}</span>
              </button>
              {open && <div className={s.items}>{items.map((e) => <EntryItem key={e.id} entry={e} />)}</div>}
            </section>
          );
        })}
        <section className={s.group}>
          <button type="button" className={s.groupHead} aria-expanded={!closed.custom} onClick={() => setClosed({ ...closed, custom: !closed.custom })}>
            {!closed.custom ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            {GROUP_LABELS.custom}
            <span className={s.count}>{tpl.length}</span>
          </button>
          {!closed.custom && (
            <div className={s.items}>
              {tpl.length ? (
                tpl.map((t) => <TemplateItem key={t.id} template={t} />)
              ) : (
                <p className={s.empty}>Chọn một module trên trang rồi bấm "Lưu thành mẫu" ở bảng Thuộc tính để dùng lại về sau.</p>
              )}
            </div>
          )}
        </section>
        {!filtered.length && !tpl.length && <p className={s.empty}>Không có module nào khớp "{q}".</p>}
      </div>
    </div>
  );
}

function useItemDrag(id: string, data: DragData) {
  return useDraggable({ id, data });
}

function Item({ dragId, data, icon, label, description, onAdd, extra }: {
  dragId: string; data: DragData; icon: IconName; label: string; description: string; onAdd: () => void; extra?: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useItemDrag(dragId, data);
  return (
    <div className={[s.item, isDragging && s.dragging].filter(Boolean).join(' ')}>
      <button
        ref={setNodeRef}
        type="button"
        className={s.itemBtn}
        {...attributes}
        {...listeners}
        aria-roledescription="module có thể kéo"
        aria-label={`${label}: ${description}. Nhấn Enter để thêm.`}
        onClick={onAdd}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onAdd(); } }}
      >
        <span className={s.icon}><ModuleIcon name={icon} size={16} /></span>
        <span className={s.text}>
          <span className={s.name}>{label}</span>
          <span className={s.desc}>{description}</span>
        </span>
      </button>
      {extra}
    </div>
  );
}

function EntryItem({ entry }: { entry: LibraryEntry }) {
  const data = useMemo<DragData>(() => {
    const sample = entry.create();
    return { kind: 'new', label: entry.label, icon: entry.icon, type: sample.type, depth: subtreeDepth(sample), create: entry.create };
  }, [entry]);
  const add = () => {
    const res = useEditor.getState().addNode(entry.create());
    if (!res.ok) toastError(res.reason ?? 'Không thêm được module.');
  };
  return <Item dragId={`new:${entry.id}`} data={data} icon={entry.icon} label={entry.label} description={entry.description} onAdd={add} />;
}

function TemplateItem({ template }: { template: Template }) {
  const create = () => cloneWithNewIds(template.node);
  const data: DragData = { kind: 'new', label: template.name, icon: 'template', type: template.node.type, depth: subtreeDepth(template.node), create };
  return (
    <Item
      dragId={`tpl:${template.id}`}
      data={data}
      icon="template"
      label={template.name}
      description={`Mẫu ${getDef(template.node.type).label}`}
      onAdd={() => {
        const res = useEditor.getState().addNode(create());
        if (!res.ok) toastError(res.reason ?? 'Không thêm được mẫu.');
      }}
      extra={
        <IconBtn small className={s.del} label={`Xóa mẫu ${template.name}`} onClick={() => { useEditor.getState().deleteTemplate(template.id); toast('Đã xóa mẫu.'); }}>
          <Trash2 size={13} />
        </IconBtn>
      }
    />
  );
}

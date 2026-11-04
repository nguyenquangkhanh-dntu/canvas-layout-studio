import { Plus } from 'lucide-react';
import { useDnd } from '../../editor/dnd-state';
import { useEditor } from '../../editor/store';
import s from './Canvas.module.css';

/** Vùng trống bên trong container/cột: chỉ có trong trình thiết kế, không bao giờ được xuất ra. */
export function EmptySlot({ parentId }: { parentId: string }) {
  const dragging = useDnd((st) => !!st.active);
  const isRoot = parentId === '__root__';
  return (
    <div className={[s.emptySlot, dragging && s.emptySlotDrag].filter(Boolean).join(' ')} data-empty-slot={parentId}>
      <span>{isRoot ? 'Kéo module từ thư viện vào đây' : 'Thả module vào đây'}</span>
      {!isRoot && (
        <button
          type="button"
          className={s.emptyAdd}
          onClick={(e) => {
            e.stopPropagation();
            useEditor.getState().select(parentId);
            useEditor.getState().setUi({ leftOpen: true, leftTab: 'library' });
            document.querySelector<HTMLInputElement>('[data-library-search]')?.focus();
          }}
        >
          <Plus size={13} /> Thêm
        </button>
      )}
    </div>
  );
}

import { useEffect } from 'react';
import { useEditor } from '../editor/store';
import { saveNow } from '../editor/autosave';
import { useDialogs } from '../components/dialogs';
import { toast } from '../components/ui/Toasts';

function isTyping(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (el as HTMLElement).isContentEditable;
}

/** Phím tắt toàn cục của trình thiết kế. */
export function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (useDialogs.getState().which) return;
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      const st = useEditor.getState();

      if (mod && key === 's') { e.preventDefault(); void saveNow(true); return; }
      // Hoàn tác dùng lịch sử chung của dự án, kể cả khi đang gõ trong ô nhập.
      if (mod && key === 'z' && !e.shiftKey) { e.preventDefault(); st.undo(); return; }
      if (mod && (key === 'y' || (key === 'z' && e.shiftKey))) { e.preventDefault(); st.redo(); return; }

      if (isTyping(document.activeElement)) return;
      const id = st.selectedId;
      if (key === 'escape') {
        // Chỉ bỏ chọn khi đang thao tác trên trang, không khi đang ở bảng thuộc tính.
        const a = document.activeElement;
        if (!a || a === document.body || a.closest('[data-canvas-scroller]')) st.select(null);
        return;
      }
      if (!id) {
        if (mod && key === 'v' && st.clipboard) { e.preventDefault(); st.paste(); }
        return;
      }
      if (key === 'delete' || key === 'backspace') { e.preventDefault(); st.removeNode(id); return; }
      if (mod && key === 'd') { e.preventDefault(); st.duplicateNode(id); return; }
      if (mod && key === 'c') { if (st.copy(id)) toast('Đã sao chép module.'); return; }
      if (mod && key === 'x') { if (st.copy(id)) st.removeNode(id); return; }
      if (mod && key === 'v') { e.preventDefault(); st.paste(); return; }
      if (e.altKey && key === 'arrowup') { e.preventDefault(); st.moveBy(id, -1); return; }
      if (e.altKey && key === 'arrowdown') { e.preventDefault(); st.moveBy(id, 1); return; }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

import { create } from 'zustand';
import { X } from 'lucide-react';
import s from './ui.module.css';

interface Toast {
  id: number;
  message: string;
  kind: 'info' | 'error';
}

interface ToastState {
  toasts: Toast[];
  push(message: string, kind?: Toast['kind']): void;
  dismiss(id: number): void;
}

let seq = 0;

export const useToasts = create<ToastState>()((set, get) => ({
  toasts: [],
  push(message, kind = 'info') {
    const id = ++seq;
    set({ toasts: [...get().toasts.slice(-3), { id, message, kind }] });
    setTimeout(() => get().dismiss(id), kind === 'error' ? 7000 : 3200);
  },
  dismiss(id) {
    set({ toasts: get().toasts.filter((t) => t.id !== id) });
  },
}));

export const toast = (message: string) => useToasts.getState().push(message, 'info');
export const toastError = (message: string) => useToasts.getState().push(message, 'error');

export function Toasts() {
  const { toasts, dismiss } = useToasts();
  return (
    <div className={s.toasts} role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={[s.toast, t.kind === 'error' && s.toastError].filter(Boolean).join(' ')}>
          <span>{t.message}</span>
          <button type="button" aria-label="Đóng thông báo" onClick={() => dismiss(t.id)}><X size={14} /></button>
        </div>
      ))}
    </div>
  );
}

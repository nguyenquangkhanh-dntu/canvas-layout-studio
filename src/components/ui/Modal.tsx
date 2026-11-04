import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import s from './ui.module.css';
import { Btn, IconBtn } from './controls';

export function Modal({ title, onClose, children, footer, wide, medium, labelledBy }: {
  title: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean; medium?: boolean; labelledBy?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const first =
      ref.current?.querySelector<HTMLElement>('[data-autofocus]') ??
      ref.current?.querySelector<HTMLElement>('.' + s.modalBody + ' input, .' + s.modalBody + ' button, button');
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); closeRef.current(); }
      if (e.key === 'Tab' && ref.current) {
        // Giữ tiêu điểm trong hộp thoại.
        const items = Array.from(ref.current.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"], a[href]'));
        if (!items.length) return;
        const firstEl = items[0], lastEl = items[items.length - 1];
        if (e.shiftKey && document.activeElement === firstEl) { e.preventDefault(); lastEl.focus(); }
        else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); firstEl.focus(); }
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => { document.removeEventListener('keydown', onKey, true); prev?.focus?.(); };
  }, []);
  return (
    <div className={s.backdrop} onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} className={[s.modal, wide && s.modalWide, medium && s.modalMedium].filter(Boolean).join(' ')} role="dialog" aria-modal="true" aria-labelledby={labelledBy ?? 'modal-title'}>
        <div className={s.modalHead}>
          <h2 id={labelledBy ?? 'modal-title'}>{title}</h2>
          <IconBtn label="Đóng" onClick={onClose}><X size={16} /></IconBtn>
        </div>
        <div className={s.modalBody}>{children}</div>
        {footer && <div className={s.modalFoot}>{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ title, message, confirmLabel, danger, onConfirm, onCancel }: {
  title: string; message: ReactNode; confirmLabel: string; danger?: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <Modal
      title={title}
      onClose={onCancel}
      footer={
        <>
          <Btn onClick={onCancel}>Hủy</Btn>
          <Btn variant={danger ? 'danger' : 'primary'} onClick={onConfirm} data-autofocus>{confirmLabel}</Btn>
        </>
      }
    >
      <div style={{ fontSize: 14, lineHeight: 1.55 }}>{message}</div>
    </Modal>
  );
}

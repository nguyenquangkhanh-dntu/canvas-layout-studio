import { createElement, useLayoutEffect, useRef, type HTMLAttributes } from 'react';
import { useEditor } from '../../editor/store';

/**
 * Văn bản thuần chỉnh sửa trực tiếp trên trang (tiêu đề, chú thích, code...).
 * Phần tử không do React quản lý nội dung, tránh nhảy con trỏ khi gõ.
 */
export function EditableText({ tag, nodeId, field, text, multiline, placeholder, editable, elementProps }: {
  tag: string;
  nodeId: string;
  field: string;
  text: string;
  multiline?: boolean;
  placeholder?: string;
  editable: boolean;
  elementProps: HTMLAttributes<HTMLElement> & Record<string, unknown>;
}) {
  const ref = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (document.activeElement === el && el.innerText.replace(/\n$/, '') === text) return;
    if (el.innerText !== text) el.innerText = text;
  }, [text]);

  const commit = () => {
    const el = ref.current;
    if (!el) return;
    let value = el.innerText;
    if (multiline) value = value.replace(/\n$/, '');
    else value = value.replace(/\n/g, ' ');
    useEditor.getState().setPropPath(nodeId, field, value, { key: `text:${nodeId}:${field}` });
  };

  return createElement(tag, {
    ...elementProps,
    ref,
    contentEditable: editable ? 'plaintext-only' : undefined,
    suppressContentEditableWarning: true,
    spellCheck: editable && !multiline ? true : false,
    'data-placeholder': placeholder,
    'data-editable-empty': text === '' ? '' : undefined,
    'data-editable-field': field,
    onInput: editable ? commit : undefined,
    onKeyDown: editable
      ? (e: React.KeyboardEvent<HTMLElement>) => {
          if (e.key === 'Enter' && !multiline) {
            e.preventDefault();
            (e.currentTarget as HTMLElement).blur();
          }
          if (e.key === 'Escape') (e.currentTarget as HTMLElement).blur();
        }
      : undefined,
  });
}

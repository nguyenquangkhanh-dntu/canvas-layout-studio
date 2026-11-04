import { useEffect, useMemo, type HTMLAttributes } from 'react';
import { EditorContent, useEditor as useTiptap, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { BackgroundColor, Color, FontFamily, FontSize, LineHeight, TextStyle } from '@tiptap/extension-text-style';
import TextAlign from '@tiptap/extension-text-align';
import { Placeholder } from '@tiptap/extensions';
import { create } from 'zustand';
import { useEditor } from '../../editor/store';
import { sanitizeRichHtml } from '../../services/html-sanitizer';
import { richLinkVars, type RichLink } from '../../services/rich-style';
import { safeHref } from '../../services/safe-values';

/** Trình soạn thảo Rich Text đang hoạt động (dùng cho thanh định dạng). */
export const useActiveRich = create<{ editor: Editor | null; nodeId: string | null; set(e: Editor | null, id: string | null): void }>()((set) => ({
  editor: null,
  nodeId: null,
  set: (editor, nodeId) => set({ editor, nodeId }),
}));

export function richExtensions() {
  return [
    StarterKit.configure({
      undoRedo: false,
      horizontalRule: false,
      heading: { levels: [1, 2, 3, 4, 5, 6] },
      link: {
        openOnClick: false,
        autolink: true,
        defaultProtocol: 'https',
        isAllowedUri: (url) => !!safeHref(url),
        HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' },
      },
    }),
    TextStyle,
    Color,
    BackgroundColor,
    FontFamily,
    FontSize,
    LineHeight,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Placeholder.configure({ placeholder: 'Nhập nội dung...' }),
  ];
}

type ElementProps = HTMLAttributes<HTMLElement> & Record<string, unknown>;

export function RichTextBlock({ html, paragraphSpacing, nodeId, editable, elementProps, link }: {
  html: string; paragraphSpacing: number; nodeId: string; editable: boolean; elementProps: ElementProps; link?: RichLink;
}) {
  const style = { ...(elementProps.style as object), ['--cls-ps' as string]: `${paragraphSpacing}px`, ...richLinkVars(link) };
  const clean = useMemo(() => sanitizeRichHtml(html), [html]);
  if (!editable) {
    return <div {...elementProps} className="cls-rt" style={style} dangerouslySetInnerHTML={{ __html: clean }} />;
  }
  return <LiveEditor html={clean} nodeId={nodeId} elementProps={{ ...elementProps, style }} />;
}

function LiveEditor({ html, nodeId, elementProps }: { html: string; nodeId: string; elementProps: ElementProps }) {
  const editor = useTiptap({
    extensions: richExtensions(),
    content: html,
    immediatelyRender: true,
    shouldRerenderOnTransaction: false,
    editorProps: { attributes: { 'aria-label': 'Nội dung văn bản', spellcheck: 'true' } },
    onUpdate: ({ editor: ed }) => {
      useEditor.getState().updateProps(nodeId, { html: sanitizeRichHtml(ed.getHTML()) }, { key: `rich:${nodeId}` });
    },
  });

  // Đồng bộ khi nội dung thay đổi từ bên ngoài (Undo/Redo, bảng thuộc tính).
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    if (sanitizeRichHtml(editor.getHTML()) !== html) editor.commands.setContent(html, { emitUpdate: false });
  }, [html, editor]);

  useEffect(() => {
    useActiveRich.getState().set(editor, nodeId);
    return () => {
      if (useActiveRich.getState().editor === editor) useActiveRich.getState().set(null, null);
    };
  }, [editor, nodeId]);

  return (
    <div {...elementProps} className="cls-rt">
      <EditorContent editor={editor} />
    </div>
  );
}

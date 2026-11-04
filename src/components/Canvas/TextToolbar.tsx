import { useState } from 'react';
import { useEditorState } from '@tiptap/react';
import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight, Baseline, Bold, Highlighter, Indent, Italic, Link2, List, ListOrdered,
  Outdent, RemoveFormatting, Strikethrough, Underline, Unlink,
} from 'lucide-react';
import { useActiveRich } from './RichTextBlock';
import { IconBtn } from '../ui/controls';
import { FONT_STACKS } from '../../models/style';
import { safeHref } from '../../services/safe-values';
import { toastError } from '../ui/Toasts';
import s from './Canvas.module.css';

const SIZES = ['12px', '14px', '15px', '16px', '18px', '20px', '22px', '24px', '28px', '32px', '40px'];
const LINE_HEIGHTS = ['1', '1.2', '1.4', '1.65', '2'];

/** Thanh định dạng cho khối Rich Text đang chỉnh sửa: áp dụng cho phần văn bản được bôi đen. */
export function TextToolbar() {
  const editor = useActiveRich((st) => st.editor);
  if (!editor) {
    return (
      <div className={s.textBar} role="toolbar" aria-label="Định dạng văn bản">
        <span className={s.textBarHint}>Chọn một khối văn bản (Paragraph, Rich Text, Danh sách...) để định dạng chữ.</span>
      </div>
    );
  }
  return <ActiveToolbar />;
}

function ActiveToolbar() {
  const editor = useActiveRich((st) => st.editor)!;
  const [linkOpen, setLinkOpen] = useState(false);
  const [href, setHref] = useState('');
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      underline: e.isActive('underline'),
      strike: e.isActive('strike'),
      bullet: e.isActive('bulletList'),
      ordered: e.isActive('orderedList'),
      link: e.isActive('link'),
      block: ([1, 2, 3, 4, 5, 6].find((l) => e.isActive('heading', { level: l })) ?? 0) as number,
      align: (['center', 'right', 'justify'].find((a) => e.isActive({ textAlign: a })) ?? 'left') as string,
      font: (e.getAttributes('textStyle').fontFamily as string | undefined) ?? '',
      size: (e.getAttributes('textStyle').fontSize as string | undefined) ?? '',
      lineHeight: (e.getAttributes('textStyle').lineHeight as string | undefined) ?? '',
      color: (e.getAttributes('textStyle').color as string | undefined) ?? '#1f2a37',
      bg: (e.getAttributes('textStyle').backgroundColor as string | undefined) ?? '#fff3a3',
      inList: e.isActive('listItem'),
    }),
  });
  if (!state) return null;
  const chain = () => editor.chain().focus();

  const applyLink = () => {
    const url = href.trim();
    if (!url) {
      chain().extendMarkRange('link').unsetLink().run();
    } else {
      const safe = safeHref(/^[\w.-]+\.[a-z]{2,}/i.test(url) ? `https://${url}` : url);
      if (!safe) return toastError('Liên kết không hợp lệ. Chỉ chấp nhận http(s), mailto, tel hoặc đường dẫn tương đối.');
      chain().extendMarkRange('link').setLink({ href: safe, target: '_blank' }).run();
    }
    setLinkOpen(false);
  };

  return (
    <div className={s.textBar} role="toolbar" aria-label="Định dạng văn bản" onMouseDown={(e) => {
      // Giữ vùng chọn văn bản khi bấm nút (trừ ô nhập liệu).
      const t = e.target as HTMLElement;
      if (!t.closest('select, input')) e.preventDefault();
    }}>
      <select
        className={s.tbSelect}
        aria-label="Kiểu đoạn"
        value={state.block}
        onChange={(e) => {
          const l = Number(e.target.value);
          if (l === 0) chain().setParagraph().run();
          else chain().setHeading({ level: l as 1 | 2 | 3 | 4 | 5 | 6 }).run();
        }}
      >
        <option value={0}>Đoạn văn</option>
        {[1, 2, 3, 4, 5, 6].map((l) => <option key={l} value={l}>Tiêu đề H{l}</option>)}
      </select>
      <select className={s.tbSelect} aria-label="Font chữ" value={state.font} style={{ width: 120 }} onChange={(e) => (e.target.value ? chain().setFontFamily(e.target.value).run() : chain().unsetFontFamily().run())}>
        <option value="">Font mặc định</option>
        {FONT_STACKS.map((f) => <option key={f.label} value={f.value}>{f.label.replace(' (mặc định)', '')}</option>)}
      </select>
      <select className={s.tbSelect} aria-label="Cỡ chữ" value={state.size} onChange={(e) => (e.target.value ? chain().setFontSize(e.target.value).run() : chain().unsetFontSize().run())}>
        <option value="">Cỡ</option>
        {SIZES.map((v) => <option key={v} value={v}>{v.replace('px', '')}</option>)}
      </select>
      <span className={s.sep} />
      <IconBtn label="In đậm (Ctrl+B)" pressed={state.bold} onClick={() => chain().toggleBold().run()}><Bold size={15} /></IconBtn>
      <IconBtn label="In nghiêng (Ctrl+I)" pressed={state.italic} onClick={() => chain().toggleItalic().run()}><Italic size={15} /></IconBtn>
      <IconBtn label="Gạch chân (Ctrl+U)" pressed={state.underline} onClick={() => chain().toggleUnderline().run()}><Underline size={15} /></IconBtn>
      <IconBtn label="Gạch ngang" pressed={state.strike} onClick={() => chain().toggleStrike().run()}><Strikethrough size={15} /></IconBtn>
      <label className={s.colorTool} title="Màu chữ">
        <Baseline size={15} />
        <span className={s.colorBar} style={{ background: state.color }} />
        <input type="color" aria-label="Màu chữ" value={toHex(state.color)} onChange={(e) => chain().setColor(e.target.value).run()} />
      </label>
      <label className={s.colorTool} title="Màu nền chữ (tô sáng)">
        <Highlighter size={15} />
        <span className={s.colorBar} style={{ background: state.bg }} />
        <input type="color" aria-label="Màu nền chữ" value={toHex(state.bg)} onChange={(e) => chain().setBackgroundColor(e.target.value).run()} />
      </label>
      <span className={s.sep} />
      <IconBtn label="Căn trái" pressed={state.align === 'left'} onClick={() => chain().setTextAlign('left').run()}><AlignLeft size={15} /></IconBtn>
      <IconBtn label="Căn giữa" pressed={state.align === 'center'} onClick={() => chain().setTextAlign('center').run()}><AlignCenter size={15} /></IconBtn>
      <IconBtn label="Căn phải" pressed={state.align === 'right'} onClick={() => chain().setTextAlign('right').run()}><AlignRight size={15} /></IconBtn>
      <IconBtn label="Căn đều" pressed={state.align === 'justify'} onClick={() => chain().setTextAlign('justify').run()}><AlignJustify size={15} /></IconBtn>
      <span className={s.sep} />
      <IconBtn label="Danh sách gạch đầu dòng" pressed={state.bullet} onClick={() => chain().toggleBulletList().run()}><List size={15} /></IconBtn>
      <IconBtn label="Danh sách đánh số" pressed={state.ordered} onClick={() => chain().toggleOrderedList().run()}><ListOrdered size={15} /></IconBtn>
      <IconBtn label="Thụt vào (Tab)" disabled={!state.inList} onClick={() => chain().sinkListItem('listItem').run()}><Indent size={15} /></IconBtn>
      <IconBtn label="Thụt ra (Shift+Tab)" disabled={!state.inList} onClick={() => chain().liftListItem('listItem').run()}><Outdent size={15} /></IconBtn>
      <select className={s.tbSelect} aria-label="Giãn dòng" value={state.lineHeight} onChange={(e) => (e.target.value ? chain().setLineHeight(e.target.value).run() : chain().unsetLineHeight().run())}>
        <option value="">Giãn dòng</option>
        {LINE_HEIGHTS.map((v) => <option key={v} value={v}>{v}</option>)}
      </select>
      <span className={s.sep} />
      {linkOpen ? (
        <span className={s.linkBox}>
          <input
            autoFocus
            aria-label="Địa chỉ liên kết"
            placeholder="https://... (để trống để bỏ liên kết)"
            value={href}
            onChange={(e) => setHref(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); applyLink(); }
              if (e.key === 'Escape') setLinkOpen(false);
            }}
          />
          <button type="button" className={s.tbSelect} onClick={applyLink}>Áp dụng</button>
        </span>
      ) : (
        <IconBtn label="Chèn liên kết" pressed={state.link} onClick={() => { setHref((editor.getAttributes('link').href as string) ?? ''); setLinkOpen(true); }}><Link2 size={15} /></IconBtn>
      )}
      <IconBtn label="Bỏ liên kết" disabled={!state.link} onClick={() => chain().extendMarkRange('link').unsetLink().run()}><Unlink size={15} /></IconBtn>
      <IconBtn label="Xóa định dạng" onClick={() => chain().unsetAllMarks().unsetTextAlign().run()}><RemoveFormatting size={15} /></IconBtn>
    </div>
  );
}

function toHex(c: string): string {
  if (/^#[0-9a-f]{6}$/i.test(c)) return c;
  const m = /rgba?\(\s*(\d+)[ ,]+(\d+)[ ,]+(\d+)/i.exec(c);
  if (m) return `#${[m[1], m[2], m[3]].map((x) => Number(x).toString(16).padStart(2, '0')).join('')}`;
  return '#000000';
}

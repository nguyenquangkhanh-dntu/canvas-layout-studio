import { useRef, useState } from 'react';
import { ImageUp, Plus, Trash2, X } from 'lucide-react';
import { useEditor } from '../../editor/store';
import { locate } from '../../editor/tree';
import type { LayoutNode, NodeProps } from '../../models/node';
import { getProps } from '../../modules/types';
import { columnsDef, containerDef, dividerDef, gridDef, spacerDef } from '../../modules/defs/layout';
import { checklistDef, codeDef, headingDef, normalizeChecklistItems, quoteDef, textDef } from '../../modules/defs/text';
import { buttonDef, imageDef, toEmbedUrl, videoDef } from '../../modules/defs/media';
import { calloutDef, calloutStyle } from '../../modules/defs/learning';
import { CALLOUT_VARIANTS, getCalloutVariant } from '../../models/callouts';
import { Btn, ColorInput, Field, Hint, IconBtn, NumberInput, Section, Segmented, Select, TextArea, TextInput, Toggle, uiStyles } from '../ui/controls';
import { dataUrlBytes, isDataUrl, safeHref, safeImageSrc } from '../../services/safe-values';
import { formatBytes, loadImageFile } from '../../services/image-file';
import { toast, toastError } from '../ui/Toasts';
import { uid } from '../../utils/id';
import { CurriculumEditor, ProgressEditor, ScheduleEditor } from './widgets/WidgetEditors';
import { HtmlBlockEditor, TableEditor } from './widgets/BlockEditors';
import { LINK_UNDERLINE_LABEL } from './link-label';

type Upd = (patch: NodeProps, key?: string) => void;

/** Nhóm "Nội dung" theo từng loại module. */
export function ContentSection({ node }: { node: LayoutNode }) {
  if (node.type === 'schedule') return <ScheduleEditor node={node} />;
  if (node.type === 'curriculum') return <CurriculumEditor node={node} />;
  if (node.type === 'progress') return <ProgressEditor node={node} />;
  if (node.type === 'table') return <TableEditor node={node} />;
  if (node.type === 'html') return <HtmlBlockEditor node={node} />;
  const st = useEditor.getState;
  const upd: Upd = (patch, key) => st().updateProps(node.id, patch, { key: key ? `prop:${node.id}:${key}` : undefined });
  const body = renderBody(node, upd);
  if (!body) return null;
  return <Section title="Nội dung" id="content">{body}</Section>;
}

function renderBody(node: LayoutNode, upd: Upd) {
  switch (node.type) {
    case 'container': return <ContainerContent node={node} upd={upd} />;
    case 'columns': return <ColumnsContent node={node} />;
    case 'column':
      return (
        <>
          <Hint>Cột thuộc module Columns. Tỷ lệ và số cột chỉnh ở module cha.</Hint>
          <Btn size="sm" onClick={() => { const p = useEditor.getState().index.get(node.id)?.parentId; if (p) useEditor.getState().select(p); }}>Chọn module Columns</Btn>
        </>
      );
    case 'grid': {
      const p = getProps(node, gridDef);
      return (
        <Field label="Rộng ô tối thiểu" hint="Số cột tự thay đổi theo độ rộng màn hình.">
          <NumberInput value={p.minColWidth} unit="px" min={60} max={1200} onChange={(v) => upd({ minColWidth: v ?? 220 }, 'min')} />
        </Field>
      );
    }
    case 'spacer': {
      const p = getProps(node, spacerDef);
      return <Field label="Chiều cao"><NumberInput value={p.height} unit="px" min={0} max={2000} onChange={(v) => upd({ height: v ?? 0 }, 'h')} /></Field>;
    }
    case 'divider': {
      const p = getProps(node, dividerDef);
      return (
        <>
          <Field label="Kiểu đường"><Select value={p.lineStyle} onChange={(v) => upd({ lineStyle: v })} options={[{ value: 'solid', label: 'Liền' }, { value: 'dashed', label: 'Gạch' }, { value: 'dotted', label: 'Chấm' }]} /></Field>
          <Field label="Độ dày"><NumberInput value={p.thickness} unit="px" min={1} max={40} onChange={(v) => upd({ thickness: v ?? 1 }, 't')} /></Field>
          <Field label="Màu"><ColorInput value={p.color} allowTransparent={false} onChange={(v) => upd({ color: v ?? '#d5dce3' })} /></Field>
        </>
      );
    }
    case 'heading': {
      const p = getProps(node, headingDef);
      return (
        <>
          <Field label="Nội dung"><TextInput value={p.text} maxLength={300} onChange={(v) => upd({ text: v }, 'text')} /></Field>
          <Field label="Cấp tiêu đề">
            <Segmented value={String(p.level)} onChange={(v) => upd({ level: Number(v) })} options={[1, 2, 3, 4, 5, 6].map((l) => ({ value: String(l), label: `H${l}` }))} />
          </Field>
          <Hint>Trong trang Canvas, H1 là tên trang; nội dung bài nên bắt đầu từ H2.</Hint>
          <Field label="Liên kết" stack hint={p.href && !safeHref(p.href) ? <span style={{ color: 'var(--danger)' }}>Liên kết không hợp lệ hoặc không an toàn, sẽ không được xuất.</span> : 'Cả dòng tiêu đề bấm được. Để trống nếu không cần. Trang trong Canvas: dán địa chỉ trên thanh trình duyệt.'}>
            <TextInput value={p.href} placeholder="https://.../courses/1234/pages/buoi-03" maxLength={2048} onChange={(v) => upd({ href: v.trim() }, 'href')} />
          </Field>
          {p.href && (
            <>
              <Field label="Mở liên kết">
                <Select value={p.target} onChange={(v) => upd({ target: v })} options={[{ value: 'auto', label: 'Tự động' }, { value: 'same', label: 'Cùng tab' }, { value: 'new', label: 'Tab mới' }]} />
              </Field>
              <Toggle checked={p.underline !== false} onChange={(v) => upd({ underline: v })} label={LINK_UNDERLINE_LABEL} />
              <Hint>Tự động: trang trong Canvas mở cùng tab, trang ngoài mở tab mới. Tiêu đề giữ màu và cỡ chữ như cũ.</Hint>
            </>
          )}
        </>
      );
    }
    case 'text': {
      const p = getProps(node, textDef);
      return (
        <>
          <Hint>Bấm vào văn bản trên trang để gõ. Bôi đen một phần chữ rồi dùng thanh định dạng phía trên để in đậm, đổi màu, tạo danh sách hoặc chèn liên kết.</Hint>
          <div style={{ fontWeight: 600, fontSize: 12.5, marginTop: 4 }}>Liên kết trong khối này</div>
          <Toggle checked={p.linkUnderline !== false} onChange={(v) => upd({ linkUnderline: v })} label={LINK_UNDERLINE_LABEL} />
          <Field label="Màu liên kết">
            <Segmented value={p.linkColor === 'inherit' ? 'inherit' : 'accent'} onChange={(v) => upd({ linkColor: v })} options={[{ value: 'accent', label: 'Màu nhấn' }, { value: 'inherit', label: 'Theo màu đoạn văn' }]} />
          </Field>
          <Hint>"Theo màu đoạn văn": liên kết giữ màu của đoạn văn. Nếu tắt gạch chân, nên giữ "Màu nhấn" cho liên kết nằm giữa đoạn văn để người học nhận ra chỗ bấm được.</Hint>
        </>
      );
    }
    case 'quote': {
      const p = getProps(node, quoteDef);
      return (
        <>
          <Field label="Trích dẫn" stack><TextArea value={p.text} rows={3} onChange={(v) => upd({ text: v }, 'text')} /></Field>
          <Field label="Nguồn"><TextInput value={p.cite} onChange={(v) => upd({ cite: v }, 'cite')} placeholder="Để trống nếu không cần" /></Field>
          <Field label="Màu vạch"><ColorInput value={p.barColor || undefined} allowTransparent={false} onChange={(v) => upd({ barColor: v ?? '' })} /></Field>
        </>
      );
    }
    case 'checklist': return <ChecklistContent node={node} upd={upd} />;
    case 'code': {
      const p = getProps(node, codeDef);
      return (
        <>
          <Field label="Tiêu đề"><TextInput value={p.title} placeholder="Không bắt buộc" onChange={(v) => upd({ title: v }, 'title')} /></Field>
          <Field label="Ngôn ngữ"><TextInput value={p.language} placeholder="C#, JSON, HTTP..." onChange={(v) => upd({ language: v }, 'lang')} /></Field>
          <Field label="Mã nguồn" stack><TextArea value={p.code} rows={8} mono onChange={(v) => upd({ code: v }, 'code')} /></Field>
          <Field label="Nút sao chép" hint="Chỉ có trong HTML độc lập; Canvas không chạy JavaScript."><Toggle checked={p.showCopy} onChange={(v) => upd({ showCopy: v })} /></Field>
        </>
      );
    }
    case 'image': return <ImageContent node={node} upd={upd} />;
    case 'video': {
      const p = getProps(node, videoDef);
      const embed = toEmbedUrl(p.url || '');
      return (
        <>
          <Field label="URL video" stack hint={p.url && !embed ? 'Chưa nhận dạng được. Hỗ trợ liên kết YouTube và Vimeo.' : embed ? `Nhận dạng: ${embed.provider === 'youtube' ? 'YouTube' : 'Vimeo'}` : undefined}>
            <TextInput value={p.url} placeholder="https://www.youtube.com/watch?v=..." onChange={(v) => upd({ url: v }, 'url')} />
          </Field>
          <Field label="Tiêu đề"><TextInput value={p.title} onChange={(v) => upd({ title: v }, 'title')} /></Field>
          <Field label="Tỷ lệ"><Segmented value={p.aspect} onChange={(v) => upd({ aspect: v })} options={[{ value: '16:9', label: '16:9' }, { value: '4:3', label: '4:3' }]} /></Field>
          {p.url && !embed && (
            <>
              <Toggle checked={p.linkUnderline !== false} onChange={(v) => upd({ linkUnderline: v })} label={LINK_UNDERLINE_LABEL} />
              <Hint>URL không phải YouTube, Vimeo nên được xuất thành liên kết "{p.title || 'Xem video'}".</Hint>
            </>
          )}
        </>
      );
    }
    case 'button': {
      const p = getProps(node, buttonDef);
      const bad = !!p.href && !safeHref(p.href);
      return (
        <>
          <Field label="Nhãn"><TextInput value={p.label} onChange={(v) => upd({ label: v }, 'label')} /></Field>
          <Field label="Liên kết" hint={bad ? 'Liên kết không hợp lệ hoặc không an toàn; sẽ xuất thành "#".' : undefined}>
            <TextInput value={p.href} placeholder="https://" onChange={(v) => upd({ href: v }, 'href')} />
          </Field>
          <Field label="Tab mới"><Toggle checked={p.newTab} onChange={(v) => upd({ newTab: v })} /></Field>
          <Field label="Vị trí"><Segmented value={p.position} onChange={(v) => upd({ position: v })} options={[{ value: 'left', label: 'Trái' }, { value: 'center', label: 'Giữa' }, { value: 'right', label: 'Phải' }]} /></Field>
        </>
      );
    }
    case 'callout': return <CalloutContent node={node} upd={upd} />;
  }
  return null;
}

function ContainerContent({ node, upd }: { node: LayoutNode; upd: Upd }) {
  const p = getProps(node, containerDef);
  return (
    <>
      <Field label="Hiện tiêu đề"><Toggle checked={p.showTitle} onChange={(v) => upd({ showTitle: v })} /></Field>
      {p.showTitle && (
        <>
          <Field label="Tiêu đề"><TextInput value={p.title} onChange={(v) => upd({ title: v }, 'title')} /></Field>
          <Field label="Cấp tiêu đề"><Segmented value={String(p.titleLevel)} onChange={(v) => upd({ titleLevel: Number(v) })} options={[2, 3, 4].map((l) => ({ value: String(l), label: `H${l}` }))} /></Field>
          <Field label="Màu tiêu đề"><ColorInput value={p.titleColor || undefined} allowTransparent={false} onChange={(v) => upd({ titleColor: v ?? '' })} /></Field>
        </>
      )}
      <Field label="Hướng xếp">
        <Segmented value={p.direction} onChange={(v) => upd({ direction: v })} options={[{ value: 'column', label: 'Dọc' }, { value: 'row', label: 'Ngang' }]} />
      </Field>
      <Field label="Căn phần tử">
        <Select value={p.alignItems} onChange={(v) => upd({ alignItems: v })} options={[{ value: 'stretch', label: 'Kéo giãn' }, { value: 'flex-start', label: 'Đầu' }, { value: 'center', label: 'Giữa' }, { value: 'flex-end', label: 'Cuối' }]} />
      </Field>
      <Field label="Thẻ HTML" hint="Canvas đổi section thành div; article được giữ nguyên.">
        <Select value={p.tag} onChange={(v) => upd({ tag: v })} options={[{ value: 'div', label: 'div' }, { value: 'section', label: 'section' }, { value: 'article', label: 'article' }]} />
      </Field>
    </>
  );
}

const RATIO_PRESETS: Record<number, string[]> = { 2: ['1:1', '1:2', '2:1', '1:3', '3:1'], 3: ['1:1:1', '1:2:1', '2:1:1', '1:1:2'], 4: ['1:1:1:1', '2:1:1:1', '1:1:1:2'] };

function ColumnsContent({ node }: { node: LayoutNode }) {
  const p = getProps(node, columnsDef);
  const st = useEditor.getState;
  const ratioText = (Array.isArray(p.ratios) ? p.ratios : []).join(':');
  const [text, setText] = useState(ratioText);
  const applyRatio = (v: string) => {
    setText(v);
    const parts = v.split(':').map((x) => Number(x.trim()));
    if (parts.length === p.count && parts.every((x) => Number.isFinite(x) && x > 0 && x <= 12)) st().setColumns(node.id, { ratios: parts });
  };
  return (
    <>
      <Field label="Số cột">
        <Segmented value={String(p.count)} onChange={(v) => { st().setColumns(node.id, { count: Number(v) }); setText(Array(Number(v)).fill(1).join(':')); }} options={[2, 3, 4].map((n) => ({ value: String(n), label: `${n} cột` }))} />
      </Field>
      <Field label="Tỷ lệ cột" hint="Ví dụ 1:2 nghĩa là cột phải rộng gấp đôi cột trái. Giảm số cột không làm mất nội dung: module được dồn sang cột cuối.">
        <TextInput value={text === ratioText ? ratioText : text} onChange={applyRatio} placeholder="1:1" />
      </Field>
      <div className={uiStyles.row} style={{ flexWrap: 'wrap' }}>
        {(RATIO_PRESETS[p.count] ?? []).map((r) => (
          <Btn key={r} size="sm" onClick={() => applyRatio(r)}>{r}</Btn>
        ))}
      </div>
      <Field label="Khoảng cách cột">
        <NumberInput value={node.style.gap} unit="px" min={0} max={200} onChange={(v) => st().updateStyle(node.id, { gap: v }, { key: `style:${node.id}:gap` })} />
      </Field>
      <Field label="Căn dọc">
        <Select value={p.valign} onChange={(v) => st().setColumns(node.id, { valign: v })} options={[{ value: 'stretch', label: 'Kéo giãn' }, { value: 'flex-start', label: 'Trên' }, { value: 'center', label: 'Giữa' }, { value: 'flex-end', label: 'Dưới' }]} />
      </Field>
      <Field label="Xếp dọc khi hẹp"><Toggle checked={p.stackOnMobile} onChange={(v) => st().setColumns(node.id, { stackOnMobile: v })} /></Field>
      {p.stackOnMobile && (
        <Field label="Rộng cột tối thiểu" hint="Khi màn hình không đủ chỗ cho độ rộng này, các cột tự xuống hàng (không cần JavaScript, hoạt động cả trong Canvas).">
          <NumberInput value={p.minColWidth} unit="px" min={60} max={1000} onChange={(v) => v !== undefined && st().setColumns(node.id, { minColWidth: v })} />
        </Field>
      )}
    </>
  );
}

function ChecklistContent({ node, upd }: { node: LayoutNode; upd: Upd }) {
  const p = getProps(node, checklistDef);
  const items = normalizeChecklistItems(p.items);
  const set = (next: typeof items, key?: string) => upd({ items: next }, key);
  return (
    <>
      {items.map((it, i) => (
        <div key={it.id} className={uiStyles.row}>
          <input type="checkbox" aria-label={`Đánh dấu mục ${i + 1}`} checked={it.checked} onChange={(e) => set(items.map((x, j) => (j === i ? { ...x, checked: e.target.checked } : x)))} />
          <div style={{ flex: 1 }}><TextInput ariaLabel={`Mục ${i + 1}`} value={it.text} onChange={(v) => set(items.map((x, j) => (j === i ? { ...x, text: v } : x)), `item-${it.id}`)} /></div>
          <IconBtn small label={`Xóa mục ${i + 1}`} onClick={() => set(items.filter((_, j) => j !== i))}><X size={13} /></IconBtn>
        </div>
      ))}
      <Btn size="sm" onClick={() => set([...items, { id: uid('c'), text: 'Mục mới', checked: false }])}><Plus size={13} /> Thêm mục</Btn>
      <Field label="Màu dấu"><ColorInput value={p.markColor || undefined} allowTransparent={false} onChange={(v) => upd({ markColor: v ?? '' })} /></Field>
    </>
  );
}

function ImageContent({ node, upd }: { node: LayoutNode; upd: Upd }) {
  const p = getProps(node, imageDef);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [autoResize, setAutoResize] = useState(true);
  const src = safeImageSrc(p.src);
  const embedded = !!src && isDataUrl(src);
  const urlValue = embedded ? '' : p.src;
  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const img = await loadImageFile(file, autoResize);
      upd({ src: img.src, alt: p.alt || file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ') });
      toast(img.resized ? `Đã chèn ảnh (thu nhỏ còn ${img.width}×${img.height}, ${formatBytes(img.bytes)}).` : `Đã chèn ảnh (${formatBytes(img.bytes)}).`);
    } catch (e) {
      toastError((e as Error).message);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };
  return (
    <>
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp,image/avif" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      <div className={uiStyles.row}>
        <Btn size="sm" variant="primary" disabled={busy} onClick={() => fileRef.current?.click()}><ImageUp size={14} /> {src ? 'Thay ảnh' : 'Chọn ảnh từ máy'}</Btn>
        {src && <Btn size="sm" variant="danger" onClick={() => upd({ src: '' })}><Trash2 size={13} /> Gỡ ảnh</Btn>}
      </div>
      <Toggle checked={autoResize} onChange={setAutoResize} label="Tự thu nhỏ ảnh lớn (tối đa 1600px)" />
      {embedded && (
        <div className={uiStyles.hint} style={{ color: 'var(--warn)' }}>
          Ảnh đang nhúng trong dự án ({formatBytes(dataUrlBytes(src!))}). Canvas sẽ xóa ảnh nhúng khi dán HTML: hãy tải ảnh lên Files của khóa học rồi dán URL vào ô dưới. Ảnh nhúng vẫn dùng tốt cho PNG và HTML độc lập.
        </div>
      )}
      <Field label="URL ảnh" stack hint={!embedded && p.src && !src ? 'URL không hợp lệ.' : !embedded && src ? 'Ảnh từ URL ngoài có thể không hiển thị nếu mất kết nối hoặc URL bị xóa.' : undefined}>
        <TextInput value={urlValue} placeholder="https://... (URL ảnh trong Canvas Files)" onChange={(v) => upd({ src: v.trim() }, 'src')} />
      </Field>
      <Field label="Alt text" stack hint="Mô tả ngắn nội dung ảnh cho người dùng trình đọc màn hình."><TextInput value={p.alt} onChange={(v) => upd({ alt: v }, 'alt')} /></Field>
      <Field label="Chú thích"><Toggle checked={p.showCaption} onChange={(v) => upd({ showCaption: v })} /></Field>
      {p.showCaption && <Field label="Nội dung" stack><TextInput value={p.caption} onChange={(v) => upd({ caption: v }, 'caption')} /></Field>}
      <Field label="Cách lấp đầy" hint="Chỉ có tác dụng khi đặt chiều cao cố định. Canvas không giữ object-fit.">
        <Select value={p.fit} onChange={(v) => upd({ fit: v })} options={[{ value: 'cover', label: 'Phủ kín (cắt)' }, { value: 'contain', label: 'Vừa khung' }, { value: 'fill', label: 'Kéo giãn' }]} />
      </Field>
    </>
  );
}

function CalloutContent({ node, upd }: { node: LayoutNode; upd: Upd }) {
  const p = getProps(node, calloutDef);
  const st = useEditor.getState;
  const changeVariant = (id: string) => {
    const prev = getCalloutVariant(p.variant);
    const v = getCalloutVariant(id);
    const patch: NodeProps = { variant: id, titleColor: v.titleColor, icon: p.icon === prev.emoji ? v.emoji : p.icon };
    // Chỉ đổi tiêu đề nếu người dùng chưa tự đặt.
    if (p.title === prev.title) patch.title = v.title;
    const cs = calloutStyle(id);
    // Một bước lịch sử cho cả nội dung và màu.
    st().commit((d) => {
      const loc = locate(d.nodes as LayoutNode[], node.id);
      if (!loc || loc.node.locked) return;
      Object.assign(loc.node.props, patch);
      loc.node.style.bg = cs.bg;
      loc.node.style.borderLeftColor = cs.borderLeftColor;
    });
  };
  return (
    <>
      <Field label="Loại khối">
        <Select value={p.variant} onChange={changeVariant} options={CALLOUT_VARIANTS.map((v) => ({ value: v.id, label: `${v.emoji} ${v.label}` }))} />
      </Field>
      <Field label="Hiện tiêu đề"><Toggle checked={p.showTitle} onChange={(v) => upd({ showTitle: v })} /></Field>
      {p.showTitle && <Field label="Tiêu đề"><TextInput value={p.title} onChange={(v) => upd({ title: v }, 'title')} /></Field>}
      <Field label="Hiện biểu tượng"><Toggle checked={p.showIcon} onChange={(v) => upd({ showIcon: v })} /></Field>
      {p.showIcon && (
        <Field label="Biểu tượng" hint="Dùng emoji vì Canvas không cho nhúng SVG.">
          <div className={uiStyles.row} style={{ flexWrap: 'wrap' }}>
            <div style={{ width: 56 }}><TextInput value={p.icon} maxLength={8} onChange={(v) => upd({ icon: v }, 'icon')} /></div>
            {['🎯', '🔑', '📝', '❗', '⚠️', '💡', '✍️', '❓', '📌', '🔗', '💬', '✅'].map((e) => (
              <button key={e} type="button" className={uiStyles.iconBtn} style={{ width: 26, height: 26 }} aria-label={`Biểu tượng ${e}`} onClick={() => upd({ icon: e })}>{e}</button>
            ))}
          </div>
        </Field>
      )}
      <Field label="Màu tiêu đề"><ColorInput value={p.titleColor || undefined} allowTransparent={false} onChange={(v) => upd({ titleColor: v ?? '' })} /></Field>
      <Hint>Phần thân là vùng chứa: có thể kéo thêm văn bản, ảnh, code vào bên trong.</Hint>
    </>
  );
}

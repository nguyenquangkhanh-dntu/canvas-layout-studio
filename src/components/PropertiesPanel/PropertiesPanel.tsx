import { useState } from 'react';
import { Bookmark, ClipboardPaste, Copy, ImageDown, Lock, LockOpen, MousePointer2, Paintbrush, RotateCcw, Save, Trash2 } from 'lucide-react';
import { useEditor } from '../../editor/store';
import { getDef } from '../../modules/registry';
import type { InspectorGroup } from '../../modules/types';
import type { StyleProps } from '../../models/style';
import { THEME_PRESETS } from '../../models/presets';
import { BackgroundGroup, BorderGroup, LayoutGroup, ShadowGroup, SpacingGroup, TypographyGroup, type StylePatch } from './StyleGroups';
import { ContentSection } from './ContentEditors';
import { PageCourseSections } from './widgets/WidgetEditors';
import { Btn, ColorInput, Field, Hint, IconBtn, NumberInput, Section, Select, TextInput, Toggle, uiStyles } from '../ui/controls';
import { ModuleIcon } from '../Icon';
import { toast } from '../ui/Toasts';
import { useDialogs } from '../dialogs';
import s from './PropertiesPanel.module.css';

export function PropertiesPanel() {
  const info = useEditor((st) => (st.selectedId ? st.index.get(st.selectedId) : undefined));
  if (!info) return <PageSettingsPanel />;
  return <NodePanel key={info.node.id} id={info.node.id} />;
}

function NodePanel({ id }: { id: string }) {
  const node = useEditor((st) => st.index.get(id)?.node);
  const styleClipboard = useEditor((st) => st.styleClipboard);
  if (!node) return null;
  const def = getDef(node.type);
  const st = useEditor.getState;
  const has = (g: InspectorGroup) => def.groups.includes(g);
  const onStyle: StylePatch = (patch, key) => st().updateStyle(id, patch, { key: `style:${id}:${key ?? Object.keys(patch).join(',')}` });

  return (
    <div className={s.panel}>
      <header className={s.head}>
        <span className={s.headIcon}><ModuleIcon name={def.icon} size={16} /></span>
        <div className={s.headText}>
          <strong>{node.name}</strong>
          <span>{def.label}</span>
        </div>
        <IconBtn label="Sao chép style" onClick={() => { st().copyStyle(id); toast('Đã sao chép style.'); }}><Paintbrush size={15} /></IconBtn>
        <IconBtn label="Dán style" disabled={!styleClipboard || node.locked} onClick={() => st().pasteStyle(id)}><ClipboardPaste size={15} /></IconBtn>
      </header>

      {node.locked && (
        <div className={s.lockNote}>
          <Lock size={14} /> Module đang khóa nên không chỉnh sửa được.
          <Btn size="sm" onClick={() => st().toggleLocked(id)}><LockOpen size={13} /> Mở khóa</Btn>
        </div>
      )}

      <Section title="Thông tin" id="info">
        <Field label="Tên module" hint="Chỉ dùng trong trình thiết kế, không xuất ra bài học.">
          <TextInput value={node.name} maxLength={120} onChange={(v) => st().rename(id, v)} />
        </Field>
        <Field label="Loại"><span className={s.mono}>{def.label}</span></Field>
        <Field label="ID"><span className={s.mono}>{node.id}</span></Field>
        <Field label="Hiển thị" hint={node.hidden ? 'Module ẩn vẫn nằm trong cấu trúc nhưng không xuất hiện trong bản xem trước, HTML và PNG.' : undefined}>
          <Toggle checked={!node.hidden} onChange={() => st().toggleHidden(id)} label={node.hidden ? 'Đang ẩn' : 'Đang hiện'} />
        </Field>
        <Field label="Khóa">
          <Toggle checked={!!node.locked} onChange={() => st().toggleLocked(id)} label={node.locked ? 'Đã khóa' : 'Có thể sửa'} />
        </Field>
      </Section>

      <fieldset className={s.fieldset} disabled={!!node.locked}>
        <ContentSection node={node} />
        <StylePresetSection id={id} />
        {(has('layout') || has('flex')) && <LayoutGroup style={node.style} onChange={onStyle} showAlign={node.type !== 'column'} />}
        {has('typography') && <TypographyGroup style={node.style} onChange={onStyle} paragraph={node.type === 'text'} />}
        {has('background') && <BackgroundGroup style={node.style} onChange={onStyle} />}
        {has('border') && <BorderGroup style={node.style} onChange={onStyle} leftBar={node.type === 'callout' || node.type === 'container'} />}
        {has('shadow') && <ShadowGroup style={node.style} onChange={onStyle} />}
        {has('spacing') && (
          <SpacingGroup
            style={node.style}
            onChange={onStyle}
            showPadding={node.type !== 'spacer' && node.type !== 'divider'}
            showGap={['container', 'column', 'grid', 'callout', 'checklist', 'code'].includes(node.type)}
          />
        )}
      </fieldset>
      <AdvancedSection id={id} />
    </div>
  );
}

function StylePresetSection({ id }: { id: string }) {
  const presets = useEditor((st) => st.stylePresets);
  const [themeId, setThemeId] = useState(THEME_PRESETS[0].id);
  const [presetId, setPresetId] = useState('');
  const [name, setName] = useState('');
  const st = useEditor.getState;
  return (
    <Section title="Phong cách" id="presets" defaultOpen={false}>
      <Field label="Mẫu giao diện">
        <div className={uiStyles.row}>
          <Select value={themeId} onChange={setThemeId} options={THEME_PRESETS.map((t) => ({ value: t.id, label: t.name }))} />
          <Btn size="sm" onClick={() => st().applyTheme(themeId, 'node', id)}>Áp dụng</Btn>
        </div>
      </Field>
      <Hint>{THEME_PRESETS.find((t) => t.id === themeId)?.description}. Chỉ đổi phong cách, nội dung giữ nguyên.</Hint>
      {presets.length > 0 && (
        <Field label="Preset đã lưu">
          <div className={uiStyles.row}>
            <Select value={presetId} onChange={setPresetId} options={[{ value: '', label: 'Chọn preset...' }, ...presets.map((p) => ({ value: p.id, label: p.name }))]} />
            <Btn size="sm" disabled={!presetId} onClick={() => st().applyStylePreset(presetId, id)}>Áp dụng</Btn>
            <IconBtn small label="Xóa preset" disabled={!presetId} onClick={() => { st().deleteStylePreset(presetId); setPresetId(''); }}><Trash2 size={13} /></IconBtn>
          </div>
        </Field>
      )}
      <Field label="Lưu preset">
        <div className={uiStyles.row}>
          <TextInput value={name} placeholder="Tên preset" onChange={setName} />
          <Btn size="sm" onClick={() => { const p = st().saveStylePreset(name, id); if (p) { toast(`Đã lưu preset "${p.name}".`); setName(''); } }}><Save size={13} /> Lưu</Btn>
        </div>
      </Field>
      <div className={uiStyles.row}>
        <Btn size="sm" onClick={() => { st().copyStyle(id); toast('Đã sao chép style.'); }}><Copy size={13} /> Sao chép style</Btn>
        <Btn size="sm" onClick={() => st().resetStyle(id)}><RotateCcw size={13} /> Đặt lại mặc định</Btn>
      </div>
    </Section>
  );
}

function AdvancedSection({ id }: { id: string }) {
  const info = useEditor((st) => st.index.get(id));
  const [tplName, setTplName] = useState('');
  const open = useDialogs((d) => d.open);
  if (!info) return null;
  const st = useEditor.getState;
  const isColumn = info.node.type === 'column';
  return (
    <Section title="Nâng cao" id="advanced" defaultOpen={false}>
      {!isColumn && (
        <Field label="Lưu thành mẫu" hint="Mẫu gồm module này và mọi module bên trong, xuất hiện ở nhóm 'Mẫu của tôi'.">
          <div className={uiStyles.row}>
            <TextInput value={tplName} placeholder={info.node.name} onChange={setTplName} />
            <Btn size="sm" onClick={() => { const t = st().saveTemplate(id, tplName || info.node.name); if (t) { toast(`Đã lưu mẫu "${t.name}".`); setTplName(''); } }}><Bookmark size={13} /> Lưu</Btn>
          </div>
        </Field>
      )}
      <div className={uiStyles.row} style={{ flexWrap: 'wrap' }}>
        <Btn size="sm" onClick={() => open('export', { tab: 'png', scope: 'node' })}><ImageDown size={13} /> Xuất PNG module này</Btn>
        {info.parentId && <Btn size="sm" onClick={() => st().select(info.parentId)}><MousePointer2 size={13} /> Chọn module cha</Btn>}
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ Khi chưa chọn module */

function PageSettingsPanel() {
  const page = useEditor((st) => st.project.page);
  const [themeId, setThemeId] = useState(page.themeId ?? THEME_PRESETS[0].id);
  const st = useEditor.getState;
  const onStyle: StylePatch = (patch, key) => st().updatePageStyle(patch, { key: `page:${key ?? Object.keys(patch).join(',')}` });
  const ps: StyleProps = page.style;
  return (
    <div className={s.panel}>
      <div className={s.empty}>
        <MousePointer2 size={20} />
        <p>Chọn một module trên trang hoặc trong bảng Cấu trúc để chỉnh sửa thuộc tính.</p>
      </div>
      <Section title="Mẫu giao diện cho toàn trang" id="page-theme">
        <div className={s.themes}>
          {THEME_PRESETS.map((t) => (
            <button key={t.id} type="button" className={s.theme} aria-pressed={themeId === t.id} onClick={() => setThemeId(t.id)}>
              <span className={s.themeSwatch} style={{ background: t.page.bg ?? '#fff' }}>
                <span style={{ background: t.container.bg, borderColor: t.container.borderStyle === 'solid' ? t.container.borderColor : 'transparent', borderRadius: Math.min(8, t.container.radius?.tl ?? 0) }} />
                <i style={{ background: t.accent }} />
              </span>
              {t.name}
            </button>
          ))}
        </div>
        <Hint>{THEME_PRESETS.find((t) => t.id === themeId)?.description}. Áp dụng cho trang và mọi Container, giữ nguyên nội dung.</Hint>
        <Btn variant="primary" size="sm" onClick={() => { st().applyTheme(themeId, 'page'); toast('Đã áp dụng mẫu giao diện cho toàn trang.'); }}>Áp dụng cho toàn trang</Btn>
      </Section>
      <Section title="Cài đặt trang" id="page">
        <Field label="Màu nhấn" hint="Dùng cho nút, liên kết, dấu checklist, vạch trích dẫn.">
          <ColorInput value={page.accent} allowTransparent={false} onChange={(v) => v && st().setPage({ accent: v }, { key: 'page-accent' })} />
        </Field>
        <Field label="Màu tiêu đề">
          <ColorInput value={page.headingColor} allowTransparent={false} onChange={(v) => v && st().setPage({ headingColor: v }, { key: 'page-heading' })} />
        </Field>
        <Field label="Cách module">
          <NumberInput value={ps.gap} unit="px" min={0} max={200} onChange={(v) => onStyle({ gap: v }, 'gap')} />
        </Field>
      </Section>
      <div className={s.groupLabel}>Khóa học (dùng cho Lịch học, Tiến độ, Chương trình học)</div>
      <PageCourseSections />
      <div className={s.groupLabel}>Kiểu dáng trang</div>
      <LayoutGroup style={ps} onChange={onStyle} sizes={['maxWidth']} />
      <TypographyGroup style={ps} onChange={onStyle} />
      <BackgroundGroup style={ps} onChange={onStyle} />
      <SpacingGroup style={ps} onChange={onStyle} />
    </div>
  );
}

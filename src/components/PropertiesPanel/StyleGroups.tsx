import { AlignCenter, AlignJustify, AlignLeft, AlignRight } from 'lucide-react';
import {
  ColorInput, CornersInput, Field, Hint, NumberInput, Section, Segmented, Select, SidesInput, SizeInput, Toggle,
} from '../ui/controls';
import { FONT_STACKS, SIZE_KEYS, shadowFromPreset, type BorderStyle, type ShadowPreset, type SizeKey, type StyleProps } from '../../models/style';

export type StylePatch = (patch: Partial<StyleProps>, key?: string) => void;

interface GroupProps {
  style: StyleProps;
  onChange: StylePatch;
}

const SIZE_LABELS: Record<SizeKey, string> = {
  width: 'Rộng', maxWidth: 'Rộng tối đa', minWidth: 'Rộng tối thiểu', height: 'Cao', minHeight: 'Cao tối thiểu', maxHeight: 'Cao tối đa',
};

export function LayoutGroup({ style, onChange, sizes = SIZE_KEYS as unknown as SizeKey[], showAlign = true }: GroupProps & { sizes?: SizeKey[]; showAlign?: boolean }) {
  return (
    <Section title="Bố cục" id="layout">
      {sizes.map((k) => (
        <Field key={k} label={SIZE_LABELS[k]}>
          <SizeInput ariaLabel={SIZE_LABELS[k]} value={style[k]} onChange={(v) => onChange({ [k]: v }, `size-${k}`)} />
        </Field>
      ))}
      {showAlign && (
        <Field label="Căn khối">
          <Segmented
            ariaLabel="Căn khối"
            value={style.align ?? 'none'}
            onChange={(v) => onChange({ align: v === 'none' ? undefined : (v as StyleProps['align']) })}
            options={[
              { value: 'none', label: 'Tự do', title: 'Không căn (mặc định)' },
              { value: 'left', label: <AlignLeft size={14} />, title: 'Căn trái' },
              { value: 'center', label: <AlignCenter size={14} />, title: 'Căn giữa' },
              { value: 'right', label: <AlignRight size={14} />, title: 'Căn phải' },
            ]}
          />
        </Field>
      )}
      {showAlign && <Hint>Căn khối có tác dụng khi module hẹp hơn vùng chứa (đặt "Rộng tối đa").</Hint>}
    </Section>
  );
}

export function TypographyGroup({ style, onChange, paragraph }: GroupProps & { paragraph?: boolean }) {
  return (
    <Section title="Chữ" id="typography">
      <Field label="Font">
        <Select
          value={style.fontFamily ?? ''}
          onChange={(v) => onChange({ fontFamily: v || undefined })}
          options={[{ value: '', label: 'Kế thừa' }, ...FONT_STACKS.map((f) => ({ value: f.value, label: f.label }))]}
        />
      </Field>
      <Field label="Cỡ chữ">
        <NumberInput value={style.fontSize} unit="px" min={6} max={200} onChange={(v) => onChange({ fontSize: v }, 'fontSize')} />
      </Field>
      <Field label="Độ đậm">
        <Select
          value={style.fontWeight ?? 0}
          onChange={(v) => onChange({ fontWeight: v || undefined })}
          options={[{ value: 0, label: 'Kế thừa' }, { value: 300, label: '300 Mảnh' }, { value: 400, label: '400 Thường' }, { value: 500, label: '500' }, { value: 600, label: '600 Đậm vừa' }, { value: 700, label: '700 Đậm' }, { value: 800, label: '800' }]}
        />
      </Field>
      <Field label="Kiểu">
        <Segmented
          value={style.fontStyle ?? 'inherit'}
          onChange={(v) => onChange({ fontStyle: v === 'inherit' ? undefined : (v as 'normal' | 'italic') })}
          options={[{ value: 'inherit', label: 'Kế thừa' }, { value: 'normal', label: 'Thường' }, { value: 'italic', label: <i>Nghiêng</i> }]}
        />
      </Field>
      <Field label="Giãn dòng">
        <NumberInput value={style.lineHeight} step={0.05} min={0.5} max={5} onChange={(v) => onChange({ lineHeight: v }, 'lineHeight')} />
      </Field>
      <Field label="Giãn chữ" hint="Canvas không giữ thuộc tính này.">
        <NumberInput value={style.letterSpacing} unit="px" step={0.1} min={-20} max={50} onChange={(v) => onChange({ letterSpacing: v }, 'letterSpacing')} />
      </Field>
      {paragraph && (
        <Field label="Cách đoạn">
          <NumberInput value={style.paragraphSpacing} unit="px" min={0} max={200} onChange={(v) => onChange({ paragraphSpacing: v }, 'paragraphSpacing')} />
        </Field>
      )}
      <Field label="Căn chữ">
        <Segmented
          ariaLabel="Căn chữ"
          value={style.textAlign ?? 'inherit'}
          onChange={(v) => onChange({ textAlign: v === 'inherit' ? undefined : (v as StyleProps['textAlign']) })}
          options={[
            { value: 'inherit', label: '-', title: 'Kế thừa' },
            { value: 'left', label: <AlignLeft size={14} />, title: 'Trái' },
            { value: 'center', label: <AlignCenter size={14} />, title: 'Giữa' },
            { value: 'right', label: <AlignRight size={14} />, title: 'Phải' },
            { value: 'justify', label: <AlignJustify size={14} />, title: 'Đều hai bên' },
          ]}
        />
      </Field>
      <Field label="Màu chữ">
        <ColorInput ariaLabel="Màu chữ" value={style.color} allowTransparent={false} onChange={(v) => onChange({ color: v })} />
      </Field>
    </Section>
  );
}

export function BackgroundGroup({ style, onChange }: GroupProps) {
  const g = style.gradient;
  return (
    <Section title="Nền" id="background">
      <Field label="Màu nền">
        <ColorInput ariaLabel="Màu nền" value={style.bg} onChange={(v) => onChange({ bg: v })} />
      </Field>
      <Field label="Gradient">
        <Toggle
          checked={!!g}
          onChange={(on) => onChange({ gradient: on ? { from: style.bg && style.bg !== 'transparent' ? style.bg : '#e2edf6', to: '#ffffff', angle: 135 } : undefined })}
        />
      </Field>
      {g && (
        <>
          <Field label="Từ màu"><ColorInput ariaLabel="Màu bắt đầu" value={g.from} allowTransparent={false} onChange={(v) => v && onChange({ gradient: { ...g, from: v } })} /></Field>
          <Field label="Đến màu"><ColorInput ariaLabel="Màu kết thúc" value={g.to} allowTransparent={false} onChange={(v) => v && onChange({ gradient: { ...g, to: v } })} /></Field>
          <Field label="Góc"><NumberInput value={g.angle} unit="°" min={-360} max={360} onChange={(v) => onChange({ gradient: { ...g, angle: v ?? 135 } }, 'gradient-angle')} /></Field>
        </>
      )}
    </Section>
  );
}

export function BorderGroup({ style, onChange, leftBar }: GroupProps & { leftBar?: boolean }) {
  const bs = style.borderStyle;
  return (
    <Section title="Viền và bo góc" id="border">
      <Field label="Kiểu viền">
        <Select<BorderStyle | ''>
          value={bs ?? ''}
          onChange={(v) => onChange(v ? { borderStyle: v, borderWidth: style.borderWidth ?? 1, borderColor: style.borderColor ?? '#d0d7de' } : { borderStyle: undefined })}
          options={[{ value: '', label: 'Mặc định' }, { value: 'none', label: 'Không viền' }, { value: 'solid', label: 'Liền' }, { value: 'dashed', label: 'Gạch' }, { value: 'dotted', label: 'Chấm' }]}
        />
      </Field>
      {bs && bs !== 'none' && (
        <>
          <Field label="Độ dày"><NumberInput value={style.borderWidth} unit="px" min={0} max={100} onChange={(v) => onChange({ borderWidth: v }, 'borderWidth')} /></Field>
          <Field label="Màu viền"><ColorInput ariaLabel="Màu viền" value={style.borderColor} onChange={(v) => onChange({ borderColor: v })} /></Field>
        </>
      )}
      {leftBar && (
        <>
          <Field label="Vạch trái"><NumberInput value={style.borderLeftWidth} unit="px" min={0} max={40} onChange={(v) => onChange({ borderLeftWidth: v }, 'borderLeftWidth')} /></Field>
          <Field label="Màu vạch"><ColorInput ariaLabel="Màu vạch trái" value={style.borderLeftColor} allowTransparent={false} onChange={(v) => onChange({ borderLeftColor: v })} /></Field>
        </>
      )}
      <CornersInput value={style.radius} onChange={(v) => onChange({ radius: v }, 'radius')} />
    </Section>
  );
}

export function ShadowGroup({ style, onChange }: GroupProps) {
  const sh = style.shadow;
  const preset: ShadowPreset | 'inherit' = sh?.preset ?? 'inherit';
  return (
    <Section title="Bóng đổ" id="shadow" defaultOpen={false}>
      <Segmented
        ariaLabel="Mức bóng đổ"
        value={preset}
        onChange={(v) => onChange({ shadow: v === 'inherit' ? undefined : shadowFromPreset(v as ShadowPreset, sh) })}
        options={[
          { value: 'none', label: 'Không' },
          { value: 'sm', label: 'Nhẹ' },
          { value: 'md', label: 'Vừa' },
          { value: 'lg', label: 'Mạnh' },
          { value: 'custom', label: 'Tùy chỉnh' },
        ]}
      />
      {sh && sh.preset === 'custom' && (
        <>
          <Field label="Lệch X"><NumberInput value={sh.x} unit="px" onChange={(v) => onChange({ shadow: { ...sh, x: v ?? 0 } }, 'shadow')} /></Field>
          <Field label="Lệch Y"><NumberInput value={sh.y} unit="px" onChange={(v) => onChange({ shadow: { ...sh, y: v ?? 0 } }, 'shadow')} /></Field>
          <Field label="Độ nhòe"><NumberInput value={sh.blur} unit="px" min={0} onChange={(v) => onChange({ shadow: { ...sh, blur: v ?? 0 } }, 'shadow')} /></Field>
          <Field label="Độ lan"><NumberInput value={sh.spread} unit="px" onChange={(v) => onChange({ shadow: { ...sh, spread: v ?? 0 } }, 'shadow')} /></Field>
          <Field label="Màu bóng"><ColorInput ariaLabel="Màu bóng" value={sh.color} allowTransparent={false} onChange={(v) => v && onChange({ shadow: { ...sh, color: v } })} /></Field>
        </>
      )}
      <Hint>Canvas loại bỏ bóng đổ khi lưu trang; bóng chỉ giữ trong HTML độc lập và PNG.</Hint>
    </Section>
  );
}

export function SpacingGroup({ style, onChange, showPadding = true, showGap }: GroupProps & { showPadding?: boolean; showGap?: boolean }) {
  return (
    <Section title="Khoảng cách" id="spacing">
      {showPadding && <SidesInput label="Đệm trong (padding)" value={style.padding} onChange={(v) => onChange({ padding: v }, 'padding')} />}
      <SidesInput label="Lề ngoài (margin)" value={style.margin} onChange={(v) => onChange({ margin: v }, 'margin')} />
      {showGap && (
        <Field label="Khoảng cách con">
          <NumberInput value={style.gap} unit="px" min={0} max={500} onChange={(v) => onChange({ gap: v }, 'gap')} />
        </Field>
      )}
    </Section>
  );
}

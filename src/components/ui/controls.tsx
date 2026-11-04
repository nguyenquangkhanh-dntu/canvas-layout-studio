import { cloneElement, createContext, isValidElement, useContext, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight, Link2, Link2Off } from 'lucide-react';
import s from './ui.module.css';
import type { Corners, Sides, SizeUnit, SizeValue } from '../../models/style';
import { SWATCHES } from '../../models/style';
import { safeColor } from '../../services/safe-values';

export { s as uiStyles };

/* ------------------------------------------------------------------ Nút */

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'primary' | 'danger'; size?: 'sm'; block?: boolean };

export function Btn({ variant = 'default', size, block, className, ...rest }: BtnProps) {
  const cls = [s.btn, variant === 'primary' && s.primary, variant === 'danger' && s.danger, size === 'sm' && s.small, block && s.block, className].filter(Boolean).join(' ');
  return <button type="button" className={cls} {...rest} />;
}

type IconBtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; pressed?: boolean; small?: boolean };

/** Nút biểu tượng luôn có nhãn cho trình đọc màn hình và tooltip. */
export function IconBtn({ label, pressed, small, className, ...rest }: IconBtnProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed === undefined ? undefined : pressed}
      className={[s.iconBtn, small && s.iconBtnSm, className].filter(Boolean).join(' ')}
      {...rest}
    />
  );
}

/* ------------------------------------------------------------------ Nhóm thu gọn */

export function Section({ title, children, defaultOpen = true, right, id }: { title: string; children: ReactNode; defaultOpen?: boolean; right?: ReactNode; id?: string }) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();
  return (
    <section className={s.section} data-section={id}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button type="button" className={s.sectionHead} aria-expanded={open} aria-controls={bodyId} onClick={() => setOpen(!open)}>
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          {title}
        </button>
        {right && <div style={{ paddingRight: 10 }}>{right}</div>}
      </div>
      {open && <div id={bodyId} className={s.sectionBody}>{children}</div>}
    </section>
  );
}

/** Cho các điều khiển không phải ô nhập (nhóm nút, công tắc) biết nhãn của Field chứa nó. */
const FieldCtx = createContext<{ id: string; labelId: string } | null>(null);

export function Field({ label, children, stack, hint }: { label: string; children: ReactNode; stack?: boolean; hint?: ReactNode }) {
  const id = useId();
  const labelId = `${id}-l`;
  return (
    <FieldCtx.Provider value={{ id, labelId }}>
      <div className={stack ? s.fieldStack : s.field}>
        <label className={s.label} htmlFor={id} id={labelId}>{label}</label>
        <div style={{ minWidth: 0 }}>{withId(children, id)}{hint && <div className={s.hint} style={{ marginTop: 4 }}>{hint}</div>}</div>
      </div>
    </FieldCtx.Provider>
  );
}

/** Gắn id vào phần tử điều khiển để <label> trỏ đúng. */
function withId(children: ReactNode, id: string): ReactNode {
  if (isValidElement<{ id?: string }>(children) && !children.props.id) return cloneElement(children, { id });
  return children;
}

export function Hint({ children }: { children: ReactNode }) {
  return <div className={s.hint}>{children}</div>;
}

/* ------------------------------------------------------------------ Ô nhập */

export function TextInput({ value, onChange, id, placeholder, disabled, mono, maxLength = 500, ariaLabel }: {
  value: string; onChange: (v: string) => void; id?: string; placeholder?: string; disabled?: boolean; mono?: boolean; maxLength?: number; ariaLabel?: string;
}) {
  return (
    <input
      id={id}
      aria-label={ariaLabel}
      className={[s.input, mono && s.mono].filter(Boolean).join(' ')}
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      maxLength={maxLength}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function TextArea({ value, onChange, id, rows = 4, mono, disabled, placeholder, ariaLabel }: {
  value: string; onChange: (v: string) => void; id?: string; rows?: number; mono?: boolean; disabled?: boolean; placeholder?: string; ariaLabel?: string;
}) {
  return (
    <textarea
      id={id}
      aria-label={ariaLabel}
      rows={rows}
      className={[s.textarea, mono && s.mono].filter(Boolean).join(' ')}
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      spellCheck={!mono}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

/**
 * Ô số: cho phép xóa trống (= không thiết lập), giữ chuỗi đang gõ dở,
 * chỉ báo thay đổi khi là số hợp lệ. 0 là giá trị hợp lệ.
 */
export function NumberInput({ value, onChange, id, unit, min, max, step = 1, placeholder, disabled, ariaLabel }: {
  value: number | undefined; onChange: (v: number | undefined) => void; id?: string; unit?: string; min?: number; max?: number;
  step?: number; placeholder?: string; disabled?: boolean; ariaLabel?: string;
}) {
  const [text, setText] = useState(value === undefined ? '' : String(value));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setText(value === undefined ? '' : String(value));
  }, [value]);
  const commit = (raw: string) => {
    setText(raw);
    if (raw.trim() === '') return onChange(undefined);
    const n = Number(raw.replace(',', '.'));
    if (!Number.isFinite(n)) return;
    const clamped = Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n));
    onChange(clamped);
  };
  return (
    <div className={s.numWrap}>
      <input
        id={id}
        aria-label={ariaLabel}
        className={s.input}
        inputMode="decimal"
        type="number"
        value={text}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder ?? '-'}
        disabled={disabled}
        onFocus={() => { focused.current = true; }}
        onBlur={() => { focused.current = false; setText(value === undefined ? '' : String(value)); }}
        onChange={(e) => commit(e.target.value)}
      />
      {unit && <span className={s.unit}>{unit}</span>}
    </div>
  );
}

export function SizeInput({ value, onChange, id, disabled, ariaLabel }: { value: SizeValue | undefined; onChange: (v: SizeValue | undefined) => void; id?: string; disabled?: boolean; ariaLabel?: string }) {
  const unit: SizeUnit = value?.unit ?? 'px';
  return (
    <div className={s.row}>
      <div style={{ flex: 1 }}>
        <NumberInput
          id={id}
          ariaLabel={ariaLabel}
          value={value?.unit === 'auto' ? undefined : value?.value}
          disabled={disabled || unit === 'auto'}
          min={0}
          placeholder={value?.unit === 'auto' ? 'auto' : '-'}
          onChange={(n) => onChange(n === undefined ? undefined : { value: n, unit: unit === 'auto' ? 'px' : unit })}
        />
      </div>
      <select
        aria-label="Đơn vị"
        className={s.select}
        style={{ width: 64 }}
        value={value ? unit : ''}
        disabled={disabled}
        onChange={(e) => {
          const u = e.target.value as SizeUnit | '';
          if (!u) return onChange(undefined);
          if (u === 'auto') return onChange({ value: 0, unit: 'auto' });
          onChange({ value: value && value.unit !== 'auto' ? value.value : u === '%' ? 100 : u === 'rem' ? 20 : 320, unit: u });
        }}
      >
        <option value="">-</option>
        <option value="px">px</option>
        <option value="%">%</option>
        <option value="rem">rem</option>
        <option value="auto">auto</option>
      </select>
    </div>
  );
}

export function Select<T extends string | number>({ value, onChange, options, id, disabled, ariaLabel }: {
  value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; id?: string; disabled?: boolean; ariaLabel?: string;
}) {
  return (
    <select
      id={id}
      aria-label={ariaLabel}
      className={s.select}
      value={String(value)}
      disabled={disabled}
      onChange={(e) => {
        const opt = options.find((o) => String(o.value) === e.target.value);
        if (opt) onChange(opt.value);
      }}
    >
      {options.map((o) => (
        <option key={String(o.value)} value={String(o.value)}>{o.label}</option>
      ))}
    </select>
  );
}

export function Toggle({ checked, onChange, label, disabled, id }: { checked: boolean; onChange: (v: boolean) => void; label?: string; disabled?: boolean; id?: string }) {
  const field = useContext(FieldCtx);
  return (
    <label className={s.toggle}>
      <input
        id={id ?? field?.id}
        type="checkbox"
        role="switch"
        aria-labelledby={field && !label ? field.labelId : undefined}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className={s.track} aria-hidden="true" />
      {label && <span>{label}</span>}
    </label>
  );
}

export function Segmented<T extends string>({ value, onChange, options, disabled, ariaLabel }: {
  value: T | undefined; onChange: (v: T) => void; options: { value: T; label: ReactNode; title?: string }[]; disabled?: boolean; ariaLabel?: string;
}) {
  const field = useContext(FieldCtx);
  return (
    <div className={s.segmented} role="group" aria-label={ariaLabel} aria-labelledby={!ariaLabel && field ? field.labelId : undefined}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} title={o.title} aria-label={o.title} disabled={disabled} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ Bốn cạnh / bốn góc */

export function SidesInput({ value, onChange, disabled, label }: { value: Sides | undefined; onChange: (v: Sides | undefined) => void; disabled?: boolean; label: string }) {
  const v = value ?? {};
  const allSame = v.t === v.r && v.r === v.b && v.b === v.l;
  const [linked, setLinked] = useState(allSame);
  const set = (k: keyof Sides, n: number | undefined) => {
    const next: Sides = linked ? { t: n, r: n, b: n, l: n } : { ...v, [k]: n };
    const clean = Object.fromEntries(Object.entries(next).filter(([, x]) => x !== undefined)) as Sides;
    onChange(Object.keys(clean).length ? clean : undefined);
  };
  const keys: [keyof Sides, string][] = [['t', 'Trên'], ['r', 'Phải'], ['b', 'Dưới'], ['l', 'Trái']];
  return (
    <div className={s.fieldStack}>
      <div className={s.row} style={{ justifyContent: 'space-between' }}>
        <span className={s.label}>{label}</span>
        <IconBtn small label={linked ? 'Bỏ liên kết 4 cạnh' : 'Liên kết 4 cạnh'} pressed={linked} disabled={disabled} onClick={() => setLinked(!linked)}>
          {linked ? <Link2 size={13} /> : <Link2Off size={13} />}
        </IconBtn>
      </div>
      {linked ? (
        <NumberInput ariaLabel={`${label} (cả 4 cạnh)`} value={v.t} unit="px" disabled={disabled} onChange={(n) => set('t', n)} />
      ) : (
        <div className={s.grid4}>
          {keys.map(([k, name]) => (
            <div key={k}>
              <NumberInput ariaLabel={`${label} ${name.toLowerCase()}`} value={v[k]} disabled={disabled} onChange={(n) => set(k, n)} />
              <span className={s.cellLabel}>{name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function CornersInput({ value, onChange, disabled }: { value: Corners | undefined; onChange: (v: Corners | undefined) => void; disabled?: boolean }) {
  const v = value ?? {};
  const allSame = v.tl === v.tr && v.tr === v.br && v.br === v.bl;
  const [linked, setLinked] = useState(allSame);
  const set = (k: keyof Corners, n: number | undefined) => {
    const next: Corners = linked ? { tl: n, tr: n, br: n, bl: n } : { ...v, [k]: n };
    const clean = Object.fromEntries(Object.entries(next).filter(([, x]) => x !== undefined)) as Corners;
    onChange(Object.keys(clean).length ? clean : undefined);
  };
  const keys: [keyof Corners, string][] = [['tl', 'Trên trái'], ['tr', 'Trên phải'], ['br', 'Dưới phải'], ['bl', 'Dưới trái']];
  return (
    <div className={s.fieldStack}>
      <div className={s.row} style={{ justifyContent: 'space-between' }}>
        <span className={s.label}>Bo góc</span>
        <IconBtn small label={linked ? 'Chỉnh riêng từng góc' : 'Liên kết 4 góc'} pressed={linked} disabled={disabled} onClick={() => setLinked(!linked)}>
          {linked ? <Link2 size={13} /> : <Link2Off size={13} />}
        </IconBtn>
      </div>
      {linked ? (
        <NumberInput ariaLabel="Bo góc (cả 4 góc)" value={v.tl} unit="px" min={0} disabled={disabled} onChange={(n) => set('tl', n)} />
      ) : (
        <div className={s.grid4}>
          {keys.map(([k, name]) => (
            <div key={k}>
              <NumberInput ariaLabel={`Bo góc ${name.toLowerCase()}`} value={v[k]} min={0} disabled={disabled} onChange={(n) => set(k, n)} />
              <span className={s.cellLabel}>{name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ Chọn màu */

function toHex6(c: string | undefined): string {
  if (!c) return '#ffffff';
  if (/^#[0-9a-f]{6}$/i.test(c)) return c;
  if (/^#[0-9a-f]{3}$/i.test(c)) return `#${c[1]}${c[1]}${c[2]}${c[2]}${c[3]}${c[3]}`;
  const m = /rgba?\(\s*(\d+)[ ,]+(\d+)[ ,]+(\d+)/i.exec(c);
  if (m) return `#${[m[1], m[2], m[3]].map((x) => Number(x).toString(16).padStart(2, '0')).join('')}`;
  return '#ffffff';
}

export function ColorInput({ value, onChange, disabled, allowTransparent = true, id, ariaLabel }: {
  value: string | undefined; onChange: (v: string | undefined) => void; disabled?: boolean; allowTransparent?: boolean; id?: string; ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(value ?? '');
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  useEffect(() => setText(value ?? ''), [value]);
  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const height = 260;
    const top = r.bottom + 6 + height > window.innerHeight ? Math.max(8, r.top - height - 6) : r.bottom + 6;
    setPos({ top, left: Math.max(8, Math.min(window.innerWidth - 250, r.right - 240)) });
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (popRef.current?.contains(e.target as Node) || btnRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); btnRef.current?.focus(); } };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <>
      <button ref={btnRef} id={id} type="button" className={s.colorBtn} disabled={disabled} aria-label={ariaLabel ?? 'Chọn màu'} aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className={s.chip}><span style={{ background: value ?? 'transparent' }} /></span>
        <span className={s.colorText}>{value ?? 'Mặc định'}</span>
      </button>
      {open && (
        <div ref={popRef} className={s.popover} style={{ top: pos.top, left: pos.left }} role="dialog" aria-label="Bảng màu">
          <input type="color" className={s.picker} aria-label="Chọn màu bằng bảng màu" value={toHex6(value)} onChange={(e) => onChange(e.target.value)} />
          <input
            className={[s.input, s.mono].join(' ')}
            aria-label="Mã màu HEX hoặc RGBA"
            value={text}
            placeholder="#1f5f8b hoặc rgba(0,0,0,.5)"
            onChange={(e) => {
              setText(e.target.value);
              const c = safeColor(e.target.value);
              if (c) onChange(c);
            }}
          />
          <div className={s.swatches}>
            {SWATCHES.map((c) => (
              <button key={c} type="button" className={s.swatch} style={{ background: c }} aria-label={c} title={c} onClick={() => onChange(c)} />
            ))}
          </div>
          <div className={s.row}>
            {allowTransparent && <Btn size="sm" onClick={() => onChange('transparent')}>Trong suốt</Btn>}
            <Btn size="sm" onClick={() => { onChange(undefined); setOpen(false); }}>Mặc định</Btn>
          </div>
        </div>
      )}
    </>
  );
}

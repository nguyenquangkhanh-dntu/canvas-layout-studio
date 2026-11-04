import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CircleCheck, CircleX, Copy, Download, FileArchive, ImageDown, Info, Loader2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Btn, Field, NumberInput, Segmented, Select, Toggle, ColorInput, uiStyles } from '../ui/controls';
import { useDialogs, type ExportParams } from '../dialogs';
import { DEVICE_WIDTH, useEditor } from '../../editor/store';
import { exportProject, type ExportIssue } from '../../services/html-exporter';
import { checkCanvasHtml, type CheckFinding } from '../../services/html-checker';
import { buildZip, copyText, downloadBlob, downloadText, exportFileName } from '../../services/download';
import { exportPng, PngTooLargeError } from '../../services/png-exporter';
import { formatBytes } from '../../services/image-file';
import { toast, toastError } from '../ui/Toasts';
import s from './ExportDialog.module.css';

type Tab = 'canvas' | 'standalone' | 'png';

export function ExportDialog() {
  const params = useDialogs((d) => d.params);
  const close = useDialogs((d) => d.close);
  const [tab, setTab] = useState<Tab>((params.tab as Tab) ?? 'canvas');
  return (
    <Modal title="Xuất bản" onClose={close} wide>
      <div className={s.layout}>
        <div className={s.tabs} role="tablist" aria-label="Kiểu xuất">
          {([
            ['canvas', 'HTML cho Canvas'],
            ['standalone', 'HTML độc lập'],
            ['png', 'Ảnh PNG'],
          ] as [Tab, string][]).map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} className={s.tab} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </div>
        {tab === 'canvas' && <CanvasTab />}
        {tab === 'standalone' && <StandaloneTab />}
        {tab === 'png' && <PngTab params={params} />}
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ Phần dùng chung */

/** Rút gọn data URL dài khi hiển thị mã (bản sao chép vẫn đầy đủ). */
function forDisplay(code: string): string {
  return code.replace(/data:image\/[a-z+]+;base64,[A-Za-z0-9+/=]{200,}/g, (m) => `${m.slice(0, 40)}…[${formatBytes(Math.round((m.length * 3) / 4))} ảnh nhúng]`);
}

function Issues({ issues, findings }: { issues: ExportIssue[]; findings?: CheckFinding[] }) {
  const all = [
    ...issues.map((i) => ({ level: i.level, message: i.message, extra: i.modules.length ? `Module: ${i.modules.slice(0, 4).join(', ')}${i.modules.length > 4 ? '...' : ''}` : '' })),
    ...(findings ?? []).map((f) => ({ level: f.level, message: `Kiểm tra HTML: ${f.message}`, extra: '' })),
  ];
  const errors = all.filter((i) => i.level === 'error').length;
  const warns = all.filter((i) => i.level === 'warning').length;
  return (
    <div className={s.issues}>
      <div className={s.issuesHead}>
        {errors ? <CircleX size={15} color="var(--danger)" /> : warns ? <AlertTriangle size={15} color="var(--warn)" /> : <CircleCheck size={15} color="var(--ok)" />}
        {errors ? `${errors} lỗi cần xử lý` : warns ? `${warns} cảnh báo` : 'Không phát hiện vấn đề'}
      </div>
      <ul>
        {all.map((i, k) => (
          <li key={k} className={s[i.level]}>
            {i.level === 'error' ? <CircleX size={14} /> : i.level === 'warning' ? <AlertTriangle size={14} /> : <Info size={14} />}
            <span>{i.message}{i.extra && <em>{i.extra}</em>}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PreviewPane({ doc, codes, scripts = false }: { doc: string; codes: { label: string; code: string }[]; scripts?: boolean }) {
  const [view, setView] = useState('preview');
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const current = codes.find((c) => c.label === view);
  const display = useMemo(() => (current ? forDisplay(current.code) : ''), [current]);
  return (
    <div className={s.preview}>
      <div className={s.previewBar}>
        <Segmented value={view} onChange={setView} options={[{ value: 'preview', label: 'Xem trước' }, ...codes.map((c) => ({ value: c.label, label: c.label }))]} />
        {view === 'preview' && (
          <Segmented value={device} onChange={setDevice} options={[{ value: 'desktop', label: 'Máy tính' }, { value: 'tablet', label: 'Tablet' }, { value: 'mobile', label: 'Điện thoại' }]} />
        )}
      </div>
      {view === 'preview' ? (
        <div className={s.frameWrap}>
          {/* sandbox: không cùng nguồn gốc với ứng dụng; bản Canvas không chạy script, bản độc lập chỉ chạy script đi kèm. */}
          <iframe title="Xem trước HTML xuất ra" sandbox={scripts ? 'allow-scripts' : ''} srcDoc={doc} style={{ width: DEVICE_WIDTH[device] }} className={s.frame} />
        </div>
      ) : (
        <pre className={s.code} tabIndex={0} aria-label={`Mã ${view}`}>{display}</pre>
      )}
    </div>
  );
}

const wrapDoc = (body: string) =>
  `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{margin:0;padding:24px 16px;background:#fff}</style></head><body>${body}</body></html>`;

/* ------------------------------------------------------------------ HTML cho Canvas */

function CanvasTab() {
  const project = useEditor((st) => st.project);
  const [shadowFallback, setShadowFallback] = useState(true);
  const res = useMemo(() => exportProject(project, { mode: 'canvas', shadowFallback }), [project, shadowFallback]);
  const findings = useMemo(() => checkCanvasHtml(res.body).filter((f) => f.level !== 'info' || !/tài nguyên/.test(f.message)), [res.body]);
  const hasError = res.issues.some((i) => i.level === 'error') || findings.some((f) => f.level === 'error');
  return (
    <div className={s.body}>
      <aside className={s.side}>
        <p className={s.lead}>HTML fragment với style viết trực tiếp trên từng thẻ, chỉ dùng thẻ và thuộc tính CSS mà Canvas giữ lại. Không có JavaScript.</p>
        <Toggle checked={shadowFallback} onChange={setShadowFallback} label="Thay bóng đổ bằng viền mảnh" />
        <div className={s.actions}>
          <Btn variant="primary" onClick={async () => (await copyText(res.body)) ? toast('Đã sao chép HTML. Dán vào trình soạn HTML của Canvas.') : toastError('Không sao chép được. Hãy tải tệp .html.')}>
            <Copy size={14} /> Sao chép HTML
          </Btn>
          <Btn onClick={() => { downloadText(res.body, exportFileName(project, 'html', 'canvas'), 'text/html'); toast('Đã tải tệp HTML cho Canvas.'); }}>
            <Download size={14} /> Tải .html
          </Btn>
        </div>
        {hasError && <p className={s.blocker}>Có lỗi sẽ làm mất nội dung khi dán vào Canvas. Hãy xử lý trước khi dùng.</p>}
        <Issues issues={res.issues} findings={findings} />
        <details className={s.howto}>
          <summary>Cách dán vào Canvas LMS</summary>
          <ol>
            <li>Mở trang (Page) hoặc bài tập cần chỉnh, bấm <b>Edit</b>.</li>
            <li>Trong trình soạn thảo, bấm biểu tượng <b>&lt;/&gt;</b> (HTML Editor) ở góc dưới bên phải.</li>
            <li>Xóa nội dung cũ nếu cần, dán HTML vừa sao chép.</li>
            <li>Bấm <b>Save</b>, rồi xem lại trên máy tính và ứng dụng Canvas Student trên điện thoại.</li>
          </ol>
        </details>
      </aside>
      <PreviewPane doc={wrapDoc(res.body)} codes={[{ label: 'HTML', code: res.body }]} />
    </div>
  );
}

/* ------------------------------------------------------------------ HTML độc lập */

function StandaloneTab() {
  const project = useEditor((st) => st.project);
  const res = useMemo(() => exportProject(project, { mode: 'standalone' }), [project]);
  const [zipping, setZipping] = useState(false);
  return (
    <div className={s.body}>
      <aside className={s.side}>
        <p className={s.lead}>Tệp HTML hoàn chỉnh kèm CSS trong cùng tệp, mở trực tiếp bằng trình duyệt hoặc đặt trên máy chủ riêng. Giữ đủ bóng đổ, giãn chữ và nút sao chép code.</p>
        <div className={s.actions}>
          <Btn variant="primary" onClick={() => { downloadText(res.document, exportFileName(project, 'html'), 'text/html'); toast('Đã tải tệp HTML độc lập.'); }}>
            <Download size={14} /> Tải HTML
          </Btn>
          <Btn
            disabled={zipping}
            onClick={async () => {
              setZipping(true);
              try {
                downloadBlob(await buildZip(project), exportFileName(project, 'zip'));
                toast('Đã tải gói ZIP (index.html, styles.css, images/).');
              } catch (e) {
                toastError(`Không tạo được ZIP: ${(e as Error).message}`);
              } finally {
                setZipping(false);
              }
            }}
          >
            {zipping ? <Loader2 size={14} className={s.spin} /> : <FileArchive size={14} />} Tải ZIP
          </Btn>
          <Btn onClick={async () => (await copyText(res.document)) && toast('Đã sao chép HTML.')}><Copy size={14} /> Sao chép HTML</Btn>
          <Btn onClick={async () => (await copyText(res.css)) && toast('Đã sao chép CSS.')}><Copy size={14} /> Sao chép CSS</Btn>
        </div>
        {res.hasScript && <p className={s.note}>Tệp có một đoạn script nhỏ (nút sao chép code, chuyển tháng và tooltip của Lịch học, tiến độ theo ngày mở). Không tải thư viện bên ngoài.</p>}
        <Issues issues={res.issues.filter((i) => i.code !== 'canvas-test')} />
      </aside>
      <PreviewPane scripts doc={res.document} codes={[{ label: 'HTML', code: res.document }, { label: 'CSS', code: res.css }]} />
    </div>
  );
}

/* ------------------------------------------------------------------ PNG */

function PngTab({ params }: { params: ExportParams }) {
  const project = useEditor((st) => st.project);
  const selectedId = useEditor((st) => st.selectedId);
  const index = useEditor((st) => st.index);
  const [scope, setScope] = useState<'page' | 'section' | 'node'>(params.scope ?? 'page');
  const [width, setWidth] = useState(DEVICE_WIDTH.desktop);
  const [scale, setScale] = useState<1 | 2 | 3>(2);
  const [bgMode, setBgMode] = useState<'white' | 'page' | 'transparent' | 'custom'>('white');
  const [custom, setCustom] = useState('#f4f6f8');
  const [padding, setPadding] = useState(24);
  const [state, setState] = useState<{ status: 'idle' | 'working' | 'done' | 'error'; url?: string; blob?: Blob; size?: string; warnings?: string[]; error?: string }>({ status: 'idle' });

  useEffect(() => () => { if (state.url) URL.revokeObjectURL(state.url); }, [state.url]);

  const sectionId = useMemo(() => {
    if (!selectedId) return null;
    let cur = selectedId;
    while (index.get(cur)?.parentId) cur = index.get(cur)!.parentId!;
    return cur;
  }, [selectedId, index]);

  const nodeIds = scope === 'node' && selectedId ? [selectedId] : scope === 'section' && sectionId ? [sectionId] : undefined;
  const background = bgMode === 'white' ? '#ffffff' : bgMode === 'transparent' ? 'transparent' : bgMode === 'page' ? project.page.style.bg ?? '#ffffff' : custom;

  const run = async () => {
    if (state.url) URL.revokeObjectURL(state.url);
    setState({ status: 'working' });
    try {
      const r = await exportPng(project, { nodeIds, width, scale, background, padding });
      setState({ status: 'done', blob: r.blob, url: URL.createObjectURL(r.blob), size: `${r.width}×${r.height} px · ${formatBytes(r.blob.size)}`, warnings: r.warnings });
    } catch (e) {
      setState({ status: 'error', error: e instanceof PngTooLargeError ? e.message : `Không xuất được PNG: ${(e as Error).message}` });
    }
  };

  const selName = selectedId ? index.get(selectedId)?.node.name : undefined;
  const secName = sectionId ? index.get(sectionId)?.node.name : undefined;

  return (
    <div className={s.body}>
      <aside className={s.side}>
        <Field label="Phạm vi" stack>
          <Select
            value={scope}
            onChange={setScope}
            options={[
              { value: 'page', label: 'Toàn trang' },
              { value: 'section', label: secName ? `Section chứa module đang chọn: ${secName}` : 'Section đang chọn (chưa chọn module)' },
              { value: 'node', label: selName ? `Module đang chọn: ${selName}` : 'Module đang chọn (chưa chọn module)' },
            ]}
          />
        </Field>
        <Field label="Độ rộng">
          <Select value={width} onChange={setWidth} options={[{ value: 1000, label: 'Máy tính (1000px)' }, { value: 768, label: 'Tablet (768px)' }, { value: 390, label: 'Điện thoại (390px)' }, { value: 1200, label: 'Rộng (1200px)' }]} />
        </Field>
        <Field label="Độ phân giải">
          <Segmented value={String(scale)} onChange={(v) => setScale(Number(v) as 1 | 2 | 3)} options={[{ value: '1', label: '1x' }, { value: '2', label: '2x' }, { value: '3', label: '3x' }]} />
        </Field>
        <Field label="Nền ảnh">
          <Select value={bgMode} onChange={setBgMode} options={[{ value: 'white', label: 'Trắng' }, { value: 'page', label: 'Màu nền trang' }, { value: 'transparent', label: 'Trong suốt' }, { value: 'custom', label: 'Màu tùy chọn' }]} />
        </Field>
        {bgMode === 'custom' && <Field label="Màu nền"><ColorInput value={custom} allowTransparent={false} onChange={(v) => v && setCustom(v)} /></Field>}
        <Field label="Lề ảnh"><NumberInput value={padding} unit="px" min={0} max={200} onChange={(v) => setPadding(v ?? 0)} /></Field>
        <div className={s.actions}>
          <Btn variant="primary" disabled={state.status === 'working' || (scope !== 'page' && !nodeIds)} onClick={run}>
            {state.status === 'working' ? <Loader2 size={14} className={s.spin} /> : <ImageDown size={14} />}
            {state.status === 'working' ? 'Đang tạo ảnh...' : 'Tạo ảnh PNG'}
          </Btn>
          {state.status === 'done' && state.blob && (
            <Btn onClick={() => { downloadBlob(state.blob!, exportFileName(project, 'png', scope === 'page' ? '' : scope === 'section' ? 'section' : 'module')); toast('Đã tải ảnh PNG.'); }}>
              <Download size={14} /> Tải PNG
            </Btn>
          )}
        </div>
        {state.status === 'error' && <p className={s.blocker} role="alert">{state.error}</p>}
        {state.status === 'done' && (
          <div className={uiStyles.hint}>
            Ảnh {state.size}.
            {state.warnings?.map((w) => <div key={w} style={{ color: 'var(--warn)', marginTop: 4 }}>{w}</div>)}
          </div>
        )}
        <p className={uiStyles.hint}>Ảnh được dựng từ HTML xuất bản nên không có khung chọn, tay nắm kéo hay thanh công cụ. Video nhúng không chụp được.</p>
      </aside>
      <div className={s.preview}>
        <div className={s.pngStage} style={{ background: bgMode === 'transparent' ? undefined : '#e4e9ee' }}>
          {state.status === 'done' && state.url ? (
            <img src={state.url} alt="Ảnh PNG vừa tạo" className={s.pngImg} />
          ) : (
            <p className={s.pngEmpty}>{state.status === 'working' ? 'Đang dựng ảnh...' : 'Bấm "Tạo ảnh PNG" để xem trước ảnh trước khi tải.'}</p>
          )}
        </div>
      </div>
    </div>
  );
}

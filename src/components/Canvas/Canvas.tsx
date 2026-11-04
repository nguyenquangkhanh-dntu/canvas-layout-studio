import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, FileCode2, LayoutPanelTop } from 'lucide-react';
import { useDialogs } from '../dialogs';
import { DEVICE_WIDTH, useEditor } from '../../editor/store';
import { cssToReact } from '../../services/css';
import { exportProject, rootStyle } from '../../services/html-exporter';
import { richCss } from '../../services/rich-style';
import { NodeView } from './NodeView';
import { EmptySlot } from './EmptySlot';
import { SelectionOverlay } from './SelectionOverlay';
import { TextToolbar } from './TextToolbar';
import { Btn } from '../ui/controls';
import { findEntry } from '../../modules/library';
import { loadSampleProject } from '../../samples/sample-project';
import s from './Canvas.module.css';

const DEVICE_LABEL = { desktop: 'Máy tính', tablet: 'Máy tính bảng', mobile: 'Điện thoại' } as const;

export function Canvas() {
  const mode = useEditor((st) => st.mode);
  const device = useEditor((st) => st.device);
  const zoom = useEditor((st) => st.zoom);
  const fitZoom = useEditor((st) => st.fitZoom);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const width = DEVICE_WIDTH[device];

  // Vừa màn hình: tính tỉ lệ thu phóng theo độ rộng vùng làm việc.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || !fitZoom) return;
    const update = () => {
      const avail = el.clientWidth - 56;
      const z = Math.min(1, Math.max(0.3, avail / width));
      if (Math.abs(useEditor.getState().zoom - z) > 0.005) useEditor.getState().setUi({ zoom: Math.round(z * 100) / 100 });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fitZoom, width]);

  return (
    <main className={s.area} aria-label="Vùng thiết kế">
      {mode === 'design' && <TextToolbar />}
      <div
        ref={scrollerRef}
        className={s.scroller}
        data-canvas-scroller
        onClick={() => useEditor.getState().select(null)}
        onMouseLeave={() => useEditor.getState().hover(null)}
      >
        <div className={s.stage}>
          <div ref={wrapRef} className={s.stageWrap}>
            <span className={s.deviceTag}>{DEVICE_LABEL[device]} · {width}px · {Math.round(zoom * 100)}%</span>
            {mode === 'design' ? (
              <>
                <div className={[s.sheet, device === 'mobile' && s.sheetMobile].filter(Boolean).join(' ')} style={{ width, zoom }}>
                  <PageView />
                </div>
                <SelectionOverlay wrapRef={wrapRef} />
              </>
            ) : (
              <Preview width={width} zoom={zoom} />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function PageView() {
  const page = useEditor((st) => st.project.page);
  const nodes = useEditor((st) => st.project.nodes);
  const style = useMemo(() => cssToReact(rootStyle(page)), [page]);
  const css = useMemo(
    () =>
      richCss('.cls-layout-root', { accent: page.accent, headingColor: page.headingColor }) +
      '\n.cls-layout-root .cls-rt .ProseMirror > :last-child { margin-bottom: 0; }\n.cls-layout-root .cls-rt .ProseMirror > :first-child { margin-top: 0; }',
    [page.accent, page.headingColor],
  );
  return (
    <>
      <style>{css}</style>
      <div className="cls-layout-root cls-editing" data-canvas-root style={style}>
        {nodes.length ? nodes.map((n) => <NodeView key={n.id} id={n.id} />) : <EmptyPage />}
      </div>
    </>
  );
}

function EmptyPage() {
  return (
    <div className={s.emptyPage}>
      <EmptySlot parentId="__root__" />
      <div className={s.starter}>
        <Btn onClick={(e) => { e.stopPropagation(); useEditor.getState().addNode(findEntry('section')!.create()); }}>
          <LayoutPanelTop size={15} /> Thêm Section đầu tiên
        </Btn>
        <Btn onClick={(e) => { e.stopPropagation(); loadSampleProject(); }}>
          <BookOpen size={15} /> Mở bài học mẫu
        </Btn>
        <Btn onClick={(e) => { e.stopPropagation(); useDialogs.getState().open('import-html'); }}>
          <FileCode2 size={15} /> Nhập HTML từ Canvas
        </Btn>
      </div>
    </div>
  );
}

/** Script báo chiều cao tài liệu cho trang cha (iframe không cùng nguồn gốc nên không đọc trực tiếp được). */
const HEIGHT_REPORTER = `<script>(function(){var last=0;function r(){var h=document.documentElement.scrollHeight;if(h!==last){last=h;parent.postMessage({clsPreviewHeight:h},'*');}}new ResizeObserver(r).observe(document.documentElement);window.addEventListener('load',r);r();})();</script>`;

/**
 * Xem trước đúng như người học thấy: dựng từ chính HTML xuất ra.
 * iframe sandbox chỉ cho chạy script (lịch học, tiến độ), không cùng nguồn gốc với ứng dụng
 * nên nội dung xem trước không đọc hay sửa được dữ liệu của trình thiết kế.
 */
function Preview({ width, zoom }: { width: number; zoom: number }) {
  const project = useEditor((st) => st.project);
  const canvasSafe = useEditor((st) => st.previewCanvasSafe);
  const [height, setHeight] = useState(800);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const doc = useMemo(() => {
    if (canvasSafe) {
      const res = exportProject(project, { mode: 'canvas' });
      return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{margin:0;padding:24px 16px;background:#fff}</style></head><body>${res.body}${HEIGHT_REPORTER}</body></html>`;
    }
    return exportProject(project, { mode: 'standalone' }).document.replace('</body>', `${HEIGHT_REPORTER}</body>`);
  }, [project, canvasSafe]);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.source !== frameRef.current?.contentWindow) return;
      const h = (e.data as { clsPreviewHeight?: unknown })?.clsPreviewHeight;
      if (typeof h === 'number' && Number.isFinite(h)) setHeight(Math.max(600, Math.min(100000, h + 4)));
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  return (
    <iframe
      ref={frameRef}
      title="Xem trước bài học"
      className={s.previewFrame}
      sandbox="allow-scripts"
      srcDoc={doc}
      style={{ width, height, zoom }}
    />
  );
}

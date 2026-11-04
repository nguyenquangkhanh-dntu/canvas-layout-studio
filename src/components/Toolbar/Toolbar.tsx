import {
  CircleAlert, Eye, FilePlus2, FileCode2, FileJson, FolderOpen, ImageDown, Keyboard, Loader2, Maximize2, Monitor,
  PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, PenLine, Redo2, Save, Smartphone, Tablet, Undo2, ZoomIn, ZoomOut, Check,
} from 'lucide-react';
import { useEditor, type Device } from '../../editor/store';
import { saveNow } from '../../editor/autosave';
import { serializeProject } from '../../services/import-export';
import { downloadText, exportFileName } from '../../services/download';
import { useDialogs } from '../dialogs';
import { IconBtn, Btn } from '../ui/controls';
import { toast } from '../ui/Toasts';
import s from './Toolbar.module.css';

const ZOOMS = [0.3, 0.5, 0.67, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 2];

export function Toolbar() {
  const name = useEditor((st) => st.project.name);
  const canUndo = useEditor((st) => st.past.length > 0);
  const canRedo = useEditor((st) => st.future.length > 0);
  const mode = useEditor((st) => st.mode);
  const device = useEditor((st) => st.device);
  const zoom = useEditor((st) => st.zoom);
  const fit = useEditor((st) => st.fitZoom);
  const leftOpen = useEditor((st) => st.leftOpen);
  const rightOpen = useEditor((st) => st.rightOpen);
  const previewCanvasSafe = useEditor((st) => st.previewCanvasSafe);
  const open = useDialogs((d) => d.open);
  const st = useEditor.getState;

  const stepZoom = (dir: 1 | -1) => {
    const z = st().zoom;
    const next = dir > 0 ? ZOOMS.find((x) => x > z + 0.001) : [...ZOOMS].reverse().find((x) => x < z - 0.001);
    if (next) st().setUi({ zoom: next, fitZoom: false });
  };

  return (
    <header className={s.bar}>
      <div className={s.brand}>
        <span className={s.mark} aria-hidden="true"><i /><i /><i /></span>
        <div className={s.names}>
          <span className={s.app}>Canvas Layout Studio</span>
          <input className={s.project} aria-label="Tên dự án" value={name} maxLength={160} onChange={(e) => st().setName(e.target.value)} />
        </div>
        <SaveStatus />
      </div>

      <nav className={s.group} aria-label="Dự án">
        <IconBtn label="Dự án mới" onClick={() => open('confirm-new')}><FilePlus2 size={17} /></IconBtn>
        <IconBtn label="Mở dự án" onClick={() => open('open')}><FolderOpen size={17} /></IconBtn>
        <IconBtn label="Lưu (Ctrl+S)" onClick={() => saveNow(true)}><Save size={17} /></IconBtn>
        <span className={s.sep} />
        <IconBtn label="Hoàn tác (Ctrl+Z)" disabled={!canUndo} onClick={() => st().undo()}><Undo2 size={17} /></IconBtn>
        <IconBtn label="Làm lại (Ctrl+Y)" disabled={!canRedo} onClick={() => st().redo()}><Redo2 size={17} /></IconBtn>
      </nav>

      <div className={s.center}>
        <div className={s.modes} role="group" aria-label="Chế độ">
          <button type="button" aria-pressed={mode === 'design'} onClick={() => st().setUi({ mode: 'design' })}><PenLine size={14} /> Thiết kế</button>
          <button type="button" aria-pressed={mode === 'preview'} onClick={() => st().setUi({ mode: 'preview' })}><Eye size={14} /> Xem trước</button>
        </div>
        <div className={s.group} role="group" aria-label="Thiết bị">
          {([['desktop', Monitor, 'Máy tính (1000px)'], ['tablet', Tablet, 'Máy tính bảng (768px)'], ['mobile', Smartphone, 'Điện thoại (390px)']] as [Device, typeof Monitor, string][]).map(([d, Icon, label]) => (
            <IconBtn key={d} label={label} pressed={device === d} onClick={() => st().setUi({ device: d })}><Icon size={16} /></IconBtn>
          ))}
        </div>
        <div className={s.group} role="group" aria-label="Thu phóng">
          <IconBtn label="Thu nhỏ" onClick={() => stepZoom(-1)}><ZoomOut size={16} /></IconBtn>
          <button type="button" className={s.zoomVal} title="Về 100%" onClick={() => st().setUi({ zoom: 1, fitZoom: false })}>{Math.round(zoom * 100)}%</button>
          <IconBtn label="Phóng to" onClick={() => stepZoom(1)}><ZoomIn size={16} /></IconBtn>
          <IconBtn label="Vừa màn hình" pressed={fit} onClick={() => st().setUi({ fitZoom: !fit })}><Maximize2 size={15} /></IconBtn>
        </div>
        {mode === 'preview' && (
          <label className={s.safe} title="Xem như sau khi Canvas lọc HTML: bỏ bóng đổ, giãn chữ, nút sao chép...">
            <input type="checkbox" checked={previewCanvasSafe} onChange={(e) => st().setUi({ previewCanvasSafe: e.target.checked })} />
            <span>Lọc Canvas</span>
          </label>
        )}
      </div>

      <div className={s.group}>
        <Btn size="sm" onClick={() => {
          downloadText(serializeProject(st().project), exportFileName(st().project, 'json'), 'application/json');
          toast('Đã xuất tệp dự án JSON.');
        }} title="Xuất dự án JSON để lưu trữ hoặc chuyển sang máy khác" aria-label="Xuất JSON">
          <FileJson size={14} /> <span className={s.lbl}>JSON</span>
        </Btn>
        <Btn size="sm" title="Xuất ảnh PNG" aria-label="Xuất PNG" onClick={() => open('export', { tab: 'png' })}><ImageDown size={14} /> <span className={s.lbl}>PNG</span></Btn>
        <Btn size="sm" variant="primary" onClick={() => open('export', { tab: 'canvas' })}><FileCode2 size={14} /> Xuất HTML</Btn>
        <span className={s.sep} />
        <IconBtn label={leftOpen ? 'Ẩn bảng trái' : 'Hiện bảng trái'} onClick={() => st().setUi({ leftOpen: !leftOpen })}>{leftOpen ? <PanelLeftClose size={17} /> : <PanelLeftOpen size={17} />}</IconBtn>
        <IconBtn label={rightOpen ? 'Ẩn bảng thuộc tính' : 'Hiện bảng thuộc tính'} onClick={() => st().setUi({ rightOpen: !rightOpen })}>{rightOpen ? <PanelRightClose size={17} /> : <PanelRightOpen size={17} />}</IconBtn>
        <IconBtn label="Phím tắt" onClick={() => open('shortcuts')}><Keyboard size={17} /></IconBtn>
      </div>
    </header>
  );
}

function SaveStatus() {
  const status = useEditor((st) => st.saveStatus);
  const err = useEditor((st) => st.saveError);
  const map = {
    saved: { icon: <Check size={13} />, text: 'Đã lưu', cls: s.ok },
    unsaved: { icon: null, text: 'Chưa lưu', cls: s.pending },
    saving: { icon: <Loader2 size={13} className={s.spin} />, text: 'Đang lưu...', cls: s.pending },
    error: { icon: <CircleAlert size={13} />, text: 'Lỗi lưu', cls: s.err },
  }[status];
  return (
    <span className={[s.status, map.cls].join(' ')} role="status" title={status === 'error' ? err : 'Dự án tự lưu trong trình duyệt'}>
      {map.icon}
      {map.text}
    </span>
  );
}

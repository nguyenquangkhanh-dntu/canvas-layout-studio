import { useRef, useState } from 'react';
import { CircleCheck, FileUp } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Btn, uiStyles } from './ui/controls';
import { useDialogs } from './dialogs';
import { useEditor } from '../editor/store';
import { saveNow } from '../editor/autosave';
import { countNodes, walk } from '../editor/tree';
import { createEmptyProject } from '../models/project';
import { MAX_NODES } from '../services/import-export';
import { MAX_IMPORT_CHARS, importCanvasHtml, type ImportResult } from '../services/html-importer';
import { toast, toastError } from './ui/Toasts';
import s from './ImportHtmlDialog.module.css';

type Pos = 'append' | 'replace' | 'new';

/** Nhập HTML từ Canvas: dán mã hoặc chọn tệp, chọn cách nhập và vị trí, xem báo cáo sau khi nhập. */
export function ImportHtmlDialog() {
  const close = useDialogs((d) => d.close);
  const [tab, setTab] = useState<'paste' | 'file'>('paste');
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('');
  const [mode, setMode] = useState<'modules' | 'raw'>('modules');
  const [pos, setPos] = useState<Pos>(() => (useEditor.getState().project.nodes.length ? 'append' : 'replace'));
  const [cleanup, setCleanup] = useState(true);
  const [error, setError] = useState('');
  const [done, setDone] = useState<{ res: ImportResult; pos: Pos } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const readFile = async (file: File | undefined) => {
    if (!file) return;
    setError('');
    if (file.size > MAX_IMPORT_CHARS * 2) return setError('Tệp quá lớn (giới hạn khoảng 4 MB).');
    setText(await file.text());
    setFileName(file.name);
  };

  const run = async () => {
    setError('');
    if (!text.trim()) return setError(tab === 'paste' ? 'Hãy dán mã HTML vào ô bên trên.' : 'Hãy chọn tệp .html.');
    let res: ImportResult;
    try {
      res = importCanvasHtml(text, { mode, cleanup });
    } catch {
      return setError('Không đọc được mã HTML này.');
    }
    if (!res.nodes.length) return setError('Không tìm thấy nội dung nào để nhập.');
    const st = useEditor.getState();
    if (countNodes(res.nodes) + (pos === 'append' ? countNodes(st.project.nodes) : 0) > MAX_NODES) return setError(`Trang quá lớn (hơn ${MAX_NODES} module).`);
    if (pos === 'new') {
      if (!(await saveNow(false))) return;
      const p = createEmptyProject(res.title || 'Trang nhập từ Canvas');
      p.nodes = res.nodes;
      st.loadProject(p);
    } else {
      const ok = st.commit((d) => {
        if (pos === 'replace') d.nodes = res.nodes;
        else d.nodes.push(...res.nodes);
      });
      if (!ok) return toastError('Không nhập được vào trang hiện tại.');
    }
    useEditor.getState().select(res.nodes[0].id);
    setDone({ res, pos });
  };

  if (done) return <Report res={done.res} pos={done.pos} onClose={close} />;

  return (
    <Modal
      title="Nhập HTML từ Canvas"
      onClose={close}
      medium
      footer={
        <>
          <span className={s.foot}>{text ? `Đã nhận ${text.length.toLocaleString('vi-VN')} ký tự${fileName ? ` từ ${fileName}` : ''}. ` : ''}Script, sự kiện onclick và liên kết javascript: luôn bị loại bỏ.</span>
          <Btn onClick={close}>Hủy</Btn>
          <Btn variant="primary" onClick={run}>Nhập</Btn>
        </>
      }
    >
      <div className={s.body}>
        <p className={s.lead}>Trên Canvas: mở trang, bấm <b>Edit</b>, bấm biểu tượng <b>&lt;/&gt;</b> (HTML Editor), chọn tất cả và sao chép.</p>
        <div className={s.tabs} role="tablist" aria-label="Nguồn HTML">
          <button type="button" role="tab" aria-selected={tab === 'paste'} onClick={() => setTab('paste')}>Dán mã HTML</button>
          <button type="button" role="tab" aria-selected={tab === 'file'} onClick={() => setTab('file')}>Chọn tệp .html</button>
        </div>
        {tab === 'paste' ? (
          <textarea
            className={s.code}
            aria-label="Mã HTML từ Canvas"
            placeholder={'<p>Dán mã HTML của trang Canvas vào đây...</p>'}
            value={text}
            spellCheck={false}
            data-autofocus
            onChange={(e) => { setText(e.target.value); setFileName(''); }}
          />
        ) : (
          <div
            className={s.drop}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); readFile(e.dataTransfer.files?.[0]); }}
          >
            <FileUp size={26} aria-hidden="true" />
            <span>{fileName ? `Đã chọn: ${fileName}` : 'Kéo tệp .html vào đây, hoặc'}</span>
            <input ref={fileRef} type="file" accept=".html,.htm,text/html" hidden onChange={(e) => readFile(e.target.files?.[0])} />
            <Btn size="sm" onClick={() => fileRef.current?.click()}>Chọn tệp</Btn>
            <span className={s.small}>Tệp trang xuất từ Canvas (Export Course Content, thư mục wiki_content) hoặc tệp HTML độc lập</span>
          </div>
        )}
        <div className={s.options}>
          <fieldset>
            <legend>Cách nhập</legend>
            <label><input type="radio" name="im-mode" checked={mode === 'modules'} onChange={() => setMode('modules')} /><span><b>Chuyển thành module</b> (khuyên dùng)<small>Sửa được từng khối; phần không nhận diện được giữ nguyên thành Khối HTML</small></span></label>
            <label><input type="radio" name="im-mode" checked={mode === 'raw'} onChange={() => setMode('raw')} /><span>Giữ nguyên thành một Khối HTML<small>Không đổi gì, chỉ lọc mã không an toàn</small></span></label>
          </fieldset>
          <fieldset>
            <legend>Vị trí</legend>
            <label><input type="radio" name="im-pos" checked={pos === 'append'} onChange={() => setPos('append')} />Thêm vào cuối trang hiện tại</label>
            <label><input type="radio" name="im-pos" checked={pos === 'replace'} onChange={() => setPos('replace')} />Thay toàn bộ trang (Hoàn tác được)</label>
            <label><input type="radio" name="im-pos" checked={pos === 'new'} onChange={() => setPos('new')} />Tạo dự án mới</label>
            <label className={s.gap}><input type="checkbox" checked={cleanup} onChange={(e) => setCleanup(e.target.checked)} />Dọn mã thừa (style Word, đoạn trống, span lồng)</label>
          </fieldset>
        </div>
        {error && <div role="alert" className={s.error}>{error}</div>}
      </div>
    </Modal>
  );
}

function Report({ res, pos, onClose }: { res: ImportResult; pos: Pos; onClose: () => void }) {
  const r = res.report;
  const blocks = [...r.htmlBlocks.reduce((m, x) => m.set(x, (m.get(x) ?? 0) + 1), new Map<string, number>())];
  const c = r.cleaned;
  const cleanedText = [c.wordStyles && `${c.wordStyles} thuộc tính style của Word`, c.emptyParagraphs && `${c.emptyParagraphs} đoạn trống`, c.spans && `${c.spans} thẻ span lồng nhau`].filter(Boolean).join(', ');

  const showBlocks = () => {
    let first: string | null = null;
    walk(res.nodes, (n) => { if (!first && n.type === 'html') first = n.id; });
    if (first) useEditor.getState().select(first);
    onClose();
  };

  return (
    <Modal
      title={<span className={s.done}><CircleCheck size={18} aria-hidden="true" /> Đã nhập xong</span>}
      onClose={onClose}
      medium
      footer={
        <>
          {pos !== 'new' && (
            <Btn variant="danger" onClick={() => { useEditor.getState().undo(); toast('Đã hoàn tác lần nhập.'); onClose(); }}>Hoàn tác lần nhập</Btn>
          )}
          <span style={{ flex: 1 }} />
          {r.htmlBlocks.length > 0 && <Btn onClick={showBlocks}>Xem các Khối HTML</Btn>}
          <Btn variant="primary" onClick={onClose} data-autofocus>Xong</Btn>
        </>
      }
    >
      <div className={s.body}>
        <div className={s.stats}>
          <div className={s.ok}><strong>{r.modules}</strong><span>module sửa được</span></div>
          <div className={s.raw}><strong>{r.htmlBlocks.length}</strong><span>Khối HTML giữ nguyên</span></div>
          <div className={s.warn}><strong>{r.warnings.length}</strong><span>cảnh báo cần xem</span></div>
        </div>
        {r.counts.length > 0 && (
          <section>
            <h3>Đã chuyển thành module</h3>
            <div className={s.chips}>
              {r.counts.filter(([k]) => k !== 'Khối HTML').map(([k, n]) => <span key={k}>{k} × {n}</span>)}
            </div>
            {r.exact > 0 && <p className={s.small}>{r.exact} module nhận diện chính xác vì trang được xuất từ Canvas Layout Studio.</p>}
          </section>
        )}
        {blocks.length > 0 && (
          <section>
            <h3>Giữ nguyên thành Khối HTML</h3>
            <ul>{blocks.map(([k, n]) => <li key={k}>{k}{n > 1 ? ` (${n})` : ''}</li>)}</ul>
            <p className={s.small}>Chọn từng Khối HTML để sửa mã hoặc bấm "Thử chuyển thành module".</p>
          </section>
        )}
        {r.warnings.length > 0 && (
          <section>
            <h3>Cảnh báo</h3>
            <ul>{r.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
          </section>
        )}
        {cleanedText && <p className={s.small}>Đã dọn: {cleanedText}.</p>}
        {pos === 'new' && <p className={uiStyles.hint}>Đã tạo dự án mới "{useEditor.getState().project.name}". Dự án trước vẫn được lưu.</p>}
      </div>
    </Modal>
  );
}

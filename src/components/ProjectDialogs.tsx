import { useEffect, useRef, useState } from 'react';
import { FileCode2, FileUp, Trash2 } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Btn, Field, IconBtn, TextInput, uiStyles } from './ui/controls';
import { useDialogs } from './dialogs';
import { useEditor } from '../editor/store';
import { saveNow } from '../editor/autosave';
import { deleteProject, loadIndex, loadProject, type ProjectSummary } from '../services/project-storage';
import { MAX_FILE_BYTES, parseProjectJson } from '../services/import-export';
import { buildSampleProject } from '../samples/sample-project';
import { buildOverviewProject } from '../samples/overview-project';
import { toast, toastError } from './ui/Toasts';

export function OpenDialog() {
  const close = useDialogs((d) => d.close);
  const currentId = useEditor((st) => st.project.id);
  const [list, setList] = useState<ProjectSummary[] | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadIndex().then(setList).catch(() => setList([])); }, []);

  const openFile = async (file: File | undefined) => {
    if (!file) return;
    setErrors([]);
    if (file.size > MAX_FILE_BYTES) return setErrors(['Tệp lớn hơn 25 MB.']);
    const res = parseProjectJson(await file.text());
    if (!res.ok) return setErrors(res.errors);
    await saveNow(false);
    useEditor.getState().loadProject(res.project);
    toast(res.warnings.length ? `Đã mở dự án, bỏ qua ${res.warnings.length} mục không hợp lệ.` : `Đã mở "${res.project.name}".`);
    close();
  };

  const openSaved = async (id: string) => {
    await saveNow(false);
    const p = await loadProject(id);
    if (!p) return toastError('Không đọc được dự án này.');
    useEditor.getState().loadProject(p, { status: 'saved' });
    close();
  };

  return (
    <Modal title="Mở dự án" onClose={close}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={(e) => openFile(e.target.files?.[0])} />
        <div className={uiStyles.row}>
          <Btn variant="primary" onClick={() => fileRef.current?.click()}><FileUp size={14} /> Mở tệp JSON...</Btn>
          <Btn onClick={async () => { await saveNow(false); useEditor.getState().loadProject(buildSampleProject()); close(); }}>Mở bài học mẫu</Btn>
          <Btn onClick={async () => { await saveNow(false); useEditor.getState().loadProject(buildOverviewProject()); close(); }}>Mở mẫu Tổng quan học phần</Btn>
        </div>
        <div className={uiStyles.row}>
          <Btn onClick={() => useDialogs.getState().open('import-html')}><FileCode2 size={14} /> Nhập HTML từ Canvas...</Btn>
          <span className={uiStyles.hint}>Dán mã HTML của một trang Canvas có sẵn để sửa tiếp trong công cụ.</span>
        </div>
        {errors.length > 0 && (
          <div role="alert" style={{ padding: '8px 10px', borderRadius: 6, background: 'var(--danger-soft)', color: 'var(--danger)', fontSize: 12.5 }}>
            {errors.map((e) => <div key={e}>{e}</div>)}
          </div>
        )}
        <div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Đã lưu trong trình duyệt này</div>
          {list === null ? (
            <p className={uiStyles.hint}>Đang tải...</p>
          ) : list.length === 0 ? (
            <p className={uiStyles.hint}>Chưa có dự án nào.</p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, border: '1px solid var(--rule-2)', borderRadius: 8, maxHeight: 340, overflow: 'auto' }}>
              {list.map((p) => (
                <li key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderBottom: '1px solid var(--rule-2)' }}>
                  <button type="button" onClick={() => openSaved(p.id)} disabled={p.id === currentId} style={{ flex: 1, minWidth: 0, textAlign: 'left', border: 0, background: 'none', padding: 0 }}>
                    <div style={{ fontWeight: 600 }}>{p.name}{p.id === currentId ? ' (đang mở)' : ''}</div>
                    <div className={uiStyles.hint}>{p.moduleCount} module · sửa lần cuối {new Date(p.updatedAt).toLocaleString('vi-VN')}</div>
                  </button>
                  <IconBtn
                    small
                    label={`Xóa dự án ${p.name}`}
                    disabled={p.id === currentId}
                    onClick={async () => {
                      await deleteProject(p.id);
                      setList(await loadIndex());
                      toast('Đã xóa dự án khỏi trình duyệt.');
                    }}
                  >
                    <Trash2 size={13} />
                  </IconBtn>
                </li>
              ))}
            </ul>
          )}
          <p className={uiStyles.hint} style={{ marginTop: 6 }}>Dữ liệu chỉ nằm trong trình duyệt này. Hãy xuất JSON để sao lưu hoặc chuyển sang máy khác.</p>
        </div>
      </div>
    </Modal>
  );
}

export function NewProjectDialog() {
  const close = useDialogs((d) => d.close);
  const [name, setName] = useState('Bài học mới');
  const create = async () => {
    const ok = await saveNow(false);
    if (!ok) return; // Không tạo mới khi dự án hiện tại chưa lưu được, tránh mất dữ liệu.
    useEditor.getState().newProject(name.trim() || 'Bài học mới');
    toast('Đã tạo dự án mới. Dự án trước vẫn được lưu và mở lại được từ "Mở dự án".');
    close();
  };
  return (
    <Modal
      title="Tạo dự án mới"
      onClose={close}
      footer={<><Btn onClick={close}>Hủy</Btn><Btn variant="primary" onClick={create}>Tạo dự án</Btn></>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ margin: 0, lineHeight: 1.55 }}>Dự án hiện tại sẽ được lưu trong trình duyệt trước khi tạo dự án mới; bạn có thể mở lại bất cứ lúc nào.</p>
        <Field label="Tên dự án"><TextInput value={name} onChange={setName} /></Field>
      </div>
    </Modal>
  );
}

const SHORTCUTS: [string, string][] = [
  ['Ctrl + S', 'Lưu dự án'],
  ['Ctrl + Z', 'Hoàn tác'],
  ['Ctrl + Y hoặc Ctrl + Shift + Z', 'Làm lại'],
  ['Ctrl + C / Ctrl + X / Ctrl + V', 'Sao chép / cắt / dán module'],
  ['Ctrl + D', 'Nhân bản module'],
  ['Delete', 'Xóa module đang chọn'],
  ['Alt + ↑ / Alt + ↓', 'Đưa module lên / xuống'],
  ['Esc', 'Bỏ chọn'],
  ['Enter (trong thư viện)', 'Thêm module vào sau module đang chọn'],
  ['F2 (trong Cấu trúc)', 'Đổi tên module'],
  ['Tab / Shift + Tab (trong danh sách)', 'Thụt vào / thụt ra'],
];

export function ShortcutsDialog() {
  const close = useDialogs((d) => d.close);
  return (
    <Modal title="Phím tắt" onClose={close}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <tbody>
          {SHORTCUTS.map(([k, v]) => (
            <tr key={k} style={{ borderBottom: '1px solid var(--rule-2)' }}>
              <td style={{ padding: '7px 8px 7px 0', whiteSpace: 'nowrap' }}><kbd style={{ fontFamily: 'var(--font-mono)', fontSize: 12, padding: '2px 6px', border: '1px solid var(--rule)', borderRadius: 4, background: 'var(--panel-2)' }}>{k}</kbd></td>
              <td style={{ padding: '7px 0' }}>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className={uiStyles.hint} style={{ marginTop: 10 }}>Trên macOS dùng Cmd thay cho Ctrl.</p>
    </Modal>
  );
}

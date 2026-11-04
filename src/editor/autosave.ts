import { moduleCount, useEditor, type StylePreset, type Template } from './store';
import { loadLastProject, loadValue, saveProject, saveValue } from '../services/project-storage';
import { buildSampleProject } from '../samples/sample-project';
import { toast, toastError } from '../components/ui/Toasts';

const DEBOUNCE = 800;
let timer = 0;
let running: Promise<void> | null = null;

/** Lưu ngay dự án hiện tại vào trình duyệt. */
export async function saveNow(manual = false): Promise<boolean> {
  window.clearTimeout(timer);
  const st = useEditor.getState();
  const rev = st.revision;
  st.setSaveStatus('saving');
  try {
    if (running) await running;
    running = saveProject(st.project, moduleCount(st.project.nodes));
    await running;
    // Chỉ báo "Đã lưu" nếu không có thay đổi mới trong lúc đang lưu.
    if (useEditor.getState().revision === rev) useEditor.getState().setSaveStatus('saved');
    else schedule();
    if (manual) toast('Đã lưu dự án trong trình duyệt.');
    return true;
  } catch (e) {
    const msg = e instanceof DOMException && e.name === 'QuotaExceededError'
      ? 'Bộ nhớ trình duyệt đã đầy. Hãy xuất dự án ra JSON và xóa bớt dự án cũ hoặc giảm kích thước ảnh.'
      : `Không lưu được dự án: ${(e as Error).message}`;
    useEditor.getState().setSaveStatus('error', msg);
    toastError(msg);
    return false;
  } finally {
    running = null;
  }
}

function schedule() {
  window.clearTimeout(timer);
  timer = window.setTimeout(() => void saveNow(false), DEBOUNCE);
}

/** Khởi tạo: tải dự án gần nhất (hoặc bài mẫu ở lần đầu), mẫu và preset; bật tự động lưu. */
export async function initPersistence(): Promise<() => void> {
  try {
    const [last, templates, presets] = await Promise.all([
      loadLastProject(),
      loadValue<Template[]>('templates'),
      loadValue<StylePreset[]>('stylePresets'),
    ]);
    const st = useEditor.getState();
    if (Array.isArray(templates)) st.setTemplates(templates);
    if (Array.isArray(presets)) st.setStylePresets(presets);
    if (last) st.loadProject(last, { status: 'saved' });
    else st.loadProject(buildSampleProject(), { status: 'unsaved' });
  } catch (e) {
    toastError(`Không đọc được dữ liệu đã lưu: ${(e as Error).message}`);
    useEditor.getState().loadProject(buildSampleProject());
  }

  let lastRev = useEditor.getState().revision;
  let lastTemplates = useEditor.getState().templates;
  let lastPresets = useEditor.getState().stylePresets;
  if (useEditor.getState().saveStatus === 'unsaved') schedule();
  const unsub = useEditor.subscribe((s) => {
    if (s.revision !== lastRev) {
      lastRev = s.revision;
      if (s.saveStatus === 'unsaved') schedule();
    }
    if (s.templates !== lastTemplates) {
      lastTemplates = s.templates;
      saveValue('templates', s.templates).catch(() => toastError('Không lưu được thư viện mẫu.'));
    }
    if (s.stylePresets !== lastPresets) {
      lastPresets = s.stylePresets;
      saveValue('stylePresets', s.stylePresets).catch(() => toastError('Không lưu được preset.'));
    }
  });
  const beforeUnload = (e: BeforeUnloadEvent) => {
    const status = useEditor.getState().saveStatus;
    if (status === 'unsaved' || status === 'saving') {
      void saveNow(false);
      e.preventDefault();
    }
  };
  window.addEventListener('beforeunload', beforeUnload);
  return () => { unsub(); window.removeEventListener('beforeunload', beforeUnload); };
}

import { Suspense, lazy, useEffect, useState } from 'react';
import { Layers, Shapes } from 'lucide-react';
import { Toolbar } from '../components/Toolbar/Toolbar';
import { ModuleLibrary } from '../components/ModuleLibrary/ModuleLibrary';
import { LayersPanel } from '../components/LayersPanel/LayersPanel';
import { Canvas } from '../components/Canvas/Canvas';
import { PropertiesPanel } from '../components/PropertiesPanel/PropertiesPanel';
import { NewProjectDialog, OpenDialog, ShortcutsDialog } from '../components/ProjectDialogs';
import { ImportHtmlDialog } from '../components/ImportHtmlDialog';
import { Toasts } from '../components/ui/Toasts';
import { useDialogs } from '../components/dialogs';
import { DndProvider } from '../editor/DndProvider';
import { useEditor } from '../editor/store';
import { initPersistence } from '../editor/autosave';
import { useShortcuts } from '../hooks/useShortcuts';
import s from './App.module.css';

// Hộp thoại xuất (kèm thư viện PNG) chỉ tải khi cần.
const ExportDialog = lazy(() => import('../components/ExportDialog/ExportDialog').then((m) => ({ default: m.ExportDialog })));

export function App() {
  const [ready, setReady] = useState(false);
  const leftOpen = useEditor((st) => st.leftOpen);
  const rightOpen = useEditor((st) => st.rightOpen);
  const leftTab = useEditor((st) => st.leftTab);
  const mode = useEditor((st) => st.mode);
  const dialog = useDialogs((d) => d.which);
  useShortcuts();

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let cancelled = false;
    initPersistence().then((c) => {
      if (cancelled) return c();
      cleanup = c;
      setReady(true);
    });
    return () => { cancelled = true; cleanup?.(); };
  }, []);

  if (!ready) return <div className={s.loading}>Đang tải dự án...</div>;

  const cols = `${leftOpen ? '280px' : '0px'} minmax(0, 1fr) ${rightOpen && mode === 'design' ? '320px' : '0px'}`;
  return (
    <DndProvider>
      <div className={s.app}>
        <Toolbar />
        <div className={s.body} style={{ gridTemplateColumns: cols }}>
          <aside className={s.left} aria-label="Thư viện và cấu trúc" hidden={!leftOpen}>
            <div className={s.tabs} role="tablist">
              <button type="button" role="tab" aria-selected={leftTab === 'library'} onClick={() => useEditor.getState().setUi({ leftTab: 'library' })}>
                <Shapes size={14} /> Module
              </button>
              <button type="button" role="tab" aria-selected={leftTab === 'layers'} onClick={() => useEditor.getState().setUi({ leftTab: 'layers' })}>
                <Layers size={14} /> Cấu trúc
              </button>
            </div>
            <div className={s.leftBody}>{leftTab === 'library' ? <ModuleLibrary /> : <LayersPanel />}</div>
          </aside>
          <Canvas />
          <aside className={s.right} aria-label="Thuộc tính" hidden={!rightOpen || mode !== 'design'}>
            <PropertiesPanel />
          </aside>
        </div>
      </div>
      {dialog === 'export' && <Suspense fallback={null}><ExportDialog /></Suspense>}
      {dialog === 'open' && <OpenDialog />}
      {dialog === 'confirm-new' && <NewProjectDialog />}
      {dialog === 'shortcuts' && <ShortcutsDialog />}
      {dialog === 'import-html' && <ImportHtmlDialog />}
      <Toasts />
    </DndProvider>
  );
}

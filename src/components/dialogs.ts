import { create } from 'zustand';

export type DialogName = 'export' | 'open' | 'confirm-new' | 'shortcuts' | 'import-html';

export interface ExportParams {
  tab?: 'canvas' | 'standalone' | 'png' | 'json';
  scope?: 'page' | 'section' | 'node';
}

interface DialogState {
  which: DialogName | null;
  params: ExportParams;
  open(which: DialogName, params?: ExportParams): void;
  close(): void;
}

export const useDialogs = create<DialogState>()((set) => ({
  which: null,
  params: {},
  open: (which, params = {}) => set({ which, params }),
  close: () => set({ which: null, params: {} }),
}));

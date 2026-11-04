import { create } from 'zustand';

/** Trạng thái giao diện của các tiện ích trong trình thiết kế (không lưu vào dự án). */
interface WidgetUi {
  /** Ô đang chọn của Chương trình học (r = -1: tiêu đề cột). */
  cell: { nodeId: string; r: number; c: number } | null;
  /** Ngày vừa nhấp đúp trên lịch để thêm buổi học. */
  newSession: { nodeId: string; date: string; seq: number } | null;
  setCell(cell: WidgetUi['cell']): void;
  requestNewSession(nodeId: string, date: string): void;
  clearNewSession(): void;
}

let seq = 0;

export const useWidgetUi = create<WidgetUi>()((set) => ({
  cell: null,
  newSession: null,
  setCell: (cell) => set({ cell }),
  requestNewSession: (nodeId, date) => set({ newSession: { nodeId, date, seq: ++seq } }),
  clearNewSession: () => set({ newSession: null }),
}));

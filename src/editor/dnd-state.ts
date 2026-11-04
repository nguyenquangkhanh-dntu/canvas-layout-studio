import { create } from 'zustand';
import type { LayoutNode, ModuleType } from '../models/node';
import type { IconName } from '../modules/types';

export type DragData =
  | { kind: 'new'; label: string; icon: IconName; type: ModuleType; depth: number; create: () => LayoutNode }
  | { kind: 'move'; id: string; label: string; icon: IconName; type: ModuleType; depth: number };

export interface DropTarget {
  parentId: string | null;
  index: number;
  valid: boolean;
  reason?: string;
  /** Tọa độ màn hình (viewport) để vẽ chỉ báo. */
  indicator: { x: number; y: number; w: number; h: number; mode: 'line-h' | 'line-v' | 'box' };
}

interface DndState {
  active: DragData | null;
  target: DropTarget | null;
  setActive(a: DragData | null): void;
  setTarget(t: DropTarget | null): void;
}

export const useDnd = create<DndState>()((set) => ({
  active: null,
  target: null,
  setActive: (active) => set({ active, target: null }),
  setTarget: (target) => set({ target }),
}));

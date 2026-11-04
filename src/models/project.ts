import type { LayoutNode } from './node';
import { DEFAULT_FONT, type StyleProps } from './style';
import { uid } from '../utils/id';
import { defaultCourse, type CourseData } from './course';

export const SCHEMA_ID = 'canvas-layout-studio/project';
/** Phiên bản 2: thêm dữ liệu khóa học dùng chung (course). */
export const SCHEMA_VERSION = 3;

export interface PageSettings {
  /** Style của khung gốc `.cls-layout-root` (font, màu chữ, độ rộng, nền...). */
  style: StyleProps;
  /** Màu nhấn dùng cho nút, checklist... */
  accent: string;
  /** Màu tiêu đề mặc định. */
  headingColor: string;
  themeId?: string;
}

export interface Project {
  schema: typeof SCHEMA_ID;
  version: number;
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  page: PageSettings;
  /** Dữ liệu khóa học dùng chung cho các tiện ích. */
  course: CourseData;
  nodes: LayoutNode[];
}

export function defaultPage(): PageSettings {
  return {
    style: {
      fontFamily: DEFAULT_FONT,
      fontSize: 18,
      lineHeight: 1.65,
      color: '#1f2a37',
      maxWidth: { value: 960, unit: 'px' },
      align: 'center',
      gap: 24,
    },
    accent: '#1f5f8b',
    headingColor: '#163a56',
  };
}

export function createEmptyProject(name = 'Bài học mới'): Project {
  const now = new Date().toISOString();
  return {
    schema: SCHEMA_ID,
    version: SCHEMA_VERSION,
    id: uid('prj'),
    name,
    createdAt: now,
    updatedAt: now,
    page: defaultPage(),
    course: defaultCourse(),
    nodes: [],
  };
}

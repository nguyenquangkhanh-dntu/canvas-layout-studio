import type { LayoutNode } from '../models/node';
import type { IconName } from './types';
import { createColumns, createNode } from './registry';
import { CALLOUT_VARIANTS, type CalloutVariant } from '../models/callouts';
import { calloutStyle } from './defs/learning';
import { miniScheduleStyle } from './defs/schedule';

export type LibraryGroup = 'layout' | 'text' | 'media' | 'learning' | 'utility';

export interface LibraryEntry {
  id: string;
  group: LibraryGroup;
  label: string;
  description: string;
  icon: IconName;
  keywords?: string;
  create: () => LayoutNode;
}

export const GROUP_LABELS: Record<LibraryGroup | 'custom', string> = {
  layout: 'Bố cục',
  text: 'Văn bản',
  media: 'Đa phương tiện',
  learning: 'Thành phần học liệu',
  utility: 'Tiện ích',
  custom: 'Mẫu của tôi',
};

const text = (name: string, html: string) => createNode('text', { name, props: { html } });

export function createCallout(v: CalloutVariant): LayoutNode {
  return createNode('callout', {
    name: v.label,
    props: { variant: v.id, title: v.title, showTitle: true, icon: v.emoji, showIcon: true, titleColor: v.titleColor },
    style: calloutStyle(v.id),
    children: [text('Nội dung', v.bodyHtml)],
  });
}

export const LIBRARY: LibraryEntry[] = [
  // Bố cục
  { id: 'container', group: 'layout', label: 'Container', icon: 'box', description: 'Khối chứa có nền, viền, bo góc', keywords: 'khoi hop box',
    create: () => createNode('container') },
  { id: 'section', group: 'layout', label: 'Section', icon: 'section', description: 'Phần lớn của bài, có tiêu đề', keywords: 'phan muc',
    create: () => createNode('container', {
      name: 'Section',
      props: { tag: 'section', showTitle: true, title: 'Tên phần', titleLevel: 2 },
      style: { padding: { t: 0, r: 0, b: 0, l: 0 }, gap: 16 },
    }) },
  { id: 'row', group: 'layout', label: 'Row', icon: 'row', description: 'Xếp các module theo hàng ngang', keywords: 'hang ngang',
    create: () => createNode('container', { name: 'Row', props: { direction: 'row' }, style: { gap: 16 } }) },
  { id: 'columns2', group: 'layout', label: '2 cột', icon: 'columns2', description: 'Bố cục hai cột, tự xếp dọc trên điện thoại', keywords: 'columns cot',
    create: () => createColumns(2) },
  { id: 'columns3', group: 'layout', label: '3 cột', icon: 'columns3', description: 'Bố cục ba cột', keywords: 'columns cot',
    create: () => createColumns(3) },
  { id: 'columns4', group: 'layout', label: '4 cột', icon: 'columns4', description: 'Bố cục bốn cột', keywords: 'columns cot',
    create: () => createColumns(4) },
  { id: 'grid', group: 'layout', label: 'Grid', icon: 'grid', description: 'Lưới tự co giãn theo độ rộng', keywords: 'luoi',
    create: () => createNode('grid') },
  { id: 'spacer', group: 'layout', label: 'Spacer', icon: 'spacer', description: 'Khoảng trống dọc', keywords: 'khoang trong',
    create: () => createNode('spacer') },
  { id: 'divider', group: 'layout', label: 'Divider', icon: 'divider', description: 'Đường kẻ ngang phân cách', keywords: 'duong ke hr',
    create: () => createNode('divider') },

  // Văn bản
  { id: 'heading', group: 'text', label: 'Heading', icon: 'heading', description: 'Tiêu đề H1 đến H6', keywords: 'tieu de',
    create: () => createNode('heading') },
  { id: 'paragraph', group: 'text', label: 'Paragraph', icon: 'text', description: 'Đoạn văn', keywords: 'doan van',
    create: () => text('Đoạn văn', '<p>Nhập nội dung đoạn văn tại đây.</p>') },
  { id: 'richtext', group: 'text', label: 'Rich Text', icon: 'richtext', description: 'Văn bản định dạng nhiều đoạn', keywords: 'van ban',
    create: () => text('Rich Text', '<h3>Tiêu đề nhỏ</h3><p>Đoạn văn có thể <strong>in đậm</strong>, <em>in nghiêng</em> và <a href="https://canvas.instructure.com" target="_blank" rel="noopener noreferrer">liên kết</a>.</p>') },
  { id: 'quote', group: 'text', label: 'Quote', icon: 'quote', description: 'Trích dẫn có nguồn', keywords: 'trich dan',
    create: () => createNode('quote') },
  { id: 'callout', group: 'text', label: 'Callout', icon: 'callout', description: 'Khối nhấn mạnh có biểu tượng', keywords: 'nhan manh luu y',
    create: () => createCallout(CALLOUT_VARIANTS.find((v) => v.id === 'callout')!) },
  { id: 'bullets', group: 'text', label: 'Bullet List', icon: 'list', description: 'Danh sách gạch đầu dòng', keywords: 'danh sach',
    create: () => text('Danh sách', '<ul><li><p>Mục thứ nhất</p></li><li><p>Mục thứ hai</p></li><li><p>Mục thứ ba</p></li></ul>') },
  { id: 'numbered', group: 'text', label: 'Numbered List', icon: 'listOrdered', description: 'Danh sách đánh số', keywords: 'danh sach so',
    create: () => text('Danh sách số', '<ol><li><p>Bước thứ nhất</p></li><li><p>Bước thứ hai</p></li><li><p>Bước thứ ba</p></li></ol>') },
  { id: 'checklist', group: 'text', label: 'Checklist', icon: 'checklist', description: 'Danh sách việc cần làm', keywords: 'kiem tra viec',
    create: () => createNode('checklist') },
  { id: 'code', group: 'text', label: 'Code Block', icon: 'code', description: 'Đoạn mã giữ nguyên định dạng', keywords: 'ma nguon lap trinh',
    create: () => createNode('code') },
  { id: 'table', group: 'text', label: 'Bảng', icon: 'table', description: 'Bảng dữ liệu, dán được từ Excel', keywords: 'bang table excel',
    create: () => createNode('table') },
  { id: 'html', group: 'text', label: 'Khối HTML', icon: 'html', description: 'Mã HTML giữ nguyên, đã lọc an toàn', keywords: 'html ma nguon canvas nhung',
    create: () => createNode('html') },

  // Đa phương tiện
  { id: 'image', group: 'media', label: 'Image', icon: 'image', description: 'Ảnh từ máy tính hoặc URL', keywords: 'anh hinh',
    create: () => createNode('image') },
  { id: 'imageCaption', group: 'media', label: 'Image with Caption', icon: 'imageCaption', description: 'Ảnh kèm chú thích', keywords: 'anh chu thich',
    create: () => createNode('image', { name: 'Ảnh có chú thích', props: { showCaption: true } }) },
  { id: 'figure', group: 'media', label: 'Figure', icon: 'figure', description: 'Hình minh họa có khung và chú thích', keywords: 'hinh minh hoa',
    create: () => createNode('image', {
      name: 'Figure',
      props: { showCaption: true, caption: 'Hình 1. Mô tả hình minh họa' },
      style: { borderStyle: 'solid', borderWidth: 1, borderColor: '#d5dce3', radius: { tl: 8, tr: 8, br: 8, bl: 8 }, maxWidth: { value: 720, unit: 'px' }, align: 'center' },
    }) },
  { id: 'video', group: 'media', label: 'Video Embed', icon: 'video', description: 'Nhúng video YouTube hoặc Vimeo', keywords: 'youtube vimeo',
    create: () => createNode('video') },
  { id: 'button', group: 'media', label: 'Button', icon: 'button', description: 'Liên kết dạng nút bấm', keywords: 'nut lien ket',
    create: () => createNode('button') },

  // Thành phần học liệu
  ...CALLOUT_VARIANTS.filter((v) => v.id !== 'callout').map(
    (v): LibraryEntry => ({ id: `callout-${v.id}`, group: 'learning', label: v.label, icon: v.icon, description: v.description, create: () => createCallout(v) }),
  ),
  { id: 'codeExample', group: 'learning', label: 'Code Example', icon: 'code', description: 'Ví dụ mã có tiêu đề', keywords: 'vi du code',
    create: () => createNode('code', {
      name: 'Code Example',
      props: { title: 'Ví dụ', language: 'C#', code: 'app.MapGet("/api/books", () => books);' },
    }) },

  // Tiện ích (dùng dữ liệu khóa học trong Cài đặt trang)
  { id: 'schedule', group: 'utility', label: 'Lịch học', icon: 'calendar', description: 'Lịch tháng, đánh dấu buổi học', keywords: 'lich hoc calendar thoi khoa bieu',
    create: () => createNode('schedule') },
  { id: 'scheduleMini', group: 'utility', label: 'Lịch học mini', icon: 'calendarMini', description: 'Lịch nhỏ cho cột bên', keywords: 'lich mini nho',
    create: () => createNode('schedule', { name: 'Lịch học mini', props: { size: 'mini' }, style: miniScheduleStyle() }) },
  { id: 'curriculum', group: 'utility', label: 'Chương trình học', icon: 'curriculum', description: 'Bảng nội dung theo buổi, tiết', keywords: 'chuong trinh de cuong tiet buoi',
    create: () => createNode('curriculum') },
  { id: 'progress', group: 'utility', label: 'Tiến độ khóa học', icon: 'progress', description: 'Thanh tiến độ theo tuần', keywords: 'tien do progress tuan',
    create: () => createNode('progress') },
];

export function findEntry(id: string): LibraryEntry | undefined {
  return LIBRARY.find((e) => e.id === id);
}

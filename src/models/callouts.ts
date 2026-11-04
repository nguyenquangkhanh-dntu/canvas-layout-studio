import type { IconName } from '../modules/types';

export interface CalloutVariant {
  id: string;
  label: string;
  description: string;
  icon: IconName;
  /** Ký tự biểu tượng xuất ra HTML (Canvas không cho SVG nên dùng emoji). */
  emoji: string;
  title: string;
  bg: string;
  bar: string;
  titleColor: string;
  bodyHtml: string;
}

export const CALLOUT_VARIANTS: CalloutVariant[] = [
  {
    id: 'objectives', label: 'Mục tiêu học tập', description: 'Người học sẽ làm được gì sau bài', icon: 'target',
    emoji: '🎯', title: 'Mục tiêu học tập', bg: '#eef5fb', bar: '#1f5f8b', titleColor: '#163a56',
    bodyHtml: '<p>Sau bài học này, sinh viên có thể:</p><ul><li><p>Trình bày được khái niệm chính của bài.</p></li><li><p>Vận dụng kiến thức vào một ví dụ cụ thể.</p></li></ul>',
  },
  {
    id: 'takeaways', label: 'Điểm cần nhớ', description: 'Tóm lược ý quan trọng nhất', icon: 'key',
    emoji: '🔑', title: 'Điểm cần nhớ', bg: '#f1f8f4', bar: '#2f7d4f', titleColor: '#1e5435',
    bodyHtml: '<ul><li><p>Ý chính thứ nhất.</p></li><li><p>Ý chính thứ hai.</p></li></ul>',
  },
  {
    id: 'note', label: 'Ghi chú', description: 'Thông tin bổ sung', icon: 'note',
    emoji: '📝', title: 'Ghi chú', bg: '#f5f6f8', bar: '#64748b', titleColor: '#334155',
    bodyHtml: '<p>Nội dung ghi chú bổ sung cho phần trên.</p>',
  },
  {
    id: 'important', label: 'Quan trọng', description: 'Điều người học không được bỏ qua', icon: 'important',
    emoji: '❗', title: 'Quan trọng', bg: '#fdf1f0', bar: '#b42318', titleColor: '#8a1c14',
    bodyHtml: '<p>Nội dung quan trọng cần đặc biệt chú ý.</p>',
  },
  {
    id: 'warning', label: 'Cảnh báo', description: 'Lỗi thường gặp, rủi ro', icon: 'warning',
    emoji: '⚠️', title: 'Cảnh báo', bg: '#fff8e6', bar: '#c58a00', titleColor: '#7a5500',
    bodyHtml: '<p>Lỗi thường gặp và cách tránh.</p>',
  },
  {
    id: 'example', label: 'Ví dụ', description: 'Minh họa cụ thể cho khái niệm', icon: 'example',
    emoji: '💡', title: 'Ví dụ', bg: '#f4f1fb', bar: '#6d4fc2', titleColor: '#4a3391',
    bodyHtml: '<p>Mô tả ví dụ minh họa.</p>',
  },
  {
    id: 'exercise', label: 'Bài tập', description: 'Nhiệm vụ thực hành cho người học', icon: 'exercise',
    emoji: '✍️', title: 'Bài tập', bg: '#eef7f8', bar: '#0e7490', titleColor: '#0b5568',
    bodyHtml: '<ol><li><p>Yêu cầu thứ nhất.</p></li><li><p>Yêu cầu thứ hai.</p></li></ol>',
  },
  {
    id: 'check', label: 'Kiểm tra nhanh', description: 'Câu hỏi tự kiểm tra kèm đáp án', icon: 'question',
    emoji: '❓', title: 'Kiểm tra nhanh', bg: '#fdf4fa', bar: '#a3337a', titleColor: '#7a2159',
    bodyHtml: '<p><strong>Câu hỏi:</strong> Nội dung câu hỏi?</p><ol type="A"><li><p>Phương án A</p></li><li><p>Phương án B</p></li><li><p>Phương án C</p></li></ol><p><em>Đáp án: B. Giải thích ngắn gọn.</em></p>',
  },
  {
    id: 'summary', label: 'Tóm tắt', description: 'Tổng kết cuối bài', icon: 'summary',
    emoji: '📌', title: 'Tóm tắt', bg: '#f3f5f9', bar: '#1f4e79', titleColor: '#1f4e79',
    bodyHtml: '<p>Tóm tắt nội dung chính của bài học.</p>',
  },
  {
    id: 'resources', label: 'Tài liệu tham khảo', description: 'Danh sách liên kết học thêm', icon: 'links',
    emoji: '🔗', title: 'Tài liệu tham khảo', bg: '#f7f8fa', bar: '#475569', titleColor: '#1f2a37',
    bodyHtml: '<ul><li><p><a href="https://developer.mozilla.org/vi/" target="_blank" rel="noopener noreferrer">MDN Web Docs</a></p></li></ul>',
  },
  {
    id: 'callout', label: 'Callout', description: 'Khối nhấn mạnh tùy chỉnh', icon: 'callout',
    emoji: '💬', title: 'Lưu ý', bg: '#eef5fb', bar: '#1f5f8b', titleColor: '#163a56',
    bodyHtml: '<p>Nội dung cần nhấn mạnh.</p>',
  },
];

export function getCalloutVariant(id: string): CalloutVariant {
  return CALLOUT_VARIANTS.find((v) => v.id === id) ?? CALLOUT_VARIANTS[CALLOUT_VARIANTS.length - 1];
}

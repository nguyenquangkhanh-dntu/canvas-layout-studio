/**
 * Danh sách thẻ, thuộc tính và CSS mà Canvas LMS giữ lại khi lưu nội dung.
 * Đối chiếu từ mã nguồn Canvas: gems/canvas_sanitize/lib/canvas_sanitize/canvas_sanitize.rb
 * (nhánh master, tra cứu 10/2026). Từng trường có thể cấu hình khác - luôn kiểm thử thực tế.
 */

export const CANVAS_ELEMENTS = new Set([
  'a', 'b', 'blockquote', 'br', 'caption', 'cite', 'code', 'col', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'del', 'ins', 'iframe', 'font', 'colgroup', 'dd', 'div', 'dl', 'dt', 'em', 'figure', 'figcaption', 'i',
  'img', 'li', 'ol', 'p', 'pre', 'q', 'small', 'source', 'span', 'strike', 'strong', 'sub', 'sup', 'abbr',
  'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'u', 'ul', 'object', 'embed', 'param', 'video',
  'track', 'audio', 'address', 'acronym', 'map', 'area', 'bdo', 'dfn', 'kbd', 'legend', 'samp', 'tt',
  'var', 'big', 'article', 'aside',
]);

export const CANVAS_GLOBAL_ATTRS = new Set(['style', 'class', 'id', 'title', 'role', 'lang', 'dir']);

export const CANVAS_ELEMENT_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href', 'target', 'name']),
  img: new Set(['align', 'alt', 'height', 'src', 'width', 'longdesc']),
  iframe: new Set(['src', 'width', 'height', 'name', 'align', 'frameborder', 'scrolling', 'allow', 'sandbox', 'loading', 'allowfullscreen']),
  ol: new Set(['start', 'type']),
  ul: new Set(['type']),
  blockquote: new Set(['cite']),
  q: new Set(['cite']),
  td: new Set(['colspan', 'rowspan', 'width', 'align', 'valign']),
  th: new Set(['colspan', 'rowspan', 'width', 'align', 'valign', 'scope']),
};

const BASE_CSS = [
  'align-content', 'align-items', 'align-self', 'background', 'border', 'border-radius', 'clear', 'clip',
  'color', 'column-gap', 'cursor', 'direction', 'display', 'flex', 'flex-basis', 'flex-direction',
  'flex-flow', 'flex-grow', 'flex-shrink', 'flex-wrap', 'float', 'font', 'gap', 'grid', 'height',
  'justify-content', 'justify-items', 'justify-self', 'left', 'line-height', 'list-style', 'margin',
  'max-height', 'max-width', 'min-height', 'min-width', 'order', 'overflow', 'overflow-x', 'overflow-y',
  'padding', 'position', 'place-content', 'place-items', 'place-self', 'right', 'row-gap', 'text-align',
  'table-layout', 'text-decoration', 'text-indent', 'top', 'user-select', 'vertical-align', 'visibility',
  'white-space', 'width', 'z-index', 'zoom',
];

export const CANVAS_CSS = new Set<string>([
  ...BASE_CSS,
  ...['area', 'auto-columns', 'auto-flow', 'auto-rows', 'column', 'gap', 'row', 'template'].map((i) => `grid-${i}`),
  ...['areas', 'columns', 'rows'].map((i) => `grid-template-${i}`),
  ...['end', 'gap', 'start'].map((i) => `grid-column-${i}`),
  ...['end', 'gap', 'start'].map((i) => `grid-row-${i}`),
  ...['attachment', 'color', 'image', 'position', 'repeat'].map((i) => `background-${i}`),
  ...['x', 'y'].map((i) => `background-position-${i}`),
  ...['bottom', 'collapse', 'color', 'left', 'right', 'spacing', 'style', 'top', 'width'].map((i) => `border-${i}`),
  ...['bottom', 'left', 'right', 'top'].flatMap((i) => ['color', 'style', 'width'].map((j) => `border-${i}-${j}`)),
  ...['family', 'size', 'stretch', 'style', 'variant', 'width'].map((i) => `font-${i}`),
  ...['image', 'position', 'type'].map((i) => `list-style-${i}`),
  ...['bottom', 'left', 'right', 'top', 'offset'].map((i) => `margin-${i}`),
  ...['bottom', 'left', 'right', 'top'].map((i) => `padding-${i}`),
]);

/** Giao thức URL Canvas giữ lại cho href/src (data: chỉ được giữ ở <source>/<track>). */
export const CANVAS_URL_PROTOCOLS = ['http', 'https'];

/** Mô tả lý do khi một thuộc tính CSS bị Canvas loại bỏ, kèm cách xử lý. */
export const CANVAS_CSS_NOTES: Record<string, string> = {
  'box-shadow': 'Canvas loại bỏ box-shadow. Có thể bật "Thay shadow bằng viền mảnh" để giữ cảm giác tách khối.',
  'font-weight': 'Canvas loại bỏ font-weight; bộ xuất chuyển sang thuộc tính rút gọn "font" để giữ độ đậm.',
  'letter-spacing': 'Canvas loại bỏ letter-spacing; khoảng cách chữ sẽ về mặc định.',
  'object-fit': 'Canvas loại bỏ object-fit; ảnh có chiều cao cố định có thể bị kéo giãn. Nên để chiều cao "auto".',
  'box-sizing': 'Canvas loại bỏ box-sizing.',
  opacity: 'Canvas loại bỏ opacity.',
};

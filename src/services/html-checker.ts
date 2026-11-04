import { CANVAS_CSS, CANVAS_ELEMENTS, CANVAS_ELEMENT_ATTRS, CANVAS_GLOBAL_ATTRS } from './canvas-whitelist';

export interface CheckFinding {
  level: 'error' | 'warning' | 'info';
  message: string;
}

/**
 * Kiểm tra độc lập một đoạn HTML theo quy tắc lọc của Canvas.
 * Chạy trên chính chuỗi HTML đầu ra (không dựa vào dữ liệu dự án),
 * nên phát hiện được cả lỗi của bộ xuất lẫn HTML người dùng tự sửa.
 */
export function checkCanvasHtml(html: string): CheckFinding[] {
  const findings: CheckFinding[] = [];
  const seen = new Set<string>();
  const add = (level: CheckFinding['level'], message: string) => {
    if (seen.has(message)) return;
    seen.add(message);
    findings.push({ level, message });
  };
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const all = Array.from(doc.body.querySelectorAll('*'));
  if (/<script[\s>]/i.test(html)) add('error', 'Có thẻ <script>: Canvas sẽ xóa toàn bộ JavaScript.');
  if (/<style[\s>]/i.test(html)) add('error', 'Có thẻ <style>: Canvas sẽ xóa, toàn bộ CSS trong đó mất tác dụng.');

  let external = 0;
  for (const el of all) {
    const tag = el.tagName.toLowerCase();
    if (!CANVAS_ELEMENTS.has(tag) && tag !== 'script' && tag !== 'style') {
      add('warning', `Thẻ <${tag}> không nằm trong danh sách Canvas cho phép và sẽ bị loại bỏ.`);
    }
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      if (name.startsWith('on')) add('error', `Thuộc tính sự kiện ${name} sẽ bị Canvas xóa.`);
      else if (!(CANVAS_GLOBAL_ATTRS.has(name) || name.startsWith('aria-') || name.startsWith('data-') || CANVAS_ELEMENT_ATTRS[tag]?.has(name))) {
        add('info', `Thuộc tính ${name} trên <${tag}> sẽ bị Canvas bỏ qua.`);
      }
    }
    const style = el.getAttribute('style');
    if (style) {
      for (const decl of style.split(';')) {
        const prop = decl.split(':')[0]?.trim().toLowerCase();
        if (prop && !prop.startsWith('--') && !CANVAS_CSS.has(prop)) add('warning', `CSS "${prop}" sẽ bị Canvas loại bỏ.`);
      }
    }
    for (const name of ['href', 'src']) {
      const v = el.getAttribute(name);
      if (!v) continue;
      const scheme = /^\s*([a-z][a-z0-9+.-]*):/i.exec(v)?.[1]?.toLowerCase();
      if (scheme && !['http', 'https', 'mailto', 'tel'].includes(scheme)) {
        if (scheme === 'data') add('error', `Tài nguyên dạng data: trên <${tag}> sẽ bị Canvas xóa. Hãy tải tệp lên Canvas Files và dùng URL.`);
        else add('error', `Giao thức "${scheme}:" không an toàn hoặc không được Canvas cho phép.`);
      }
      if (/^https?:\/\//i.test(v) && (tag === 'img' || tag === 'iframe')) external++;
    }
  }
  if (external) add('info', `Có ${external} tài nguyên (ảnh/iframe) tải từ máy chủ bên ngoài.`);
  return findings;
}

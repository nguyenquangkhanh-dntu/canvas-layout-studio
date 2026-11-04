import { documentWithExternalCss, exportProject } from './html-exporter';
import type { Project } from '../models/project';
import { safeFileName } from './import-export';

/** Tải một Blob xuống máy người dùng. */
export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function downloadText(text: string, fileName: string, type: string) {
  downloadBlob(new Blob([text], { type: `${type};charset=utf-8` }), fileName);
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Dự phòng cho trình duyệt chặn Clipboard API.
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}

const EXT: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp', 'image/avif': 'avif' };

/**
 * Gói ZIP: index.html + styles.css + thư mục images/ (ảnh nhúng được tách ra tệp riêng).
 */
export async function buildZip(project: Project): Promise<Blob> {
  const { default: JSZip } = await import('jszip');
  const res = exportProject(project, { mode: 'standalone' });
  const zip = new JSZip();
  let body = res.body;
  let n = 0;
  const seen = new Map<string, string>();
  body = body.replace(/src="(data:image\/([a-z+]+);base64,([^"]+))"/gi, (_m, full: string, sub: string, b64: string) => {
    if (seen.has(full)) return `src="${seen.get(full)}"`;
    const ext = EXT[`image/${sub.toLowerCase()}`] ?? 'png';
    const name = `images/anh-${++n}.${ext}`;
    zip.file(name, b64, { base64: true });
    seen.set(full, name);
    return `src="${name}"`;
  });
  zip.file('index.html', documentWithExternalCss(project, body, res.hasScript));
  zip.file('styles.css', `body { margin: 0; padding: 32px 16px; background-color: #ffffff; }\n${res.css}\n`);
  zip.file(
    'DOC-TRUOC.txt',
    'Mở index.html bằng trình duyệt để xem bài học.\nThư mục images/ chứa các ảnh đã nhúng trong dự án.\nĐể dán vào Canvas LMS, hãy dùng chế độ "HTML cho Canvas" trong ứng dụng.\n',
  );
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}

export function exportFileName(project: Project, ext: string, suffix = ''): string {
  const base = safeFileName(project.name, ext);
  return suffix ? base.replace(new RegExp(`\\.${ext}$`), `-${suffix}.${ext}`) : base;
}

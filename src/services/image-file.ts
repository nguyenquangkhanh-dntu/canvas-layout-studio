/** Đọc ảnh từ máy tính thành data URL; tự thu nhỏ ảnh lớn để tệp dự án và HTML không quá nặng. */

export const MAX_IMAGE_INPUT = 15 * 1024 * 1024;
const MAX_SIDE = 1600;

export interface LoadedImage {
  src: string;
  width: number;
  height: number;
  bytes: number;
  resized: boolean;
}

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('Không đọc được tệp ảnh.'));
    r.readAsDataURL(file);
  });
}

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Tệp không phải ảnh hợp lệ.'));
    img.src = src;
  });
}

export async function loadImageFile(file: File, autoResize = true): Promise<LoadedImage> {
  if (!/^image\/(png|jpe?g|gif|webp|avif)$/i.test(file.type)) {
    throw new Error('Chỉ hỗ trợ ảnh PNG, JPG, GIF, WebP hoặc AVIF (không hỗ trợ SVG vì lý do an toàn).');
  }
  if (file.size > MAX_IMAGE_INPUT) throw new Error('Ảnh lớn hơn 15 MB. Hãy giảm kích thước ảnh trước khi chèn.');
  const original = await readAsDataUrl(file);
  const img = await loadImg(original);
  const w = img.naturalWidth, h = img.naturalHeight;
  const tooBig = Math.max(w, h) > MAX_SIDE || file.size > 600_000;
  if (!autoResize || !tooBig || file.type === 'image/gif') {
    return { src: original, width: w, height: h, bytes: file.size, resized: false };
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return { src: original, width: w, height: h, bytes: file.size, resized: false };
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  const src = canvas.toDataURL(type, 0.86);
  const bytes = Math.round(((src.length - src.indexOf(',') - 1) * 3) / 4);
  // Nếu nén không nhỏ hơn bản gốc thì giữ bản gốc.
  if (bytes >= file.size) return { src: original, width: w, height: h, bytes: file.size, resized: false };
  return { src, width: canvas.width, height: canvas.height, bytes, resized: true };
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

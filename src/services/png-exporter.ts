import { toBlob } from 'html-to-image';
import type { Project } from '../models/project';
import { exportProject } from './html-exporter';
import { isExternalUrl } from './safe-values';
import { uid } from '../utils/id';

export interface PngOptions {
  nodeIds?: string[];
  width: number;
  scale: 1 | 2 | 3;
  background: 'transparent' | string;
  padding: number;
}

export interface PngResult {
  blob: Blob;
  width: number;
  height: number;
  warnings: string[];
}

/** Giới hạn an toàn của canvas trong trình duyệt (Chrome/Edge: ~16384 px mỗi chiều). */
const MAX_SIDE = 16000;
const MAX_AREA = 120_000_000;

export class PngTooLargeError extends Error {}

function waitImages(root: HTMLElement): Promise<string[]> {
  const imgs = Array.from(root.querySelectorAll('img'));
  return Promise.all(
    imgs.map(
      (img) =>
        new Promise<string | null>((resolve) => {
          const done = () => resolve(img.naturalWidth === 0 ? img.getAttribute('src') ?? '' : null);
          if (img.complete) return done();
          img.addEventListener('load', done, { once: true });
          img.addEventListener('error', done, { once: true });
          setTimeout(done, 8000);
        }),
    ),
  ).then((list) => list.filter((x): x is string => x !== null));
}

/** Ảnh từ máy chủ khác chỉ chụp được khi máy chủ đó cho phép CORS. */
async function checkCors(urls: string[]): Promise<string[]> {
  const bad: string[] = [];
  await Promise.all(
    urls.map(async (u) => {
      try {
        const r = await fetch(u, { mode: 'cors', cache: 'force-cache' });
        if (!r.ok) bad.push(u);
      } catch {
        bad.push(u);
      }
    }),
  );
  return bad;
}

/**
 * Xuất PNG từ chính HTML xuất bản (không chứa khung chọn, tay nắm, toolbar).
 * Bản HTML được dựng trong một vùng ẩn ngoài màn hình rồi chụp lại.
 */
export async function exportPng(project: Project, opts: PngOptions): Promise<PngResult> {
  const warnings: string[] = [];
  const scope = `cls-png-${uid('x').slice(2)}`;
  const res = exportProject(project, { mode: 'png', nodeIds: opts.nodeIds, scope });
  if (!res.body.includes('<')) throw new Error('Không có nội dung để xuất.');

  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText = `position:fixed;left:-100000px;top:0;width:${opts.width}px;pointer-events:none;`;
  const frame = document.createElement('div');
  frame.style.cssText = `width:${opts.width}px;padding:${opts.padding}px;background:${opts.background === 'transparent' ? 'transparent' : opts.background};`;
  const style = document.createElement('style');
  style.textContent = res.css;
  frame.innerHTML = res.body;
  host.append(style, frame);
  document.body.appendChild(host);

  try {
    const failed = await waitImages(frame);
    if (failed.length) warnings.push(`${failed.length} ảnh không tải được và sẽ để trống trong PNG.`);
    const external = Array.from(frame.querySelectorAll('img'))
      .map((i) => i.getAttribute('src') ?? '')
      .filter((u) => isExternalUrl(u) && !failed.includes(u));
    const corsBad = await checkCors([...new Set(external)]);
    if (corsBad.length) warnings.push(`${corsBad.length} ảnh từ máy chủ khác không cho phép chụp (CORS) và sẽ để trống. Hãy chèn ảnh từ máy tính để xuất PNG đầy đủ.`);
    if (frame.querySelector('iframe')) warnings.push('Video nhúng không chụp được trong PNG và sẽ hiện thành khung trống.');
    if ('fonts' in document) await document.fonts.ready;

    const rect = frame.getBoundingClientRect();
    const width = Math.ceil(rect.width);
    const height = Math.ceil(rect.height);
    const pw = width * opts.scale, ph = height * opts.scale;
    if (pw > MAX_SIDE || ph > MAX_SIDE || pw * ph > MAX_AREA) {
      throw new PngTooLargeError(
        `Ảnh quá lớn (${pw}×${ph} px) so với giới hạn của trình duyệt. Hãy giảm độ phân giải xuống 1x, hoặc xuất từng section riêng.`,
      );
    }
    const blob = await toBlob(frame, {
      pixelRatio: opts.scale,
      width,
      height,
      backgroundColor: opts.background === 'transparent' ? undefined : opts.background,
      cacheBust: false,
      skipFonts: true,
      imagePlaceholder: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
      filter: (n) => !(n instanceof HTMLIFrameElement),
    });
    if (!blob || blob.size < 100) throw new Error('Trình duyệt không tạo được ảnh PNG.');
    return { blob, width: pw, height: ph, warnings };
  } finally {
    host.remove();
  }
}

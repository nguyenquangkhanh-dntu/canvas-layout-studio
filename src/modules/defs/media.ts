import type { HChild, ModuleDef } from '../types';
import { getProps } from '../types';
import { BOX_PARTS, OUTER_PARTS, mergeCss, sizeToCss, styleToCss } from '../../services/css';
import { safeHref, safeImageSrc } from '../../services/safe-values';

/* ------------------------------------------------------------------ Image */

export type ImageProps = { src: string; alt: string; caption: string; showCaption: boolean; fit: 'cover' | 'contain' | 'fill' };

export const imageDef: ModuleDef<ImageProps> = {
  type: 'image',
  label: 'Image',
  icon: 'image',
  isContainer: false,
  defaultProps: () => ({ src: '', alt: '', caption: 'Chú thích ảnh', showCaption: false, fit: 'cover' }),
  defaultStyle: () => ({ radius: { tl: 8, tr: 8, br: 8, bl: 8 }, margin: { t: 0, r: 0, b: 0, l: 0 } }),
  groups: ['layout', 'border', 'shadow', 'spacing'],
  render(node, ctx) {
    const p = getProps(node, imageDef);
    const src = safeImageSrc(p.src);
    const s = node.style;
    // Kích thước và lề áp dụng cho <figure>, phần viền/bo góc/bóng áp dụng cho <img>.
    const outer = styleToCss({ ...s, height: undefined, minHeight: undefined, maxHeight: undefined }, OUTER_PARTS);
    const imgBox = styleToCss(s, BOX_PARTS.filter((x) => x !== 'padding' && x !== 'type' && x !== 'gap'));
    const height = sizeToCss(s.height);
    const children: HChild[] = [];
    if (src && src.startsWith('/') && ctx.mode === 'editor') {
      // Ảnh trong Files của Canvas cần đăng nhập Canvas: hiện khung giữ chỗ thay vì ảnh hỏng.
      children.push({
        tag: 'div',
        attrs: { 'data-image-placeholder': '', title: src },
        style: mergeCss({ display: 'flex', 'flex-direction': 'column', 'align-items': 'center', 'justify-content': 'center', gap: '4px', 'min-height': '140px', padding: '12px', border: '1px dashed #b9c6d2', 'background-color': '#f2f5f8', color: '#5b6b77', 'font-size': '14px', 'text-align': 'center' }, imgBox),
        children: [`Ảnh từ Files của Canvas${p.alt ? `: ${p.alt}` : ''}`, { tag: 'span', style: { 'font-size': '12.5px' }, children: ['Hiện khi dán vào Canvas'] }],
      });
    } else if (src) {
      children.push({
        tag: 'img',
        attrs: { src, alt: p.alt || '' },
        style: mergeCss(
          { display: 'block', width: '100%', height: height ?? 'auto', 'max-width': '100%' },
          height && height !== 'auto' ? { 'object-fit': p.fit } : {},
          imgBox,
        ),
      });
    } else if (ctx.mode === 'editor') {
      children.push({
        tag: 'div',
        attrs: { 'data-image-placeholder': '' },
        style: mergeCss({ display: 'flex', 'align-items': 'center', 'justify-content': 'center', 'min-height': '160px', 'background-color': '#eef2f6', color: '#5b6b77', 'font-size': '15px' }, imgBox),
        children: ['Chưa có ảnh - chọn ảnh ở bảng Thuộc tính'],
      });
    } else {
      return { tag: '#fragment', nodeId: node.id, children: [] };
    }
    if (p.showCaption && p.caption) {
      children.push({
        tag: 'figcaption',
        style: { 'margin-top': '8px', 'font-size': '15px', color: '#5b6b77', 'text-align': 'center' },
        editable: { nodeId: node.id, field: 'caption' },
        children: [p.caption],
      });
    }
    return { tag: 'figure', nodeId: node.id, style: mergeCss({ margin: '0' }, outer), children };
  },
};

/* ------------------------------------------------------------------ Video */

export type VideoProps = { url: string; title: string; aspect: '16:9' | '4:3'; linkUnderline: boolean };

/** Chuyển URL YouTube/Vimeo thành URL nhúng. Trả về null nếu không nhận dạng được. */
export function toEmbedUrl(url: string): { src: string; provider: 'youtube' | 'vimeo' } | null {
  const u = url.trim();
  let m = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{6,15})/.exec(u);
  if (m) return { src: `https://www.youtube-nocookie.com/embed/${m[1]}`, provider: 'youtube' };
  m = /vimeo\.com\/(?:video\/)?(\d{5,12})/.exec(u);
  if (m) return { src: `https://player.vimeo.com/video/${m[1]}`, provider: 'vimeo' };
  return null;
}

export const videoDef: ModuleDef<VideoProps> = {
  type: 'video',
  label: 'Video Embed',
  icon: 'video',
  isContainer: false,
  defaultProps: () => ({ url: '', title: 'Video bài giảng', aspect: '16:9', linkUnderline: true }),
  defaultStyle: () => ({ radius: { tl: 10, tr: 10, br: 10, bl: 10 } }),
  groups: ['layout', 'border', 'shadow', 'spacing'],
  render(node, ctx) {
    const p = getProps(node, videoDef);
    const embed = toEmbedUrl(p.url || '');
    const outer = styleToCss(node.style, OUTER_PARTS);
    const box = styleToCss(node.style, ['background', 'border', 'radius', 'shadow']);
    const ratio = p.aspect === '4:3' ? '75%' : '56.25%';
    if (!embed && ctx.mode !== 'editor') {
      const href = safeHref(p.url);
      if (!href) return { tag: '#fragment', nodeId: node.id, children: [] };
      return { tag: 'p', nodeId: node.id, style: outer, children: [{ tag: 'a', attrs: { href, target: '_blank', rel: 'noopener noreferrer' }, style: { 'text-decoration': p.linkUnderline !== false ? 'underline' : 'none' }, children: [p.title || 'Xem video'] }] };
    }
    const inner: HChild =
      ctx.mode === 'editor'
        ? {
            tag: 'div',
            attrs: { 'data-video-placeholder': '' },
            style: {
              position: 'absolute', top: '0', left: '0', width: '100%', height: '100%', display: 'flex', 'flex-direction': 'column',
              'align-items': 'center', 'justify-content': 'center', gap: '8px', 'background-color': '#16212e', color: '#e6edf3', 'font-size': '15px',
            },
            children: [
              { tag: 'span', style: { 'font-size': '40px', 'line-height': '1' }, children: ['▶'] },
              embed ? `${embed.provider === 'youtube' ? 'YouTube' : 'Vimeo'}: ${p.title || 'Video'}` : 'Dán URL YouTube hoặc Vimeo ở bảng Thuộc tính',
            ],
          }
        : {
            tag: 'iframe',
            attrs: {
              src: embed!.src,
              title: p.title || 'Video',
              loading: 'lazy',
              allow: 'accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
              allowfullscreen: 'true',
              frameborder: '0',
            },
            style: { position: 'absolute', top: '0', left: '0', width: '100%', height: '100%', border: '0' },
          };
    return {
      tag: 'div',
      nodeId: node.id,
      style: outer,
      children: [{ tag: 'div', style: mergeCss({ position: 'relative', 'padding-top': ratio, height: '0', overflow: 'hidden' }, box), children: [inner] }],
    };
  },
};

/* ------------------------------------------------------------------ Button (liên kết dạng nút) */

export type ButtonProps = { label: string; href: string; newTab: boolean; position: 'left' | 'center' | 'right' };

export const buttonDef: ModuleDef<ButtonProps> = {
  type: 'button',
  label: 'Button',
  icon: 'button',
  isContainer: false,
  defaultProps: () => ({ label: 'Mở tài liệu', href: 'https://', newTab: true, position: 'left' }),
  defaultStyle: () => ({
    color: '#ffffff', radius: { tl: 8, tr: 8, br: 8, bl: 8 }, padding: { t: 12, r: 22, b: 12, l: 22 }, fontWeight: 600, fontSize: 17,
  }),
  groups: ['typography', 'background', 'border', 'shadow', 'spacing'],
  render(node, ctx) {
    const p = getProps(node, buttonDef);
    const href = safeHref(p.href) ?? '#';
    const attrs: Record<string, string> = { href };
    if (p.newTab) { attrs.target = '_blank'; attrs.rel = 'noopener noreferrer'; }
    return {
      tag: 'div',
      nodeId: node.id,
      style: mergeCss({ 'text-align': p.position }, styleToCss(node.style, ['margin'])),
      children: [{
        tag: 'a',
        attrs,
        editable: { nodeId: node.id, field: 'label', placeholder: 'Nhãn nút' },
        style: mergeCss(
          { display: 'inline-block', 'text-decoration': 'none', 'background-color': ctx.page.accent, 'line-height': '1.3' },
          styleToCss(node.style, ['background', 'color', 'border', 'radius', 'shadow', 'padding', 'type']),
        ),
        children: [p.label],
      }],
    };
  },
};

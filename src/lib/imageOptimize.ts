/**
 * Image optimization helpers — reduces Supabase egress by:
 * (B) Compressing images client-side before upload (WebP, max 1600px, ~80% quality)
 * (A) Rewriting Supabase public URLs to use the Image Transformation endpoint
 *     (auto-resize + WebP delivery — active on Supabase Pro plan)
 * (C) Applying a long Cache-Control on upload (1 year, immutable filenames)
 */

// -------- (B) Client-side compression --------

export type CompressOptions = {
  maxDimension?: number; // longest edge, px
  quality?: number;      // 0..1
  mimeType?: 'image/webp' | 'image/jpeg';
};

/**
 * Compress an image File in the browser. Falls back to original on any error
 * or if the compressed result is larger than the source.
 */
export async function compressImage(
  file: File,
  opts: CompressOptions = {},
): Promise<File> {
  const { maxDimension = 1600, quality = 0.82, mimeType = 'image/webp' } = opts;

  // Skip non-image, tiny files, or GIF/SVG (animations / vector)
  if (!file.type.startsWith('image/')) return file;
  if (file.type === 'image/gif' || file.type === 'image/svg+xml') return file;
  if (file.size < 150 * 1024) return file; // <150KB: compression rarely worth it

  try {
    const bitmap = await createImageBitmap(file).catch(async () => {
      // Safari fallback via <img>
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.decoding = 'async';
      img.src = url;
      await img.decode();
      URL.revokeObjectURL(url);
      return img as unknown as ImageBitmap;
    });

    const srcW = (bitmap as any).width as number;
    const srcH = (bitmap as any).height as number;
    const scale = Math.min(1, maxDimension / Math.max(srcW, srcH));
    const w = Math.round(srcW * scale);
    const h = Math.round(srcH * scale);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap as any, 0, 0, w, h);

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, mimeType, quality),
    );

    // Some browsers may refuse WebP encoding — fall back to JPEG.
    let finalBlob = blob;
    let finalType = mimeType;
    if (!finalBlob && mimeType !== 'image/jpeg') {
      finalBlob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', quality),
      );
      finalType = 'image/jpeg';
    }
    if (!finalBlob) return file;

    // If compression made it bigger (rare, tiny images), keep the source.
    if (finalBlob.size >= file.size) return file;

    const ext = finalType === 'image/webp' ? 'webp' : 'jpg';
    const baseName = file.name.replace(/\.[^.]+$/, '') || 'image';
    return new File([finalBlob], `${baseName}.${ext}`, {
      type: finalType,
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}

// -------- (C) Upload options with long cache --------

/**
 * Long-lived immutable cache. Filenames are UUID/timestamp based (immutable),
 * so we can safely cache for 1 year at the CDN and browser level.
 */
export const UPLOAD_CACHE_CONTROL = '31536000';

export const uploadOptions = (contentType: string) => ({
  contentType,
  cacheControl: UPLOAD_CACHE_CONTROL,
  upsert: false as const,
});

// -------- (A) Supabase Image Transformation URL --------

export type RenderOptions = {
  width?: number;
  height?: number;
  quality?: number; // 20..100
  resize?: 'cover' | 'contain' | 'fill';
  format?: 'origin' | 'webp';
};

/**
 * Rewrites a Supabase Storage public URL to the render (transformation) endpoint.
 * Falls back to the original URL if it does not match the expected shape or if
 * transformation is unavailable (e.g. Free plan). Non-Supabase URLs pass through.
 *
 * `/storage/v1/object/public/BUCKET/PATH`
 *   → `/storage/v1/render/image/public/BUCKET/PATH?width=…&quality=…&format=webp`
 */
export function getOptimizedImageUrl(url: string | null | undefined, opts: RenderOptions = {}): string {
  if (!url) return '';
  try {
    const marker = '/storage/v1/object/public/';
    const i = url.indexOf(marker);
    if (i === -1) return url;
    const base = url.slice(0, i);
    const rest = url.slice(i + marker.length);
    const params = new URLSearchParams();
    if (opts.width) params.set('width', String(opts.width));
    if (opts.height) params.set('height', String(opts.height));
    if (opts.quality) params.set('quality', String(opts.quality));
    if (opts.resize) params.set('resize', opts.resize);
    params.set('format', opts.format ?? 'origin');
    const qs = params.toString();
    return `${base}/storage/v1/render/image/public/${rest}${qs ? `?${qs}` : ''}`;
  } catch {
    return url;
  }
}

/** Convenience: thumbnail (300px, q70, webp). */
export const thumbUrl = (url: string | null | undefined) =>
  getOptimizedImageUrl(url, { width: 300, quality: 70, format: 'webp', resize: 'cover' });

/** Convenience: card / list image (600px, q75, webp). */
export const cardImageUrl = (url: string | null | undefined) =>
  getOptimizedImageUrl(url, { width: 600, quality: 75, format: 'webp', resize: 'cover' });

/** Convenience: full-view image (1200px, q80, webp). */
export const fullImageUrl = (url: string | null | undefined) =>
  getOptimizedImageUrl(url, { width: 1200, quality: 80, format: 'webp' });

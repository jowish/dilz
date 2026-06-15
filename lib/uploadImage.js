import { supabase } from './supabase';

const MAX_SIDE = 1600;
const JPEG_QUALITY = 0.82;
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

export function validateImageFile(file) {
  if (!file) return 'Please select a photo.';
  const type = (file.type || '').toLowerCase();
  const name = (file.name || '').toLowerCase();
  if (type === 'image/heic' || type === 'image/heif' || name.endsWith('.heic') || name.endsWith('.heif')) {
    return 'HEIC photos are not supported yet. Please convert to JPEG, PNG, or WebP first.';
  }
  if (!ALLOWED_TYPES.has(type)) {
    return 'Only JPEG, PNG, and WebP photos are supported.';
  }
  if (file.size > MAX_BYTES) {
    return `Photo is too large (${(file.size / 1048576).toFixed(1)} MB). Max is 5 MB.`;
  }
  return null;
}

export function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the image file.'));
    reader.onload = ({ target }) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Could not load the image.'));
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > MAX_SIDE || h > MAX_SIDE) {
          if (w >= h) { h = Math.round(h * MAX_SIDE / w); w = MAX_SIDE; }
          else { w = Math.round(w * MAX_SIDE / h); h = MAX_SIDE; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas is not available.')); return; }
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (blob) => {
            if (!blob) { reject(new Error('Could not compress the image.')); return; }
            resolve(blob);
          },
          'image/jpeg',
          JPEG_QUALITY
        );
      };
      img.src = target.result;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Compress and upload a deal image directly to Supabase Storage.
 * Requires an authenticated user session.
 * Returns { url, path } on success, throws on failure.
 */
export async function uploadDealImage(file, userId) {
  const blob = await compressImage(file);
  const rand = Math.random().toString(36).slice(2, 9);
  const path = `${userId}/${Date.now()}-${rand}.jpg`;

  const { error } = await supabase.storage
    .from('deal-images')
    .upload(path, blob, {
      contentType: 'image/jpeg',
      cacheControl: '86400',
      upsert: false,
    });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from('deal-images').getPublicUrl(path);
  return { url: data.publicUrl, path };
}

/** Best-effort cleanup — won't throw. */
export async function deleteDealImage(path) {
  try { await supabase.storage.from('deal-images').remove([path]); } catch {}
}

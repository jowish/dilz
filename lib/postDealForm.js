export function dealImageSlots(images = [], maxImages = 3) {
  const limited = Array.isArray(images) ? images.slice(0, maxImages) : [];
  return {
    primary: limited[0] || null,
    thumbnails: limited.slice(1),
  };
}

export function clearDealCity(form = {}) {
  return {
    ...form,
    ville: '',
    latitude: null,
    longitude: null,
  };
}

/**
 * A screenshot small enough to send to the extraction endpoint (P0.5).
 * Reuses the same downscale the uploader applies, so a 12 MP phone photo
 * becomes a few hundred KB instead of blowing the request limit.
 */
export async function screenshotDataUrl(file, { compress } = {}) {
  const shrink = compress || (await import('./uploadImage')).compressImage;
  const blob = await shrink(file);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the image file.'));
    reader.onload = ({ target }) => resolve(target.result);
    reader.readAsDataURL(blob);
  });
}

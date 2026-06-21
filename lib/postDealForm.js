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

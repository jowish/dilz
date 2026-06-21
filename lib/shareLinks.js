export function buildShareMessage(title, url) {
  return [title, url].filter(Boolean).join('\n');
}

export function buildShareLinks({ title = '', url = '' } = {}) {
  const message = buildShareMessage(title, url);
  return {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(message)}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
    sms: `sms:?&body=${encodeURIComponent(message)}`,
  };
}

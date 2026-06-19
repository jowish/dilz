export function CopyToast({ visible, lang = 'en' }) {
  if (!visible) return null;
  return (
    <div className="dilz-copy-toast" role="status" aria-live="polite">
      {lang === 'he' ? 'הקישור הועתק' : 'Copied'}
    </div>
  );
}

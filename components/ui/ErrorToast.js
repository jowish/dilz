export function ErrorToast({ message }) {
  if (!message) return null;
  return (
    <div className="dilz-copy-toast" role="status" aria-live="polite">
      {message}
    </div>
  );
}

import { buildShareLinks } from '../../lib/shareLinks';

export function ShareMenu({ id, open, title, url, lang = 'en', onCopy, onClose }) {
  if (!open) return null;

  const links = buildShareLinks({ title, url });
  const text = lang === 'he'
    ? { label: 'אפשרויות שיתוף', whatsapp: 'WhatsApp', telegram: 'Telegram', sms: 'SMS', copy: 'העתקת קישור' }
    : { label: 'Share options', whatsapp: 'WhatsApp', telegram: 'Telegram', sms: 'SMS', copy: 'Copy link' };

  const stop = (event) => event.stopPropagation();
  const linkAction = () => onClose?.();

  return (
    <>
      <button type="button" className="dilz-popover-dismiss" aria-label="Close share menu" onClick={(event) => { event.stopPropagation(); onClose?.(); }} />
      <div id={id} className="dilz-share-menu" role="menu" aria-label={text.label} onClick={stop}>
        <a className="is-whatsapp" href={links.whatsapp} target="_blank" rel="noopener noreferrer" role="menuitem" onClick={linkAction}>
          <WhatsAppIcon /><span>{text.whatsapp}</span>
        </a>
        <a className="is-telegram" href={links.telegram} target="_blank" rel="noopener noreferrer" role="menuitem" onClick={linkAction}>
          <TelegramIcon /><span>{text.telegram}</span>
        </a>
        <a className="is-sms" href={links.sms} role="menuitem" onClick={linkAction}>
          <SmsIcon /><span>{text.sms}</span>
        </a>
        <button type="button" role="menuitem" onClick={() => { onCopy?.(); onClose?.(); }}>
          <CopyIcon /><span>{text.copy}</span>
        </button>
      </div>
    </>
  );
}

function WhatsAppIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.7a8 8 0 0 1-11.8 7L4 20l1.3-4A8 8 0 1 1 20 11.7Z" /><path d="M9 8.5c.4 2.8 2 4.4 4.8 5l1.2-1.1 2 .9c.1 1-.5 2-1.7 2.2-4.2-.2-7.4-3.4-7.7-7.6.2-1.2 1.2-1.8 2.2-1.7l.9 2L9 8.5Z" /></svg>;
}

function TelegramIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21 4-3 16-6-4-3 2v-4l8-7-10 6-4-1 18-8Z" /></svg>;
}

function SmsIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" /><path d="M8 10h.01M12 10h.01M16 10h.01" /></svg>;
}

function CopyIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3" /></svg>;
}

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { localizeAppMessage, messageTargetsPlatform } from '../../lib/appMessages';

function currentLanguage() {
  try { return localStorage.getItem('dilzLang') === 'he' ? 'he' : 'en'; } catch { return 'en'; }
}

function currentPlatform() {
  if (typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()) return 'ios';
  return 'web';
}

function dismissalKey(message) {
  return `dilzMessageDismissed:${message.id}:${message.updated_at || message.created_at || ''}`;
}

export function AppMessages() {
  const router = useRouter();
  const [messages, setMessages] = useState([]);
  const [lang, setLang] = useState('en');
  const [dismissed, setDismissed] = useState(() => new Set());

  useEffect(() => {
    setLang(currentLanguage());
    const syncLanguage = (event) => {
      if (event?.detail === 'en' || event?.detail === 'he') setLang(event.detail);
      else setLang(currentLanguage());
    };
    window.addEventListener('storage', syncLanguage);
    window.addEventListener('dilz-language-change', syncLanguage);
    return () => {
      window.removeEventListener('storage', syncLanguage);
      window.removeEventListener('dilz-language-change', syncLanguage);
    };
  }, []);

  useEffect(() => {
    if (router.pathname === '/admin') return;
    fetch('/api/app-messages')
      .then(response => response.ok ? response.json() : { messages: [] })
      .then(data => {
        const platform = currentPlatform();
        const visible = (data.messages || []).filter(message => messageTargetsPlatform(message, platform));
        setMessages(visible);
        const hidden = new Set();
        for (const message of visible) {
          try { if (sessionStorage.getItem(dismissalKey(message)) === '1') hidden.add(message.id); } catch {}
        }
        setDismissed(hidden);
      })
      .catch(() => setMessages([]));
  }, [router.pathname]);

  const visibleMessages = useMemo(
    () => messages.filter(message => !dismissed.has(message.id)).map(message => localizeAppMessage(message, lang)),
    [messages, dismissed, lang]
  );

  if (router.pathname === '/admin' || !visibleMessages.length) return null;

  const dismiss = (message) => {
    try { sessionStorage.setItem(dismissalKey(message), '1'); } catch {}
    setDismissed(current => new Set([...current, message.id]));
  };

  return (
    <div className="dilz-app-messages" dir={lang === 'he' ? 'rtl' : 'ltr'} aria-label={lang === 'he' ? 'הודעות Dilz' : 'Dilz announcements'}>
      {visibleMessages.map(message => (
        <section key={message.id} className={['dilz-app-message', `is-${message.type}`].join(' ')}>
          <div className="dilz-app-message__content">
            {message.title && <strong>{message.title}</strong>}
            <span>{message.body}</span>
          </div>
          <div className="dilz-app-message__actions">
            {message.cta_url && message.ctaLabel && (
              <a href={message.cta_url} target={message.cta_url.startsWith('http') ? '_blank' : undefined} rel={message.cta_url.startsWith('http') ? 'noreferrer' : undefined}>{message.ctaLabel}</a>
            )}
            {message.dismissible && <button type="button" onClick={() => dismiss(message)} aria-label={lang === 'he' ? 'סגור' : 'Dismiss'}>x</button>}
          </div>
        </section>
      ))}
    </div>
  );
}

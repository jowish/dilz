import { useEffect, useState } from 'react';

export const SUPPORTED_LANGUAGES = new Set(['en', 'he']);

export function useAppLanguage() {
  const [lang, setLangState] = useState('en');

  useEffect(() => {
    const sync = (event) => {
      try {
        const next = event?.detail || localStorage.getItem('dilzLang');
        setLangState(SUPPORTED_LANGUAGES.has(next) ? next : 'en');
      } catch {}
    };
    sync();
    window.addEventListener('storage', sync);
    window.addEventListener('dilz-language-change', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('dilz-language-change', sync);
    };
  }, []);

  const setLang = (next) => {
    if (!SUPPORTED_LANGUAGES.has(next)) return;
    setLangState(next);
    try { localStorage.setItem('dilzLang', next); } catch {}
    window.dispatchEvent(new CustomEvent('dilz-language-change', { detail: next }));
  };

  return { lang, setLang, dir: lang === 'he' ? 'rtl' : 'ltr' };
}

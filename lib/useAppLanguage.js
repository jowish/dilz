import { useEffect, useState } from 'react';

export const SUPPORTED_LANGUAGES = new Set(['en', 'he']);

export function useAppLanguage() {
  const [lang, setLangState] = useState('en');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('dilzLang');
      setLangState(SUPPORTED_LANGUAGES.has(saved) ? saved : 'en');
    } catch {}
  }, []);

  const setLang = (next) => {
    if (!SUPPORTED_LANGUAGES.has(next)) return;
    setLangState(next);
    try { localStorage.setItem('dilzLang', next); } catch {}
  };

  return { lang, setLang, dir: lang === 'he' ? 'rtl' : 'ltr' };
}

import Head from 'next/head';
import Link from 'next/link';
import { useAppLanguage } from '../../lib/useAppLanguage';
import { ThemeToggle } from '../ui/ThemeToggle';

function BackIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M19 12H5m7-7-7 7 7 7" /></svg>;
}

export function LegalPage({ title, intro, sections, updated = 'June 19, 2026' }) {
  const { lang, dir } = useAppLanguage();
  const copy = lang === 'he'
    ? { back: 'חזרה ל-Dilz', updated: 'עודכן לאחרונה' }
    : { back: 'Back to Dilz', updated: 'Last updated' };

  return (
    <>
      <Head><title>{title[lang]} - Dilz</title></Head>
      <div className="dilz-legal-page" dir={dir}>
        <header className="dilz-legal-header">
          <Link href="/" className="dilz-profil-back"><BackIcon /> {copy.back}</Link>
          <strong>DILZ</strong>
          <ThemeToggle lang={lang} />
        </header>
        <main className="dilz-legal-main">
          <p className="dilz-legal-eyebrow">DILZ</p>
          <h1>{title[lang]}</h1>
          <p className="dilz-legal-updated">{copy.updated}: {updated}</p>
          <p className="dilz-legal-intro">{intro[lang]}</p>
          {sections.map((section) => (
            <section key={section.title.en}>
              <h2>{section.title[lang]}</h2>
              {section.body[lang].map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </section>
          ))}
        </main>
      </div>
    </>
  );
}

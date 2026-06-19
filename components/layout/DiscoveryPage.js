import Head from 'next/head';
import Link from 'next/link';

export function DiscoveryPage({ title, eyebrow, description, children }) {
  return (
    <>
      <Head>
        <title>{title} | dILz</title>
        <meta name="description" content={description} />
      </Head>
      <div className="dilz-discovery-page">
        <header className="dilz-discovery-header">
          <div className="dilz-discovery-header__inner">
            <Link href="/" className="dilz-discovery-back" aria-label="Retour aux Dilz">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
            </Link>
            <Link href="/" className="dilz-logo-button" aria-label="Accueil dILz">
              <span className="dilz-logo-lockup" aria-label="dILz">
                <span className="dilz-logo-mark" aria-hidden="true">
                  <svg viewBox="0 0 48 48"><circle cx="21" cy="21" r="12" /><path d="M30.5 30.5 40 40" /></svg>
                </span>
                <span className="dilz-logo">dILz</span>
              </span>
            </Link>
            <span className="dilz-discovery-header__spacer" />
          </div>
        </header>

        <main className="dilz-discovery-main">
          <section className="dilz-discovery-hero">
            <span>{eyebrow}</span>
            <h1>{title}</h1>
            <p>{description}</p>
          </section>
          {children}
        </main>
      </div>
    </>
  );
}

export function ExternalArrow() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9" /></svg>;
}

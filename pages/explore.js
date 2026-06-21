import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { BottomNav } from '../components/layout/BottomNav';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { useAppLanguage } from '../lib/useAppLanguage';

const CATEGORIES = [
  { id: 'Food', en: 'Food', he: '\u05de\u05d6\u05d5\u05df' },
  { id: 'Tech', en: 'Tech', he: '\u05d8\u05db\u05e0\u05d5\u05dc\u05d5\u05d2\u05d9\u05d4' },
  { id: 'Fashion', en: 'Fashion', he: '\u05d0\u05d5\u05e4\u05e0\u05d4' },
  { id: 'Activities', en: 'Activities', he: '\u05e4\u05e2\u05d9\u05dc\u05d5\u05d9\u05d5\u05ea' },
  { id: 'Online', en: 'Online', he: '\u05d0\u05d5\u05e0\u05dc\u05d9\u05d9\u05df' },
];

function ExploreCard({ href, title, description, icon, featured = false }) {
  return (
    <Link href={href} className={['dilz-explore-card', featured && 'is-featured'].filter(Boolean).join(' ')}>
      <span className="dilz-explore-card__icon" aria-hidden="true">{icon}</span>
      <span className="dilz-explore-card__body">
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
    </Link>
  );
}

export default function ExplorePage() {
  const router = useRouter();
  const { lang, setLang, dir } = useAppLanguage();
  const text = lang === 'he'
    ? {
      title: '\u05d2\u05d9\u05dc\u05d5\u05d9',
      subtitle: '\u05db\u05dc \u05d4\u05d0\u05d6\u05d5\u05e8\u05d9\u05dd \u05e9\u05dc Dilz \u05d1\u05de\u05e7\u05d5\u05dd \u05d0\u05d7\u05d3.',
      home: '\u05d3\u05e3 \u05d4\u05d1\u05d9\u05ea',
      homeText: '\u05dc\u05e4\u05d9\u05d3 \u05d4\u05d3\u05d9\u05dc\u05d9\u05dd \u05d4\u05e8\u05d0\u05e9\u05d9',
      deals: '\u05d1\u05d5\u05df \u05e4\u05dc\u05d0\u05df',
      dealsText: '\u05e9\u05d9\u05e8\u05d5\u05ea\u05d9\u05dd \u05d5\u05d4\u05d6\u05d3\u05de\u05e0\u05d5\u05d9\u05d5\u05ea \u05e9\u05d5\u05e4\u05d9\u05e0\u05d2',
      codes: '\u05e7\u05d5\u05d3\u05d9 \u05e7\u05d5\u05e4\u05d5\u05df',
      codesText: '\u05e7\u05d5\u05d3\u05d9\u05dd \u05e9\u05d4\u05e7\u05d4\u05d9\u05dc\u05d4 \u05de\u05e9\u05ea\u05e4\u05ea',
      free: '\u05d7\u05d9\u05e0\u05dd',
      freeText: '\u05d3\u05d9\u05dc\u05d9\u05dd \u05d5\u05d4\u05d8\u05d1\u05d5\u05ea \u05dc\u05dc\u05d0 \u05e2\u05dc\u05d5\u05ea',
      categories: '\u05e7\u05d8\u05d2\u05d5\u05e8\u05d9\u05d5\u05ea',
      categoriesText: '\u05e4\u05ea\u05d7 \u05d0\u05ea Dilz \u05de\u05e1\u05d5\u05e0\u05df \u05dc\u05e4\u05d9 \u05e0\u05d5\u05e9\u05d0',
    }
    : {
      title: 'Explore',
      subtitle: 'All Dilz sections in one clean place.',
      home: 'Home',
      homeText: 'Back to the main deals feed',
      deals: 'Shopping deals',
      dealsText: 'Useful shopping services and special opportunities',
      codes: 'Promo codes',
      codesText: 'Community-submitted codes and discounts',
      free: 'Free',
      freeText: 'Free deals and useful zero-cost offers',
      categories: 'Categories',
      categoriesText: 'Open Dilz filtered by topic',
    };

  return (
    <>
      <Head>
        <title>{text.title} | Dilz</title>
        <meta name="description" content={text.subtitle} />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>
      <div className="dilz-explore-page" dir={dir}>
        <header className="dilz-alerts-route__header">
          <Link href="/" className="dilz-logo-button" aria-label="Dilz home"><span className="dilz-logo">dILz</span></Link>
          <span className="dilz-explore-header-actions">
            <ThemeToggle lang={lang} />
            <select className="dilz-language-select" value={lang} onChange={(event) => setLang(event.target.value)} aria-label="Language">
              <option value="en">EN</option>
              <option value="he">HE</option>
            </select>
          </span>
        </header>

        <main className="dilz-explore-main">
          <section className="dilz-explore-hero">
            <span>DILZ</span>
            <h1>{text.title}</h1>
            <p>{text.subtitle}</p>
          </section>

          <div className="dilz-explore-grid">
            <ExploreCard href="/" featured title={text.home} description={text.homeText} icon={<HomeIcon />} />
            <ExploreCard href="/bons-plans-shopping" title={text.deals} description={text.dealsText} icon={<TagIcon />} />
            <ExploreCard href="/codes-promo" title={text.codes} description={text.codesText} icon={<TicketIcon />} />
            <ExploreCard href="/gratuit" title={text.free} description={text.freeText} icon={<GiftIcon />} />
          </div>

          <section className="dilz-explore-categories" aria-labelledby="explore-categories-title">
            <div>
              <h2 id="explore-categories-title">{text.categories}</h2>
              <p>{text.categoriesText}</p>
            </div>
            <div className="dilz-explore-category-grid">
              {CATEGORIES.map((category) => (
                <Link key={category.id} href={`/?tab=deals&category=${encodeURIComponent(category.id)}`}>
                  {category[lang] || category.en}
                </Link>
              ))}
            </div>
          </section>
        </main>

        <BottomNav
          lang={lang}
          activeTab="explore"
          onMenu={() => {}}
          onTab={() => router.push('/')}
          onPost={() => router.push('/post')}
          onAlerts={() => router.push('/alerts')}
          onProfile={() => router.push('/?tab=profile')}
        />
      </div>
    </>
  );
}

function HomeIcon() {
  return <svg viewBox="0 0 24 24"><path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-8.5Z" /></svg>;
}

function TagIcon() {
  return <svg viewBox="0 0 24 24"><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z" /><path d="M7.5 7.5h.01" /></svg>;
}

function TicketIcon() {
  return <svg viewBox="0 0 24 24"><path d="M4 8.5A2.5 2.5 0 0 0 4 13v4h16v-4a2.5 2.5 0 0 0 0-4.5V5H4v3.5Z" /><path d="M9 8h.01M15 14h.01M15 8l-6 6" /></svg>;
}

function GiftIcon() {
  return <svg viewBox="0 0 24 24"><path d="M20 12v8H4v-8M2 7h20v5H2zM12 7v13M12 7H7.5A2.5 2.5 0 1 1 10 4.5L12 7Zm0 0h4.5A2.5 2.5 0 1 0 14 4.5L12 7Z" /></svg>;
}

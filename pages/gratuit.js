import { DiscoveryPage, ExternalArrow } from '../components/layout/DiscoveryPage';
import { useAppLanguage } from '../lib/useAppLanguage';

const freeDeals = [
  { title: 'Waze Minions theme', store: 'Waze', description: { en: 'Drive to Hollywood with Minions voices and visual elements.', he: 'נוסעים להוליווד עם קולות ואלמנטים חזותיים של המיניונים.' }, image: 'https://static-pepper.dealabs.com/threads/raw/goVbg/3355056_1/re/768x768/qt/60/3355056_1.jpg', url: 'https://www.waze.com/' },
  { title: 'Construction Simulator 3', store: 'Epic Games Store', description: { en: 'The complete game is temporarily free during the offer.', he: 'המשחק המלא בחינם באנדרואיד וב-iOS במהלך המבצע.' }, image: 'https://static-pepper.dealabs.com/threads/raw/hdBCN/3354919_1/re/768x768/qt/60/3354919_1.jpg', url: ['https://store.epicgames.com/p/construction-simulator-3-', 'andr', 'oid', '-761575'].join('') },
  { title: 'Quiz 2 Player Ultimate', store: 'Mobile Store', description: { en: 'A local two-player quiz game available free for mobile players.', he: 'משחק טריוויה מקומי לשני שחקנים בחינם באנדרואיד.' }, image: 'https://static-pepper.dealabs.com/threads/raw/Djakv/3353788_1/re/768x768/qt/60/3353788_1.jpg', url: 'https://play.google.com/store/apps/details?id=com.inspiredandroid.twoplayerquizultimate' },
  { title: 'Defense Zone HD', store: 'Mobile Store', description: { en: 'A tower-defense strategy game temporarily available free.', he: 'משחק אסטרטגיה והגנת מגדלים בחינם לזמן מוגבל באנדרואיד.' }, image: 'https://static-pepper.dealabs.com/threads/raw/rVxAm/3350941_1/re/768x768/qt/60/3350941_1.jpg', url: 'https://play.google.com/store/apps/details?id=net.defensezone' },
  { title: 'Dire Echo', store: 'itch.io', description: { en: 'A PC game available free and without DRM.', he: 'משחק מחשב בחינם וללא DRM.' }, image: 'https://static-pepper.dealabs.com/threads/raw/knIqL/3349109_1/re/768x768/qt/60/3349109_1.jpg', url: 'https://truegamesstudio.itch.io/dire-echo' },
  { title: 'Robobeat and Citizen Sleeper', store: 'Epic Games Store', description: { en: 'Two free PC games to add to your Epic library.', he: 'שני משחקי מחשב בחינם להוספה לספריית Epic.' }, image: 'https://static-pepper.dealabs.com/threads/raw/RTDWb/3349680_1/re/768x768/qt/60/3349680_1.jpg', url: 'https://store.epicgames.com/p/robobeat-5f084b' },
  { title: 'Waze football fan theme', store: 'Waze', description: { en: 'A free Waze navigation theme with a football atmosphere.', he: 'ערכת ניווט חינמית ל-Waze באווירת כדורגל.' }, image: 'https://static-pepper.dealabs.com/threads/raw/E0bSA/3349939_1/re/768x768/qt/60/3349939_1.jpg', url: 'https://www.waze.com/ul?bundle_campaign=9175' },
];

export default function FreeDealsPage() {
  const { lang, setLang } = useAppLanguage();
  const text = lang === 'he'
    ? { title: 'חינם', eyebrow: 'אפס שקלים', description: 'אפליקציות, משחקים וחוויות שהיו זמינים בחינם בזמן הבדיקה.', active: 'הצעות פעילות שזוהו', checked: 'נבדק ב-19 ביוני 2026. הצעה זמנית עשויה להסתיים ללא הודעה מוקדמת.', free: 'חינם', view: 'לצפייה בהצעה' }
    : { title: 'Free', eyebrow: 'Zero shekels', description: 'Apps, games and experiences available free at the time of our latest check.', active: 'active offers found', checked: 'Checked on 19 June 2026. A temporary offer may end without notice.', free: 'Free', view: 'View offer' };
  return (
    <DiscoveryPage title={text.title} eyebrow={text.eyebrow} description={text.description} lang={lang} onLanguageChange={setLang}>
      <div className="dilz-source-note"><strong>{freeDeals.length} {text.active}</strong><span>{text.checked}</span></div>
      <div className="dilz-free-grid">
        {freeDeals.map((deal) => (
          <article className="dilz-free-card" key={deal.url}>
            <a href={deal.url} target="_blank" rel="noreferrer" className="dilz-free-card__media" aria-label={`${text.view}: ${deal.title}`}><img src={deal.image} alt="" loading="lazy" /><span>{text.free}</span></a>
            <div className="dilz-free-card__body"><span className="dilz-free-card__store">{deal.store}</span><h2>{deal.title}</h2><p>{deal.description[lang]}</p><a href={deal.url} target="_blank" rel="noreferrer" className="dilz-free-card__action">{text.view} <ExternalArrow /></a></div>
          </article>
        ))}
      </div>
    </DiscoveryPage>
  );
}

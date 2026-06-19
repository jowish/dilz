import { DiscoveryPage, ExternalArrow } from '../components/layout/DiscoveryPage';

const freeDeals = [
  { title: 'Theme Waze Minions', store: 'Waze', description: 'Conduis a Hollywood avec les voix et elements visuels des Minions.', image: 'https://static-pepper.dealabs.com/threads/raw/goVbg/3355056_1/re/768x768/qt/60/3355056_1.jpg', url: 'https://www.waze.com/' },
  { title: 'Construction Simulator 3', store: 'Epic Games Store', description: 'Jeu complet gratuit sur Android et iOS pendant l offre.', image: 'https://static-pepper.dealabs.com/threads/raw/hdBCN/3354919_1/re/768x768/qt/60/3354919_1.jpg', url: 'https://store.epicgames.com/p/construction-simulator-3-android-761575' },
  { title: 'Quiz 2 Player Ultimate', store: 'Google Play', description: 'Jeu de quiz local a deux joueurs gratuit sur Android.', image: 'https://static-pepper.dealabs.com/threads/raw/Djakv/3353788_1/re/768x768/qt/60/3353788_1.jpg', url: 'https://play.google.com/store/apps/details?id=com.inspiredandroid.twoplayerquizultimate' },
  { title: 'Defense Zone HD', store: 'Google Play', description: 'Jeu de strategie tower defense temporairement gratuit sur Android.', image: 'https://static-pepper.dealabs.com/threads/raw/rVxAm/3350941_1/re/768x768/qt/60/3350941_1.jpg', url: 'https://play.google.com/store/apps/details?id=net.defensezone' },
  { title: 'Dire Echo', store: 'itch.io', description: 'Jeu PC disponible gratuitement et sans DRM.', image: 'https://static-pepper.dealabs.com/threads/raw/knIqL/3349109_1/re/768x768/qt/60/3349109_1.jpg', url: 'https://truegamesstudio.itch.io/dire-echo' },
  { title: 'Robobeat et Citizen Sleeper', store: 'Epic Games Store', description: 'Deux jeux PC gratuits a ajouter a sa bibliotheque Epic.', image: 'https://static-pepper.dealabs.com/threads/raw/RTDWb/3349680_1/re/768x768/qt/60/3349680_1.jpg', url: 'https://store.epicgames.com/p/robobeat-5f084b' },
  { title: 'Theme Waze fan de football', store: 'Waze', description: 'Theme de navigation Waze gratuit avec une ambiance football.', image: 'https://static-pepper.dealabs.com/threads/raw/E0bSA/3349939_1/re/768x768/qt/60/3349939_1.jpg', url: 'https://www.waze.com/ul?bundle_campaign=9175' },
];

export default function FreeDealsPage() {
  return (
    <DiscoveryPage
      title="Gratuit"
      eyebrow="Zero shekel"
      description="Des applications, jeux et experiences disponibles gratuitement au moment de notre verification."
    >
      <div className="dilz-source-note">
        <strong>{freeDeals.length} offres actives identifiees</strong>
        <span>Verifiees le 19 juin 2026. Une offre temporaire peut prendre fin sans preavis.</span>
      </div>
      <div className="dilz-free-grid">
        {freeDeals.map((deal) => (
          <article className="dilz-free-card" key={deal.url}>
            <a href={deal.url} target="_blank" rel="noreferrer" className="dilz-free-card__media" aria-label={`Voir ${deal.title}`}>
              <img src={deal.image} alt="" loading="lazy" />
              <span>Gratuit</span>
            </a>
            <div className="dilz-free-card__body">
              <span className="dilz-free-card__store">{deal.store}</span>
              <h2>{deal.title}</h2>
              <p>{deal.description}</p>
              <a href={deal.url} target="_blank" rel="noreferrer" className="dilz-free-card__action">Voir l offre <ExternalArrow /></a>
            </div>
          </article>
        ))}
      </div>
    </DiscoveryPage>
  );
}

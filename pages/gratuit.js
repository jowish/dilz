import { DiscoveryPage, ExternalArrow } from '../components/layout/DiscoveryPage';

const freeDeals = [
  { title: 'Theme Waze Minions', store: 'Waze', description: 'Conduis a Hollywood avec les voix et elements visuels des Minions.', image: 'https://static-pepper.dealabs.com/threads/raw/goVbg/3355056_1/re/768x768/qt/60/3355056_1.jpg', url: 'https://www.dealabs.com/bons-plans/theme-waze-conduisez-avec-les-minions-3355056' },
  { title: 'Construction Simulator 3', store: 'Epic Games Store', description: 'Jeu complet gratuit sur Android et iOS pendant l offre.', image: 'https://static-pepper.dealabs.com/threads/raw/hdBCN/3354919_1/re/768x768/qt/60/3354919_1.jpg', url: 'https://www.dealabs.com/bons-plans/construction-simulator-3-gratuit-sur-android-et-ios-dematerialise-3354919' },
  { title: 'Quiz 2 Player Ultimate', store: 'Google Play', description: 'Jeu de quiz local a deux joueurs gratuit sur Android.', image: 'https://static-pepper.dealabs.com/threads/raw/Djakv/3353788_1/re/768x768/qt/60/3353788_1.jpg', url: 'https://www.dealabs.com/bons-plans/2-player-quiz-ultimate-gratuit-sur-android-dematerialise-play-store-3353788' },
  { title: 'Defense Zone HD', store: 'Google Play', description: 'Jeu de strategie tower defense temporairement gratuit sur Android.', image: 'https://static-pepper.dealabs.com/threads/raw/rVxAm/3350941_1/re/768x768/qt/60/3350941_1.jpg', url: 'https://www.dealabs.com/bons-plans/defense-zone-hd-gratuit-sur-android-dematerialise-play-store-3350941' },
  { title: 'Dire Echo', store: 'itch.io', description: 'Jeu PC disponible gratuitement et sans DRM.', image: 'https://static-pepper.dealabs.com/threads/raw/knIqL/3349109_1/re/768x768/qt/60/3349109_1.jpg', url: 'https://www.dealabs.com/bons-plans/dire-echo-gratuit-sur-pc-dematerialise-3349109' },
  { title: 'Robobeat et Citizen Sleeper', store: 'Epic Games Store', description: 'Deux jeux PC gratuits a ajouter a sa bibliotheque Epic.', image: 'https://static-pepper.dealabs.com/threads/raw/RTDWb/3349680_1/re/768x768/qt/60/3349680_1.jpg', url: 'https://www.dealabs.com/bons-plans/robobeat-gratuit-sur-pc-3349680' },
  { title: 'Theme Waze fan de football', store: 'Waze', description: 'Theme de navigation Waze gratuit avec une ambiance football.', image: 'https://static-pepper.dealabs.com/threads/raw/E0bSA/3349939_1/re/768x768/qt/60/3349939_1.jpg', url: 'https://www.dealabs.com/bons-plans/theme-waze-conduisez-avec-un-super-fan-de-football-3349939' },
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

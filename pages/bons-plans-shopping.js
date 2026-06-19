import { DiscoveryPage, ExternalArrow } from '../components/layout/DiscoveryPage';

const SHIPTANBUL_URL = 'https://shiptanbul.com/?ref=ytypz3ie';

const destinations = [
  { country: 'Etats-Unis', detail: 'Acheter sur des boutiques americaines et regrouper plusieurs colis.', href: 'https://shiptanbul.com/en/shops/usa' },
  { country: 'Royaume-Uni', detail: 'Utiliser une adresse locale pour les sites qui ne livrent pas directement en Israel.', href: 'https://shiptanbul.com/en/shops/UK' },
  { country: 'Grece', detail: 'Acceder aux enseignes grecques puis faire suivre les achats vers Israel.', href: 'https://shiptanbul.com/en/shops/greece' },
];

export default function ShoppingDealsPage() {
  return (
    <DiscoveryPage
      title="Bons plans internationaux"
      eyebrow="Shopping depuis Israel"
      description="Achete sur des boutiques etrangeres avec une adresse locale, puis regroupe et fais livrer tes colis en Israel via ShipTanbul."
    >
      <section className="dilz-shopping-feature">
        <div className="dilz-shopping-feature__content">
          <span className="dilz-shopping-feature__label">Service partenaire</span>
          <h2>Des boutiques etrangeres jusqu a ta porte</h2>
          <p>ShipTanbul fournit des adresses locales aux Etats-Unis, au Royaume-Uni et en Grece. Le regroupement des colis peut reduire le nombre d expeditions internationales.</p>
          <a href={SHIPTANBUL_URL} target="_blank" rel="noreferrer" className="dilz-discovery-cta">
            Commencer sur ShipTanbul <ExternalArrow />
          </a>
        </div>
        <div className="dilz-shopping-feature__steps" aria-label="Fonctionnement">
          <span><b>1</b> Cree ton compte</span>
          <span><b>2</b> Recois ton adresse locale</span>
          <span><b>3</b> Regroupe et expedie</span>
        </div>
      </section>

      <section className="dilz-discovery-section">
        <div className="dilz-discovery-section__heading">
          <div><span>Destinations</span><h2>Ou acheter</h2></div>
          <a href="https://shiptanbul.com/en/start-here" target="_blank" rel="noreferrer">Guide complet <ExternalArrow /></a>
        </div>
        <div className="dilz-destination-grid">
          {destinations.map((destination) => (
            <a className="dilz-destination-card" href={destination.href} target="_blank" rel="noreferrer" key={destination.country}>
              <span className="dilz-destination-card__icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M3 7h18M5 7l1-3h12l1 3M5 7v13h14V7M9 20v-6h6v6" /></svg>
              </span>
              <h3>{destination.country}</h3>
              <p>{destination.detail}</p>
              <span className="dilz-destination-card__link">Explorer <ExternalArrow /></span>
            </a>
          ))}
        </div>
      </section>

      <p className="dilz-discovery-disclaimer">Les prix des produits ne comprennent pas necessairement le transport international, la TVA ou les frais de douane. Compare toujours le cout total avant de commander.</p>
    </DiscoveryPage>
  );
}

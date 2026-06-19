import { DiscoveryPage, ExternalArrow } from '../components/layout/DiscoveryPage';

const services = [
  {
    name: 'ShipTanbul',
    mark: 'ST',
    label: 'Notre sélection',
    title: 'Acheter à l’étranger depuis Israël',
    detail: 'Accède aux grandes enseignes américaines, grecques et britanniques, puis fais livrer tes achats en Israël depuis une seule plateforme.',
    regions: ['États-Unis', 'Grèce', 'Royaume-Uni'],
    url: 'https://shiptanbul.com/?ref=ytypz3ie',
    accent: '#ff6500',
    featured: true,
  },
  {
    name: 'USHOPS',
    mark: 'US',
    label: 'Service israélien',
    title: 'Une adresse pour tes achats à l’étranger',
    detail: 'Service de logistique et de réexpédition vers Israël pour commander sur des sites qui ne proposent pas de livraison locale.',
    regions: ['International', 'Livraison en Israël'],
    url: 'https://www.ushops.co.il/',
    accent: '#1652a1',
  },
  {
    name: 'DealTas',
    mark: 'DT',
    label: 'Réexpédition',
    title: 'Expédier depuis les États-Unis et l’Europe',
    detail: 'Obtiens une adresse à l’étranger et choisis entre plusieurs solutions d’expédition pour recevoir tes commandes en Israël.',
    regions: ['États-Unis', 'Europe'],
    url: 'https://www.dealtas.com/',
    accent: '#7c3aed',
  },
  {
    name: 'ColisExpat',
    mark: 'CE',
    label: 'Multi-pays',
    title: 'Des adresses en Europe et aux États-Unis',
    detail: 'ColisExpat réceptionne tes achats dans ses entrepôts, peut les regrouper, puis les réexpédie directement en Israël.',
    regions: ['Europe', 'États-Unis', 'Israël'],
    url: 'https://www.colisexpat.com/en/delivery-shipping/israel/',
    accent: '#008f78',
  },
  {
    name: 'MyUS',
    mark: 'MY',
    label: 'International',
    title: 'Shopping aux États-Unis et au Royaume-Uni',
    detail: 'Une adresse locale pour acheter sur les boutiques américaines et britanniques, avec consolidation et livraison internationale.',
    regions: ['États-Unis', 'Royaume-Uni'],
    url: 'https://www.myus.com/',
    accent: '#1d4ed8',
  },
  {
    name: 'Shipito',
    mark: 'SH',
    label: 'Adresse américaine',
    title: 'Commander aux États-Unis depuis Israël',
    detail: 'Crée une adresse de livraison américaine, regroupe plusieurs colis et sélectionne le transporteur adapté à ta commande.',
    regions: ['États-Unis', 'Livraison mondiale'],
    url: 'https://www.shipito.com/en/',
    accent: '#0f766e',
  },
];

export default function ShoppingDealsPage() {
  return (
    <DiscoveryPage
      title="Bons plans shopping"
      eyebrow="Acheter ailleurs, économiser ici"
      description="Des services utiles pour commander à l’étranger et faire livrer tes achats en Israël. Compare leurs destinations, frais et conditions avant de choisir."
    >
      <div className="dilz-service-results-heading">
        <strong>{services.length} services sélectionnés</strong>
        <span>Liens officiels</span>
      </div>

      <div className="dilz-service-grid">
        {services.map((service) => (
          <a
            href={service.url}
            target="_blank"
            rel="noreferrer"
            className={['dilz-service-card', service.featured && 'is-featured'].filter(Boolean).join(' ')}
            key={service.name}
            aria-label={`Découvrir ${service.name}`}
          >
            <div className="dilz-service-card__top">
              <span className="dilz-service-card__mark" style={{ backgroundColor: service.accent }}>
                {service.mark}
              </span>
              <div>
                <strong>{service.name}</strong>
                <span>{service.label}</span>
              </div>
              <span className="dilz-service-card__external"><ExternalArrow /></span>
            </div>

            <div className="dilz-service-card__body">
              <h2>{service.title}</h2>
              <p>{service.detail}</p>
            </div>

            <div className="dilz-service-card__footer">
              <div className="dilz-service-card__regions">
                {service.regions.map((region) => <span key={region}>{region}</span>)}
              </div>
              <span className="dilz-service-card__action">
                Découvrir le service <ExternalArrow />
              </span>
            </div>
          </a>
        ))}
      </div>

      <p className="dilz-discovery-disclaimer">
        Dilz ne gère pas ces services. Vérifie les frais de transport, délais, assurances, taxes et conditions d’importation directement sur chaque plateforme avant de commander.
      </p>
    </DiscoveryPage>
  );
}

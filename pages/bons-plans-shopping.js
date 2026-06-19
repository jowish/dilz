import { useMemo } from 'react';
import { useRouter } from 'next/router';
import { DiscoveryPage, ExternalArrow } from '../components/layout/DiscoveryPage';

const COUNTRIES = [
  { id: 'all', label: 'Tous les pays' },
  { id: 'usa', label: 'Etats-Unis' },
  { id: 'greece', label: 'Grece' },
  { id: 'uk', label: 'Royaume-Uni' },
];

const CATEGORY_LABELS = {
  all: 'Toutes les categories',
  clothing: 'Mode',
  cosmetics: 'Beaute',
  department: 'Grands magasins',
  home: 'Maison',
  kids: 'Enfants',
  health: 'Sante et pharmacie',
};

const promotions = [
  { country: 'usa', store: 'Amazon', category: 'department', title: 'Offres du jour Amazon', detail: 'Promotions quotidiennes et ventes flash sur de nombreuses categories.', url: 'https://www.amazon.com/gp/goldbox', accent: '#111827' },
  { country: 'usa', store: 'Target', category: 'department', title: 'Top Deals Target', detail: 'Les principales promotions Target reunies dans une seule selection.', url: 'https://www.target.com/c/top-deals/-/N-4xw74', accent: '#cc0000' },
  { country: 'usa', store: 'Sephora', category: 'cosmetics', title: 'Sale Sephora US', detail: 'Produits beaute et coffrets actuellement dans la section soldes.', url: 'https://www.sephora.com/sale', accent: '#000000' },
  { country: 'usa', store: 'Uniqlo', category: 'clothing', title: 'Sale Uniqlo US', detail: 'Articles mode et essentiels proposes dans la section promotions.', url: 'https://www.uniqlo.com/us/en/sale', accent: '#e60012' },
  { country: 'usa', store: "Victoria's Secret", category: 'clothing', title: "Victoria's Secret Sale", detail: 'Lingerie, vetements et accessoires en promotion.', url: 'https://www.victoriassecret.com/us/vs/sale', accent: '#d93b78' },
  { country: 'usa', store: "Levi's", category: 'clothing', title: "Levi's Sale", detail: 'Jeans et vetements disponibles dans la selection soldes US.', url: 'https://www.levi.com/US/en_US/sale/c/levi_clothing_sale_us', accent: '#c41230' },
  { country: 'greece', store: 'Zara', category: 'clothing', title: 'Zara Greece Sale', detail: 'Selection mode femme actuellement presente dans la section soldes grecque.', url: 'https://www.zara.com/gr/en/sale-woman-l1583.html', accent: '#111111' },
  { country: 'greece', store: 'Mango', category: 'clothing', title: 'Mango Greece Sale', detail: 'Vetements et accessoires de la collection grecque en promotion.', url: 'https://shop.mango.com/gr/en/c/women/sale_56f4e37d', accent: '#111111' },
  { country: 'greece', store: 'Bershka', category: 'clothing', title: 'Bershka Greece Sale', detail: 'Selection femme en promotion sur la boutique grecque.', url: 'https://www.bershka.com/gr/en/women/sale-n2503.html', accent: '#111111' },
  { country: 'greece', store: 'H&M', category: 'clothing', title: 'H&M Greece Sale', detail: 'Mode et accessoires en promotion sur le catalogue grec.', url: 'https://www2.hm.com/el_gr/sale.html', accent: '#e50010' },
  { country: 'greece', store: 'Sinsay', category: 'kids', title: 'Sinsay Greece Sale', detail: 'Promotions mode, enfants et maison sur la boutique grecque.', url: 'https://www.sinsay.com/gr/el/sale', accent: '#e40046' },
  { country: 'greece', store: 'COS', category: 'clothing', title: 'COS Europe Sale', detail: 'Pieces mode de la collection europeenne dans la section soldes.', url: 'https://www.cos.com/en-eu/women/sale', accent: '#111111' },
  { country: 'uk', store: 'ASOS', category: 'clothing', title: 'ASOS Sale', detail: 'Mode, chaussures et accessoires dans la grande selection soldes UK.', url: 'https://www.asos.com/women/sale/cat/?cid=7046', accent: '#111111' },
  { country: 'uk', store: 'H&M', category: 'clothing', title: 'H&M UK Sale', detail: 'Vetements et accessoires en promotion sur la boutique britannique.', url: 'https://www2.hm.com/en_gb/sale.html', accent: '#e50010' },
  { country: 'uk', store: 'Next', category: 'clothing', title: 'Next Clearance', detail: 'Fin de series et reductions sur les collections Next UK.', url: 'https://www.next.co.uk/clearance', accent: '#111827' },
  { country: 'uk', store: 'Marks & Spencer', category: 'department', title: 'M&S Offers', detail: 'Offres mode, maison et alimentation du magasin britannique.', url: 'https://www.marksandspencer.com/c/offers', accent: '#007a3d' },
  { country: 'uk', store: 'Boots', category: 'health', title: 'Boots Offers', detail: 'Offres beaute, pharmacie et soins personnels.', url: 'https://www.boots.com/health-pharmacy-offers', accent: '#15397f' },
  { country: 'uk', store: 'Sephora', category: 'cosmetics', title: 'Sephora UK Offers', detail: 'Promotions beaute et offres speciales sur la boutique britannique.', url: 'https://www.sephora.co.uk/offers', accent: '#000000' },
];

const countryLabel = (country) => COUNTRIES.find((item) => item.id === country)?.label || country;

export default function ShoppingDealsPage() {
  const router = useRouter();
  const country = COUNTRIES.some((item) => item.id === router.query.country) ? router.query.country : 'all';
  const category = CATEGORY_LABELS[router.query.category] ? router.query.category : 'all';
  const store = typeof router.query.store === 'string' ? router.query.store : 'all';

  const stores = useMemo(() => {
    const scoped = country === 'all' ? promotions : promotions.filter((item) => item.country === country);
    return [...new Set(scoped.map((item) => item.store))].sort((a, b) => a.localeCompare(b));
  }, [country]);

  const visiblePromotions = promotions.filter((promotion) => (
    (country === 'all' || promotion.country === country)
    && (category === 'all' || promotion.category === category)
    && (store === 'all' || promotion.store === store)
  ));

  const updateFilters = (next) => {
    const query = { ...router.query, ...next };
    for (const key of ['country', 'category', 'store']) {
      if (!query[key] || query[key] === 'all') delete query[key];
    }
    if (next.country && next.country !== country) delete query.store;
    router.replace({ pathname: router.pathname, query }, undefined, { shallow: true, scroll: false });
  };

  return (
    <DiscoveryPage
      title="Bons plans internationaux"
      eyebrow="Selections ShipTanbul"
      description="Les sections promotions des enseignes recommandees par ShipTanbul, classees par pays, magasin et categorie. Chaque lien ouvre directement la boutique."
    >
      <section className="dilz-shop-filters" aria-label="Filtres des bons plans">
        <div className="dilz-shop-filter-group dilz-shop-filter-group--countries">
          <span>Pays</span>
          <div>
            {COUNTRIES.map((item) => (
              <button key={item.id} type="button" className={country === item.id ? 'is-active' : ''} onClick={() => updateFilters({ country: item.id })}>
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <label className="dilz-shop-select">
          <span>Categorie</span>
          <select value={category} onChange={(event) => updateFilters({ category: event.target.value })}>
            {Object.entries(CATEGORY_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </label>
        <label className="dilz-shop-select">
          <span>Magasin</span>
          <select value={stores.includes(store) ? store : 'all'} onChange={(event) => updateFilters({ store: event.target.value })}>
            <option value="all">Tous les magasins</option>
            {stores.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
      </section>

      <div className="dilz-shop-results-heading">
        <strong>{visiblePromotions.length} selections</strong>
        <span>Liens marchands directs</span>
      </div>

      <div className="dilz-shop-deal-grid">
        {visiblePromotions.map((promotion) => (
          <article className="dilz-shop-deal-card" key={`${promotion.country}-${promotion.store}-${promotion.title}`}>
            <div className="dilz-shop-deal-card__top">
              <span className="dilz-shop-deal-card__store" style={{ backgroundColor: promotion.accent }}>{promotion.store.slice(0, 2).toUpperCase()}</span>
              <div><strong>{promotion.store}</strong><span>{countryLabel(promotion.country)} · {CATEGORY_LABELS[promotion.category]}</span></div>
            </div>
            <div className="dilz-shop-deal-card__body">
              <span className="dilz-shop-deal-card__badge">Promotions</span>
              <h2>{promotion.title}</h2>
              <p>{promotion.detail}</p>
            </div>
            <a href={promotion.url} target="_blank" rel="noreferrer" className="dilz-shop-deal-card__action">
              Voir les offres <ExternalArrow />
            </a>
          </article>
        ))}
      </div>

      {visiblePromotions.length === 0 && (
        <div className="dilz-shop-empty">
          <strong>Aucune selection pour ces filtres.</strong>
          <button type="button" onClick={() => router.replace(router.pathname, undefined, { shallow: true })}>Reinitialiser</button>
        </div>
      )}

      <p className="dilz-discovery-disclaimer">ShipTanbul reference ces enseignes pour acheter depuis Israel. Les promotions, stocks, frais de livraison, taxes et conditions sont fixes par chaque marchand et peuvent changer sans preavis.</p>
    </DiscoveryPage>
  );
}

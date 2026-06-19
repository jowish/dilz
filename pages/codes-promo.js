import { DiscoveryPage, ExternalArrow } from '../components/layout/DiscoveryPage';

const merchants = [
  {
    name: 'AliExpress',
    source: 'https://www.dealabs.com/codes-promo/aliexpress',
    color: '#FF6500',
    offers: [
      { value: '60 EUR', text: 'des 479 EUR de commande', expiry: 'Expire le 20/06/2026' },
      { value: '20 EUR', text: 'des 149 EUR de commande', expiry: 'Expire le 20/06/2026' },
      { value: '10 EUR', text: 'des 79 EUR de commande', expiry: 'Expire le 20/06/2026' },
      { value: '5 EUR', text: 'des 39 EUR de commande', expiry: 'Expire le 20/06/2026' },
      { value: '2 EUR', text: 'des 18 EUR de commande', expiry: 'Expire le 20/06/2026' },
    ],
  },
  {
    name: 'Amazon',
    source: 'https://www.dealabs.com/codes-promo/amazon',
    color: '#0B1220',
    offers: [
      { value: '5 EUR', text: 'sur les commandes eligibles', expiry: 'Expire le 14/07/2026' },
      { value: '10 EUR', text: 'sur une premiere commande dans l app', expiry: 'Expire le 01/10/2026' },
      { value: '25%', text: 'sur une selection d accessoires', expiry: 'Expire le 17/09/2026' },
      { value: '10%', text: 'membres Prime, marques Mode eligibles', expiry: 'Expire le 11/08/2026' },
    ],
  },
];

export default function PromoCodesPage() {
  return (
    <DiscoveryPage
      title="Codes promo"
      eyebrow="Economies en ligne"
      description="Une selection de remises verifiees aujourd hui. Ouvre la source pour afficher le code et controler les conditions avant de commander."
    >
      <div className="dilz-source-note">
        <strong>Verifie le 19 juin 2026</strong>
        <span>Les codes peuvent etre limites a un pays, un compte ou une selection de produits.</span>
      </div>

      <div className="dilz-code-merchants">
        {merchants.map((merchant) => (
          <section className="dilz-code-merchant" key={merchant.name}>
            <div className="dilz-code-merchant__header">
              <span className="dilz-code-merchant__mark" style={{ backgroundColor: merchant.color }}>
                {merchant.name.slice(0, 1)}
              </span>
              <div>
                <h2>{merchant.name}</h2>
                <p>{merchant.offers.length} codes identifies</p>
              </div>
            </div>
            <div className="dilz-code-list">
              {merchant.offers.map((offer) => (
                <article className="dilz-code-card" key={`${merchant.name}-${offer.value}-${offer.text}`}>
                  <div className="dilz-code-card__value">-{offer.value}</div>
                  <div className="dilz-code-card__content">
                    <strong>{offer.text}</strong>
                    <span>{offer.expiry}</span>
                  </div>
                  <a href={merchant.source} target="_blank" rel="noreferrer" className="dilz-code-card__action">
                    Voir le code <ExternalArrow />
                  </a>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </DiscoveryPage>
  );
}

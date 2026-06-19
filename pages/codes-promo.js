import { DiscoveryPage, ExternalArrow } from '../components/layout/DiscoveryPage';
import { useAppLanguage } from '../lib/useAppLanguage';

const merchants = [
  { name: 'AliExpress', source: 'https://www.aliexpress.com/', color: '#FF6500', offers: [
    { value: '60 EUR', minimum: '479 EUR', expiry: '2026-06-20' }, { value: '20 EUR', minimum: '149 EUR', expiry: '2026-06-20' }, { value: '10 EUR', minimum: '79 EUR', expiry: '2026-06-20' }, { value: '5 EUR', minimum: '39 EUR', expiry: '2026-06-20' }, { value: '2 EUR', minimum: '18 EUR', expiry: '2026-06-20' },
  ] },
  { name: 'Amazon', source: 'https://www.amazon.fr/gp/goldbox', color: '#0B1220', offers: [
    { value: '5 EUR', condition: { en: 'on eligible orders', he: 'בהזמנות זכאיות' }, expiry: '2026-07-14' },
    { value: '10 EUR', condition: { en: 'on a first app order', he: 'בהזמנה ראשונה באפליקציה' }, expiry: '2026-10-01' },
    { value: '25%', condition: { en: 'on selected accessories', he: 'על אביזרים נבחרים' }, expiry: '2026-09-17' },
    { value: '10%', condition: { en: 'for Prime members on eligible fashion brands', he: 'לחברי Prime על מותגי אופנה זכאים' }, expiry: '2026-08-11' },
  ] },
];

function formatDate(value, lang) {
  return new Intl.DateTimeFormat(lang === 'he' ? 'he-IL' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${value}T12:00:00Z`));
}

export default function PromoCodesPage() {
  const { lang, setLang } = useAppLanguage();
  const text = lang === 'he'
    ? { title: 'קודי קופון', eyebrow: 'חיסכון אונליין', description: 'מבחר הנחות שנבדקו. פתחו את המקור כדי לראות את הקוד ולבדוק את התנאים לפני ההזמנה.', checked: 'נבדק ב-19 ביוני 2026', note: 'קודים עשויים להיות מוגבלים למדינה, חשבון או מוצרים מסוימים.', codes: 'קודים שזוהו', from: 'בקנייה מעל', expires: 'בתוקף עד', use: 'למימוש ההצעה' }
    : { title: 'Promo codes', eyebrow: 'Save online', description: 'A selection of recently checked discounts. Open the source to view the code and verify its conditions before ordering.', checked: 'Checked on 19 June 2026', note: 'Codes may be limited to a country, account or selection of products.', codes: 'codes found', from: 'on orders over', expires: 'Expires', use: 'Use offer' };

  return (
    <DiscoveryPage title={text.title} eyebrow={text.eyebrow} description={text.description} lang={lang} onLanguageChange={setLang}>
      <div className="dilz-source-note"><strong>{text.checked}</strong><span>{text.note}</span></div>
      <div className="dilz-code-merchants">
        {merchants.map((merchant) => (
          <section className="dilz-code-merchant" key={merchant.name}>
            <div className="dilz-code-merchant__header"><span className="dilz-code-merchant__mark" style={{ backgroundColor: merchant.color }}>{merchant.name[0]}</span><div><h2>{merchant.name}</h2><p>{merchant.offers.length} {text.codes}</p></div></div>
            <div className="dilz-code-list">
              {merchant.offers.map((offer) => (
                <article className="dilz-code-card" key={`${merchant.name}-${offer.value}-${offer.expiry}`}>
                  <div className="dilz-code-card__value">-{offer.value}</div>
                  <div className="dilz-code-card__content"><strong>{offer.minimum ? `${text.from} ${offer.minimum}` : offer.condition[lang]}</strong><span>{text.expires} {formatDate(offer.expiry, lang)}</span></div>
                  <a href={merchant.source} target="_blank" rel="noreferrer" className="dilz-code-card__action">{text.use} <ExternalArrow /></a>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </DiscoveryPage>
  );
}

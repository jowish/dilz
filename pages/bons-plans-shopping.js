import { DiscoveryPage, ExternalArrow } from '../components/layout/DiscoveryPage';
import { useAppLanguage } from '../lib/useAppLanguage';
import Link from 'next/link';
import { VoteEmoji } from '../components/ui/VoteEmoji';

export const services = [
  { name: 'ShipTanbul', mark: 'ST', label: { en: 'Featured', he: 'מומלץ' }, title: { en: 'Shop abroad from Israel', he: 'קניות בחו״ל מישראל' }, detail: { en: 'Access major US, Greek and UK retailers and have your purchases delivered to Israel from one platform.', he: 'גישה למותגים מובילים בארה״ב, יוון ובריטניה ומשלוח הקניות לישראל מפלטפורמה אחת.' }, regions: { en: ['United States', 'Greece', 'United Kingdom'], he: ['ארה״ב', 'יוון', 'בריטניה'] }, url: 'https://shiptanbul.com/?ref=ytypz3ie', accent: '#ff6500', featured: true },
  { name: 'USHOPS', mark: 'US', label: { en: 'Israeli service', he: 'שירות ישראלי' }, title: { en: 'An address for shopping abroad', he: 'כתובת לקניות בחו״ל' }, detail: { en: 'Logistics and forwarding to Israel for stores that do not provide local delivery.', he: 'שירות לוגיסטיקה ושילוח לישראל מאתרים שאינם מציעים משלוח מקומי.' }, regions: { en: ['International', 'Delivery to Israel'], he: ['בינלאומי', 'משלוח לישראל'] }, url: 'https://www.ushops.co.il/', accent: '#1652a1' },
  { name: 'DealTas', mark: 'DT', label: { en: 'Forwarding', he: 'שילוח' }, title: { en: 'Ship from the US and Europe', he: 'משלוחים מארה״ב ומאירופה' }, detail: { en: 'Get an overseas address and choose from several delivery options for your orders to Israel.', he: 'קבלו כתובת בחו״ל ובחרו בין אפשרויות שילוח שונות לקבלת ההזמנות בישראל.' }, regions: { en: ['United States', 'Europe'], he: ['ארה״ב', 'אירופה'] }, url: 'https://www.dealtas.com/', accent: '#7c3aed' },
  { name: 'ColisExpat', mark: 'CE', label: { en: 'Multiple countries', he: 'מספר מדינות' }, title: { en: 'Addresses in Europe and the US', he: 'כתובות באירופה ובארה״ב' }, detail: { en: 'Receives and consolidates your purchases before forwarding them directly to Israel.', he: 'קבלת קניות, איחוד חבילות ושילוח ישיר לישראל.' }, regions: { en: ['Europe', 'United States', 'Israel'], he: ['אירופה', 'ארה״ב', 'ישראל'] }, url: 'https://www.colisexpat.com/en/delivery-shipping/israel/', accent: '#008f78' },
  { name: 'MyUS', mark: 'MY', label: { en: 'International', he: 'בינלאומי' }, title: { en: 'Shop in the US and UK', he: 'קניות בארה״ב ובבריטניה' }, detail: { en: 'A local address for US and UK stores, with package consolidation and international delivery.', he: 'כתובת מקומית לחנויות בארה״ב ובבריטניה, כולל איחוד חבילות ומשלוח בינלאומי.' }, regions: { en: ['United States', 'United Kingdom'], he: ['ארה״ב', 'בריטניה'] }, url: 'https://www.myus.com/', accent: '#1d4ed8' },
  { name: 'Shipito', mark: 'SH', label: { en: 'US address', he: 'כתובת אמריקאית' }, title: { en: 'Order from the US to Israel', he: 'הזמנה מארה״ב לישראל' }, detail: { en: 'Create a US delivery address, consolidate packages and choose a carrier for your order.', he: 'צרו כתובת משלוח אמריקאית, אחדו חבילות ובחרו חברת שילוח להזמנה.' }, regions: { en: ['United States', 'Worldwide delivery'], he: ['ארה״ב', 'משלוח עולמי'] }, url: 'https://www.shipito.com/en/', accent: '#0f766e' },
];

export default function ShoppingDealsPage() {
  const { lang, setLang } = useAppLanguage();
  const text = lang === 'he'
    ? { title: 'קניות חכמות', eyebrow: 'קונים בחו״ל, חוסכים בישראל', description: 'שירותים שימושיים להזמנה מחו״ל ומשלוח לישראל. השוו יעדים, עלויות ותנאים לפני הבחירה.', count: 'שירותים נבחרים', links: 'בחירות הקהילה', discover: 'לפרטים', disclaimer: 'Dilz אינה מפעילה את השירותים האלה. בדקו עלויות משלוח, זמני אספקה, ביטוח, מיסים ותנאי יבוא ישירות בכל פלטפורמה לפני ההזמנה.' }
    : { title: 'Shopping deals', eyebrow: 'Shop abroad, save in Israel', description: 'Useful services for ordering abroad and delivering purchases to Israel. Compare destinations, fees and conditions before choosing.', count: 'selected services', links: 'Community picks', discover: 'View details', disclaimer: 'Dilz does not operate these services. Check shipping fees, delivery times, insurance, taxes and import conditions directly with each platform before ordering.' };

  return (
    <DiscoveryPage title={text.title} eyebrow={text.eyebrow} description={text.description} lang={lang} onLanguageChange={setLang}>
      <div className="dilz-service-results-heading"><strong>{services.length} {text.count}</strong><span>{text.links}</span></div>
      <div className="dilz-service-grid">
        {services.map((service) => (
          <Link href={`/shopping-deal/${service.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} className={['dilz-service-card', service.featured && 'is-featured'].filter(Boolean).join(' ')} key={service.name} aria-label={`${text.discover} ${service.name}`}>
            <div className="dilz-service-card__top">
              <span className="dilz-service-card__mark" style={{ backgroundColor: service.accent }}>{service.mark}</span>
              <div><strong>{service.name}</strong><span>{service.label[lang]}</span></div>
              <span className="dilz-service-card__external"><VoteEmoji type="chaud" /> 0 &nbsp; <VoteEmoji type="froid" /> 0</span>
            </div>
            <div className="dilz-service-card__body"><h2>{service.title[lang]}</h2><p>{service.detail[lang]}</p></div>
            <div className="dilz-service-card__footer">
              <div className="dilz-service-card__regions">{service.regions[lang].map((region) => <span key={region}>{region}</span>)}</div>
              <span className="dilz-service-card__action">{text.discover} <ExternalArrow /></span>
            </div>
          </Link>
        ))}
      </div>
      <p className="dilz-discovery-disclaimer">{text.disclaimer}</p>
    </DiscoveryPage>
  );
}

import { LegalPage } from '../components/legal/LegalPage';

const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'contact@dilz.app';

const sections = [
  {
    title: { en: 'Contact support', he: 'יצירת קשר עם התמיכה' },
    body: {
      en: [`Email ${supportEmail} for account, privacy, safety or technical support. Include the affected deal URL when reporting content. We aim to review safety reports promptly.`],
      he: [`ניתן לפנות אל ${supportEmail} בנושאי חשבון, פרטיות, בטיחות או תמיכה טכנית. בדיווח על תוכן יש לצרף את קישור הדיל הרלוונטי. אנו שואפים לבדוק דיווחי בטיחות בהקדם.`],
    },
  },
  {
    title: { en: 'Account deletion', he: 'מחיקת חשבון' },
    body: {
      en: ['Open Profile, Account settings, then Delete account. The process permanently removes your account and private data; public contributions are anonymized.'],
      he: ['פתחו פרופיל, הגדרות חשבון ולאחר מכן מחיקת חשבון. התהליך מוחק לצמיתות את החשבון והמידע הפרטי; תרומות ציבוריות עוברות אנונימיזציה.'],
    },
  },
  {
    title: { en: 'Report or block', he: 'דיווח או חסימה' },
    body: {
      en: ['Use the three-dot safety menu on a deal or comment to report content or block its author. Blocked authors are removed from your feed.'],
      he: ['השתמשו בתפריט הבטיחות בעל שלוש הנקודות בדיל או בתגובה כדי לדווח על תוכן או לחסום את הכותב. כותבים חסומים יוסרו מהפיד שלכם.'],
    },
  },
];

export default function SupportPage() {
  return <LegalPage title={{ en: 'Support', he: 'תמיכה' }} intro={{ en: 'Help with your Dilz account, community safety and technical issues.', he: 'עזרה בחשבון Dilz, בטיחות הקהילה ובעיות טכניות.' }} sections={sections} />;
}

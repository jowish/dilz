import { LegalPage } from '../components/legal/LegalPage';

const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'contact@dilz.app';

const sections = [
  {
    title: { en: 'Using Dilz', he: 'השימוש ב-Dilz' },
    body: {
      en: ['Dilz is a community service for discovering and sharing deals. You must provide accurate account information, protect your account and comply with applicable law. Deals can expire or change; verify price, availability and merchant terms before purchasing.'],
      he: ['Dilz הוא שירות קהילתי לגילוי ושיתוף דילים. עליכם למסור פרטי חשבון מדויקים, להגן על החשבון ולציית לחוק. דילים עשויים לפוג או להשתנות; יש לבדוק מחיר, זמינות ותנאי הסוחר לפני רכישה.'],
    },
  },
  {
    title: { en: 'Community rules', he: 'כללי הקהילה' },
    body: {
      en: ['Do not publish scams, spam, threats, harassment, hate, sexual or illegal content, personal information without permission, misleading offers, or content that infringes intellectual property. Use the report and block controls when necessary.', 'We may review, restrict or remove content and suspend or terminate accounts that violate these rules.'],
      he: ['אין לפרסם הונאות, ספאם, איומים, הטרדה, שנאה, תוכן מיני או בלתי חוקי, מידע אישי ללא רשות, הצעות מטעות או תוכן המפר זכויות קניין רוחני. השתמשו בכלי הדיווח והחסימה בעת הצורך.', 'אנו רשאים לבדוק, להגביל או להסיר תוכן ולהשעות או לסגור חשבונות המפרים כללים אלה.'],
    },
  },
  {
    title: { en: 'Your content', he: 'התוכן שלכם' },
    body: {
      en: ['You retain ownership of content you submit. You grant Dilz permission to host, display and distribute it as needed to operate the service. You confirm that you have the right to share submitted text, links and photos.'],
      he: ['הבעלות על התוכן ששלחתם נשארת שלכם. אתם מעניקים ל-Dilz רשות לאחסן, להציג ולהפיץ אותו ככל שנדרש להפעלת השירות. אתם מאשרים שיש לכם זכות לשתף את הטקסט, הקישורים והתמונות שנשלחו.'],
    },
  },
  {
    title: { en: 'Third-party offers and liability', he: 'הצעות צד שלישי ואחריות' },
    body: {
      en: ['Dilz is not the seller of third-party products and does not guarantee offer accuracy, quality, delivery or availability. The service is provided as available. Nothing in these terms excludes rights that cannot legally be excluded.'],
      he: ['Dilz אינה המוכרת של מוצרי צד שלישי ואינה מבטיחה דיוק הצעה, איכות, משלוח או זמינות. השירות ניתן כפי שהוא זמין. אין בתנאים אלה כדי לשלול זכויות שלא ניתן לשלול על פי דין.'],
    },
  },
  {
    title: { en: 'Contact', he: 'יצירת קשר' },
    body: {
      en: [`Questions, safety reports and legal requests can be sent to ${supportEmail}.`],
      he: [`שאלות, דיווחי בטיחות ובקשות משפטיות ניתן לשלוח אל ${supportEmail}.`],
    },
  },
];

export default function TermsPage() {
  return <LegalPage title={{ en: 'Terms of Use', he: 'תנאי שימוש' }} intro={{ en: 'These terms govern your access to Dilz and the community content available through it.', he: 'תנאים אלה מסדירים את הגישה ל-Dilz ולתוכן הקהילתי הזמין בו.' }} sections={sections} />;
}

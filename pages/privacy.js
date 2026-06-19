import { LegalPage } from '../components/legal/LegalPage';

const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'contact@dilz.app';

const sections = [
  {
    title: { en: 'Information we collect', he: 'המידע שאנו אוספים' },
    body: {
      en: ['We collect account information such as your email address and display name, content you publish, comments, votes, saved items, alerts, push subscriptions, uploaded photos and the preferences you choose.', 'We may also process basic technical information required to operate, secure and diagnose the service.'],
      he: ['אנו אוספים פרטי חשבון כגון כתובת דוא״ל ושם תצוגה, תוכן שאתם מפרסמים, תגובות, הצבעות, פריטים שמורים, התראות, הרשמות לעדכוני דחיפה, תמונות והעדפות שבחרתם.', 'אנו עשויים לעבד גם מידע טכני בסיסי הנדרש להפעלה, אבטחה ואבחון של השירות.'],
    },
  },
  {
    title: { en: 'How we use information', he: 'כיצד אנו משתמשים במידע' },
    body: {
      en: ['We use this information to provide Dilz, authenticate users, display community deals, personalize the feed, send requested alerts, prevent abuse and improve reliability. We do not sell personal information.'],
      he: ['אנו משתמשים במידע כדי לספק את Dilz, לאמת משתמשים, להציג דילים קהילתיים, להתאים את הפיד, לשלוח התראות שביקשתם, למנוע שימוש לרעה ולשפר אמינות. איננו מוכרים מידע אישי.'],
    },
  },
  {
    title: { en: 'Service providers and external links', he: 'ספקי שירות וקישורים חיצוניים' },
    body: {
      en: ['Dilz uses Supabase for authentication, database and storage, and Vercel for hosting. Push notification providers process delivery information when you enable notifications. If you explicitly request My location, OpenStreetMap Nominatim receives coordinates to identify the nearby city. Merchant links open third-party services governed by their own privacy policies.'],
      he: ['Dilz משתמשת ב-Supabase לאימות, מסד נתונים ואחסון וב-Vercel לאירוח. ספקי הודעות דחיפה מעבדים פרטי מסירה כאשר אתם מפעילים התראות. אם תבחרו במפורש במיקום שלי, OpenStreetMap Nominatim יקבל קואורדינטות כדי לזהות את העיר הקרובה. קישורים לסוחרים פותחים שירותי צד שלישי הכפופים למדיניות שלהם.'],
    },
  },
  {
    title: { en: 'Retention, control and deletion', he: 'שמירה, שליטה ומחיקה' },
    body: {
      en: ['You can change preferences or permanently delete your account from Account settings. Deletion removes your account and associated private data. Community posts and comments may remain in anonymized form to preserve conversations and deal history.', `For privacy requests, contact ${supportEmail}.`],
      he: ['ניתן לשנות העדפות או למחוק לצמיתות את החשבון מתוך הגדרות החשבון. המחיקה מסירה את החשבון ואת המידע הפרטי המשויך. פוסטים ותגובות קהילתיים עשויים להישאר בצורה אנונימית לשמירת רצף השיחות והיסטוריית הדילים.', `לבקשות פרטיות ניתן לפנות אל ${supportEmail}.`],
    },
  },
  {
    title: { en: 'Children and changes', he: 'ילדים ושינויים' },
    body: {
      en: ['Dilz is not directed to children under 13. We may update this policy as the service changes and will publish the current version on this page.'],
      he: ['Dilz אינה מיועדת לילדים מתחת לגיל 13. אנו עשויים לעדכן מדיניות זו עם שינוי השירות ונפרסם את הגרסה העדכנית בעמוד זה.'],
    },
  },
];

export default function PrivacyPage() {
  return <LegalPage title={{ en: 'Privacy Policy', he: 'מדיניות פרטיות' }} intro={{ en: 'This policy explains what Dilz collects, why it is used and the choices available to you.', he: 'מדיניות זו מסבירה איזה מידע Dilz אוספת, מדוע נעשה בו שימוש ואילו אפשרויות עומדות לרשותכם.' }} sections={sections} />;
}

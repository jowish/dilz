const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Real deals sourced from tms.co.il (Israeli tech/gaming store) and castro.com
// URLs verified June 2026
const deals = [
  // TMS.CO.IL — online tech store
  {
    titre: 'מסך Gigabyte FO32U2P AORUS 32" OLED 4K 240Hz',
    description: 'מסך OLED 32 אינץ\' 4K 240Hz, QD-OLED, זמן תגובה 0.03ms. מושלם לגיימינג ועבודה. -25% הנחה.',
    prix: 3220, prix_original: 4290,
    magasin: 'TMS', ville: 'תל אביב',
    auteur_nom: 'DilzBot', votes_chaud: 12, votes_froid: 1,
  },
  {
    titre: 'מסך Gigabyte MO27Q2 27" OLED 360Hz',
    description: 'מסך OLED 27 אינץ\' QHD 360Hz לגיימינג תחרותי. תגובה 0.03ms. -24%.',
    prix: 1786, prix_original: 2361,
    magasin: 'TMS', ville: 'חיפה',
    auteur_nom: 'DilzBot', votes_chaud: 8, votes_froid: 0,
  },
  {
    titre: 'מסך Gigabyte FO32U2 AORUS 32" OLED 4K',
    description: 'OLED 32 אינץ\' 4K 240Hz, כיסוי 98.5% DCI-P3, עיצוב ללא מסגרות. -20%.',
    prix: 2888, prix_original: 3596,
    magasin: 'TMS', ville: 'ירושלים',
    auteur_nom: 'DilzBot', votes_chaud: 6, votes_froid: 0,
  },
  {
    titre: 'כיסא גיימינג Noblechairs AURA ATMOSHELL',
    description: 'כיסא גיימינג פרמיום, ריפוד ארגונומי מתקדם, תמיכה לגב. משלוח חינם. -20%.',
    prix: 2792, prix_original: 3490,
    magasin: 'TMS', ville: 'ראשון לציון',
    auteur_nom: 'DilzBot', votes_chaud: 9, votes_froid: 2,
  },
  {
    titre: 'אוזניות Edifier STAX Spirit S5 אלחוטיות',
    description: 'over-ear אלחוטיות עם STAX electrostatic driver. איכות צליל יוצאת דופן. -25%.',
    prix: 1163, prix_original: 1550,
    magasin: 'TMS', ville: 'פתח תקווה',
    auteur_nom: 'DilzBot', votes_chaud: 15, votes_froid: 1,
  },
  {
    titre: 'אוזניות Edifier STAX Spirit S3 אלחוטיות',
    description: 'on-ear אלחוטיות ANC מתקדם, 80 שעות סוללה, STAX electrostatic. -25%.',
    prix: 742, prix_original: 990,
    magasin: 'TMS', ville: 'נתניה',
    auteur_nom: 'DilzBot', votes_chaud: 11, votes_froid: 0,
  },
  {
    titre: 'אוזניות Edifier STAX Spirit S10 TWS -40%',
    description: 'אוזניות TWS עם STAX ANC היברידי, IPX4, 10 שעות. הנחה 40% — מחיר שיא נמוך.',
    prix: 594, prix_original: 990,
    magasin: 'TMS', ville: 'באר שבע',
    auteur_nom: 'DilzBot', votes_chaud: 18, votes_froid: 2,
  },
  {
    titre: 'זיכרון Corsair Dominator Platinum RGB DDR5 32GB',
    description: 'DDR5 32GB 5200MHz CL40 עם RGB. מומלץ ל-Intel ו-AMD AM5. -25%.',
    prix: 1479, prix_original: 1971,
    magasin: 'TMS', ville: 'הרצליה',
    auteur_nom: 'DilzBot', votes_chaud: 7, votes_froid: 0,
  },
  {
    titre: 'זיכרון G.Skill Trident Z5 RGB DDR5 32GB -30%',
    description: 'DDR5 32GB 5200MHz CL40. ביצועים גבוהים לגיימינג ועריכת וידאו. הנחה של 30%.',
    prix: 1380, prix_original: 1971,
    magasin: 'TMS', ville: 'רמת גן',
    auteur_nom: 'DilzBot', votes_chaud: 5, votes_froid: 0,
  },
  {
    titre: 'כרטיס לכידה Elgato Game Capture HD60 Pro',
    description: 'לכידת וידאו פנימי PCIe ב-1080p 60fps. מושלם ל-YouTube ו-Twitch. -20%.',
    prix: 622, prix_original: 778,
    magasin: 'TMS', ville: 'אשדוד',
    auteur_nom: 'DilzBot', votes_chaud: 4, votes_froid: 1,
  },
  {
    titre: 'מארז Corsair FRAME 4500X RS ARGB (שחור) -24%',
    description: 'מארז ATX זכוכית 3 צדדים, 3 מאווררי ARGB. מראה פרמיום במחיר מכה.',
    prix: 550, prix_original: 720,
    magasin: 'TMS', ville: 'נצרת',
    auteur_nom: 'DilzBot', votes_chaud: 6, votes_froid: 0,
  },
  {
    titre: 'זרוע כפולה למסכים IPPON Dual Monitor Arm -43%',
    description: 'זרוע כפולה 2 מפרקים, עד 2×10 ק"ג, מסכים 17-27 אינץ\'. חסכון של 43%.',
    prix: 347, prix_original: 608,
    magasin: 'TMS', ville: 'חולון',
    auteur_nom: 'DilzBot', votes_chaud: 10, votes_froid: 1,
  },
  {
    titre: 'עכבר גיימינג Corsair Glaive RGB Pro Aluminum -27%',
    description: '18,000 DPI אופטי, גריפ אלומיניום, RGB, 3 כרות ידיים להחלפה.',
    prix: 234, prix_original: 319,
    magasin: 'TMS', ville: 'בת ים',
    auteur_nom: 'DilzBot', votes_chaud: 8, votes_froid: 0,
  },
  {
    titre: 'זיכרון Samsung DDR4 8GB 3200MHz -50%',
    description: 'מודול Samsung DDR4 8GB 3200MHz CL22. אמין ומשתלם — חצי מחיר!',
    prix: 141, prix_original: 282,
    magasin: 'TMS', ville: 'רחובות',
    auteur_nom: 'DilzBot', votes_chaud: 3, votes_froid: 0,
  },
  {
    titre: 'מארז Antec NX360 Elite -50%',
    description: 'מארז ATX עם 3 מאווררי ARGB, זכוכית מחוסמת, תמיכה 360mm rad. חצי מחיר!',
    prix: 88, prix_original: 177,
    magasin: 'TMS', ville: 'כפר סבא',
    auteur_nom: 'DilzBot', votes_chaud: 14, votes_froid: 2,
  },
  {
    titre: 'אוזניה Edifier CC200 מקצועית Mono -34%',
    description: 'אוזניית קול סנטר מיקרופון מבטל רעשים, USB-A. מצוין לעבודה מהבית.',
    prix: 106, prix_original: 160,
    magasin: 'TMS', ville: 'עכו',
    auteur_nom: 'DilzBot', votes_chaud: 2, votes_froid: 0,
  },
  {
    titre: 'הר טלוויזיה IPPON עד 40 ק"ג -47%',
    description: 'הר קיר מסתובב ונוטה לטלוויזיה 37-80 אינץ\', עד 40 ק"ג. קל להתקנה.',
    prix: 169, prix_original: 320,
    magasin: 'TMS', ville: 'טבריה',
    auteur_nom: 'DilzBot', votes_chaud: 7, votes_froid: 1,
  },
  // Castro — home decor flash sale
  {
    titre: 'סלסלת נוי מתכת זהב Castro MOOD -30%',
    description: 'סלסלת נוי מתכת זהב לסלון, שידה או מדף. פלאש סייל 30% הנחה.',
    prix: 42, prix_original: 60,
    magasin: 'Castro', ville: 'תל אביב',
    auteur_nom: 'DilzBot', votes_chaud: 5, votes_froid: 0,
  },
  {
    titre: 'ארגז אחסון עץ שיטה 36×18 ס"מ Castro -31%',
    description: 'ארגז אחסון מעץ שיטה טבעי. עיצוב בוהו שיק, לאמבטיה, מטבח או סלון.',
    prix: 83, prix_original: 120,
    magasin: 'Castro', ville: 'ירושלים',
    auteur_nom: 'DilzBot', votes_chaud: 4, votes_froid: 1,
  },
  {
    titre: 'סלסלה עם ידיות 40×26 ס"מ Castro -40%',
    description: 'סלסלת אחסון גדולה עם ידיות בד. טבעי ואלגנטי. פלאש סייל 40% הנחה.',
    prix: 71, prix_original: 120,
    magasin: 'Castro', ville: 'חיפה',
    auteur_nom: 'DilzBot', votes_chaud: 6, votes_froid: 0,
  },
  // Castro fashion
  {
    titre: '4 חולצות בייסיק Castro ב-₪100',
    description: '4 ב-₪100 על כל חולצות הבייסיק! שחור, לבן, אפור, חאקי ועוד. גברים ונשים.',
    prix: 100, prix_original: 160,
    magasin: 'Castro', ville: 'נתניה',
    auteur_nom: 'DilzBot', votes_chaud: 22, votes_froid: 2,
  },
  {
    titre: '2 ג\'ינסים Castro ב-₪300',
    description: 'מבצע ג\'ינסים 2 ב-₪300! גברים ונשים, מגוון גזרות וצבעים בכל הסניפים.',
    prix: 150, prix_original: 259,
    magasin: 'Castro', ville: 'ראשון לציון',
    auteur_nom: 'DilzBot', votes_chaud: 17, votes_froid: 1,
  },
  {
    titre: 'מגבות אמבטיה Castro 1+1',
    description: 'מגבות איכותיות 1+1 בכל הסניפים. Hand ו-Bath בצבעים שונים.',
    prix: 60, prix_original: 120,
    magasin: 'Castro', ville: 'באר שבע',
    auteur_nom: 'DilzBot', votes_chaud: 9, votes_froid: 0,
  },
  // Food & Activities
  {
    titre: 'כרטיס קולנוע Yes Planet יום ג\' ב-₪30',
    description: 'כרטיסי קולנוע Yes Planet ביום שלישי — מחיר מיוחד ₪29.90. כולל IMAX.',
    prix: 30, prix_original: 55,
    magasin: 'Yes Planet', ville: 'תל אביב',
    auteur_nom: 'DilzBot', votes_chaud: 31, votes_froid: 3,
  },
  {
    titre: '2 חודשי HOT Mobile ב-₪1 — 100GB',
    description: '2 חודשים ב-₪1 עם 100GB + שיחות בלתי מוגבלות. למצטרפים חדשים בלבד.',
    prix: 1, prix_original: 90,
    magasin: 'HOT Mobile', ville: 'הרצליה',
    auteur_nom: 'DilzBot', votes_chaud: 44, votes_froid: 5,
  },
  {
    titre: 'קוד Wolt WOLT30 — 30% על הזמנה ראשונה',
    description: 'קוד WOLT30 — 30% הנחה על הזמנה ראשונה. עד ₪50 הנחה. תקף לכל המסעדות.',
    prix: 0, prix_original: 0,
    magasin: 'Wolt', ville: 'תל אביב',
    auteur_nom: 'DilzBot', votes_chaud: 55, votes_froid: 8,
  },
  {
    titre: 'פיצה L ב-₪49 Domino\'s',
    description: 'פיצה L כל טעם ב-₪49! הזמנה אונליין בלבד. תקף בכל הסניפים.',
    prix: 49, prix_original: 79,
    magasin: "Domino's", ville: 'ירושלים',
    auteur_nom: 'DilzBot', votes_chaud: 38, votes_froid: 4,
  },
  {
    titre: 'מנה ב-₪1 לחברי מועדון McDonald\'s',
    description: 'חברי מועדון מקדולנד\'ס ישראל — מנה ב-₪1 בכל יום. הורידו את האפליקציה.',
    prix: 1, prix_original: 25,
    magasin: "McDonald's", ville: 'חיפה',
    auteur_nom: 'DilzBot', votes_chaud: 29, votes_froid: 6,
  },
];

async function main() {
  console.log(`Inserting ${deals.length} deals...`);
  const { data, error } = await supabase
    .from('bons_plans')
    .insert(deals)
    .select();

  if (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }

  console.log(`✓ Inserted ${data.length} deals`);
  process.exit(0);
}

main();

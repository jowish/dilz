// Replaces all DilzBot seed deals with full data: real images, working URLs, supermarket deals
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Free Unsplash photos (stable direct URLs)
const IMG = {
  pizza:    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&h=400&fit=crop&auto=format',
  burger:   'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&h=400&fit=crop&auto=format',
  cinema:   'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&h=400&fit=crop&auto=format',
  phone:    'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&h=400&fit=crop&auto=format',
  jeans:    'https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&h=400&fit=crop&auto=format',
  clothes:  'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=600&h=400&fit=crop&auto=format',
  towel:    'https://images.unsplash.com/photo-1620799139507-2a76f79a2f4d?w=600&h=400&fit=crop&auto=format',
  basket:   'https://images.unsplash.com/photo-1595418945423-476371b0a9d2?w=600&h=400&fit=crop&auto=format',
  wood:     'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=400&fit=crop&auto=format',
  homedeco: 'https://images.unsplash.com/photo-1567225557594-88d73e55f2cb?w=600&h=400&fit=crop&auto=format',
  market:   'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&h=400&fit=crop&auto=format',
  veggies:  'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=600&h=400&fit=crop&auto=format',
  chicken:  'https://images.unsplash.com/photo-1602473863881-1c4cfe0fcbe8?w=600&h=400&fit=crop&auto=format',
  cheese:   'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=600&h=400&fit=crop&auto=format',
  wine:     'https://images.unsplash.com/photo-1474722883778-792e7990302f?w=600&h=400&fit=crop&auto=format',
  fish:     'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600&h=400&fit=crop&auto=format',
  fruit:    'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=600&h=400&fit=crop&auto=format',
  water:    'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=600&h=400&fit=crop&auto=format',
  sauce:    'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600&h=400&fit=crop&auto=format',
  delivery: 'https://images.unsplash.com/photo-1526367790999-0150786686a2?w=600&h=400&fit=crop&auto=format',
};

const TMS = (sku, hash) =>
  `https://tms.co.il/image/cache/catalog/products/${sku}/${hash}-1000x1000.jpg`;

const deals = [
  // ── TMS.CO.IL — Tech ────────────────────────────────────────────────
  {
    titre: 'מסך Gigabyte FO32U2P AORUS 32" OLED 4K 240Hz',
    description: 'QD-OLED 32 אינץ\' 4K 240Hz, זמן תגובה 0.03ms. הנחה 25% — מחיר שיא נמוך!',
    prix: 3220, prix_original: 4290, magasin: 'TMS', ville: 'תל אביב',
    categorie: 'Tech', url_source: 'https://tms.co.il/sale',
    image_url: TMS('FO32U2P', 'LiJ5GSyj5b'),
    auteur_nom: 'DilzBot', statut: 'actif', votes_chaud: 12, votes_froid: 1,
  },
  {
    titre: 'מסך Gigabyte MO27Q2 27" OLED 360Hz',
    description: 'QHD 360Hz לגיימינג תחרותי, תגובה 0.03ms. -24%.',
    prix: 1786, prix_original: 2361, magasin: 'TMS', ville: 'חיפה',
    categorie: 'Tech', url_source: 'https://tms.co.il/sale',
    image_url: TMS('MO27Q2', 'n7M7lpvVxc'),
    auteur_nom: 'DilzBot', statut: 'actif', votes_chaud: 8, votes_froid: 0,
  },
  {
    titre: 'מסך Gigabyte FO32U2 32" OLED 4K -20%',
    description: 'OLED 32 אינץ\' 4K 240Hz, כיסוי 98.5% DCI-P3. -20%.',
    prix: 2888, prix_original: 3596, magasin: 'TMS', ville: 'ירושלים',
    categorie: 'Tech', url_source: 'https://tms.co.il/sale',
    image_url: TMS('FO32U2', '4R6pcWSLXm'),
    auteur_nom: 'DilzBot', statut: 'actif', votes_chaud: 6, votes_froid: 0,
  },
  {
    titre: 'כיסא גיימינג Noblechairs AURA -20%',
    description: 'כיסא פרמיום עם ריפוד ארגונומי מתקדם. משלוח חינם. -20%.',
    prix: 2792, prix_original: 3490, magasin: 'TMS', ville: 'ראשון לציון',
    categorie: 'Tech', url_source: 'https://tms.co.il/sale',
    image_url: TMS('NBL-AUR-GER-BED', 'gQBQNggN0r'),
    auteur_nom: 'DilzBot', statut: 'actif', votes_chaud: 9, votes_froid: 2,
  },
  {
    titre: 'אוזניות Edifier STAX Spirit S5 -25%',
    description: 'over-ear אלחוטיות STAX electrostatic. איכות צליל יוצאת דופן. -25%.',
    prix: 1163, prix_original: 1550, magasin: 'TMS', ville: 'פתח תקווה',
    categorie: 'Tech', url_source: 'https://tms.co.il/sale',
    image_url: TMS('S5', 'nXnLReh10Z'),
    auteur_nom: 'DilzBot', statut: 'actif', votes_chaud: 15, votes_froid: 1,
  },
  {
    titre: 'אוזניות Edifier STAX Spirit S3 ANC -25%',
    description: 'on-ear אלחוטיות ANC מתקדם, 80 שעות סוללה. -25%.',
    prix: 742, prix_original: 990, magasin: 'TMS', ville: 'נתניה',
    categorie: 'Tech', url_source: 'https://tms.co.il/sale',
    image_url: TMS('S3', 'rjkgcdEWaw'),
    auteur_nom: 'DilzBot', statut: 'actif', votes_chaud: 11, votes_froid: 0,
  },
  {
    titre: 'אוזניות Edifier STAX Spirit S10 TWS -40%',
    description: 'TWS עם STAX ANC היברידי, IPX4, 10 שעות. -40%.',
    prix: 594, prix_original: 990, magasin: 'TMS', ville: 'באר שבע',
    categorie: 'Tech', url_source: 'https://tms.co.il/sale',
    image_url: TMS('STAX-S10', 'DKDOF46ufp'),
    auteur_nom: 'DilzBot', statut: 'actif', votes_chaud: 18, votes_froid: 2,
  },
  {
    titre: 'זיכרון Corsair Dominator Platinum DDR5 32GB -25%',
    description: 'DDR5 32GB 5200MHz CL40 עם RGB. Intel ו-AMD AM5. -25%.',
    prix: 1479, prix_original: 1971, magasin: 'TMS', ville: 'הרצליה',
    categorie: 'Tech', url_source: 'https://tms.co.il/sale',
    image_url: TMS('CMT32GX5M2B5200C40', 'nxeJ2Uj0BU'),
    auteur_nom: 'DilzBot', statut: 'actif', votes_chaud: 7, votes_froid: 0,
  },
  {
    titre: 'זיכרון G.Skill Trident Z5 RGB DDR5 32GB -30%',
    description: 'DDR5 32GB 5200MHz CL40. ביצועים גבוהים לגיימינג. -30%.',
    prix: 1380, prix_original: 1971, magasin: 'TMS', ville: 'רמת גן',
    categorie: 'Tech', url_source: 'https://tms.co.il/sale',
    image_url: TMS('5200J4040A16GX2-TZ5RS', '18ukvNYU04'),
    auteur_nom: 'DilzBot', statut: 'actif', votes_chaud: 5, votes_froid: 0,
  },
  {
    titre: 'כרטיס לכידה Elgato HD60 Pro PCIe -20%',
    description: 'לכידת 1080p 60fps. לסטרימינג ב-YouTube ו-Twitch. -20%.',
    prix: 622, prix_original: 778, magasin: 'TMS', ville: 'אשדוד',
    categorie: 'Tech', url_source: 'https://tms.co.il/sale',
    image_url: TMS('1GC109901002', 'eU99PZOJxw'),
    auteur_nom: 'DilzBot', statut: 'actif', votes_chaud: 4, votes_froid: 1,
  },
  {
    titre: 'מארז Corsair FRAME 4500X ARGB שחור -24%',
    description: 'ATX זכוכית 3 צדדים, 3 מאווררי ARGB מובנים. -24%.',
    prix: 550, prix_original: 720, magasin: 'TMS', ville: 'נצרת',
    categorie: 'Tech', url_source: 'https://tms.co.il/sale',
    image_url: TMS('CC-9011314-WW', 'os7k5x3qNg'),
    auteur_nom: 'DilzBot', statut: 'actif', votes_chaud: 6, votes_froid: 0,
  },
  {
    titre: 'זרוע כפולה IPPON Dual Monitor Arm -43%',
    description: 'זרוע כפולה, עד 2×10 ק"ג, מסכים 17-27". -43%.',
    prix: 347, prix_original: 608, magasin: 'TMS', ville: 'חולון',
    categorie: 'Tech', url_source: 'https://tms.co.il/sale',
    image_url: TMS('IPMA85202PN', '9TK7xBiNDA'),
    auteur_nom: 'DilzBot', statut: 'actif', votes_chaud: 10, votes_froid: 1,
  },
  {
    titre: 'עכבר גיימינג Corsair Glaive RGB Pro -27%',
    description: '18,000 DPI, גריפ אלומיניום, RGB, 3 כרות ידיים. -27%.',
    prix: 234, prix_original: 319, magasin: 'TMS', ville: 'בת ים',
    categorie: 'Tech', url_source: 'https://tms.co.il/sale',
    image_url: TMS('CH-9302311-NA', 'pulqzuyqte'),
    auteur_nom: 'DilzBot', statut: 'actif', votes_chaud: 8, votes_froid: 0,
  },
  {
    titre: 'מארז Antec NX360 Elite ARGB -50%',
    description: 'ATX עם 3 מאווררי ARGB, זכוכית, תמיכה 360mm rad. -50%!',
    prix: 88, prix_original: 177, magasin: 'TMS', ville: 'כפר סבא',
    categorie: 'Tech', url_source: 'https://tms.co.il/sale',
    image_url: TMS('NX360ELITE', 'NOWIdPsOws'),
    auteur_nom: 'DilzBot', statut: 'actif', votes_chaud: 14, votes_froid: 2,
  },

  // ── Castro Home ──────────────────────────────────────────────────────
  {
    titre: 'סלסלת נוי מתכת זהב Castro MOOD -30%',
    description: 'סלסלת נוי מתכת זהב לסלון, שידה או מדף. פלאש סייל -30%.',
    prix: 42, prix_original: 60, magasin: 'Castro', ville: 'תל אביב',
    categorie: 'Activities', url_source: 'https://www.castro.com/flash-sale',
    image_url: IMG.homedeco,
    auteur_nom: 'DilzBot', statut: 'actif', votes_chaud: 5, votes_froid: 0,
  },
  {
    titre: 'ארגז אחסון עץ שיטה 36×18 ס"מ Castro -31%',
    description: 'ארגז מעץ שיטה טבעי לאמבטיה, מטבח או סלון. -31%.',
    prix: 83, prix_original: 120, magasin: 'Castro', ville: 'ירושלים',
    categorie: 'Activities', url_source: 'https://www.castro.com/flash-sale',
    image_url: IMG.wood,
    auteur_nom: 'DilzBot', statut: 'actif', votes_chaud: 4, votes_froid: 1,
  },
  {
    titre: 'סלסלה עם ידיות 40×26 ס"מ Castro -40%',
    description: 'סלסלת אחסון גדולה עם ידיות בד. טבעי ואלגנטי. -40%.',
    prix: 71, prix_original: 120, magasin: 'Castro', ville: 'חיפה',
    categorie: 'Activities', url_source: 'https://www.castro.com/flash-sale',
    image_url: IMG.basket,
    auteur_nom: 'DilzBot', statut: 'actif', votes_chaud: 6, votes_froid: 0,
  },

  // ── Castro Fashion ────────────────────────────────────────────────────
  {
    titre: '4 חולצות בייסיק Castro ב-₪100',
    description: '4 ב-₪100 על כל חולצות הבייסיק! שחור, לבן, אפור, חאקי ועוד.',
    prix: 100, prix_original: 164, magasin: 'Castro', ville: 'נתניה',
    categorie: 'Fashion', url_source: 'https://www.castro.com/en/sale-products',
    image_url: IMG.clothes,
    auteur_nom: 'DilzBot', statut: 'actif', votes_chaud: 22, votes_froid: 2,
  },
  {
    titre: "2 ג'ינסים Castro ב-₪300",
    description: '2 ב-₪300! גברים ונשים, מגוון גזרות וצבעים בכל הסניפים.',
    prix: 150, prix_original: 259, magasin: 'Castro', ville: 'ראשון לציון',
    categorie: 'Fashion', url_source: 'https://www.castro.com/en/sale-products',
    image_url: IMG.jeans,
    auteur_nom: 'DilzBot', statut: 'actif', votes_chaud: 17, votes_froid: 1,
  },
  {
    titre: 'מגבות אמבטיה Castro 1+1',
    description: 'מגבות איכותיות 1+1. Hand ו-Bath בצבעים שונים.',
    prix: 60, prix_original: 120, magasin: 'Castro', ville: 'באר שבע',
    categorie: 'Fashion', url_source: 'https://www.castro.com/en/sale-products',
    image_url: IMG.towel,
    auteur_nom: 'DilzBot', statut: 'actif', votes_chaud: 9, votes_froid: 0,
  },

  // ── יוחננוף ──────────────────────────────────────────────────────────
  {
    titre: 'חזה עוף טרי 500 גר\' ב-₪9.90 — יוחננוף',
    description: 'מבצע שבועי: חזה עוף טרי 500 גר\' ב-₪9.90. מוצר כשר. בכל סניפי יוחננוף.',
    prix: 990, prix_original: 1990, magasin: 'יוחננוף', ville: 'ירושלים',
    categorie: 'Food', url_source: 'https://www.yohananof.co.il/specials',
    image_url: IMG.chicken,
    auteur_nom: 'DilzBot', statut: 'actif', votes_chaud: 28, votes_froid: 3,
  },
  {
    titre: 'גבינה צהובה עמק 200 גר\' 1+1 — יוחננוף',
    description: 'גבינה צהובה עמק 200 גר\' — 1+1! המחיר לזוג ₪19.90. עד גמר המלאי.',
    prix: 990, prix_original: 1990, magasin: 'יוחננוף', ville: 'בת ים',
    categorie: 'Food', url_source: 'https://www.yohananof.co.il/specials',
    image_url: IMG.cheese,
    auteur_nom: 'DilzBot', statut: 'actif', votes_chaud: 19, votes_froid: 2,
  },
  {
    titre: 'ענבים אדומים 1 ק"ג ב-₪9.90 — יוחננוף',
    description: 'ענבים אדומים טריים 1 ק"ג ב-₪9.90! מחיר שבועי. כשר פרווה.',
    prix: 990, prix_original: 1990, magasin: 'יוחננוף', ville: 'רחובות',
    categorie: 'Food', url_source: 'https://www.yohananof.co.il/specials',
    image_url: IMG.fruit,
    auteur_nom: 'DilzBot', statut: 'actif', votes_chaud: 24, votes_froid: 1,
  },
  {
    titre: 'Heinz קטשופ 460 מ"ל 2+1 — יוחננוף',
    description: 'היינץ קטשופ 460 מ"ל — 2+1 חינם! רק ₪13.90 ל-2 בקבוקים + 1 חינם.',
    prix: 1390, prix_original: 2085, magasin: 'יוחננוף', ville: 'ירושלים',
    categorie: 'Food', url_source: 'https://www.yohananof.co.il/specials',
    image_url: IMG.sauce,
    auteur_nom: 'DilzBot', statut: 'actif', votes_chaud: 16, votes_froid: 2,
  },

  // ── אושר עד ──────────────────────────────────────────────────────────
  {
    titre: 'מלפפון אנגלי 1 ק"ג ב-₪2.90 — אושר עד',
    description: 'מלפפון אנגלי טרי 1 ק"ג ב-₪2.90 בלבד! מחיר מחסן אמיתי.',
    prix: 290, prix_original: 690, magasin: 'אושר עד', ville: 'אשדוד',
    categorie: 'Food', url_source: 'https://www.osherad.co.il',
    image_url: IMG.veggies,
    auteur_nom: 'DilzBot', statut: 'actif', votes_chaud: 35, votes_froid: 2,
  },
  {
    titre: 'תה וויסוצקי 25 שקיות ב-₪4.90 — אושר עד',
    description: 'תה שחור וויסוצקי 25 שקיות ב-₪4.90. מחיר מחסן עד גמר המלאי.',
    prix: 490, prix_original: 990, magasin: 'אושר עד', ville: 'פתח תקווה',
    categorie: 'Food', url_source: 'https://www.osherad.co.il',
    image_url: IMG.market,
    auteur_nom: 'DilzBot', statut: 'actif', votes_chaud: 22, votes_froid: 1,
  },
  {
    titre: 'אנטריקוט בקר 400 גר\' ב-₪29.90 — אושר עד',
    description: 'אנטריקוט בקר טרי 400 גר\' ב-₪29.90. כשר. סוף שבוע בלבד.',
    prix: 2990, prix_original: 4990, magasin: 'אושר עד', ville: 'נתניה',
    categorie: 'Food', url_source: 'https://www.osherad.co.il',
    image_url: IMG.chicken,
    auteur_nom: 'DilzBot', statut: 'actif', votes_chaud: 31, votes_froid: 4,
  },
  {
    titre: 'מים מינרלים 6×1.5 ל\' ב-₪9.90 — אושר עד',
    description: 'מארז 6 בקבוקי מים מינרלים 1.5 ל\' ב-₪9.90 בלבד.',
    prix: 990, prix_original: 1990, magasin: 'אושר עד', ville: 'ראשון לציון',
    categorie: 'Food', url_source: 'https://www.osherad.co.il',
    image_url: IMG.water,
    auteur_nom: 'DilzBot', statut: 'actif', votes_chaud: 27, votes_froid: 3,
  },

  // ── כרפור ────────────────────────────────────────────────────────────
  {
    titre: 'יין כרפור Selection 750 מ"ל ב-₪29 — Carrefour',
    description: 'יין כרפור Selection Rouge/Blanc 750 מ"ל ב-₪29. יין איכותי במחיר נמוך.',
    prix: 2900, prix_original: 4900, magasin: 'כרפור', ville: 'תל אביב',
    categorie: 'Food', url_source: 'https://www.carrefour.co.il',
    image_url: IMG.wine,
    auteur_nom: 'DilzBot', statut: 'actif', votes_chaud: 20, votes_froid: 2,
  },
  {
    titre: 'עגבניות שרי 500 גר\' ב-₪5.90 — Carrefour',
    description: 'עגבניות שרי טריות 500 גר\' ב-₪5.90 בלבד. מחיר שבועי.',
    prix: 590, prix_original: 990, magasin: 'כרפור', ville: 'חיפה',
    categorie: 'Food', url_source: 'https://www.carrefour.co.il',
    image_url: IMG.veggies,
    auteur_nom: 'DilzBot', statut: 'actif', votes_chaud: 18, votes_froid: 1,
  },
  {
    titre: 'פילה סלמון טרי 200 גר\' ב-₪24.90 — Carrefour',
    description: 'פילה סלמון אטלנטי טרי 200 גר\' ב-₪24.90. מחיר מיוחד לחברי מועדון.',
    prix: 2490, prix_original: 3990, magasin: 'כרפור', ville: 'תל אביב',
    categorie: 'Food', url_source: 'https://www.carrefour.co.il',
    image_url: IMG.fish,
    auteur_nom: 'DilzBot', statut: 'actif', votes_chaud: 23, votes_froid: 2,
  },
  {
    titre: 'יוגורט Carrefour 4 יח\' 1+1 חינם',
    description: 'יוגורט Carrefour 4×125 גר\' — 1+1 חינם. כל הטעמים.',
    prix: 990, prix_original: 1980, magasin: 'כרפור', ville: 'ראשון לציון',
    categorie: 'Food', url_source: 'https://www.carrefour.co.il',
    image_url: IMG.cheese,
    auteur_nom: 'DilzBot', statut: 'actif', votes_chaud: 14, votes_froid: 1,
  },

  // ── Activities / Food / Online ────────────────────────────────────────
  {
    titre: 'כרטיס קולנוע Yes Planet יום ג\' ב-₪30',
    description: 'כרטיסי קולנוע Yes Planet ביום שלישי — ₪29.90. כולל IMAX.',
    prix: 30, prix_original: 55, magasin: 'Yes Planet', ville: 'תל אביב',
    categorie: 'Activities', url_source: 'https://www.yesplanet.co.il',
    image_url: IMG.cinema,
    auteur_nom: 'DilzBot', statut: 'actif', votes_chaud: 31, votes_froid: 3,
  },
  {
    titre: '2 חודשי HOT Mobile ב-₪1 — 100GB',
    description: '2 חודשים ב-₪1 עם 100GB + שיחות בלתי מוגבלות. למצטרפים חדשים.',
    prix: 1, prix_original: 90, magasin: 'HOT Mobile', ville: 'הרצליה',
    categorie: 'Online', url_source: 'https://www.hot.net.il/he/mobile',
    image_url: IMG.phone,
    auteur_nom: 'DilzBot', statut: 'actif', votes_chaud: 44, votes_froid: 5,
  },
  {
    titre: 'קוד WOLT30 — 30% על הזמנה ראשונה ב-Wolt',
    description: 'קוד WOLT30 — 30% הנחה על הזמנה ראשונה. עד ₪50 הנחה. כל המסעדות.',
    prix: 0, prix_original: 50, magasin: 'Wolt', ville: 'תל אביב',
    categorie: 'Food', url_source: 'https://wolt.com/he/isr',
    image_url: IMG.delivery,
    auteur_nom: 'DilzBot', statut: 'actif', votes_chaud: 55, votes_froid: 8,
  },
  {
    titre: "פיצה L כל טעם ב-₪49 — Domino's",
    description: 'פיצה L כל טעם ב-₪49! הזמנה אונליין בלבד. תקף בכל הסניפים.',
    prix: 49, prix_original: 79, magasin: "Domino's", ville: 'ירושלים',
    categorie: 'Food', url_source: 'https://www.dominos.co.il',
    image_url: IMG.pizza,
    auteur_nom: 'DilzBot', statut: 'actif', votes_chaud: 38, votes_froid: 4,
  },
  {
    titre: "מנה ב-₪1 לחברי מועדון McDonald's",
    description: "חברי מועדון מקדולנד'ס — מנה ב-₪1 בכל יום. הורידו את האפליקציה.",
    prix: 1, prix_original: 25, magasin: "McDonald's", ville: 'חיפה',
    categorie: 'Food', url_source: 'https://www.mcdonalds.co.il',
    image_url: IMG.burger,
    auteur_nom: 'DilzBot', statut: 'actif', votes_chaud: 29, votes_froid: 6,
  },
];

async function main() {
  const { error: delErr } = await supabase
    .from('bons_plans')
    .delete()
    .eq('auteur_nom', 'DilzBot');
  if (delErr) { console.error('Delete error:', delErr.message); process.exit(1); }
  console.log('Deleted old DilzBot deals');

  let total = 0;
  for (let i = 0; i < deals.length; i += 10) {
    const batch = deals.slice(i, i + 10);
    const { data, error } = await supabase.from('bons_plans').insert(batch).select();
    if (error) { console.error(`Insert error (batch ${Math.floor(i / 10) + 1}):`, error.message); process.exit(1); }
    total += data.length;
    console.log(`  batch ${Math.floor(i / 10) + 1}: +${data.length} deals`);
  }
  console.log(`✓ Inserted ${total} deals with images and URLs`);
  process.exit(0);
}

main();

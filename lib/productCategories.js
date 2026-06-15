const PRODUCT_CATEGORIES = [
  'fruits_vegetables',
  'beverages',
  'dairy_eggs',
  'meat_fish',
  'bakery',
  'pantry',
  'snacks_sweets',
  'frozen',
  'household',
  'personal_care',
  'baby',
  'pharmacy',
  'other',
];

const CATEGORY_LABELS = {
  en: {
    all: 'All categories',
    fruits_vegetables: 'Fruit & vegetables',
    beverages: 'Drinks',
    dairy_eggs: 'Dairy & eggs',
    meat_fish: 'Meat & fish',
    bakery: 'Bakery',
    pantry: 'Pantry',
    snacks_sweets: 'Snacks & sweets',
    frozen: 'Frozen',
    household: 'Household',
    personal_care: 'Personal care',
    baby: 'Baby',
    pharmacy: 'Pharmacy',
    other: 'Other',
  },
  he: {
    all: 'כל הקטגוריות',
    fruits_vegetables: 'פירות וירקות',
    beverages: 'משקאות',
    dairy_eggs: 'חלב וביצים',
    meat_fish: 'בשר ודגים',
    bakery: 'מאפים ולחמים',
    pantry: 'מזווה ובישול',
    snacks_sweets: 'חטיפים ומתוקים',
    frozen: 'קפואים',
    household: 'ניקיון ובית',
    personal_care: 'טיפוח אישי',
    baby: 'תינוקות',
    pharmacy: 'פארם ובריאות',
    other: 'אחר',
  },
};

const RULES = [
  ['baby', /\b(baby|diaper|formula|baby wipes)\b|תינוק|חיתול|מטרנה|סימילאק|האגיס|בייביסיטר/i],
  ['pharmacy', /\b(vitamin|medicine|pharmacy|bandage|pain relief|supplement)\b|ויטמין|תרופ|פלסטר|אקמול|אדוויל|פארם|אומגה\s*3/i],
  ['personal_care', /\b(shampoo|soap|deodorant|toothpaste|conditioner|tampon|sanitary pad|moisturizer|sunscreen)\b|שמפו|סבון|דאודורנט|שיניים|מרכך|קרם לחות|תחליב רחצה|תחליב הגנה|מסכת קרטין|תחבושות|טמפונ|מניקור|שיוף הרגל/i],
  ['household', /\b(cleaner|detergent|laundry|toilet paper|paper towel|trash bag|air freshener|dishwasher|napkin|tablecloth|plate)\b|ניקוי|כביסה|נייר טואלט|טואלט|מגבות נייר|שקיות אשפה|כלים חד פעמיים|קפסולות למדיח|פיירי|קוטל מעופפים|מבשם|מטהר אויר|מפיות|מפת שולחן|מפה פירנצה|צלחת|צלחות|קערית|תבניות/i],
  ['frozen', /\b(frozen|ice cream|popsicle)\b|קפוא|קפואה|גלידה|קרטיב|טילון/i],
  ['beverages', /\b(drink|water|cola|juice|coffee|tea|beer|wine|soda)\b|משקה|מים|קולה|מיץ|קפה|תה|בירה|יין|סודה/i],
  ['fruits_vegetables', /\b(fruit|vegetable|apple|banana|tomato|cucumber|orange|lemon|potato|pear|plum|peach|nectarine|pineapple|kiwi|cabbage|pepper|lettuce|celery|mushroom|blueberry)\b|פרי|ירק|תפוח|בננה|עגבנ|מלפפון|אבטיח|לימון|תפוז|בצל|אבוקדו|אגס|שזיף|אפרסק|נקטרינה|אננס טרי|קיווי|כרוב|פלפל|חסה|סלרי|שמיר|רוקט|שום ארוז|חציל|אוכמניות|דומדמניות|אפרסמון|שמפניון|לפת/i],
  ['dairy_eggs', /\b(milk|cheese|yogurt|butter|cream|egg|mozzarella|parmesan|gouda|roquefort)\b|חלב|גבינ|גב\.|יוגורט|קוטג|חמאה|שמנת|ביצים|מעדן|עמק|רוקפור|מוצרלה|בולגרית|פרמז|גאודה|צפתית|פטינה/i],
  ['meat_fish', /\b(meat|chicken|turkey|fish|salmon|tuna|sausage|steak|roast|fillet|schnitzel|lamb|veal|salami|asado)\b|בשר|עוף|הודו|דג|סלמון|טונה|נקניק|סטייק|צלי|פילה|שניצל|כבש|עגל|סלמי|אסאדו|צלעות|שייטל|סינטה|אנטריקוט|גולש|קרפציו/i],
  ['bakery', /\b(bread|pita|roll|cake|pastry|donut|baguette)\b|לחם|פיתה|לחמני|מאפה|עוגה|עוגת|דונאטס|בגט|פרנה|שבלול עם צימוקים/i],
  ['snacks_sweets', /\b(snack|chocolate|candy|cookie|biscuit|wafer|pretzel|granola)\b|חטיף|שוקולד|ממתק|עוגי|ביסקוויט|וופל|ופל|בייגלה|גרנולה|כריות|קליק|קרמוגית|פסק זמן|פררו|גריסיני|אפרופו|ביסלי/i],
  ['pantry', /\b(rice|pasta|flour|sugar|oil|sauce|canned|spice|salt|noodle|beans|chickpea|tahini|yeast|mustard|honey)\b|אורז|פסטה|קמח|סוכר|שמן|רוטב|שימורים|תבלין|מלח|אטריות|נודלס|שעועית|חומוס|טחינה|שמרים|חרדל|דבש|כורכום|פלפל שחור|ציפורן טחון|אפונה|גרעיני|ממרח|טפנד|תרכיז|מצות|מצה|אצות|סלט /i],
];

function inferProductCategory(name) {
  const value = String(name || '').trim();
  if (!value) return 'other';
  return RULES.find(([, pattern]) => pattern.test(value))?.[0] || 'other';
}

function getProductCategoryLabel(category, lang = 'en') {
  return CATEGORY_LABELS[lang]?.[category] || CATEGORY_LABELS.en[category] || category;
}

module.exports = {
  CATEGORY_LABELS,
  PRODUCT_CATEGORIES,
  getProductCategoryLabel,
  inferProductCategory,
};

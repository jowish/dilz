const DEAL_CATEGORIES = [
  'Food',
  'Supermarket',
  'Restaurants',
  'Tech',
  'Home',
  'Beauty',
  'Health',
  'Baby',
  'Fashion',
  'Sports',
  'Travel',
  'Activities',
  'Services',
  'Online',
];

const DEAL_CATEGORY_LABELS = {
  en: {
    Food: 'Food',
    Supermarket: 'Supermarket',
    Restaurants: 'Restaurants',
    Tech: 'Tech',
    Home: 'Home',
    Beauty: 'Beauty',
    Health: 'Health',
    Baby: 'Baby',
    Fashion: 'Fashion',
    Sports: 'Sports',
    Travel: 'Travel',
    Activities: 'Activities',
    Services: 'Services',
    Online: 'Online',
  },
  he: {
    Food: 'מזון',
    Supermarket: 'סופרמרקט',
    Restaurants: 'מסעדות',
    Tech: 'טכנולוגיה',
    Home: 'בית',
    Beauty: 'טיפוח',
    Health: 'בריאות',
    Baby: 'תינוקות',
    Fashion: 'אופנה',
    Sports: 'ספורט',
    Travel: 'נסיעות',
    Activities: 'פעילויות',
    Services: 'שירותים',
    Online: 'אונליין',
  },
};

function getDealCategoryLabel(category, lang = 'en') {
  return DEAL_CATEGORY_LABELS[lang]?.[category] || DEAL_CATEGORY_LABELS.en[category] || category;
}

module.exports = {
  DEAL_CATEGORIES,
  DEAL_CATEGORY_LABELS,
  getDealCategoryLabel,
};

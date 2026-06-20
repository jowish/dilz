export const ISRAEL_CITIES = [
  ['תל אביב', 'Tel Aviv', 32.0853, 34.7818], ['ירושלים', 'Jerusalem', 31.7683, 35.2137],
  ['חיפה', 'Haifa', 32.794, 34.9896], ['ראשון לציון', 'Rishon LeZion', 31.973, 34.7925],
  ['פתח תקווה', 'Petah Tikva', 32.0878, 34.8878], ['אשדוד', 'Ashdod', 31.7918, 34.6495],
  ['נתניה', 'Netanya', 32.3226, 34.8533], ['באר שבע', 'Beersheba', 31.2518, 34.7913],
  ['בני ברק', 'Bnei Brak', 32.0804, 34.8338], ['חולון', 'Holon', 32.0114, 34.7794],
  ['רמת גן', 'Ramat Gan', 32.0821, 34.8137], ['אשקלון', 'Ashkelon', 31.6688, 34.5743],
  ['רחובות', 'Rehovot', 31.8928, 34.8113], ['בת ים', 'Bat Yam', 32.0204, 34.7508],
  ['בית שמש', 'Beit Shemesh', 31.7469, 34.9885], ['כפר סבא', 'Kfar Saba', 32.1786, 34.9078],
  ['הרצליה', 'Herzliya', 32.1652, 34.844], ['חדרה', 'Hadera', 32.434, 34.9196],
  ['מודיעין', 'Modiin', 31.8979, 35.01], ['נצרת', 'Nazareth', 32.6996, 35.3034],
  ['לוד', 'Lod', 31.9519, 34.8893], ['רמלה', 'Ramla', 31.9283, 34.8635],
  ['רעננה', 'Raanana', 32.1836, 34.8711], ['רהט', 'Rahat', 31.3925, 34.7544],
  ['הוד השרון', 'Hod Hasharon', 32.1504, 34.8885], ['גבעתיים', 'Givatayim', 32.0704, 34.8118],
  ['קריית אתא', 'Kiryat Ata', 32.8051, 35.1064], ['נהריה', 'Nahariya', 33.0073, 35.0987],
  ['אילת', 'Eilat', 29.5577, 34.9519], ['עכו', 'Acre', 32.9225, 35.0779],
  ['טבריה', 'Tiberias', 32.7956, 35.531], ['עפולה', 'Afula', 32.6078, 35.2897],
  ['כרמיאל', 'Karmiel', 32.9146, 35.2962], ['קריית גת', 'Kiryat Gat', 31.6095, 34.7748],
  ['ראש העין', 'Rosh HaAyin', 32.0969, 34.9566], ['נס ציונה', 'Ness Ziona', 31.9293, 34.7987],
  ['יבנה', 'Yavne', 31.8786, 34.7394], ['קריית מוצקין', 'Kiryat Motzkin', 32.8386, 35.0795],
  ['קריית ביאליק', 'Kiryat Bialik', 32.8336, 35.0853], ['קריית ים', 'Kiryat Yam', 32.8495, 35.0703],
  ['מעלה אדומים', 'Maale Adumim', 31.7772, 35.298], ['צפת', 'Safed', 32.9646, 35.4966],
  ['דימונה', 'Dimona', 31.0638, 35.0278], ['שדרות', 'Sderot', 31.525, 34.5969],
  ['נתיבות', 'Netivot', 31.4232, 34.589], ['אופקים', 'Ofakim', 31.312, 34.6221],
  ['ערד', 'Arad', 31.2589, 35.2128], ['אור יהודה', 'Or Yehuda', 32.0267, 34.8569],
  ['יהוד', 'Yehud', 32.0326, 34.8881], ['גבעת שמואל', 'Givat Shmuel', 32.078, 34.8484],
  ['קריית אונו', 'Kiryat Ono', 32.0639, 34.8556], ['טירת כרמל', 'Tirat Carmel', 32.7602, 34.973],
  ['נשר', 'Nesher', 32.7661, 35.0498], ['מגדל העמק', 'Migdal HaEmek', 32.6751, 35.2395],
  ['נוף הגליל', 'Nof HaGalil', 32.7069, 35.324], ['אום אל-פחם', 'Umm al-Fahm', 32.5194, 35.1535],
  ['סכנין', 'Sakhnin', 32.8642, 35.2971], ['טמרה', 'Tamra', 32.853, 35.1987],
  ['כפר קאסם', 'Kafr Qasim', 32.114, 34.975], ['טייבה', 'Tayibe', 32.2668, 35.0082],
  ['טירה', 'Tira', 32.2341, 34.9502], ['חריש', 'Harish', 32.4616, 35.0436],
  ['זכרון יעקב', 'Zikhron Yaakov', 32.5713, 34.9515], ['פרדס חנה-כרכור', 'Pardes Hanna-Karkur', 32.4741, 34.9762],
  ['מבשרת ציון', 'Mevaseret Zion', 31.8021, 35.1517], ['אריאל', 'Ariel', 32.1065, 35.1845],
].map(([value, en, lat, lon]) => ({ value, en, he: value, lat, lon }));

export const CITY_COORDINATES = Object.fromEntries(
  ISRAEL_CITIES.map(({ value, lat, lon }) => [value, { lat, lon }])
);

export function cityDisplayName(city, lang = 'en') {
  const match = ISRAEL_CITIES.find((item) => item.value === city || item.en === city);
  if (match) return match[lang === 'he' ? 'he' : 'en'];
  if (lang === 'he') {
    const translated = Object.entries(villesTraduction).find(([, english]) => english === city);
    return translated?.[0] || city;
  }
  return villesTraduction[city] || city;
}

export function getCityCoordinates(city) {
  const match = ISRAEL_CITIES.find((item) => item.value === city || item.en === city);
  return match ? { lat: match.lat, lon: match.lon } : null;
}

export function mergeCities(values = []) {
  const known = new Set(ISRAEL_CITIES.map((item) => item.value));
  const extras = [...new Set(values.filter(Boolean).filter((value) => !known.has(value)))]
    .map((value) => ({ value, en: villesTraduction[value] || value, he: value, lat: null, lon: null }));
  return [...ISRAEL_CITIES, ...extras];
}

export function localizedCityOptions(values = [], lang = 'en') {
  const locale = lang === 'he' ? 'he' : 'en';
  return mergeCities(values)
    .map((city) => ({ ...city, label: lang === 'he' ? city.he : city.en }))
    .sort((a, b) => a.label.localeCompare(b.label, locale, { sensitivity: 'base' }));
}

export function cityInitials(cities = [], lang = 'en') {
  const locale = lang === 'he' ? 'he' : 'en';
  return [...new Set(cities.map((city) => city.label.trim().charAt(0).toLocaleUpperCase(locale)).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, locale));
}

export function filterCityOptions(cities = [], { search = '', letter = '', lang = 'en' } = {}) {
  const locale = lang === 'he' ? 'he' : 'en';
  const query = search.trim().toLocaleLowerCase(locale);
  const initial = letter.toLocaleUpperCase(locale);
  return cities.filter((city) => {
    const label = city.label || (lang === 'he' ? city.he : city.en) || city.value;
    const matchesLetter = !initial || label.trim().charAt(0).toLocaleUpperCase(locale) === initial;
    const haystack = [label, city.en, city.he, city.value].filter(Boolean).join(' ').toLocaleLowerCase(locale);
    return matchesLetter && (!query || haystack.includes(query));
  });
}
import { villesTraduction } from './translations.js';

import { useState, useCallback, useEffect, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTheme } from 'next-themes';
import { translations, traduireVille } from '../lib/translations';
import { supabase } from '../lib/supabase';
import { AppHeader } from '../components/layout/AppHeader';
import { MainMenuSheet } from '../components/ui/MainMenuSheet';
import { DealCard as PremiumDealCard } from '../components/deals/DealCard';
import { PromoCard } from '../components/deals/PromoCard';
import { PromoModal } from '../components/deals/PromoModal';
import { CityModal } from '../components/ui/CityModal';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { SectionHeader } from '../components/ui/SectionHeader';
import { readDealLayoutPreference, readDealSortPreference, readSessionDealSort, writeDealLayoutPreference, writeSessionDealSort } from '../lib/userPreferences';
import { dealViewState, resolveDealLayout, resolveDealSort, sortDealsForView } from '../lib/navigationState';

const { PRODUCT_CATEGORIES, getProductCategoryLabel } = require('../lib/productCategories');
const { DEAL_CATEGORIES, getDealCategoryLabel } = require('../lib/dealCategories');

// ─── Design tokens ────────────────────────────────────────────────────────────
const ACCENT = '#E2552D';

const LANG_OPTIONS = [
  { id: 'en', label: 'EN' },
  { id: 'he', label: 'עב' },
];

const STORE_COLORS = {
  'שופרסל':  { color: '#2563EB', bg: '#EFF6FF', dark: '#1A2744', nameEn: 'Shufersal' },
  'רמי לוי': { color: '#DC2626', bg: '#FEF2F2', dark: '#3D1212', nameEn: 'Rami Levy' },
  'ויקטורי': { color: '#7C3AED', bg: '#F5F3FF', dark: '#2A1845', nameEn: 'Victory' },
  'יוחננוף': { color: '#059669', bg: '#ECFDF5', dark: '#0F3025', nameEn: 'Yohananof' },
  'אושר עד': { color: '#D97706', bg: '#FFFBEB', dark: '#3B2500', nameEn: 'Osher Ad' },
  'כרפור':   { color: '#0284C7', bg: '#F0F9FF', dark: '#0C2336', nameEn: 'Carrefour' },
};

STORE_COLORS.BE = { color: '#E2552D', bg: '#F0FDFA', dark: '#12322F', nameEn: 'BE' };
STORE_COLORS['Super-Pharm'] = { color: '#E11D48', bg: '#FFF1F2', dark: '#3B111B', nameEn: 'Super-Pharm' };
STORE_COLORS['Good Pharm'] = { color: '#16A34A', bg: '#F0FDF4', dark: '#12351F', nameEn: 'Good Pharm' };

const STORE_FILTERS = [
  { id: 'all' },
  { id: 'שופרסל', nameEn: 'Shufersal' },
  { id: 'רמי לוי', nameEn: 'Rami Levy' },
  { id: 'ויקטורי', nameEn: 'Victory' },
  { id: 'יוחננוף', nameEn: 'Yohananof' },
  { id: 'אושר עד', nameEn: 'Osher Ad' },
  { id: 'כרפור',   nameEn: 'Carrefour' },
];

STORE_FILTERS.push({ id: 'BE', nameEn: 'BE' });
STORE_FILTERS.push({ id: 'Super-Pharm', nameEn: 'Super-Pharm' });
STORE_FILTERS.push({ id: 'Good Pharm', nameEn: 'Good Pharm' });

const CATEGORIES = ['all', ...DEAL_CATEGORIES];

const TAB_TO_URL = {
  deals: 'dilz',
  search: 'search',
  profile: 'profile',
};

const URL_TO_TAB = {
  dilz: 'deals',
  deals: 'deals',
  search: 'search',
  profile: 'profile',
};

const PROMO_SORTS = ['discount', 'liked', 'recent', 'price_asc'];
const DEAL_SORTS = ['hot', 'latest', 'nearby', 'ending', 'comments'];
const DEAL_COLLECTIONS = ['all', 'codes', 'free', 'active'];
const URL_ACTIONS = ['menu', 'post_deal', 'city', 'alerts', 'view_promo'];
const CATEGORY_ICONS = Object.fromEntries(CATEGORIES.map((category) => [category, '']));
const DEAL_PAGE_SIZE = 25;
const PRIMARY_DEAL_FILTERS = ['latest', 'all', 'comments'];

const POPULAR_CITIES = ['תל אביב', 'ירושלים', 'חיפה', 'ראשון לציון', 'נתניה', 'רעננה', 'הרצליה', 'כפר סבא', 'רמת גן', 'פתח תקווה'];

const CITY_COORDS = {
  'תל אביב':      { lat: 32.0853, lon: 34.7818 },
  'ירושלים':      { lat: 31.7683, lon: 35.2137 },
  'חיפה':         { lat: 32.7940, lon: 34.9896 },
  'באר שבע':      { lat: 31.2518, lon: 34.7913 },
  'אילת':         { lat: 29.5577, lon: 34.9519 },
  'נתניה':        { lat: 32.3226, lon: 34.8533 },
  'ראשון לציון':  { lat: 31.9730, lon: 34.7925 },
  'פתח תקווה':    { lat: 32.0878, lon: 34.8878 },
  'אשדוד':        { lat: 31.7918, lon: 34.6495 },
  'אשקלון':       { lat: 31.6688, lon: 34.5743 },
  'הרצליה':       { lat: 32.1652, lon: 34.8440 },
  'כפר סבא':      { lat: 32.1786, lon: 34.9078 },
  'רמת גן':       { lat: 32.0821, lon: 34.8137 },
  'בני ברק':      { lat: 32.0804, lon: 34.8338 },
  'חולון':        { lat: 32.0114, lon: 34.7794 },
  'בת ים':        { lat: 32.0204, lon: 34.7508 },
  'נהריה':        { lat: 33.0073, lon: 35.0987 },
  'עכו':          { lat: 32.9225, lon: 35.0779 },
  'טבריה':        { lat: 32.7956, lon: 35.5310 },
  'צפת':          { lat: 32.9646, lon: 35.4966 },
  'נצרת':         { lat: 32.6996, lon: 35.3034 },
  'רחובות':       { lat: 31.8928, lon: 34.8113 },
  'מודיעין':      { lat: 31.8979, lon: 35.0100 },
  'לוד':          { lat: 31.9519, lon: 34.8893 },
  'רמלה':         { lat: 31.9283, lon: 34.8635 },
  'קריית גת':     { lat: 31.6095, lon: 34.7748 },
  'דימונה':       { lat: 31.0638, lon: 35.0278 },
  'אופקים':       { lat: 31.3120, lon: 34.6221 },
  'עפולה':        { lat: 32.6078, lon: 35.2897 },
  'כרמיאל':       { lat: 32.9146, lon: 35.2962 },
  'ראש העין':     { lat: 32.0969, lon: 34.9566 },
  'רעננה':        { lat: 32.1836, lon: 34.8711 },
  'יהוד':         { lat: 32.0326, lon: 34.8881 },
  'גבעתיים':      { lat: 32.0704, lon: 34.8118 },
  'אור יהודה':    { lat: 32.0267, lon: 34.8569 },
  'קריית אונו':   { lat: 32.0639, lon: 34.8556 },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function textFor(lang, values) {
  return values[lang] || values.en;
}

function languageUsesEnglishProductNames(lang) {
  return lang !== 'he';
}

function isPrimaryDealFilterActive(id, { sortDeals, categoryFilter, myDealsOnly, dealCollection }) {
  if (myDealsOnly || categoryFilter !== 'all') return false;
  if (id === 'active') return dealCollection === 'active';
  if (dealCollection !== 'all') return false;
  if (id === 'all') return sortDeals === 'hot';
  return sortDeals === id;
}

function selectedOtherDealFilter({ sortDeals, categoryFilter, myDealsOnly, dealCollection }) {
  if (myDealsOnly) return 'mine';
  if (dealCollection === 'active') return 'active';
  if (categoryFilter !== 'all') return categoryFilter;
  if (PRIMARY_DEAL_FILTERS.includes(sortDeals)) return '';
  return sortDeals || '';
}

function ViewSettingsIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z" />
      <path d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.04.04a2.1 2.1 0 0 1-2.97 2.97l-.04-.04a1.8 1.8 0 0 0-1.98-.36 1.8 1.8 0 0 0-1.09 1.65V21a2.1 2.1 0 0 1-4.2 0v-.06a1.8 1.8 0 0 0-1.09-1.65 1.8 1.8 0 0 0-1.98.36l-.04.04a2.1 2.1 0 0 1-2.97-2.97l.04-.04A1.8 1.8 0 0 0 4.6 15a1.8 1.8 0 0 0-1.65-1.09H3a2.1 2.1 0 0 1 0-4.2h.06A1.8 1.8 0 0 0 4.7 8.62a1.8 1.8 0 0 0-.36-1.98l-.04-.04A2.1 2.1 0 0 1 7.27 3.6l.04.04a1.8 1.8 0 0 0 1.98.36A1.8 1.8 0 0 0 10.38 2.35V2a2.1 2.1 0 0 1 4.2 0v.35a1.8 1.8 0 0 0 1.09 1.65 1.8 1.8 0 0 0 1.98-.36l.04-.04a2.1 2.1 0 0 1 2.97 2.97l-.04.04a1.8 1.8 0 0 0-.36 1.98 1.8 1.8 0 0 0 1.65 1.09H22a2.1 2.1 0 0 1 0 4.2h-.06A1.8 1.8 0 0 0 19.4 15Z" />
    </svg>
  );
}

function dealIsExpired(deal) {
  const match = String(deal?.date_fin || '').match(/^(\d{4}-\d{2}-\d{2})(?:$|[T\s])/);
  return Boolean(match && match[1] < new Date().toISOString().slice(0, 10));
}

function parseDateOnly(value) {
  const match = String(value || '').match(/^(\d{4}-\d{2}-\d{2})(?:$|[T\s])/);
  if (!match) return null;
  const [year, month, day] = match[1].split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatDateOnly(value, lang) {
  const date = parseDateOnly(value);
  if (!date) return '';
  const locale = lang === 'he' ? 'he-IL' : lang === 'fr' ? 'fr-FR' : lang === 'es' ? 'es-ES' : 'en-GB';
  return date.toLocaleDateString(locale, { day: '2-digit', month: 'short' });
}

function productImageSrc(image) {
  if (!image) return null;
  try {
    const url = new URL(image);
    if (url.hostname === 'rami-levy.co.il' || url.hostname.endsWith('.rami-levy.co.il')) {
      return `/api/image?url=${encodeURIComponent(url.toString())}`;
    }
  } catch {}
  return image;
}

function queryParamsFromPath(asPath) {
  const queryString = String(asPath || '').split('?')[1]?.split('#')[0] || '';
  return new URLSearchParams(queryString);
}

function isValidStoreFilter(value) {
  return STORE_FILTERS.some(store => store.id === value);
}

function isValidProductCategory(value) {
  return value === 'all' || PRODUCT_CATEGORIES.includes(value);
}

function isValidDealCategory(value) {
  return CATEGORIES.includes(value);
}

function readHomeStateFromUrl(asPath, preferredSort = 'hot', savedLayout = 'card', sessionSort = null) {
  const params = queryParamsFromPath(asPath);
  const tab = URL_TO_TAB[params.get('tab')] || 'deals';

  const promoStore = params.get('store');
  const promoCategory = params.get('category');
  const promoSort = params.get('sort');

  const dealCategory = params.get('category');
  const dealSort = params.get('sort');
  const dealLayout = params.get('layout');
  const requestedCollection = params.get('collection');
  const dealCollection = DEAL_COLLECTIONS.includes(requestedCollection) ? requestedCollection : 'all';
  const mine = params.get('mine') === '1';
  const action = params.get('action');
  const selectedPromoBarcode = params.get('promo') || null;
  const normalizedAction = URL_ACTIONS.includes(action)
    ? action
    : selectedPromoBarcode
      ? 'view_promo'
      : null;

  return {
    tab,
    city: params.get('city') || null,
    searchQuery: params.get('q') || '',
    storeFilter: isValidStoreFilter(promoStore) ? promoStore : 'all',
    promoCategory: isValidProductCategory(promoCategory) ? promoCategory : 'all',
    promoSort: PROMO_SORTS.includes(promoSort) ? promoSort : 'discount',
    showPromoFilters: params.get('filters') === '1',
    categoryFilter: mine ? 'all' : (isValidDealCategory(dealCategory) ? dealCategory : 'all'),
    sortDeals: resolveDealSort({ requestedSort: dealSort, sessionSort, preferredSort }),
    myDealsOnly: mine,
    dealLayout: resolveDealLayout({ requestedLayout: dealLayout, savedLayout }),
    dealCollection,
    action: normalizedAction,
    selectedPromoBarcode,
  };
}

function buildHomeUrl({
  tab,
  storeFilter,
  promoCategory,
  promoSort,
  showPromoFilters,
  categoryFilter,
  sortDeals,
  myDealsOnly,
  dealLayout,
  dealCollection,
  city,
  searchQuery,
  action,
  selectedPromoBarcode,
}) {
  const params = new URLSearchParams();
  if (tab !== 'deals') params.set('tab', TAB_TO_URL[tab] || tab);
  if (city) params.set('city', city);
  if (tab === 'search' && searchQuery.trim()) params.set('q', searchQuery.trim());

  if (tab === 'sales') {
    if (storeFilter !== 'all') params.set('store', storeFilter);
    if (promoCategory !== 'all') params.set('category', promoCategory);
    if (promoSort !== 'discount') params.set('sort', promoSort);
    if (showPromoFilters) params.set('filters', '1');
  }

  if (tab === 'deals') {
    if (dealCollection !== 'all') params.set('collection', dealCollection);
    if (myDealsOnly) {
      params.set('mine', '1');
    } else if (categoryFilter !== 'all') {
      params.set('category', categoryFilter);
    }
    params.set('sort', sortDeals);
    if (dealLayout !== 'card') params.set('layout', dealLayout);
  }

  if (action) params.set('action', action);
  if (selectedPromoBarcode) params.set('promo', selectedPromoBarcode);

  const qs = params.toString();
  return qs ? `/?${qs}` : '/';
}

function timeAgo(date, lang) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 2) return textFor(lang, { en: 'Just now', he: 'זה עתה', fr: 'A l’instant', es: 'Ahora' });
  if (m < 60) return textFor(lang, { en: `${m}m ago`, he: `${m}ד'`, fr: `Il y a ${m} min`, es: `Hace ${m} min` });
  if (h < 24) return textFor(lang, { en: `${h}h ago`, he: `${h}ש'`, fr: `Il y a ${h} h`, es: `Hace ${h} h` });
  return textFor(lang, { en: `${d}d ago`, he: `${d} ימים`, fr: `Il y a ${d} j`, es: `Hace ${d} d` });
}

function dealDateStatus(deal, lang) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = parseDateOnly(deal.date_debut);
  const end = parseDateOnly(deal.date_fin);

  if (start && start > today) {
    return {
      label: textFor(lang, {
        en: `Starts ${start.toLocaleDateString('en-GB')}`,
        he: `מתחיל ב-${start.toLocaleDateString('he-IL')}`,
        fr: `Commence le ${start.toLocaleDateString('fr-FR')}`,
        es: `Empieza el ${start.toLocaleDateString('es-ES')}`,
      }),
      tone: '#2563EB',
    };
  }
  if (end) {
    if (end < today) {
      return { label: textFor(lang, { en: 'Expired', he: 'הסתיים', fr: 'Expire', es: 'Expirada' }), tone: '#64748B' };
    }
    const days = Math.round((end.getTime() - today.getTime()) / 86400000);
    return {
      label: days === 0
        ? textFor(lang, { en: 'Ends today', he: 'מסתיים היום', fr: 'Expire aujourd’hui', es: 'Termina hoy' })
        : textFor(lang, { en: `${days} days left`, he: `עוד ${days} ימים`, fr: `${days} jours restants`, es: `Quedan ${days} dias` }),
      tone: days <= 2 ? '#DC2626' : '#059669',
    };
  }
  return null;
}

function matchSearch(text, q) {
  if (!q || !text) return !q;
  return text.toLowerCase().includes(q.toLowerCase());
}

function computeVoteDeltas(current, next) {
  if (current === next) {
    return { chaud_delta: next === 'chaud' ? -1 : 0, froid_delta: next === 'froid' ? -1 : 0, newVote: null };
  }
  const d = { chaud_delta: 0, froid_delta: 0 };
  if (current === 'chaud') d.chaud_delta -= 1;
  if (current === 'froid') d.froid_delta -= 1;
  if (next === 'chaud') d.chaud_delta += 1;
  if (next === 'froid') d.froid_delta += 1;
  return { ...d, newVote: next };
}

// ─── SearchTab ────────────────────────────────────────────────────────────────
function SearchTab({ promos, deals, lang, isDark, onPromoClick, userCoords, promoVotes, onPromoVote, savedKeys, onToggleSave, votedDeals, onDealVote, user, searchQuery, isAdmin, onAdminDeleteDeal }) {
  const q = searchQuery || '';

  const mPromos = q.length > 1
    ? promos.filter(p => matchSearch(p.nom, q) || matchSearch(p.nom_en, q))
    : [];
  const mDeals = q.length > 1
    ? deals.filter(d => matchSearch(d.titre, q) || matchSearch(d.magasin, q) || matchSearch(d.ville, q))
    : [];

  const total = mPromos.length + mDeals.length;

  return (
    <div style={{ padding: '0 14px' }}>

      {!q && (
        <div style={{ textAlign: 'center', paddingTop: 40 }}>
          <p style={{ fontSize: 42, marginBottom: 14 }}>🔍</p>
          <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
            {textFor(lang, { en: 'Search Dilz', he: 'חיפוש בדילז', fr: 'Rechercher dans Dilz', es: 'Buscar en Dilz' })}
          </p>
          <p style={{ fontSize: 14, color: 'var(--text-sub)', lineHeight: 1.6 }}>
            {lang !== 'he'
              ? 'Try: milk, diapers, pizza\nחלב, חיתולים, פיצה'
              : 'נסה: חלב, חיתולים, פיצה'}
          </p>
        </div>
      )}

      {q.length > 0 && q.length < 2 && (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
          {lang !== 'he' ? 'Keep typing...' : 'המשך להקליד...'}
        </p>
      )}

      {q.length >= 2 && total === 0 && (
        <div style={{ textAlign: 'center', paddingTop: 40 }}>
          <p style={{ fontSize: 36, marginBottom: 12 }}>🤷</p>
          <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
            {lang !== 'he' ? 'No results for' : 'לא נמצאו תוצאות עבור'} "{q}"
          </p>
          <p style={{ fontSize: 14, color: 'var(--text-sub)', lineHeight: 1.6 }}>
            {lang !== 'he'
              ? 'Try a different spelling or search in Hebrew'
              : 'נסה איות אחר או חפש באנגלית'}
          </p>
        </div>
      )}

      {mPromos.length > 0 && (
        <>
          <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 10 }}>
            Store Promotions ({mPromos.length})
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
            {mPromos.slice(0, 6).map(p => (
              <PromoCard key={p.barcode} promo={p} lang={lang} isDark={isDark}
                onClick={() => onPromoClick(p)} votes={promoVotes[p.barcode]} onVote={onPromoVote}
                isSaved={Boolean(savedKeys[`product:${p.barcode}`])}
                onSave={() => onToggleSave('product', p.barcode)} />
            ))}
          </div>
        </>
      )}

      {mDeals.length > 0 && (
        <>
          <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 10 }}>
            Dilz ({mDeals.length})
          </p>
          <div className="dilz-search-deal-results">
          {mDeals.slice(0, 5).map(d => (
            <PremiumDealCard key={d.id} deal={d} lang={lang} isDark={isDark}
              userCoords={userCoords} votedDeal={votedDeals[d.id] || null}
              onVote={onDealVote} user={user}
              layout="list"
              isAdmin={isAdmin}
              onAdminDelete={onAdminDeleteDeal}
              isSaved={Boolean(savedKeys[`deal:${d.id}`])}
              onSave={() => onToggleSave('deal', d.id)} />
          ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── ProfileTab ───────────────────────────────────────────────────────────────
function ProfileTab({ user, lang, savedItems = [], onToggleSave, onSignOut }) {
  const [savedOpen, setSavedOpen] = useState(false);
  if (!user) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
          {textFor(lang, { en: 'Join Dilz', he: 'הצטרף לדילז', fr: 'Rejoindre Dilz', es: 'Unirse a Dilz' })}
        </p>
        <p style={{ fontSize: 14, color: 'var(--text-sub)', lineHeight: 1.7, marginBottom: 24 }}>
          {lang !== 'he'
            ? 'Sign in to post deals, vote, comment, and get alerts.'
            : 'התחבר כדי לשתף דילים, להצביע, להגיב ולקבל התראות.'}
        </p>

        {/* Benefits */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28, textAlign: 'left' }}>
          {[
            lang !== 'he' ? 'Post deals from any store' : 'פרסם דילים מכל חנות',
            lang !== 'he' ? 'Vote and surface the best deals' : 'הצבע על הדילים הטובים ביותר',
            lang !== 'he' ? 'Comment and discuss with the community' : 'הגב ודון עם הקהילה',
            lang !== 'he' ? 'Get alerts for deals that match your needs' : 'קבל התראות על דילים רלוונטיים',
          ].map((text) => (
            <div key={text} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '11px 14px', borderRadius: 10,
              background: 'var(--bg-card2)',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: ACCENT, flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{text}</span>
            </div>
          ))}
        </div>

        <Link href="/auth" style={{
          display: 'block', padding: '14px', borderRadius: 10, textDecoration: 'none',
          background: ACCENT,
          color: '#fff', fontSize: 14, fontWeight: 600,
        }}>
          {lang !== 'he' ? 'Sign in / Sign up' : 'התחבר / הרשם'}
        </Link>
      </div>
    );
  }

  const displayName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'User';
  const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || '';
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="dilz-profile-tab">
      {/* Profile card */}
      <div className="dilz-profile-card">
        <div className="dilz-profile-card__avatar">
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} />
          ) : (
            <span>{initials}</span>
          )}
        </div>
        <div className="dilz-profile-card__identity">
          <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{displayName}</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</p>
        </div>
      </div>

      {/* Quick links */}
      <div className="dilz-profile-links">
        {[
          { label: lang !== 'he' ? 'My deals' : 'הדילים שלי', href: '/profil?view=deals' },
          { label: lang !== 'he' ? 'Account settings' : 'הגדרות חשבון', href: '/profil?view=settings' },
        ].map(item => (
          <Link
            key={item.href + item.label}
            href={item.href}
            className="dilz-profile-link"
          >
            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{item.label}</span>
            <svg style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </Link>
        ))}
      </div>

      {/* Saved items */}
      <div style={{
        background: 'var(--bg-card)', borderRadius: 12,
        border: '1px solid var(--border)', padding: '14px 14px',
        marginBottom: 12,
      }}>
        <button
          type="button"
          className="dilz-saved-items-toggle"
          aria-expanded={savedOpen}
          aria-controls="profile-saved-items"
          onClick={() => setSavedOpen((current) => !current)}
        >
          <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
            {textFor(lang, { en: 'Saved items', he: 'פריטים שמורים', fr: 'Favoris', es: 'Guardados' })}
          </p>
          <span className="dilz-saved-items-toggle__meta">{savedItems.length}<ChevronIcon open={savedOpen} /></span>
        </button>

        {savedOpen && <div id="profile-saved-items" className="dilz-saved-items-content">{savedItems.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-sub)', lineHeight: 1.6 }}>
            {lang === 'he'
              ? 'שמור מוצרים או דילים כדי למצוא אותם כאן מהר.'
              : 'Save products or deals to find them here quickly.'}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {savedItems.map(item => {
              const snap = item.snapshot || {};
              const title = snap.title || item.item_id;
              const isDeal = item.item_type === 'deal';
              const content = (
                <>
                  <div style={{
                    width: 44, height: 44, borderRadius: 8, background: 'var(--bg-card2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden', flexShrink: 0,
                  }}>
                    {snap.image ? (
                      <img src={snap.image} alt="" style={{ width: '100%', height: '100%', objectFit: isDeal ? 'cover' : 'contain' }} />
                    ) : (
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700 }}>
                        {isDeal ? 'Deal' : 'Product'}
                      </span>
                    )}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{
                      fontSize: 13, fontWeight: 600, color: 'var(--text)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      marginBottom: 3,
                    }}>{title}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {[
                        isDeal ? (lang === 'he' ? 'דיל' : 'Deal') : (lang === 'he' ? 'מוצר' : 'Product'),
                        snap.store,
                        snap.price != null ? `₪${Number(snap.price).toFixed(2)}` : null,
                      ].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </>
              );

              return (
                <div key={`${item.item_type}:${item.item_id}`} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 10px', borderRadius: 10,
                  background: 'var(--bg-card2)',
                }}>
                  {isDeal ? (
                    <Link href={`/deal/${item.item_id}`} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      minWidth: 0, flex: 1, textDecoration: 'none',
                    }}>
                      {content}
                    </Link>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                      {content}
                    </div>
                  )}
                  <button
                    onClick={() => onToggleSave?.(item.item_type, item.item_id)}
                    style={{
                      padding: '6px 9px', borderRadius: 7,
                      border: '1px solid var(--border)', background: 'transparent',
                      color: 'var(--text-muted)', fontSize: 11, fontWeight: 600,
                      cursor: 'pointer', flexShrink: 0,
                    }}
                  >
                    {lang === 'he' ? 'הסר' : 'Remove'}
                  </button>
                </div>
              );
            })}
          </div>
        )}</div>}
      </div>
      <button type="button" className="dilz-profile-signout dilz-profile-signout--bottom" onClick={onSignOut}>
        {lang !== 'he' ? 'Sign out' : 'התנתקות'}
      </button>
    </div>
  );
}

function ChevronIcon({ open }) {
  return <svg className={open ? 'is-open' : ''} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>;
}

// ─── Main Home component ──────────────────────────────────────────────────────
export default function Home() {
  const { resolvedTheme } = useTheme();
  const router = useRouter();
  const syncingUrlRef = useRef(false);
  const initialUrlAppliedRef = useRef(false);
  const [mounted, setMounted] = useState(false);
  const [lang, setLang] = useState('en');

  // Tab — initialise from ?tab= so the bar shows the right tab on first paint
  // (otherwise it starts on deals then corrects, making the bubble glide through
  // deals on every navigation back to the home page).
  const [tab, setTab] = useState(() => {
    if (typeof window === 'undefined') return 'deals';
    const valid = ['deals', 'profile', 'search', 'sales'];
    const q = new URLSearchParams(window.location.search).get('tab');
    if (valid.includes(q)) return q;
    // Back-nav restore (also handled by an effect for scroll) — read it here too
    // so the first paint already shows the right tab and the nav bubble doesn't
    // start on deals and glide through it.
    const rt = sessionStorage.getItem('dilzReturnTab');
    return valid.includes(rt) ? rt : 'deals';
  });

  // Data
  const [promos, setPromos] = useState([]);
  const [loadingPromos, setLoadingPromos] = useState(true);
  const [deals, setDeals] = useState([]);
  const [dealTotal, setDealTotal] = useState(0);
  const [loadingDeals, setLoadingDeals] = useState(false);
  const [loadingMoreDeals, setLoadingMoreDeals] = useState(false);
  const [hasMoreDeals, setHasMoreDeals] = useState(false);

  // Filters
  const [storeFilter, setStoreFilter] = useState('all');
  const [promoCategory, setPromoCategory] = useState('all');
  const [promoSort, setPromoSort] = useState('discount');
  const [showPromoFilters, setShowPromoFilters] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortDeals, setSortDeals] = useState('hot');
  const [myDealsOnly, setMyDealsOnly] = useState(false);
  const [dealLayout, setDealLayout] = useState('card');
  const [dealCollection, setDealCollection] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // City
  const [ville, setVille] = useState(null);
  const [userCoords, setUserCoords] = useState(null);
  const [villes, setVilles] = useState([]);
  const [showCityModal, setShowCityModal] = useState(false);

  // Votes
  const [promoVotes, setPromoVotes] = useState({});
  const [votedDeals, setVotedDeals] = useState({});

  // Saved items
  const [savedItems, setSavedItems] = useState([]);
  const [savedKeys, setSavedKeys] = useState({});

  // Auth
  const [user, setUser] = useState(null);
  const [blockedUserIds, setBlockedUserIds] = useState([]);

  // Modals
  const [selectedPromo, setSelectedPromo] = useState(null);
  const [selectedPromoBarcode, setSelectedPromoBarcode] = useState(null);
  const [showMainMenu, setShowMainMenu] = useState(false);
  const [postSuccess, setPostSuccess] = useState(false);

  // Alerts
  const [adminToken, setAdminToken] = useState('');
  const loadMoreDealsRef = useRef(null);
  const dealListEndRef = useRef(null);
  const lastTrackedSearchRef = useRef('');

  const t = translations[lang] || translations.en;
  const dir = lang === 'he' ? 'rtl' : 'ltr';
  const isDark = resolvedTheme === 'dark';

  // ── Init ──
  useEffect(() => {
    setMounted(true);
    const initialHasDealSort = queryParamsFromPath(window.location.search).has('sort');
    let initialSessionSort = readSessionDealSort();
    try {
      const dv = localStorage.getItem('dilzDealVotes');
      if (dv) setVotedDeals(JSON.parse(dv));
      const ll = localStorage.getItem('dilzLang');
      if (ll === 'en' || ll === 'he') setLang(ll);
      else if (ll) localStorage.setItem('dilzLang', 'en');
      const savedPromoFilters = localStorage.getItem('dilzShowPromoFilters');
      if (savedPromoFilters !== null) setShowPromoFilters(savedPromoFilters === 'true');
      setDealLayout(readDealLayoutPreference());
      setAdminToken(localStorage.getItem('dilzAdminToken') || '');
      // Restore tab from back-nav
      const rt = sessionStorage.getItem('dilzReturnTab');
      if (rt) {
        setTab(rt);
        sessionStorage.removeItem('dilzReturnTab');
        const sy = sessionStorage.getItem('dilzScrollY');
        if (sy) {
          sessionStorage.removeItem('dilzScrollY');
          setTimeout(() => window.scrollTo({ top: parseInt(sy), behavior: 'instant' }), 300);
        }
      }
      // Restore sort after posting a deal (show user their new deal)
      const rs = sessionStorage.getItem('dilzReturnSort');
      if (rs) {
        setSortDeals(rs);
        initialSessionSort = writeSessionDealSort(rs);
        sessionStorage.removeItem('dilzReturnSort');
      }
    } catch {}

    fetch('/api/villes')
      .then(r => r.json())
      .then(d => setVilles(d.villes || []))
      .catch(() => {});

    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user || null;
      setUser(u);
      if (u && data.session) {
        const accountLanguage = u.user_metadata?.dilz_language;
        if (accountLanguage === 'en' || accountLanguage === 'he') {
          setLang(accountLanguage);
          try { localStorage.setItem('dilzLang', accountLanguage); } catch {}
        }
        const accountSort = u.user_metadata?.dilz_deal_sort;
        if (['hot', 'latest', 'comments'].includes(accountSort)) {
          try { localStorage.setItem('dilzDealSortPreference', accountSort); } catch {}
          if (!initialHasDealSort && !initialSessionSort) setSortDeals(accountSort);
        }
        fetch('/api/saved-items', { headers: { 'Authorization': `Bearer ${data.session.access_token}` } })
          .then(r => r.ok ? r.json() : null)
          .then(d => {
            if (!d) return;
            const items = d.saved_items || [];
            setSavedItems(items);
            setSavedKeys(Object.fromEntries(items.map(item => [`${item.item_type}:${item.item_id}`, true])));
          }).catch(() => {});
        fetch('/api/product-votes', { headers: { 'Authorization': `Bearer ${data.session.access_token}` } })
          .then(r => r.ok ? r.json() : null)
          .then(d => {
            if (!d) return;
            setPromoVotes(prev => {
              const next = { ...prev };
              for (const vote of (d.votes || [])) {
                next[vote.barcode] = { ...(next[vote.barcode] || {}), myVote: vote.type };
              }
              return next;
            });
          }).catch(() => {});
        fetch('/api/safety', { headers: { 'Authorization': `Bearer ${data.session.access_token}` } })
          .then(r => r.ok ? r.json() : null)
          .then(d => { if (d) setBlockedUserIds(d.blockedUserIds || []); })
          .catch(() => {});
      }
    });
  }, []);

  useEffect(() => {
    if (!router.isReady) return;
    const next = readHomeStateFromUrl(
      router.asPath,
      readDealSortPreference(),
      readDealLayoutPreference(),
      readSessionDealSort()
    );
    syncingUrlRef.current = true;

    setTab(next.tab);
    setStoreFilter(next.storeFilter);
    setPromoCategory(next.promoCategory);
    setPromoSort(next.promoSort);
    setShowPromoFilters(next.showPromoFilters);
    setCategoryFilter(next.categoryFilter);
    setSortDeals(next.sortDeals);
    if (next.tab === 'deals') writeSessionDealSort(next.sortDeals);
    setMyDealsOnly(next.myDealsOnly);
    setDealLayout(next.dealLayout);
    setDealCollection(next.dealCollection);
    setSearchQuery(next.searchQuery);
    setVille(next.city);
    setUserCoords(next.city ? CITY_COORDS[next.city] || null : null);
    if (next.action === 'alerts') {
      router.replace('/alerts');
      return;
    }
    if (next.action === 'post_deal') {
      router.replace('/post');
      return;
    }
    setShowMainMenu(next.action === 'menu');
    setShowCityModal(next.action === 'city');
    setSelectedPromoBarcode(next.action === 'view_promo' ? next.selectedPromoBarcode : null);
    if (next.action !== 'view_promo') setSelectedPromo(null);

    initialUrlAppliedRef.current = true;
    const id = window.setTimeout(() => {
      syncingUrlRef.current = false;
    }, 0);
    return () => window.clearTimeout(id);
  }, [router.isReady, router.asPath]);

  useEffect(() => {
    const query = searchQuery.trim();
    if (tab !== 'search' || query.length < 2) return undefined;
    const normalized = query.toLocaleLowerCase().replace(/\s+/g, ' ');
    if (lastTrackedSearchRef.current === normalized) return undefined;
    const timeout = window.setTimeout(async () => {
      lastTrackedSearchRef.current = normalized;
      const { data } = await supabase.auth.getSession().catch(() => ({ data: null }));
      fetch('/api/search-analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(data?.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : {}),
        },
        body: JSON.stringify({ query }),
      }).catch(() => {});
    }, 900);
    return () => window.clearTimeout(timeout);
  }, [searchQuery, tab]);

  useEffect(() => {
    if (!router.isReady || !initialUrlAppliedRef.current || syncingUrlRef.current) return;

    const nextUrl = buildHomeUrl({
      tab,
      storeFilter,
      promoCategory,
      promoSort,
      showPromoFilters,
      categoryFilter,
      sortDeals,
      myDealsOnly,
      dealLayout,
      dealCollection,
      city: ville,
      searchQuery,
      action: selectedPromoBarcode
        ? 'view_promo'
        : showMainMenu
          ? 'menu'
          : showCityModal
            ? 'city'
            : null,
      selectedPromoBarcode,
    });
    const currentUrl = router.asPath.split('#')[0] || '/';
    if (nextUrl === currentUrl) return;

    router.push(nextUrl, undefined, { shallow: true, scroll: false });
  }, [
    router,
    tab,
    storeFilter,
    promoCategory,
    promoSort,
    showPromoFilters,
    categoryFilter,
    sortDeals,
    myDealsOnly,
    dealLayout,
    dealCollection,
    ville,
    searchQuery,
    showMainMenu,
    showCityModal,
    selectedPromoBarcode,
  ]);

  useEffect(() => {
    if (tab !== 'sales') return;
    setLoadingPromos(true);
    const params = new URLSearchParams({ sort: promoSort });
    if (promoCategory !== 'all') params.set('category', promoCategory);

    fetch(`/api/promos?${params}`)
      .then(r => r.json())
      .then(d => {
        const nextPromos = d.promos || [];
        setPromos(nextPromos);
        setPromoVotes(prev => {
          const next = { ...prev };
          for (const promo of nextPromos) {
            next[promo.barcode] = {
              chaud: promo.votesChaud || 0,
              froid: promo.votesFroid || 0,
              myVote: prev[promo.barcode]?.myVote || null,
            };
          }
          return next;
        });
        setLoadingPromos(false);
      })
      .catch(() => setLoadingPromos(false));
  }, [tab, promoCategory, promoSort]);

  const fetchDealsPage = useCallback(async ({ offset = 0, append = false, signal } = {}) => {
    const params = new URLSearchParams();
    params.set('limit', String(DEAL_PAGE_SIZE));
    params.set('offset', String(offset));
    if (categoryFilter !== 'all') params.set('categorie', categoryFilter);
    if (ville && sortDeals !== 'nearby') params.set('ville', ville);
    params.set('tri', sortDeals === 'nearby' ? 'latest' : sortDeals);
    if (myDealsOnly && user?.id) params.set('auteur_id', user.id);
    const response = await fetch(`/api/bons-plans?${params}`, { signal });
    const d = await response.json();
    const nextDeals = d.bons_plans || [];
    const nextTotal = Number.isFinite(d.total) ? d.total : offset + nextDeals.length;
    setDeals((current) => {
      if (!append) return nextDeals;
      const seen = new Set(current.map((deal) => deal.id));
      return [...current, ...nextDeals.filter((deal) => !seen.has(deal.id))];
    });
    setDealTotal(nextTotal);
    setHasMoreDeals(typeof d.hasMore === 'boolean' ? d.hasMore : offset + nextDeals.length < nextTotal);
    return nextDeals.length;
  }, [categoryFilter, sortDeals, myDealsOnly, user?.id, ville]);

  // ── Deals fetch ──
  useEffect(() => {
    if (tab !== 'deals' && tab !== 'search') return undefined;
    const controller = new AbortController();
    setLoadingDeals(true);
    setLoadingMoreDeals(false);
    setHasMoreDeals(false);
    fetchDealsPage({ offset: 0, append: false, signal: controller.signal })
      .then(() => setLoadingDeals(false))
      .catch((error) => {
        if (error.name !== 'AbortError') {
          setLoadingDeals(false);
          setHasMoreDeals(false);
        }
      });
    return () => controller.abort();
  }, [tab, fetchDealsPage]);

  const loadMoreDeals = useCallback(() => {
    if (loadingDeals || loadingMoreDeals || !hasMoreDeals || (tab !== 'deals' && tab !== 'search')) return;
    const controller = new AbortController();
    setLoadingMoreDeals(true);
    fetchDealsPage({ offset: deals.length, append: true, signal: controller.signal })
      .catch(() => setHasMoreDeals(false))
      .finally(() => setLoadingMoreDeals(false));
  }, [deals.length, fetchDealsPage, hasMoreDeals, loadingDeals, loadingMoreDeals, tab]);

  useEffect(() => {
    loadMoreDealsRef.current = loadMoreDeals;
  }, [loadMoreDeals]);

  useEffect(() => {
    if (tab !== 'deals' || !hasMoreDeals || loadingDeals) return undefined;
    const sentinel = dealListEndRef.current;
    if (!sentinel || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) loadMoreDealsRef.current?.();
    }, { rootMargin: '480px 0px 480px 0px' });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [tab, hasMoreDeals, loadingDeals]);

  useEffect(() => {
    if (!selectedPromoBarcode) return;
    const promo = promos.find(item => String(item.barcode) === String(selectedPromoBarcode));
    if (promo) setSelectedPromo(promo);
  }, [selectedPromoBarcode, promos]);

  const handleCitySelect = (villeNom, coords) => {
    setVille(villeNom);
    const c = coords || (villeNom ? CITY_COORDS[villeNom] || null : null);
    setUserCoords(c);
    if (c?.exact) {
      setSortDeals('nearby');
      writeSessionDealSort('nearby');
    } else {
      setSortDeals('hot');
      writeSessionDealSort('hot');
    }
  };

  const openPromo = (promo) => {
    setSelectedPromo(promo);
    setSelectedPromoBarcode(promo?.barcode || null);
  };

  const closePromo = () => {
    setSelectedPromo(null);
    setSelectedPromoBarcode(null);
  };

  const setLanguage = (next) => {
    if (next !== 'en' && next !== 'he') return;
    setLang(next);
    try { localStorage.setItem('dilzLang', next); } catch {}
    window.dispatchEvent(new CustomEvent('dilz-language-change', { detail: next }));
  };

  const togglePromoFilters = () => {
    setShowPromoFilters(current => {
      const next = !current;
      try { localStorage.setItem('dilzShowPromoFilters', String(next)); } catch {}
      return next;
    });
  };

  const changeDealLayout = (next) => {
    setDealLayout(writeDealLayoutPreference(next));
  };

  const openMap = () => {
    try {
      sessionStorage.setItem('dilzMapReturnUrl', router.asPath || '/?tab=dilz');
    } catch {}
    router.push(ville ? `/map?city=${encodeURIComponent(ville)}` : '/map');
  };

  const handleAdminDeleteDeal = async (id) => {
    if (!adminToken) return;
    if (!window.confirm(`Admin: delete deal #${id}?`)) return;
    const res = await fetch('/api/admin/actions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ action: 'delete_deal', id }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      alert(json.erreur || 'Admin delete failed.');
      return;
    }
    setDeals(prev => prev.filter(deal => deal.id !== id));
    setDealTotal(current => Math.max(0, current - 1));
  };

  const handleOwnerDeleteDeal = async (id) => {
    if (!user || !window.confirm(lang === 'he' ? 'Delete this deal?' : 'Delete this deal?')) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const response = await fetch('/api/bons-plans', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ action: 'delete', id }),
    });
    if (!response.ok) return;
    setDeals((current) => current.filter((deal) => deal.id !== id));
    setDealTotal((current) => Math.max(0, current - 1));
  };

  const handleDealVote = async (id, type) => {
    if (!user) { router.push('/auth'); return; }

    // Get auth token
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/auth'); return; }

    // Compute optimistic state
    const currentVote = votedDeals[id] || null;
    const optimisticNewVote = currentVote === type ? null : type;
    const chaud_delta = (currentVote === 'chaud' ? -1 : 0) + (optimisticNewVote === 'chaud' ? 1 : 0);
    const froid_delta = (currentVote === 'froid' ? -1 : 0) + (optimisticNewVote === 'froid' ? 1 : 0);

    // Optimistic update
    setVotedDeals(prev => {
      const next = { ...prev, [id]: optimisticNewVote };
      try { localStorage.setItem('dilzDealVotes', JSON.stringify(next)); } catch {}
      return next;
    });
    setDeals(prev => prev.map(d => d.id !== id ? d : {
      ...d,
      votes_chaud: Math.max(0, (d.votes_chaud || 0) + chaud_delta),
      votes_froid: Math.max(0, (d.votes_froid || 0) + froid_delta),
    }));

    const apiRes = await fetch('/api/bons-plans', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        action: 'vote', id, type,
        // Fallback deltas for when votes table isn't set up yet
        chaud_delta, froid_delta,
      }),
    });

    if (apiRes.ok) {
      const data = await apiRes.json();
      // Reconcile with server-authoritative state
      const serverVote = data.newType ?? null;
      setVotedDeals(prev => {
        const next = { ...prev, [id]: serverVote };
        try { localStorage.setItem('dilzDealVotes', JSON.stringify(next)); } catch {}
        return next;
      });
      if (data.votes_chaud !== undefined) {
        setDeals(prev => prev.map(d => d.id !== id ? d : {
          ...d,
          votes_chaud: data.votes_chaud,
          votes_froid: data.votes_froid,
        }));
      }
    } else {
      // Rollback
      setVotedDeals(prev => {
        const next = { ...prev, [id]: currentVote };
        try { localStorage.setItem('dilzDealVotes', JSON.stringify(next)); } catch {}
        return next;
      });
      setDeals(prev => prev.map(d => d.id !== id ? d : {
        ...d,
        votes_chaud: Math.max(0, (d.votes_chaud || 0) - chaud_delta),
        votes_froid: Math.max(0, (d.votes_froid || 0) - froid_delta),
      }));
    }
  };

  const handlePromoVote = async (barcode, type) => {
    if (!user) { router.push('/auth'); return; }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/auth'); return; }

    const previous = promoVotes[barcode] || { chaud: 0, froid: 0, myVote: null };
    const nextVote = previous.myVote === type ? null : type;
    const optimistic = {
      chaud: Math.max(0, previous.chaud - (previous.myVote === 'chaud' ? 1 : 0) + (nextVote === 'chaud' ? 1 : 0)),
      froid: Math.max(0, previous.froid - (previous.myVote === 'froid' ? 1 : 0) + (nextVote === 'froid' ? 1 : 0)),
      myVote: nextVote,
    };
    setPromoVotes(prev => ({ ...prev, [barcode]: optimistic }));

    try {
      const response = await fetch('/api/product-votes', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ barcode, type }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.erreur || 'Vote failed');
      setPromoVotes(prev => ({
        ...prev,
        [barcode]: {
          chaud: data.votes_chaud || 0,
          froid: data.votes_froid || 0,
          myVote: data.newType || null,
        },
      }));
    } catch {
      setPromoVotes(prev => ({ ...prev, [barcode]: previous }));
    }
  };

  const handleToggleSave = async (itemType, itemId) => {
    if (!user) { router.push('/auth'); return; }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/auth'); return; }

    const key = `${itemType}:${itemId}`;
    const wasSaved = Boolean(savedKeys[key]);
    setSavedKeys(prev => ({ ...prev, [key]: !wasSaved }));
    if (wasSaved) {
      setSavedItems(prev => prev.filter(item => `${item.item_type}:${item.item_id}` !== key));
    }

    try {
      const response = await fetch('/api/saved-items', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ item_type: itemType, item_id: String(itemId) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.erreur || 'Save failed');

      if (result.saved && result.item) {
        setSavedKeys(prev => ({ ...prev, [key]: true }));
        setSavedItems(prev => [result.item, ...prev.filter(item => `${item.item_type}:${item.item_id}` !== key)]);
      } else {
        setSavedKeys(prev => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
        setSavedItems(prev => prev.filter(item => `${item.item_type}:${item.item_id}` !== key));
      }
    } catch {
      setSavedKeys(prev => ({ ...prev, [key]: wasSaved }));
      if (!wasSaved) return;
      fetch('/api/saved-items', { headers: { 'Authorization': `Bearer ${session.access_token}` } })
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (!d) return;
          const items = d.saved_items || [];
          setSavedItems(items);
          setSavedKeys(Object.fromEntries(items.map(item => [`${item.item_type}:${item.item_id}`, true])));
        }).catch(() => {});
    }
  };

  const handlePostSuccess = (newId) => {
    if (newId) {
      // When user navigates back, they'll see the feed sorted by New so their deal is visible
      try { sessionStorage.setItem('dilzReturnSort', 'latest'); } catch {}
      router.push(`/deal/${newId}`);
    } else {
      // No id returned — fall back to showing the feed sorted by New
      setSortDeals('latest');
      writeSessionDealSort('latest');
      setPostSuccess(true);
      setTimeout(() => {
        setPostSuccess(false);
        setTab('deals');
        setLoadingDeals(true);
        fetch(`/api/bons-plans?tri=latest&limit=${DEAL_PAGE_SIZE}&offset=0`)
          .then(r => r.json())
          .then(d => {
            const nextDeals = d.bons_plans || [];
            setDeals(nextDeals);
            setDealTotal(Number.isFinite(d.total) ? d.total : nextDeals.length);
            setHasMoreDeals(Boolean(d.hasMore));
            setLoadingDeals(false);
          })
          .catch(() => setLoadingDeals(false));
      }, 1800);
    }
  };

  const openDealCollection = ({ collection = 'all', category = 'all', sort } = {}) => {
    const nextSort = resolveDealSort({
      requestedSort: sort,
      sessionSort: readSessionDealSort(),
      preferredSort: readDealSortPreference(),
    });
    setTab('deals');
    setDealCollection(collection);
    setCategoryFilter(category);
    setSortDeals(nextSort);
    writeSessionDealSort(nextSort);
    setMyDealsOnly(false);
    setShowMainMenu(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setTab('deals');
    router.replace('/');
  };

  // Computed displayed deals (proximity sort)
  const unblockedDeals = blockedUserIds.length
    ? deals.filter((deal) => !deal.auteur_id || !blockedUserIds.includes(deal.auteur_id))
    : deals;
  const sortedDeals = sortDeals === 'comments' || sortDeals === 'latest'
    ? sortDealsForView(unblockedDeals, sortDeals)
    : (sortDeals === 'nearby' && userCoords)
      ? [...unblockedDeals].sort((a, b) => {
        const ca = Number.isFinite(Number(a.latitude)) && Number.isFinite(Number(a.longitude))
          ? { lat: Number(a.latitude), lon: Number(a.longitude) }
          : (a.ville ? CITY_COORDS[a.ville] : null);
        const cb = Number.isFinite(Number(b.latitude)) && Number.isFinite(Number(b.longitude))
          ? { lat: Number(b.latitude), lon: Number(b.longitude) }
          : (b.ville ? CITY_COORDS[b.ville] : null);
        const da = ca ? distanceKm(userCoords.lat, userCoords.lon, ca.lat, ca.lon) : Infinity;
        const db = cb ? distanceKm(userCoords.lat, userCoords.lon, cb.lat, cb.lon) : Infinity;
        return da - db;
      })
      : unblockedDeals;

  const displayedDeals = dealCollection === 'codes'
    ? sortedDeals.filter((deal) => /\b(code promo|promo code|coupon|voucher)\b|קוד|קופון/i.test([deal.titre, deal.description, deal.magasin].filter(Boolean).join(' ')))
    : dealCollection === 'free'
      ? sortedDeals.filter((deal) => Number(deal.prix) === 0 || /\b(gratuit|gratuito|free|cadeau)\b|חינם/i.test([deal.titre, deal.description].filter(Boolean).join(' ')))
      : sortedDeals;

  const visibleDeals = dealCollection === 'active'
    ? displayedDeals.filter((deal) => !dealIsExpired(deal))
    : displayedDeals;
  const displayedDealCount = dealCollection === 'all' ? dealTotal : visibleDeals.length;

  const filteredPromos = storeFilter === 'all'
    ? promos
    : promos.filter(p => p.tousLesPrix?.some(price => price.enseigne === storeFilter));
  const gridPromos = filteredPromos;

  if (!mounted) return null;

  const cityLabel = ville ? traduireVille(ville, lang) : (lang !== 'he' ? 'All Israel' : 'כל הארץ');


  return (
    <>
      <Head>
        <title>Dilz — Best deals & promotions in Israel</title>
        <meta name="description" content="Compare supermarket prices, discover community deals, and save money in Israel. Official promos from Shufersal, Rami Levy, Victory, Yohananof and more." />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta property="og:title" content="Dilz — Smart deals in Israel" />
        <meta property="og:description" content="Official supermarket promos + community deals. Find the best prices near you." />
        <meta name="theme-color" content="#E2552D" />
      </Head>

      <div className="dilz-app-frame" dir={dir}>
        <AppHeader
          lang={lang}
          languageOptions={LANG_OPTIONS}
          onLanguageChange={setLanguage}
          cityLabel={cityLabel}
          onCityClick={() => setShowCityModal(true)}
          user={user}
          onLogoClick={() => setTab('deals')}
          onPostDeal={() => user ? router.push('/post') : router.push('/auth?redirect=/post')}
          onSearch={() => setTab('search')}
          searchValue={searchQuery}
          onSearchChange={(event) => setSearchQuery(event.target.value)}
          onCommunity={() => setTab('deals')}
          activeTab={tab}
          showSearch={tab !== 'profile'}
        />

        <main className="dilz-page-shell">

          {/* ══ SALES TAB ══ */}
          {tab === 'sales' && (
            <div>
              <SectionHeader
                title={lang === 'he' ? 'מבצעים' : 'Promotions'}
                subtitle={lang === 'he' ? 'מבצעי סופרמרקט רשמיים וירידות מחירים ברחבי ישראל.' : 'Official supermarket promotions and price drops across Israel.'}
              />
              <button
                type="button"
                className="dilz-filter-toggle"
                onClick={togglePromoFilters}
                aria-expanded={showPromoFilters}
                aria-controls="supermarket-filters"
              >
                <span className="dilz-filter-toggle__left">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4 6h16M7 12h10M10 18h4" />
                  </svg>
                  <span>
                    {showPromoFilters
                      ? textFor(lang, { en: 'Hide filters', he: 'הסתר מסננים', fr: 'Masquer les filtres', es: 'Ocultar filtros' })
                      : textFor(lang, { en: 'Show filters', he: 'הצג מסננים', fr: 'Afficher les filtres', es: 'Mostrar filtros' })}
                  </span>
                  {(storeFilter !== 'all' || promoCategory !== 'all' || promoSort !== 'discount') && (
                    <span className="dilz-filter-toggle__count">
                      {[storeFilter !== 'all', promoCategory !== 'all', promoSort !== 'discount'].filter(Boolean).length}
                    </span>
                  )}
                </span>
                <svg
                  width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className={showPromoFilters ? 'dilz-filter-toggle__chevron is-open' : 'dilz-filter-toggle__chevron'}
                  aria-hidden="true"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>

              <div id="supermarket-filters" hidden={!showPromoFilters}>
                <div className="dilz-compact-filter-row" role="group" aria-label="Sort">
                  {[
                    { id: 'discount', en: 'Best discount', he: 'הנחה גבוהה', fr: 'Meilleure remise', es: 'Mejor descuento' },
                    { id: 'liked', en: 'Most liked', he: 'הכי אהובים', fr: 'Les plus likés', es: 'Mas votados' },
                    { id: 'recent', en: 'Newest', he: 'החדשים ביותר', fr: 'Plus récents', es: 'Mas recientes' },
                    { id: 'price_asc', en: 'Lowest price', he: 'מחיר נמוך', fr: 'Prix le plus bas', es: 'Precio mas bajo' },
                  ].map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className={['dilz-compact-filter-chip', promoSort === option.id && 'is-active'].filter(Boolean).join(' ')}
                      onClick={() => setPromoSort(option.id)}
                    >
                      {textFor(lang, option)}
                    </button>
                  ))}
                </div>

                <div className="dilz-compact-filter-row" role="group" aria-label="Category">
                  {['all', ...PRODUCT_CATEGORIES].map((category) => (
                    <button
                      key={category}
                      type="button"
                      className={['dilz-compact-filter-chip', promoCategory === category && 'is-active'].filter(Boolean).join(' ')}
                      onClick={() => setPromoCategory(category)}
                    >
                      {getProductCategoryLabel(category, lang)}
                    </button>
                  ))}
                </div>

                <div className="dilz-compact-filter-row" role="group" aria-label="Store">
                  {STORE_FILTERS.map((f) => {
                    const active = storeFilter === f.id;
                    const s = f.id !== 'all' ? STORE_COLORS[f.id] : null;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        className={['dilz-compact-filter-chip', active && 'is-active'].filter(Boolean).join(' ')}
                        onClick={() => setStoreFilter(f.id)}
                        style={active && s ? { borderColor: s.color, background: isDark ? s.dark : s.bg, color: s.color } : undefined}
                      >
                        {f.id === 'all' ? (lang !== 'he' ? 'All stores' : 'כל הרשתות') : (lang !== 'he' ? f.nameEn : f.id)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {loadingPromos ? (
                <div className="dilz-loading-state">
                  <div className="dilz-spinner" />
                  <p>{t.loadingDeals}</p>
                </div>
              ) : filteredPromos.length === 0 ? (
                <EmptyState
                  title={textFor(lang, { en: 'No promotions found', he: 'לא נמצאו מבצעים', fr: 'Aucune promotion trouvée', es: 'No se encontraron promociones' })}
                  text={textFor(lang, { en: 'Try selecting a different store.', he: 'נסה לבחור חנות אחרת.', fr: 'Essaie une autre enseigne.', es: 'Prueba otra tienda.' })}
                  actionLabel={textFor(lang, { en: 'Show all stores', he: 'כל הרשתות', fr: 'Toutes les enseignes', es: 'Todas las tiendas' })}
                  onAction={() => setStoreFilter('all')}
                />
              ) : (
                <>
                  {gridPromos.length > 0 && (
                    <>
                      <p className="dilz-count-label">
                        {textFor(lang, {
                          en: `${filteredPromos.length} products compared`,
                          he: `${filteredPromos.length} מוצרים להשוואה`,
                          fr: `${filteredPromos.length} produits comparés`,
                          es: `${filteredPromos.length} productos comparados`,
                        })}
                      </p>
                      <div className="dilz-promo-grid">
                        {gridPromos.map((p) => (
                          <PromoCard
                            key={p.barcode}
                            promo={p}
                            lang={lang}
                            isDark={isDark}
                            onClick={() => openPromo(p)}
                            votes={promoVotes[p.barcode]}
                            onVote={handlePromoVote}
                            isSaved={Boolean(savedKeys[`product:${p.barcode}`])}
                            onSave={() => handleToggleSave('product', p.barcode)}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {/* ══ DEALS TAB ══ */}
          {tab === 'deals' && (
            <div>
              <div className="dilz-deal-toolbar">
                <div className="dilz-view-switcher" aria-label="Dilz views">
                {[
                  { id: 'latest', label: 'New' },
                  { id: 'all', label: 'Hot' },
                  { id: 'comments', label: 'Trending' },
                ].map(view => (
                  <button
                    key={view.id}
                    type="button"
                    className={isPrimaryDealFilterActive(view.id, { sortDeals, categoryFilter, myDealsOnly, dealCollection }) ? 'is-active' : ''}
                    onClick={() => {
                      const nextView = dealViewState(view.id, readDealSortPreference());
                      setMyDealsOnly(nextView.myDealsOnly);
                      setDealCollection(nextView.collection);
                      setCategoryFilter(nextView.category);
                      setSortDeals(nextView.sort);
                      writeSessionDealSort(nextView.sort);
                    }}
                  >
                    {view.label}
                  </button>
                ))}
                <span className="dilz-view-switcher__select-wrap">
                  <select
                    className="dilz-view-switcher__select"
                    value={selectedOtherDealFilter({ sortDeals, categoryFilter, myDealsOnly, dealCollection })}
                    onChange={(event) => {
                      const nextView = dealViewState(event.target.value || 'all', readDealSortPreference());
                      setMyDealsOnly(nextView.myDealsOnly);
                      setDealCollection(nextView.collection);
                      setCategoryFilter(nextView.category);
                      setSortDeals(nextView.sort);
                      writeSessionDealSort(nextView.sort);
                    }}
                    aria-label="Other filters"
                  >
                    <option value="">Other</option>
                    <option value="active">Active</option>
                    <option value="all">All</option>
                    {userCoords && <option value="nearby">Near me</option>}
                    <option value="ending">Ending soon</option>
                    {DEAL_CATEGORIES.map((category) => (
                      <option key={category} value={category}>{getDealCategoryLabel(category, lang)}</option>
                    ))}
                    {user && <option value="mine">My Dilz</option>}
                  </select>
                  <span className="dilz-view-switcher__select-chevron" aria-hidden="true" />
                </span>
                <span className="dilz-view-switcher__select-wrap dilz-view-switcher__select-wrap--display" title="Display">
                  <span className="dilz-view-switcher__display-icon">
                    <ViewSettingsIcon />
                  </span>
                  <select
                    className="dilz-view-switcher__select"
                    value={dealLayout}
                    onChange={(event) => {
                      if (event.target.value === 'map') {
                        openMap();
                        return;
                      }
                      changeDealLayout(event.target.value);
                    }}
                    aria-label={lang === 'he' ? 'Display options' : 'Display options'}
                  >
                    <option value="card">Cards</option>
                    <option value="compact">Compact</option>
                    <option value="spotlight">Row</option>
                    <option value="map">Map</option>
                  </select>
                </span>
                </div>
              </div>

              {ville && (
                <div className="dilz-city-context">
                  <span>{lang !== 'he' ? `Deals in ${traduireVille(ville, 'en')}` : `דילים ב${ville}`}</span>
                  <button type="button" className="dilz-city-context__change" onClick={() => setShowCityModal(true)}>
                    {lang !== 'he' ? '· Change' : '· שנה'}
                  </button>
                </div>
              )}

              {postSuccess && (
                <div className="dilz-success-banner">
                  {lang !== 'he' ? 'Deal published! Refreshing...' : 'הדיל פורסם! מרענן...'}
                </div>
              )}

              {loadingDeals ? (
                <div className="dilz-loading-state">
                  <div className="dilz-spinner" />
                  <p>{t.loading}</p>
                </div>
              ) : visibleDeals.length === 0 && !hasMoreDeals ? (
                <EmptyState
                  title={
                    sortDeals === 'ending'
                      ? (lang !== 'he' ? 'No deals ending soon' : 'אין דילים שמסתיימים בקרוב')
                      : myDealsOnly
                        ? (lang !== 'he' ? "You haven't posted any deals yet" : 'עדיין לא פרסמת דילים')
                        : (lang !== 'he' ? 'No deals in this category yet' : 'אין דילים עדיין בקטגוריה זו')
                  }
                  text={
                    sortDeals === 'ending'
                      ? (lang !== 'he' ? 'Deals with an expiration date will appear here.' : 'דילים עם תאריך סיום יופיעו כאן.')
                      : (lang !== 'he' ? 'Be the first to share a deal with the community.' : 'היה הראשון לשתף דיל!')
                  }
                  actionLabel={lang !== 'he' ? 'Share a deal' : 'שתף דיל'}
                  onAction={() => user ? router.push('/post') : router.push('/auth?redirect=/post')}
                />
              ) : (
                <>
                  {visibleDeals.length > 0 && (
                    <div className={['dilz-feed-grid', dealLayout === 'compact' && 'is-compact', dealLayout === 'spotlight' && 'is-spotlight'].filter(Boolean).join(' ')}>
                    {visibleDeals.map(deal => (
                      <PremiumDealCard
                        key={deal.id} deal={deal} lang={lang} isDark={isDark}
                        layout={dealLayout}
                        onVote={handleDealVote} userCoords={userCoords}
                        votedDeal={votedDeals[deal.id] || null}
                        user={user}
                        isAdmin={Boolean(adminToken)}
                        onAdminDelete={handleAdminDeleteDeal}
                        onOwnerDelete={handleOwnerDeleteDeal}
                        onBlocked={(userId) => setBlockedUserIds((current) => current.includes(userId) ? current : [...current, userId])}
                        isSaved={Boolean(savedKeys[`deal:${deal.id}`])}
                        onSave={() => handleToggleSave('deal', deal.id)}
                        translateCity={traduireVille}
                      />
                    ))}
                    </div>
                  )}
                  <div ref={dealListEndRef} className="dilz-feed-sentinel" aria-hidden={!loadingMoreDeals}>
                    {loadingMoreDeals && (
                      <div className="dilz-loading-state dilz-loading-state--more">
                        <div className="dilz-spinner" />
                        <p>{t.loading}</p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {false && !loadingDeals && visibleDeals.length > 0 && (
                <div className="dilz-tab-footer">
                  <p>{textFor(lang, { en: 'Looking for supermarket prices?', he: 'מחפש מחירי סופרמרקט?', fr: 'Tu cherches les prix des supermarchés ?', es: '¿Buscas precios de supermercado?' })}</p>
                  <button type="button" className="dilz-button dilz-button--secondary dilz-button--sm" onClick={() => setTab('sales')}>
                    {textFor(lang, { en: 'Browse store prices', he: 'מחירי חנויות', fr: 'Voir les prix magasins', es: 'Ver precios de tiendas' })}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ══ SEARCH TAB ══ */}
          {tab === 'search' && (
            <SearchTab
              promos={promos} deals={deals} lang={lang} isDark={isDark}
              onPromoClick={openPromo}
              userCoords={userCoords}
              promoVotes={promoVotes}
              onPromoVote={handlePromoVote}
              savedKeys={savedKeys}
              onToggleSave={handleToggleSave}
              votedDeals={votedDeals}
              onDealVote={handleDealVote}
              user={user}
              searchQuery={searchQuery}
              isAdmin={Boolean(adminToken)}
              onAdminDeleteDeal={handleAdminDeleteDeal}
            />
          )}

          {/* ══ PROFILE TAB ══ */}
          {tab === 'profile' && (
            <ProfileTab
              user={user}
              lang={lang}
              savedItems={savedItems}
              onToggleSave={handleToggleSave}
              onSignOut={handleSignOut}
            />
          )}
        </main>

        <MainMenuSheet
          lang={lang}
          open={showMainMenu}
          onClose={() => setShowMainMenu(false)}
          onHome={() => openDealCollection()}
          onDeals={() => router.push('/bons-plans-shopping')}
          onCodePromos={() => router.push('/codes-promo')}
          onCategory={(category) => openDealCollection({ category })}
          onFree={() => router.push('/gratuit')}
          activeCollection={dealCollection}
          activeCategory={categoryFilter}
        />

        {selectedPromo && (
          <PromoModal promo={selectedPromo} lang={lang} isDark={isDark} onClose={closePromo} />
        )}
        {showCityModal && (
          <CityModal
            villes={villes}
            current={ville}
            lang={lang}
            onSelect={handleCitySelect}
            onClose={() => setShowCityModal(false)}
          />
        )}
      </div>
    </>
  );
}

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import { useAppLanguage } from '../lib/useAppLanguage';
import { VoteEmoji } from '../components/ui/VoteEmoji';
import { readDealSortPreference, writeDealSortPreference } from '../lib/userPreferences';

const PROFILE_TEXT = {
  en: { profile: 'Profile', back: 'Back', signOut: 'Sign out', posted: 'Deals posted', received: 'Hot votes received', settings: 'Account settings', settingsHelp: 'Choose how Dilz should look when you return.', language: 'Language', feedOrder: 'Default feed order', english: 'English', hebrew: 'Hebrew', hot: 'Hottest first', latest: 'Newest first', comments: 'Most commented', saved: 'Preference saved', mine: 'My deals', loading: 'Loading...', empty: 'No deals yet', emptyText: 'Share a deal you spotted!', post: 'Post a deal', now: 'Just now', hour: 'h ago', day: 'd ago', legal: 'Legal and privacy', privacy: 'Privacy Policy', terms: 'Terms of Use', danger: 'Delete account', dangerHelp: 'Permanently delete your account and private data. Your public contributions will be anonymized.', delete: 'Delete my account', confirmTitle: 'This action cannot be undone', confirmHelp: 'Type DELETE to permanently delete your Dilz account.', confirmWord: 'DELETE', cancel: 'Cancel', deleting: 'Deleting...', deleteError: 'Account deletion failed. Please try again or contact support.' },
  he: { profile: 'פרופיל', back: 'חזרה', signOut: 'התנתקות', posted: 'דילים שפורסמו', received: 'הצבעות חמות שהתקבלו', settings: 'הגדרות חשבון', settingsHelp: 'בחרו כיצד Dilz יוצג בכל כניסה.', language: 'שפה', feedOrder: 'סדר ברירת מחדל בפיד', english: 'אנגלית', hebrew: 'עברית', hot: 'החמים ביותר', latest: 'החדשים ביותר', comments: 'עם הכי הרבה תגובות', saved: 'ההעדפה נשמרה', mine: 'הדילים שלי', loading: 'טוען...', empty: 'עדיין אין דילים', emptyText: 'שתפו דיל שמצאתם!', post: 'פרסום דיל', now: 'עכשיו', hour: 'ש׳', day: 'י׳' },
};

const ACCOUNT_SAFETY_TEXT = {
  en: { legal: 'Legal and privacy', privacy: 'Privacy Policy', terms: 'Terms of Use', danger: 'Delete account', dangerHelp: 'Permanently delete your account and private data. Your public contributions will be anonymized.', delete: 'Delete my account', confirmTitle: 'This action cannot be undone', confirmHelp: 'Type DELETE to permanently delete your Dilz account.', confirmWord: 'DELETE', cancel: 'Cancel', deleting: 'Deleting...', deleteError: 'Account deletion failed. Please try again or contact support.' },
  he: { legal: 'משפטי ופרטיות', privacy: 'מדיניות פרטיות', terms: 'תנאי שימוש', danger: 'מחיקת חשבון', dangerHelp: 'מחיקה לצמיתות של החשבון והמידע הפרטי. התרומות הציבוריות שלכם יעברו אנונימיזציה.', delete: 'מחיקת החשבון שלי', confirmTitle: 'לא ניתן לבטל פעולה זו', confirmHelp: 'הקלידו DELETE כדי למחוק לצמיתות את חשבון Dilz.', confirmWord: 'DELETE', cancel: 'ביטול', deleting: 'מוחק...', deleteError: 'מחיקת החשבון נכשלה. נסו שוב או פנו לתמיכה.' },
};

function timeAgo(date, text) {
  const diff = Date.now() - new Date(date).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return text.now;
  if (h < 24) return `${h}${text.hour}`;
  return `${Math.floor(h / 24)}${text.day}`;
}

function BackArrow() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M19 12H5m7-7-7 7 7 7"/></svg>;
}

function ShoppingBagIcon() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>;
}

export default function Profil() {
  const router = useRouter();
  const { lang, setLang, dir } = useAppLanguage();
  const text = PROFILE_TEXT[lang];
  const safetyText = ACCOUNT_SAFETY_TEXT[lang];
  const [user, setUser] = useState(null);
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [feedPreference, setFeedPreference] = useState('hot');
  const [preferenceSaved, setPreferenceSaved] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    setMounted(true);
    setFeedPreference(readDealSortPreference());
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.replace('/auth?redirect=/profil'); return; }
      const u = data.session.user;
      setUser(u);
      const accountLanguage = u.user_metadata?.dilz_language;
      if (accountLanguage === 'en' || accountLanguage === 'he') setLang(accountLanguage);
      const accountSort = u.user_metadata?.dilz_deal_sort;
      if (['hot', 'latest', 'comments'].includes(accountSort)) {
        setFeedPreference(writeDealSortPreference(accountSort));
      }
      fetchUserDeals(u.id);
    });
  }, []);

  const fetchUserDeals = async (userId) => {
    setLoading(true);
    const { data } = await supabase
      .from('bons_plans')
      .select('*')
      .eq('auteur_id', userId)
      .order('created_at', { ascending: false });
    setDeals(data || []);
    setLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/');
  };

  const saveIndicator = () => {
    setPreferenceSaved(true);
    window.setTimeout(() => setPreferenceSaved(false), 1600);
  };

  const changeLanguage = async (value) => {
    setLang(value);
    saveIndicator();
    await supabase.auth.updateUser({ data: { dilz_language: value } });
  };

  const changeFeedPreference = async (value) => {
    setFeedPreference(writeDealSortPreference(value));
    saveIndicator();
    await supabase.auth.updateUser({ data: { dilz_deal_sort: value } });
  };

  const deleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') return;
    setDeleting(true);
    setDeleteError('');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.replace('/auth?redirect=/profil');
      return;
    }

    try {
      const response = await fetch('/api/account/delete', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!response.ok) throw new Error('delete_failed');
      await supabase.auth.signOut();
      try {
        localStorage.removeItem('dilzDealVotes');
        localStorage.removeItem('dilzCommentVotes');
      } catch {}
      router.replace('/?account=deleted');
    } catch {
      setDeleteError(safetyText.deleteError);
      setDeleting(false);
    }
  };

  if (!mounted) return null;

  if (!user) {
    return (
      <div className="dilz-profil-loading">
        <div className="dilz-spinner" />
      </div>
    );
  }

  const displayName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'User';
  const initials = displayName.slice(0, 2).toUpperCase();
  const totalHot = deals.reduce((s, d) => s + (d.votes_chaud || 0), 0);

  return (
    <>
      <Head>
        <title>{text.profile} - Dilz</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>
      <div className="dilz-profil-page" dir={dir}>
        <header className="dilz-app-header">
          <div className="dilz-app-header__inner">
            <Link href="/" className="dilz-profil-back">
              <BackArrow /> {text.back}
            </Link>
            <span className="dilz-profil-heading">{text.profile}</span>
            <button type="button" className="dilz-button dilz-button--ghost dilz-button--sm" onClick={handleSignOut}>{text.signOut}</button>
          </div>
        </header>

        <main className="dilz-profil-main">
          <div className="dilz-profil-card">
            <div className="dilz-avatar" aria-hidden="true">{initials}</div>
            <div>
              <p className="dilz-profil-card__name">{displayName}</p>
              <p className="dilz-profil-card__email">{user.email}</p>
            </div>
          </div>

          <div className="dilz-profil-stats">
            <div className="dilz-stat-card">
              <strong>{deals.length}</strong>
              <span>{text.posted}</span>
            </div>
            <div className="dilz-stat-card">
              <strong><VoteEmoji type="chaud" /> {totalHot}</strong>
              <span>{text.received}</span>
            </div>
          </div>

          <section id="settings" className="dilz-account-settings" aria-labelledby="account-settings-title">
            <div className="dilz-account-settings__header">
              <div>
                <h2 id="account-settings-title">{text.settings}</h2>
                <p>{text.settingsHelp}</p>
              </div>
              {preferenceSaved && <span role="status">{text.saved}</span>}
            </div>

            <fieldset className="dilz-preference-group">
              <legend>{text.language}</legend>
              <div className="dilz-preference-options">
                {[['en', text.english], ['he', text.hebrew]].map(([value, label]) => (
                  <button key={value} type="button" className={lang === value ? 'is-selected' : ''} aria-pressed={lang === value} onClick={() => changeLanguage(value)}>{label}</button>
                ))}
              </div>
            </fieldset>

            <fieldset className="dilz-preference-group">
              <legend>{text.feedOrder}</legend>
              <div className="dilz-preference-options dilz-preference-options--stacked">
                {[['hot', text.hot], ['latest', text.latest], ['comments', text.comments]].map(([value, label]) => (
                  <button key={value} type="button" className={feedPreference === value ? 'is-selected' : ''} aria-pressed={feedPreference === value} onClick={() => changeFeedPreference(value)}>
                    <span>{label}</span><span className="dilz-preference-check" aria-hidden="true">✓</span>
                  </button>
                ))}
              </div>
            </fieldset>
          </section>

          <section className="dilz-profile-legal" aria-labelledby="legal-title">
            <h2 id="legal-title">{safetyText.legal}</h2>
            <div>
              <Link href="/privacy">{safetyText.privacy}</Link>
              <Link href="/terms">{safetyText.terms}</Link>
            </div>
          </section>

          <section className="dilz-account-danger" aria-labelledby="delete-account-title">
            <h2 id="delete-account-title">{safetyText.danger}</h2>
            <p>{safetyText.dangerHelp}</p>
            {!showDeleteConfirm ? (
              <button type="button" className="dilz-button dilz-button--danger dilz-button--md" onClick={() => setShowDeleteConfirm(true)}>
                {safetyText.delete}
              </button>
            ) : (
              <div className="dilz-delete-confirm">
                <strong>{safetyText.confirmTitle}</strong>
                <p>{safetyText.confirmHelp}</p>
                <input
                  className="dilz-input"
                  value={deleteConfirmation}
                  onChange={(event) => setDeleteConfirmation(event.target.value)}
                  placeholder={safetyText.confirmWord}
                  autoComplete="off"
                />
                {deleteError && <p className="dilz-form-error" role="alert">{deleteError}</p>}
                <div className="dilz-delete-confirm__actions">
                  <button type="button" className="dilz-button dilz-button--ghost dilz-button--md" onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmation(''); setDeleteError(''); }} disabled={deleting}>
                    {safetyText.cancel}
                  </button>
                  <button type="button" className="dilz-button dilz-button--danger dilz-button--md" onClick={deleteAccount} disabled={deleting || deleteConfirmation !== 'DELETE'}>
                    {deleting ? safetyText.deleting : safetyText.delete}
                  </button>
                </div>
              </div>
            )}
          </section>

          <h2 className="dilz-profil-section-title">{text.mine}</h2>

          {loading ? (
            <div className="dilz-loading-state">
              <div className="dilz-spinner" />
              <p>{text.loading}</p>
            </div>
          ) : deals.length === 0 ? (
            <div className="dilz-empty-state">
              <span className="dilz-empty-state__icon"><ShoppingBagIcon /></span>
              <p className="dilz-empty-state__title">{text.empty}</p>
              <p className="dilz-empty-state__text">{text.emptyText}</p>
              <Link href="/" className="dilz-button dilz-button--primary dilz-button--md">
                {text.post}
              </Link>
            </div>
          ) : (
            <div className="dilz-profil-deals">
              {deals.map((deal) => {
                const reduction = deal.prix_original
                  ? Math.round((deal.prix_original - deal.prix) / deal.prix_original * 100)
                  : null;
                return (
                  <Link key={deal.id} href={`/deal/${deal.id}`} className="dilz-profil-deal-row">
                    <div className="dilz-profil-deal-row__thumb">
                      {deal.image_url ? (
                        <img src={deal.image_url} alt={deal.titre} />
                      ) : (
                        <span aria-hidden="true"><ShoppingBagIcon /></span>
                      )}
                    </div>
                    <div className="dilz-profil-deal-row__body">
                      <p className="dilz-profil-deal-row__title">{deal.titre}</p>
                      <div className="dilz-profil-deal-row__meta">
                        <strong>&#8362;{deal.prix}</strong>
                        {reduction && <span className="dilz-badge dilz-badge--saving">-{reduction}%</span>}
                        <span>{timeAgo(deal.created_at, text)}</span>
                      </div>
                    </div>
                    <div className="dilz-profil-deal-row__votes">
                      <VoteEmoji type="chaud" /> {deal.votes_chaud || 0}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </>
  );
}

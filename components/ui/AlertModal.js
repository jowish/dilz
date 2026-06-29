import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { registerNativePushToken } from '../../lib/nativeApp';
import { CityPicker } from './CityPicker';
import { cityDisplayName } from '../../lib/israelCities';

function alertSummary(a, lang) {
  const parts = [];
  if (a.city) parts.push(cityDisplayName(a.city, lang));
  if (a.online_only) parts.push('Online');
  if (a.min_discount_percent != null) parts.push(`-${a.min_discount_percent}%+`);
  if (a.keyword) parts.push(`"${a.keyword}"`);
  return parts.join(' · ') || 'All new deals';
}

export function AlertModal({ user, lang, villes = [], onClose }) {
  const [activeTab, setActiveTab] = useState('list');
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ city: '', online_only: false, min_discount_percent: '', keyword: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [followUsers, setFollowUsers] = useState([]);
  const [followLoading, setFollowLoading] = useState(true);
  const followedUsers = followUsers.filter((candidate) => candidate.is_following);

  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => {
      window.removeEventListener('keydown', esc);
    };
  }, [onClose]);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { setLoading(false); return; }
      Promise.all([
        fetch('/api/alerts', { headers: { Authorization: `Bearer ${data.session.access_token}` } }).then((r) => r.json()),
        fetch('/api/user-follows', { headers: { Authorization: `Bearer ${data.session.access_token}` } }).then((r) => r.json()),
      ]).then(([alertData, followData]) => {
        setAlerts(alertData.alerts || []);
        setFollowUsers(followData.users || []);
      }).finally(() => {
        setLoading(false);
        setFollowLoading(false);
      });
    });
  }, [user]);

  const handleCreate = async () => {
    setSaving(true);
    setError('');
    const { data } = await supabase.auth.getSession();
    if (!data.session) { setError('Session expired.'); setSaving(false); return; }

    const body = {
      city: form.city || null,
      online_only: form.online_only,
      min_discount_percent: form.min_discount_percent !== '' ? Number(form.min_discount_percent) : null,
      keyword: form.keyword.trim() || null,
    };

    const nativePushRegistered = await registerNativePushToken(data.session.access_token).catch(() => false);

    if (!nativePushRegistered && 'Notification' in window && Notification.permission === 'default') {
      const perm = await Notification.requestPermission().catch(() => 'denied');
      if (perm === 'granted' && 'serviceWorker' in navigator) {
        try {
          const reg = await navigator.serviceWorker.ready;
          const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
          if (vapidKey) {
            const sub = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: vapidKey,
            });
            const k = sub.getKey('p256dh');
            const a = sub.getKey('auth');
            await fetch('/api/push-subscription', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}` },
              body: JSON.stringify({
                endpoint: sub.endpoint,
                p256dh: k ? btoa(String.fromCharCode(...new Uint8Array(k))) : '',
                auth: a ? btoa(String.fromCharCode(...new Uint8Array(a))) : '',
              }),
            }).catch(() => {});
          }
        } catch {}
      }
    }

    const res = await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}` },
      body: JSON.stringify(body),
    });
    const result = await res.json();
    if (!res.ok) { setError(result.erreur || 'Could not create alert.'); setSaving(false); return; }
    setAlerts((prev) => [result.alert, ...prev]);
    setForm({ city: '', online_only: false, min_discount_percent: '', keyword: '' });
    setActiveTab('list');
    setSaving(false);
  };

  const handleToggle = async (alert) => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return;
    await fetch('/api/alerts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}` },
      body: JSON.stringify({ id: alert.id, is_active: !alert.is_active }),
    });
    setAlerts((prev) => prev.map((a) => a.id === alert.id ? { ...a, is_active: !a.is_active } : a));
  };

  const handleDelete = async (id) => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return;
    await fetch(`/api/alerts?id=${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${data.session.access_token}` },
    });
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const useSuggestion = (keyword) => {
    setField('keyword', keyword);
    setActiveTab('new');
  };

  const toggleFollow = async (candidate) => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return;
    setFollowUsers((current) => current.map((item) => item.id === candidate.id ? { ...item, is_following: !item.is_following } : item));
    const response = await fetch('/api/user-follows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}` },
      body: JSON.stringify({ followed_user_id: candidate.id, followed_name: candidate.name }),
    });
    if (!response.ok) {
      setFollowUsers((current) => current.map((item) => item.id === candidate.id ? { ...item, is_following: candidate.is_following } : item));
    }
  };

  return (
    <div className="dilz-alert-page" aria-label="My alerts">
      <div className="dilz-alert-page__panel">
        <div className="dilz-sheet__header">
          <h2 className="dilz-sheet__title">{lang !== 'he' ? 'My Alerts' : 'ההתראות שלי'}</h2>
          <button type="button" className="dilz-sheet__close" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <section className="dilz-alert-suggestions" aria-labelledby="alert-suggestions-title">
          <div className="dilz-alert-section-heading">
            <h3 id="alert-suggestions-title">{lang !== 'he' ? 'Popular alerts' : 'התראות פופולריות'}</h3>
            <span>{lang !== 'he' ? 'Start with a common search' : 'התחילו מחיפוש נפוץ'}</span>
          </div>
          <p className="dilz-alert-value">{lang !== 'he' ? 'Tell us what you want. Dilz watches the market and lets you know when a matching deal appears.' : 'ספרו לנו מה אתם מחפשים. Dilz יעקוב ויעדכן כשיופיע דיל מתאים.'}</p>
          <div className="dilz-alert-suggestion-list">
            {['PS5', 'Nintendo Switch 2', 'iPhone', 'MacBook', lang !== 'he' ? 'Fan' : 'מאוורר', 'KSP', 'Rami Levy', 'Shufersal'].map((keyword) => (
              <button type="button" key={keyword} onClick={() => useSuggestion(keyword)}>{keyword}</button>
            ))}
          </div>
        </section>

        <div className="dilz-segmented" role="tablist" aria-label="Alert sections">
          {[['list', lang !== 'he' ? 'My alerts' : 'ההתראות שלי'], ['new', lang !== 'he' ? '+ New alert' : '+ התראה חדשה']].map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={activeTab === id}
              className={activeTab === id ? 'is-active' : ''}
              onClick={() => setActiveTab(id)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="dilz-alert-modal__body">
          {activeTab === 'list' && (
            <>
            {loading ? (
              <div className="dilz-empty-state">
                <div className="dilz-spinner" />
              </div>
            ) : alerts.length === 0 ? (
              <div className="dilz-empty-state">
                <p className="dilz-empty-state__title">{lang !== 'he' ? 'No alerts yet' : 'אין התראות עדיין'}</p>
                <p className="dilz-empty-state__text">
                  {lang !== 'he'
                    ? 'Create an alert to get notified when new deals match your criteria.'
                    : 'צור התראה כדי לקבל עדכונים על דילים חדשים.'}
                </p>
                <button type="button" className="dilz-button dilz-button--primary dilz-button--md" onClick={() => setActiveTab('new')}>
                  {lang !== 'he' ? 'Create your first alert' : 'צור את ההתראה הראשונה שלך'}
                </button>
              </div>
            ) : (
              <div className="dilz-alert-list">
                {alerts.map((a) => (
                  <div key={a.id} className={['dilz-alert-item', !a.is_active && 'is-paused'].filter(Boolean).join(' ')}>
                    <p className="dilz-alert-item__summary">{alertSummary(a, lang)}</p>
                    <div className="dilz-alert-item__actions">
                      <button
                        type="button"
                        className={['dilz-button dilz-button--sm', a.is_active ? 'dilz-button--soft' : 'dilz-button--secondary'].filter(Boolean).join(' ')}
                        onClick={() => handleToggle(a)}
                      >
                        {a.is_active ? (lang !== 'he' ? 'Active' : 'פעיל') : (lang !== 'he' ? 'Paused' : 'מושהה')}
                      </button>
                      <button
                        type="button"
                        className="dilz-button dilz-button--danger dilz-button--sm"
                        onClick={() => handleDelete(a.id)}
                      >
                        {lang !== 'he' ? 'Delete' : 'מחק'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <section className="dilz-follow-section" aria-labelledby="follow-users-title">
              <div className="dilz-alert-section-heading">
                <h3 id="follow-users-title">{lang !== 'he' ? 'Follow Dilz members' : 'מעקב אחרי חברי Dilz'}</h3>
                <span>{lang !== 'he' ? 'Get an alert when they publish' : 'קבלו התראה כשהם מפרסמים'}</span>
              </div>
              {!followLoading && followedUsers.length > 0 && (
                <div className="dilz-following-summary" aria-label={lang !== 'he' ? 'People you follow' : 'מי שאתם עוקבים אחריו'}>
                  <strong>{lang !== 'he' ? 'You follow' : 'אתם עוקבים אחרי'}</strong>
                  <div>
                    {followedUsers.map((candidate) => (
                      <span key={candidate.id}>{candidate.name}</span>
                    ))}
                  </div>
                </div>
              )}
              {followLoading ? <div className="dilz-spinner" /> : followUsers.length === 0 ? (
                <p className="dilz-empty-state__text">{lang !== 'he' ? 'Authors will appear here as new Dilz are published.' : 'כותבים יופיעו כאן עם פרסום דילז חדשים.'}</p>
              ) : (
                <div className="dilz-follow-list">
                  {followUsers.slice(0, 20).map((candidate) => (
                    <div className="dilz-follow-user" key={candidate.id}>
                      <span className="dilz-follow-user__avatar">{candidate.name.slice(0, 2).toUpperCase()}</span>
                      <strong>{candidate.name}</strong>
                      <button type="button" className={candidate.is_following ? 'is-following' : ''} aria-pressed={candidate.is_following} onClick={() => toggleFollow(candidate)}>
                        {candidate.is_following ? (lang !== 'he' ? 'Following' : 'במעקב') : (lang !== 'he' ? 'Follow' : 'מעקב')}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
            </>
          )}

          {activeTab === 'new' && (
            <div className="dilz-form-grid">
              <div className="dilz-field dilz-alert-city-field">
                <label className="dilz-field__label">{lang !== 'he' ? 'City (optional)' : 'עיר (אופציונלי)'}</label>
                <CityPicker
                  value={form.city}
                  cities={villes}
                  lang={lang}
                  onChange={(city) => setField('city', city)}
                />
              </div>

              <label className="dilz-toggle-row">
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.online_only}
                  className={['dilz-toggle', form.online_only && 'is-on'].filter(Boolean).join(' ')}
                  onClick={() => setField('online_only', !form.online_only)}
                />
                <span>{lang !== 'he' ? 'Online deals only' : 'דילים אונליין בלבד'}</span>
              </label>

              <div className="dilz-field">
                <label className="dilz-field__label">{lang !== 'he' ? 'Minimum discount % (optional)' : 'הנחה מינימלית % (אופציונלי)'}</label>
                <input
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="dilz-input"
                  min="0"
                  max="100"
                  placeholder={lang !== 'he' ? 'e.g. 30' : 'לדוגמה 30'}
                  value={form.min_discount_percent}
                  onChange={(e) => setField('min_discount_percent', e.target.value)}
                />
              </div>

              <div className="dilz-field">
                <label className="dilz-field__label">{lang !== 'he' ? 'Keyword (optional)' : 'מילת מפתח (אופציונלי)'}</label>
                <input
                  type="text"
                  className="dilz-input"
                  placeholder={lang !== 'he' ? 'e.g. Nike, iPhone, pizza' : 'לדוגמה: נייקי, אייפון, פיצה'}
                  value={form.keyword}
                  onChange={(e) => setField('keyword', e.target.value)}
                />
              </div>

              {error && <p className="dilz-form-error">{error}</p>}

              <div className="dilz-alert-modal__submit">
                <button type="button" className="dilz-button dilz-button--primary dilz-button--md" disabled={saving} onClick={handleCreate}>
                  {saving ? (lang !== 'he' ? 'Creating...' : 'יוצר...') : (lang !== 'he' ? 'Create alert' : 'צור התראה')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

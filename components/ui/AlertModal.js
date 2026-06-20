import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { registerNativePushToken } from '../../lib/nativeApp';
import { CityPicker } from './CityPicker';

function alertSummary(a) {
  const parts = [];
  if (a.city) parts.push(a.city);
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

  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', esc);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { setLoading(false); return; }
      fetch('/api/alerts', { headers: { Authorization: `Bearer ${data.session.access_token}` } })
        .then((r) => r.json())
        .then((d) => { setAlerts(d.alerts || []); setLoading(false); })
        .catch(() => setLoading(false));
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

  return (
    <div className="dilz-sheet-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="My alerts">
      <div className="dilz-sheet dilz-alert-modal" onClick={(e) => e.stopPropagation()}>
        <div className="dilz-sheet__handle" aria-hidden="true" />
        <div className="dilz-sheet__header">
          <h2 className="dilz-sheet__title">{lang !== 'he' ? 'My Alerts' : 'ההתראות שלי'}</h2>
          <button type="button" className="dilz-sheet__close" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

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
            loading ? (
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
                    <p className="dilz-alert-item__summary">{alertSummary(a)}</p>
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
            )
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

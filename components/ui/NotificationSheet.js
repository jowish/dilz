import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';

function timeAgoShort(date) {
  const d = Date.now() - new Date(date).getTime();
  const m = Math.floor(d / 60000);
  const h = Math.floor(d / 3600000);
  const days = Math.floor(d / 86400000);
  if (m < 2) return 'now';
  if (m < 60) return `${m}m`;
  if (h < 24) return `${h}h`;
  return `${days}d`;
}

export function NotificationSheet({ user, lang, notifications, onClose, onMarkAllRead, onOpenAlerts }) {
  const router = useRouter();
  const unread = notifications.filter((n) => !n.is_read).length;

  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', esc);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const handleNotifClick = async (notif) => {
    if (!notif.is_read) {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        await fetch('/api/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}` },
          body: JSON.stringify({ id: notif.id }),
        }).catch(() => {});
      }
    }
    onClose();
    router.push(`/deal/${notif.deal_id}`);
  };

  return (
    <div className="dilz-sheet-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={lang !== 'he' ? 'Notifications' : 'התראות'}>
      <div className="dilz-sheet dilz-notification-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="dilz-sheet__header">
          <h2 className="dilz-sheet__title">
            {lang !== 'he' ? 'Notifications' : 'התראות'}
            {unread > 0 && <span className="dilz-notif-badge">{unread}</span>}
          </h2>
          <button type="button" className="dilz-sheet__close" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="dilz-notif-sheet__actions">
          <button
            type="button"
            className="dilz-button dilz-button--soft dilz-button--sm"
            onClick={() => { onClose(); onOpenAlerts(); }}
          >
            {lang !== 'he' ? 'Manage alerts' : 'נהל התראות'}
          </button>
          {unread > 0 && (
            <button
              type="button"
              className="dilz-button dilz-button--secondary dilz-button--sm"
              onClick={onMarkAllRead}
            >
              {lang !== 'he' ? 'Mark all read' : 'סמן הכל כנקרא'}
            </button>
          )}
        </div>

        <div className="dilz-notif-sheet__list">
          {notifications.length === 0 ? (
            <div className="dilz-empty-state">
              <p className="dilz-empty-state__title">{lang !== 'he' ? 'No notifications yet' : 'אין התראות עדיין'}</p>
              <p className="dilz-empty-state__text">
                {lang !== 'he'
                  ? 'Set up alerts to get notified when new deals match your criteria.'
                  : 'הגדר התראות כדי לקבל עדכונים על דילים חדשים.'}
              </p>
              <button
                type="button"
                className="dilz-button dilz-button--primary dilz-button--md"
                onClick={() => { onClose(); onOpenAlerts(); }}
              >
                {lang !== 'he' ? 'Set up alerts' : 'הגדר התראות'}
              </button>
            </div>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                type="button"
                className={['dilz-notif-item', !n.is_read && 'is-unread'].filter(Boolean).join(' ')}
                onClick={() => handleNotifClick(n)}
              >
                <span className="dilz-notif-item__dot" aria-hidden="true" />
                <div className="dilz-notif-item__body">
                  <p className="dilz-notif-item__title">{n.title}</p>
                  <p className="dilz-notif-item__message">{n.message}</p>
                </div>
                <span className="dilz-notif-item__time">{timeAgoShort(n.created_at)}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

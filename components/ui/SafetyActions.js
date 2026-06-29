import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';

const COPY = {
  en: { menu: 'Safety options', report: 'Report', expired: 'Mark as expired', rules: 'Breaks Dilz rules', block: 'Block user', title: 'Report content', reason: 'Reason', details: 'Additional details (optional)', cancel: 'Cancel', send: 'Send report', sending: 'Sending...', sent: 'Report sent', blocked: 'User blocked', error: 'Action failed. Please try again.', confirmBlock: 'Block this user? Their deals and comments will be hidden from your feed.', reasons: { expired: 'Expired deal', rules: 'Does not respect Dilz rules', spam: 'Spam', scam: 'Scam or misleading offer', abuse: 'Harassment or abuse', hate: 'Hateful content', inappropriate: 'Inappropriate content', copyright: 'Copyright infringement', other: 'Other' } },
  he: { menu: 'אפשרויות בטיחות', report: 'דיווח', block: 'חסימת משתמש', title: 'דיווח על תוכן', reason: 'סיבה', details: 'פרטים נוספים (לא חובה)', cancel: 'ביטול', send: 'שליחת דיווח', sending: 'שולח...', sent: 'הדיווח נשלח', blocked: 'המשתמש נחסם', error: 'הפעולה נכשלה. נסו שוב.', confirmBlock: 'לחסום משתמש זה? הדילים והתגובות שלו יוסתרו מהפיד שלכם.', reasons: { spam: 'ספאם', scam: 'הונאה או הצעה מטעה', abuse: 'הטרדה או פגיעה', hate: 'תוכן שנאה', inappropriate: 'תוכן בלתי הולם', copyright: 'הפרת זכויות יוצרים', other: 'אחר' } },
};

export function SafetyActions({ contentType, contentId, authorId, currentUserId, lang = 'en', onBlocked }) {
  const router = useRouter();
  const text = COPY[lang] || COPY.en;
  const [open, setOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState('spam');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState('');
  const canBlock = authorId && authorId !== currentUserId;

  const authenticatedRequest = async (body) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push(`/auth?redirect=${encodeURIComponent(router.asPath)}`);
      return null;
    }
    return fetch('/api/safety', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(body),
    });
  };

  const reportWithReason = async (nextReason) => {
    setReason(nextReason);
    setSubmitting(true);
    setStatus('');
    try {
      const response = await authenticatedRequest({ action: 'report', contentType, contentId, reason: nextReason, details: '' });
      if (!response) return;
      if (!response.ok) throw new Error('report_failed');
      setStatus(text.sent);
      window.setTimeout(() => { setOpen(false); setStatus(''); }, 1200);
    } catch {
      setStatus(text.error);
    } finally {
      setSubmitting(false);
    }
  };

  const submitReport = async () => {
    setSubmitting(true);
    setStatus('');
    try {
      const response = await authenticatedRequest({ action: 'report', contentType, contentId, reason, details });
      if (!response) return;
      if (!response.ok) throw new Error('report_failed');
      setStatus(text.sent);
      window.setTimeout(() => { setReporting(false); setOpen(false); setStatus(''); }, 1200);
    } catch {
      setStatus(text.error);
    } finally {
      setSubmitting(false);
    }
  };

  const blockUser = async () => {
    if (!canBlock || !window.confirm(text.confirmBlock)) return;
    setSubmitting(true);
    try {
      const response = await authenticatedRequest({ action: 'block', blockedUserId: authorId });
      if (!response) return;
      if (!response.ok) throw new Error('block_failed');
      setStatus(text.blocked);
      setOpen(false);
      onBlocked?.(authorId);
    } catch {
      setStatus(text.error);
    } finally {
      setSubmitting(false);
    }
  };

  if (authorId && authorId === currentUserId) return null;

  return (
    <div className="dilz-safety-actions" onClick={(event) => event.stopPropagation()}>
      <button type="button" className="dilz-safety-actions__trigger" aria-label={text.menu} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <span aria-hidden="true">...</span>
      </button>
      {open && !reporting && (
        <div className="dilz-safety-actions__menu">
          {contentType === 'deal' && <button type="button" onClick={() => reportWithReason('expired')} disabled={submitting}>{text.expired || COPY.en.expired}</button>}
          {contentType === 'deal' && <button type="button" onClick={() => reportWithReason('rules')} disabled={submitting}>{text.rules || COPY.en.rules}</button>}
          <button type="button" onClick={() => setReporting(true)}>{text.report}</button>
          {canBlock && <button type="button" onClick={blockUser} disabled={submitting}>{text.block}</button>}
        </div>
      )}
      {reporting && (
        <div className="dilz-safety-modal" role="dialog" aria-modal="true" aria-labelledby={`report-title-${contentType}-${contentId}`}>
          <button type="button" className="dilz-safety-modal__backdrop" aria-label={text.cancel} onClick={() => setReporting(false)} />
          <div className="dilz-safety-modal__panel">
            <h2 id={`report-title-${contentType}-${contentId}`}>{text.title}</h2>
            <label>
              <span>{text.reason}</span>
              <select className="dilz-input" value={reason} onChange={(event) => setReason(event.target.value)}>
                {Object.entries(text.reasons).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label>
              <span>{text.details}</span>
              <textarea className="dilz-input" maxLength={1000} rows={4} value={details} onChange={(event) => setDetails(event.target.value)} />
            </label>
            {status && <p className="dilz-safety-modal__status" role="status">{status}</p>}
            <div className="dilz-safety-modal__actions">
              <button type="button" className="dilz-button dilz-button--ghost dilz-button--md" onClick={() => setReporting(false)}>{text.cancel}</button>
              <button type="button" className="dilz-button dilz-button--primary dilz-button--md" onClick={submitReport} disabled={submitting}>{submitting ? text.sending : text.send}</button>
            </div>
          </div>
        </div>
      )}
      {status && !reporting && <span className="dilz-safety-actions__status" role="status">{status}</span>}
    </div>
  );
}

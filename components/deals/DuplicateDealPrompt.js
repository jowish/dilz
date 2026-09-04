import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { formatDealPrice, getDealDiscount } from '../../lib/dealPresentation';
import { optimizedImageUrl } from '../../lib/imageUrl';

// Shown before publishing when the deal being posted looks like one that is
// already on Dilz (P0.3). Nothing is deleted or overwritten here — the author
// chooses what happens next.

const TEXT = {
  en: {
    title: 'This deal may already exist',
    subtitle: 'We found something very similar. Confirming the existing deal helps everyone more than a second copy.',
    view: 'View existing deal',
    confirm: 'Confirm this deal',
    confirming: 'Confirming…',
    confirmed: 'Thanks — the existing deal is now marked as verified today.',
    addInfo: 'Add information',
    postAnyway: 'Post anyway',
    signIn: 'Sign in to confirm',
    failed: 'Could not confirm that. Try again.',
    reasons: {
      same_url: 'Same link',
      same_store: 'Same store',
      similar_title: 'Nearly the same title',
      somewhat_similar_title: 'Similar title',
      same_price: 'Same price',
    },
  },
  he: {
    title: 'ייתכן שהדיל הזה כבר קיים',
    subtitle: 'מצאנו דיל דומה מאוד. אישור הדיל הקיים עוזר יותר מיצירת עותק נוסף.',
    view: 'הצגת הדיל הקיים',
    confirm: 'אישור הדיל הזה',
    confirming: 'מאשר…',
    confirmed: 'תודה — הדיל הקיים סומן כמאומת היום.',
    addInfo: 'הוספת מידע',
    postAnyway: 'לפרסם בכל זאת',
    signIn: 'התחברו כדי לאשר',
    failed: 'האישור נכשל. נסו שוב.',
    reasons: {
      same_url: 'אותו קישור',
      same_store: 'אותה חנות',
      similar_title: 'כותרת כמעט זהה',
      somewhat_similar_title: 'כותרת דומה',
      same_price: 'אותו מחיר',
    },
  },
};

export function DuplicateDealPrompt({ matches = [], lang = 'en', onPostAnyway, onDone, allowPostAnyway = true }) {
  const router = useRouter();
  const text = TEXT[lang === 'he' ? 'he' : 'en'];
  const [confirmingId, setConfirmingId] = useState(null);
  const [confirmedId, setConfirmedId] = useState(null);
  const [error, setError] = useState('');

  if (!matches.length) return null;

  // Confirming an existing deal feeds its freshness data instead of creating a
  // second feed item — the whole point of the prompt.
  const confirmExisting = async (dealId) => {
    setConfirmingId(dealId);
    setError('');
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push(`/auth?redirect=${encodeURIComponent(router.asPath)}`);
        return;
      }
      const response = await fetch('/api/deal-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}` },
        body: JSON.stringify({ deal_id: dealId, available: true }),
      });
      if (!response.ok) {
        setError(text.failed);
        return;
      }
      setConfirmedId(dealId);
    } catch {
      setError(text.failed);
    } finally {
      setConfirmingId(null);
    }
  };

  return (
    <div className="dilz-duplicate-prompt">
      <div className="dilz-duplicate-prompt__header">
        <h3>{text.title}</h3>
        <p>{text.subtitle}</p>
      </div>

      <div className="dilz-duplicate-prompt__list">
        {matches.map(({ deal, reasons = [], confidence }) => {
          const discount = getDealDiscount(deal);
          return (
            <div key={deal.id} className="dilz-duplicate-card">
              <div className="dilz-duplicate-card__media" aria-hidden="true">
                {deal.image_url
                  ? <img src={optimizedImageUrl(deal.image_url, { width: 256, quality: 70 })} alt="" loading="lazy" decoding="async" />
                  : <span className="dilz-duplicate-card__media-fallback" />}
              </div>

              <div className="dilz-duplicate-card__body">
                <strong className="dilz-duplicate-card__title">{deal.titre}</strong>
                <span className="dilz-duplicate-card__meta">
                  {[deal.magasin, formatDealPrice(deal, lang), discount !== null ? `-${discount}%` : null]
                    .filter(Boolean).join(' · ')}
                </span>
                <span className="dilz-duplicate-card__reasons">
                  {reasons
                    .map((reason) => text.reasons[reason])
                    .filter(Boolean)
                    .map((label) => <span key={label} className="dilz-duplicate-card__reason">{label}</span>)}
                </span>
              </div>

              <div className="dilz-duplicate-card__actions">
                {confirmedId === deal.id ? (
                  <p className="dilz-duplicate-card__confirmed" role="status">{text.confirmed}</p>
                ) : (
                  <>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => confirmExisting(deal.id)}
                      disabled={confirmingId === deal.id}
                    >
                      {confirmingId === deal.id ? text.confirming : text.confirm}
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => router.push(`/deal/${deal.id}`)}>
                      {text.view}
                    </Button>
                    {/* "Add information" takes the author to the existing deal
                        with its comment box focused, so their extra detail
                        lands on the deal people already found. */}
                    <Button variant="ghost" size="sm" onClick={() => router.push(`/deal/${deal.id}?add_info=1`)}>
                      {text.addInfo}
                    </Button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {error && <p className="dilz-field__error">{error}</p>}

      <div className="dilz-duplicate-prompt__footer">
        {confirmedId ? (
          <Button variant="primary" onClick={onDone}>{lang === 'he' ? 'סיום' : 'Done'}</Button>
        ) : allowPostAnyway ? (
          <button type="button" className="dilz-duplicate-prompt__post-anyway" onClick={onPostAnyway}>
            {text.postAnyway}
          </button>
        ) : null}
      </div>
    </div>
  );
}

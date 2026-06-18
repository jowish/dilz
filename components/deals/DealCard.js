import { useRouter } from 'next/router';
import { Badge } from '../ui/Badge';
import { Button, IconButton } from '../ui/Button';

function getDiscount(deal) {
  const original = Number(deal.prix_original);
  const current = Number(deal.prix);
  if (!original || !current || original <= current) return null;
  return Math.round(((original - current) / original) * 100);
}

function formatPrice(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  return n % 1 === 0 ? n.toLocaleString('en-US') : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function timeRemaining(dateFin) {
  if (!dateFin) return null;
  const end = new Date(String(dateFin).slice(0, 10) + 'T23:59:59');
  const days = Math.ceil((end.getTime() - Date.now()) / 86400000);
  if (days < 0) return 'Expired';
  if (days === 0) return 'Ends today';
  if (days <= 3) return `Ends in ${days}d`;
  return `Ends ${end.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`;
}

function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'Just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function DealCard({
  deal,
  onVote,
  votedDeal,
  user,
  isSaved,
  onSave,
  translateCity,
  lang = 'en',
  layout = 'card',
}) {
  const router = useRouter();
  const discount = getDiscount(deal);
  const ending = timeRemaining(deal.date_fin);
  const isOwner = user && user.id === deal.auteur_id;
  const isOnline = deal.ville === 'Online' || deal.categorie === 'Online' || /online/i.test(String(deal.ville || ''));
  const trust = deal.auteur_nom === 'DilzCurator' || deal.auteur_nom === 'DilzBot' ? 'Store promo' : 'Community find';
  const authorName = deal.auteur_nom || (isOwner ? 'You' : 'Dilz member');
  const city = deal.ville && !isOnline
    ? (translateCity ? translateCity(deal.ville, lang === 'he' ? 'he' : 'en') : deal.ville)
    : 'Online';

  const go = () => {
    try {
      sessionStorage.setItem('dilzReturnTab', 'deals');
      sessionStorage.setItem('dilzScrollY', String(window.scrollY));
    } catch {}
    router.push(`/deal/${deal.id}`);
  };

  return (
    <article className={['dilz-card', 'dilz-deal-card', layout === 'list' && 'is-list'].filter(Boolean).join(' ')} onClick={go}>
      <div className="dilz-deal-card__media">
        {deal.image_url ? (
          <img src={deal.image_url} alt={deal.titre} onError={(event) => { event.currentTarget.style.display = 'none'; }} />
        ) : (
          <div className="dilz-deal-card__image-fallback" aria-hidden="true">
            <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M4 7h16v13H4z" />
              <path d="M8 7a4 4 0 0 1 8 0" />
            </svg>
          </div>
        )}
        <div className="dilz-deal-card__overlay dilz-deal-card__overlay--top">
          {discount !== null && (
            <Badge tone={discount >= 30 ? 'saving-strong' : 'saving'}>-{discount}%</Badge>
          )}
          {ending && ending.toLowerCase().includes('ends') && <Badge tone="danger">{ending}</Badge>}
        </div>
        <div className="dilz-deal-card__save">
          {onSave && (
            <IconButton
              aria-label={isSaved ? 'Unsave deal' : 'Save deal'}
              selected={isSaved}
              onClick={(event) => {
                event.stopPropagation();
                onSave();
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                <path d="M19 21 12 17 5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16Z" />
              </svg>
            </IconButton>
          )}
        </div>
        <div className="dilz-deal-card__trust">
          <Badge tone={trust === 'Store promo' ? 'brand' : 'neutral'}>{trust}</Badge>
        </div>
      </div>

      <div className="dilz-deal-card__body">
        <div className="dilz-deal-card__store-row">
          <strong>{deal.magasin}</strong>
          <span>{city}</span>
          {isOwner && <span>My deal</span>}
        </div>
        <h3>{deal.titre}</h3>
        <p className="dilz-deal-card__author">
          {lang === 'he' ? 'שותף על ידי' : 'Shared by'} <strong>{authorName}</strong>
        </p>
        {deal.description && (
          <p className="dilz-deal-card__description">{deal.description}</p>
        )}
        <div className="dilz-deal-card__price-row">
          <strong>{formatPrice(deal.prix)} ₪</strong>
          {deal.prix_original && <span>{formatPrice(deal.prix_original)} ₪</span>}
        </div>
        <div className="dilz-deal-card__meta">
          <span>{deal.categorie || 'Deal'}</span>
          <span>{ending || timeAgo(deal.created_at)}</span>
          <span>{isOnline ? 'Online' : 'In-store'}</span>
        </div>
        <div className="dilz-deal-card__actions" onClick={(event) => event.stopPropagation()}>
          <div className="dilz-vote-pill" aria-label="Vote controls">
            <button
              type="button"
              className={votedDeal === 'chaud' ? 'is-up' : ''}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onVote(deal.id, 'chaud');
              }}
              aria-label="Mark as hot"
            >
              <span aria-hidden="true">🔥</span> <span>{deal.votes_chaud || 0}</span>
            </button>
            <button
              type="button"
              className={votedDeal === 'froid' ? 'is-down' : ''}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onVote(deal.id, 'froid');
              }}
              aria-label="Mark as cold"
            >
              <span aria-hidden="true">❄</span> <span>{deal.votes_froid || 0}</span>
            </button>
          </div>
          <div className="dilz-deal-card__right-actions">
            <IconButton aria-label="Share deal" onClick={() => navigator.share?.({ title: deal.titre, url: `/deal/${deal.id}` }).catch(() => {})}>
              <ShareIcon />
            </IconButton>
            <Button variant="soft" size="sm" onClick={go}>View deal</Button>
          </div>
        </div>
      </div>
    </article>
  );
}

function ShareIcon() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" /></svg>;
}

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
  isAdmin = false,
  onAdminDelete,
}) {
  const router = useRouter();
  const discount = getDiscount(deal);
  const ending = timeRemaining(deal.date_fin);
  const isOwner = user && user.id === deal.auteur_id;
  const isOnline = deal.ville === 'Online' || deal.categorie === 'Online' || /online/i.test(String(deal.ville || ''));
  const trust = deal.auteur_nom === 'DilzCurator' || deal.auteur_nom === 'DilzBot' ? 'Store promo' : 'Community find';
  const authorName = deal.auteur_nom || (isOwner ? 'You' : 'Dilz member');
  const commentCount = Number(deal.commentaires?.[0]?.count || deal.comments_count || 0);
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
        {isAdmin && (
          <div className="dilz-deal-card__admin-badge">
            <Badge tone="brand">Admin</Badge>
          </div>
        )}
      </div>

      <div className="dilz-deal-card__body">
        {isAdmin && (
          <div className="dilz-admin-controls" onClick={(event) => event.stopPropagation()}>
            <span>Admin tools</span>
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onAdminDelete?.(deal.id);
              }}
            >
              Delete
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                window.open('/admin', '_blank', 'noopener,noreferrer');
              }}
            >
              Edit
            </button>
          </div>
        )}
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
          <span className="dilz-deal-card__comment-meta">
            <CommentIcon /> {commentCount}
          </span>
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
              <HotIcon /> <span>{deal.votes_chaud || 0}</span>
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
              <ColdIcon /> <span>{deal.votes_froid || 0}</span>
            </button>
          </div>
          <div className="dilz-deal-card__right-actions">
            <IconButton
              aria-label={`${commentCount} comments`}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                go();
              }}
            >
              <CommentIcon />
              <span className="dilz-comment-count">{commentCount}</span>
            </IconButton>
            <IconButton aria-label="Share deal" onClick={() => navigator.share?.({ title: deal.titre, url: `/deal/${deal.id}` }).catch(() => {})}>
              <ShareIcon />
            </IconButton>
          </div>
        </div>
      </div>
    </article>
  );
}

function HotIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2c0 0-4.5 5.5-4.5 10a4.5 4.5 0 0 0 9 0C16.5 7.5 12 2 12 2zm0 13a2.5 2.5 0 0 1-2.5-2.5C9.5 10 12 6.5 12 6.5S14.5 10 14.5 12.5A2.5 2.5 0 0 1 12 15z"/></svg>;
}

function ColdIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="2" x2="12" y2="22"/><path d="m20 10-8-8-8 8"/><path d="m20 14-8 8-8-8"/><line x1="2" y1="12" x2="22" y2="12"/><path d="m18 6-6 6-6-6"/><path d="m18 18-6-6-6 6"/></svg>;
}

function CommentIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" /></svg>;
}

function ShareIcon() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" /></svg>;
}

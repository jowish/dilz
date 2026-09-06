import { useState } from 'react';
import { useRouter } from 'next/router';
import { Badge } from '../ui/Badge';
import { Button, IconButton } from '../ui/Button';
import { CopyToast } from '../ui/CopyToast';
import { VoteEmoji } from '../ui/VoteEmoji';
import { copyText } from '../../lib/copyText';
import { SafetyActions } from '../ui/SafetyActions';
import { ShareMenu } from '../ui/ShareMenu';
import { timeRemaining, timeAgo } from '../../lib/dealCard.js';
import { optimizedImageUrl } from '../../lib/imageUrl';
import {
  availabilityLabel,
  formatDealPrice,
  formatOriginalPrice,
  getDealDiscount,
  isFreeDeal,
  locationLabel,
} from '../../lib/dealPresentation';
import { EXPIRED, deriveLifecycle, lifecycleLabel } from '../../lib/dealLifecycle';
import { TIER_LABELS } from '../../lib/points';

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
  onOwnerDelete,
  onBlocked,
  // Set on the handful of cards that are above the fold so their photo isn't
  // deferred — everything below stays lazy.
  priority = false,
}) {
  const router = useRouter();
  const text = lang === 'he'
    ? { storePromo: 'מבצע חנות', community: 'מהקהילה', you: 'אתם', member: 'חבר Dilz', online: 'אונליין', myDeal: 'הדיל שלי', shared: 'שותף על ידי', deal: 'דיל', inStore: 'בחנות', voteControls: 'כפתורי הצבעה', hot: 'סימון כחם', cold: 'סימון כקר', unsave: 'הסרה מהשמורים', save: 'שמירת הדיל', comments: 'תגובות', sponsored: 'ממומן', viewDeal: 'לצפייה בדיל' }
    : { storePromo: 'Store promo', community: 'Community find', you: 'You', member: 'Dilz member', online: 'Online', myDeal: 'My deal', shared: 'Shared by', deal: 'Deal', inStore: 'In-store', voteControls: 'Vote controls', hot: 'Mark as hot', cold: 'Mark as cold', unsave: 'Unsave deal', save: 'Save deal', comments: 'comments', sponsored: 'Sponsored', viewDeal: 'View deal' };
  const [copied, setCopied] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const isAd = Boolean(deal.is_ad);
  const images = [...new Set([...(Array.isArray(deal.image_urls) ? deal.image_urls : []), deal.image_url].filter(Boolean))].slice(0, 3);
  const primaryImage = images[0] || null;
  const discount = getDealDiscount(deal);
  const ending = timeRemaining(deal.date_fin, lang);
  const isOwner = user && user.id === deal.auteur_id;
  const isFree = isFreeDeal(deal);
  const isStorePromo = deal.auteur_nom === 'DilzCurator' || deal.auteur_nom === 'DilzBot';
  const trust = isStorePromo ? text.storePromo : text.community;
  const authorName = deal.auteur_nom || (isOwner ? text.you : text.member);
  const commentCount = isAd ? 0 : Number(deal.commentaires?.[0]?.count || deal.comments_count || 0);
  const hideShareInRow = layout === 'list' || layout === 'spotlight';
  // The row is the feed's default view, and carries more per card than the
  // others: when it was posted, who posted it and how established they are,
  // the discount beside the price, and a direct way in.
  const isRow = layout === 'spotlight';
  const postedAgo = deal.created_at ? timeAgo(deal.created_at, lang) : null;
  // null for online deals — the availability slot already says "Online", and
  // printing it here as well is what produced "Online · Online".
  const city = locationLabel(deal, { translateCity, lang });
  const availability = availabilityLabel(deal, lang);
  const priceLabel = formatDealPrice(deal, lang);
  const originalPriceLabel = formatOriginalPrice(deal);
  const lifecycleState = deriveLifecycle(deal);
  const freshnessLabel = lifecycleLabel(deal, { lang });
  // Derived from the lifecycle rather than the end date alone, so an admin
  // marking a deal expired greys it out too.
  const isExpired = lifecycleState === EXPIRED;

  const go = () => {
    try {
      sessionStorage.setItem('dilzReturnTab', 'deals');
      sessionStorage.setItem('dilzScrollY', String(window.scrollY));
    } catch {}
    router.push(`/deal/${deal.id}`);
  };

  const copyDealLink = async () => {
    const url = `${window.location.origin}/deal/${deal.id}`;
    await copyText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const shareUrl = typeof window === 'undefined' ? `/deal/${deal.id}` : `${window.location.origin}/deal/${deal.id}`;
  const shareMenuId = `deal-share-${deal.id}`;
  const editOwnerDeal = () => {
    try { sessionStorage.setItem('dilzEditDealOnOpen', String(deal.id)); } catch {}
    router.push(`/deal/${deal.id}`);
  };
  const renderSaveButton = () => (onSave && !isAd) ? (
    <IconButton
      aria-label={isSaved ? text.unsave : text.save}
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
  ) : null;

  return (
    <article className={['dilz-card', 'dilz-deal-card', layout === 'list' && 'is-list', layout === 'compact' && 'is-compact', layout === 'spotlight' && 'is-spotlight', isExpired && 'is-expired'].filter(Boolean).join(' ')} onClick={go}>
      <div className="dilz-deal-card__media">
        {primaryImage ? (
          <img
            src={optimizedImageUrl(primaryImage, { width: 640, quality: 70 })}
            alt={deal.titre}
            // Off-screen cards must not download their photo. A 25-deal page
            // was fetching every full-size image up front just to show the
            // two cards that actually fit on a phone screen.
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            fetchPriority={priority ? 'high' : 'low'}
            onError={(event) => {
              // If the optimizer rejects this URL for any reason, fall back to
              // the original once before giving up, so a card can never end up
              // worse off than before optimization existed.
              const img = event.currentTarget;
              if (img.dataset.fallbackApplied !== 'true' && img.src !== primaryImage) {
                img.dataset.fallbackApplied = 'true';
                img.src = primaryImage;
                return;
              }
              img.style.display = 'none';
            }}
          />
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
            <Badge dir="ltr" tone={discount >= 30 ? 'saving-strong' : 'saving'}>-{discount}%</Badge>
          )}
          {ending && <Badge tone="danger" className="dilz-deal-card__ending-badge">{ending}</Badge>}
        </div>
        {isExpired && <span className="dilz-deal-card__expired-stamp">Expired</span>}
        {images.length > 1 && <span className="dilz-deal-card__photo-count">1 / {images.length}</span>}
        <div className="dilz-deal-card__save">
          {isAd ? <span className="dilz-deal-card__sponsored-tag">{text.sponsored}</span> : renderSaveButton()}
        </div>
        {isStorePromo && (
          <div className="dilz-deal-card__trust">
            <Badge tone="brand">{trust}</Badge>
          </div>
        )}
        {isAdmin && (
          <div className="dilz-deal-card__admin-badge">
            <Badge tone="brand">Admin</Badge>
          </div>
        )}
      </div>

      <div className="dilz-deal-card__body">
        <div className="dilz-deal-card__safety-menu">
          <SafetyActions
            contentType="deal"
            contentId={deal.id}
            authorId={deal.auteur_id}
            currentUserId={user?.id}
            lang={lang}
            onBlocked={onBlocked}
            onEdit={isOwner ? editOwnerDeal : undefined}
            onDelete={isOwner && onOwnerDelete ? () => onOwnerDelete(deal.id) : undefined}
          />
        </div>
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
          {city && <span>{city}</span>}
          {isRow && postedAgo && (
            <div className="dilz-deal-card__spotlight-tools">
              <span className="dilz-deal-card__posted">{postedAgo}</span>
            </div>
          )}
        </div>
        <h3>{deal.titre}</h3>
        {!isAd && (
          <p className="dilz-deal-card__author">
            {text.shared}{' '}
            {deal.auteur_id ? (
              <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); router.push(`/user/${deal.auteur_id}`); }}>{authorName}</button>
            ) : <strong>{authorName}</strong>}
            {/* The poster's contribution tier (lib/points.js), so it is clear
                at a glance whether a regular contributor posted this. */}
            {deal.auteur_tier && (
              <span
                className={`dilz-poster-tier is-${deal.auteur_tier}`}
                title={TIER_LABELS[deal.auteur_tier]?.[lang === 'he' ? 'he' : 'en']}
              >
                {TIER_LABELS[deal.auteur_tier]?.[lang === 'he' ? 'he' : 'en']}
              </span>
            )}
          </p>
        )}
        {deal.description && (
          <p className="dilz-deal-card__description">{deal.description}</p>
        )}
        <div className="dilz-deal-card__price-row">
          {/* FREE rather than "0 ₪"; the struck-through original only renders
              when it is a real price genuinely higher than the current one. */}
          <strong className={isFree ? 'is-free' : undefined}>{priceLabel}</strong>
          {originalPriceLabel && <span>{originalPriceLabel}</span>}
          {/* In the row, the saving belongs next to the two prices it relates
              to, rather than floating over the photo. */}
          {isRow && discount !== null && (
            <Badge dir="ltr" tone={discount >= 30 ? 'saving-strong' : 'saving'}>-{discount}%</Badge>
          )}
          {!isRow && commentCount > 0 && (
            <span className="dilz-deal-card__price-context">
              <span><CommentIcon /> {commentCount}</span>
            </span>
          )}
        </div>
        <div className="dilz-deal-card__meta">
          {/* Meaningful status ("Verified today", "Possibly expired") rather
              than a bare age, which made every older deal look dead. An
              upcoming end date still wins, since it is the more actionable
              fact. */}
          <span className={`dilz-deal-freshness is-${lifecycleState.toLowerCase()}`}>
            {ending || freshnessLabel}
          </span>
          <span>{availability}</span>
          {commentCount > 0 && (
            <span className="dilz-deal-card__comment-meta">
              <CommentIcon /> {commentCount}
            </span>
          )}
        </div>
        {!isAd && (
          <div className="dilz-deal-card__actions" onClick={(event) => event.stopPropagation()}>
            <div className="dilz-vote-pill dilz-vote-pill--combined" aria-label={text.voteControls}>
              <button
                type="button"
                className={votedDeal === 'chaud' ? 'is-up' : ''}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onVote(deal.id, 'chaud');
                }}
                aria-label={text.hot}
              >
                <VoteEmoji type="chaud" />
              </button>
              <span
                className={['dilz-vote-pill__score', (deal.votes_chaud || 0) > (deal.votes_froid || 0) ? 'is-hot' : 'is-cold'].join(' ')}
              >
                {Math.abs((deal.votes_chaud || 0) - (deal.votes_froid || 0))}
              </span>
              <button
                type="button"
                className={votedDeal === 'froid' ? 'is-down' : ''}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onVote(deal.id, 'froid');
                }}
                aria-label={text.cold}
              >
                <VoteEmoji type="froid" />
              </button>
            </div>
            {isRow && (
              <div className="dilz-deal-card__row-tools">
                {commentCount > 0 && (
                  <span className="dilz-deal-card__comment-meta"><CommentIcon /> {commentCount}</span>
                )}
                {onSave && !isAd && <span className="dilz-deal-card__spotlight-save">{renderSaveButton()}</span>}
                <Button
                  className="dilz-deal-card__view"
                  size="sm"
                  onClick={(event) => { event.preventDefault(); event.stopPropagation(); go(); }}
                >
                  {text.viewDeal} <span aria-hidden="true">›</span>
                </Button>
              </div>
            )}
            <div className={['dilz-deal-card__right-actions', hideShareInRow && 'is-row-without-share'].filter(Boolean).join(' ')}>
              <IconButton
                aria-label={lang === 'he' ? 'אפשרויות שיתוף' : 'Share options'}
                aria-expanded={shareOpen}
                aria-controls={shareMenuId}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setShareOpen((current) => !current);
                }}
              >
                <ShareIcon />
              </IconButton>
              <ShareMenu
                id={shareMenuId}
                open={shareOpen}
                title={deal.titre}
                url={shareUrl}
                lang={lang}
                onClose={() => setShareOpen(false)}
                onCopy={() => copyDealLink().catch(() => {})}
              />
            </div>
          </div>
        )}
      </div>
      <CopyToast visible={copied} lang={lang} />
    </article>
  );
}

function CommentIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" /></svg>;
}

function ShareIcon() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" /></svg>;
}

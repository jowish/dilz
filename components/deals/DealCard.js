import { useState } from 'react';
import { useRouter } from 'next/router';
import { Badge } from '../ui/Badge';
import { Button, IconButton } from '../ui/Button';
import { CopyToast } from '../ui/CopyToast';
import { VoteEmoji } from '../ui/VoteEmoji';
import { copyText } from '../../lib/copyText';
import { SafetyActions } from '../ui/SafetyActions';
import { ShareMenu } from '../ui/ShareMenu';
import { getDiscount, formatPrice, timeRemaining, timeAgo } from '../../lib/dealCard.js';

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
}) {
  const router = useRouter();
  const text = lang === 'he'
    ? { storePromo: 'מבצע חנות', community: 'מהקהילה', you: 'אתם', member: 'חבר Dilz', online: 'אונליין', myDeal: 'הדיל שלי', shared: 'שותף על ידי', deal: 'דיל', inStore: 'בחנות', voteControls: 'כפתורי הצבעה', hot: 'סימון כחם', cold: 'סימון כקר', unsave: 'הסרה מהשמורים', save: 'שמירת הדיל', comments: 'תגובות' }
    : { storePromo: 'Store promo', community: 'Community find', you: 'You', member: 'Dilz member', online: 'Online', myDeal: 'My deal', shared: 'Shared by', deal: 'Deal', inStore: 'In-store', voteControls: 'Vote controls', hot: 'Mark as hot', cold: 'Mark as cold', unsave: 'Unsave deal', save: 'Save deal', comments: 'comments' };
  const [copied, setCopied] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const images = [...new Set([...(Array.isArray(deal.image_urls) ? deal.image_urls : []), deal.image_url].filter(Boolean))].slice(0, 3);
  const primaryImage = images[0] || null;
  const discount = getDiscount(deal);
  const ending = timeRemaining(deal.date_fin, lang);
  const isOwner = user && user.id === deal.auteur_id;
  const isOnline = deal.ville === 'Online' || deal.categorie === 'Online' || /online/i.test(String(deal.ville || ''));
  const isStorePromo = deal.auteur_nom === 'DilzCurator' || deal.auteur_nom === 'DilzBot';
  const trust = isStorePromo ? text.storePromo : text.community;
  const authorName = deal.auteur_nom || (isOwner ? text.you : text.member);
  const commentCount = Number(deal.commentaires?.[0]?.count || deal.comments_count || 0);
  const city = deal.ville && !isOnline
    ? (translateCity ? translateCity(deal.ville, lang === 'he' ? 'he' : 'en') : deal.ville)
    : text.online;

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

  return (
    <article className={['dilz-card', 'dilz-deal-card', layout === 'list' && 'is-list', layout === 'compact' && 'is-compact'].filter(Boolean).join(' ')} onClick={go}>
      <div className="dilz-deal-card__media">
        {primaryImage ? (
          <img src={primaryImage} alt={deal.titre} onError={(event) => { event.currentTarget.style.display = 'none'; }} />
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
          {ending && <Badge tone="danger">{ending}</Badge>}
        </div>
        {images.length > 1 && <span className="dilz-deal-card__photo-count">1 / {images.length}</span>}
        <div className="dilz-deal-card__save">
          {onSave && (
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
          )}
        </div>
        <div className="dilz-deal-card__trust">
          <Badge tone={isStorePromo ? 'brand' : 'neutral'}>{trust}</Badge>
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
          {isOwner && <span>{text.myDeal}</span>}
          <SafetyActions contentType="deal" contentId={deal.id} authorId={deal.auteur_id} currentUserId={user?.id} lang={lang} onBlocked={onBlocked} />
        </div>
        <h3>{deal.titre}</h3>
        <p className="dilz-deal-card__author">
          {text.shared}{' '}
          {deal.auteur_id ? (
            <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); router.push(`/user/${deal.auteur_id}`); }}>{authorName}</button>
          ) : <strong>{authorName}</strong>}
        </p>
        {deal.description && (
          <p className="dilz-deal-card__description">{deal.description}</p>
        )}
        <div className="dilz-deal-card__price-row">
          <strong>{formatPrice(deal.prix)} ₪</strong>
          {deal.prix_original && <span>{formatPrice(deal.prix_original)} ₪</span>}
        </div>
        <div className="dilz-deal-card__meta">
          <span>{deal.categorie || text.deal}</span>
          <span>{ending || timeAgo(deal.created_at, lang)}</span>
          <span>{isOnline ? text.online : text.inStore}</span>
          <span className="dilz-deal-card__comment-meta">
            <CommentIcon /> {commentCount}
          </span>
        </div>
        <div className="dilz-deal-card__actions" onClick={(event) => event.stopPropagation()}>
          <div className="dilz-vote-pill" aria-label={text.voteControls}>
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
              <strong>{deal.votes_chaud || 0}</strong>
            </button>
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
              <strong>{deal.votes_froid || 0}</strong>
            </button>
          </div>
          <div className="dilz-deal-card__right-actions">
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
            {isOwner && onOwnerDelete && (
              <button type="button" className="dilz-owner-delete" onClick={(event) => { event.preventDefault(); event.stopPropagation(); onOwnerDelete(deal.id); }}>
                {lang === 'he' ? '×ž×—×§' : 'Delete'}
              </button>
            )}
          </div>
        </div>
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

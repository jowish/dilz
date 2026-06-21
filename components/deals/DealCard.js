import { useState } from 'react';
import { useRouter } from 'next/router';
import { Badge } from '../ui/Badge';
import { Button, IconButton } from '../ui/Button';
import { CopyToast } from '../ui/CopyToast';
import { VoteEmoji } from '../ui/VoteEmoji';
import { copyText } from '../../lib/copyText';
import { SafetyActions } from '../ui/SafetyActions';
import { ShareMenu } from '../ui/ShareMenu';

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

function timeRemaining(dateFin, lang) {
  if (!dateFin) return null;
  const end = new Date(String(dateFin).slice(0, 10) + 'T23:59:59');
  const days = Math.ceil((end.getTime() - Date.now()) / 86400000);
  if (days < 0) return lang === 'he' ? 'פג תוקף' : 'Expired';
  if (days === 0) return lang === 'he' ? 'מסתיים היום' : 'Ends today';
  if (days <= 3) return lang === 'he' ? `מסתיים בעוד ${days} ימים` : `Ends in ${days}d`;
  return lang === 'he' ? `מסתיים ב-${end.toLocaleDateString('he-IL', { day: '2-digit', month: 'short' })}` : `Ends ${end.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`;
}

function timeAgo(date, lang) {
  const diff = Date.now() - new Date(date).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return lang === 'he' ? 'עכשיו' : 'Just now';
  if (h < 24) return lang === 'he' ? `לפני ${h} שעות` : `${h}h ago`;
  return lang === 'he' ? `לפני ${Math.floor(h / 24)} ימים` : `${Math.floor(h / 24)}d ago`;
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
    <article className={['dilz-card', 'dilz-deal-card', layout === 'list' && 'is-list'].filter(Boolean).join(' ')} onClick={go}>
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
          {text.shared} <strong>{authorName}</strong>
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
              aria-label={`${commentCount} ${text.comments}`}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                go();
              }}
            >
              <CommentIcon />
              <span className="dilz-comment-count">{commentCount}</span>
            </IconButton>
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

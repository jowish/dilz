import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import { traduireVille } from '../../lib/translations';
import { uploadDealImage, validateImageFile, deleteDealImage } from '../../lib/uploadImage';
import { copyText } from '../../lib/copyText';
import { CopyToast } from '../../components/ui/CopyToast';
import { VoteEmoji } from '../../components/ui/VoteEmoji';
import { useAppLanguage } from '../../lib/useAppLanguage';

const DETAIL_TEXT = {
  en: { now: 'Just now', hour: 'h ago', day: 'd ago', notFound: 'Deal not found', backDeals: 'Back to deals', back: 'Back', copy: 'Copy link', edit: 'Edit', photos: 'Deal photos', viewPhoto: 'View photo', by: 'by', starts: 'Starts', ends: 'Ends', online: 'View online deal', comments: 'Comments', noComments: 'No comments yet - be the first!', anonymous: 'Anonymous', reply: 'Reply', replyTo: 'Reply to', addComment: 'Add a comment...', send: 'Send', signInComment: 'Sign in to comment', editDeal: 'Edit deal', close: 'Close', changePhoto: 'Change photo', cancel: 'Cancel', save: 'Save changes', saving: 'Saving...' },
  he: { now: 'עכשיו', hour: 'ש׳', day: 'י׳', notFound: 'הדיל לא נמצא', backDeals: 'חזרה לדילים', back: 'חזרה', copy: 'העתקת קישור', edit: 'עריכה', photos: 'תמונות הדיל', viewPhoto: 'הצגת תמונה', by: 'מאת', starts: 'מתחיל', ends: 'מסתיים', online: 'מעבר לדיל אונליין', comments: 'תגובות', noComments: 'אין עדיין תגובות - היו הראשונים!', anonymous: 'אנונימי', reply: 'תגובה', replyTo: 'תגובה אל', addComment: 'הוספת תגובה...', send: 'שליחה', signInComment: 'התחברו כדי להגיב', editDeal: 'עריכת דיל', close: 'סגירה', changePhoto: 'החלפת תמונה', cancel: 'ביטול', save: 'שמירת שינויים', saving: 'שומר...' },
};

const CATEGORIES = ['Food', 'Tech', 'Fashion', 'Activities', 'Online'];

const CITY_COORDS = {
  'תל אביב': {}, 'ירושלים': {}, 'חיפה': {}, 'באר שבע': {}, 'אילת': {},
  'נתניה': {}, 'ראשון לציון': {}, 'פתח תקווה': {}, 'אשדוד': {}, 'אשקלון': {},
  'הרצליה': {}, 'כפר סבא': {}, 'רמת גן': {}, 'בני ברק': {}, 'חולון': {},
  'בת ים': {}, 'נהריה': {}, 'עכו': {}, 'טבריה': {}, 'צפת': {},
  'נצרת': {}, 'רחובות': {}, 'מודיעין': {}, 'לוד': {}, 'רמלה': {},
  'קריית גת': {}, 'דימונה': {}, 'אופקים': {}, 'עפולה': {}, 'כרמיאל': {},
  'ראש העין': {}, 'רעננה': {}, 'יהוד': {}, 'גבעתיים': {}, 'אור יהודה': {},
  'קריית אונו': {},
};

function timeAgo(date, text) {
  const diff = Date.now() - new Date(date).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return text.now;
  if (h < 24) return `${h}${text.hour}`;
  return `${Math.floor(h / 24)}${text.day}`;
}

function dateInputValue(value) {
  const match = String(value || '').match(/^(\d{4}-\d{2}-\d{2})(?:$|[T\s])/);
  return match ? match[1] : '';
}

function formatDateOnly(value, lang = 'en') {
  const match = String(value || '').match(/^(\d{4}-\d{2}-\d{2})(?:$|[T\s])/);
  if (!match) return '';
  const [year, month, day] = match[1].split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function HotIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2c0 0-4.5 5.5-4.5 10a4.5 4.5 0 0 0 9 0C16.5 7.5 12 2 12 2zm0 13a2.5 2.5 0 0 1-2.5-2.5C9.5 10 12 6.5 12 6.5S14.5 10 14.5 12.5A2.5 2.5 0 0 1 12 15z"/></svg>;
}

function ColdIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20 11h-2.34l1.17-2.03-1.73-1-1.46 2.53L14 9.27V7h-2v2l-1.64 1.23-1.46-2.53-1.73 1L8.34 11H6v2h2.34l-1.17 2.03 1.73 1 1.46-2.53L12 14.73V17h2v-2.27l1.64-1.23 1.46 2.53 1.73-1L17.66 13H20v-2z"/></svg>;
}

function BackArrow() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M19 12H5m7-7-7 7 7 7"/></svg>;
}

function ShareIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>;
}

function EditIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
}

function CameraIcon() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>;
}

function ReplyIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>;
}

function WhatsAppIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>;
}

function TelegramIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>;
}

function BagIcon() {
  return <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" aria-hidden="true"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>;
}

export default function DealPage() {
  const router = useRouter();
  const { lang, setLang, dir } = useAppLanguage();
  const text = DETAIL_TEXT[lang];
  const { id } = router.query;

  const [deal, setDeal] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [commentError, setCommentError] = useState('');
  const [myVote, setMyVote] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [commentVotes, setCommentVotes] = useState({});
  const [replyTo, setReplyTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');
  const [editImageFile, setEditImageFile] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState(null);
  const [editImageError, setEditImageError] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    setMounted(true);
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setUser(data.session.user);
    });
    try {
      const saved = localStorage.getItem('dilzCommentVotes');
      if (saved) setCommentVotes(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    if (!id) return;
    fetchDeal();
    fetchComments();
    try {
      const dv = localStorage.getItem('dilzDealVotes');
      if (dv) { const parsed = JSON.parse(dv); setMyVote(parsed[id] || null); }
    } catch {}
  }, [id]);

  const fetchDeal = async () => {
    setLoading(true);
    const res = await fetch(`/api/deal/${id}`);
    const data = await res.json();
    if (data.bon_plan) {
      setDeal(data.bon_plan);
      setActiveImageIndex(0);
      setEditForm({
        titre: data.bon_plan.titre || '',
        description: data.bon_plan.description || '',
        prix: data.bon_plan.prix || '',
        prix_original: data.bon_plan.prix_original || '',
        magasin: data.bon_plan.magasin || '',
        ville: data.bon_plan.ville || '',
        categorie: data.bon_plan.categorie || 'Food',
        url_source: data.bon_plan.url_source || '',
        date_debut: dateInputValue(data.bon_plan.date_debut),
        date_fin: dateInputValue(data.bon_plan.date_fin),
      });
    }
    setLoading(false);
  };

  const fetchComments = async () => {
    const res = await fetch(`/api/commentaires?bon_plan_id=${id}`);
    const data = await res.json();
    setComments(data.commentaires || []);
  };

  const handleVote = async (type) => {
    if (!user) { router.push(`/auth?redirect=/deal/${id}`); return; }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push(`/auth?redirect=/deal/${id}`); return; }

    const optimisticNewVote = myVote === type ? null : type;
    const chaud_delta = (myVote === 'chaud' ? -1 : 0) + (optimisticNewVote === 'chaud' ? 1 : 0);
    const froid_delta = (myVote === 'froid' ? -1 : 0) + (optimisticNewVote === 'froid' ? 1 : 0);
    const prevVote = myVote;

    setMyVote(optimisticNewVote);
    try {
      const dv = JSON.parse(localStorage.getItem('dilzDealVotes') || '{}');
      dv[id] = optimisticNewVote;
      localStorage.setItem('dilzDealVotes', JSON.stringify(dv));
    } catch {}
    setDeal(prev => ({
      ...prev,
      votes_chaud: Math.max(0, (prev.votes_chaud || 0) + chaud_delta),
      votes_froid: Math.max(0, (prev.votes_froid || 0) + froid_delta),
    }));

    const apiRes = await fetch('/api/bons-plans', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ action: 'vote', id, type, chaud_delta, froid_delta }),
    });

    if (apiRes.ok) {
      const data = await apiRes.json();
      const serverVote = data.newType ?? null;
      setMyVote(serverVote);
      try {
        const dv = JSON.parse(localStorage.getItem('dilzDealVotes') || '{}');
        dv[id] = serverVote;
        localStorage.setItem('dilzDealVotes', JSON.stringify(dv));
      } catch {}
      if (data.votes_chaud !== undefined) {
        setDeal(prev => ({ ...prev, votes_chaud: data.votes_chaud, votes_froid: data.votes_froid }));
      }
    } else {
      setMyVote(prevVote);
      try {
        const dv = JSON.parse(localStorage.getItem('dilzDealVotes') || '{}');
        dv[id] = prevVote;
        localStorage.setItem('dilzDealVotes', JSON.stringify(dv));
      } catch {}
      setDeal(prev => ({
        ...prev,
        votes_chaud: Math.max(0, (prev.votes_chaud || 0) - chaud_delta),
        votes_froid: Math.max(0, (prev.votes_froid || 0) - froid_delta),
      }));
    }
  };

  const handleCommentVote = (commentId, type) => {
    if (!user) { router.push(`/auth?redirect=/deal/${id}`); return; }
    setCommentVotes(prev => {
      const next = { ...prev, [commentId]: prev[commentId] === type ? null : type };
      try { localStorage.setItem('dilzCommentVotes', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const handleComment = async () => {
    if (!user) { router.push(`/auth?redirect=/deal/${id}`); return; }
    if (!newComment.trim()) return;
    setSubmitting(true);
    setCommentError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push(`/auth?redirect=/deal/${id}`); setSubmitting(false); return; }
      const r = await fetch('/api/commentaires', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ bon_plan_id: id, contenu: newComment.trim() }),
      });
      const d = await r.json();
      if (!r.ok || d.erreur) { setCommentError(d.erreur || 'Failed to post comment'); setSubmitting(false); return; }
      setNewComment('');
      await fetchComments();
    } catch (e) {
      setCommentError(e.message || 'Network error');
    }
    setSubmitting(false);
  };

  const handleReply = async () => {
    if (!user || !replyTo || !replyText.trim()) return;
    setReplySubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setReplySubmitting(false); return; }
      const r = await fetch('/api/commentaires', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ bon_plan_id: id, contenu: `↩ @${replyTo.auteur_nom}: ${replyText.trim()}` }),
      });
      const d = await r.json();
      if (r.ok && !d.erreur) { setReplyTo(null); setReplyText(''); await fetchComments(); }
    } catch {}
    setReplySubmitting(false);
  };

  const handleEditImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateImageFile(file);
    if (err) { setEditImageError(err); e.target.value = ''; return; }
    setEditImageError('');
    setEditImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setEditImagePreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleEditSubmit = async () => {
    if (!editForm.titre || !editForm.prix || !editForm.magasin) { setEditError('Title, price and store are required'); return; }
    if (editForm.date_debut && editForm.date_fin && editForm.date_fin < editForm.date_debut) { setEditError('End date must be after start date.'); return; }
    setEditSubmitting(true);
    setEditError('');
    let newUploadPath = null;
    try {
      let image_url = deal.image_url;
      if (editImageFile) {
        const { url, path } = await uploadDealImage(editImageFile, user.id);
        image_url = url;
        newUploadPath = path;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setEditError('Session expired. Please sign in again.'); setEditSubmitting(false); return; }
      const res = await fetch('/api/bons-plans', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          action: 'edit', id, ...editForm,
          prix: parseFloat(editForm.prix),
          prix_original: editForm.prix_original ? parseFloat(editForm.prix_original) : null,
          image_url,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.erreur) {
        if (newUploadPath) await deleteDealImage(newUploadPath);
        setEditError(data.erreur || 'Failed to update');
        setEditSubmitting(false);
        return;
      }
      setIsEditing(false);
      setEditImageFile(null);
      setEditImagePreview(null);
      setEditImageError('');
      await fetchDeal();
    } catch (e) {
      if (newUploadPath) await deleteDealImage(newUploadPath);
      setEditError(e.message || 'Network error');
    }
    setEditSubmitting(false);
  };

  const handleShare = async () => {
    if (!deal) return;
    await copyText(window.location.href);
    setCopySuccess(true);
    window.setTimeout(() => setCopySuccess(false), 1800);
  };

  if (!mounted) return null;

  if (loading) {
    return (
      <div className="dilz-deal-loading">
        <div className="dilz-spinner" />
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="dilz-deal-notfound">
        <p>{text.notFound}</p>
        <Link href="/" className="dilz-button dilz-button--primary dilz-button--md">{text.backDeals}</Link>
      </div>
    );
  }

  const reduction = deal.prix_original
    ? Math.round((deal.prix_original - deal.prix) / deal.prix_original * 100)
    : null;
  const dealImages = [...new Set([...(Array.isArray(deal.image_urls) ? deal.image_urls : []), deal.image_url].filter(Boolean))].slice(0, 3);
  const activeImage = dealImages[activeImageIndex] || dealImages[0] || null;
  const isOwner = user && user.id === deal.auteur_id;
  const pageTitle = `${deal.titre} — ₪${deal.prix} at ${deal.magasin} | Dilz`;
  const pageDesc = deal.description
    ? `${deal.description.slice(0, 120)}…`
    : `${deal.titre} for ₪${deal.prix} at ${deal.magasin}${deal.ville ? `, ${deal.ville}` : ''}. Found on Dilz.`;

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDesc} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDesc} />
        {deal.image_url && <meta property="og:image" content={deal.image_url} />}
        <meta property="og:type" content="article" />
        <meta name="twitter:card" content={deal.image_url ? 'summary_large_image' : 'summary'} />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      <div className="dilz-deal-page" dir={dir}>
        <header className="dilz-app-header">
          <div className="dilz-app-header__inner">
            <button
              type="button"
              className="dilz-deal-back"
              onClick={() => {
                try { sessionStorage.setItem('dilzReturnTab', 'deals'); } catch {}
                router.back();
              }}
            >
              <BackArrow /> {text.back}
            </button>
            <Link href="/" className="dilz-logo-button" aria-label="Dilz home">
              <span className="dilz-logo-lockup" aria-label="dILz">
                <span className="dilz-logo-mark" aria-hidden="true">
                  <svg viewBox="0 0 48 48" focusable="false">
                    <circle cx="21" cy="21" r="12" />
                    <path d="M30.5 30.5 40 40" />
                  </svg>
                </span>
                <span className="dilz-logo">dILz</span>
              </span>
            </Link>
            <div className="dilz-deal-header-actions">
              <select className="dilz-language-select" value={lang} onChange={(event) => setLang(event.target.value)} aria-label="Language"><option value="en">EN</option><option value="he">HE</option></select>
              <button
                type="button"
                className="dilz-button dilz-button--sm dilz-button--ghost"
                onClick={handleShare}
              >
                <ShareIcon /> {text.copy}
              </button>
              {isOwner && (
                <button
                  type="button"
                  className="dilz-button dilz-button--outline dilz-button--sm"
                  onClick={() => setIsEditing(true)}
                >
                  <EditIcon /> {text.edit}
                </button>
              )}
            </div>
          </div>
        </header>

        <div className="dilz-deal-content">
          {activeImage ? (
            <div className="dilz-deal-hero">
              <img
                src={activeImage}
                alt={deal.titre}
                className="dilz-deal-hero__img"
                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
              />
              <div className="dilz-deal-hero__fallback" style={{ display: 'none' }}>
                <BagIcon />
              </div>
              {deal.categorie && <span className="dilz-deal-category-badge">{deal.categorie}</span>}
              {reduction !== null && <span className="dilz-deal-discount-badge">-{reduction}%</span>}
              {dealImages.length > 1 && <span className="dilz-deal-gallery-count">{activeImageIndex + 1} / {dealImages.length}</span>}
            </div>
          ) : (
            <div className="dilz-deal-hero dilz-deal-hero--empty">
              <BagIcon />
            </div>
          )}

          {dealImages.length > 1 && (
            <div className="dilz-deal-gallery-thumbs" aria-label={text.photos}>
              {dealImages.map((image, index) => (
                <button
                  key={image}
                  type="button"
                  className={index === activeImageIndex ? 'is-active' : ''}
                  onClick={() => setActiveImageIndex(index)}
                  aria-label={`${text.viewPhoto} ${index + 1}`}
                  aria-pressed={index === activeImageIndex}
                >
                  <img src={image} alt="" />
                </button>
              ))}
            </div>
          )}

          <div className="dilz-deal-body">
            <div className="dilz-deal-price-row">
              <span className="dilz-deal-price">{deal.prix} &#8362;</span>
              {deal.prix_original && (
                <span className="dilz-deal-price-original">{deal.prix_original} &#8362;</span>
              )}
              {reduction !== null && (
                <span className="dilz-badge dilz-badge--saving">-{reduction}%</span>
              )}
            </div>

            <h1 className="dilz-deal-title">{deal.titre}</h1>

            <p className="dilz-deal-meta">
              {[deal.magasin, deal.ville ? traduireVille(deal.ville, lang) : null].filter(Boolean).join(' · ')}
              {' · '}{timeAgo(deal.created_at, text)}
              {deal.auteur_nom ? ` · ${text.by} ${deal.auteur_nom}` : ''}
            </p>

            {(deal.date_debut || deal.date_fin) && (
              <div className="dilz-deal-dates">
                {deal.date_debut && <span>{text.starts}: {formatDateOnly(deal.date_debut, lang)}</span>}
                {deal.date_fin && <span>{text.ends}: {formatDateOnly(deal.date_fin, lang)}</span>}
              </div>
            )}

            {deal.description && (
              <div className="dilz-deal-description">
                <p>{deal.description}</p>
              </div>
            )}

            {deal.url_source && (
              <a href={deal.url_source} target="_blank" rel="noopener noreferrer" className="dilz-deal-source-link">
                {text.online} ↗
              </a>
            )}

            {/* Vote buttons */}
            <div className="dilz-deal-votes">
              <button
                type="button"
                className={['dilz-deal-vote-btn', myVote === 'chaud' ? 'is-hot' : ''].filter(Boolean).join(' ')}
                onClick={() => handleVote('chaud')}
              >
                <VoteEmoji type="chaud" /> {deal.votes_chaud || 0}
              </button>
              <button
                type="button"
                className={['dilz-deal-vote-btn', myVote === 'froid' ? 'is-cold' : ''].filter(Boolean).join(' ')}
                onClick={() => handleVote('froid')}
              >
                <VoteEmoji type="froid" /> {deal.votes_froid || 0}
              </button>
            </div>

            {/* Share row */}
            <div className="dilz-deal-share-row">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`${deal.titre} — ₪${deal.prix} at ${deal.magasin}${deal.ville ? `, ${deal.ville}` : ''} ${typeof window !== 'undefined' ? window.location.href : ''}`)}`}
                target="_blank" rel="noopener noreferrer"
                className="dilz-deal-share-btn dilz-deal-share-btn--whatsapp"
              >
                <WhatsAppIcon /> WhatsApp
              </a>
              <a
                href={`https://t.me/share/url?url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}&text=${encodeURIComponent(`${deal.titre} — ₪${deal.prix} at ${deal.magasin}${deal.ville ? `, ${deal.ville}` : ''}`)}`}
                target="_blank" rel="noopener noreferrer"
                className="dilz-deal-share-btn dilz-deal-share-btn--telegram"
              >
                <TelegramIcon /> Telegram
              </a>
              <button
                type="button"
                className="dilz-deal-share-btn dilz-deal-share-btn--copy"
                onClick={handleShare}
              >
                {text.copy}
              </button>
            </div>

            {/* Comments */}
            <h2 className="dilz-deal-section-title">{text.comments} ({comments.length})</h2>

            {comments.length === 0 ? (
              <div className="dilz-deal-comments-empty">
                <p>{text.noComments}</p>
              </div>
            ) : (
              <div className="dilz-deal-comments">
                {comments.map((c) => {
                  const initials = (c.auteur_nom || 'A').slice(0, 2).toUpperCase();
                  const isReply = c.contenu.startsWith('↩ @');
                  const myCommentVote = commentVotes[c.id] || null;
                  return (
                    <div key={c.id} className={['dilz-comment', isReply ? 'is-reply' : ''].filter(Boolean).join(' ')}>
                      <div className={['dilz-comment__avatar', isReply ? 'is-reply' : ''].filter(Boolean).join(' ')}>
                        <span>{initials}</span>
                      </div>
                      <div className="dilz-comment__body">
                        <div className="dilz-comment__header">
                          <span className="dilz-comment__author">{c.auteur_nom || text.anonymous}</span>
                          <span className="dilz-comment__time">{timeAgo(c.created_at, text)}</span>
                        </div>
                        <p className="dilz-comment__text">{c.contenu}</p>
                        <div className="dilz-comment__actions">
                          <button
                            type="button"
                            className={['dilz-comment-vote', myCommentVote === 'chaud' ? 'is-up' : ''].filter(Boolean).join(' ')}
                            onClick={() => handleCommentVote(c.id, 'chaud')}
                          >+1</button>
                          <button
                            type="button"
                            className={['dilz-comment-vote', myCommentVote === 'froid' ? 'is-down' : ''].filter(Boolean).join(' ')}
                            onClick={() => handleCommentVote(c.id, 'froid')}
                          >-1</button>
                          {user && !isReply && (
                            <button
                              type="button"
                              className="dilz-comment-reply-btn"
                              onClick={() => { setReplyTo({ id: c.id, auteur_nom: c.auteur_nom }); setReplyText(''); }}
                            >
                              <ReplyIcon /> {text.reply}
                            </button>
                          )}
                        </div>
                        {replyTo?.id === c.id && (
                          <div className="dilz-comment-reply-input">
                            <input
                              autoFocus
                              type="text"
                              className="dilz-input"
                              placeholder={`${text.replyTo} ${c.auteur_nom}...`}
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleReply()}
                            />
                            <button
                              type="button"
                              className="dilz-button dilz-button--primary dilz-button--sm"
                              onClick={handleReply}
                              disabled={replySubmitting || !replyText.trim()}
                            >
                              {replySubmitting ? '...' : <ReplyIcon />}
                            </button>
                            <button
                              type="button"
                              className="dilz-button dilz-button--ghost dilz-button--sm"
                              onClick={() => setReplyTo(null)}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Comment input */}
            {commentError && <p className="dilz-form-error">{commentError}</p>}
            {user ? (
              <div className="dilz-deal-comment-input">
                <input
                  type="text"
                  className="dilz-input"
                  placeholder={text.addComment}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleComment()}
                />
                <button
                  type="button"
                  className="dilz-button dilz-button--primary dilz-button--md"
                  onClick={handleComment}
                  disabled={submitting || !newComment.trim()}
                >
                  {submitting ? '...' : text.send}
                </button>
              </div>
            ) : (
              <Link href={`/auth?redirect=/deal/${id}`} className="dilz-deal-signin-prompt">
                {text.signInComment}
              </Link>
            )}
          </div>
        </div>

        {/* Edit modal */}
        {isEditing && (
          <div className="dilz-sheet-overlay" onClick={() => setIsEditing(false)} role="dialog" aria-modal="true" aria-label={text.editDeal}>
            <div className="dilz-sheet" onClick={(e) => e.stopPropagation()}>
              <div className="dilz-sheet__handle" aria-hidden="true" />
              <div className="dilz-sheet__header">
                <h2 className="dilz-sheet__title">{text.editDeal}</h2>
                <button type="button" className="dilz-sheet__close" onClick={() => setIsEditing(false)} aria-label={text.close}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              </div>

              <div className="dilz-edit-form">
                {/* Image upload */}
                <label className="dilz-image-upload">
                  <div className={['dilz-image-upload__area', (editImagePreview || deal.image_url) ? 'has-image' : ''].filter(Boolean).join(' ')}>
                    {(editImagePreview || deal.image_url) ? (
                      <img src={editImagePreview || deal.image_url} alt="" />
                    ) : (
                      <div className="dilz-image-upload__placeholder">
                        <CameraIcon />
                        <span>{text.changePhoto}</span>
                      </div>
                    )}
                  </div>
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleEditImage} className="dilz-sr-only" />
                </label>

                {[['Title *', 'titre', 'text'], ['Store *', 'magasin', 'text']].map(([label, key, type]) => (
                  <div key={key} className="dilz-form-field">
                    <label className="dilz-form-label">{label}</label>
                    <input
                      type={type}
                      className="dilz-input"
                      value={editForm[key]}
                      onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })}
                    />
                  </div>
                ))}

                <div className="dilz-form-field">
                  <label className="dilz-form-label">City</label>
                  <select
                    className="dilz-input dilz-select"
                    value={editForm.ville}
                    onChange={(e) => setEditForm({ ...editForm, ville: e.target.value })}
                  >
                    <option value="">Select city…</option>
                    {Object.keys(CITY_COORDS).map((v) => (
                      <option key={v} value={v}>{traduireVille(v, 'en')}</option>
                    ))}
                    <option value="אונליין">Online deal</option>
                  </select>
                </div>

                <div className="dilz-form-grid-2">
                  {[['Deal price *', 'prix'], ['Original price', 'prix_original']].map(([label, key]) => (
                    <div key={key} className="dilz-form-field">
                      <label className="dilz-form-label">{label}</label>
                      <input
                        type="number"
                        className="dilz-input"
                        value={editForm[key]}
                        onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })}
                      />
                    </div>
                  ))}
                </div>

                <div className="dilz-form-grid-2">
                  <div className="dilz-form-field">
                    <label className="dilz-form-label">Start date</label>
                    <input
                      type="date"
                      className="dilz-input"
                      value={editForm.date_debut || ''}
                      max={editForm.date_fin || undefined}
                      onChange={(e) => setEditForm({ ...editForm, date_debut: e.target.value })}
                    />
                  </div>
                  <div className="dilz-form-field">
                    <label className="dilz-form-label">End date</label>
                    <input
                      type="date"
                      className="dilz-input"
                      value={editForm.date_fin || ''}
                      min={editForm.date_debut || undefined}
                      onChange={(e) => setEditForm({ ...editForm, date_fin: e.target.value })}
                    />
                  </div>
                </div>

                <div className="dilz-form-field">
                  <label className="dilz-form-label">Category</label>
                  <div className="dilz-cat-chips">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        className={['dilz-cat-chip', editForm.categorie === cat ? 'is-active' : ''].filter(Boolean).join(' ')}
                        onClick={() => setEditForm({ ...editForm, categorie: cat })}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="dilz-form-field">
                  <label className="dilz-form-label">Link (optional)</label>
                  <input
                    type="url"
                    className="dilz-input"
                    value={editForm.url_source}
                    onChange={(e) => setEditForm({ ...editForm, url_source: e.target.value })}
                    placeholder="https://..."
                  />
                </div>

                <div className="dilz-form-field">
                  <label className="dilz-form-label">Description</label>
                  <textarea
                    className="dilz-input dilz-textarea"
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    rows={3}
                  />
                </div>

                {editImageError && <p className="dilz-form-error">{editImageError}</p>}
                {editError && <p className="dilz-form-error">{editError}</p>}

                <div className="dilz-edit-form__actions">
                  <button
                    type="button"
                    className="dilz-button dilz-button--secondary dilz-button--lg"
                    onClick={() => setIsEditing(false)}
                  >
                    {text.cancel}
                  </button>
                  <button
                    type="button"
                    className="dilz-button dilz-button--primary dilz-button--lg"
                    onClick={handleEditSubmit}
                    disabled={editSubmitting}
                  >
                    {editSubmitting ? text.saving : text.save}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        <CopyToast visible={copySuccess} lang={lang} />
      </div>
    </>
  );
}

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import { traduireVille } from '../../lib/translations';
import { uploadDealImage, validateImageFile, deleteDealImage } from '../../lib/uploadImage';

const ACCENT = '#D4622A';
const ACCENT_DARK = '#B84E20';

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

function computeVoteDeltas(current, next) {
  if (current === next) {
    return { chaud_delta: next === 'chaud' ? -1 : 0, froid_delta: next === 'froid' ? -1 : 0, newVote: null };
  }
  const d = { chaud_delta: 0, froid_delta: 0 };
  if (current === 'chaud') d.chaud_delta -= 1;
  if (current === 'froid') d.froid_delta -= 1;
  if (next === 'chaud') d.chaud_delta += 1;
  if (next === 'froid') d.froid_delta += 1;
  return { ...d, newVote: next };
}

function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'Just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function DealPage() {
  const router = useRouter();
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

  // Comment votes (client-side only)
  const [commentVotes, setCommentVotes] = useState({});

  // Reply state
  const [replyTo, setReplyTo] = useState(null); // { id, auteur_nom }
  const [replyText, setReplyText] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);

  // Edit deal state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');
  const [editImageFile, setEditImageFile] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState(null);
  const [editImageError, setEditImageError] = useState('');

  // Share feedback
  const [copySuccess, setCopySuccess] = useState(false);

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
      setEditForm({
        titre: data.bon_plan.titre || '',
        description: data.bon_plan.description || '',
        prix: data.bon_plan.prix || '',
        prix_original: data.bon_plan.prix_original || '',
        magasin: data.bon_plan.magasin || '',
        ville: data.bon_plan.ville || '',
        categorie: data.bon_plan.categorie || 'Food',
        url_source: data.bon_plan.url_source || '',
        date_debut: data.bon_plan.date_debut || '',
        date_fin: data.bon_plan.date_fin || '',
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

    // Compute optimistic toggle
    const optimisticNewVote = myVote === type ? null : type;
    const chaud_delta = (myVote === 'chaud' ? -1 : 0) + (optimisticNewVote === 'chaud' ? 1 : 0);
    const froid_delta = (myVote === 'froid' ? -1 : 0) + (optimisticNewVote === 'froid' ? 1 : 0);
    const prevVote = myVote;

    // Optimistic update
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
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        action: 'vote', id, type,
        chaud_delta, froid_delta, // fallback deltas
      }),
    });

    if (apiRes.ok) {
      const data = await apiRes.json();
      // Reconcile with server-authoritative state
      const serverVote = data.newType ?? null;
      setMyVote(serverVote);
      try {
        const dv = JSON.parse(localStorage.getItem('dilzDealVotes') || '{}');
        dv[id] = serverVote;
        localStorage.setItem('dilzDealVotes', JSON.stringify(dv));
      } catch {}
      if (data.votes_chaud !== undefined) {
        setDeal(prev => ({
          ...prev,
          votes_chaud: data.votes_chaud,
          votes_froid: data.votes_froid,
        }));
      }
    } else {
      // Rollback
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
      const current = prev[commentId];
      const next = { ...prev, [commentId]: current === type ? null : type };
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
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          bon_plan_id: id,
          contenu: newComment.trim(),
        }),
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
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          bon_plan_id: id,
          contenu: `↩ @${replyTo.auteur_nom}: ${replyText.trim()}`,
        }),
      });
      const d = await r.json();
      if (r.ok && !d.erreur) {
        setReplyTo(null);
        setReplyText('');
        await fetchComments();
      }
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
    if (!editForm.titre || !editForm.prix || !editForm.magasin) {
      setEditError('Title, price and store are required');
      return;
    }
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
      if (!session) {
        setEditError('Session expired. Please sign in again.');
        setEditSubmitting(false);
        return;
      }

      const res = await fetch('/api/bons-plans', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: 'edit', id,
          ...editForm,
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
    const url = window.location.href;
    const text = `${deal.titre} — ₪${deal.prix} at ${deal.magasin}${deal.ville ? `, ${deal.ville}` : ''} 🔥`;
    if (navigator.share) {
      try { await navigator.share({ title: deal.titre, text, url }); } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(url);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch {
        const ta = document.createElement('textarea');
        ta.value = url;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      }
    }
  };

  if (!mounted) return null;

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading deal...</div>
      </div>
    );
  }

  if (!deal) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <p style={{ fontSize: 16, color: 'var(--text-sub)' }}>Deal not found</p>
        <Link href="/" style={{ color: ACCENT, textDecoration: 'none', fontWeight: 600 }}>← Back to deals</Link>
      </div>
    );
  }

  const reduction = deal.prix_original
    ? Math.round((deal.prix_original - deal.prix) / deal.prix_original * 100)
    : null;

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
    </Head>
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 80 }}>
      {/* Header */}
      <div style={{
        background: 'var(--nav-bg)', borderBottom: '1px solid var(--border)',
        padding: '14px 16px', position: 'sticky', top: 0, zIndex: 50,
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      }}>
        <div style={{ maxWidth: 600, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={() => {
            try { sessionStorage.setItem('dilzReturnTab', 'deals'); } catch {}
            router.back();
          }} style={{ background: 'none', border: 'none', color: 'var(--text-sub)', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
            ← Back
          </button>
          <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
            dil<span style={{ color: ACCENT }}>z</span>
          </span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button onClick={handleShare} style={{
              background: copySuccess ? 'rgba(5,150,105,0.08)' : 'transparent',
              border: copySuccess ? '1px solid #059669' : '1px solid var(--border)',
              borderRadius: 8, padding: '5px 12px',
              color: copySuccess ? '#059669' : 'var(--text-sub)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>
              {copySuccess ? 'Copied' : 'Share'}
            </button>
            {isOwner && (
              <button onClick={() => setIsEditing(true)} style={{
                background: 'transparent', border: `1px solid ${ACCENT}`,
                borderRadius: 8, padding: '5px 12px',
                color: ACCENT, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}>
                Edit
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        {/* Image */}
        {deal.image_url ? (
          <div style={{ position: 'relative', height: 280 }}>
            <img
              src={deal.image_url}
              alt={deal.titre}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
            />
            <div style={{ display: 'none', height: 280, background: 'var(--bg-card2)', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ opacity: 0.2 }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
              </div>
            </div>
            {deal.categorie && (
              <span style={{ position: 'absolute', top: 16, left: 16, background: 'rgba(0,0,0,0.65)', color: '#fff', fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 4 }}>{deal.categorie}</span>
            )}
            {reduction !== null && (
              <span style={{ position: 'absolute', top: 16, right: 16, background: ACCENT, color: '#fff', fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 4 }}>-{reduction}%</span>
            )}
          </div>
        ) : (
          <div style={{ height: 140, background: 'var(--bg-card2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ opacity: 0.15 }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
            </div>
          </div>
        )}

        {/* Content */}
        <div style={{ padding: '20px 16px 0' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 28, fontWeight: 700, color: ACCENT }}>₪{deal.prix}</span>
            {deal.prix_original && (
              <span style={{ fontSize: 18, color: 'var(--text-muted)', textDecoration: 'line-through' }}>₪{deal.prix_original}</span>
            )}
          </div>

          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 10, lineHeight: 1.3 }}>{deal.titre}</h1>

          <p style={{ fontSize: 13, color: 'var(--text-sub)', marginBottom: 16 }}>
            {[deal.magasin, deal.ville ? traduireVille(deal.ville, 'en') : null].filter(Boolean).join(' · ')}
            {' · '}{timeAgo(deal.created_at)}
            {deal.auteur_nom ? ` · by ${deal.auteur_nom}` : ''}
          </p>

          {(deal.date_debut || deal.date_fin) && (
            <div style={{
              display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16,
              padding: '10px 12px', borderRadius: 8,
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              color: 'var(--text-sub)', fontSize: 12,
            }}>
              {deal.date_debut && <span>Starts: {new Date(`${deal.date_debut}T00:00:00`).toLocaleDateString('en-GB')}</span>}
              {deal.date_fin && <span>Ends: {new Date(`${deal.date_fin}T00:00:00`).toLocaleDateString('en-GB')}</span>}
            </div>
          )}

          {deal.description && (
            <div style={{ background: 'var(--bg-card)', borderRadius: 10, padding: '14px 16px', marginBottom: 16, border: '1px solid var(--border)' }}>
              <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.6 }}>{deal.description}</p>
            </div>
          )}

          {deal.url_source && (
            <a href={deal.url_source} target="_blank" rel="noopener noreferrer" style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'var(--bg-card)', borderRadius: 8, padding: '12px 16px',
              marginBottom: 16, textDecoration: 'none', color: ACCENT, fontWeight: 600, fontSize: 14,
              border: '1px solid var(--border)',
            }}>
              View online deal ↗
            </a>
          )}

          {/* Votes */}
          <div style={{ display: 'flex', gap: 8, padding: '14px 0 12px', borderTop: '1px solid var(--border)' }}>
            <button onClick={() => handleVote('chaud')} style={{
              flex: 1, padding: '12px 20px', borderRadius: 9,
              border: myVote === 'chaud' ? `1px solid ${ACCENT}` : '1px solid var(--border)',
              background: myVote === 'chaud' ? ACCENT : 'transparent',
              color: myVote === 'chaud' ? '#fff' : 'var(--text-sub)',
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}>
              🔥 {deal.votes_chaud || 0}
            </button>
            <button onClick={() => handleVote('froid')} style={{
              flex: 1, padding: '12px 20px', borderRadius: 9,
              border: myVote === 'froid' ? '1px solid #64748B' : '1px solid var(--border)',
              background: myVote === 'froid' ? '#64748B' : 'transparent',
              color: myVote === 'froid' ? '#fff' : 'var(--text-sub)',
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}>
              ❄️ {deal.votes_froid || 0}
            </button>
          </div>

          {/* Share row */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`${deal.titre} — ₪${deal.prix} at ${deal.magasin}${deal.ville ? `, ${deal.ville}` : ''} ${typeof window !== 'undefined' ? window.location.href : ''}`)}`}
              target="_blank" rel="noopener noreferrer"
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                padding: '9px 0', borderRadius: 8,
                background: 'transparent', border: '1px solid rgba(37,211,102,0.35)',
                color: '#25D366', textDecoration: 'none', fontSize: 12, fontWeight: 600,
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              WhatsApp
            </a>
            <a
              href={`https://t.me/share/url?url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}&text=${encodeURIComponent(`${deal.titre} — ₪${deal.prix} at ${deal.magasin}${deal.ville ? `, ${deal.ville}` : ''}`)}`}
              target="_blank" rel="noopener noreferrer"
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                padding: '9px 0', borderRadius: 8,
                background: 'transparent', border: '1px solid rgba(42,171,238,0.35)',
                color: '#2AABEE', textDecoration: 'none', fontSize: 12, fontWeight: 600,
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
              Telegram
            </a>
            <button onClick={handleShare} style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '9px 0', borderRadius: 8, border: '1px solid var(--border)',
              background: copySuccess ? 'rgba(5,150,105,0.08)' : 'transparent',
              color: copySuccess ? '#059669' : 'var(--text-sub)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>
              {copySuccess ? 'Copied' : 'Copy link'}
            </button>
          </div>

          {/* Comments */}
          <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>
            Comments ({comments.length})
          </p>

          {comments.length === 0 ? (
            <div style={{ background: 'var(--bg-card)', borderRadius: 10, padding: '24px', textAlign: 'center', marginBottom: 16, border: '1px solid var(--border)' }}>
              <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>No comments yet — be the first!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              {comments.map(c => {
                const initials = (c.auteur_nom || 'A').slice(0, 2).toUpperCase();
                const isReply = c.contenu.startsWith('↩ @');
                const myCommentVote = commentVotes[c.id] || null;
                return (
                  <div key={c.id} style={{
                    background: 'var(--bg-card)', borderRadius: 10,
                    padding: '14px 16px', border: '1px solid var(--border)',
                    marginLeft: isReply ? 24 : 0,
                    borderLeft: isReply ? `3px solid ${ACCENT}` : 'none',
                    boxShadow: 'var(--shadow-card)',
                  }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                        background: isReply ? `rgba(212,98,42,0.12)` : 'var(--bg-card2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: isReply ? ACCENT : 'var(--text-sub)' }}>{initials}</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{c.auteur_nom || 'Anonymous'}</span>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{timeAgo(c.created_at)}</span>
                        </div>
                        <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.5 }}>{c.contenu}</p>

                        {/* Comment actions */}
                        <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
                          <button onClick={() => handleCommentVote(c.id, 'chaud')} style={{
                            background: 'transparent',
                            border: myCommentVote === 'chaud' ? `1px solid ${ACCENT}` : '1px solid var(--border)',
                            borderRadius: 6, padding: '2px 8px',
                            color: myCommentVote === 'chaud' ? ACCENT : 'var(--text-muted)',
                            fontSize: 11, fontWeight: 500, cursor: 'pointer',
                          }}>+1</button>
                          <button onClick={() => handleCommentVote(c.id, 'froid')} style={{
                            background: 'transparent',
                            border: myCommentVote === 'froid' ? '1px solid #64748B' : '1px solid var(--border)',
                            borderRadius: 6, padding: '2px 8px',
                            color: myCommentVote === 'froid' ? '#64748B' : 'var(--text-muted)',
                            fontSize: 11, fontWeight: 500, cursor: 'pointer',
                          }}>-1</button>
                          {user && !isReply && (
                            <button onClick={() => {
                              setReplyTo({ id: c.id, auteur_nom: c.auteur_nom });
                              setReplyText('');
                            }} style={{
                              background: 'none', border: 'none', padding: '2px 0',
                              color: 'var(--text-sub)', fontSize: 12, cursor: 'pointer', fontWeight: 500,
                            }}>
                              ↩ Reply
                            </button>
                          )}
                        </div>

                        {/* Inline reply input */}
                        {replyTo?.id === c.id && (
                          <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                            <input
                              autoFocus
                              type="text"
                              placeholder={`Reply to ${c.auteur_nom}...`}
                              value={replyText}
                              onChange={e => setReplyText(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && handleReply()}
                              style={{
                                flex: 1, padding: '8px 12px', borderRadius: 12,
                                border: `1px solid ${ACCENT}`, background: 'var(--bg-input)',
                                color: 'var(--text)', fontSize: 13, outline: 'none',
                              }}
                            />
                            <button onClick={handleReply} disabled={replySubmitting || !replyText.trim()} style={{
                              padding: '8px 14px', borderRadius: 12, border: 'none',
                              background: replyText.trim() ? ACCENT : 'var(--bg-card2)',
                              color: replyText.trim() ? '#fff' : 'var(--text-muted)',
                              fontSize: 13, fontWeight: 600, cursor: 'pointer',
                            }}>
                              {replySubmitting ? '...' : '↩'}
                            </button>
                            <button onClick={() => setReplyTo(null)} style={{
                              padding: '8px 10px', borderRadius: 12, border: 'none',
                              background: 'var(--bg-card2)', color: 'var(--text-muted)',
                              fontSize: 13, cursor: 'pointer',
                            }}>✕</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Comment input */}
          {commentError && <p style={{ color: '#DC2626', fontSize: 13, marginBottom: 8 }}>{commentError}</p>}
          {user ? (
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                type="text"
                placeholder="Add a comment..."
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleComment()}
                style={{ flex: 1, padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text)', fontSize: 14, outline: 'none' }}
              />
              <button onClick={handleComment} disabled={submitting || !newComment.trim()} style={{
                padding: '12px 20px', borderRadius: 8, border: 'none',
                background: newComment.trim() ? ACCENT : 'var(--bg-card2)',
                color: newComment.trim() ? '#fff' : 'var(--text-muted)',
                fontSize: 14, fontWeight: 700, cursor: newComment.trim() ? 'pointer' : 'default',
              }}>
                {submitting ? '...' : 'Send'}
              </button>
            </div>
          ) : (
            <Link href={`/auth?redirect=/deal/${id}`} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '14px 20px', borderRadius: 8,
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              color: ACCENT, textDecoration: 'none', fontSize: 14, fontWeight: 600,
            }}>
              Sign in to comment
            </Link>
          )}
        </div>
      </div>

      {/* Edit modal */}
      {isEditing && (
        <div
          onClick={() => setIsEditing(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 600,
              background: 'var(--bg-card)', borderRadius: '24px 24px 0 0',
              padding: '20px 16px 44px',
              maxHeight: '90vh', overflowY: 'auto',
            }}
          >
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 16px' }} />
            <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>Edit deal</p>

            {/* Image */}
            <label style={{ cursor: 'pointer', display: 'block', marginBottom: 14 }}>
              <div style={{
                height: editImagePreview || deal.image_url ? 160 : 80,
                borderRadius: 8, border: `1px dashed ${ACCENT}`,
                overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--bg-card2)',
              }}>
                {(editImagePreview || deal.image_url) ? (
                  <img src={editImagePreview || deal.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: 22, marginBottom: 4 }}>📸</div>
                    <div style={{ fontSize: 12 }}>Change photo</div>
                  </div>
                )}
              </div>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleEditImage} style={{ display: 'none' }} />
            </label>

            {/* Fields */}
            {[['Title *', 'titre'], ['Store *', 'magasin']].map(([label, key]) => (
              <div key={key} style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 5 }}>{label}</label>
                <input type="text" value={editForm[key]} onChange={e => setEditForm({ ...editForm, [key]: e.target.value })}
                  style={{ width: '100%', padding: '11px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text)', fontSize: 14, outline: 'none' }}
                />
              </div>
            ))}

            {/* City */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 5 }}>City</label>
              <select value={editForm.ville} onChange={e => setEditForm({ ...editForm, ville: e.target.value })}
                style={{ width: '100%', padding: '11px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text)', fontSize: 14, outline: 'none', appearance: 'none', cursor: 'pointer' }}
              >
                <option value="">Select city…</option>
                {Object.keys(CITY_COORDS).map(v => (
                  <option key={v} value={v}>{traduireVille(v, 'en')}</option>
                ))}
                <option value="אונליין">🌐 Online deal</option>
              </select>
            </div>

            {/* Prices */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              {[['Deal price *', 'prix'], ['Original price', 'prix_original']].map(([label, key]) => (
                <div key={key}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 5 }}>{label}</label>
                  <input type="number" value={editForm[key]} onChange={e => setEditForm({ ...editForm, [key]: e.target.value })}
                    style={{ width: '100%', padding: '11px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text)', fontSize: 14, outline: 'none' }}
                  />
                </div>
              ))}
            </div>

            {/* Dates */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 5 }}>Start date</label>
                <input type="date" value={editForm.date_debut || ''} max={editForm.date_fin || undefined}
                  onChange={e => setEditForm({ ...editForm, date_debut: e.target.value })}
                  style={{ width: '100%', padding: '11px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text)', fontSize: 13, outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 5 }}>End date</label>
                <input type="date" value={editForm.date_fin || ''} min={editForm.date_debut || undefined}
                  onChange={e => setEditForm({ ...editForm, date_fin: e.target.value })}
                  style={{ width: '100%', padding: '11px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text)', fontSize: 13, outline: 'none' }}
                />
              </div>
            </div>

            {/* Category */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 5 }}>Category</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {CATEGORIES.map(cat => (
                  <button key={cat} onClick={() => setEditForm({ ...editForm, categorie: cat })} style={{
                    padding: '5px 12px', borderRadius: 7, cursor: 'pointer', fontSize: 13,
                    border: editForm.categorie === cat ? `1px solid ${ACCENT}` : '1px solid var(--border)',
                    background: editForm.categorie === cat ? 'rgba(212,98,42,0.1)' : 'var(--bg-input)',
                    color: editForm.categorie === cat ? ACCENT : 'var(--text-sub)',
                    fontWeight: editForm.categorie === cat ? 700 : 400,
                  }}>{cat}</button>
                ))}
              </div>
            </div>

            {/* Link */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 5 }}>Link (optional)</label>
              <input type="url" value={editForm.url_source} onChange={e => setEditForm({ ...editForm, url_source: e.target.value })}
                placeholder="https://..."
                style={{ width: '100%', padding: '11px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text)', fontSize: 14, outline: 'none' }}
              />
            </div>

            {/* Description */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 5 }}>Description</label>
              <textarea value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} rows={3}
                style={{ width: '100%', padding: '11px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text)', fontSize: 14, outline: 'none', resize: 'vertical' }}
              />
            </div>

            {editImageError && <p style={{ color: '#DC2626', fontSize: 13, marginBottom: 8 }}>{editImageError}</p>}
            {editError && <p style={{ color: '#DC2626', fontSize: 13, marginBottom: 12 }}>{editError}</p>}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setIsEditing(false)} style={{
                flex: 1, padding: 14, borderRadius: 8, border: '1px solid var(--border)',
                background: 'var(--bg-card2)', color: 'var(--text-sub)', fontSize: 15, cursor: 'pointer',
              }}>Cancel</button>
              <button onClick={handleEditSubmit} disabled={editSubmitting} style={{
                flex: 2, padding: 14, borderRadius: 9, border: 'none',
                background: editSubmitting ? 'var(--bg-card2)' : ACCENT,
                color: editSubmitting ? 'var(--text-muted)' : '#fff',
                fontSize: 14, fontWeight: 600, cursor: editSubmitting ? 'default' : 'pointer',
              }}>
                {editSubmitting ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import { traduireVille } from '../../lib/translations';

const ACCENT = '#0284C7';
const ACCENT_DARK = '#0369A1';

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
    if (myVote === type) { setMyVote(null); return; }
    setMyVote(type);
    setDeal(prev => ({ ...prev, [`votes_${type}`]: (prev[`votes_${type}`] || 0) + 1 }));
    await fetch('/api/bons-plans', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, vote: type }),
    });
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
    const displayName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'User';
    try {
      const r = await fetch('/api/commentaires', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bon_plan_id: id,
          contenu: newComment.trim(),
          auteur_nom: displayName,
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
    const displayName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'User';
    try {
      const r = await fetch('/api/commentaires', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bon_plan_id: id,
          contenu: `↩ @${replyTo.auteur_nom}: ${replyText.trim()}`,
          auteur_nom: displayName,
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

  const handleEditImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
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
    try {
      let image_url = deal.image_url;

      if (editImageFile) {
        const reader = new FileReader();
        const base64 = await new Promise((resolve) => {
          reader.onload = (e) => resolve(e.target.result.split(',')[1]);
          reader.readAsDataURL(editImageFile);
        });
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64, filename: editImageFile.name, mimeType: editImageFile.type }),
        });
        const uploadData = await uploadRes.json();
        if (uploadData.url) image_url = uploadData.url;
      }

      const res = await fetch('/api/bons-plans', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'edit', id,
          auteur_id: user.id,
          ...editForm,
          prix: parseFloat(editForm.prix),
          prix_original: editForm.prix_original ? parseFloat(editForm.prix_original) : null,
          image_url,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.erreur) {
        setEditError(data.erreur || 'Failed to update');
        setEditSubmitting(false);
        return;
      }
      setIsEditing(false);
      setEditImageFile(null);
      setEditImagePreview(null);
      await fetchDeal();
    } catch (e) {
      setEditError(e.message || 'Network error');
    }
    setEditSubmitting(false);
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

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 40 }}>
      {/* Header */}
      <div style={{
        background: 'var(--nav-bg)', borderBottom: '0.5px solid var(--border)',
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
          <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>
            dil<span style={{ color: ACCENT }}>z</span>
          </span>
          {isOwner ? (
            <button onClick={() => setIsEditing(true)} style={{
              background: 'rgba(2,132,199,0.1)', border: `1px solid ${ACCENT}`,
              borderRadius: 12, padding: '5px 12px',
              color: ACCENT, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>
              ✏️ Edit
            </button>
          ) : <div style={{ width: 48 }} />}
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
              <span style={{ fontSize: 48 }}>🛍️</span>
            </div>
            {deal.categorie && (
              <span style={{ position: 'absolute', top: 16, left: 16, background: 'rgba(0,0,0,0.65)', color: '#fff', fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20 }}>{deal.categorie}</span>
            )}
            {reduction !== null && (
              <span style={{ position: 'absolute', top: 16, right: 16, background: ACCENT, color: '#fff', fontSize: 12, fontWeight: 800, padding: '4px 10px', borderRadius: 20 }}>-{reduction}% OFF</span>
            )}
          </div>
        ) : (
          <div style={{ height: 140, background: 'var(--bg-card2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 48 }}>🛍️</span>
          </div>
        )}

        {/* Content */}
        <div style={{ padding: '20px 16px 0' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 32, fontWeight: 900, color: ACCENT }}>₪{deal.prix}</span>
            {deal.prix_original && (
              <span style={{ fontSize: 18, color: 'var(--text-muted)', textDecoration: 'line-through' }}>₪{deal.prix_original}</span>
            )}
          </div>

          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 10, lineHeight: 1.3 }}>{deal.titre}</h1>

          <p style={{ fontSize: 14, color: 'var(--text-sub)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>📍</span>
            <span>
              {[deal.magasin, deal.ville ? traduireVille(deal.ville, 'en') : null].filter(Boolean).join(' · ')}
              {' · '}{timeAgo(deal.created_at)}
              {deal.auteur_nom ? ` · by ${deal.auteur_nom}` : ''}
            </span>
          </p>

          {deal.description && (
            <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: '14px 16px', marginBottom: 16, boxShadow: 'var(--shadow-card)' }}>
              <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.6 }}>{deal.description}</p>
            </div>
          )}

          {deal.url_source && (
            <a href={deal.url_source} target="_blank" rel="noopener noreferrer" style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'var(--bg-card)', borderRadius: 14, padding: '12px 16px',
              marginBottom: 16, textDecoration: 'none', color: ACCENT, fontWeight: 600, fontSize: 14,
              boxShadow: 'var(--shadow-card)',
            }}>
              🔗 View online deal ↗
            </a>
          )}

          {/* Votes */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 24, padding: '16px 0', borderTop: '0.5px solid var(--border)', borderBottom: '0.5px solid var(--border)' }}>
            <button onClick={() => handleVote('chaud')} style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '14px 20px', borderRadius: 16, border: 'none',
              background: myVote === 'chaud' ? `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DARK})` : 'var(--bg-card)',
              color: myVote === 'chaud' ? '#fff' : 'var(--text)',
              fontSize: 15, fontWeight: 700, cursor: 'pointer', boxShadow: 'var(--shadow-card)',
            }}>
              🔥 {deal.votes_chaud} <span style={{ fontSize: 12, opacity: 0.7 }}>Hot</span>
            </button>
            <button onClick={() => handleVote('froid')} style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '14px 20px', borderRadius: 16, border: 'none',
              background: myVote === 'froid' ? 'var(--bg-card2)' : 'var(--bg-card)',
              color: myVote === 'froid' ? '#4B9FE1' : 'var(--text)',
              fontSize: 15, fontWeight: 700, cursor: 'pointer', boxShadow: 'var(--shadow-card)',
              border: myVote === 'froid' ? '1.5px solid #4B9FE1' : '0.5px solid var(--border)',
            }}>
              ❄️ {deal.votes_froid} <span style={{ fontSize: 12, opacity: 0.7 }}>Cold</span>
            </button>
          </div>

          {/* Comments */}
          <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>
            Comments ({comments.length})
          </p>

          {comments.length === 0 ? (
            <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: '24px', textAlign: 'center', marginBottom: 16, boxShadow: 'var(--shadow-card)' }}>
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
                    background: 'var(--bg-card)', borderRadius: 16,
                    padding: '14px 16px',
                    marginLeft: isReply ? 24 : 0,
                    borderLeft: isReply ? `3px solid ${ACCENT}` : 'none',
                    boxShadow: 'var(--shadow-card)',
                  }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                        background: isReply ? `rgba(2,132,199,0.15)` : 'var(--bg-card2)',
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
                        <div style={{ display: 'flex', gap: 10, marginTop: 8, alignItems: 'center' }}>
                          <button onClick={() => handleCommentVote(c.id, 'chaud')} style={{
                            display: 'flex', alignItems: 'center', gap: 3,
                            background: myCommentVote === 'chaud' ? ACCENT : 'var(--bg-card2)',
                            border: 'none', borderRadius: 10, padding: '3px 8px',
                            color: myCommentVote === 'chaud' ? '#fff' : 'var(--text-sub)',
                            fontSize: 12, fontWeight: 600, cursor: 'pointer',
                          }}>🔥</button>
                          <button onClick={() => handleCommentVote(c.id, 'froid')} style={{
                            display: 'flex', alignItems: 'center', gap: 3,
                            background: myCommentVote === 'froid' ? '#4B9FE1' : 'var(--bg-card2)',
                            border: 'none', borderRadius: 10, padding: '3px 8px',
                            color: myCommentVote === 'froid' ? '#fff' : 'var(--text-sub)',
                            fontSize: 12, fontWeight: 600, cursor: 'pointer',
                          }}>❄️</button>
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
                style={{ flex: 1, padding: '12px 16px', borderRadius: 16, border: '0.5px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text)', fontSize: 14, outline: 'none' }}
              />
              <button onClick={handleComment} disabled={submitting || !newComment.trim()} style={{
                padding: '12px 20px', borderRadius: 16, border: 'none',
                background: newComment.trim() ? `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DARK})` : 'var(--bg-card2)',
                color: newComment.trim() ? '#fff' : 'var(--text-muted)',
                fontSize: 14, fontWeight: 700, cursor: newComment.trim() ? 'pointer' : 'default',
              }}>
                {submitting ? '...' : 'Send'}
              </button>
            </div>
          ) : (
            <Link href={`/auth?redirect=/deal/${id}`} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '14px 20px', borderRadius: 16,
              background: 'var(--bg-card)', border: '0.5px solid var(--border)',
              color: ACCENT, textDecoration: 'none', fontSize: 14, fontWeight: 600,
              boxShadow: 'var(--shadow-card)',
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
            <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginBottom: 16 }}>✏️ Edit deal</p>

            {/* Image */}
            <label style={{ cursor: 'pointer', display: 'block', marginBottom: 14 }}>
              <div style={{
                height: editImagePreview || deal.image_url ? 160 : 80,
                borderRadius: 14, border: `2px dashed ${ACCENT}`,
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
              <input type="file" accept="image/*" onChange={handleEditImage} style={{ display: 'none' }} />
            </label>

            {/* Fields */}
            {[['Title *', 'titre'], ['Store *', 'magasin']].map(([label, key]) => (
              <div key={key} style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 5 }}>{label}</label>
                <input type="text" value={editForm[key]} onChange={e => setEditForm({ ...editForm, [key]: e.target.value })}
                  style={{ width: '100%', padding: '11px 14px', borderRadius: 14, border: '0.5px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text)', fontSize: 14, outline: 'none' }}
                />
              </div>
            ))}

            {/* City */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 5 }}>City</label>
              <select value={editForm.ville} onChange={e => setEditForm({ ...editForm, ville: e.target.value })}
                style={{ width: '100%', padding: '11px 14px', borderRadius: 14, border: '0.5px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text)', fontSize: 14, outline: 'none', appearance: 'none', cursor: 'pointer' }}
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
                    style={{ width: '100%', padding: '11px 14px', borderRadius: 14, border: '0.5px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text)', fontSize: 14, outline: 'none' }}
                  />
                </div>
              ))}
            </div>

            {/* Category */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 5 }}>Category</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {CATEGORIES.map(cat => (
                  <button key={cat} onClick={() => setEditForm({ ...editForm, categorie: cat })} style={{
                    padding: '5px 12px', borderRadius: 20, cursor: 'pointer', fontSize: 13,
                    border: editForm.categorie === cat ? `1.5px solid ${ACCENT}` : '0.5px solid var(--border)',
                    background: editForm.categorie === cat ? 'rgba(2,132,199,0.1)' : 'var(--bg-input)',
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
                style={{ width: '100%', padding: '11px 14px', borderRadius: 14, border: '0.5px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text)', fontSize: 14, outline: 'none' }}
              />
            </div>

            {/* Description */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 5 }}>Description</label>
              <textarea value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} rows={3}
                style={{ width: '100%', padding: '11px 14px', borderRadius: 14, border: '0.5px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text)', fontSize: 14, outline: 'none', resize: 'vertical' }}
              />
            </div>

            {editError && <p style={{ color: '#DC2626', fontSize: 13, marginBottom: 12 }}>{editError}</p>}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setIsEditing(false)} style={{
                flex: 1, padding: 14, borderRadius: 14, border: '0.5px solid var(--border)',
                background: 'var(--bg-card2)', color: 'var(--text-sub)', fontSize: 15, cursor: 'pointer',
              }}>Cancel</button>
              <button onClick={handleEditSubmit} disabled={editSubmitting} style={{
                flex: 2, padding: 14, borderRadius: 14, border: 'none',
                background: editSubmitting ? 'var(--bg-card2)' : `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DARK})`,
                color: editSubmitting ? 'var(--text-muted)' : '#fff',
                fontSize: 15, fontWeight: 700, cursor: editSubmitting ? 'default' : 'pointer',
                boxShadow: editSubmitting ? 'none' : '0 4px 18px rgba(2,132,199,0.4)',
              }}>
                {editSubmitting ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

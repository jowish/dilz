import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';

const ACCENT = '#0284C7';
const ACCENT_DARK = '#0369A1';

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

  useEffect(() => {
    setMounted(true);
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setUser(data.session.user);
    });
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
    if (data.bon_plan) setDeal(data.bon_plan);
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
    setDeal(prev => ({
      ...prev,
      [`votes_${type}`]: (prev[`votes_${type}`] || 0) + 1,
    }));
    await fetch('/api/bons-plans', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, vote: type }),
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
          auteur_id: user.id,
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

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 40 }}>
      {/* Header */}
      <div style={{
        background: 'var(--nav-bg)',
        borderBottom: '0.5px solid var(--border)',
        padding: '14px 16px',
        position: 'sticky', top: 0, zIndex: 50,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}>
        <div style={{ maxWidth: 600, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={() => {
            try { sessionStorage.setItem('dilzReturnTab', 'deals'); } catch {}
            router.back();
          }} style={{
            background: 'none', border: 'none',
            color: 'var(--text-sub)', fontSize: 14, fontWeight: 500, cursor: 'pointer',
          }}>
            ← Back
          </button>
          <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>
            dil<span style={{ color: ACCENT }}>z</span>
          </span>
          <div style={{ width: 48 }} />
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        {/* Image */}
        {deal.image_url && (
          <div style={{ position: 'relative', height: 280 }}>
            <img src={deal.image_url} alt={deal.titre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            {deal.categorie && (
              <span style={{
                position: 'absolute', top: 16, left: 16,
                background: 'rgba(0,0,0,0.65)', color: '#fff',
                fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 20,
              }}>{deal.categorie}</span>
            )}
            {reduction !== null && (
              <span style={{
                position: 'absolute', top: 16, right: 16,
                background: ACCENT, color: '#fff',
                fontSize: 12, fontWeight: 800, padding: '4px 10px', borderRadius: 20,
              }}>-{reduction}% OFF</span>
            )}
          </div>
        )}

        {/* Content */}
        <div style={{ padding: '20px 16px 0' }}>
          {/* Price */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 32, fontWeight: 900, color: ACCENT }}>₪{deal.prix}</span>
            {deal.prix_original && (
              <span style={{ fontSize: 18, color: 'var(--text-muted)', textDecoration: 'line-through' }}>₪{deal.prix_original}</span>
            )}
          </div>

          {/* Title */}
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 10, lineHeight: 1.3 }}>{deal.titre}</h1>

          {/* Meta */}
          <p style={{ fontSize: 14, color: 'var(--text-sub)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>📍</span>
            <span>
              {[deal.magasin, deal.ville].filter(Boolean).join(' · ')}
              {' · '}{timeAgo(deal.created_at)}
              {deal.auteur_nom ? ` · by ${deal.auteur_nom}` : ''}
            </span>
          </p>

          {deal.description && (
            <div style={{
              background: 'var(--bg-card)', borderRadius: 16, padding: '14px 16px',
              marginBottom: 16, boxShadow: 'var(--shadow-card)',
            }}>
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
          <div style={{
            display: 'flex', gap: 12, marginBottom: 24,
            padding: '16px 0', borderTop: '0.5px solid var(--border)', borderBottom: '0.5px solid var(--border)',
          }}>
            <button onClick={() => handleVote('chaud')} style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '14px 20px', borderRadius: 16, border: 'none',
              background: myVote === 'chaud' ? `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DARK})` : 'var(--bg-card)',
              color: myVote === 'chaud' ? '#fff' : 'var(--text)',
              fontSize: 15, fontWeight: 700, cursor: 'pointer',
              boxShadow: myVote === 'chaud' ? '0 4px 18px rgba(212,98,42,0.4)' : 'var(--shadow-card)',
            }}>
              🔥 {deal.votes_chaud} <span style={{ fontSize: 12, opacity: 0.7 }}>Hot</span>
            </button>
            <button onClick={() => handleVote('froid')} style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '14px 20px', borderRadius: 16, border: 'none',
              background: myVote === 'froid' ? 'var(--bg-card2)' : 'var(--bg-card)',
              color: myVote === 'froid' ? '#4B9FE1' : 'var(--text)',
              fontSize: 15, fontWeight: 700, cursor: 'pointer',
              boxShadow: 'var(--shadow-card)',
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
            <div style={{
              background: 'var(--bg-card)', borderRadius: 16, padding: '24px',
              textAlign: 'center', marginBottom: 16,
              boxShadow: 'var(--shadow-card)',
            }}>
              <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>No comments yet — be the first!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              {comments.map(c => {
                const initials = (c.auteur_nom || 'A').slice(0, 2).toUpperCase();
                return (
                  <div key={c.id} style={{
                    background: 'var(--bg-card)', borderRadius: 16, padding: '14px 16px',
                    display: 'flex', gap: 12, alignItems: 'flex-start',
                    boxShadow: 'var(--shadow-card)',
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                      background: 'var(--bg-card2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-sub)' }}>{initials}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{c.auteur_nom || 'Anonymous'}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{timeAgo(c.created_at)}</span>
                      </div>
                      <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.5 }}>{c.contenu}</p>
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
                style={{
                  flex: 1, padding: '12px 16px', borderRadius: 16,
                  border: '0.5px solid var(--border)', background: 'var(--bg-input)',
                  color: 'var(--text)', fontSize: 14, outline: 'none',
                }}
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
    </div>
  );
}

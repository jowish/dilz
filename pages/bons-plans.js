import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

const ACCENT = '#D4622A';
const ACCENT_DARK = '#B84E20';

const CATEGORIES = ['all', 'Food', 'Tech', 'Fashion', 'Activities', 'Online'];
const CATEGORY_LABELS = { all: 'All', Food: 'Food', Tech: 'Tech', Fashion: 'Fashion', Activities: 'Activities', Online: 'Online' };

function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'Just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function PostDealModal({ onClose, onSubmit, user }) {
  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || '';
  const [form, setForm] = useState({
    titre: '', description: '', prix: '', prix_original: '',
    magasin: '', ville: '', auteur_nom: displayName, categorie: 'Food', url_source: '',
    date_debut: '', date_fin: '',
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!form.titre || !form.prix || !form.magasin) {
      setError('Title, price and store are required');
      return;
    }
    setSubmitting(true);
    setError('');

    try {
      let image_url = null;

      if (imageFile) {
        const reader = new FileReader();
        const base64 = await new Promise((resolve) => {
          reader.onload = (e) => resolve(e.target.result.split(',')[1]);
          reader.readAsDataURL(imageFile);
        });
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: base64,
            filename: imageFile.name,
            mimeType: imageFile.type,
          }),
        });
        const uploadData = await uploadRes.json();
        if (uploadData.url) image_url = uploadData.url;
      }

      const res = await fetch('/api/bons-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          prix: parseFloat(form.prix),
          prix_original: form.prix_original ? parseFloat(form.prix_original) : null,
          image_url,
          auteur_id: user?.id || null,
        }),
      });
      const data = await res.json();
      if (data.bon_plan) {
        onSubmit(data.bon_plan);
        onClose();
      }
    } catch (err) {
      setError('Failed to post deal. Please try again.');
    }
    setSubmitting(false);
  };

  const field = (label, key, type = 'text', placeholder = '') => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 6 }}>{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={form[key]}
        onChange={e => setForm({ ...form, [key]: e.target.value })}
        style={{
          width: '100%', padding: '12px 14px',
          borderRadius: 14, border: '0.5px solid var(--border)',
          background: 'var(--bg-input)', color: 'var(--text)',
          fontSize: 14, outline: 'none',
        }}
      />
    </div>
  );

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-card)',
          borderRadius: '24px 24px 0 0',
          padding: '20px 20px 44px',
          width: '100%', maxWidth: 600,
          maxHeight: '90vh', overflowY: 'auto',
        }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 20px' }} />
        <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginBottom: 20 }}>Post a deal</p>

        {/* Image upload */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 6 }}>Photo</label>
          <label style={{ cursor: 'pointer' }}>
            <div style={{
              height: imagePreview ? 180 : 100,
              borderRadius: 16,
              border: `2px dashed ${imagePreview ? ACCENT : 'var(--border)'}`,
              background: imagePreview ? 'transparent' : 'var(--bg-input)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden',
            }}>
              {imagePreview ? (
                <img src={imagePreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: 28, marginBottom: 6 }}>📸</div>
                  <div style={{ fontSize: 13 }}>Tap to add photo</div>
                </div>
              )}
            </div>
            <input type="file" accept="image/*" capture="environment" onChange={handleImage} style={{ display: 'none' }} />
          </label>
        </div>

        {field('Title *', 'titre', 'text', 'e.g. Pizza 3+1 free at Dominos')}

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 6 }}>Category</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {CATEGORIES.filter(c => c !== 'all').map(cat => (
              <button
                key={cat}
                onClick={() => setForm({ ...form, categorie: cat })}
                style={{
                  padding: '6px 14px', borderRadius: 20,
                  border: form.categorie === cat ? `1.5px solid ${ACCENT}` : '0.5px solid var(--border)',
                  background: form.categorie === cat ? 'rgba(212,98,42,0.1)' : 'var(--bg-input)',
                  color: form.categorie === cat ? ACCENT : 'var(--text-sub)',
                  fontSize: 13, fontWeight: form.categorie === cat ? 700 : 400, cursor: 'pointer',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 6 }}>Deal price *</label>
            <input
              type="number" placeholder="₪39" value={form.prix}
              onChange={e => setForm({ ...form, prix: e.target.value })}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 14, border: '0.5px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text)', fontSize: 14, outline: 'none' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 6 }}>Original price</label>
            <input
              type="number" placeholder="₪79" value={form.prix_original}
              onChange={e => setForm({ ...form, prix_original: e.target.value })}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 14, border: '0.5px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text)', fontSize: 14, outline: 'none' }}
            />
          </div>
        </div>

        {field('Store / Place *', 'magasin', 'text', 'e.g. Dominos, McDonald\'s, KSP')}
        {field('City *', 'ville', 'text', 'e.g. Tel Aviv, Herzliya')}
        {field('Your name (optional)', 'auteur_nom', 'text', 'Anonymous')}
        {field('Link (optional)', 'url_source', 'url', 'https://...')}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 6 }}>Start date (optional)</label>
            <input
              type="date"
              value={form.date_debut}
              onChange={e => setForm({ ...form, date_debut: e.target.value })}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 14, border: '0.5px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text)', fontSize: 14, outline: 'none' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 6 }}>End date (optional)</label>
            <input
              type="date"
              value={form.date_fin}
              onChange={e => setForm({ ...form, date_fin: e.target.value })}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 14, border: '0.5px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text)', fontSize: 14, outline: 'none' }}
            />
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-sub)', marginBottom: 6 }}>Description (optional)</label>
          <textarea
            placeholder="More details about this deal..."
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            rows={3}
            style={{
              width: '100%', padding: '12px 14px', borderRadius: 14,
              border: '0.5px solid var(--border)', background: 'var(--bg-input)',
              color: 'var(--text)', fontSize: 14, outline: 'none', resize: 'vertical',
            }}
          />
        </div>

        {error && (
          <p style={{ color: '#DC2626', fontSize: 13, marginBottom: 12 }}>{error}</p>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: 16, borderRadius: 16,
            border: '0.5px solid var(--border)', background: 'var(--bg-card2)',
            color: 'var(--text-sub)', fontSize: 15, cursor: 'pointer',
          }}>Cancel</button>
          <button onClick={handleSubmit} disabled={submitting} style={{
            flex: 2, padding: 16, borderRadius: 16, border: 'none',
            background: submitting ? 'var(--bg-card2)' : `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DARK})`,
            color: submitting ? 'var(--text-muted)' : '#fff',
            fontSize: 15, fontWeight: 700, cursor: submitting ? 'default' : 'pointer',
          }}>
            {submitting ? 'Posting...' : 'Post deal 🔥'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DealCard({ deal, onVote }) {
  const reduction = deal.prix_original
    ? Math.round((deal.prix_original - deal.prix) / deal.prix_original * 100)
    : null;

  return (
    <div style={{
      background: 'var(--bg-card)',
      borderRadius: 20, overflow: 'hidden',
      boxShadow: 'var(--shadow-card)', marginBottom: 12,
    }}>
      <Link href={`/deal/${deal.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
        <div style={{ position: 'relative', height: deal.image_url ? 210 : 72, background: 'var(--bg-card2)' }}>
          {deal.image_url ? (
            <img src={deal.image_url} alt={deal.titre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 30 }}>🛍️</span>
            </div>
          )}

          {deal.categorie && (
            <span style={{
              position: 'absolute', top: 10, left: 10,
              background: 'rgba(0,0,0,0.65)', color: '#fff',
              fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 20,
            }}>{deal.categorie}</span>
          )}
          {reduction !== null && (
            <span style={{
              position: 'absolute', top: 10, right: 10,
              background: ACCENT, color: '#fff',
              fontSize: 11, fontWeight: 800, padding: '3px 9px', borderRadius: 20,
            }}>-{reduction}% OFF</span>
          )}
          {deal.image_url && deal.prix && (
            <div style={{
              position: 'absolute', bottom: 10, left: 10,
              background: 'rgba(0,0,0,0.7)', color: '#fff',
              padding: '5px 12px', borderRadius: 12,
              display: 'flex', alignItems: 'baseline', gap: 6,
            }}>
              <span style={{ fontSize: 18, fontWeight: 800 }}>₪{deal.prix}</span>
              {deal.prix_original && (
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', textDecoration: 'line-through' }}>₪{deal.prix_original}</span>
              )}
            </div>
          )}
        </div>

        <div style={{ padding: '12px 16px 8px' }}>
          {!deal.image_url && (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: ACCENT }}>₪{deal.prix}</span>
              {deal.prix_original && (
                <span style={{ fontSize: 13, color: 'var(--text-muted)', textDecoration: 'line-through' }}>₪{deal.prix_original}</span>
              )}
            </div>
          )}
          <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>{deal.titre}</p>
          {deal.description && (
            <p style={{ fontSize: 13, color: 'var(--text-sub)', marginBottom: 8, lineHeight: 1.4 }}>{deal.description}</p>
          )}
          <p style={{ fontSize: 12, color: 'var(--text-sub)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>📍</span>
            <span>{[deal.magasin, deal.ville].filter(Boolean).join(' · ')} · {timeAgo(deal.created_at)}{deal.auteur_nom ? ` · ${deal.auteur_nom}` : ''}</span>
          </p>
        </div>
      </Link>

      <div style={{ display: 'flex', gap: 8, padding: '0 16px 14px', borderTop: '0.5px solid var(--border)', paddingTop: 10 }}>
        <button onClick={() => onVote(deal.id, 'chaud')} style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '8px 16px', borderRadius: 20,
          background: 'var(--bg-card2)', border: '0.5px solid var(--border)',
          color: 'var(--text)', cursor: 'pointer', fontSize: 13, fontWeight: 600,
        }}>🔥 {deal.votes_chaud}</button>
        <button onClick={() => onVote(deal.id, 'froid')} style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '8px 16px', borderRadius: 20,
          background: 'var(--bg-card2)', border: '0.5px solid var(--border)',
          color: 'var(--text)', cursor: 'pointer', fontSize: 13, fontWeight: 600,
        }}>❄️ {deal.votes_froid}</button>
        <Link href={`/deal/${deal.id}`} style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '8px 16px', borderRadius: 20,
          background: 'var(--bg-card2)', border: '0.5px solid var(--border)',
          color: 'var(--text)', textDecoration: 'none', fontSize: 13, fontWeight: 600,
          marginLeft: 'auto',
        }}>
          💬 {deal.commentaires?.[0]?.count || 0}
        </Link>
      </div>
    </div>
  );
}

export default function BonsPlans() {
  const router = useRouter();
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showPostModal, setShowPostModal] = useState(false);
  const [sortBy, setSortBy] = useState('hot');
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    setMounted(true);
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null);
    });
  }, []);

  const loadDeals = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (categoryFilter !== 'all') params.set('categorie', categoryFilter);
    params.set('tri', sortBy);
    const res = await fetch(`/api/bons-plans?${params}`);
    const data = await res.json();
    setDeals(data.bons_plans || []);
    setLoading(false);
  };

  useEffect(() => { loadDeals(); }, [categoryFilter, sortBy]);

  const handleVote = async (id, type) => {
    setDeals(prev => prev.map(d => d.id !== id ? d : { ...d, [`votes_${type}`]: (d[`votes_${type}`] || 0) + 1 }));
    await fetch('/api/bons-plans', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, vote: type }),
    });
  };

  const handleNewDeal = (deal) => {
    setDeals(prev => [deal, ...prev]);
  };

  if (!mounted) return null;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 30 }}>
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
          <Link href="/" style={{ color: 'var(--text-sub)', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>
            ← Back
          </Link>
          <span style={{ fontSize: 20, fontWeight: 900, color: 'var(--text)' }}>
            dil<span style={{ color: ACCENT }}>z</span>{' '}
            <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-sub)' }}>Community</span>
          </span>
          <div style={{ width: 48 }} />
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '16px 14px 0' }}>
        {/* Sort bar */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          {[
            { id: 'hot', label: '🔥 Plus hot' },
            { id: 'latest', label: '🕒 Latest' },
            { id: 'oldest', label: '📅 Oldest' },
          ].map(s => (
            <button key={s.id} onClick={() => setSortBy(s.id)} style={{
              padding: '6px 14px', borderRadius: 20,
              border: sortBy === s.id ? `1.5px solid ${ACCENT}` : '0.5px solid var(--border)',
              background: sortBy === s.id ? 'rgba(212,98,42,0.1)' : 'var(--bg-card)',
              color: sortBy === s.id ? ACCENT : 'var(--text-sub)',
              fontSize: 13, fontWeight: sortBy === s.id ? 700 : 400, cursor: 'pointer',
            }}>{s.label}</button>
          ))}
        </div>

        {/* Category filter */}
        <div style={{
          display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 14,
          paddingBottom: 4, scrollbarWidth: 'none',
        }}>
          {CATEGORIES.map(cat => {
            const active = categoryFilter === cat;
            return (
              <button key={cat} onClick={() => setCategoryFilter(cat)} style={{
                flexShrink: 0,
                padding: '7px 16px', borderRadius: 20,
                border: active ? `1.5px solid ${ACCENT}` : '0.5px solid var(--border)',
                background: active ? 'rgba(212,98,42,0.1)' : 'var(--bg-card)',
                color: active ? ACCENT : 'var(--text-sub)',
                fontSize: 13, fontWeight: active ? 700 : 400, cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}>
                {CATEGORY_LABELS[cat] || cat}
              </button>
            );
          })}
        </div>

        {/* CTA */}
        <button
          onClick={() => user ? setShowPostModal(true) : router.push('/auth?redirect=/bons-plans')}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%',
            background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DARK})`,
            color: '#fff', padding: '16px 20px',
            borderRadius: 18, border: 'none',
            fontWeight: 700, fontSize: 15,
            marginBottom: 16, cursor: 'pointer',
            boxShadow: '0 4px 18px rgba(212,98,42,0.4)',
          }}
        >
          📸 Spotted a deal? Share it now
        </button>

        {/* Deals feed */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>Loading deals...</div>
        ) : deals.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)', fontSize: 14 }}>
            No deals yet — be the first! 🔥
          </div>
        ) : (
          deals.map(deal => (
            <DealCard key={deal.id} deal={deal} onVote={handleVote} />
          ))
        )}
      </div>

      {showPostModal && (
        <PostDealModal
          onClose={() => setShowPostModal(false)}
          onSubmit={handleNewDeal}
          user={user}
        />
      )}
    </div>
  );
}

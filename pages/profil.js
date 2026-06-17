import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

const ACCENT = '#E2552D';
const ACCENT_DARK = '#C2410C';

function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'Just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function Profil() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace('/auth?redirect=/profil');
        return;
      }
      const u = data.session.user;
      setUser(u);
      fetchUserDeals(u.id);
    });
  }, []);

  const fetchUserDeals = async (userId) => {
    setLoading(true);
    const { data } = await supabase
      .from('bons_plans')
      .select('*')
      .eq('auteur_id', userId)
      .order('created_at', { ascending: false });
    setDeals(data || []);
    setLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/');
  };

  if (!mounted) return null;

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading...</div>
      </div>
    );
  }

  const displayName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'User';
  const initials = displayName.slice(0, 2).toUpperCase();
  const totalHot = deals.reduce((s, d) => s + (d.votes_chaud || 0), 0);

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
          <Link href="/" style={{ color: 'var(--text-sub)', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>
            ← Back
          </Link>
          <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>Profile</span>
          <button onClick={handleSignOut} style={{
            background: 'none', border: 'none',
            color: 'var(--text-sub)', fontSize: 13, cursor: 'pointer', fontWeight: 500,
          }}>
            Sign out
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '24px 16px 0' }}>
        {/* Profile card */}
        <div style={{
          background: 'var(--bg-card)', borderRadius: 24,
          padding: '24px 20px', marginBottom: 20,
          boxShadow: 'var(--shadow-card)',
          display: 'flex', alignItems: 'center', gap: 16,
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: ACCENT,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span style={{ color: '#fff', fontSize: 22, fontWeight: 800 }}>{initials}</span>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>{displayName}</p>
            <p style={{ fontSize: 13, color: 'var(--text-sub)' }}>{user.email}</p>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
          <div style={{
            background: 'var(--bg-card)', borderRadius: 18, padding: '16px 20px',
            boxShadow: 'var(--shadow-card)', textAlign: 'center',
          }}>
            <p style={{ fontSize: 28, fontWeight: 900, color: ACCENT }}>{deals.length}</p>
            <p style={{ fontSize: 13, color: 'var(--text-sub)', marginTop: 4 }}>Deals posted</p>
          </div>
          <div style={{
            background: 'var(--bg-card)', borderRadius: 18, padding: '16px 20px',
            boxShadow: 'var(--shadow-card)', textAlign: 'center',
          }}>
            <p style={{ fontSize: 28, fontWeight: 900, color: ACCENT }}>🔥 {totalHot}</p>
            <p style={{ fontSize: 13, color: 'var(--text-sub)', marginTop: 4 }}>Hot votes received</p>
          </div>
        </div>

        {/* Deals list */}
        <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>My deals</p>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>Loading...</div>
        ) : deals.length === 0 ? (
          <div style={{
            background: 'var(--bg-card)', borderRadius: 20, padding: '40px 20px',
            textAlign: 'center', boxShadow: 'var(--shadow-card)',
          }}>
            <p style={{ fontSize: 32, marginBottom: 12 }}>🛍️</p>
            <p style={{ fontSize: 15, color: 'var(--text)', fontWeight: 600, marginBottom: 6 }}>No deals yet</p>
            <p style={{ fontSize: 13, color: 'var(--text-sub)', marginBottom: 20 }}>Share a deal you spotted!</p>
            <Link href="/" style={{
              display: 'inline-block',
              padding: '12px 24px', borderRadius: 14,
              background: ACCENT,
              color: '#fff', textDecoration: 'none',
              fontSize: 14, fontWeight: 700,
            }}>
              Post a deal 🔥
            </Link>
          </div>
        ) : (
          deals.map(deal => {
            const reduction = deal.prix_original
              ? Math.round((deal.prix_original - deal.prix) / deal.prix_original * 100)
              : null;
            return (
              <Link key={deal.id} href={`/deal/${deal.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{
                  background: 'var(--bg-card)', borderRadius: 18, padding: '14px 16px',
                  marginBottom: 10, boxShadow: 'var(--shadow-card)',
                  display: 'flex', alignItems: 'center', gap: 14,
                }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 12, flexShrink: 0,
                    background: deal.image_url ? 'transparent' : 'var(--bg-card2)',
                    overflow: 'hidden',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {deal.image_url ? (
                      <img src={deal.image_url} alt={deal.titre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: 22 }}>🛍️</span>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{deal.titre}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 16, fontWeight: 800, color: ACCENT }}>₪{deal.prix}</span>
                      {reduction && (
                        <span style={{ fontSize: 11, fontWeight: 700, color: ACCENT, background: 'rgba(226,85,45,0.10)', padding: '2px 7px', borderRadius: 20 }}>-{reduction}%</span>
                      )}
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{timeAgo(deal.created_at)}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-sub)' }}>🔥 {deal.votes_chaud}</span>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}



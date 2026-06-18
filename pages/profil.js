import { useState, useEffect } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'Just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function HotIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2c0 0-4.5 5.5-4.5 10a4.5 4.5 0 0 0 9 0C16.5 7.5 12 2 12 2zm0 13a2.5 2.5 0 0 1-2.5-2.5C9.5 10 12 6.5 12 6.5S14.5 10 14.5 12.5A2.5 2.5 0 0 1 12 15z"/></svg>;
}

function BackArrow() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M19 12H5m7-7-7 7 7 7"/></svg>;
}

function ShoppingBagIcon() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>;
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
      if (!data.session) { router.replace('/auth?redirect=/profil'); return; }
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
      <div className="dilz-profil-loading">
        <div className="dilz-spinner" />
      </div>
    );
  }

  const displayName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'User';
  const initials = displayName.slice(0, 2).toUpperCase();
  const totalHot = deals.reduce((s, d) => s + (d.votes_chaud || 0), 0);

  return (
    <>
      <Head>
        <title>Profile — Dilz</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>
      <div className="dilz-profil-page">
        <header className="dilz-app-header">
          <div className="dilz-app-header__inner">
            <Link href="/" className="dilz-profil-back">
              <BackArrow /> Back
            </Link>
            <span className="dilz-profil-heading">Profile</span>
            <button type="button" className="dilz-button dilz-button--ghost dilz-button--sm" onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        </header>

        <main className="dilz-profil-main">
          <div className="dilz-profil-card">
            <div className="dilz-avatar" aria-hidden="true">{initials}</div>
            <div>
              <p className="dilz-profil-card__name">{displayName}</p>
              <p className="dilz-profil-card__email">{user.email}</p>
            </div>
          </div>

          <div className="dilz-profil-stats">
            <div className="dilz-stat-card">
              <strong>{deals.length}</strong>
              <span>Deals posted</span>
            </div>
            <div className="dilz-stat-card">
              <strong><HotIcon /> {totalHot}</strong>
              <span>Hot votes received</span>
            </div>
          </div>

          <h2 className="dilz-profil-section-title">My deals</h2>

          {loading ? (
            <div className="dilz-loading-state">
              <div className="dilz-spinner" />
              <p>Loading...</p>
            </div>
          ) : deals.length === 0 ? (
            <div className="dilz-empty-state">
              <span className="dilz-empty-state__icon"><ShoppingBagIcon /></span>
              <p className="dilz-empty-state__title">No deals yet</p>
              <p className="dilz-empty-state__text">Share a deal you spotted!</p>
              <Link href="/" className="dilz-button dilz-button--primary dilz-button--md">
                Post a deal
              </Link>
            </div>
          ) : (
            <div className="dilz-profil-deals">
              {deals.map((deal) => {
                const reduction = deal.prix_original
                  ? Math.round((deal.prix_original - deal.prix) / deal.prix_original * 100)
                  : null;
                return (
                  <Link key={deal.id} href={`/deal/${deal.id}`} className="dilz-profil-deal-row">
                    <div className="dilz-profil-deal-row__thumb">
                      {deal.image_url ? (
                        <img src={deal.image_url} alt={deal.titre} />
                      ) : (
                        <span aria-hidden="true"><ShoppingBagIcon /></span>
                      )}
                    </div>
                    <div className="dilz-profil-deal-row__body">
                      <p className="dilz-profil-deal-row__title">{deal.titre}</p>
                      <div className="dilz-profil-deal-row__meta">
                        <strong>&#8362;{deal.prix}</strong>
                        {reduction && <span className="dilz-badge dilz-badge--saving">-{reduction}%</span>}
                        <span>{timeAgo(deal.created_at)}</span>
                      </div>
                    </div>
                    <div className="dilz-profil-deal-row__votes">
                      <HotIcon /> {deal.votes_chaud || 0}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </>
  );
}

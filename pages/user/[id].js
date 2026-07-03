import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { VoteEmoji } from '../../components/ui/VoteEmoji';
import { supabase } from '../../lib/supabase';
import { useAppLanguage } from '../../lib/useAppLanguage';
import { formatPrice } from '../../lib/dealCard.js';

export default function PublicUserPage() {
  const router = useRouter();
  const { lang, dir } = useAppLanguage();
  const [profile, setProfile] = useState(null);
  const [deals, setDeals] = useState([]);
  const [viewer, setViewer] = useState(null);
  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);

  useEffect(() => {
    if (!router.isReady) return;
    fetch(`/api/users/${router.query.id}`).then((response) => response.json()).then((data) => { setProfile(data.profile || null); setDeals(data.deals || []); });
    supabase.auth.getSession().then(async ({ data }) => {
      setViewer(data.session?.user || null);
      if (!data.session) return;
      const result = await fetch('/api/user-follows', { headers: { Authorization: `Bearer ${data.session.access_token}` } }).then((response) => response.json());
      setFollowing(Boolean(result.users?.find((user) => user.id === router.query.id)?.is_following));
    });
  }, [router.isReady, router.query.id]);

  const toggleFollow = async () => {
    if (!viewer) { router.push(`/auth?redirect=${encodeURIComponent(router.asPath)}`); return; }
    const previousFollowing = following;
    setFollowBusy(true);
    setFollowing(!previousFollowing);
    try {
      const { data } = await supabase.auth.getSession();
      const response = await fetch('/api/user-follows', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}` }, body: JSON.stringify({ followed_user_id: profile.id, followed_name: profile.name }) });
      if (response.ok) setFollowing((await response.json()).following);
      else setFollowing(previousFollowing);
    } catch {
      setFollowing(previousFollowing);
    } finally {
      setFollowBusy(false);
    }
  };

  if (!profile) return <div className="dilz-loading-state"><div className="dilz-spinner" /></div>;
  const initials = profile.name.slice(0, 2).toUpperCase();
  return (
    <div className="dilz-public-profile" dir={dir}>
      <Head><title>{profile.name} | Dilz</title></Head>
      <header className="dilz-alerts-route__header"><Link href="/" className="dilz-logo-button"><span className="dilz-logo">dILz</span></Link></header>
      <main>
        <section className="dilz-public-profile__hero">
          {profile.avatar_url ? <img src={profile.avatar_url} alt="" /> : <span className="dilz-avatar">{initials}</span>}
          <div><h1>{profile.name}</h1><p>{lang === 'he' ? '×—×‘×¨ ×ž××–' : 'Member since'} {new Date(profile.created_at).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-GB', { month: 'long', year: 'numeric' })}</p></div>
          {viewer?.id !== profile.id && (
            <button
              type="button"
              className={following ? 'is-following' : ''}
              data-follow-state={following ? 'following' : 'not-following'}
              aria-pressed={following}
              onClick={toggleFollow}
              disabled={followBusy}
            >
              {followBusy ? '...' : following ? '✓ Following' : 'Follow user'}
            </button>
          )}
        </section>
        <div className="dilz-profil-stats">
          <div className="dilz-stat-card"><strong>{profile.deals_count}</strong><span>Deals</span></div>
          <div className="dilz-stat-card"><strong>{profile.followers_count}</strong><span>Followers</span></div>
          <div className="dilz-stat-card"><strong>{profile.following_count || 0}</strong><span>Following</span></div>
          <div className="dilz-stat-card"><strong><VoteEmoji type="chaud" /> {profile.hot_votes}</strong><span>Hot votes</span></div>
          <div className="dilz-stat-card"><strong><VoteEmoji type="froid" /> {profile.cold_votes || 0}</strong><span>Cold votes</span></div>
          <div className="dilz-stat-card"><strong>{profile.last_posted_at ? new Date(profile.last_posted_at).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-GB') : '-'}</strong><span>Last post</span></div>
        </div>
        <section className="dilz-public-profile__deals"><h2>{lang === 'he' ? '×“×™×œ×™× ×©×¤×•×¨×¡×ž×•' : 'Published deals'}</h2>{deals.map((deal) => <Link href={`/deal/${deal.id}`} key={deal.id}><img src={deal.image_url || '/icon-192.png'} alt=""/><span><strong>{deal.titre}</strong><small>{formatPrice(deal.prix)} ₪</small></span></Link>)}</section>
      </main>
    </div>
  );
}

import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { PostDealModal } from '../components/deals/PostDealModal';
import { supabase } from '../lib/supabase';
import { useAppLanguage } from '../lib/useAppLanguage';

export default function PostPage() {
  const router = useRouter();
  const { lang, dir } = useAppLanguage();
  const [user, setUser] = useState(null);
  const [cities, setCities] = useState([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session?.user) router.replace('/auth?redirect=/post');
      else setUser(data.session.user);
    });
    fetch('/api/villes').then((response) => response.json()).then((data) => setCities(data.villes || [])).catch(() => {});
  }, [router]);

  return (
    <>
      <Head><title>{lang === 'he' ? 'פרסום דיל | Dilz' : 'Post a deal | Dilz'}</title></Head>
      <div className="dilz-post-page" dir={dir}>
        {/* No route header here (P0.4): the posting surface already carries its
            own title and close control, and two stacked headers ate the screen. */}
        <main className="dilz-post-page__main">
          {user ? (
            <PostDealModal
              pageMode
              user={user}
              lang={lang}
              cityOptions={cities}
              onClose={() => router.push('/')}
              onSuccess={() => router.replace(`/?sort=latest&refresh=${Date.now()}`)}
            />
          ) : <div className="dilz-empty-state"><div className="dilz-spinner" /></div>}
        </main>
      </div>
    </>
  );
}

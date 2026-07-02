import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { AlertModal } from '../components/ui/AlertModal';
import { BottomNav } from '../components/layout/BottomNav';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { supabase } from '../lib/supabase';
import { useAppLanguage } from '../lib/useAppLanguage';

export default function AlertsPage() {
  const router = useRouter();
  const { lang } = useAppLanguage();
  const [user, setUser] = useState(null);
  const [token, setToken] = useState('');
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session?.user) {
        router.replace('/auth?redirect=/alerts');
        return;
      }
      setUser(data.session.user);
      setToken(data.session.access_token || '');   // reused by AlertModal (avoids a 2nd getSession)
      setLoading(false);
    });
    fetch('/api/villes').then((response) => response.json()).then((data) => setCities(data.villes || [])).catch(() => {});
  }, [router]);

  const goHome = (query = '') => router.push(`/${query}`);

  return (
    <>
      <Head><title>{lang === 'he' ? 'התראות | Dilz' : 'Alerts | Dilz'}</title></Head>
      <div className="dilz-alerts-route" dir={lang === 'he' ? 'rtl' : 'ltr'}>
        <header className="dilz-alerts-route__header">
          <Link href="/" className="dilz-logo-button" aria-label="Dilz home"><span className="dilz-logo">dILz</span></Link>
          <ThemeToggle lang={lang} />
        </header>
        <main className="dilz-alerts-route__main">
          {loading || !user ? <div className="dilz-empty-state"><div className="dilz-spinner" /></div> : (
            <AlertModal user={user} token={token} lang={lang} villes={cities} onClose={() => router.back()} />
          )}
        </main>
        <BottomNav
          lang={lang}
          activeTab="alerts"
          onMenu={() => router.push('/explore')}
          onTab={() => goHome()}
          onPost={() => router.push('/post')}
          onAlerts={() => {}}
          onProfile={() => goHome('?tab=profile')}
        />
      </div>
    </>
  );
}

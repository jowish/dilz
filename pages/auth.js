import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabase';

const ACCENT = '#D4622A';
const ACCENT_DARK = '#B84E20';

export default function Auth() {
  const router = useRouter();
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [signupDone, setSignupDone] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace(router.query.redirect || '/');
    });
  }, []);

  const handleSubmit = async () => {
    setError('');
    if (!email || !password) { setError('Email and password are required'); return; }
    setLoading(true);

    try {
      if (mode === 'signin') {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) { setError(err.message); setLoading(false); return; }
      } else {
        const { error: err } = await supabase.auth.signUp({
          email, password,
          options: {
            data: { display_name: name || email.split('@')[0] },
            emailRedirectTo: `${window.location.origin}/`,
          },
        });
        if (err) { setError(err.message); setLoading(false); return; }
        setLoading(false);
        setSignupDone(true);
        return;
      }
      router.replace(router.query.redirect || '/');
    } catch (err) {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth?redirect=${router.query.redirect || '/'}` },
    });
  };

  if (!mounted) return null;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 16px' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <span style={{ fontSize: 36, fontWeight: 900, color: 'var(--text)' }}>
              dil<span style={{ color: ACCENT }}>z</span>
            </span>
          </Link>
          <p style={{ fontSize: 14, color: 'var(--text-sub)', marginTop: 6 }}>Deals & promotions in Israel</p>
        </div>

        {/* Card */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 24, padding: '28px 24px', boxShadow: 'var(--shadow-float)' }}>
          {signupDone ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: 52, marginBottom: 16 }}>📧</div>
              <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 10 }}>Check your email</p>
              <p style={{ fontSize: 14, color: 'var(--text-sub)', lineHeight: 1.6, marginBottom: 24 }}>
                We sent a confirmation link to <strong style={{ color: 'var(--text)' }}>{email}</strong>.
                Click the link to activate your account, then sign in.
              </p>
              <button
                onClick={() => { setMode('signin'); setSignupDone(false); setError(''); }}
                style={{
                  width: '100%', padding: 16, borderRadius: 16, border: 'none',
                  background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DARK})`,
                  color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                }}
              >
                Back to sign in
              </button>
            </div>
          ) : (<>
          {/* Tabs */}
          <div style={{ display: 'flex', background: 'var(--bg-card2)', borderRadius: 14, padding: 4, marginBottom: 24 }}>
            {['signin', 'signup'].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); }} style={{
                flex: 1, padding: '10px 0', borderRadius: 10, border: 'none',
                background: mode === m ? 'var(--bg-card)' : 'transparent',
                color: mode === m ? 'var(--text)' : 'var(--text-sub)',
                fontSize: 14, fontWeight: mode === m ? 700 : 400, cursor: 'pointer',
                boxShadow: mode === m ? 'var(--shadow-card)' : 'none',
              }}>
                {m === 'signin' ? 'Sign in' : 'Sign up'}
              </button>
            ))}
          </div>

          {/* Google */}
          <button onClick={handleGoogle} style={{
            width: '100%', padding: '13px 20px',
            borderRadius: 14, border: '0.5px solid var(--border)',
            background: 'var(--bg-card2)', color: 'var(--text)',
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            marginBottom: 16,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ flex: 1, height: '0.5px', background: 'var(--border)' }} />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>or</span>
            <div style={{ flex: 1, height: '0.5px', background: 'var(--border)' }} />
          </div>

          {/* Fields */}
          {mode === 'signup' && (
            <input
              type="text"
              placeholder="Display name"
              value={name}
              onChange={e => setName(e.target.value)}
              style={{
                width: '100%', padding: '13px 16px', marginBottom: 10,
                borderRadius: 14, border: '0.5px solid var(--border)',
                background: 'var(--bg-input)', color: 'var(--text)',
                fontSize: 15, outline: 'none',
              }}
            />
          )}

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{
              width: '100%', padding: '13px 16px', marginBottom: 10,
              borderRadius: 14, border: '0.5px solid var(--border)',
              background: 'var(--bg-input)', color: 'var(--text)',
              fontSize: 15, outline: 'none',
            }}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            style={{
              width: '100%', padding: '13px 16px', marginBottom: 16,
              borderRadius: 14, border: '0.5px solid var(--border)',
              background: 'var(--bg-input)', color: 'var(--text)',
              fontSize: 15, outline: 'none',
            }}
          />

          {error && (
            <p style={{ color: '#DC2626', fontSize: 13, marginBottom: 12, textAlign: 'center' }}>{error}</p>
          )}

          <button onClick={handleSubmit} disabled={loading} style={{
            width: '100%', padding: 16, borderRadius: 16, border: 'none',
            background: loading ? 'var(--bg-card2)' : `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DARK})`,
            color: loading ? 'var(--text-muted)' : '#fff',
            fontSize: 16, fontWeight: 700, cursor: loading ? 'default' : 'pointer',
            boxShadow: loading ? 'none' : '0 4px 18px rgba(212,98,42,0.4)',
          }}>
            {loading ? 'Please wait...' : (mode === 'signin' ? 'Sign in' : 'Create account')}
          </button>
          </>)}
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--text-sub)' }}>
          <Link href="/" style={{ color: ACCENT, textDecoration: 'none', fontWeight: 600 }}>
            ← Back to deals
          </Link>
        </p>
      </div>
    </div>
  );
}

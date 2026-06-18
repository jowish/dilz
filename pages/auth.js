import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { supabase } from '../lib/supabase';

function getRedirectPath(value) {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';
}

function confirmationRedirect(origin, redirectPath) {
  return `${origin}/auth?confirmed=1&redirect=${encodeURIComponent(redirectPath)}`;
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

export default function Auth() {
  const router = useRouter();
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [signupDone, setSignupDone] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!router.isReady) return;
    setMounted(true);
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace(getRedirectPath(router.query.redirect));
    });
  }, [router.isReady]);

  const handleSubmit = async () => {
    setError('');
    if (!email || !password) { setError('Email and password are required'); return; }
    setLoading(true);
    try {
      if (mode === 'signin') {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) { setError(err.message); setLoading(false); return; }
      } else {
        const redirectPath = getRedirectPath(router.query.redirect);
        const { data, error: err } = await supabase.auth.signUp({
          email, password,
          options: {
            data: { display_name: name || email.split('@')[0] },
            emailRedirectTo: confirmationRedirect(window.location.origin, redirectPath),
          },
        });
        if (err) { setError(err.message); setLoading(false); return; }
        if (data?.session) { router.replace(redirectPath); return; }
        setLoading(false);
        setSignupDone(true);
        return;
      }
      router.replace(getRedirectPath(router.query.redirect));
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    const redirectPath = getRedirectPath(router.query.redirect);
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth?redirect=${encodeURIComponent(redirectPath)}` },
    });
  };

  const handleResendConfirmation = async () => {
    setError('');
    setResendMessage('');
    if (!email) { setError('Enter your email address first.'); return; }
    setResendLoading(true);
    const redirectPath = getRedirectPath(router.query.redirect);
    const { error: err } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: confirmationRedirect(window.location.origin, redirectPath) },
    });
    setResendLoading(false);
    if (err) { setError(err.message); return; }
    setResendMessage('Confirmation email sent again. Check inbox and spam.');
  };

  if (!mounted) return null;

  return (
    <>
      <Head>
        <title>Sign in — Dilz</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>
      <div className="dilz-auth-page">
        <div className="dilz-auth-container">
          <div className="dilz-auth-logo">
            <Link href="/" className="dilz-logo-button" aria-label="Dilz home">
              <span className="dilz-logo">d<span>IL</span>z</span>
            </Link>
            <p className="dilz-auth-tagline">Deals &amp; promotions in Israel</p>
          </div>

          <div className="dilz-auth-card">
            {signupDone ? (
              <div className="dilz-auth-confirm">
                <span className="dilz-auth-confirm__icon"><MailIcon /></span>
                <h1>Check your email</h1>
                <p>
                  We sent a confirmation link to <strong>{email}</strong>.
                  Open it on this device if possible. If you do not see it, check spam or send it again.
                </p>
                {resendMessage && (
                  <div className="dilz-success-banner">{resendMessage}</div>
                )}
                {error && <p className="dilz-form-error">{error}</p>}
                <button
                  type="button"
                  className="dilz-button dilz-button--secondary dilz-button--md"
                  style={{ width: '100%', marginBottom: 10 }}
                  onClick={handleResendConfirmation}
                  disabled={resendLoading}
                >
                  {resendLoading ? 'Sending...' : 'Resend confirmation email'}
                </button>
                <button
                  type="button"
                  className="dilz-button dilz-button--primary dilz-button--md"
                  style={{ width: '100%' }}
                  onClick={() => { setMode('signin'); setSignupDone(false); setError(''); setResendMessage(''); }}
                >
                  Back to sign in
                </button>
              </div>
            ) : (
              <>
                <div className="dilz-segmented" role="tablist" aria-label="Auth mode">
                  {[['signin', 'Sign in'], ['signup', 'Sign up']].map(([m, label]) => (
                    <button
                      key={m}
                      type="button"
                      role="tab"
                      aria-selected={mode === m}
                      className={mode === m ? 'is-active' : ''}
                      onClick={() => { setMode(m); setError(''); }}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  className="dilz-auth-google"
                  onClick={handleGoogle}
                >
                  <GoogleIcon />
                  Continue with Google
                </button>

                <div className="dilz-auth-divider">
                  <span>or</span>
                </div>

                <div className="dilz-form-grid">
                  {mode === 'signup' && (
                    <input
                      type="text"
                      className="dilz-input"
                      placeholder="Display name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoComplete="name"
                    />
                  )}
                  <input
                    type="email"
                    className="dilz-input"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                  <input
                    type="password"
                    className="dilz-input"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  />
                </div>

                {error && <p className="dilz-form-error">{error}</p>}

                <button
                  type="button"
                  className="dilz-button dilz-button--primary dilz-button--md"
                  style={{ width: '100%', marginTop: 4 }}
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {loading ? 'Please wait...' : (mode === 'signin' ? 'Sign in' : 'Create account')}
                </button>
              </>
            )}
          </div>

          <p className="dilz-auth-back">
            <Link href="/" className="dilz-auth-back__link">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M19 12H5m7-7-7 7 7 7"/></svg>
              Back to deals
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}

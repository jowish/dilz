import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { supabase } from '../lib/supabase';
import { useAppLanguage } from '../lib/useAppLanguage';

const AUTH_TEXT = {
  en: { title: 'Sign in', tagline: 'Deals & promotions in Israel', required: 'Email and password are required', generic: 'Something went wrong. Please try again.', enterEmail: 'Enter your email address first.', resent: 'Confirmation email sent again. Check inbox and spam.', check: 'Check your email', sent: 'We sent a confirmation link to', instructions: 'Open it on this device if possible. If you do not see it, check spam or send it again.', sending: 'Sending...', resend: 'Resend confirmation email', backSignIn: 'Back to sign in', signIn: 'Sign in', signUp: 'Sign up', authMode: 'Authentication mode', name: 'Display name', email: 'Email', password: 'Password', wait: 'Please wait...', create: 'Create account', backDeals: 'Back to deals', home: 'Dilz home', legalPrefix: 'By creating an account, you agree to the', terms: 'Terms of Use', and: 'and', privacy: 'Privacy Policy' },
  he: { title: 'התחברות', tagline: 'דילים ומבצעים בישראל', required: 'יש להזין אימייל וסיסמה', generic: 'אירעה שגיאה. נסו שוב.', enterEmail: 'יש להזין קודם כתובת אימייל.', resent: 'מייל האימות נשלח שוב. בדקו גם את תיקיית הספאם.', check: 'בדקו את האימייל', sent: 'שלחנו קישור אימות אל', instructions: 'מומלץ לפתוח אותו במכשיר הזה. אם הוא לא מופיע, בדקו בספאם או שלחו שוב.', sending: 'שולח...', resend: 'שליחת מייל אימות מחדש', backSignIn: 'חזרה להתחברות', signIn: 'התחברות', signUp: 'הרשמה', authMode: 'מצב אימות', name: 'שם תצוגה', email: 'אימייל', password: 'סיסמה', wait: 'נא להמתין...', create: 'יצירת חשבון', backDeals: 'חזרה לדילים', home: 'דף הבית של Dilz', legalPrefix: 'ביצירת חשבון אתם מסכימים ל', terms: 'תנאי השימוש', and: 'ול', privacy: 'מדיניות הפרטיות' },
};

function getRedirectPath(value) {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw && raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';
}

function confirmationRedirect(origin, redirectPath) {
  return `${origin}/auth?confirmed=1&redirect=${encodeURIComponent(redirectPath)}`;
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
  const { lang, setLang, dir } = useAppLanguage();
  const text = AUTH_TEXT[lang];
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
      if (data.session) {
        let redirectPath = getRedirectPath(router.query.redirect);
        try {
          const saved = sessionStorage.getItem('dilzAuthRedirect');
          if (saved && saved.startsWith('/') && !saved.startsWith('//')) {
            redirectPath = saved;
            sessionStorage.removeItem('dilzAuthRedirect');
          }
        } catch {}
        router.replace(redirectPath);
      }
    });
  }, [router.isReady]);

  const handleSubmit = async () => {
    setError('');
    if (!email || !password) { setError(text.required); return; }
    setLoading(true);
    try {
      if (mode === 'signin') {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) { setError(err.message); setLoading(false); return; }
      } else {
        const redirectPath = getRedirectPath(router.query.redirect);
        const signupResponse = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name }),
        });
        const signupData = await signupResponse.json();
        if (!signupResponse.ok || signupData.erreur) {
          setError(signupData.erreur || text.generic);
          setLoading(false);
          return;
        }
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          setError(signInError.message);
          setLoading(false);
          return;
        }
        router.replace(redirectPath);
        return;
      }
      router.replace(getRedirectPath(router.query.redirect));
    } catch {
      setError(text.generic);
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    setError('');
    setResendMessage('');
    if (!email) { setError(text.enterEmail); return; }
    setResendLoading(true);
    const redirectPath = getRedirectPath(router.query.redirect);
    const { error: err } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: confirmationRedirect(window.location.origin, redirectPath) },
    });
    setResendLoading(false);
    if (err) { setError(err.message); return; }
    setResendMessage(text.resent);
  };

  if (!mounted) return null;

  return (
    <>
      <Head>
        <title>{text.title} - Dilz</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>
      <div className="dilz-auth-page" dir={dir}>
        <div className="dilz-auth-container">
          <div className="dilz-auth-logo">
            <Link href="/" className="dilz-logo-button" aria-label={text.home}>
              <span className="dilz-logo-lockup" aria-label="dILz">
                <span className="dilz-logo-mark" aria-hidden="true">
                  <svg viewBox="0 0 48 48" focusable="false">
                    <circle cx="21" cy="21" r="12" />
                    <path d="M30.5 30.5 40 40" />
                  </svg>
                </span>
                <span className="dilz-logo">dILz</span>
              </span>
            </Link>
            <p className="dilz-auth-tagline">{text.tagline}</p>
            <select className="dilz-language-select" value={lang} onChange={(event) => setLang(event.target.value)} aria-label="Language">
              <option value="en">English</option><option value="he">עברית</option>
            </select>
          </div>

          <div className="dilz-auth-card">
            {signupDone ? (
              <div className="dilz-auth-confirm">
                <span className="dilz-auth-confirm__icon"><MailIcon /></span>
                <h1>{text.check}</h1>
                <p>
                  {text.sent} <strong>{email}</strong>. {text.instructions}
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
                  {resendLoading ? text.sending : text.resend}
                </button>
                <button
                  type="button"
                  className="dilz-button dilz-button--primary dilz-button--md"
                  style={{ width: '100%' }}
                  onClick={() => { setMode('signin'); setSignupDone(false); setError(''); setResendMessage(''); }}
                >
                  {text.backSignIn}
                </button>
              </div>
            ) : (
              <>
                <div className="dilz-segmented" role="tablist" aria-label={text.authMode}>
                  {[['signin', text.signIn], ['signup', text.signUp]].map(([m, label]) => (
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

                <div className="dilz-form-grid">
                  {mode === 'signup' && (
                    <input
                      type="text"
                      className="dilz-input"
                      placeholder={text.name}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoComplete="name"
                    />
                  )}
                  <input
                    type="email"
                    className="dilz-input"
                    placeholder={text.email}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                  <input
                    type="password"
                    className="dilz-input"
                    placeholder={text.password}
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
                  {loading ? text.wait : (mode === 'signin' ? text.signIn : text.create)}
                </button>
                {mode === 'signup' && (
                  <p className="dilz-auth-legal">
                    {text.legalPrefix} <Link href="/terms">{text.terms}</Link> {text.and} <Link href="/privacy">{text.privacy}</Link>.
                  </p>
                )}
              </>
            )}
          </div>

          <p className="dilz-auth-back">
            <Link href="/" className="dilz-auth-back__link">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M19 12H5m7-7-7 7 7 7"/></svg>
              {text.backDeals}
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}

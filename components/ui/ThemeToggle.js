import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { getNextTheme } from '../../lib/themePreference';

export function ThemeToggle({ lang = 'en', className = '' }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === 'dark';
  const label = lang === 'he'
    ? (isDark ? 'מעבר למצב בהיר' : 'מעבר למצב כהה')
    : (isDark ? 'Switch to light mode' : 'Switch to dark mode');

  return (
    <button
      type="button"
      className={`dilz-theme-toggle ${className}`.trim()}
      onClick={() => setTheme(getNextTheme(resolvedTheme))}
      aria-label={label}
      title={label}
      disabled={!mounted}
    >
      {isDark ? (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20.5 14.2A8.4 8.4 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2Z" />
        </svg>
      )}
    </button>
  );
}

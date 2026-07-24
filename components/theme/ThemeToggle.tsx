'use client';

import { useEffect, useState } from 'react';
import { THEME_STORAGE_KEY } from './ThemeScript';

type Theme = 'light' | 'dark';

/**
 * Light/dark toggle.
 *
 * Two details that matter:
 *
 * 1. It renders nothing until mounted. The server cannot know the visitor's
 *    theme (it lives in localStorage / the OS), so any server-rendered icon
 *    would be a coin flip and would hydrate-mismatch. Reserving the exact
 *    footprint keeps the header from shifting when the real button appears —
 *    CLS stays 0.
 *
 * 2. With no stored preference the site follows the OS *live* — the listener
 *    below keeps it in sync if the visitor changes their system theme while
 *    reading. Once they choose explicitly, the choice wins and the OS is
 *    ignored, which is what "I chose this" should mean.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
    setTheme(stored ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));

    // Follow the OS only while the visitor has not made an explicit choice.
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => {
      if (localStorage.getItem(THEME_STORAGE_KEY)) return;
      const next: Theme = e.matches ? 'dark' : 'light';
      document.documentElement.classList.toggle('dark', e.matches);
      setTheme(next);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.classList.toggle('dark', next === 'dark');
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Private mode — the theme still applies for this pageview.
    }
    setTheme(next);
  };

  // Same box as the real button, so nothing moves when it swaps in.
  if (theme === null) return <div className="h-10 w-10" aria-hidden="true" />;

  const next = theme === 'dark' ? 'light' : 'dark';

  return (
    <button
      type="button"
      onClick={toggle}
      // The label states the ACTION, not the state — "Switch to dark" is
      // unambiguous where "Dark mode" leaves a screen reader user guessing
      // whether it is a status or a control.
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      className="grid h-10 w-10 place-items-center rounded-full text-muted transition-colors duration-300 hover:text-ink"
    >
      {theme === 'dark' ? (
        // Sun
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        // Moon
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}

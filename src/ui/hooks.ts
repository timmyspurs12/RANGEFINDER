/**
 * Rangefinder v4 — small client hooks: reduced motion, theme, countdown.
 */
import { useCallback, useEffect, useState } from 'react';

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (e: MediaQueryListEvent): void => setReduced(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

export type Theme = 'light' | 'dark';

const THEME_KEY = 'rf4.theme';

export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {
      /* fall through to system */
    }
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  const toggle = useCallback(() => {
    setTheme((t) => {
      const next: Theme = t === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch {
        /* non-fatal */
      }
      return next;
    });
  }, []);
  return [theme, toggle];
}

/** Ticking countdown to the next UTC day; re-renders once per second. */
export function useCountdown(msUntilNext: () => number): number {
  const [ms, setMs] = useState(msUntilNext);
  useEffect(() => {
    const id = window.setInterval(() => setMs(msUntilNext()), 1000);
    return () => window.clearInterval(id);
  }, [msUntilNext]);
  return ms;
}

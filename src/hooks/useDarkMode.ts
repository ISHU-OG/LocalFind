import { useEffect, useState } from 'react';

const THEME_KEY = 'localfind_theme';

function getInitialTheme(): boolean {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored) return stored === 'dark';
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

export function useDarkMode() {
  const [isDark, setIsDark] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
  }, [isDark]);

  return { isDark, toggle: () => setIsDark((d) => !d) };
}

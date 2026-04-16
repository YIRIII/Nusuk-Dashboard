import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';
const KEY = 'nusuk.theme';

function readStored(): Theme {
  if (typeof localStorage === 'undefined') return 'light';
  const v = localStorage.getItem(KEY);
  if (v === 'dark' || v === 'light') return v;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function apply(theme: Theme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

export function useTheme(): { theme: Theme; toggle: () => void } {
  const [theme, setTheme] = useState<Theme>(readStored);

  useEffect(() => {
    apply(theme);
    localStorage.setItem(KEY, theme);
  }, [theme]);

  return {
    theme,
    toggle: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),
  };
}

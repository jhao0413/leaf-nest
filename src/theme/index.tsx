'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type Theme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'leaf-nest-theme';
const THEME_CHANGE_EVENT = 'leaf-nest-theme-change';
const DEFAULT_THEME: Theme = 'light';

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isTheme(value: string | null | undefined): value is Theme {
  return value === 'light' || value === 'dark';
}

function getUserTheme(): Theme {
  if (typeof window === 'undefined') {
    return DEFAULT_THEME;
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  return isTheme(storedTheme) ? storedTheme : DEFAULT_THEME;
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => getUserTheme());

  useEffect(() => {
    applyTheme(theme);

    const handleThemeChange = (event: Event) => {
      const detail = (event as CustomEvent<Theme>).detail;
      setThemeState(isTheme(detail) ? detail : getUserTheme());
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY) {
        setThemeState(getUserTheme());
      }
    };

    window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange as EventListener);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange as EventListener);
      window.removeEventListener('storage', handleStorage);
    };
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme: theme,
      setTheme: (nextTheme: Theme) => {
        if (!isTheme(nextTheme)) {
          return;
        }

        window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
        window.dispatchEvent(new CustomEvent<Theme>(THEME_CHANGE_EVENT, { detail: nextTheme }));
      }
    }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('ThemeProvider is missing');
  }

  return context;
}

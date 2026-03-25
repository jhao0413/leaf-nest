// app/components/ThemeSwitcher.tsx
'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/theme';

export function ThemeSwitcher() {
  const { resolvedTheme, setTheme } = useTheme();

  if (!resolvedTheme) return null;

  return (
    <button
      type="button"
      className="w-12 h-12 bg-white rounded-full mt-4 shadow-md flex items-center justify-center z-10 dark:bg-neutral-900"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      aria-label={resolvedTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      title={resolvedTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      {resolvedTheme === 'dark' ? <Sun /> : <Moon />}
    </button>
  );
}

// app/components/ThemeSwitcher.tsx
'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

export function ThemeSwitcher() {
  const { resolvedTheme, setTheme } = useTheme();

  if (!resolvedTheme) return null;

  return (
    <>
      <div
        className='w-12 h-12 bg-white rounded-full mt-4 shadow-md flex items-center justify-center cursor-pointer z-10 dark:bg-neutral-900'
        onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      >
        {resolvedTheme === 'dark' ? <Sun /> : <Moon />}
      </div>
    </>
  );
}

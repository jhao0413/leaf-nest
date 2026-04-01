// app/components/ThemeSwitcher.tsx
'use client';

import { Button } from '@heroui/react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/theme';

export function ThemeSwitcher() {
  const { resolvedTheme, setTheme } = useTheme();

  if (!resolvedTheme) return null;

  return (
    <Button
      className="mt-4 h-12 w-12 rounded-full bg-white shadow-md dark:bg-neutral-900"
      isIconOnly
      variant="outline"
      onPress={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      aria-label={resolvedTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      {resolvedTheme === 'dark' ? <Sun className="!size-6" /> : <Moon className="!size-6" />}
    </Button>
  );
}

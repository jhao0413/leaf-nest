'use client';

import { AuthCard } from '@/components/AuthCard';
import { useSessionStore } from '@/lib/auth/sessionStore';
import { useTranslations } from '@/i18n';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const t = useTranslations('Auth');
  const status = useSessionStore((state) => state.status);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-slate-50 dark:bg-neutral-950 px-4 py-10">
        <div className="animate-pulse">
          <p className="font-lxgw text-sm text-gray-500 dark:text-gray-400">
            {t('loadingSession')}
          </p>
        </div>
      </div>
    );
  }

  if (status !== 'authenticated') {
    return <AuthCard />;
  }

  return <>{children}</>;
}

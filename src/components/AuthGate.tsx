'use client';

import { AuthCard } from '@/components/AuthCard';
import { useSessionStore } from '@/lib/auth/sessionStore';
import { useTranslations } from '@/i18n';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const t = useTranslations('Auth');
  const status = useSessionStore((state) => state.status);

  if (status === 'loading') {
    return (
      <div className="flex min-h-full items-center justify-center px-4 py-10">
        <p className="font-lxgw text-sm text-gray-500 dark:text-gray-400">{t('loadingSession')}</p>
      </div>
    );
  }

  if (status !== 'authenticated') {
    return <AuthCard />;
  }

  return <>{children}</>;
}

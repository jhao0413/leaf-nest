'use client';

import { FormEvent, useMemo, useState } from 'react';
import { Button } from '@heroui/button';
import { Card, CardBody, CardHeader } from '@heroui/card';
import { Input } from '@heroui/input';
import { authClient } from '@/lib/auth/client';
import { useSessionStore } from '@/lib/auth/sessionStore';
import { useTranslations } from '@/i18n';

type AuthMode = 'sign-in' | 'sign-up';

function normalizeErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }

  return fallback;
}

export function AuthCard() {
  const t = useTranslations('Auth');
  const refetchSession = useSessionStore((state) => state.refetchSession);
  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const title = useMemo(
    () => (mode === 'sign-in' ? t('signInTitle') : t('signUpTitle')),
    [mode, t]
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (mode === 'sign-in') {
        const result = await authClient.signIn.email({
          email,
          password
        });

        if (result.error) {
          setErrorMessage(normalizeErrorMessage(result.error, t('signInFailed')));
          return;
        }
      } else {
        const result = await authClient.signUp.email({
          name,
          email,
          password
        });

        if (result.error) {
          setErrorMessage(normalizeErrorMessage(result.error, t('signUpFailed')));
          return;
        }
      }

      await refetchSession?.();
    } catch (error) {
      setErrorMessage(
        normalizeErrorMessage(
          error,
          mode === 'sign-in' ? t('signInFailed') : t('signUpFailed')
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md border border-white/50 bg-white/80 shadow-xl backdrop-blur-md dark:bg-neutral-900/85 dark:border-neutral-700">
        <CardHeader className="flex flex-col items-start gap-2 px-6 pt-6">
          <p className="text-sm uppercase tracking-[0.3em] text-gray-400 dark:text-gray-500">
            Leaf Nest
          </p>
          <div>
            <h1 className="font-lxgw text-3xl font-bold text-gray-900 dark:text-white">{title}</h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{t('description')}</p>
          </div>
        </CardHeader>
        <CardBody className="px-6 pb-6">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {mode === 'sign-up' && (
              <Input
                label={t('name')}
                value={name}
                onValueChange={setName}
                isRequired
                autoComplete="name"
              />
            )}
            <Input
              type="email"
              label={t('email')}
              value={email}
              onValueChange={setEmail}
              isRequired
              autoComplete="email"
            />
            <Input
              type="password"
              label={t('password')}
              value={password}
              onValueChange={setPassword}
              isRequired
              autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
            />

            {errorMessage && (
              <p className="text-sm text-red-500 dark:text-red-400" role="alert">
                {errorMessage}
              </p>
            )}

            <Button
              type="submit"
              color="primary"
              className="w-full font-medium"
              isLoading={isSubmitting}
            >
              {mode === 'sign-in' ? t('signInAction') : t('signUpAction')}
            </Button>
          </form>

          <button
            type="button"
            className="mt-4 text-sm text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            onClick={() => {
              setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in');
              setErrorMessage(null);
            }}
          >
            {mode === 'sign-in' ? t('switchToSignUp') : t('switchToSignIn')}
          </button>
        </CardBody>
      </Card>
    </div>
  );
}

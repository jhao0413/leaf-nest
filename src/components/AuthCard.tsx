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
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-slate-50 dark:bg-neutral-950">
      {/* Animated background blobs */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] h-[60%] w-[60%] animate-[pulse_8s_ease-in-out_infinite] rounded-full bg-blue-300/30 blur-[100px] dark:bg-blue-900/30"></div>
        <div className="absolute top-[10%] right-[-10%] h-[70%] w-[50%] animate-[pulse_10s_ease-in-out_infinite_reverse] rounded-full bg-sky-300/40 blur-[100px] dark:bg-sky-900/40"></div>
        <div className="absolute bottom-[-20%] left-[10%] h-[60%] w-[60%] animate-[pulse_12s_ease-in-out_infinite] rounded-full bg-cyan-300/30 blur-[100px] dark:bg-cyan-900/30"></div>
      </div>

      <div className="z-10 flex w-full max-w-md flex-col items-center px-4 py-10">
        <Card className="w-full border border-white/50 bg-white/60 shadow-2xl backdrop-blur-xl dark:border-neutral-700/50 dark:bg-neutral-900/60">
          <CardHeader className="flex flex-col items-start gap-2 px-8 pt-8 pb-2">
            <div className="flex w-full items-center justify-between">
              <p className="text-xs uppercase tracking-[0.4em] text-blue-500 font-semibold dark:text-blue-400">
                Leaf Nest
              </p>
            </div>
            <div className="mt-2">
              <h1 className="font-lxgw text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
                {title}
              </h1>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{t('description')}</p>
            </div>
          </CardHeader>
          <CardBody className="px-8 pb-8 pt-4">
            <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
              {mode === 'sign-up' && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <Input
                    label={t('name')}
                    value={name}
                    onValueChange={setName}
                    isRequired
                    autoComplete="name"
                    classNames={{
                      inputWrapper: "bg-white/50 dark:bg-neutral-800/50 hover:bg-white/80 dark:hover:bg-neutral-800/80 transition-colors"
                    }}
                  />
                </div>
              )}
              <Input
                type="email"
                label={t('email')}
                value={email}
                onValueChange={setEmail}
                isRequired
                autoComplete="email"
                classNames={{
                  inputWrapper: "bg-white/50 dark:bg-neutral-800/50 hover:bg-white/80 dark:hover:bg-neutral-800/80 transition-colors"
                }}
              />
              <Input
                type="password"
                label={t('password')}
                value={password}
                onValueChange={setPassword}
                isRequired
                autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
                classNames={{
                  inputWrapper: "bg-white/50 dark:bg-neutral-800/50 hover:bg-white/80 dark:hover:bg-neutral-800/80 transition-colors"
                }}
              />

              {errorMessage && (
                <div className="animate-in fade-in zoom-in-95 duration-200">
                  <p className="text-sm font-medium text-red-500 bg-red-100/50 dark:bg-red-900/20 px-3 py-2 rounded-lg dark:text-red-400" role="alert">
                    {errorMessage}
                  </p>
                </div>
              )}

              <Button
                type="submit"
                color="primary"
                className="w-full font-medium shadow-md hover:shadow-lg transition-all"
                isLoading={isSubmitting}
              >
                {mode === 'sign-in' ? t('signInAction') : t('signUpAction')}
              </Button>
            </form>

            <div className="mt-6 flex flex-col items-center">
              <div className="w-full relative flex items-center py-2">
                <div className="flex-grow border-t border-gray-300/30 dark:border-gray-700/30"></div>
                <span className="flex-shrink-0 mx-4 text-xs text-gray-400">or</span>
                <div className="flex-grow border-t border-gray-300/30 dark:border-gray-700/30"></div>
              </div>

              <button
                type="button"
                className="mt-2 text-sm text-gray-500 transition-colors hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 font-medium"
                onClick={() => {
                  setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in');
                  setErrorMessage(null);
                }}
              >
                {mode === 'sign-in' ? t('switchToSignUp') : t('switchToSignIn')}
              </button>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

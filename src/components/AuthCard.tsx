'use client';

import { FormEvent, useMemo, useState } from 'react';
import { Button, Card, TextField, Label, Input } from '@heroui/react';
import { authClient } from '@/lib/auth/client';
import { useSessionStore } from '@/lib/auth/sessionStore';
import { useTranslations } from '@/i18n';
import { AuthAsciiBackground } from '@/components/AuthAsciiBackground';

type AuthMode = 'sign-in' | 'sign-up';

function normalizeErrorMessage(error: unknown, fallback: string) {
  if (
    typeof error === 'object' &&
    error &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
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
  const inputClassName =
    'w-full border border-slate-200/80 bg-white/85 text-slate-900 placeholder:text-slate-500 transition-colors hover:bg-white dark:border-white/15 dark:bg-neutral-800/70 dark:text-slate-100 dark:placeholder:text-slate-400';

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
        normalizeErrorMessage(error, mode === 'sign-in' ? t('signInFailed') : t('signUpFailed'))
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[999] flex h-[100dvh] min-h-screen w-full bg-white dark:bg-neutral-950 overflow-hidden"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      <div className="pointer-events-none absolute inset-0 z-0">
        <AuthAsciiBackground className="absolute inset-0 h-full w-full opacity-60 dark:opacity-40" />
      </div>

      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute -left-24 top-1/4 h-[360px] w-[360px] rounded-full bg-cyan-200/50 blur-[120px] dark:bg-cyan-500/10" />
        <div className="absolute -right-28 bottom-0 h-[320px] w-[320px] rounded-full bg-violet-200/50 blur-[120px] dark:bg-violet-500/10" />
      </div>

      <div className="relative z-10 flex h-full min-h-[100dvh] w-full items-center justify-end px-4 py-10 sm:pr-12 md:pr-16 lg:pr-32">
        <div className="relative flex w-full max-w-[26rem] flex-col gap-6 sm:w-[90%] md:w-[70%]">
          <div className="group relative w-full">
            {/* Stacked Glass Effect Layers */}
            <div className="absolute -inset-1.5 z-0 rotate-[-3deg] rounded-[2.5rem] bg-white/20 opacity-60 shadow-lg backdrop-blur-md transition-all duration-500 group-hover:rotate-[-5deg] group-hover:scale-[1.02] dark:bg-black/20" />
            <div className="absolute -inset-1.5 z-0 rotate-[3deg] rounded-[2.5rem] bg-white/20 opacity-60 shadow-lg backdrop-blur-md transition-all duration-500 group-hover:rotate-[5deg] group-hover:scale-[1.02] dark:bg-black/20" />

            <Card className="relative z-10 w-full border border-white/30 bg-white/60 px-3 py-6 shadow-[0_30px_100px_-20px_rgba(15,23,42,0.3)] backdrop-blur-2xl transition-transform duration-500 hover:scale-[1.01] dark:border-white/10 dark:bg-neutral-900/50">
              <Card.Header className="relative z-10 flex flex-col gap-2 px-6 pb-2 pt-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-cyan-700/80 dark:text-cyan-300/90">
                  Leaf Nest
                </p>
                <div>
                  <h1 className="text-3xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300">
                    {title}
                  </h1>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    {t('description')}
                  </p>
                </div>
              </Card.Header>
              <Card.Content className="px-6 pb-6 pt-3">
                <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
                  {mode === 'sign-up' && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                      <TextField
                        fullWidth
                        value={name}
                        onChange={setName}
                        isRequired
                        autoComplete="name"
                        variant="secondary"
                      >
                        <Label>{t('name')}</Label>
                        <Input className={inputClassName} />
                      </TextField>
                    </div>
                  )}
                  <TextField
                    fullWidth
                    type="email"
                    value={email}
                    onChange={setEmail}
                    isRequired
                    autoComplete="email"
                    variant="secondary"
                  >
                    <Label>{t('email')}</Label>
                    <Input className={inputClassName} />
                  </TextField>
                  <TextField
                    fullWidth
                    type="password"
                    value={password}
                    onChange={setPassword}
                    isRequired
                    autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
                    variant="secondary"
                  >
                    <Label>{t('password')}</Label>
                    <Input className={inputClassName} />
                  </TextField>

                  {errorMessage && (
                    <div className="animate-in fade-in zoom-in-95 duration-200">
                      <p
                        className="rounded-lg bg-red-100/55 px-3 py-2 text-sm font-medium text-red-600 dark:bg-red-900/20 dark:text-red-300"
                        role="alert"
                      >
                        {errorMessage}
                      </p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    fullWidth
                    variant="primary"
                    className="font-medium shadow-md hover:shadow-lg transition-all"
                    isPending={isSubmitting}
                  >
                    {mode === 'sign-in' ? t('signInAction') : t('signUpAction')}
                  </Button>
                </form>

                <div className="mt-8 flex flex-col items-center">
                  <p className="text-center text-sm text-slate-500 dark:text-slate-400">
                    <button
                      type="button"
                      className="font-medium text-cyan-700 transition-colors hover:text-cyan-800 dark:text-cyan-400 dark:hover:text-cyan-300 ml-1"
                      onClick={() => {
                        setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in');
                        setErrorMessage(null);
                      }}
                    >
                      {mode === 'sign-in' ? t('switchToSignUp') : t('switchToSignIn')}
                    </button>
                  </p>
                </div>
              </Card.Content>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

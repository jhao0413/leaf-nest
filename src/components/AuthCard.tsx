'use client';

import { FormEvent, useMemo, useState } from 'react';
import { Button, Card, TextField, Label, Input } from '@heroui/react';
import {
  confirmServerApiBaseUrl,
  getApiBaseUrl,
  getServerApiBaseUrlInputValue,
  isServerApiBaseUrlConfigEnabled,
  setServerApiBaseUrl
} from '@/lib/api/baseUrl';
import { createLeafNestAuthClient } from '@/lib/auth/client';
import { setAuthSessionToken } from '@/lib/auth/sessionToken';
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

function getAuthResultToken(result: { data?: unknown }) {
  if (
    typeof result.data === 'object' &&
    result.data &&
    'token' in result.data &&
    typeof result.data.token === 'string'
  ) {
    return result.data.token;
  }

  return null;
}

export function AuthCard() {
  const t = useTranslations('Auth');
  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [serverUrl, setServerUrl] = useState(() => getServerApiBaseUrlInputValue());
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const requiresServerUrl = isServerApiBaseUrlConfigEnabled();
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
      const nextServerUrl = requiresServerUrl ? serverUrl.trim() : getApiBaseUrl();

      if (requiresServerUrl && !nextServerUrl) {
        setErrorMessage(t('serverUrlRequired'));
        return;
      }

      if (requiresServerUrl) {
        try {
          const parsedServerUrl = new URL(nextServerUrl);

          if (!['http:', 'https:'].includes(parsedServerUrl.protocol)) {
            setErrorMessage(t('serverUrlInvalid'));
            return;
          }
        } catch {
          setErrorMessage(t('serverUrlInvalid'));
          return;
        }

        setServerApiBaseUrl(nextServerUrl);
      }

      const activeAuthClient = createLeafNestAuthClient(nextServerUrl);

      if (mode === 'sign-in') {
        const result = await activeAuthClient.signIn.email({
          email,
          password
        });

        if (result.error) {
          setErrorMessage(normalizeErrorMessage(result.error, t('signInFailed')));
          return;
        }

        const token = getAuthResultToken(result);

        if (requiresServerUrl && token) {
          setAuthSessionToken(nextServerUrl, token);
        }
      } else {
        const result = await activeAuthClient.signUp.email({
          name,
          email,
          password
        });

        if (result.error) {
          setErrorMessage(normalizeErrorMessage(result.error, t('signUpFailed')));
          return;
        }

        const token = getAuthResultToken(result);

        if (requiresServerUrl && token) {
          setAuthSessionToken(nextServerUrl, token);
        }
      }

      if (requiresServerUrl) {
        confirmServerApiBaseUrl(nextServerUrl);
      }

      window.location.reload();
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
      className="fixed inset-0 z-[999] flex h-[100dvh] min-h-screen w-full overflow-hidden bg-white dark:bg-neutral-950"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      <div className="pointer-events-none absolute inset-0 z-0">
        <AuthAsciiBackground className="absolute inset-0 h-full w-full opacity-45 dark:opacity-30" />
      </div>

      <div className="relative z-10 flex h-full min-h-[100dvh] w-full items-center justify-center px-4 py-10 md:justify-end md:pr-[12vw] lg:pr-[16vw]">
        <div className="relative flex w-full max-w-[26rem] flex-col gap-6 sm:w-[90%] md:w-[70%]">
          <div className="group relative w-full">
            <div className="absolute -inset-1.5 z-0 rotate-[-3deg] rounded-[2.5rem] bg-white/20 opacity-60 shadow-lg backdrop-blur-md transition-[rotate,scale] duration-300 motion-safe:group-hover:rotate-[-5deg] motion-safe:group-hover:scale-[1.02] dark:bg-black/20" />
            <div className="absolute -inset-1.5 z-0 rotate-[3deg] rounded-[2.5rem] bg-white/20 opacity-60 shadow-lg backdrop-blur-md transition-[rotate,scale] duration-300 motion-safe:group-hover:rotate-[5deg] motion-safe:group-hover:scale-[1.02] dark:bg-black/20" />

            <Card className="relative z-10 w-full border border-white/30 bg-white/70 px-3 py-6 shadow-[0_30px_100px_-20px_rgba(15,23,42,0.3)] backdrop-blur-2xl transition-transform duration-150 motion-safe:hover:scale-[1.01] dark:border-white/10 dark:bg-neutral-900/60">
              <Card.Header className="relative z-10 flex flex-col gap-2 px-6 pb-2 pt-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-brand-700/80 dark:text-brand-300/90">
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
                  {requiresServerUrl && (
                    <TextField
                      fullWidth
                      type="url"
                      value={serverUrl}
                      onChange={setServerUrl}
                      isRequired
                      autoComplete="url"
                      variant="secondary"
                    >
                      <Label>{t('serverUrl')}</Label>
                      <Input className={inputClassName} placeholder={t('serverUrlPlaceholder')} />
                    </TextField>
                  )}

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
                    className="font-medium shadow-md transition-[box-shadow] duration-150 hover:shadow-lg"
                    isPending={isSubmitting}
                  >
                    {mode === 'sign-in' ? t('signInAction') : t('signUpAction')}
                  </Button>
                </form>

                <div className="mt-8 flex flex-col items-center">
                  <p className="text-center text-sm text-slate-500 dark:text-slate-400">
                    <button
                      type="button"
                      className="ml-1 font-medium text-brand-700 transition-colors hover:text-brand-800 dark:text-brand-300 dark:hover:text-brand-200"
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

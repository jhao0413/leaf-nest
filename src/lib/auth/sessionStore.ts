import { create } from 'zustand';
import { AuthSession } from '@/lib/auth/client';

export type SessionStatus = 'loading' | 'authenticated' | 'anonymous';

export interface SessionSnapshot {
  data: AuthSession | null | undefined;
  error: { message?: string | null } | null;
  isPending: boolean;
  refetch: (() => Promise<void>) | undefined;
}

interface SessionStore {
  status: SessionStatus;
  session: AuthSession | null;
  errorMessage: string | null;
  refetchSession?: () => Promise<void>;
  applySnapshot: (snapshot: SessionSnapshot) => void;
  clearSession: () => void;
}

export const useSessionStore = create<SessionStore>((set) => ({
  status: 'loading',
  session: null,
  errorMessage: null,
  refetchSession: undefined,
  applySnapshot: ({ data, error, isPending, refetch }) =>
    set({
      status: isPending ? 'loading' : data ? 'authenticated' : 'anonymous',
      session: data ?? null,
      errorMessage: error?.message ?? null,
      refetchSession: refetch
    }),
  clearSession: () =>
    set({
      status: 'anonymous',
      session: null,
      errorMessage: null
    })
}));

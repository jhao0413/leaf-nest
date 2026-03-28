import { render, screen } from '@testing-library/react';
import { AuthGate } from '@/components/AuthGate';
import { I18nProvider } from '@/i18n';

const { mockUseSessionStore } = vi.hoisted(() => ({
  mockUseSessionStore: vi.fn()
}));

vi.mock('@/lib/auth/sessionStore', () => ({
  useSessionStore: mockUseSessionStore
}));

vi.mock('@/components/AuthCard', () => ({
  AuthCard: () => <div data-testid="auth-card">Auth Card</div>
}));

describe('AuthGate', () => {
  it('renders the auth card when the session is anonymous', () => {
    mockUseSessionStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector({
        status: 'anonymous'
      })
    );

    render(
      <I18nProvider>
        <AuthGate>
          <div data-testid="protected-content">Protected Content</div>
        </AuthGate>
      </I18nProvider>
    );

    expect(screen.getByTestId('auth-card')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('renders protected content when the session is authenticated', () => {
    mockUseSessionStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector({
        status: 'authenticated'
      })
    );

    render(
      <I18nProvider>
        <AuthGate>
          <div data-testid="protected-content">Protected Content</div>
        </AuthGate>
      </I18nProvider>
    );

    expect(screen.queryByTestId('auth-card')).not.toBeInTheDocument();
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  it('returns to the auth card when the session becomes invalid', () => {
    let status = 'authenticated';

    mockUseSessionStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector({ status })
    );

    const { rerender } = render(
      <I18nProvider>
        <AuthGate>
          <div data-testid="protected-content">Protected Content</div>
        </AuthGate>
      </I18nProvider>
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();

    status = 'anonymous';
    rerender(
      <I18nProvider>
        <AuthGate>
          <div data-testid="protected-content">Protected Content</div>
        </AuthGate>
      </I18nProvider>
    );

    expect(screen.getByTestId('auth-card')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });
});

import { render, screen } from '@testing-library/react';
import { AuthGate } from '@/components/AuthGate';
import { I18nProvider } from '@/i18n';
import { confirmServerApiBaseUrl, setServerApiBaseUrl } from '@/lib/api/baseUrl';

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
  afterEach(() => {
    window.localStorage.clear();
  });

  function confirmTestServerUrl() {
    const serverUrl = 'https://reader.example.com';

    setServerApiBaseUrl(serverUrl);
    confirmServerApiBaseUrl(serverUrl);
  }

  it('renders the auth card when the session is anonymous', () => {
    confirmTestServerUrl();

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
    confirmTestServerUrl();

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

  it('requires the server URL to be confirmed through the login form', () => {
    setServerApiBaseUrl('https://reader.example.com');
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

    expect(screen.getByTestId('auth-card')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('returns to the auth card when the session becomes invalid', () => {
    confirmTestServerUrl();
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

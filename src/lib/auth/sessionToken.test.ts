import {
  clearAuthSessionToken,
  getAuthSessionToken,
  setAuthSessionToken
} from '@/lib/auth/sessionToken';

describe('auth session token storage', () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it('stores a token for the matching normalized server URL', () => {
    setAuthSessionToken('http://192.168.110.56:8787/', ' session-token ');

    expect(getAuthSessionToken('http://192.168.110.56:8787')).toBe('session-token');
  });

  it('does not return a token for another server URL', () => {
    setAuthSessionToken('http://192.168.110.56:8787', 'session-token');

    expect(getAuthSessionToken('http://192.168.110.57:8787')).toBeUndefined();
  });

  it('clears the token only for the matching server URL when one is supplied', () => {
    setAuthSessionToken('http://192.168.110.56:8787', 'session-token');

    clearAuthSessionToken('http://192.168.110.57:8787');
    expect(getAuthSessionToken('http://192.168.110.56:8787')).toBe('session-token');

    clearAuthSessionToken('http://192.168.110.56:8787');
    expect(getAuthSessionToken('http://192.168.110.56:8787')).toBeUndefined();
  });
});

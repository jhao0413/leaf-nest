describe('api base URL helpers', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    window.localStorage.clear();
  });

  it('keeps API paths relative when no base URL is configured', async () => {
    const { createApiUrl } = await import('./baseUrl');

    expect(createApiUrl('/api/books')).toBe('/api/books');
    expect(createApiUrl('api/books')).toBe('/api/books');
    expect(createApiUrl('https://example.com/file.epub')).toBe('https://example.com/file.epub');
  });

  it('prefixes API paths with the configured base URL', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://reader.example.com/');
    vi.resetModules();

    const { createApiUrl, getApiBaseUrl } = await import('./baseUrl');

    expect(getApiBaseUrl()).toBe('https://reader.example.com');
    expect(createApiUrl('/api/books')).toBe('https://reader.example.com/api/books');
  });

  it('uses the stored runtime server URL before the build-time default', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://reader.example.com/');
    vi.resetModules();

    const { createApiUrl, getApiBaseUrl, setServerApiBaseUrl } = await import('./baseUrl');

    setServerApiBaseUrl('http://192.168.110.56:8787/');

    expect(getApiBaseUrl()).toBe('http://192.168.110.56:8787');
    expect(createApiUrl('/api/books')).toBe('http://192.168.110.56:8787/api/books');
  });
});

const API_BASE_URL_STORAGE_KEY = 'leaf-nest-api-base-url';
const API_BASE_URL_CONFIRMED_STORAGE_KEY = 'leaf-nest-api-base-url-confirmed';
const API_BASE_URL_CHANGE_EVENT = 'leaf-nest-api-base-url-change';
const configuredApiBaseUrl = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL ?? '');

export interface ApiBaseUrlChangeDetail {
  apiBaseUrl: string;
}

export function normalizeApiBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, '');
}

function getStoredApiBaseUrl() {
  if (typeof window === 'undefined') {
    return '';
  }

  return normalizeApiBaseUrl(window.localStorage.getItem(API_BASE_URL_STORAGE_KEY) ?? '');
}

export function getConfiguredApiBaseUrl() {
  return getStoredApiBaseUrl() || configuredApiBaseUrl;
}

export function getServerApiBaseUrlInputValue() {
  return getConfiguredApiBaseUrl();
}

export function setServerApiBaseUrl(value: string) {
  if (typeof window === 'undefined') {
    return;
  }

  const previousApiBaseUrl = getConfiguredApiBaseUrl();
  const apiBaseUrl = normalizeApiBaseUrl(value);

  if (apiBaseUrl) {
    window.localStorage.setItem(API_BASE_URL_STORAGE_KEY, apiBaseUrl);
  } else {
    window.localStorage.removeItem(API_BASE_URL_STORAGE_KEY);
  }

  if (apiBaseUrl !== previousApiBaseUrl) {
    clearServerApiBaseUrlConfirmation();
  }

  window.dispatchEvent(
    new CustomEvent<ApiBaseUrlChangeDetail>(API_BASE_URL_CHANGE_EVENT, {
      detail: { apiBaseUrl }
    })
  );
}

export function confirmServerApiBaseUrl(value: string) {
  if (typeof window === 'undefined') {
    return;
  }

  const apiBaseUrl = normalizeApiBaseUrl(value);

  if (!apiBaseUrl) {
    return;
  }

  window.localStorage.setItem(API_BASE_URL_CONFIRMED_STORAGE_KEY, apiBaseUrl);
}

export function clearServerApiBaseUrlConfirmation() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(API_BASE_URL_CONFIRMED_STORAGE_KEY);
}

export function isServerApiBaseUrlConfirmed() {
  if (typeof window === 'undefined') {
    return false;
  }

  const apiBaseUrl = getConfiguredApiBaseUrl();

  if (!apiBaseUrl) {
    return false;
  }

  return (
    normalizeApiBaseUrl(window.localStorage.getItem(API_BASE_URL_CONFIRMED_STORAGE_KEY) ?? '') ===
    apiBaseUrl
  );
}

export function subscribeApiBaseUrlChange(callback: (apiBaseUrl: string) => void) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleChange = (event: Event) => {
    callback(
      (event as CustomEvent<ApiBaseUrlChangeDetail>).detail?.apiBaseUrl ?? getConfiguredApiBaseUrl()
    );
  };

  const handleStorage = (event: StorageEvent) => {
    if (event.key === API_BASE_URL_STORAGE_KEY) {
      callback(getConfiguredApiBaseUrl());
    }
  };

  window.addEventListener(API_BASE_URL_CHANGE_EVENT, handleChange as EventListener);
  window.addEventListener('storage', handleStorage);

  return () => {
    window.removeEventListener(API_BASE_URL_CHANGE_EVENT, handleChange as EventListener);
    window.removeEventListener('storage', handleStorage);
  };
}

export function getApiBaseUrl() {
  const apiBaseUrl = getConfiguredApiBaseUrl();

  if (apiBaseUrl) {
    return apiBaseUrl;
  }

  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  return 'http://localhost:8787';
}

export function createApiUrl(path: string) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const apiBaseUrl = getConfiguredApiBaseUrl();

  if (!apiBaseUrl) {
    return normalizedPath;
  }

  return `${apiBaseUrl}${normalizedPath}`;
}

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: BodyInit | null;
}

async function parseResponse(response: Response) {
  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    return response.json();
  }

  return response.text();
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(path, {
    credentials: 'include',
    ...options
  });
  const data = await parseResponse(response);

  if (!response.ok) {
    const message =
      typeof data === 'object' && data && 'error' in data && typeof data.error === 'string'
        ? data.error
        : response.statusText || 'Request failed';

    throw new ApiError(message, response.status, data);
  }

  return data as T;
}

function withJsonHeaders(headers?: HeadersInit) {
  return {
    'Content-Type': 'application/json',
    ...headers
  };
}

export const apiClient = {
  get<T>(path: string) {
    return request<T>(path);
  },
  post<T>(path: string, body?: unknown) {
    return request<T>(path, {
      method: 'POST',
      headers: withJsonHeaders(),
      body: typeof body === 'undefined' ? undefined : JSON.stringify(body)
    });
  },
  postForm<T>(path: string, formData: FormData) {
    return request<T>(path, {
      method: 'POST',
      body: formData
    });
  },
  put<T>(path: string, body: unknown) {
    return request<T>(path, {
      method: 'PUT',
      headers: withJsonHeaders(),
      body: JSON.stringify(body)
    });
  },
  patch<T>(path: string, body: unknown) {
    return request<T>(path, {
      method: 'PATCH',
      headers: withJsonHeaders(),
      body: JSON.stringify(body)
    });
  },
  delete(path: string) {
    return request<null>(path, {
      method: 'DELETE'
    });
  }
};

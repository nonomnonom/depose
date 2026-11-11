import { ApiError, type ApiErrorDetail } from './errors';

export interface CustomFetchEnvelope<T> {
  data: T;
  status: number;
  headers: Headers;
}

export const customFetch = async <T>(url: string, options: RequestInit): Promise<T> => {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    const envelope = payload as
      | { code?: string; message?: string; details?: ApiErrorDetail[] }
      | null;
    throw new ApiError(
      response.status,
      envelope?.code ?? 'INTERNAL_ERROR',
      envelope?.message ?? response.statusText,
      Array.isArray(envelope?.details) ? envelope.details : [],
    );
  }

  return { data: payload, status: response.status, headers: response.headers } as T;
};

const request = async <T>(
  url: string,
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  body?: unknown,
): Promise<T> => {
  const options: RequestInit = { method };
  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }
  const response = await customFetch<CustomFetchEnvelope<T>>(url, options);
  return response.data;
};

export const api = {
  get: <T>(url: string) => request<T>(url, 'GET'),
  post: <T>(url: string, body?: unknown) => request<T>(url, 'POST', body),
  patch: <T>(url: string, body?: unknown) => request<T>(url, 'PATCH', body),
  put: <T>(url: string, body?: unknown) => request<T>(url, 'PUT', body),
  delete: <T>(url: string) => request<T>(url, 'DELETE'),
};

export { ApiError };
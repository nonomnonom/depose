import { ApiError, codeForStatus, type ApiErrorDetail } from './errors';

type SuccessfulResponse<T> = Extract<T, { status: 200 }> | Extract<T, { status: 201 }>;

/**
 * Generated endpoint types include the documented error responses even though
 * `customFetch` throws on non-2xx replies. Narrow the union back to its success
 * payload at the call site.
 */
export function unwrapData<T extends { status: number; data: unknown }>(
  response: T,
): SuccessfulResponse<T> extends { data: infer D } ? D : never {
  if (response.status >= 400) {
    const payload = response.data as {
      code?: string;
      message?: string;
      details?: ApiErrorDetail[];
    };
    throw new ApiError(
      response.status,
      payload?.code ?? codeForStatus(response.status),
      payload?.message ?? 'Request failed.',
      Array.isArray(payload?.details) ? payload.details : [],
    );
  }
  return response.data as SuccessfulResponse<T> extends { data: infer D } ? D : never;
}

export interface CustomFetchEnvelope<T> {
  data: T;
  status: number;
  headers: Headers;
}

function newRequestId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `req_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

function readMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object' && 'message' in payload) {
    const message = (payload as { message?: unknown }).message;
    if (Array.isArray(message)) return message.join(', ');
    if (typeof message === 'string' && message.length > 0) return message;
  }
  return fallback;
}

export const customFetch = async <T>(url: string, options: RequestInit): Promise<T> => {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  const requestId = headers.get('X-Request-Id') ?? newRequestId();
  headers.set('X-Request-Id', requestId);
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server.', [], requestId);
  }

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
      envelope?.code ?? codeForStatus(response.status),
      readMessage(payload, response.statusText || 'Request failed.'),
      Array.isArray(envelope?.details) ? envelope.details : [],
      response.headers.get('X-Request-Id') ?? requestId,
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

/** Escape hatch for endpoints Better Auth owns (`/api/auth/*`). */
export const api = {
  get: <T>(url: string) => request<T>(url, 'GET'),
  post: <T>(url: string, body?: unknown) => request<T>(url, 'POST', body),
  patch: <T>(url: string, body?: unknown) => request<T>(url, 'PATCH', body),
  put: <T>(url: string, body?: unknown) => request<T>(url, 'PUT', body),
  delete: <T>(url: string) => request<T>(url, 'DELETE'),
};

export { ApiError };

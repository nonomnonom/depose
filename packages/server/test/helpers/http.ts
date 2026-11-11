import { TEST_AUTH_ORIGIN } from './test-env.js';

export interface E2ERequestInit {
  method?: string;
  body?: unknown;
  cookie?: string;
  /** Tenant host, resolved through `firm_domains` (trust proxy is on in tests). */
  host?: string;
  headers?: Record<string, string>;
  formData?: FormData;
  /** Raw bytes for the binary upload route; set `headers['content-type']` too. */
  rawBody?: Uint8Array;
}

export interface E2EResponse {
  status: number;
  headers: Headers;
  text: string;
  json: <T = unknown>() => T;
}

/**
 * Requests always carry an Origin that better-auth trusts, and a tenant host
 * that the tenancy middleware resolves from `x-forwarded-host`.
 */
export async function request(
  baseUrl: string,
  path: string,
  init: E2ERequestInit = {},
): Promise<E2EResponse> {
  const headers: Record<string, string> = {
    origin: TEST_AUTH_ORIGIN,
    'x-forwarded-host': init.host ?? 'localhost',
    ...init.headers,
  };
  if (init.cookie) headers.cookie = init.cookie;

  let body: BodyInit | undefined;
  if (init.rawBody) {
    body = init.rawBody as unknown as BodyInit;
  } else if (init.formData) {
    body = init.formData;
  } else if (init.body !== undefined) {
    headers['content-type'] = 'application/json';
    body = JSON.stringify(init.body);
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method: init.method ?? (body ? 'POST' : 'GET'),
    headers,
    body,
  });
  const text = await response.text();

  return {
    status: response.status,
    headers: response.headers,
    text,
    json: <T = unknown>() => JSON.parse(text) as T,
  };
}

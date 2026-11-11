const API_BASE = 'http://localhost:3000/api';

export async function customFetch(input: RequestInfo | URL, init?: RequestInit) {
  const url = input instanceof URL ? input : new URL(input, API_BASE);

  const headers: HeadersInit = new Headers(init?.headers);
  headers.set('Accept', 'application/json');

  const response = await fetch(url, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`[api] ${response.status} ${response.statusText} ${text}`);
  }

  return response;
}

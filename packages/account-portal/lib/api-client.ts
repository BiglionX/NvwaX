/**
 * Browser-side API client for account-portal.
 *
 * All endpoints are relative — the static export lives behind the same origin
 * as the backend (https://account.proclaw.cc), so cookies set by `/api/portal/*`
 * travel with each request automatically.
 *
 * Sprint 2 — no external fetches; never leaks through the public internet.
 */

export type ApiError = {
  code: string;
  message: string;
};

export class PortalApiError extends Error {
  code: string;
  status: number;

  constructor(status: number, body: ApiError) {
    super(body.message || `HTTP ${status}`);
    this.name = 'PortalApiError';
    this.code = body.code || 'unknown_error';
    this.status = status;
  }
}

type JsonRequest = {
  method: 'POST' | 'GET' | 'PUT' | 'DELETE';
  path: string;
  body?: unknown;
  signal?: AbortSignal;
};

async function jsonRequest<T>({ method, path, body, signal }: JsonRequest): Promise<T> {
  const init: RequestInit = {
    method,
    credentials: 'include', // send/receive pc_session cookie
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  };
  if (body !== undefined) init.body = JSON.stringify(body);
  if (signal) init.signal = signal;

  const res = await fetch(path, init);
  const text = await res.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { code: 'invalid_json', message: text };
    }
  }

  if (!res.ok) {
    const errBody = (parsed && typeof parsed === 'object' ? parsed : { code: 'http_error', message: res.statusText }) as ApiError;
    throw new PortalApiError(res.status, errBody);
  }
  return parsed as T;
}

export const portalApi = {
  register: (input: { email: string; password: string; locale?: string }) =>
    jsonRequest<{ ok: true }>({
      method: 'POST',
      path: '/api/portal/register',
      body: input,
    }),

  activate: (token: string) =>
    jsonRequest<{ ok: true; redirectTo?: string }>({
      method: 'POST',
      path: `/api/portal/activate/${encodeURIComponent(token)}`,
    }),

  login: (input: { email: string; password: string; redirectTo?: string }) =>
    jsonRequest<{ ok: true; redirectTo: string }>({
      method: 'POST',
      path: '/api/portal/login',
      body: input,
    }),

  logout: () =>
    jsonRequest<{ ok: true }>({
      method: 'POST',
      path: '/api/portal/logout',
    }),

  /** Lightweight liveness probe used by the login form before submit. */
  ping: () => jsonRequest<{ ok: true }>({ method: 'GET', path: '/api/portal/ping' }),
};

export type PortalApi = typeof portalApi;

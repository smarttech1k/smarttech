export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  'http://localhost:8000/api/v1';

const AUTH_TOKEN_KEY = 'korusa_auth_token';
const AUTH_USER_KEY = 'korusa_auth_user';

export type AuthUser = {
  id: string;
  email: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
};

export type AuthTokens = {
  access_token: string;
  refresh_token?: string;
  user: AuthUser;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function getStoredAuth() {
  if (typeof window === 'undefined') return { token: null, user: null };

  const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
  const userRaw = window.localStorage.getItem(AUTH_USER_KEY);

  return {
    token,
    user: userRaw ? (() => {
      try {
        return JSON.parse(userRaw) as AuthUser;
      } catch {
        return null;
      }
    })() : null,
  };
}

export function setStoredAuth(token: string, user: AuthUser) {
  window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

export function clearStoredAuth() {
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
  window.localStorage.removeItem(AUTH_USER_KEY);
}

function getHeaders(token?: string) {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...getHeaders(token || undefined),
      ...(options.headers || {}),
    },
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message = typeof payload === 'string'
      ? payload
      : payload?.detail || payload?.message || 'Request failed';
    if (typeof window !== 'undefined' && response.status === 401) {
      window.dispatchEvent(new CustomEvent('korusa:unauthorized'));
    }
    throw new ApiError(message, response.status);
  }

  if (payload && typeof payload === 'object' && 'success' in payload && 'data' in payload) {
    return (payload as { data: T }).data;
  }

  return payload as T;
}

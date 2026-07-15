import { API_BASE } from '../config';

/**
 * Thin client for the auth surface of apps/api. Sessions ride an httpOnly
 * cookie, so every call sends credentials; no token ever touches JS state.
 */

export interface AccountUser {
  id: string;
  name: string;
  email: string;
}

export interface AccountWorkspace {
  id: string;
  name: string;
}

export interface Account {
  user: AccountUser;
  workspace: AccountWorkspace | null;
}

async function post(path: string, body?: unknown): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function signUp(
  name: string,
  email: string,
  password: string,
): Promise<{ ok: boolean; error?: string }> {
  const res = await post('/api/auth/sign-up/email', { name, email, password });
  if (res.ok) return { ok: true };
  const detail = (await res.json().catch(() => null)) as { message?: string } | null;
  return { ok: false, error: detail?.message ?? `Sign-up failed (${res.status})` };
}

export async function signIn(
  email: string,
  password: string,
): Promise<{ ok: boolean; error?: string }> {
  const res = await post('/api/auth/sign-in/email', { email, password });
  if (res.ok) return { ok: true };
  if (res.status === 401) return { ok: false, error: 'Wrong email or password.' };
  return { ok: false, error: `Sign-in failed (${res.status})` };
}

export async function signOut(): Promise<void> {
  await post('/api/auth/sign-out');
}

/** Returns the signed-in account, or null when there is no session. */
export async function getAccount(): Promise<Account | null> {
  const res = await fetch(`${API_BASE}/api/me`, { credentials: 'include' });
  if (!res.ok) return null;
  return (await res.json()) as Account;
}

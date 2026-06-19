/**
 * Authenticated fetch utility.
 * - Reads the JWT from localStorage and injects the Authorization header.
 * - Checks JWT expiry before every request.
 * - Redirects to /login and clears stored credentials on 401 or expired token.
 * - Writes are online-only: an offline mutation is never sent or queued — it
 *   surfaces a global "Ligação à internet necessária" toast instead.
 */

import { showToast } from './toast';

const OFFLINE_MESSAGE = 'Ligação à internet necessária';

/** Methods that change server state — these require a live connection. */
function isMutation(method?: string): boolean {
  const m = (method ?? 'GET').toUpperCase();
  return m === 'POST' || m === 'PUT' || m === 'PATCH' || m === 'DELETE';
}

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return typeof payload.exp === 'number' && payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

function clearAuthAndRedirect(): void {
  localStorage.removeItem('airfa_token');
  localStorage.removeItem('airfa_user');
  window.location.href = '/login';
}

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('airfa_token');

  if (!token || isTokenExpired(token)) {
    clearAuthAndRedirect();
    // Return a promise that never resolves — the redirect is already in progress.
    return new Promise(() => {});
  }

  const mutation = isMutation(options.method);

  // Block offline writes before they leave the device. navigator.onLine === false
  // is a definitive "no network"; we still catch reachable-but-failed cases below.
  if (mutation && typeof navigator !== 'undefined' && navigator.onLine === false) {
    showToast(OFFLINE_MESSAGE);
    // Never resolves: the submit simply does not proceed (mirrors the redirect cases above).
    return new Promise(() => {});
  }

  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (err) {
    // Network error (e.g. connected to Wi-Fi but server unreachable, or dropped mid-flight).
    // For writes, surface the same offline warning centrally; reads keep their own handling.
    if (mutation) {
      showToast(OFFLINE_MESSAGE);
      return new Promise(() => {});
    }
    throw err;
  }

  if (response.status === 401) {
    clearAuthAndRedirect();
    return new Promise(() => {});
  }

  return response;
}

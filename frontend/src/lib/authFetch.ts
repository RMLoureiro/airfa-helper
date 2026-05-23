/**
 * Authenticated fetch utility.
 * - Reads the JWT from localStorage and injects the Authorization header.
 * - Checks JWT expiry before every request.
 * - Redirects to /login and clears stored credentials on 401 or expired token.
 */

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

  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    clearAuthAndRedirect();
    return new Promise(() => {});
  }

  return response;
}

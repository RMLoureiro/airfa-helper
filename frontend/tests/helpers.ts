import type { Page } from '@playwright/test';

/**
 * A syntactically valid JWT whose `exp` is far in the future, so authFetch's
 * client-side expiry check accepts it. The signature is irrelevant here because
 * the backend is always mocked in these tests.
 */
export const AUTH_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwiZXhwIjo5OTk5OTk5OTk5fQ.sig';

/** Default authenticated user used across tests (a super-admin). */
export const STORED_USER = {
  id: 1,
  username: 'admin',
  name: 'Admin Airfa',
  system_role: 'SUPER_ADMIN',
  musical_role: 'TRUMPET_PLAYER',
};

/** Seed localStorage so the app treats the session as an authenticated user. */
export async function seedAuth(page: Page, user: Record<string, unknown> = STORED_USER): Promise<void> {
  await page.addInitScript((data) => {
    localStorage.setItem('airfa_token', data.token);
    localStorage.setItem('airfa_user', JSON.stringify(data.user));
  }, { token: AUTH_TOKEN, user });
}

/**
 * Fulfil any unmatched API call with an empty 200. Register this BEFORE the
 * test's specific routes so those take priority (Playwright runs the most
 * recently registered matching handler first). Keeps background fetches —
 * notifications, secondary lists — from hitting the network and erroring.
 */
export async function stubApi(page: Page): Promise<void> {
  await page.route('**/api/v1/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
}

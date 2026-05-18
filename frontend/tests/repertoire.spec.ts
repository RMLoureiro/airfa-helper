import { expect, test } from '@playwright/test';

test('repertoire page loads with the expected data', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('airfa_token', 'mock-token');
    localStorage.setItem(
      'airfa_user',
      JSON.stringify({ id: 1, email: 'admin@airfa.pt', name: 'Admin Airfa', system_role: 'SUPER_ADMIN' })
    );
  });

  await page.route('**/api/v1/repertoire', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 1, title: 'Symphony No. 5', youtube_link: null, folder_path: null, state: 'CURRENT', files: [] },
        { id: 2, title: 'The Four Seasons', youtube_link: null, folder_path: null, state: 'FUTURE', files: [] },
      ]),
    });
  });

  await page.goto('/repertorio');

  await expect(page.getByRole('heading', { level: 1, name: 'Repertório' })).toBeVisible();
  await expect(page.getByText('Symphony No. 5')).toBeVisible();
  await expect(page.getByText('The Four Seasons')).toBeVisible();
  await expect(page.getByText('CURRENT')).toBeVisible();
  await expect(page.getByText('FUTURE')).toBeVisible();
});
import { expect, test } from '@playwright/test';
import { seedAuth, stubApi } from './helpers';

test('repertoire page loads with the expected data', async ({ page }) => {
  await seedAuth(page);
  await stubApi(page);

  await page.route('**/api/v1/repertoire', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 1, title: 'Symphony No. 5', composer: 'Beethoven', arranger: null, youtube_link: null, notes: null, state: 'CURRENT', files: [] },
        { id: 2, title: 'The Four Seasons', composer: 'Vivaldi', arranger: null, youtube_link: null, notes: null, state: 'FUTURE', files: [] },
      ]),
    });
  });

  await page.goto('/repertorio');

  await expect(page.getByRole('heading', { level: 1, name: 'Repertório' })).toBeVisible();
  await expect(page.getByText('Symphony No. 5')).toBeVisible();
  await expect(page.getByText('The Four Seasons')).toBeVisible();
  // States are rendered with translated labels (also used by the filter pills,
  // so scope to the first match).
  await expect(page.getByText('Atual').first()).toBeVisible();
  await expect(page.getByText('Em estudo').first()).toBeVisible();
});

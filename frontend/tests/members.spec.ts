import { expect, test } from '@playwright/test';
import { seedAuth, stubApi } from './helpers';

test('members page loads with the expected data', async ({ page }) => {
  await seedAuth(page);
  await stubApi(page);

  // The page fetches /api/v1/members/?status=active — match the trailing slash + query.
  await page.route('**/api/v1/members/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 1, username: 'john', name: 'John Doe', system_role: 'REGULAR', musical_role: 'CLARINET_PLAYER' },
        { id: 2, username: 'jane', name: 'Jane Smith', system_role: 'ADMIN', musical_role: 'FLUTE_PLAYER' },
      ]),
    });
  });

  await page.goto('/membros');

  await expect(page.getByRole('heading', { level: 1, name: 'Membros' })).toBeVisible();
  await expect(page.getByText('John Doe')).toBeVisible();
  await expect(page.getByText('Jane Smith')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Novo membro' })).toBeVisible();
});

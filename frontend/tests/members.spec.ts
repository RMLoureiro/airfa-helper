import { expect, test } from '@playwright/test';

test('members page loads with the expected data', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('airfa_token', 'mock-token');
    localStorage.setItem(
      'airfa_user',
      JSON.stringify({ id: 1, email: 'admin@airfa.pt', name: 'Admin Airfa', system_role: 'SUPER_ADMIN' })
    );
  });

  await page.route('**/api/v1/members', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 1, email: 'john@airfa.pt', name: 'John Doe', system_role: 'REGULAR' },
        { id: 2, email: 'jane@airfa.pt', name: 'Jane Smith', system_role: 'ADMIN' },
      ]),
    });
  });

  await page.goto('/membros');

  await expect(page.getByRole('heading', { level: 1, name: 'Membros' })).toBeVisible();
  await expect(page.getByText('John Doe')).toBeVisible();
  await expect(page.getByText('Jane Smith')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Criar membro' })).toBeVisible();
});
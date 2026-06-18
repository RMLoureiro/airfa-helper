import { expect, test } from '@playwright/test';

test('login page loads with the expected branding', async ({ page }) => {
  await page.goto('/login');

  await expect(page.getByRole('heading', { name: 'Iniciar sessão' })).toBeVisible();
  await expect(page.getByText('Banda Filarmónica')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
});

test('root redirects to login', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Iniciar sessão' })).toBeVisible();
});

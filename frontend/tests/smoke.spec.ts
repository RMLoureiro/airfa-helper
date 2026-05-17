import { expect, test } from '@playwright/test';

test('login page loads with the expected branding', async ({ page }) => {
  await page.goto('/login');

  await expect(page.getByRole('heading', { name: 'Gestão da banda filarmónica' })).toBeVisible();
  await expect(page.getByText('Acesso centralizado para membros, admins e super-admins, com interface em português.')).toBeVisible();
});

test('root redirects to login', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Gestão da banda filarmónica' })).toBeVisible();
});

import { expect, test } from '@playwright/test';

test('login submits credentials and redirects to the home page', async ({ page }) => {
  await page.route('**/api/v1/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'mock-token',
        token_type: 'bearer',
        user: {
          id: 1,
          email: 'admin@airfa.pt',
          name: 'Admin Airfa',
          system_role: 'SUPER_ADMIN',
        },
      }),
    });
  });

  await page.route('**/api/v1/home', async (route) => {
    const authorization = route.request().headers().authorization;
    expect(authorization).toContain('Bearer mock-token');

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        name: 'Admin Airfa',
        system_role: 'SUPER_ADMIN',
        musical_role: null,
        upcoming_events: [],
        upcoming_birthdays: [],
        recent_feed: [],
      }),
    });
  });

  await page.goto('/login');
  await page.getByLabel('Email').fill('admin@airfa.pt');
  await page.getByLabel('Password').fill('admin123');
  await page.getByRole('button', { name: 'Entrar' }).click();

  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByRole('heading', { name: 'Bem-vindo, Admin Airfa.' })).toBeVisible();
  await expect(page.getByRole('complementary').getByText('SUPER_ADMIN')).toBeVisible();

  const token = await page.evaluate(() => localStorage.getItem('airfa_token'));
  expect(token).toBe('mock-token');
});

test('authenticated home renders the main dashboard sections', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('airfa_token', 'mock-token');
    localStorage.setItem(
      'airfa_user',
      JSON.stringify({ id: 1, email: 'admin@airfa.pt', name: 'Admin Airfa', system_role: 'SUPER_ADMIN' })
    );
  });

  await page.route('**/api/v1/home', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        name: 'Admin Airfa',
        system_role: 'SUPER_ADMIN',
        musical_role: null,
        upcoming_events: [
          {
            id: 10,
            title: 'Ensaio Geral',
            description: 'Últimos preparativos.',
            start_time: '2026-05-18T20:00:00.000Z',
            location: 'Auditório',
            type: 'REHEARSAL',
          },
        ],
        upcoming_birthdays: [
          {
            id: 5,
            name: 'João Silva',
            birth_date: '1990-05-17',
            days_until: 0,
          },
        ],
        recent_feed: [
          {
            id: 1,
            item_type: 'NEWSLETTER',
            title: 'Boletim semanal',
            description: 'Resumo das novidades.',
            published_at: '2026-05-17T10:00:00.000Z',
          },
        ],
      }),
    });
  });

  await page.goto('/home');

  await expect(page.getByRole('heading', { name: 'Bem-vindo, Admin Airfa.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Newsletter e agenda' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Próximos eventos' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Próximos aniversários' })).toBeVisible();
  await expect(page.getByText('Boletim semanal')).toBeVisible();
  await expect(page.getByText('Ensaio Geral')).toBeVisible();
  await expect(page.getByText('João Silva')).toBeVisible();
});

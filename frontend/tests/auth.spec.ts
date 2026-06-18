import { expect, test } from '@playwright/test';
import { AUTH_TOKEN, STORED_USER, seedAuth, stubApi } from './helpers';

const HOME_PAYLOAD = {
  name: 'Admin Airfa',
  system_role: 'SUPER_ADMIN',
  musical_role: 'TRUMPET_PLAYER',
  upcoming_events: [
    {
      id: 10,
      title: 'Ensaio Geral',
      description: 'Últimos preparativos.',
      start_time: '2026-05-18T20:00:00.000Z',
      end_time: '2026-05-18T22:00:00.000Z',
      location: 'Auditório',
      type: 'REHEARSAL',
    },
  ],
  upcoming_birthdays: [
    { id: 5, name: 'João Silva', birth_date: '1990-05-17', days_until: 0 },
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
};

test('login submits credentials and redirects to the home page', async ({ page }) => {
  await stubApi(page);

  await page.route('**/api/v1/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: AUTH_TOKEN,
        token_type: 'bearer',
        user: STORED_USER,
      }),
    });
  });

  await page.route('**/api/v1/home', async (route) => {
    expect(route.request().headers().authorization).toContain(`Bearer ${AUTH_TOKEN}`);
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(HOME_PAYLOAD) });
  });

  await page.goto('/login');
  await page.getByLabel('Username').fill('admin');
  await page.getByLabel('Password').fill('admin123');
  await page.getByRole('button', { name: 'Entrar' }).click();

  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Início' })).toBeVisible();
  await expect(page.getByText('Super Admin').first()).toBeVisible();

  const token = await page.evaluate(() => localStorage.getItem('airfa_token'));
  expect(token).toBe(AUTH_TOKEN);
});

test('authenticated home renders the main dashboard sections', async ({ page }) => {
  await seedAuth(page);
  await stubApi(page);

  await page.route('**/api/v1/home', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(HOME_PAYLOAD) });
  });

  await page.goto('/home');

  await expect(page.getByRole('heading', { level: 1, name: 'Início' })).toBeVisible();
  await expect(page.getByText('Boletim semanal')).toBeVisible();
  await expect(page.getByText('Ensaio Geral')).toBeVisible();
  await expect(page.getByText('João Silva')).toBeVisible();
});

test('authenticated newsletter page renders items and creates a publication', async ({ page }) => {
  await seedAuth(page);
  await stubApi(page);

  const items = [
    {
      id: 1,
      title: 'Boletim semanal',
      content: 'Resumo das novidades.',
      author_id: 1,
      author_name: 'Admin Airfa',
      created_at: '2026-05-17T10:00:00.000Z',
    },
  ];

  await page.route('**/api/v1/newsletter', async (route) => {
    const method = route.request().method();

    if (method === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(items) });
      return;
    }

    if (method === 'POST') {
      const payload = route.request().postDataJSON() as { title: string; content: string };
      const created = {
        id: 2,
        title: payload.title,
        content: payload.content,
        author_id: 1,
        author_name: 'Admin Airfa',
        created_at: '2026-05-17T11:00:00.000Z',
      };
      items.unshift(created);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(created) });
      return;
    }

    await route.fallback();
  });

  await page.goto('/newsletter');

  await expect(page.getByRole('heading', { level: 1, name: 'Newsletter' })).toBeVisible();
  await expect(page.getByText('Boletim semanal')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Nova publicação' })).toBeVisible();

  await page.getByRole('button', { name: 'Nova publicação' }).click();
  await expect(page.getByRole('heading', { name: 'Nova publicação' })).toBeVisible();

  await page.getByLabel('Título').fill('Nova nota interna');
  await page.getByLabel('Texto').fill('Conteúdo de teste da publicação.');
  await page.getByRole('button', { name: 'Guardar' }).click();

  // The modal closes and the list reloads with the new publication.
  await expect(page.getByText('Nova nota interna')).toBeVisible();
});

import { test, expect, devices } from '@playwright/test';

const BASE = process.env.PWA_BASE_URL || 'http://localhost:3100';

// Android / Chrome: emulate the native install prompt via beforeinstallprompt.
test('android: shows Instalar and triggers native prompt', async ({ browser }) => {
  const context = await browser.newContext({
    ...devices['Pixel 7'],
  });
  const page = await context.newPage();
  await page.goto(`${BASE}/login`);
  // Wait for client hydration so the component's beforeinstallprompt listener
  // is attached before we dispatch the synthetic event Chrome would fire.
  await page.waitForFunction(() => (window as any).next?.router || document.readyState === 'complete');
  await page.waitForTimeout(500);

  const bar = page.getByRole('dialog', { name: 'Instalar aplicação' });

  // Fire a synthetic beforeinstallprompt the way Chrome would. Retry until the
  // listener picks it up (guards against any residual hydration race).
  await expect(async () => {
    await page.evaluate(() => {
      const e: any = new Event('beforeinstallprompt');
      (window as any).__promptCalled = false;
      e.prompt = () => { (window as any).__promptCalled = true; return Promise.resolve(); };
      e.userChoice = Promise.resolve({ outcome: 'accepted' });
      window.dispatchEvent(e);
    });
    await expect(bar).toBeVisible({ timeout: 1000 });
  }).toPass();
  await expect(page.getByRole('button', { name: 'Instalar' })).toBeVisible();

  await page.getByRole('button', { name: 'Instalar' }).click();
  const called = await page.evaluate(() => (window as any).__promptCalled);
  expect(called).toBe(true);

  await context.close();
});

// iOS Safari: no beforeinstallprompt — must still offer manual instructions.
test('ios: shows Como instalar and opens A2HS instructions', async ({ browser }) => {
  const context = await browser.newContext({
    ...devices['iPhone 13'],
  });
  const page = await context.newPage();
  await page.goto(`${BASE}/login`);

  const bar = page.getByRole('dialog', { name: 'Instalar aplicação' });
  await expect(bar).toBeVisible();
  await page.getByRole('button', { name: 'Como instalar' }).click();

  await expect(page.getByRole('heading', { name: 'Instalar no iPhone / iPad' })).toBeVisible();
  await expect(page.getByText('Adicionar ao ecrã principal')).toBeVisible();

  await context.close();
});

// Desktop: no download button at all.
test('desktop: no install bar', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${BASE}/login`);
  await page.waitForTimeout(500);
  await expect(page.getByRole('dialog', { name: 'Instalar aplicação' })).toHaveCount(0);
  await context.close();
});

// Service worker must register (installability requirement).
test('service worker registers', async ({ browser }) => {
  const context = await browser.newContext({ ...devices['Pixel 7'] });
  const page = await context.newPage();
  await page.goto(`${BASE}/login`);
  const registered = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return false;
    const reg = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((r) => setTimeout(() => r(null), 5000)),
    ]);
    return !!reg;
  });
  expect(registered).toBe(true);
  await context.close();
});

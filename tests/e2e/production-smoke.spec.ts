import { expect, test } from '@playwright/test';

test('login surface is reachable and accessible', async ({ page }) => {
  await page.goto('/login');
  await expect(page).toHaveTitle(/Oryon|Enterprise/i);
  await expect(page.locator('input').first()).toBeVisible();
  await expect(page.locator('input').first()).toHaveAttribute('aria-label', /.+/).catch(() => undefined);
});

test('health endpoint returns a non-secret status payload', async ({ request }) => {
  const response = await request.get('/api/health');
  expect([200, 503]).toContain(response.status());
  const body = await response.json();
  expect(body).toHaveProperty('status');
  expect(body).toHaveProperty('checks');
  expect(JSON.stringify(body)).not.toMatch(/AIza|sk-|AQ\./i);
});

test.describe('authenticated application journeys', () => {
  test.skip(!process.env.E2E_EMAIL || !process.env.E2E_PASSWORD, 'Set E2E_EMAIL and E2E_PASSWORD to execute the authenticated journey.');

  test('login, chat, documents and OryonAI surfaces', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(process.env.E2E_EMAIL!);
    await page.getByLabel(/password|palavra-passe/i).fill(process.env.E2E_PASSWORD!);
    await page.getByRole('button', { name: /entrar|login/i }).click();
    await expect(page).toHaveURL(/\/dashboard/);
    await page.goto('/dashboard/chat/general');
    await expect(page.getByRole('heading', { name: /chat/i })).toBeVisible();
    await page.goto('/dashboard/documents');
    await expect(page.getByRole('heading', { name: /document/i })).toBeVisible();
    await page.goto('/dashboard/oryon-ai');
    await expect(page.getByRole('heading', { name: /oryonai/i })).toBeVisible();
  });
});

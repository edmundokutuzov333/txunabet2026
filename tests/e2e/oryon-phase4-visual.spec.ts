import { expect, test, type Page } from '@playwright/test';

const routes = [
  '/login',
  '/dashboard',
  '/dashboard/inbox',
  '/dashboard/search',
  '/dashboard/tasks',
  '/dashboard/projects',
  '/dashboard/goals',
  '/dashboard/chat/general',
  '/dashboard/documents',
  '/dashboard/cloud',
  '/dashboard/forms',
  '/dashboard/workflows',
  '/dashboard/oryon-ai',
  '/dashboard/analytics',
  '/dashboard/pulse',
  '/dashboard/admin/enterprise',
  '/dashboard/settings',
] as const;

const viewports = [
  { name: 'desktop-1440', width: 1440, height: 1000 },
  { name: 'desktop-1280', width: 1280, height: 1000 },
  { name: 'laptop-1024', width: 1024, height: 900 },
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'mobile-430', width: 430, height: 932 },
] as const;

const themes = ['dark', 'light'] as const;

async function authenticate(page: Page) {
  if (!process.env.E2E_EMAIL || !process.env.E2E_PASSWORD) return false;
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(process.env.E2E_EMAIL);
  await page.getByLabel(/password|palavra-passe/i).fill(process.env.E2E_PASSWORD);
  await page.getByRole('button', { name: /entrar|login/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  return true;
}

test.describe('Oryon Phase 4 visual regression', () => {
  test.skip(!process.env.E2E_EMAIL || !process.env.E2E_PASSWORD, 'Authenticated visual regression requires E2E_EMAIL and E2E_PASSWORD.');
  test.skip(!process.env.VISUAL_REGRESSION, 'Set VISUAL_REGRESSION=1 for snapshot comparison.');
  test.setTimeout(120_000);

  for (const viewport of viewports) {
    for (const theme of themes) {
      test(`${viewport.name} / ${theme}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        const authenticated = await authenticate(page);
        expect(authenticated).toBe(true);

        for (const route of routes.filter((value) => value !== '/login')) {
          await page.addInitScript((selectedTheme) => {
            window.localStorage.setItem('theme', selectedTheme);
          }, theme);
          await page.goto(route, { waitUntil: 'domcontentloaded' });
          await expect(page.locator('body')).toBeVisible();
          await page.waitForLoadState('networkidle').catch(() => undefined);
          await expect(page).toHaveScreenshot(`${route.replace(/\//g, '_').replace(/^_/, '')}-${viewport.name}-${theme}.png`, {
            fullPage: true,
            animations: 'disabled',
            caret: 'hide',
            scale: 'css',
            maxDiffPixelRatio: 0.01,
          });
        }
      });
    }
  }
});

test.describe('Oryon Phase 4 login visual baseline', () => {
  for (const viewport of viewports) {
    for (const theme of themes) {
      test(`${viewport.name} / ${theme}`, async ({ page }) => {
        test.skip(!process.env.VISUAL_REGRESSION, 'Set VISUAL_REGRESSION=1 for snapshot comparison.');
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.addInitScript((selectedTheme) => {
          window.localStorage.setItem('theme', selectedTheme);
        }, theme);
        await page.goto('/login', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('input').first()).toBeVisible();
        await expect(page).toHaveScreenshot(`login-${viewport.name}-${theme}.png`, {
          fullPage: true,
          animations: 'disabled',
          caret: 'hide',
          scale: 'css',
          maxDiffPixelRatio: 0.01,
        });
      });
    }
  }
});

test('Oryon keyboard and reduced-motion smoke', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/login');
  await expect(page.locator('body')).toBeVisible();
  await page.keyboard.press('Tab');
  const focused = await page.evaluate(() => document.activeElement?.tagName ?? '');
  expect(focused).not.toBe('BODY');
});

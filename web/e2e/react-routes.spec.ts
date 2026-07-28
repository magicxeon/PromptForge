import { expect, test } from '@playwright/test';

const routes = [
  '/community',
  '/community/characters',
  '/studio',
  '/studio/scene',
  '/playground',
  '/history',
  '/collections',
  '/comparisons',
  '/create/fashion',
  '/credits'
] as const;

for (const path of routes) {
  test(`deep link ${path} is React-owned`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBeLessThan(400);
    expect(response?.headers()['x-mpf-frontend-runtime']).toBe('react');
    await expect(page.getByTestId('application-shell')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('body')).not.toContainText('Cannot GET');
  });
}

test('mobile shell keeps primary navigation reachable', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'), 'Mobile project only');
  await page.goto('/community');
  await page.locator('.global-header__menu').click();
  const nav = page.locator('aside nav');
  await expect(nav).toBeVisible();
  await expect(nav.locator('a[href="/studio"]')).toBeVisible();
  await expect(nav.locator('a[href="/studio?mode=character-sheet"]')).toBeVisible();
  await expect(nav.locator('a[href="/studio/scene"]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.app-sidebar')).not.toHaveClass(/is-open/);
});

test('locale and mock actor controls remain operational after React cutover', async ({ page }) => {
  await page.goto('/community');
  const language = page.locator('#react-language-select');
  await language.selectOption('en');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await language.selectOption('th');
  await expect(page.locator('html')).toHaveAttribute('lang', 'th');

  const actor = page.locator('#react-actor-select');
  if (await actor.count()) {
    const options = await actor.locator('option').evaluateAll(items =>
      items.map(item => (item as HTMLOptionElement).value)
    );
    if (options.length > 1) {
      await actor.selectOption(options[1]);
      await expect(actor).toHaveValue(options[1]);
    }
  }
});

test('legacy browser entry points are no longer web-served', async ({ request }) => {
  const [script, stylesheet] = await Promise.all([
    request.get('/app.js'),
    request.get('/style.css')
  ]);
  expect(script.status()).toBe(404);
  expect(stylesheet.status()).toBe(404);
});

test('shared application footer exposes health and package version metadata', async ({ page }) => {
  await page.goto('/community');
  await expect(page.getByTestId('system-status-footer')).toBeAttached();
  await expect(page.getByTestId('site-footer')).toHaveAttribute(
    'data-app-version',
    /^\d+\.\d+\.\d+/
  );
});

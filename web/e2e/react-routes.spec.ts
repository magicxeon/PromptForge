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

test('Studio restores visual options and progressive comparison cards', async ({ page }) => {
  await page.goto('/studio');
  await expect(page.locator('.studio-workspace')).toBeVisible();
  await expect(page.locator('.studio-viewport-grid')).toBeVisible();
  await expect(page.locator('.studio-configurator-pipeline')).toBeVisible();
  await expect(page.locator('.studio-stage-navigation')).toHaveCount(0);
  await expect(page.locator('.studio-mode-selector button')).toHaveCount(3);
  await expect(page.locator('.engine-target-panel__model-grid')).toBeVisible();
  await expect(page.locator('.engine-target-panel__output-grid')).toBeVisible();
  await expect(page.locator('.studio-prompt-preview')).toHaveCount(0);
  await expect(page.locator('.studio-generate-button')).toBeVisible();

  const faceGroup = page.locator('.studio-attribute-group').filter({
    has: page.locator('summary', { hasText: 'Face' })
  });
  await expect(faceGroup).toHaveAttribute('open', '');
  await expect(faceGroup.locator('.visual-field-control-row select').first()).toBeVisible();
  await expect(faceGroup.locator('.visual-field-lock').first()).toBeVisible();
  await expect(faceGroup.locator('.visual-image-option').first()).toBeVisible();
  expect(await faceGroup.locator('.visual-image-option').count()).toBeGreaterThanOrEqual(6);

  await page.locator('.engine-target-panel > div').first().getByRole('button').click();
  await expect(page.locator('.engine-target-panel__model-grid')).toHaveCount(0);
  await expect(page.locator('.engine-target-panel__output-grid')).toBeVisible();
  await expect(page.locator('.comparison-slot-card')).toHaveCount(2);
  await expect(page.locator('.comparison-configurator__total')).toBeVisible();

  const addModel = page.locator('.comparison-slot-add');
  await addModel.click();
  await addModel.click();
  await expect(page.locator('.comparison-slot-card')).toHaveCount(4);
  await expect(addModel).toHaveCount(0);
});

test('Studio mode control updates route, sidebar target and breadcrumb together', async ({ page }) => {
  await page.goto('/studio');
  const modes = page.locator('.studio-mode-selector button');

  await modes.nth(1).click();
  await expect(page).toHaveURL(/\/studio\?mode=character-sheet/);
  await expect(page.locator('a[href="/studio?mode=character-sheet"]')).toHaveClass(/is-active/);
  await expect(page.getByTestId('breadcrumbs')).toContainText(/Character/i);

  await page.locator('.studio-mode-selector button').nth(2).click();
  await expect(page).toHaveURL(/\/studio\/scene/);
  await expect(page.locator('a[href="/studio/scene"]')).toHaveClass(/is-active/);
  await expect(page.getByTestId('breadcrumbs')).toContainText(/Scene/i);
});

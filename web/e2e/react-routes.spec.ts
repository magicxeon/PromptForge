import { expect, test } from '@playwright/test';

const routes = [
  '/',
  '/explore/comparisons',
  '/explore/templates',
  '/explore/characters',
  '/create/studio/face',
  '/create/studio/character',
  '/create/studio/scene',
  '/create/playground',
  '/create/cinematic',
  '/create/cinematic/new',
  '/library/recent',
  '/library/collections',
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

const legacyRedirects = [
  ['/community', '/'],
  ['/community/characters', '/explore/characters'],
  ['/studio', '/create/studio/face'],
  ['/studio?mode=character-sheet', '/create/studio/character'],
  ['/studio/scene', '/create/studio/scene'],
  ['/playground', '/create/playground'],
  ['/recent-generations', '/library/recent'],
  ['/collections', '/library/collections']
] as const;

for (const [legacy, canonical] of legacyRedirects) {
  test(`legacy route ${legacy} redirects to ${canonical}`, async ({ page }) => {
    await page.goto(legacy);
    await expect(page).toHaveURL(new RegExp(`${canonical.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:[?#]|$)`));
    await expect(page.getByTestId('application-shell')).toBeVisible();
  });
}

test('mobile shell keeps primary navigation reachable', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'), 'Mobile project only');
  await page.goto('/');
  await page.locator('.global-header__menu').click();
  const nav = page.locator('aside nav');
  await expect(nav).toBeVisible();
  await expect(nav.locator('a[href="/create/studio/face#studio-configurator-title"]')).toBeVisible();
  await expect(
    nav.locator('a[href="/create/studio/character#studio-configurator-title"]')
  ).toBeVisible();
  await expect(
    nav.locator('a[href="/create/studio/scene#studio-configurator-title"]')
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.app-sidebar')).not.toHaveClass(/is-open/);
});

test('collapsed Studio icon opens Scene Builder while expanded Studio remains an accordion', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.includes('mobile'), 'Desktop project only');
  await page.goto('/');

  const expandedStudio = page.locator(
    '.sidebar-navigation__parent > button.sidebar-navigation__row'
  ).first();
  await expect(expandedStudio).toHaveAttribute(
    'aria-expanded',
    /true|false/
  );

  await page.locator('.sidebar-navigation__collapse').click();
  const collapsedStudio = page.locator(
    'a[href="/create/studio/scene#studio-configurator-title"][title]'
  );
  await expect(collapsedStudio).toBeVisible();
  await collapsedStudio.click();
  await expect(page).toHaveURL(/\/create\/studio\/scene#studio-configurator-title$/);
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
  await page.goto('/create/studio/face');
  await expect(page.locator('.studio-workspace')).toBeVisible();
  await expect(page.locator('.studio-viewport-grid')).toBeVisible();
  await expect(page.locator('.studio-configurator-pipeline')).toBeVisible();
  await expect(page.locator('.studio-stage-navigation')).toHaveCount(0);
  await expect(page.locator('.studio-mode-selector button')).toHaveCount(3);
  await expect(page.locator('.engine-target-panel__model-grid')).toBeVisible();
  await expect(page.locator('.engine-target-panel__output-grid')).toBeVisible();
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

test('Studio comparison hides browsing regions and keeps focus on comparison results', async ({
  page
}, testInfo) => {
  test.skip(testInfo.project.name.includes('mobile'), 'Desktop comparison assertion');
  await page.goto('/create/studio/scene');
  await expect(page.locator('.studio-history-region')).toBeVisible();
  await expect(page.locator('.studio-shared-templates')).toBeVisible();
  await page.locator('.engine-comparison-toggle').click();
  await expect(page.locator('.studio-viewport-grid')).toHaveClass(/is-comparison/);
  await expect(page.locator('.studio-history-region')).toHaveCount(0);
  await expect(page.locator('.studio-shared-templates')).toHaveCount(0);

  await page.locator('.engine-comparison-toggle').click();
  await expect(page.locator('.studio-viewport-grid')).not.toHaveClass(/is-comparison/);
  await expect(page.locator('.studio-history-region')).toBeVisible();
  await expect(page.locator('.studio-shared-templates')).toBeVisible();
});

test('Studio mode control updates route, sidebar target and breadcrumb together', async ({ page }) => {
  await page.goto('/create/studio/face');
  const modes = page.locator('.studio-mode-selector button');

  await modes.nth(1).click();
  await expect(page).toHaveURL(/\/create\/studio\/character/);
  await expect(
    page.locator('a[href="/create/studio/character#studio-configurator-title"]')
  ).toHaveClass(/is-active/);
  await expect(page.getByTestId('breadcrumbs')).toContainText(/Character/i);
  await expect(page.locator('.engine-comparison-toggle')).toBeVisible();

  await page.locator('.studio-mode-selector button').nth(2).click();
  await expect(page).toHaveURL(/\/create\/studio\/scene/);
  await expect(
    page.locator('a[href="/create/studio/scene#studio-configurator-title"]')
  ).toHaveClass(/is-active/);
  await expect(page.getByTestId('breadcrumbs')).toContainText(/Scene/i);
  await expect(page.locator('.engine-comparison-toggle')).toBeVisible();
});

test('Scene Simple Shot Recipes are visual, selectable and viewport-safe', async ({ page }) => {
  await page.goto('/create/studio/scene');
  const controls = page.locator('.scene-pose-controls');
  const recipes = controls.locator('.scene-pose-recipe');

  await expect(controls).toBeVisible();
  await expect(recipes).toHaveCount(8);
  await expect(recipes.locator('img')).toHaveCount(8);
  await expect.poll(async () => recipes.locator('img').evaluateAll(images =>
    images.every(image => (image as HTMLImageElement).complete
      && (image as HTMLImageElement).naturalWidth > 0)
  )).toBe(true);

  await recipes.nth(1).click();
  await expect(recipes.nth(1)).toHaveAttribute('aria-pressed', 'true');

  const overflow = await controls.evaluate(element => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth
  }));
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
});

import { expect, test } from '@playwright/test';

test('Creator Profile keeps its presentation theme scoped and responsive', async ({ page }) => {
  await page.goto('/profiles/creator_user_demo');

  const profile = page.locator('.creator-profile');
  const canvas = page.locator('.creator-profile__canvas');
  await expect(profile).toBeVisible();
  await expect(canvas).toHaveAttribute('data-profile-theme', /^(default|fashion|creative)$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('navigation', { name: /profile|โปรไฟล์/i })).toBeVisible();

  const viewerTheme = await page.locator('html').getAttribute('data-theme');
  await canvas.evaluate(element => element.setAttribute('data-profile-theme', 'fashion'));
  await expect(canvas).toHaveCSS('background-color', 'rgb(244, 245, 247)');
  await expect(canvas).toHaveCSS('color', 'rgb(23, 25, 34)');
  expect(await page.locator('html').getAttribute('data-theme')).toBe(viewerTheme);

  await canvas.evaluate(element => element.setAttribute('data-profile-theme', 'creative'));
  await expect(canvas).toHaveCSS('background-color', 'rgb(9, 2, 4)');
  expect(await page.locator('html').getAttribute('data-theme')).toBe(viewerTheme);

  const viewportWidth = await page.evaluate(() => document.documentElement.clientWidth);
  const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(pageWidth).toBeLessThanOrEqual(viewportWidth + 1);
});

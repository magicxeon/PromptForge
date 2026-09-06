import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import { installTemplateDetailLayoutFixture } from '../test/fixtures/templateDetailLayoutFixture.mjs';

const locale = process.argv.find(arg => arg.startsWith('--locale='))?.slice(9) || 'en';
if (!['en', 'th'].includes(locale)) throw new Error('Use --locale=en|th');
const origin = 'http://localhost:6500';
const output = await fs.mkdtemp(path.join(os.tmpdir(), 'template-detail-layout-'));
const browser = await chromium.launch({ headless: true });
const passed = [];
try {
  const context = await browser.newContext();
  await context.addInitScript(value => localStorage.setItem('model_prompt_forge_language', value), locale);
  const blocked = await installTemplateDetailLayoutFixture(context, origin);
  const page = await context.newPage();
  page.setDefaultTimeout(15_000);
  page.setDefaultNavigationTimeout(15_000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const width of [390, 820, 1440]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    for (const theme of ['default', 'fashion', 'creative']) {
      console.log(`[Template layout] ${width}/${theme}`);
      await page.goto(`${origin}/explore/templates/template-original`);
      await page.locator('.template-detail-creations__grid article').first().waitFor();
      await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
      await page.evaluate(() => document.querySelectorAll('.template-detail-page img').forEach(img => { img.loading = 'eager'; }));
      await page.waitForFunction(() => Array.from(document.querySelectorAll('.template-detail-page img')).every(img => img.complete));
      await page.waitForTimeout(100);
      const geometry = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
        broken: Array.from(document.querySelectorAll('.template-detail-page img')).some(img => !img.naturalWidth),
        fit: getComputedStyle(document.querySelector('.template-detail-source__media img')).objectFit,
        creatorReadable: getComputedStyle(document.querySelector('.template-detail-source__copy strong')).color === getComputedStyle(document.querySelector('#template-detail-title')).color,
        imageContained: document.querySelector('.template-detail-source__media img').getBoundingClientRect().height <= document.querySelector('.template-detail-source__media').getBoundingClientRect().height + 1,
        overlap: (() => { const image = document.querySelector('.template-detail-source__media').getBoundingClientRect(); const copy = document.querySelector('.template-detail-source__copy').getBoundingClientRect(); return image.right > copy.left && image.bottom > copy.top && copy.bottom > image.top; })()
      }));
      assert.deepEqual(geometry, { overflow: false, broken: false, fit: 'contain', creatorReadable: true, imageContained: true, overlap: false }, `${width}/${theme} detail geometry`);
      assert.equal(await page.locator('.template-detail-creations__grid article').count(), 12);
      await page.screenshot({ path: path.join(output, `detail-${width}-${theme}.png`), fullPage: true });
      await page.screenshot({ path: path.join(output, `detail-${width}-${theme}-fold.png`) });
      await page.locator('.discovery-load-more button').click();
      await page.waitForFunction(() => document.querySelectorAll('.template-detail-creations__grid article').length === 14);
      await page.locator('.template-detail-creations .discovery-segmented-control button').last().click();
      await page.waitForFunction(() => document.querySelector('.template-detail-creations__grid h2')?.textContent === 'Community variation 14');

      await page.goto(`${origin}/posts/template-original`);
      await page.locator('.template-creations-preview__grid a').first().waitFor();
      await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
      await page.evaluate(() => document.querySelectorAll('.community-post-page img').forEach(img => { img.loading = 'eager'; }));
      await page.waitForFunction(() => Array.from(document.querySelectorAll('.community-post-page img')).every(img => img.complete));
      assert.equal(await page.locator('.template-creations-preview__grid > a').count(), 4);
      const postLayout = await page.evaluate(() => {
        const preview = document.querySelector('.template-creations-preview').getBoundingClientRect();
        const comments = document.querySelector('.community-post-comments-panel').getBoundingClientRect();
        return { overflow: document.documentElement.scrollWidth > innerWidth + 1, beforeComments: preview.bottom <= comments.top, comments: Boolean(document.querySelector('.community-comment-thread')), nested: document.querySelectorAll('.template-creations-preview a button').length };
      });
      assert.equal(postLayout.overflow, false);
      if (width <= 1100) assert.equal(postLayout.beforeComments, true, 'Preview must precede comments on mobile/tablet.');
      assert.equal(postLayout.nested, 0);
      assert.equal(await page.locator('.community-post-comments-panel').count(), 1);
      assert.equal(await page.locator('.community-more-from-creator').count(), 1);
      await page.screenshot({ path: path.join(output, `post-${width}-${theme}.png`), fullPage: true });
      await page.locator('.template-creations-preview').screenshot({ path: path.join(output, `preview-${width}-${theme}.png`) });
      await page.locator('.template-creations-preview header a').click();
      await page.waitForURL('**/explore/templates/template-original');
      await page.locator('.template-detail-creations__grid article a').first().click();
      await page.waitForURL('**/posts/template-work-*');
      await page.locator('.template-creations-preview__origin').waitFor();
      assert.equal(await page.locator('.template-creations-preview__origin').getAttribute('href'), '/explore/templates/template-original');
      passed.push(`${width}/${theme}`);
    }
  }
  await page.goto(`${origin}/explore/templates`);
  await page.locator('.template-discovery-card').first().waitFor();
  assert.equal(await page.locator('.template-feature__detail-link').getAttribute('href'), '/explore/templates/template-original');
  await page.locator('.template-discovery-card__media').first().click();
  await page.waitForURL('**/explore/templates/template-original');
  await page.reload();
  await page.locator('#template-detail-title').waitFor();
  await page.goto(`${origin}/posts/ordinary-image`);
  await page.locator('.community-post-information-panel h1').waitFor();
  await page.waitForTimeout(350);
  assert.equal(await page.locator('.template-creations-preview').count(), 0);
  assert.equal(await page.locator('.community-post-comments-panel').count(), 1);
  assert.deepEqual(errors, []);
  assert.deepEqual(blocked, []);
  console.log(JSON.stringify({ status: 'PASS', locale, dataSource: 'isolated fixture, no backend/provider or live mutations', passed, screenshots: output }, null, 2));
} finally {
  await browser.close();
}

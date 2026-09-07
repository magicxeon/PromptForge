import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import { installTemplateSceneLayoutFixture, templateSceneHandoff } from '../test/fixtures/templateSceneLayoutFixture.mjs';

const locale = process.argv.find(value => value.startsWith('--locale='))?.slice(9) || 'en';
if (!['en', 'th'].includes(locale)) throw new Error('Use --locale=en|th');
const browser = await chromium.launch({ headless: true });
const output = await fs.mkdtemp(path.join(os.tmpdir(), 'template-scene-layout-'));
const origin = 'http://localhost:6500';
try {
  const context = await browser.newContext();
  await context.addInitScript(({ payload, locale }) => {
    localStorage.setItem('model_prompt_forge_language', locale);
    localStorage.setItem('mpf_active_mock_user_id', 'usr_demo');
    sessionStorage.setItem('mpf.react.handoff:scene-template', JSON.stringify({ schemaVersion: 1, actorId: 'usr_demo', kind: 'scene-template', createdAt: new Date().toISOString(), expiresAt: '2099-01-01T00:00:00Z', payload }));
  }, { payload: templateSceneHandoff, locale });
  const { blocked, drafts } = await installTemplateSceneLayoutFixture(context, origin);
  const page = await context.newPage(); page.setDefaultTimeout(12000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  for (const width of [390, 820, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const theme of ['default', 'fashion', 'creative']) {
      console.log(`[Template Scene] ${locale}/${width}/${theme}`);
      await page.goto(`${origin}/create/studio/scene`);
      await page.locator('.template-scene-panel__preview img').waitFor();
      await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
      await page.waitForFunction(() => document.querySelector('.template-scene-panel__preview img')?.naturalWidth > 0);
      assert.equal(await page.locator('.studio-scene-authoring').count(), 0);
      assert.equal(await page.locator('.studio-shared-templates').count(), 0);
      assert.equal(await page.evaluate(() => document.querySelector('.studio-configurator-panel').getBoundingClientRect().top < document.querySelector('.studio-viewport-panel').getBoundingClientRect().top), true);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      if (width === 390) {
        assert.equal(await page.evaluate(() => {
          const actions = document.querySelector('.studio-panel-heading__actions').getBoundingClientRect();
          const title = document.querySelector('.studio-viewport-panel .studio-panel-heading__title').getBoundingClientRect();
          const slot = document.querySelector('.reference-slot').getBoundingClientRect();
          const grid = document.querySelector('.reference-slot-grid__items').getBoundingClientRect();
          return actions.top >= title.bottom && Math.abs(slot.width - grid.width) < 2;
        }), true, 'Mobile Template actions and reference slots must have readable full-width rows');
      }
      await page.screenshot({ path: path.join(output, `scene-${width}-${theme}.png`), fullPage: true });
      await page.locator('.template-scene-panel__character > button').click();
      await page.locator('.character-picker__grid button').first().waitFor();
      await page.locator('.character-picker__toolbar input').fill('Nara 28');
      await page.locator('.character-picker__body > section:last-child').getByRole('button', { name: 'Nara 28', exact: true }).click();
      await page.waitForFunction(() => document.querySelector('.character-picker__body > section:first-child img')?.naturalWidth > 0 && !document.querySelector('.character-picker > footer > button').disabled);
      await page.screenshot({ path: path.join(output, `picker-${width}-${theme}.png`) });
      assert.equal(await page.evaluate(() => { const rect = document.querySelector('.character-picker').getBoundingClientRect(); return rect.left >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight; }), true);
      await page.locator('.character-picker > footer > button').click();
      await page.locator('.template-scene-panel__selected').waitFor();
      await page.waitForTimeout(400);
      assert.equal(await page.locator('.template-scene-panel__selected strong').textContent(), 'Nara 28');
      await page.locator('.reference-slot__preview img[alt*="Nara 28"]').waitFor();
      assert.equal(await page.locator('.template-scene-panel__selected img').evaluate(el => getComputedStyle(el).objectPosition), '50% 50%');
      await page.screenshot({ path: path.join(output, `selected-${width}-${theme}.png`), fullPage: true });
      await page.locator('.template-scene-panel__character > button').click();
      await page.locator('.character-picker').waitFor();
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('.character-picker'));
      await page.locator('.template-scene-panel__preview').click();
      await page.locator('.template-scene-image-dialog img').waitFor();
      await page.keyboard.press('Escape');
    }
  }
  assert.ok(drafts.length, 'Fixture must observe the existing estimate path');
  assert.ok(drafts.some(draft => JSON.stringify(draft).includes('character-27')), 'Authorized Character context must reach the existing estimate path');
  assert.ok(drafts.every(draft => !JSON.stringify(draft).includes('street-walk-editorial')), 'Template and Character display artwork must never be submitted as references');
  assert.deepEqual(errors, []); assert.deepEqual(blocked, []);
  console.log(JSON.stringify({ status: 'PASS', locale, screenshots: output, cases: 9, liveMutations: false }, null, 2));
} finally { await browser.close(); }

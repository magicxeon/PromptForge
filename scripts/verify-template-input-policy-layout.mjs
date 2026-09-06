import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import { installTemplateInputPolicyLayoutFixture } from '../test/fixtures/templateInputPolicyLayoutFixture.mjs';

const locale = process.argv.find(arg => arg.startsWith('--locale='))?.slice(9) || 'en';
if (!['en', 'th'].includes(locale)) throw new Error('Use --locale=en|th');
const output = await fs.mkdtemp(path.join(os.tmpdir(), 'template-input-policy-layout-'));
const origin = 'http://localhost:6500';
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext();
  await context.addInitScript(value => localStorage.setItem('model_prompt_forge_language', value), locale);
  const { blocked, writes } = await installTemplateInputPolicyLayoutFixture(context, origin);
  const page = await context.newPage(); page.setDefaultTimeout(12000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  for (const width of [390, 820, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const theme of ['default', 'fashion', 'creative']) {
      console.log(`[Template policy] ${locale}/${width}/${theme}`);
      await page.goto(`${origin}/posts/template-original`);
      await page.locator('.community-post-information-panel__actions button').first().click();
      await page.locator('.template-input-policy input').first().waitFor();
      await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
      const edit = page.locator('.template-management-dialog');
      assert.equal(await edit.locator('.template-input-policy input[type="checkbox"]').count(), 2);
      assert.equal(await edit.locator('.template-input-policy input').first().isChecked(), false);
      await edit.locator('.template-input-policy input').first().check();
      await edit.locator('.template-input-policy').scrollIntoViewIfNeeded();
      await verifyBounds(page, '.template-management-dialog');
      await page.screenshot({ path: path.join(output, `edit-${width}-${theme}.png`) });
      await edit.locator('button[type="submit"]').click();
      await edit.waitFor({ state: 'hidden' });
      assert.deepEqual(writes.at(-1).templateInputOptions, { characterEnabled: true, outfitBackEnabled: true });
      assert.equal(writes.at(-1).expectedTemplateVersionId, 'v1');

      await page.goto(`${origin}/library/recent`);
      await page.locator('.studio-recent__item').first().click();
      await page.locator('.generation-viewer').getByRole('button', { name: locale === 'th' ? 'แชร์' : 'Share', exact: true }).click();
      const create = page.locator('.share-generated-dialog');
      await create.locator('input[name="publishAsTemplate"]').check();
      await create.locator('.template-input-policy').waitFor();
      await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
      assert.equal(await create.locator('.template-input-policy input').count(), 2);
      assert.equal(await create.locator('.template-input-policy input').first().isChecked(), true);
      await create.locator('.template-input-policy input').first().uncheck();
      await create.locator('.template-input-policy').scrollIntoViewIfNeeded();
      await verifyBounds(page, '.share-generated-dialog');
      await page.screenshot({ path: path.join(output, `create-${width}-${theme}.png`) });
      await page.keyboard.press('Escape');
      await create.waitFor({ state: 'hidden' });
    }
  }
  assert.deepEqual(errors, []); assert.deepEqual(blocked, []);
  console.log(JSON.stringify({ status: 'PASS', locale, cases: 18, screenshots: output, liveMutations: false }));
} finally { await browser.close(); }

async function verifyBounds(page, selector) {
  assert.equal(await page.evaluate(selector => {
    const modal = document.querySelector(selector); const rect = modal.getBoundingClientRect();
    const footer = modal.querySelector('footer').getBoundingClientRect();
    return rect.left >= 0 && rect.right <= innerWidth + 1 && rect.bottom <= innerHeight + 1
      && modal.scrollWidth <= modal.clientWidth + 1 && footer.bottom <= rect.bottom + 1
      && [...modal.querySelectorAll('footer button')].every(button => {
        const box = button.getBoundingClientRect();
        return box.bottom <= rect.bottom + 1 && box.left >= rect.left && box.right <= rect.right + 1;
      });
  }, selector), true, `${selector} viewport bounds`);
}

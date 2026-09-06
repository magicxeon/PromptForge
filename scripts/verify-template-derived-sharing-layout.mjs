import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import { installTemplateInputPolicyLayoutFixture } from '../test/fixtures/templateInputPolicyLayoutFixture.mjs';

const output = await fs.mkdtemp(path.join(os.tmpdir(), 'derived-sharing-layout-'));
const origin = 'http://localhost:6500';
const browser = await chromium.launch({ headless: true });
let cases = 0;
try {
  for (const locale of ['en', 'th']) {
    const context = await browser.newContext();
    await context.addInitScript(value => localStorage.setItem('model_prompt_forge_language', value), locale);
    const { blocked } = await installTemplateInputPolicyLayoutFixture(context, origin);
    let shared = false;
    const writes = [];
    await context.route('**/api/**', route => {
      const p = new URL(route.request().url()).pathname;
      if (p === '/api/community/generations/job-policy/share-status') return route.fulfill({ json: { shared } });
      if (p === '/api/community/share-drafts') return route.fulfill({ json: {
        id: 'derived', sourceGenerationId: 'job-policy', templateEligible: false,
        templateIneligibleReason: 'template_derived_generation', promptVisibility: 'private', allowedPromptVisibilities: ['private']
      } });
      if (p === '/api/community/share-drafts/derived/publish') {
        writes.push(route.request().postDataJSON()); shared = true;
        return route.fulfill({ json: { id: 'fixture-published', postType: 'image' } });
      }
      return route.fallback();
    });
    const page = await context.newPage(); page.setDefaultTimeout(15000);
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    const shareName = locale === 'th' ? 'แชร์' : 'Share';
    const sharedName = locale === 'th' ? 'แชร์แล้ว' : 'Shared';
    for (const width of [390, 820, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const theme of ['default', 'fashion', 'creative']) {
        console.log(`[Derived sharing] ${locale}/${width}/${theme}`);
        shared = false;
        await page.goto(`${origin}/library/recent`);
        await page.locator('.studio-recent__item').first().click();
        await page.locator('.generation-viewer').getByRole('button', { name: shareName, exact: true }).click();
        const modal = page.locator('.share-generated-dialog');
        await modal.locator('input[name="title"]').fill(locale === 'th' ? 'ผลงานจาก Template' : 'Created with a Template');
        assert.equal(await modal.locator('[name="promptVisibility"], [name="publishAsTemplate"], .template-input-policy').count(), 0);
        await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
        assert.equal(await modal.evaluate(element => {
          const rect = element.getBoundingClientRect(); const footer = element.querySelector('footer').getBoundingClientRect();
          return rect.left >= 0 && rect.right <= innerWidth + 1 && rect.bottom <= innerHeight + 1
            && footer.bottom <= rect.bottom + 1 && element.scrollWidth <= element.clientWidth + 1;
        }), true);
        await page.screenshot({ path: path.join(output, `${locale}-${width}-${theme}.png`) });
        await modal.locator('button[type="submit"]').click(); await modal.waitFor({ state: 'hidden' });
        assert.equal(writes.at(-1).promptVisibility, 'private'); assert.equal(writes.at(-1).publishAsTemplate, false);
        assert.equal(await page.locator('.generation-viewer').getByRole('button', { name: sharedName, exact: true }).isDisabled(), true);
        await page.reload(); await page.locator('.studio-recent__item').first().click();
        const button = page.locator('.generation-viewer').getByRole('button', { name: sharedName, exact: true });
        await button.waitFor(); assert.equal(await button.isDisabled(), true);
        cases++;
      }
    }
    assert.deepEqual(errors, []); assert.deepEqual(blocked, []);
    await context.close();
  }
  console.log(JSON.stringify({ status: 'PASS', cases, screenshots: output, liveMutations: false }));
} finally { await browser.close(); }

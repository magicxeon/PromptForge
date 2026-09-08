import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import { installTemplateInputPolicyLayoutFixture, policyFixture } from '../test/fixtures/templateInputPolicyLayoutFixture.mjs';

const output = await fs.mkdtemp(path.join(os.tmpdir(), 'private-sharing-layout-'));
const origin = 'http://localhost:6500';
const browser = await chromium.launch({ headless: true });
let cases = 0;
try {
  for (const locale of ['en', 'th']) {
    const catalog = JSON.parse(await fs.readFile(new URL(`../client/i18n/locales/${locale}/react-ui.json`, import.meta.url), 'utf8'));
    const context = await browser.newContext();
    await context.addInitScript(value => localStorage.setItem('model_prompt_forge_language', value), locale);
    const { blocked } = await installTemplateInputPolicyLayoutFixture(context, origin);
    let shared = false;
    const writes = [];
    await context.route('**/api/**', route => {
      const p = new URL(route.request().url()).pathname;
      if (p === '/api/community/generations/job-policy/share-status') return route.fulfill({ json: { shared } });
      if (p === '/api/community/share-drafts') return route.fulfill({ json: {
        id: 'private-draft', sourceGenerationId: 'job-policy', templateEligible: true,
        promptVisibility: 'private', templateInputPolicy: policyFixture,
        allowedTemplatePromptVisibilities: ['full', 'remix_only']
      } });
      if (p === '/api/community/share-drafts/private-draft/publish') {
        writes.push(route.request().postDataJSON()); shared = true;
        return route.fulfill({ json: { id: 'fixture-published', postType: 'image' } });
      }
      return route.fallback();
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const width of [390, 820, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const theme of ['default', 'fashion', 'creative']) {
        console.log(`[Private sharing] ${locale}/${width}/${theme}`);
        shared = false;
        await page.goto(`${origin}/library/recent`);
        await page.locator('.studio-recent__item').first().click();
        await page.locator('.generation-viewer').getByRole('button', { name: catalog['ui.action.share'], exact: true }).click();
        const modal = page.locator('.share-generated-dialog');
        const policy = modal.locator('[name="promptVisibility"]');
        await modal.locator('[name="title"]').fill('Private publication fixture');
        assert.equal(await policy.inputValue(), 'private');
        await modal.locator('[name="publishAsTemplate"]').check();
        assert.equal(await policy.inputValue(), 'private');
        assert.equal(await modal.locator('button[type="submit"]').isDisabled(), true);
        assert.equal(await modal.getByRole('alert').innerText(), catalog['ui.share.templatePromptPolicyRequired']);
        await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
        assert.equal(await modal.evaluate(element => {
          const rect = element.getBoundingClientRect();
          const footer = element.querySelector('footer').getBoundingClientRect();
          return rect.left >= 0 && rect.right <= innerWidth + 1 && rect.bottom <= innerHeight + 1
            && element.scrollWidth <= element.clientWidth + 1 && footer.bottom <= rect.bottom + 1;
        }), true);
        await page.screenshot({ path: path.join(output, `${locale}-${width}-${theme}.png`) });
        await policy.selectOption('remix_only');
        assert.equal(await modal.locator('button[type="submit"]').isEnabled(), true);
        await policy.selectOption('private');
        await modal.locator('[name="publishAsTemplate"]').uncheck();
        await modal.locator('button[type="submit"]').click();
        await modal.waitFor({ state: 'hidden' });
        assert.equal(writes.at(-1).promptVisibility, 'private');
        assert.equal(writes.at(-1).publishAsTemplate, false);
        assert.equal(writes.at(-1).visibility, 'public');
        cases++;
      }
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(blocked, []);
    await context.close();
  }
  console.log(JSON.stringify({ status: 'PASS', cases, screenshots: output, liveMutations: false }));
} finally { await browser.close(); }

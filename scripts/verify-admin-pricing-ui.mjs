import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../', import.meta.url));
const base = new URL(process.argv[2] || 'http://127.0.0.1:5188');
assert.ok(['127.0.0.1', 'localhost'].includes(base.hostname), 'Use an isolated local Vite preview.');
const outputDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'mpf-admin-pricing-visual-'));
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const locale of ['en', 'th']) {
    const catalog = JSON.parse(await fs.readFile(path.join(root, `client/i18n/locales/${locale}/admin.json`), 'utf8'));
    for (const width of [390, 820, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
      await context.addInitScript(language => localStorage.setItem('model_prompt_forge_language', language), locale);
      const page = await context.newPage();
      page.setDefaultTimeout(10000);
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const state = { activeRevisionIds: {}, revisions: [], activePricing: {
        pricingPolicyVersion: 'ai-credit-activation-2026-10-02-v1', revisionId: null,
        profitMarkupPercentByMedia: { text: 30, image: 30, video: 30 }
      } };
      let draftBody;
      let publicationBody;
      await page.route('**/i18n/locales/**', async route => {
        const match = new URL(route.request().url()).pathname.match(/^\/i18n\/locales\/(en|th)\/([a-z-]+)\.json$/);
        if (!match) return route.abort();
        await route.fulfill({ contentType: 'application/json', body: await fs.readFile(path.join(root, `client/i18n/locales/${match[1]}/${match[2]}.json`), 'utf8') });
      });
      // All API requests terminate here; no backend or provider request can escape.
      await page.route(`${base.origin}/api/**`, async route => {
        const request = route.request();
        const pathname = new URL(request.url()).pathname;
        let body = {};
        if (pathname === '/api/me') body = { userId: 'usr_fixture_admin', username: 'fixture_admin', displayName: 'Admin fixture', role: 'admin' };
        else if (pathname === '/api/mock-users') body = { enabled: false, users: [] };
        else if (pathname === '/api/community/features') body = { schemaVersion: 1, community: {}, development: {}, routing: {} };
        else if (pathname === '/api/credits/account') body = { account: { availableCredits: 1000, reservedCredits: 0 } };
        else if (pathname === '/api/health') body = { status: 'ok', time: new Date().toISOString() };
        else if (pathname === '/api/admin/capabilities') body = { generatedAt: new Date().toISOString(), environment: 'development', capabilities: Object.fromEntries(
          ['runtimeConfigurationDrafts', 'runtimeConfigurationPublish'].map(id => [id, { id, enabled: true, mode: 'explicit_override', env: 'FIXTURE_ONLY', prerequisites: [], reason: null }])) };
        else if (pathname === '/api/admin/provider-health') body = { checkedAt: new Date().toISOString(), schemaVersion: 1, defaultProvider: null, note: '', providers: [] };
        else if (pathname === '/api/admin/credit-reconciliation') body = { generatedAt: new Date().toISOString(), counts: {}, reservations: [], mutationAvailable: false };
        else if (pathname === '/api/admin/configuration/revisions' && request.method() === 'GET') body = state;
        else if (pathname === '/api/admin/configuration/revisions' && request.method() === 'POST') {
          draftBody = request.postDataJSON();
          assert.equal(draftBody.scope, 'pricing');
          body = { id: 'cfgrev_visual_fixture_long_identifier_20261002', scope: 'pricing', status: 'draft', version: 1,
            values: draftBody.values, createdAt: new Date().toISOString(), createdByUserId: 'usr_fixture_admin', validation: {}, publishedAt: null };
          state.revisions.push(body);
        } else if (pathname.endsWith('/publications')) {
          publicationBody = request.postDataJSON();
          assert.equal(publicationBody.expectedVersion, 1);
          assert.equal(publicationBody.baseActiveRevisionId, null);
          const draft = state.revisions[0];
          draft.status = 'active'; draft.version = 2;
          draft.publishedAt = new Date().toISOString();
          state.activeRevisionIds.pricing = draft.id;
          state.activePricing.revisionId = draft.id;
          state.activePricing.profitMarkupPercentByMedia = draft.values.profitMarkupPercentByMedia;
          body = draft;
        } else assert.equal(request.method(), 'GET', 'Unexpected command must never reach the backend.');
        await route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
      });
      await page.goto(new URL('/admin/control-plane', base).href);
      try {
        await page.getByRole('button', { name: catalog['admin.control.tab.configuration'], exact: true }).click();
      } catch (error) {
        console.error(await page.locator('body').innerText(), errors);
        await page.screenshot({ path: path.join(outputDirectory, 'bootstrap-failure.png'), fullPage: true });
        console.error(outputDirectory);
        throw error;
      }
      await page.getByLabel(catalog['admin.pricing.scope']).selectOption('pricing');
      const pricing = page.getByRole('region', { name: catalog['admin.pricing.title'], exact: true });
      await pricing.getByRole('spinbutton').first().waitFor();
      await pricing.getByRole('spinbutton').first().fill('20');
      await pricing.getByRole('spinbutton').last().fill('40');
      await pricing.getByLabel(catalog['admin.providers.reason']).fill('Reviewed category markup');
      await pricing.getByRole('button', { name: catalog['admin.control.saveDraft'], exact: true }).click();
      await pricing.getByText(catalog['admin.pricing.saved'], { exact: true }).waitFor();
      assert.deepEqual(state.activePricing.profitMarkupPercentByMedia, { text: 30, image: 30, video: 30 });
      for (const control of await pricing.getByRole('spinbutton').all()) {
        const box = await control.boundingBox();
        assert.ok(box && box.x >= 0 && box.x + box.width <= width + 1, 'Markup input must fit the viewport.');
      }
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Page must not overflow horizontally.');
      await pricing.screenshot({ path: path.join(outputDirectory, `${locale}-${width}-editor.png`) });
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: path.join(outputDirectory, `${locale}-${width}-page.png`), fullPage: true });
      await pricing.getByRole('button', { name: catalog['admin.pricing.publish'], exact: true }).click();
      const dialog = page.getByRole('alertdialog');
      await dialog.waitFor();
      const dialogBox = await dialog.boundingBox();
      assert.ok(dialogBox && dialogBox.x >= 0 && dialogBox.x + dialogBox.width <= width + 1);
      await dialog.screenshot({ path: path.join(outputDirectory, `${locale}-${width}-confirmation.png`) });
      await dialog.getByRole('button', { name: catalog['admin.pricing.publish'], exact: true }).click();
      await pricing.getByText(catalog['admin.pricing.published'], { exact: true }).waitFor();
      await pricing.getByText('20%', { exact: true }).waitFor();
      assert.deepEqual(state.activePricing.profitMarkupPercentByMedia, { text: 20, image: 30, video: 40 });
      assert.ok(publicationBody.commandId.startsWith('pricing_publish_'));
      assert.deepEqual(errors, []);
      results.push({ locale, width, status: 'passed' });
      await context.close();
    }
  }
  console.log(JSON.stringify({ results, outputDirectory, backendMutations: 0 }, null, 2));
} finally {
  await browser.close();
}

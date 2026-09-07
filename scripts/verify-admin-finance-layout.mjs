import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import ExcelJS from 'exceljs';
import { FinanceApplicationService } from '../server/domain/finance/FinanceApplicationService.js';
import { AdminConfigurationService } from '../server/domain/admin-configuration/AdminConfigurationService.js';
import { AdminConfigurationRepository } from '../server/repositories/admin-configuration/AdminConfigurationRepository.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const origin = process.env.FINANCE_LAYOUT_ORIGIN || 'http://127.0.0.1:5173';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname));
const output = await fs.mkdtemp(path.join(os.tmpdir(), 'mpf-finance-layout-'));
const actor = { userId: 'usr_admin', username: 'layout_admin', displayName: 'Finance review', role: 'admin' };
const configuration = new AdminConfigurationService({
  repository: new AdminConfigurationRepository({ revisionsFile: path.join(output, 'isolated-drafts.json') }),
  featurePolicy: { assertEnabled() {} }, audit: { record() {} }
});
const finance = new FinanceApplicationService({ configuration });
const api = {
  '/api/me': actor, '/api/mock-users': { enabled: false, users: [] },
  '/api/community/features': { community: { enabled: true, exploreEnabled: true, galleryEnabled: true, characterProfilesEnabled: true, creatorProfilesEnabled: true }, development: {}, routing: {}, cinematic: { enabled: true } },
  '/api/community/creator-profiles/me': { id: 'fixture-admin', handle: 'layout_admin', displayName: 'Finance review' },
  '/api/credits/account': { account: { availableCredits: 0, reservedCredits: 0 } },
  '/api/health': { status: 'ok', time: new Date().toISOString() },
  '/api/generation/job-center': { items: [], activeCount: 0, terminalCount: 0, polledAt: new Date().toISOString() }
};
const browser = await chromium.launch({ headless: true });
const results = [];
const unexpected = [];
const exportOnly = process.argv.includes('--export-only');
try {
  for (const locale of ['en', 'th']) {
    let lastReport;
    const context = await browser.newContext();
    await context.addInitScript(value => { localStorage.setItem('model_prompt_forge_language', value); localStorage.setItem('mpf_active_mock_user_id', 'usr_admin'); }, locale);
    await context.route('**/*', async route => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.origin !== new URL(origin).origin) { unexpected.push(url.origin); return route.abort(); }
      try {
        if (url.pathname.startsWith('/api/admin/finance/')) {
          let payload;
          if (url.pathname.endsWith('/inventory') && request.method() === 'GET') payload = await finance.inventory(actor);
          else if (url.pathname.endsWith('/report') && request.method() === 'GET') {
            payload = await finance.report(Object.fromEntries(url.searchParams), actor);
            lastReport = payload;
          }
          else if (url.pathname.endsWith('/drafts') && request.method() === 'GET') payload = await finance.drafts(actor);
          else if (url.pathname.endsWith('/drafts') && request.method() === 'POST') payload = await finance.createDraft(request.postDataJSON(), actor);
          else throw new Error('Unexpected Finance command');
          return route.fulfill({ json: payload });
        }
        if (request.method() !== 'GET') { unexpected.push(`${request.method()} ${url.pathname}`); return route.abort(); }
        if (api[url.pathname]) return route.fulfill({ json: api[url.pathname] });
        if (url.pathname.startsWith('/api/')) { unexpected.push(url.pathname); return route.fulfill({ status: 404, json: { error: { code: 'fixture_unmapped', message: 'Unmapped fixture' } } }); }
        if (url.pathname.startsWith('/i18n/') || url.pathname.startsWith('/assets/')) {
          const base = path.join(root, 'client');
          const file = path.resolve(base, decodeURIComponent(url.pathname.slice(1)));
          assert.ok(file.startsWith(`${base}${path.sep}`));
          const contentType = ({ '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg' })[path.extname(file)] || 'application/octet-stream';
          return route.fulfill({ body: await fs.readFile(file), contentType });
        }
        return route.continue();
      } catch (error) { return route.fulfill({ status: error.statusCode || 500, json: { error: { code: error.code || 'fixture_error', message: error.message } } }); }
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${origin}/admin/finance`);
    await page.locator('.finance-table-scroll').first().waitFor({ timeout: 45000 });
    await page.evaluate(() => document.fonts.ready);
    for (const width of [1440, 820, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const tab of (exportOnly ? ['reports'] : ['reports', 'rates', 'versions', 'accounts'])) {
        await page.locator(`[role="tab"][id$="trigger-${tab}"]`).click();
        await page.locator('[role="tabpanel"][data-state="active"]').waitFor();
        await page.waitForTimeout(200);
        const measure = await page.evaluate(() => ({
          width: window.innerWidth, scrollWidth: document.documentElement.scrollWidth,
          labels: [...document.querySelectorAll('.admin-finance label')].filter(el => el.getBoundingClientRect().width < 50).length,
          rawKeys: /finance\.[a-zA-Z]/.test(document.querySelector('.admin-finance')?.textContent || '')
        }));
        assert.ok(measure.scrollWidth <= width + 1, `Page overflow ${JSON.stringify({ locale, tab, ...measure })}`);
        assert.equal(measure.labels, 0); assert.equal(measure.rawKeys, false);
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({ path: path.join(output, `${locale}-${width}-${tab}.png`), fullPage: true });
        results.push({ locale, width, tab, ...measure });
        if (exportOnly && width === 1440) {
          const filters = page.locator('.finance-filters select');
          for (const month of ['', '1']) {
            await filters.nth(0).selectOption(month);
            const button = page.locator('.finance-export button');
            await button.waitFor();
            await page.waitForFunction(() => !document.querySelector('.finance-export button')?.disabled);
            const expected = structuredClone(lastReport);
            const downloadEvent = page.waitForEvent('download');
            await button.click();
            const download = await downloadEvent;
            assert.match(download.suggestedFilename(), /\.xlsx$/);
            const file = path.join(output, `${locale}-${month || 'year'}.xlsx`);
            await download.saveAs(file);
            const workbook = await new ExcelJS.Workbook().xlsx.readFile(file);
            const summary = workbook.worksheets[0];
            assert.equal(summary.rowCount, month ? 3 : 14);
            assert.equal(summary.getCell(`B${summary.rowCount}`).value,
              expected.totals.capturedCredits ?? (locale === 'en' ? 'Unavailable' : workbook.worksheets[0].getCell('D2').value));
            assert.equal(workbook.worksheets[1].getCell('B5').value, expected.asOf);
            assert.equal(workbook.worksheets[1].getCell('B7').value, expected.revision);
          }
          await filters.nth(0).selectOption('');
        }
      }
    }
    if (locale === 'en' && !exportOnly) {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.getByRole('tab', { name: 'Versions & schedule' }).click();
      await page.getByLabel('Rate dimension / scope').fill('test-only-dimension');
      await page.getByLabel('Proposed unit cost (USD)').fill('0.02');
      await page.locator('select[name="billingMetric"]').selectOption('returned_image');
      await page.getByLabel('Version label').fill('Isolated visual test');
      await page.getByLabel('Intended effective date').fill('2026-10-01T09:00');
      await page.getByLabel('Source evidence / document reference').fill('Synthetic test evidence, not live pricing');
      await page.getByLabel('Reason', { exact: true }).fill('Verify draft feedback');
      await page.getByRole('button', { name: 'Save draft', exact: true }).click();
      await page.getByText('Draft saved', { exact: true }).waitFor();
      assert.equal(await page.getByRole('button', { name: 'Publish', exact: true }).isDisabled(), true);
      for (const theme of ['fashion', 'creative']) {
        await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
        await page.evaluate(() => window.scrollTo(0, 0));
        assert.equal(await page.locator('.status-notice__content > strong').first().evaluate(el => getComputedStyle(el).color),
          await page.locator('.admin-finance').evaluate(el => getComputedStyle(el).color));
        await page.screenshot({ path: path.join(output, `en-1440-versions-${theme}.png`), fullPage: true });
      }
    }
    assert.deepEqual(errors, []);
    await context.close();
  }
  assert.deepEqual(unexpected, []);
  console.log(JSON.stringify({ output, checks: results.length, results }, null, 2));
} finally { await browser.close(); }

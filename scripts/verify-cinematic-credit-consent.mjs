import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { chromium } from 'playwright';

// Isolated fixtures only. No API server, workers, live data or AI provider calls.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const closureOnly = process.argv.includes('--closure');
const catalogs = Object.fromEntries(await Promise.all(['en', 'th'].map(async locale => [locale,
  Object.fromEntries(await Promise.all(['cinematic', 'react-ui', 'playground'].map(async ns => [ns,
    JSON.parse(await fs.readFile(path.join(root, `client/i18n/locales/${locale}/${ns}.json`), 'utf8'))])))])));
const html = `<!doctype html><html data-theme="default"><head><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body><div id="root" style="padding:16px;max-width:1440px;margin:auto"></div><script type="module">
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider, initReactI18next, useTranslation } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { z } from 'zod';
import { i18n } from '/src/lib/i18n/i18n.ts';
import { apiRequest } from '/src/lib/api/apiClient.ts';
import { Button } from '/src/components/ui/Button.tsx';
import { useCreditConfirmation } from '/src/components/generation/useCreditConfirmation.tsx';
import { AccountPreferencesDialog } from '/src/components/layout/AccountPreferencesDialog.tsx';
import { beginIdentityResolution, publishIdentity } from '/src/lib/auth/actorStore.ts';
import { EngineTargetPanel } from '/src/components/generation/EngineTargetPanel.tsx';
import { CinematicWritingBillingConsent } from '/src/features/cinematic/components/CinematicWritingBillingConsent.tsx';
import { CinematicWritingConsent } from '/src/features/cinematic/components/CinematicWritingConsent.tsx';
import { CinematicFullStoryWriter } from '/src/features/cinematic/components/CinematicFullStoryWriter.tsx';
import { withCinematicWritingQuote } from '/src/features/cinematic/api/cinematicWritingBilling.ts';
import { createCinematicSetupDraft } from '/src/features/cinematic/state/cinematicDraftStorage.ts';
import { cinematicWritingRequestFingerprint, saveCinematicWritingReceipt } from '/src/features/cinematic/state/cinematicWritingRecovery.ts';
import '/src/styles/globals.css';
import '@fontsource/poppins/500.css';
import '@fontsource/noto-sans-thai/500.css';
const params = new URLSearchParams(location.search);
const catalogs = ${JSON.stringify(catalogs)};
const locale = params.get('locale') || 'en';
document.documentElement.lang = locale;
document.documentElement.dataset.theme = params.get('theme') || 'default';
const fixtureActor = params.get('actor') || 'fixture';
publishIdentity(beginIdentityResolution(), { actorId: fixtureActor, authMode: 'session', csrfToken: 'fixture-csrf' });
localStorage.removeItem('mpf.react.draft:session:cinematic-writing-recovery:fixture');
if (params.get('view') === 'recovery') {
  const fingerprint = await cinematicWritingRequestFingerprint({ actorId: 'fixture', projectId: 'fixture', operation: 'environment', input: { expectedVersion: 0 }, sceneId: null, assignmentId: null });
  saveCinematicWritingReceipt('fixture', { id: 'cw_fixture', fingerprint, projectId: 'fixture', operation: 'environment', sceneId: null, assignmentId: null });
}
await i18n.use(initReactI18next).init({ lng: locale, fallbackLng: 'en', ns: ['cinematic', 'react-ui', 'playground'], defaultNS: 'cinematic',
  keySeparator: false, interpolation: { prefix: '{', suffix: '}', escapeValue: false }, resources: catalogs });
const project = { id: 'fixture', projectId: 'fixture', version: 1, title: locale === 'th' ? 'จดหมายในคืนฝนตก' : 'Rain Letters',
  setup: createCinematicSetupDraft(), fullStoryVersions: [], castAssignments: [], scenes: [], chapterProposals: [],
  activeFullStoryVersionId: null, confirmedFullStoryVersionId: null };
const noop = () => {};
function SharedFixture() {
  const { t } = useTranslation('react-ui');
  const [settings, setSettings] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(0);
  const consent = useCreditConfirmation({ actorId: fixtureActor, requestKey: 'fixture-shared-quote',
    estimatedCredits: 1, description: 'Fixture Video / 1 Credit', mandatory: params.get('bulk') === 'true' });
  async function run() {
    if (busy) return;
    setBusy(true);
    try {
      if (await consent.request() && consent.isCurrent()) {
        await apiRequest('/api/fixture-generation', { method: 'POST', body: { estimateId: 'fixture-shared-quote' } });
        setResult(current => current + 1);
      }
    } finally { setBusy(false); }
  }
  return React.createElement(React.Fragment, null, consent.dialog,
    settings ? React.createElement(AccountPreferencesDialog, { actorId: fixtureActor, onClose: () => setSettings(false) }) : null,
    React.createElement(Button, { 'data-testid': 'shared-generate', disabled: busy, onClick: run }, 'Generate fixture'),
    React.createElement(Button, { 'data-testid': 'shared-settings', onClick: () => setSettings(true) }, t('ui.creditConsent.settings')),
    React.createElement('output', { 'data-testid': 'shared-result' }, result));
}
const engineCatalog = { defaultProvider: 'fixture', providers: [{ id: 'fixture', displayName: 'Fixture Image', defaultModel: 'fixture-image',
  models: [{ id: 'fixture-image', displayName: 'Fixture Image', paidRoutingEnabled: true,
    capabilities: { imageGeneration: true, imageEdit: false, imageReferences: false, maxReferenceImages: 0,
      streaming: false, aspectRatios: ['1:1', '9:16'], dimensionControl: 'aspect_ratio_only' } }] }] };
function Fixture() {
  const { t } = useTranslation('cinematic');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState('');
  const mandatory = params.get('view') === 'bulk';
  const operation = mandatory ? 'chapters' : 'environment';
  async function run() {
    setBusy(true);
    try {
      await withCinematicWritingQuote({ projectId: 'fixture', operation, input: { expectedVersion: 1 }, mandatory,
        resultSchema: z.object({ outcome: z.literal('fixture'), story: z.string().optional() }) }, body => apiRequest('/api/cinematic/fixture-execute', {
          method: 'POST', body, schema: z.object({ outcome: z.literal('fixture'), story: z.string().optional() }) }));
      setResult('fixture');
    } catch (error) { setResult(error.message); }
    finally { setBusy(false); }
  }
  return React.createElement(React.Fragment, null,
    React.createElement(CinematicWritingBillingConsent, { actorId: 'fixture', scopeKey: 'fixture' }),
    React.createElement(CinematicFullStoryWriter, { actorId: 'fixture', project, online: true,
      onBackToBrief: noop, onOpenChapters: noop, onProjectChanged: noop, onOpenCharacters: noop }),
    React.createElement(EngineTargetPanel, { catalog: engineCatalog,
      value: { provider: 'fixture', model: 'fixture-image', aspectRatio: '9:16', resolution: null, outputCount: 1 },
      comparison: false, comparisonSlots: [], onChange: noop, onSlotsChange: noop, onComparisonChange: noop,
      promptRefinementAvailable: true, promptRefinementEnabled: false, onPromptRefinementChange: noop }),
    React.createElement('section', { 'aria-label': 'Fixture', style: { marginTop: 24 } },
      React.createElement(CinematicWritingConsent, { title: t('cinematic.writingBilling.confirmTitle'),
        scope: mandatory ? t('cinematic.bulk.scope', { name: project.title, count: 8 }) : project.title,
        pending: busy, onConfirm: run, trigger: React.createElement(Button, { 'data-testid': 'priced-action', loading: busy }, t('cinematic.writingBilling.operation.' + operation)) }),
      React.createElement('p', { role: 'status', 'data-testid': 'fixture-result' }, result)));
}
createRoot(document.getElementById('root')).render(React.createElement(QueryClientProvider, { client: new QueryClient({ defaultOptions: { queries: { retry: false } } }) },
  React.createElement(I18nextProvider, { i18n }, React.createElement(params.get('view') === 'shared' ? SharedFixture : Fixture))));
</script></body></html>`;
const output = await fs.mkdtemp(path.join(os.tmpdir(), 'mpf-cinematic-credit-consent-'));
const server = await createServer({ root: path.join(root, 'web'), configFile: path.join(root, 'web/vite.config.ts'), configLoader: 'runner',
  cacheDir: path.join(output, 'vite-cache'),
  server: { host: '127.0.0.1', port: 5175, strictPort: false, open: false },
  plugins: [{ name: 'cinematic-credit-fixture', configureServer(vite) {
    vite.middlewares.use(async (req, res, next) => {
      if (!req.url?.startsWith('/__credit-consent') || req.url.includes('html-proxy')) return next();
      try { res.setHeader('Content-Type', 'text/html'); res.end(await vite.transformIndexHtml(req.url, html)); }
      catch (error) { next(error); }
    });
  } }] });
let browser;
const errors = [], requests = [], matrix = [];
const preferences = new Map();
try {
  await server.listen();
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/**', async route => {
    const request = route.request(), url = new URL(request.url());
    if (!url.pathname.startsWith('/api/')) return route.continue();
    requests.push({ path: url.pathname, method: request.method() });
    const fixtureActor = new URL(request.frame().url()).searchParams.get('actor') || 'fixture';
    if (url.pathname === '/api/me/preferences') {
      if (request.method() === 'PATCH') {
        assert.equal(request.headers()['x-csrf-token'], 'fixture-csrf');
        assert.deepEqual(Object.keys(request.postDataJSON()), ['confirmCreditUsage']);
        preferences.set(fixtureActor, request.postDataJSON().confirmCreditUsage);
      }
      return route.fulfill({ json: { confirmCreditUsage: preferences.get(fixtureActor) ?? true } });
    }
    if (url.pathname === '/api/fixture-generation' && request.method() === 'POST') {
      assert.equal(request.headers()['x-csrf-token'], 'fixture-csrf');
      assert.equal(request.postDataJSON().estimateId, 'fixture-shared-quote');
      return route.fulfill({ json: { id: 'fixture-result' } });
    }
    if (url.pathname === '/api/cinematic/projects/fixture/series' && request.method() === 'GET') return route.fulfill({ json: {
      productionProject: { id: 'fixture', productionProjectId: 'fixture', version: 1, title: 'Rain Letters', format: 'mini-series', seasonsEnabled: false, chapterCount: 0, chapterWorkStarted: false },
      series: null, chapters: [] } });
    if (url.pathname === '/api/cinematic/projects/fixture/writing/quotes' && request.method() === 'POST') {
      const { operation } = request.postDataJSON();
      return route.fulfill({ json: { id: 'cw_fixture', operation, status: 'quoted', credits: operation === 'chapters' ? 240 : 30,
        billingStatus: 'paid', expiresAt: new Date(Date.now() + 60000).toISOString() } });
    }
    if (url.pathname === '/api/cinematic/projects/fixture/writing/operations/cw_fixture' && request.method() === 'GET') {
      return route.fulfill({ json: { id: 'cw_fixture', operation: 'environment', status: 'succeeded', billingStatus: 'paid', credits: 30,
        expiresAt: new Date(0).toISOString(), artifactExpiresAt: new Date(Date.now() + 86400000).toISOString(), errorCode: null,
        result: { outcome: 'fixture', story: 'Rain falls outside the flower shop. A letter waits beside the window.' } } });
    }
    if (url.pathname === '/api/cinematic/fixture-execute' && request.method() === 'POST') {
      assert.equal(request.postDataJSON().writingQuoteId, 'cw_fixture');
      return route.fulfill({ json: { outcome: 'fixture' } });
    }
    errors.push(`Blocked unexpected API: ${request.method()} ${url.pathname}`);
    return route.abort();
  });
  const origin = server.resolvedUrls.local[0];
  for (const theme of closureOnly ? ['default'] : ['default', 'fashion', 'creative']) for (const locale of ['th', 'en']) for (const width of [390, 820, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    await page.goto(`${origin}__credit-consent?locale=${locale}&theme=${theme}`, { waitUntil: 'networkidle' });
    const notice = page.locator('.cinematic-writing-free');
    await notice.waitFor(); await page.evaluate(() => document.fonts.ready);
    assert.equal(await notice.innerText(), catalogs[locale].cinematic['cinematic.writingBilling.free']);
    const green = await notice.evaluate(el => getComputedStyle(el).color);
    const [r, g, b] = green.match(/[\d.]+/g).map(Number);
    assert.ok(g > r && g > b, `${theme}/${locale}/${width} free notice must be green (${green})`);
    const refineFree = page.locator('.engine-prompt-refinement__free');
    assert.equal(await refineFree.innerText(), catalogs[locale].playground['playground.promptRefinement.free']);
    const refineColor = await refineFree.evaluate(el => getComputedStyle(el).color);
    const [rr, rg, rb] = refineColor.match(/[\d.]+/g).map(Number);
    assert.ok(rg > rr && rg > rb, `Refinement Free label must be green (${refineColor})`);
    assert.ok(await page.locator('body').evaluate(el => el.scrollWidth <= el.clientWidth + 1), `${theme}/${locale}/${width} overflow`);
    await page.screenshot({ path: path.join(output, `${locale}-${width}-${theme}-free.png`), fullPage: true });
    for (const view of ['single', 'bulk', 'recovery']) {
      if (view !== 'single') await page.goto(`${origin}__credit-consent?locale=${locale}&theme=${theme}&view=${view}`, { waitUntil: 'networkidle' });
      const beforeExecute = requests.filter(item => item.path === '/api/cinematic/fixture-execute').length;
      await page.getByTestId('priced-action').click();
      const dialog = page.getByRole('alertdialog'); await dialog.waitFor();
      const confirm = dialog.getByRole('button', { name: view === 'recovery' ? catalogs[locale].cinematic['cinematic.writingBilling.reviewPrevious']
        : catalogs[locale].cinematic['cinematic.writingBilling.confirm'].replace('{credits}', view === 'bulk' ? '240' : '30') });
      assert.equal(await confirm.isEnabled(), true);
      assert.equal(await dialog.getByRole('checkbox').count(), view === 'single' ? 1 : 0);
      if (view === 'recovery') assert.equal(await dialog.getByText('cw_fixture').isVisible(), true);
      assert.ok(await dialog.evaluate(el => {
        const rect = el.getBoundingClientRect();
        return rect.left >= 0 && rect.right <= innerWidth && rect.top >= 0 && rect.bottom <= innerHeight && el.scrollWidth <= el.clientWidth + 1;
      }), `${theme}/${locale}/${width}/${view} dialog overflow`);
      assert.ok(await confirm.evaluate(el => { const rect = el.getBoundingClientRect(); return rect.width > 0 && rect.height > 0 && el.scrollWidth <= el.clientWidth + 1; }), 'Confirm text clipped');
      assert.equal(requests.filter(item => item.path === '/api/cinematic/fixture-execute').length, beforeExecute);
      await page.screenshot({ path: path.join(output, `${locale}-${width}-${theme}-${view}.png`) });
      if (view === 'recovery' && theme === 'default' && locale === 'th' && width === 390) {
        const downloading = page.waitForEvent('download');
        await dialog.getByRole('button', { name: catalogs[locale].cinematic['cinematic.writingBilling.downloadResult'] }).click();
        const download = await downloading;
        const artifact = path.join(output, 'previous-result.json'); await download.saveAs(artifact);
        assert.equal(JSON.parse(await fs.readFile(artifact, 'utf8')).story, 'Rain falls outside the flower shop. A letter waits beside the window.');
      }
      await dialog.getByRole('button', { name: catalogs[locale]['react-ui']['ui.action.cancel'] }).click();
      await dialog.waitFor({ state: 'hidden' });
      await page.waitForFunction(() => !document.querySelector('[data-testid="priced-action"]')?.disabled);
      await page.waitForFunction(() => document.activeElement === document.querySelector('[data-testid="priced-action"]'), undefined, { timeout: 3000 });
      assert.equal(requests.filter(item => item.path === '/api/cinematic/fixture-execute').length, beforeExecute);
      matrix.push({ theme, locale, width, view, passed: true, green });
    }
  }
  await page.goto(`${origin}__credit-consent?locale=en&theme=default&view=bulk`, { waitUntil: 'networkidle' });
  await page.getByTestId('priced-action').click();
  const finalDialog = page.getByRole('alertdialog'); await finalDialog.waitFor();
  await finalDialog.getByRole('button', { name: catalogs.en.cinematic['cinematic.writingBilling.confirm'].replace('{credits}', '240') }).click();
  await page.getByTestId('fixture-result').filter({ hasText: 'fixture' }).waitFor();
  assert.equal(requests.filter(item => item.path === '/api/cinematic/fixture-execute').length, 1, 'Only explicit fixture confirmation executes');
  if (closureOnly) {
    const count = () => requests.filter(item => item.path === '/api/fixture-generation').length;
    for (const locale of ['th', 'en']) for (const width of [390, 820, 1440]) {
      preferences.set('fixture', true);
      await page.setViewportSize({ width, height: 950 });
      const sharedUrl = `${origin}__credit-consent?view=shared&locale=${locale}`;
      await page.goto(sharedUrl, { waitUntil: 'networkidle' });
      const before = count();
      await page.getByTestId('shared-generate').click();
      let dialog = page.getByRole('alertdialog'); await dialog.waitFor();
      assert.equal(await dialog.getByText(catalogs[locale]['react-ui']['ui.creditConsent.amount'].replace('{credits}', '1'), { exact: true }).isVisible(), true);
      await page.screenshot({ path: path.join(output, `${locale}-${width}-shared-confirm.png`) });
      assert.ok(await dialog.evaluate(el => { const r = el.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight && el.scrollWidth <= el.clientWidth + 1; }));
      await dialog.getByRole('button', { name: catalogs[locale]['react-ui']['ui.action.cancel'] }).click();
      assert.equal(count(), before, 'Cancel creates no fixture job');
      await page.getByTestId('shared-generate').click();
      dialog = page.getByRole('alertdialog');
      await dialog.getByRole('checkbox').check();
      await dialog.getByRole('button', { name: catalogs[locale]['react-ui']['ui.creditConsent.confirm'] }).click();
      await page.waitForFunction(() => document.querySelector('[data-testid="shared-result"]')?.textContent === '1');
      assert.equal(count(), before + 1);
      await page.reload({ waitUntil: 'networkidle' });
      await page.getByTestId('shared-generate').click();
      await page.waitForFunction(() => document.querySelector('[data-testid="shared-result"]')?.textContent === '1');
      assert.equal(await page.getByRole('alertdialog').count(), 0, 'Reload retains opt-out');
      await page.getByTestId('shared-settings').click();
      const settings = page.getByRole('dialog');
      await settings.getByRole('checkbox').click();
      await page.waitForFunction(() => {
        const input = document.querySelector('[role="dialog"] input');
        return input?.checked && !input.disabled;
      });
      assert.equal(preferences.get('fixture'), true, 'Settings restores confirmation');
      await settings.getByRole('button', { name: catalogs[locale]['react-ui']['ui.action.close'] }).click();
      await page.getByTestId('shared-generate').click();
      dialog = page.getByRole('alertdialog'); await dialog.waitFor();
      await dialog.getByRole('button', { name: catalogs[locale]['react-ui']['ui.action.cancel'] }).click();
      preferences.set('fixture', false);
      await page.goto(`${sharedUrl}&bulk=true`, { waitUntil: 'networkidle' });
      await page.getByTestId('shared-generate').click();
      dialog = page.getByRole('alertdialog'); await dialog.waitFor();
      assert.equal(await dialog.getByRole('checkbox').count(), 0, 'Bulk never offers opt-out');
      await dialog.getByRole('button', { name: catalogs[locale]['react-ui']['ui.action.cancel'] }).click();
      await page.goto(`${sharedUrl}&actor=other`, { waitUntil: 'networkidle' });
      await page.getByTestId('shared-generate').click();
      dialog = page.getByRole('alertdialog'); await dialog.waitFor();
      await dialog.getByRole('button', { name: catalogs[locale]['react-ui']['ui.action.cancel'] }).click();
      matrix.push({ locale, width, view: 'shared-cancel-confirm-reload-restore-bulk-actor', passed: true });
    }
  }
  assert.deepEqual(errors, []);
  await fs.writeFile(path.join(output, 'metadata.json'), JSON.stringify({ matrix, requests, errors, liveAi: false }, null, 2));
  console.log(`PASS isolated Credit consent${closureOnly ? '/closure' : '/free notices'}: TH/EN, 390/820/1440. Screenshots: ${output}`);
} catch (error) {
  console.error('Browser errors:', errors, `Screenshots: ${output}`);
  for (const context of browser?.contexts() || []) for (const page of context.pages()) await page.screenshot({ path: path.join(output, 'failure.png'), fullPage: true });
  throw error;
} finally {
  await browser?.close();
  await server.close();
}

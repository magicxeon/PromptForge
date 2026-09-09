import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { getLookSheetPreset } from '../server/domain/character-profiles/LookSheetDefinitionService.js';
import { loadProviderConfig } from '../server/providers/ProviderConfigLoader.js';
import { ProviderRegistry } from '../server/providers/ProviderRegistry.js';
import { CreditPricingPolicyService } from '../server/domain/credits/CreditPricingPolicyService.js';

const group = process.argv[2];
const paths = { image25: '/create/playground?imageMode=look-sheet', enhancement: '/create/playground?imageMode=look-sheet', playground: '/create/playground?imageMode=look-sheet', studio: '/create/studio/character?format=look-sheet', comparison: '/comparisons/layout' };
if (!(group in paths)) throw new Error('Select playground, studio or comparison');
const origin = process.env.LOOK_SHEET_LAYOUT_ORIGIN || 'http://127.0.0.1:5173';
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(origin).hostname));
const root = fileURLToPath(new URL('../', import.meta.url));
const output = await fs.mkdtemp(path.join(os.tmpdir(), `mpf-look-sheet-${group}-`));
const actor = { userId: 'look-layout', username: 'layout', displayName: 'Layout', role: 'admin' };
const slots = [1, 2, 3, 4].map(index => ({ id: `slot-${index}`, jobId: `job-${index}`, provider: 'fixture', model: `Model ${index}`, status: 'completed', result: { imageUrl: '/outputs/fixture.jpg', width: 1600, height: 900 } }));
const api = {
  '/api/me': actor, '/api/mock-users': { enabled: false, users: [] },
  '/api/community/features': { community: { enabled: true, exploreEnabled: true, characterProfilesEnabled: true }, cinematic: { enabled: true, playgroundVideoEnabled: true }, generation: { lookSheetDocumentEnabled: true }, development: {}, routing: {} },
  '/api/community/creator-profiles/me': { id: 'creator', handle: 'layout', displayName: 'Layout' },
  '/api/credits/account': { account: { availableCredits: 100, reservedCredits: 0 } },
  '/api/generation/job-center': { items: [], activeCount: 0, terminalCount: 0, polledAt: new Date().toISOString() },
  '/api/health': { status: 'ok' },
  '/api/collections': { collections: [] },
  '/api/history': { items: [], hasMore: false },
  '/api/generation/look-sheet-preset': getLookSheetPreset(),
  '/api/attributes/bundle': { schema: [], library: [], order: [], templates: {}, presets: [] },
  '/api/providers': { defaultProvider: 'fixture', providers: [
    { id: 'fixture', displayName: 'Fixture engine', defaultModel: 'fixture', models: [{ id: 'fixture', displayName: 'Fixture image', capabilities: { imageGeneration: true, imageReferences: true, maxReferenceImages: 6, aspectRatios: ['1:1', '3:4'] }, defaults: {} }] },
    { id: 'alias', displayName: 'Alias engine', defaultModel: 'alias', models: [{ id: 'alias', displayName: 'Alias image', capabilities: { imageGeneration: true, imageReferences: true, maxReferenceImages: 6, aspectRatios: ['6:8', '16:9'] }, defaults: {} }] },
    { id: 'wide', displayName: 'Wide engine', defaultModel: 'wide', models: [{ id: 'wide', displayName: 'Wide image', capabilities: { imageGeneration: true, imageReferences: true, maxReferenceImages: 6, aspectRatios: ['16:9'] }, defaults: {} }] }
  ] },
  '/api/comparisons/layout': { id: 'layout', name: 'Landscape comparison', createdAt: 1, updatedAt: 1, runs: [{ id: 'run', status: 'completed', createdAt: 1, slots, configurationSnapshot: { aspectRatio: '16:9' } }] }
};
if (group === 'image25') api['/api/providers'] = new ProviderRegistry(loadProviderConfig(), {
  NODE_ENV: 'development', OPENAI_API_KEY: 'isolated-browser-fixture'
}).getPublicCatalog();
const browser = await chromium.launch({ headless: true });
const measuredPricing = new CreditPricingPolicyService();
const errors = [], unknown = new Set();
try {
  for (const locale of ['en', 'th']) {
    const context = await browser.newContext();
    let enhancementCalls = 0;
    let imageCalls = 0;
    let measuredQuote = null;
    let enhancementRecord = { id: 'enh_00000000-0000-0000-0000-000000000001', status: 'quoted', credits: 5,
      expiresAt: '2099-01-01', artifactExpiresAt: '2099-01-01', errorCode: null, prompt: null };
    await context.addInitScript(({ actor, locale }) => {
      localStorage.setItem('model_prompt_forge_language', locale);
      localStorage.setItem('mpf_active_mock_user_id', actor.userId);
    }, { actor, locale });
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin !== origin) { errors.push(`External request: ${url.origin}`); return route.abort(); }
      if (url.pathname === '/api/credits/estimate') {
        const body = route.request().postDataJSON();
        if (group === 'image25' && body.requestedModelId?.startsWith('gpt-image-2.5-')) {
          try {
            measuredQuote = await measuredPricing.calculateEstimate({ ...body, userId: actor.userId });
            return route.fulfill({ json: { estimate: measuredQuote, account: { availableCredits: 100, canAfford: true } } });
          } catch (error) { return route.fulfill({ status: 400, json: error.toJSON() }); }
        }
        return route.fulfill({ json: { estimate: { estimateId: 'fixture', estimatedCredits: 1, expiresAt: '2099-01-01' }, account: { availableCredits: 100, canAfford: true } } });
      }
      if (['/api/generation/prompt-preview', '/api/generation/look-sheet-preview'].includes(url.pathname)) return route.fulfill({ json: { compiledPrompt: 'Fixture preview only' } });
      if (group === 'enhancement' && url.pathname === '/api/generate') {
        imageCalls++;
        assert.equal(enhancementRecord.status, 'succeeded');
        assert.equal(route.request().postDataJSON().lookSheetEnhancementId, enhancementRecord.id);
        return route.fulfill({ json: { jobId: 'fixture-job', status: 'completed' } });
      }
      if (url.pathname === '/api/jobs/fixture-job') return route.fulfill({ json: { jobId: 'fixture-job', status: 'completed', result: { imageUrl: '/outputs/fixture.jpg' } } });
      if (url.pathname === '/api/history/fixture-job') return route.fulfill({ status: 404, json: {} });
      if (url.pathname === '/api/community/generations/fixture-job/share-status') return route.fulfill({ json: { shared: false } });
      if (group === 'enhancement' && url.pathname.startsWith('/api/generation/look-sheet-enhancement/')) {
        if (url.pathname.endsWith('/execute')) {
          enhancementCalls++;
          enhancementRecord = { ...enhancementRecord, status: 'succeeded', prompt: 'Fixture enhanced character prompt, keeping age 24, the full appearance, situation, outfit and personality.' };
        }
        return route.fulfill({ json: enhancementRecord });
      }
      if (route.request().method() !== 'GET') { errors.push(`Blocked mutation: ${url.pathname}`); return route.abort(); }
      if (api[url.pathname]) return route.fulfill({ json: api[url.pathname] });
      if (url.pathname.startsWith('/api/')) { unknown.add(url.pathname); return route.fulfill({ status: 404, json: {} }); }
      if (url.pathname === '/outputs/fixture.jpg') return route.fulfill({ body: await fs.readFile(path.join(root, 'client/assets/scene-builder/shot-recipes/cafe-seated-lifestyle.jpg')), contentType: 'image/jpeg' });
      if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/i18n/')) {
        const base = path.join(root, 'client');
        const file = path.resolve(base, decodeURIComponent(url.pathname.slice(1)));
        assert.ok(file.startsWith(`${base}${path.sep}`));
        try { return route.fulfill({ body: await fs.readFile(file), contentType: ({ '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg' })[path.extname(file)] || 'application/octet-stream' }); }
        catch { return route.fulfill({ status: 404, body: '' }); }
      }
      return route.continue();
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${origin}${paths[group]}`);
    if (group === 'comparison') await page.locator('.comparison-workspace[data-layout="stacked"]').waitFor({ timeout: 30000 });
    else {
      const catalog = JSON.parse(await fs.readFile(path.join(root, `client/i18n/locales/${locale}/playground.json`), 'utf8'));
      const labels = Object.fromEntries(['name', 'age', 'appearance', 'situation', 'promptPreview'].map(key => [key, catalog[`lookSheet.${key}`]]));
      await page.getByLabel(labels.name, { exact: true }).waitFor({ timeout: 30000 });
      await page.getByLabel(labels.name, { exact: true }).fill('MIRA นลินน์');
      await page.getByLabel(labels.age, { exact: true }).fill('24');
      await page.getByLabel(labels.appearance, { exact: true }).fill('Thai woman, shoulder-length dark hair');
      await page.getByLabel(labels.situation, { exact: true }).fill('Night market dessert stall owner');
      await page.getByLabel(labels.promptPreview, { exact: true }).filter({ visible: true }).waitFor();
      await page.waitForFunction(label => [...document.querySelectorAll('textarea')].some(el => el.getAttribute('aria-label') === label && el.value === 'Fixture preview only'), labels.promptPreview);
      await page.reload();
      await page.getByLabel(labels.name, { exact: true }).waitFor();
      assert.equal(await page.getByLabel(labels.name, { exact: true }).inputValue(), 'MIRA นลินน์');
      assert.equal(await page.getByLabel(labels.age, { exact: true }).inputValue(), '24');
      const provider = page.getByLabel(catalog['playground.engine.provider'], { exact: true });
      if (group === 'image25') {
        await provider.selectOption('openai');
        const model = page.getByLabel(catalog['playground.engine.model'], { exact: true });
        for (const id of ['gpt-image-2.5-sunburst', 'gpt-image-2.5-flare']) {
          await model.selectOption(id);
          await page.waitForTimeout(650);
          assert.equal(await page.getByText(catalog['playground.engine.internalTesting'], { exact: true }).count(), 0);
          await page.waitForFunction(() => !document.querySelector('.studio-generate-button')?.disabled);
          assert.equal(await model.inputValue(), id);
          assert.equal(measuredQuote?.routing.requestedModelId, id);
          assert.equal(measuredQuote?.estimatedCredits, 55);
        }
      } else {
      await provider.selectOption('alias');
      await page.waitForTimeout(450);
      assert.equal(await provider.inputValue(), 'alias');
      await provider.selectOption('wide');
      await page.waitForTimeout(450);
      assert.equal(await provider.inputValue(), 'wide');
      await provider.selectOption('fixture');
      await page.waitForTimeout(450);
      assert.equal(await provider.inputValue(), 'fixture');
      }
      assert.equal(await page.getByLabel(labels.age, { exact: true }).getAttribute('min'), '18');
      await page.getByLabel(labels.age, { exact: true }).fill('17');
      await page.getByText(catalog['lookSheet.adultRequired'], { exact: true }).waitFor();
      assert.equal(await page.locator('.studio-generate-button').isDisabled(), true);
      await page.getByLabel(labels.age, { exact: true }).fill('24');
      const resultFirst = await page.evaluate(() => [...document.querySelector('.studio-workspace').children].map(el => el.className));
      assert.match(resultFirst[0], /studio-viewport-panel/);
      const toggle = page.getByRole('switch', { name: catalog['lookSheet.enhancement.title'], exact: true });
      if (group === 'studio') assert.equal(await toggle.count(), 0);
      if (group === 'enhancement') {
        await toggle.click(); assert.equal(enhancementCalls, 0);
        const generate = page.locator('.studio-generate-button');
        await page.waitForFunction(() => !document.querySelector('.studio-generate-button').disabled);
        assert.equal(enhancementCalls, 0);
        await generate.click();
        await page.getByText(catalog['lookSheet.auto.reused'], { exact: true }).waitFor();
        await page.waitForFunction(() => document.querySelector('.studio-active-render img')?.complete);
        assert.equal(enhancementCalls, 1);
        assert.equal(imageCalls, 1);
        await page.reload();
        await page.getByText(catalog['lookSheet.auto.reused'], { exact: true }).waitFor();
        assert.equal(enhancementCalls, 1, 'Reload must not buy another enhancement');
        assert.equal(imageCalls, 1, 'Reload must not submit another image');
        assert.equal(await page.getByLabel(labels.appearance, { exact: true }).inputValue(), 'Thai woman, shoulder-length dark hair');
      }
    }
    await page.evaluate(() => document.fonts.ready);
    for (const theme of group === 'enhancement' ? ['default', 'fashion', 'creative'] : ['default']) {
    await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
    for (const width of [1440, 820, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.waitForTimeout(200);
      const dimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
      assert.ok(dimensions.scroll <= dimensions.client + 1, `Overflow ${JSON.stringify({ width, ...dimensions })}`);
      if (group !== 'comparison') {
        const box = await page.locator('.look-sheet-character-prompt textarea').boundingBox();
        assert.ok(box && box.height >= (width < 640 ? 180 : 220), 'Character Prompt height');
      }
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await page.screenshot({ path: path.join(output, `${group}-${locale}-${theme}-${width}.png`), fullPage: true });
      if (group === 'enhancement') {
        await page.locator('.look-sheet-form').scrollIntoViewIfNeeded();
        await page.evaluate(() => window.scrollBy({ top: -100, behavior: 'instant' }));
        await page.screenshot({ path: path.join(output, `form-viewport-${locale}-${theme}-${width}.png`) });
      }
    }
    }
    if (group === 'comparison') {
      await page.getByRole('button', { name: locale === 'en' ? 'Side by side' : 'เรียงซ้ายไปขวา', exact: true }).click();
      assert.equal(await page.locator('.comparison-workspace').getAttribute('data-layout'), 'side_by_side');
      assert.equal(await page.locator('.comparison-result-panel__download').count(), 3);
    }
    const icon = await page.locator('link[rel="icon"]').getAttribute('href');
    assert.match(icon, /momelo-mark.svg/);
    await context.close();
  }
  assert.deepEqual(errors, []);
  assert.deepEqual([...unknown], []);
  console.log(`PASS ${group}: EN/TH at 1440, 820, 390. Screenshots: ${output}`);
} catch (error) {
  for (const context of browser.contexts()) for (const page of context.pages()) {
    await page.screenshot({ path: path.join(output, 'failure.png'), fullPage: true });
    console.error((await page.locator('body').innerText()).slice(0, 8000));
  }
  console.error({ errors, unknown: [...unknown], output });
  throw error;
} finally { await browser.close(); }

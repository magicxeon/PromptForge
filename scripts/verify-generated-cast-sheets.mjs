import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../', import.meta.url));
const origin = process.env.CAST_SHEETS_WEB_ORIGIN || 'http://127.0.0.1:5174';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname));
const moduleText = await (await fetch(`${origin}/src/lib/auth/ActorProvider.tsx`)).text();
const version = moduleText.match(/react\.js(\?v=[a-z0-9]+)/)?.[1] || '';
const output = await fs.mkdtemp(path.join(os.tmpdir(), 'mpf-generated-cast-'));
const photo = await fs.readFile(process.env.CAST_SHEET_VISUAL_FILE || path.join(root, 'client/assets/scene-builder/shot-recipes/cafe-seated-lifestyle.jpg'));
const actor = { userId: 'fixture-owner', username: 'fixture', role: 'user', displayName: 'Fixture' };
const now = new Date().toISOString();
const project = { id: 'film', version: 1, setup: { storyRoleSlots: [] }, scenes: [],
  castAssignments: [{ id: 'cast', characterProfileId: 'character', characterProfileVersionId: 'charv1',
    displayName: 'Lalin', portraitUrl: '/api/fixture-media', storyRole: 'Lead', storyImportance: 'protagonist',
    objective: '', motivation: '', pressure: '', personalityTraits: [], emotionalBaseline: 'guarded',
    dialogueStyle: '', performanceDirection: '', identityReady: true, looks: [], active: true, updatedAt: now }] };
const sheet = { id: 'fixture-sheet', modelId: 'dola-seedream-5-0-pro-260628', previewUrl: '/api/fixture-media',
  generationMode: 'text_to_image', generatedAt: now, expiresAt: new Date(Date.now() + 29 * 86400000).toISOString(),
  eligible: true, reason: null, policyVersion: 'fixture' };
const look = { id: 'look', characterProfileId: 'character', sourceCharacterProfileVersionId: 'charv1',
  name: 'Garden Look', description: '', tags: [], official: true, visibility: 'private', lifecycleStatus: 'review',
  activeVersionId: 'lookv1', approvedVersionId: null, createdAt: now, updatedAt: now, retiredAt: null,
  versions: [{ id: 'lookv1', versionNumber: 1, sourceMode: 'generated_character_sheet', garmentAuthorities: {},
    canonicalFaceAssetId: null, status: 'review', approvedViewAssets: { front: {}, side: {}, back: {} },
    approvedSheetAsset: { assetId: 'asset', contentHash: 'fixture' }, cropManifest: null,
    reviewMediaUrl: '/api/fixture-media', createdAt: now, updatedAt: now, approvedAt: null,
    provenance: { kind: 'generated_import', characterProfileId: 'character', characterProfileVersionId: 'charv1',
      sourceAssetIds: ['asset'], generationResultId: sheet.id, generationJobId: sheet.id,
      recipeId: null, recipeVersion: null, recipeFingerprint: null, provider: 'modelark', model: sheet.modelId, recordedAt: now },
    identityAssurance: { status: 'unverified', characterProfileVersionId: 'charv1', validationEvidenceId: null, updatedAt: now }
  }] };
const browser = await chromium.launch({ headless: true });
const errors = [];
try {
  for (const locale of ['en', 'th']) {
    const labels = JSON.parse(await fs.readFile(path.join(root, `client/i18n/locales/${locale}/cinematic.json`), 'utf8'));
    const label = key => labels[`cinematic.lookDraft.${key}`];
    let state = 'normal', imports = 0, approvals = 0;
    const context = await browser.newContext();
    await context.addInitScript(locale => localStorage.setItem('model_prompt_forge_language', locale), locale);
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin !== origin) return route.abort();
      if (url.pathname === '/__cast-sheet-check') return route.fulfill({ contentType: 'text/html', body: `
        <html data-theme="default"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div>
        <script type="module">
        import RefreshRuntime from '/@react-refresh';
        RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$=()=>{}; window.$RefreshSig$=()=>type=>type;
        window.__vite_plugin_react_preamble_installed__=true;
        await import('/src/styles/globals.css');
        const {default:React}=await import('/node_modules/.vite/deps/react.js${version}');
        const {default:ReactDOM}=await import('/node_modules/.vite/deps/react-dom_client.js${version}');
        const {QueryClient,QueryClientProvider}=await import('/node_modules/.vite/deps/@tanstack_react-query.js${version}');
        const {default:i18n}=await import('/node_modules/.vite/deps/i18next.js${version}');
        const {I18nextProvider,initReactI18next}=await import('/node_modules/.vite/deps/react-i18next.js${version}');
        const {ActorProvider}=await import('/src/lib/auth/ActorProvider.tsx');
        const {CharacterLookDialog}=await import('/src/features/profiles/components/CharacterLookDialog.tsx');
        const {CinematicStageContent}=await import('/src/features/cinematic/components/CinematicStageContent.tsx');
        await i18n.use(initReactI18next).init({lng:${JSON.stringify(locale)},keySeparator:false,interpolation:{prefix:'{',suffix:'}',escapeValue:false},resources:{${locale}:{cinematic:${JSON.stringify(labels)}}}});
        const e=React.createElement;
        function Screen(){const[open,setOpen]=React.useState(true);if(location.search)return e(CinematicStageContent,{activeStage:'cast',project:${JSON.stringify(project)},onPrevious:()=>{},onNext:()=>{}});return e(CharacterLookDialog,{open,onOpenChange:setOpen,
          characterProfileId:'character',characterProfileVersionId:'charv1',characterDisplayName:'Lalin',onSaved:look=>window.savedLook=look});}
        ReactDOM.createRoot(document.getElementById('root')).render(e(QueryClientProvider,{client:new QueryClient()},e(ActorProvider,null,e(I18nextProvider,{i18n},e(Screen)))));
        </script></body></html>` });
      if (url.pathname === '/api/me') return route.fulfill({ json: actor });
      if (url.pathname === '/api/mock-users') return route.fulfill({ json: { enabled: false, users: [] } });
      if (url.pathname === '/api/fixture-media') return route.fulfill({ body: photo, contentType: 'image/png' });
      if (url.pathname === '/api/community/character-profiles/character/featured-image') return route.fulfill({ body: photo, contentType: 'image/png' });
      if (url.pathname === '/api/character-profiles/character/looks' && request.method() === 'GET') return route.fulfill({ json: { items: [] } });
      if (url.pathname === '/api/generation/video/trusted-sources') {
        assert.equal(url.searchParams.get('eligibleOnly'), 'true');
        if (state === 'loading') await new Promise(resolve => setTimeout(resolve, 700));
        if (state === 'error') return route.fulfill({ status: 503, json: { error: 'fixture' } });
        return route.fulfill({ json: { items: state === 'empty' ? [] : [sheet, { ...sheet, id: 'second' }], hasMore: false } });
      }
      if (url.pathname.endsWith('/looks/import-generated')) {
        imports++;
        assert.deepEqual(request.postDataJSON(), { characterProfileVersionId: 'charv1', name: 'Garden Look',
          generationResultId: 'fixture-sheet', identityAndViewsConfirmed: true });
        return route.fulfill({ json: look });
      }
      if (url.pathname.endsWith('/approve')) {
        approvals++;
        return route.fulfill({ json: { ...look, lifecycleStatus: 'approved', approvedVersionId: 'lookv1',
          versions: [{ ...look.versions[0], status: 'approved', approvedAt: now }] } });
      }
      if (url.pathname.startsWith('/api/') || request.method() !== 'GET') {
        errors.push(`Unexpected request ${request.method()} ${url.pathname}`); return route.abort();
      }
      return route.continue();
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    for (const width of [1440, 820, 390]) {
      await page.setViewportSize({ width, height: 950 });
      await page.goto(`${origin}/__cast-sheet-check`);
      await page.getByRole('radio', { name: label('generatedSheet'), exact: true }).click();
      await page.getByRole('button', { name: /dola-seedream/ }).first().waitFor();
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: path.join(output, `${locale}-${width}-choose.png`) });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      assert.equal(await page.locator('.character-look-dialog__content').evaluate(el => el.scrollWidth <= el.clientWidth + 1), true);
      await page.getByRole('textbox', { name: label('name') }).fill('Garden Look');
      await page.getByRole('button', { name: /dola-seedream/ }).first().click();
      await page.waitForFunction(() => !document.querySelector('input[type=checkbox]').disabled);
      assert.equal(await page.locator('.character-look-generated__selection img').evaluate(el => getComputedStyle(el).objectFit), 'contain');
      await page.screenshot({ path: path.join(output, `${locale}-${width}-selected.png`) });
      await page.getByRole('checkbox').check();
      await page.getByRole('button', { name: label('continueToReview'), exact: true }).click();
      await page.getByRole('button', { name: label('approveUse'), exact: true }).waitFor();
      await page.waitForFunction(() => !!document.querySelector('.character-look-review__sheet img')?.naturalWidth);
      assert.equal(await page.locator('.character-look-review__crops').count(), 0);
      assert.equal(await page.locator('.character-look-dialog__content').evaluate(el => el.scrollWidth <= el.clientWidth + 1), true);
      await page.screenshot({ path: path.join(output, `${locale}-${width}-review.png`) });
      await page.getByRole('button', { name: label('approveUse'), exact: true }).click();
      await page.waitForFunction(() => window.savedLook?.lifecycleStatus === 'approved');
    }
    assert.equal(imports, 3); assert.equal(approvals, 3);
    for (const width of [1440, 820, 390]) {
      await page.setViewportSize({ width, height: 950 });
      await page.goto(`${origin}/__cast-sheet-check?cast=1`);
      await page.getByRole('tab', { name: labels['cinematic.cast.tab.wardrobe'], exact: true }).click();
      const source = page.locator('.cinematic-look-source-actions');
      await source.scrollIntoViewIfNeeded();
      assert.equal(await source.getByRole('button').count(), 3);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      assert.equal(await source.evaluate(el => el.scrollWidth <= el.clientWidth + 1), true);
      await page.screenshot({ path: path.join(output, `${locale}-${width}-cast.png`) });
      await source.getByRole('button', { name: new RegExp(labels['cinematic.cast.generatedSheet']) }).click();
      assert.equal(await page.getByRole('radio', { name: label('generatedSheet'), exact: true }).getAttribute('aria-checked'), 'true');
      await page.getByRole('button', { name: /dola-seedream/ }).first().waitFor();
    }
    for (const next of ['loading', 'empty', 'error']) {
      state = next;
      await page.goto(`${origin}/__cast-sheet-check`);
      await page.getByRole('radio', { name: label('generatedSheet'), exact: true }).click();
      if (next === 'loading') await page.getByRole('status').waitFor();
      if (next === 'empty') await page.getByText(label('generatedEmpty')).waitFor();
      if (next === 'error') await page.getByRole('alert').waitFor();
      await page.screenshot({ path: path.join(output, `${locale}-${next}.png`) });
    }
    await context.close();
  }
  assert.deepEqual(errors, []);
  console.log(`PASS Cast import/review/approve EN/TH at 390/820/1440, loading/empty/error. Screenshots: ${output}`);
} catch (error) {
  for (const context of browser.contexts()) for (const page of context.pages()) {
    await page.screenshot({ path: path.join(output, 'failure.png') });
    console.error((await page.locator('body').innerText()).slice(0, 3000));
  }
  console.error({ output, errors });
  throw error;
} finally { await browser.close(); }

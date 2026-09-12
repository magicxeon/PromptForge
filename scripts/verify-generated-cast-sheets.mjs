import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { CinematicApplicationService } from '../server/domain/cinematic/CinematicApplicationService.js';
import { CinematicGeneratedCastService } from '../server/domain/cinematic/CinematicGeneratedCastService.js';
import { createSingleCharacterCinematicProject } from '../test/fixtures/cinematic/cinematicProjectFixtures.js';

// All APIs are intercepted. Only an existing local source Vite server is needed.
const root = fileURLToPath(new URL('../', import.meta.url));
const origin = process.env.CAST_SHEETS_WEB_ORIGIN || 'http://127.0.0.1:5173';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname));
const moduleText = await (await fetch(`${origin}/src/lib/auth/ActorProvider.tsx`)).text();
const version = moduleText.match(/react\.js(\?v=[a-z0-9]+)/)?.[1] || '';
const castModule = await (await fetch(`${origin}/src/features/cinematic/components/GeneratedCastDialog.tsx`)).text();
const actorModule = castModule.match(/"(\/src\/lib\/auth\/ActorProvider\.tsx[^\"]*)"/)?.[1] || '/src/lib/auth/ActorProvider.tsx';
const output = await fs.mkdtemp(path.join(os.tmpdir(), 'mpf-direct-cast-'));
const photo = await fs.readFile(process.env.CAST_SHEET_VISUAL_FILE || path.join(root, 'client/assets/scene-builder/shot-recipes/cafe-seated-lifestyle.jpg'));
const actor = { userId: 'fixture-owner', username: 'fixture', role: 'user', displayName: 'Fixture' };
const now = new Date().toISOString();
const sheet = { id: 'fixture-sheet', modelId: 'gpt-image-2', previewUrl: '/api/fixture-media',
  generationMode: 'text_to_image', generatedAt: now, expiresAt: null,
  eligible: true, reason: null, policyVersion: 'fixture', category: 'look-sheet' };
const initial = createSingleCharacterCinematicProject();
Object.assign(initial, { ownerUserId: actor.userId, ownerUsername: actor.username, activeStage: 'cast',
  castAssignments: [], scenes: [], generationAttempts: [], status: 'draft', timelineVersions: [], activeTimelineVersionId: null });
initial.setup.storyRoleSlots = [];
Object.assign(initial.setup, { title: initial.title, format: 'short-film', durationSeconds: 30 });
let project = structuredClone(initial);
const service = new CinematicApplicationService({
  repository: {
    findForActor: async () => structuredClone(project),
    mutateForActor: async (_id, _actor, update) => (project = update(structuredClone(project)))
  },
  characterAuthorizationService: { validateGenerationContext() { assert.fail('Direct Cast must not use a Character'); } },
  generatedCastService: new CinematicGeneratedCastService({
    trustedSources: { describeOwnedImage: async id => ({ id, publicUrl: sheet.previewUrl, contentHash: 'fixture-hash', modelId: sheet.modelId, expiresAt: sheet.expiresAt }) },
    assetAuthority: { importGeneratedSheet: async () => ({ id: 'fixture-asset' }) }
  })
});
const browser = await chromium.launch({ headless: true });
const errors = [];
try {
  for (const locale of ['en', 'th']) {
    const labels = JSON.parse(await fs.readFile(path.join(root, `client/i18n/locales/${locale}/cinematic.json`), 'utf8'));
    const label = key => labels[`cinematic.${key}`];
    let state = 'normal', saves = 0;
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
        const {ActorProvider}=await import(${JSON.stringify(actorModule)});
        const {CinematicStageContent}=await import('/src/features/cinematic/components/CinematicStageContent.tsx');
        await i18n.use(initReactI18next).init({lng:${JSON.stringify(locale)},keySeparator:false,interpolation:{prefix:'{',suffix:'}',escapeValue:false},resources:{${locale}:{cinematic:${JSON.stringify(labels)}}}});
        const e=React.createElement;
        function Screen(){const[project,setProject]=React.useState(${JSON.stringify(initial)});return e(CinematicStageContent,{activeStage:'cast',project,onProjectChanged:setProject,onPrevious:()=>{},onNext:()=>{}});}
        ReactDOM.createRoot(document.getElementById('root')).render(e(QueryClientProvider,{client:new QueryClient()},e(ActorProvider,null,e(I18nextProvider,{i18n},e(Screen)))));
        </script></body></html>` });
      if (url.pathname === '/api/me') return route.fulfill({ json: actor });
      if (url.pathname === '/api/mock-users') return route.fulfill({ json: { enabled: false, users: [] } });
      if (url.pathname === '/api/fixture-media') return route.fulfill({ body: photo, contentType: 'image/png' });
      if (['/api/character-profiles', '/api/community/characters'].includes(url.pathname)) return route.fulfill({ json: { items: [], hasMore: false, nextCursor: null } });
      if (url.pathname === '/api/generation/video/trusted-sources') {
        assert.equal(url.searchParams.get('eligibleOnly'), 'true');
        assert.equal(url.searchParams.get('category'), 'look-sheet');
        if (state === 'loading') await new Promise(resolve => setTimeout(resolve, 1500));
        if (state === 'error') return route.fulfill({ status: 503, json: { error: 'Fixture source failure' } });
        return route.fulfill({ json: { items: state === 'empty' ? [] : [sheet, { ...sheet, id: 'scene', modelId: 'Non-sheet scene', category: 'image' }], hasMore: false } });
      }
      if (url.pathname.includes('/cast/') && request.method() === 'PUT') {
        const input = request.postDataJSON();
        assert.equal(input.sourceType, 'generated_sheet');
        assert.equal(input.characterProfileId, undefined); assert.equal(input.characterProfileVersionId, undefined);
        saves++;
        const saved = await service.upsertCastAssignment(project.id, { ...input, assignmentId: decodeURIComponent(url.pathname.split('/').at(-1)) }, actor);
        return route.fulfill({ json: saved });
      }
      if (url.pathname.startsWith('/api/') || request.method() !== 'GET') {
        errors.push(`Unexpected request ${request.method()} ${url.pathname}`); return route.abort();
      }
      return route.continue();
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    async function openSheetPicker() {
      await page.getByRole('button', { name: label('cast.addCharacter'), exact: true }).click();
      await page.getByRole('button', { name: label('castSource.sheet'), exact: true }).click();
    }
    for (const width of [1440, 820, 390]) {
      project = structuredClone(initial);
      await page.setViewportSize({ width, height: 950 });
      await page.goto(`${origin}/__cast-sheet-check`);
      await openSheetPicker();
      await page.getByRole('button', { name: /gpt-image-2/ }).first().waitFor();
      assert.equal(await page.getByText('Non-sheet scene', { exact: true }).count(), 0);
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: path.join(output, `${locale}-${width}-choose.png`) });
      await page.getByRole('button', { name: /gpt-image-2/ }).first().click();
      await page.getByRole('textbox', { name: label('castSource.name') }).fill('Mira');
      await page.waitForFunction(() => !document.querySelector('input[type=checkbox]').disabled);
      assert.equal(await page.locator('.character-look-generated__selection img').evaluate(el => getComputedStyle(el).objectFit), 'contain');
      await page.getByRole('checkbox').check();
      await page.screenshot({ path: path.join(output, `${locale}-${width}-selected.png`) });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      assert.equal(await page.locator('.character-look-dialog__content').evaluate(el => el.scrollWidth <= el.clientWidth + 1), true);
      await page.getByRole('button', { name: label('castSource.assign'), exact: true }).click();
      await page.getByText(label('castSource.pinned')).waitFor();
      assert.equal(project.castAssignments[0].characterProfileId, null);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.getByRole('tab', { name: label('castSource.sheet'), exact: true }).click();
      assert.equal(await page.locator('.cinematic-look-source-actions').count(), 0);
      await page.getByText(label('castSource.pinned')).scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(output, `${locale}-${width}-cast.png`) });
      await page.getByRole('button', { name: label('cast.changeCharacter'), exact: true }).click();
      await page.keyboard.press('Escape');
      assert.equal(await page.getByRole('dialog').count(), 0);
    }
    assert.equal(saves, 3);
    for (const next of ['loading', 'empty', 'error']) {
      state = next;
      await page.goto(`${origin}/__cast-sheet-check`); await openSheetPicker();
      if (next === 'loading') await page.getByRole('status').waitFor();
      if (next === 'empty') await page.getByText(label('lookDraft.generatedEmpty')).waitFor();
      if (next === 'error') await page.getByRole('alert').waitFor();
      await page.screenshot({ path: path.join(output, `${locale}-${next}.png`) });
    }
    await context.close();
  }
  assert.deepEqual(errors, []);
  console.log(`PASS direct Cast selection/save/replacement EN/TH 390/820/1440, loading/empty/error. Screenshots: ${output}`);
} catch (error) {
  for (const context of browser.contexts()) for (const page of context.pages()) {
    await page.screenshot({ path: path.join(output, 'failure.png') });
    console.error((await page.locator('body').innerText()).slice(0, 3000));
  }
  console.error({ output, errors }); throw error;
} finally { await browser.close(); }

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import { createSingleCharacterCinematicProject } from '../test/fixtures/cinematic/cinematicProjectFixtures.js';
import { storyboardKeyframeContractCompiler } from '../server/domain/cinematic/StoryboardKeyframeContractCompiler.js';

const origin = process.env.CINEMATIC_WEB_ORIGIN || 'http://127.0.0.1:6501';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname));
const moduleSource = await (await fetch(`${origin}/src/components/generation/GenerationExperience.tsx`)).text();
const version = moduleSource.match(/react\.js(\?v=[a-z0-9]+)/)?.[1] || '';
const actorModule = moduleSource.match(/"(\/src\/lib\/auth\/ActorProvider\.tsx[^"]*)"/)?.[1] || '/src/lib/auth/ActorProvider.tsx';
const featureModule = moduleSource.match(/"(\/src\/lib\/permissions\/FeaturePolicyProvider\.tsx[^"]*)"/)?.[1] || '/src/lib/permissions/FeaturePolicyProvider.tsx';
const output = await fs.mkdtemp(path.join(os.tmpdir(), 'mpf-shot-workspace-'));
const photo = await fs.readFile('client/assets/scene-builder/shot-recipes/cafe-seated-lifestyle.jpg');
const project = createSingleCharacterCinematicProject();
const scene = project.scenes[0], shot = scene.shots[0];
shot.approvedStoryboardSource.storyboardRenderStyle = 'faceless_previs_v1';
const generationContext = {
  schemaVersion: 1, projectId: project.id, projectVersion: project.version,
  sceneId: scene.id, shotId: shot.id, shotVersion: shot.version,
  characterProfileContext: null,
  references: { character_reference: '/api/fixture-media', outfit_front: null, outfit_back: null, style_reference: null },
  cast: [], looks: [], continuitySource: null,
  keyframeContract: storyboardKeyframeContractCompiler.compile({ project, scene, shot }),
  generationEligible: true, blockingReason: null
};
const actor = { userId: 'fixture-owner', username: 'fixture', role: 'user', displayName: 'Fixture' };
const errors = [];
const browser = await chromium.launch({ headless: true });
try {
  for (const locale of ['en', 'th']) {
    const catalogs = {};
    for (const ns of ['cinematic', 'playground', 'react-ui']) catalogs[ns] = JSON.parse(await fs.readFile(`client/i18n/locales/${locale}/${ns}.json`, 'utf8'));
    const t = key => catalogs.cinematic[key];
    const context = await browser.newContext();
    let jobState = 'completed';
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin !== origin) return route.abort();
      if (url.pathname === '/__shot-workspace-check') return route.fulfill({ contentType: 'text/html', body: `
        <html data-theme="default"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
        <body><div id="root"></div><script type="module">
        import RefreshRuntime from '/@react-refresh';
        RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$=()=>{}; window.$RefreshSig$=()=>type=>type;
        window.__vite_plugin_react_preamble_installed__=true;
        await import('/src/styles/globals.css');
        const {default:React}=await import('/node_modules/.vite/deps/react.js${version}');
        const {default:ReactDOM}=await import('/node_modules/.vite/deps/react-dom_client.js${version}');
        const {MemoryRouter}=await import('/node_modules/.vite/deps/react-router-dom.js${version}');
        const {QueryClient,QueryClientProvider}=await import('/node_modules/.vite/deps/@tanstack_react-query.js${version}');
        const {default:i18n}=await import('/node_modules/.vite/deps/i18next.js${version}');
        const {I18nextProvider,initReactI18next}=await import('/node_modules/.vite/deps/react-i18next.js${version}');
        const {ActorProvider}=await import(${JSON.stringify(actorModule)});
        const {FeaturePolicyProvider}=await import(${JSON.stringify(featureModule)});
        const {StoryboardShotDialog}=await import('/src/features/cinematic/components/StoryboardShotDialog.tsx');
        await i18n.use(initReactI18next).init({lng:${JSON.stringify(locale)},keySeparator:false,interpolation:{prefix:'{',suffix:'}',escapeValue:false},resources:{${locale}:${JSON.stringify(catalogs)}}});
        const p=${JSON.stringify(project)}, e=React.createElement, client=new QueryClient({defaultOptions:{queries:{retry:false}}});
        window.refreshFixture=()=>client.invalidateQueries();
        ReactDOM.createRoot(document.getElementById('root')).render(e(QueryClientProvider,{client},
          e(ActorProvider,null,e(FeaturePolicyProvider,null,e(MemoryRouter,null,e(I18nextProvider,{i18n},
            e(StoryboardShotDialog,{open:true,onOpenChange:()=>{},project:p,scene:p.scenes[0],shot:p.scenes[0].shots[0],resumeJobId:'fixture-job'})))))));
        </script></body></html>` });
      if (url.pathname === '/api/me') return route.fulfill({ json: actor });
      if (url.pathname === '/api/mock-users') return route.fulfill({ json: { enabled: false, users: [] } });
      if (url.pathname === '/api/community/features') return route.fulfill({ json: { community: {}, development: {}, routing: {} } });
      if (url.pathname === '/api/community/generations/fixture-job/share-status') return route.fulfill({ json: { shared: false } });
      if (url.pathname === '/api/fixture-media' || url.pathname.startsWith('/api/fixtures/')) return route.fulfill({ body: photo, contentType: 'image/jpeg' });
      if (url.pathname === '/api/providers') return route.fulfill({ json: { defaultProvider: 'modelark', providers: [{ id: 'modelark', displayName: 'Seedream', defaultModel: 'fixture-image', models: [{
        id: 'fixture-image', displayName: 'Seedream 5.0 Pro', capabilities: { imageGeneration: true, imageReferences: true, maxReferenceImages: 6, aspectRatios: ['9:16', '16:9', '1:1'], resolutions: ['2K', '4K'] }, defaults: { resolution: '2K' }
      }] }] } });
      if (url.pathname === '/api/cinematic/video-capabilities') return route.fulfill({ json: { schemaVersion: 1, catalogVersion: 'fixture', mediaType: 'video', models: [], comparison: { enabled: false, minimumSlots: 2, maximumSlots: 2 }, launchStatus: 'available' } });
      if (url.pathname.endsWith('/storyboard-generation-context')) return route.fulfill({ json: generationContext });
      if (url.pathname === '/api/credits/account') return route.fulfill({ json: { account: { userId: actor.userId, availableCredits: 100, reservedCredits: 0, status: 'active' } } });
      if (url.pathname === '/api/credits/estimate') return route.fulfill({ json: { estimate: { estimateId: 'fixture', estimatedCredits: 12, expiresAt: Date.now() + 60000 }, account: { availableCredits: 100, canAfford: true } } });
      if (url.pathname === '/api/references/processing-plan') return route.fulfill({ json: { status: 'accepted', policyVersion: 'fixture', planFingerprint: 'fixture', publicAuthorityProjection: { schemaVersion: 1, policyVersion: 'fixture', planFingerprint: 'fixture' }, effectiveSelections: {}, providerPlan: { referenceCount: 1, executionMode: 'single_stage' } } });
      if (url.pathname === '/api/jobs/fixture-job') return route.fulfill({ json: { jobId: 'fixture-job', status: jobState, result: jobState === 'completed' ? { imageUrl: '/api/fixture-media' } : null, error: jobState === 'failed' ? { message: 'Fixture provider failure' } : null } });
      if (url.pathname.startsWith('/api/') || route.request().method() !== 'GET') {
        errors.push(`Unexpected request: ${route.request().method()} ${url.pathname}`);
        return route.abort();
      }
      return route.continue();
    });
    const page = await context.newPage();
    page.setDefaultTimeout(12000);
    page.on('pageerror', error => errors.push(error.message));
    const tab = name => page.getByRole('tab', { name: t(`cinematic.storyboard.workspace.${name}`), exact: true });
    for (const width of [1440, 820, 390]) {
      jobState = 'completed';
      await page.setViewportSize({ width, height: 950 });
      await page.goto(`${origin}/__shot-workspace-check`);
      await tab('image').waitFor();
      await page.locator('.cinematic-storyboard-approval-callout__action').waitFor();
      await page.evaluate(() => document.fonts.ready);
      const dialog = page.locator('.cinematic-storyboard-shot-dialog');
      assert.ok(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth + 1));
      if (width === 1440) assert.ok(await page.locator('.cinematic-storyboard-workspace__actions').evaluate(el => {
        const box = el.getBoundingClientRect();
        const footer = document.querySelector('.cinematic-storyboard-shot-dialog > .cinematic-dialog__footer').getBoundingClientRect();
        return box.height > 0 && box.bottom <= footer.top + 1;
      }), 'Generate actions must stay above the modal footer on desktop');
      assert.ok(await page.locator('.generation-result-grid img, .generation-result__media-surface img').first().evaluate(el => el.complete && el.naturalWidth > 0));
      await page.screenshot({ path: path.join(output, `${locale}-${width}-image.png`) });
      await page.getByRole('button', { name: t('cinematic.storyboard.editShot'), exact: true }).click();
      const editor = page.getByRole('region', { name: t('cinematic.storyboard.editShot'), exact: true });
      await editor.waitFor();
      const field = editor.getByRole('textbox', { name: t('cinematic.director.subjectAction'), exact: true });
      await field.fill('Hands hover just above the flowerpot rim.');
      await tab('video').click();
      await page.screenshot({ path: path.join(output, `${locale}-${width}-video.png`) });
      await tab('shot').click();
      assert.equal(await field.inputValue(), 'Hands hover just above the flowerpot rim.');
      await page.screenshot({ path: path.join(output, `${locale}-${width}-edit.png`) });
      await editor.getByRole('button', { name: t('cinematic.actions.cancel'), exact: true }).click();
      const details = page.locator('.studio-prompt-preview__details');
      assert.equal(await details.getAttribute('open'), null);
      await details.locator('summary').click();
      await page.getByRole('textbox', { name: t('cinematic.storyboard.compiledPrompt'), exact: true }).waitFor();
      await tab('image').click();
      for (const theme of ['fashion', 'creative']) {
        await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
        await page.screenshot({ path: path.join(output, `${locale}-${width}-${theme}.png`) });
        assert.ok(await page.locator('.cinematic-storyboard-workspace .status-notice__content > strong').first().evaluate(el =>
          getComputedStyle(el).color === getComputedStyle(el.closest('.cinematic-storyboard-shot-dialog')).color), 'Notice title follows the current theme text color');
      }
      await page.evaluate(() => document.documentElement.dataset.theme = 'default');
      if (width === 1440) {
        jobState = 'processing';
        await page.evaluate(() => window.refreshFixture());
        await page.locator('.cinematic-storyboard-workspace__media [data-processing-spinner]').first().waitFor();
        await page.screenshot({ path: path.join(output, `${locale}-processing.png`) });
        jobState = 'failed';
        await page.evaluate(() => window.refreshFixture());
        await page.getByText('Fixture provider failure', { exact: true }).first().waitFor();
        assert.equal(await page.locator('.cinematic-storyboard-workspace__media [data-processing-spinner]').count(), 0);
      }
    }
    await context.close();
  }
  assert.deepEqual(errors, []);
  console.log(`PASS real Shot modal EN/TH, 390/820/1440, themes, tabs, prompt, processing/failure. Screenshots: ${output}`);
} catch (error) {
  console.error(errors);
  for (const context of browser.contexts()) for (const page of context.pages()) {
    await page.screenshot({ path: path.join(output, 'failure.png'), fullPage: true });
    console.error((await page.locator('body').innerText()).slice(-4500));
  }
  console.error(`Screenshots: ${output}`);
  throw error;
} finally { await browser.close(); }

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { createSingleCharacterCinematicProject } from '../test/fixtures/cinematic/cinematicProjectFixtures.js';
import { storyboardKeyframeContractCompiler } from '../server/domain/cinematic/StoryboardKeyframeContractCompiler.js';

const origin = process.env.CINEMATIC_WEB_ORIGIN || 'http://127.0.0.1:6501';
const referenceMode = process.argv.includes('references');
assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname));
const moduleSource = await (await fetch(`${origin}/src/components/generation/GenerationExperience.tsx`)).text();
const version = moduleSource.match(/react\.js(\?v=[a-z0-9]+)/)?.[1] || '';
const actorModule = moduleSource.match(/"(\/src\/lib\/auth\/ActorProvider\.tsx[^"]*)"/)?.[1] || '/src/lib/auth/ActorProvider.tsx';
const featureModule = moduleSource.match(/"(\/src\/lib\/permissions\/FeaturePolicyProvider\.tsx[^"]*)"/)?.[1] || '/src/lib/permissions/FeaturePolicyProvider.tsx';
const output = await fs.mkdtemp(path.join(os.tmpdir(), 'mpf-shot-workspace-'));
const photo = await fs.readFile('client/assets/scene-builder/shot-recipes/cafe-seated-lifestyle.jpg');
const landscape = referenceMode ? await sharp(photo).resize(960, 540, { fit: 'contain', background: '#16191d' }).jpeg().toBuffer() : null;
const project = createSingleCharacterCinematicProject();
const scene = project.scenes[0], shot = scene.shots[0];
shot.approvedStoryboardSource.storyboardRenderStyle = 'faceless_previs_v1';
if (referenceMode) {
  project.setup = { ...project.setup, title: project.title, format: 'short-film', durationSeconds: 20 };
  const second = structuredClone(project.castAssignments[0]);
  second.id = 'cast_listener'; second.displayName = 'Listener with a long character name'; second.storyRole = 'Returning customer';
  project.castAssignments.push(second);
  project.castAssignments.forEach((cast, index) => {
    cast.sourceType = 'generated_sheet'; cast.characterProfileId = null; cast.characterProfileVersionId = null;
    cast.generatedSheet = { generationId: `sheet-${index}`, assetId: `asset-sheet-${index}`, contentHash: String(index + 1).repeat(64),
      previewUrl: `/api/fixtures/sheet-${index}`, modelId: 'fixture-image', sourceFingerprint: `sheet-fp-${index}`, assurance: 'user_confirmed' };
  });
  const previous = structuredClone(shot); previous.id = 'previous'; previous.title = 'Phone damage and a promise at the cafe';
  shot.orderKey = 2; scene.shots.unshift(previous); scene.shotOrder.unshift(previous.id);
  scene.approvedEnvironmentSource = { ...structuredClone(shot.approvedStoryboardSource), assetId: 'scene-environment', contentHash: 'e'.repeat(64),
    imageUrl: '/api/fixtures/environment-landscape', thumbnailUrl: '/api/fixtures/environment-landscape' };
  scene.environmentReferenceEnabled = true;
  shot.castAssignmentIds = project.castAssignments.map(cast => cast.id);
  scene.castAssignmentIds = [...shot.castAssignmentIds];
}
const generationContext = {
  schemaVersion: 1, projectId: project.id, projectVersion: project.version,
  sceneId: scene.id, shotId: shot.id, shotVersion: shot.version,
  characterProfileContext: null,
  references: { character_reference: '/api/fixture-media', outfit_front: null, outfit_back: null, style_reference: null },
  cast: [], looks: [], continuitySource: null,
  keyframeContract: storyboardKeyframeContractCompiler.compile({ project, scene, shot }),
  generationEligible: true, blockingReason: null
};
if (referenceMode) {
  generationContext.references = { outfit_front: null, outfit_back: null, style_reference: '/api/fixtures/job-previous-raw-id' };
  generationContext.cinematicCastReferences = project.castAssignments.map(cast => ({
    castAssignmentId: cast.id, displayName: cast.displayName, sourceType: 'generated_sheet',
    contentHash: cast.generatedSheet.contentHash, generationId: cast.generatedSheet.generationId
  }));
  generationContext.cinematicSceneReference = { assetId: scene.approvedEnvironmentSource.assetId, contentHash: scene.approvedEnvironmentSource.contentHash };
  generationContext.continuitySource = { shotId: 'previous', sourceFingerprint: 'previous-fp' };
  generationContext.cast = project.castAssignments.map(cast => ({ assignmentId: cast.id, displayName: cast.displayName, storyRole: cast.storyRole, identityReady: true }));
  generationContext.looks = project.castAssignments.map(cast => ({ lookId: cast.looks[0].id, assignmentId: cast.id, name: cast.looks[0].name, locked: true }));
}
const actor = { userId: 'fixture-owner', username: 'fixture', role: 'user', displayName: 'Fixture' };
const errors = [];
const browser = await chromium.launch({ headless: true });
try {
  for (const locale of ['en', 'th']) {
    if (referenceMode) {
      scene.title = locale === 'th' ? '\u0e23\u0e49\u0e32\u0e19\u0e01\u0e32\u0e41\u0e1f\u0e22\u0e32\u0e21\u0e40\u0e22\u0e47\u0e19\u0e2b\u0e25\u0e31\u0e07\u0e1d\u0e19\u0e15\u0e01' : 'The cafe after the evening rain';
      project.castAssignments[1].displayName = locale === 'th' ? '\u0e25\u0e39\u0e01\u0e04\u0e49\u0e32\u0e17\u0e35\u0e48\u0e01\u0e25\u0e31\u0e1a\u0e21\u0e32\u0e23\u0e31\u0e1a\u0e1f\u0e31\u0e07\u0e04\u0e33\u0e2a\u0e31\u0e0d\u0e0d\u0e32' : 'Listener with a long character name';
      generationContext.cinematicCastReferences[1].displayName = project.castAssignments[1].displayName;
    }
    const catalogs = {};
    for (const ns of ['cinematic', 'playground', 'react-ui']) catalogs[ns] = JSON.parse(await fs.readFile(`client/i18n/locales/${locale}/${ns}.json`, 'utf8'));
    const t = key => catalogs.cinematic[key];
    const context = await browser.newContext();
    let jobState = 'completed';
    let processingDelay = 0;
    let processingFailure = false;
    let toggleFailure = false;
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
        function Harness(){ const [value,setValue]=React.useState(p); window.updateFixture=setValue; return e(StoryboardShotDialog,{open:true,onOpenChange:()=>{},project:value,
          scene:value.scenes[0],shot:value.scenes[0].shots.find(shot=>shot.id===${JSON.stringify(shot.id)}),resumeJobId:'fixture-job',
          onProjectRefresh:async()=>{const next=await (await fetch('/__fixture-project')).json();setValue(next);await client.invalidateQueries();}}); }
        ReactDOM.createRoot(document.getElementById('root')).render(e(QueryClientProvider,{client},
          e(ActorProvider,null,e(FeaturePolicyProvider,null,e(MemoryRouter,null,e(I18nextProvider,{i18n},
            e(Harness)))))));
        </script></body></html>` });
      if (url.pathname === '/api/me') return route.fulfill({ json: actor });
      if (url.pathname === '/__fixture-project') return route.fulfill({ json: project });
      if (referenceMode && url.pathname.endsWith('/environment') && route.request().method() === 'PATCH') {
        if (toggleFailure) return route.fulfill({ status: 409, json: { error: 'Fixture scene save failed' } });
        const input = route.request().postDataJSON();
        scene.environmentReferenceEnabled = input.referenceEnabled;
        project.version += 1; generationContext.projectVersion = project.version;
        generationContext.cinematicSceneReference = input.referenceEnabled
          ? { assetId: scene.approvedEnvironmentSource.assetId, contentHash: scene.approvedEnvironmentSource.contentHash } : null;
        return route.fulfill({ json: project });
      }
      if (url.pathname === '/api/mock-users') return route.fulfill({ json: { enabled: false, users: [] } });
      if (url.pathname === '/api/community/features') return route.fulfill({ json: { community: {}, development: {}, routing: {} } });
      if (url.pathname === '/api/community/generations/fixture-job/share-status') return route.fulfill({ json: { shared: false } });
      if (referenceMode && url.pathname === '/api/fixtures/environment-landscape') return route.fulfill({ body: landscape, contentType: 'image/jpeg' });
      if (referenceMode && url.pathname === '/api/fixtures/missing') return route.fulfill({ status: 404, json: { error: 'Missing fixture image' } });
      if (url.pathname === '/api/fixture-media' || url.pathname.startsWith('/api/fixtures/')) return route.fulfill({ body: photo, contentType: 'image/jpeg' });
      if (url.pathname === '/api/providers') return route.fulfill({ json: { defaultProvider: 'modelark', providers: [{ id: 'modelark', displayName: 'Seedream', defaultModel: 'fixture-image', models: [{
        id: 'fixture-image', displayName: 'Seedream 5.0 Pro', capabilities: { imageGeneration: true, imageReferences: true, maxReferenceImages: 6, aspectRatios: ['9:16', '16:9', '1:1'], resolutions: ['2K', '4K'] }, defaults: { resolution: '2K' }
      }] }] } });
      if (url.pathname === '/api/cinematic/video-capabilities') return route.fulfill({ json: { schemaVersion: 1, catalogVersion: 'fixture', mediaType: 'video', models: [], comparison: { enabled: false, minimumSlots: 2, maximumSlots: 2 }, launchStatus: 'available' } });
      if (url.pathname.endsWith('/storyboard-generation-context')) return route.fulfill({ json: generationContext });
      if (url.pathname === '/api/credits/account') return route.fulfill({ json: { account: { userId: actor.userId, availableCredits: 100, reservedCredits: 0, status: 'active' } } });
      if (url.pathname === '/api/credits/estimate') return route.fulfill({ json: { estimate: { estimateId: 'fixture', estimatedCredits: 12, expiresAt: Date.now() + 60000 }, account: { availableCredits: 100, canAfford: true } } });
      if (url.pathname === '/api/references/processing-plan') {
        if (processingDelay) await new Promise(resolve => setTimeout(resolve, processingDelay));
        if (processingFailure) return route.fulfill({ status: 409, json: { error: 'Fixture reference processing failed' } });
        const input = route.request().postDataJSON();
        const rows = referenceMode ? [
          ...generationContext.cinematicCastReferences.map((cast, index) => ({ slotId: `cinematic_cast_${index}`, role: 'character_reference', intent: 'identity', status: index ? 'warning' : 'accepted' })),
          { slotId: 'style_reference', role: 'style_reference', intent: 'style', status: 'accepted' },
          ...(input.generationRequest?.cinematicSceneReference ? [{ slotId: 'cinematic_environment', role: 'environment_reference', intent: 'environment', status: 'accepted' }] : [])
        ] : [];
        return route.fulfill({ json: { status: 'accepted', policyVersion: 'fixture', planFingerprint: 'fixture', publicAuthorityProjection: {
          schemaVersion: 1, policyVersion: 'fixture', planFingerprint: 'fixture', references: rows,
          warnings: referenceMode ? [{ code: 'low_confidence', severity: 'warning', role: 'character_identity_pack' }] : []
        }, effectiveSelections: {}, providerPlan: { referenceCount: referenceMode ? rows.length : 1, executionMode: 'single_stage' } } });
      }
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
      if (referenceMode) project.castAssignments[1].generatedSheet.previewUrl = '/api/fixtures/sheet-1';
      await page.setViewportSize({ width, height: 950 });
      await page.goto(`${origin}/__shot-workspace-check`);
      await tab('image').waitFor();
      await page.locator('.cinematic-storyboard-approval-callout__action').waitFor();
      await page.evaluate(() => document.fonts.ready);
      if (referenceMode) {
        const references = page.locator('.reference-slot-grid--rows');
        await references.scrollIntoViewIfNeeded();
        await page.waitForFunction(() => document.querySelectorAll('.reference-source-row img').length === 2);
        assert.equal(await references.locator('.reference-source-row').count(), 2);
        assert.equal(await references.getByRole('button').count(), 1, 'Only Scene selection is a reference button; Cast remains read-only');
        const heading = references.locator('.reference-slot-grid__heading');
        await page.waitForFunction(() => /4/.test(document.querySelector('.reference-slot-grid__heading').textContent));
        assert.ok((await heading.innerText()).includes('6'));
        await references.locator('.reference-row-status.is-warning').waitFor();
        await references.locator('.reference-processing-summary__roles .reference-processing-role').waitFor();
        assert.equal(await references.locator('.reference-processing-summary__roles .reference-processing-role').count(), 1, 'Named Cast/style status belongs inside its row');
        assert.ok(await references.evaluate(el => el.scrollWidth <= el.clientWidth + 1));
        assert.ok(await references.locator('img').evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0 && getComputedStyle(image).objectFit === 'contain')));
        assert.ok(await references.locator('.cinematic-scene-environment__preview img').evaluate(img => img.naturalWidth > img.naturalHeight));
        assert.ok(await references.locator('.reference-source-row__preview img').first().evaluate(img => img.naturalHeight > img.naturalWidth));
        assert.ok(await references.locator('img').evaluateAll(images => images.every(img => {
          const box = img.getBoundingClientRect(), parent = img.parentElement.getBoundingClientRect();
          return box.width <= parent.width + 1 && box.height <= parent.height + 1;
        })), 'Images stay within their fixed preview box');
        const boxes = await references.locator('.reference-source-row__preview, .reference-slot__preview, .cinematic-scene-environment__preview').evaluateAll(elements => elements.map(el => {
          const box = el.getBoundingClientRect(); return [Math.round(box.width), Math.round(box.height)];
        }));
        assert.equal(new Set(boxes.map(box => box.join('x'))).size, 1, 'All reference thumbnail boxes align');
        assert.equal(await page.getByRole('tab').count(), 3);
        for (const theme of ['default', 'fashion', 'creative']) {
          await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
          await references.screenshot({ path: path.join(output, `references-${locale}-${width}-${theme}.png`) });
        }
        const toggle = references.getByRole('switch', { name: t('cinematic.environment.enabled') });
        await toggle.focus(); await page.keyboard.press('Space');
        await page.waitForFunction(() => document.querySelector('.cinematic-scene-environment.is-inactive'));
        await page.waitForFunction(() => /3/.test(document.querySelector('.reference-slot-grid__heading').textContent));
        assert.equal(await references.locator('.cinematic-scene-environment__preview img').count(), 1);
        await references.screenshot({ path: path.join(output, `references-${locale}-${width}-off.png`) });
        await toggle.click();
        await page.waitForFunction(() => !document.querySelector('.cinematic-scene-environment.is-inactive'));
        await page.waitForFunction(() => /4/.test(document.querySelector('.reference-slot-grid__heading').textContent));
        if (width === 1440) {
          processingDelay = 1200;
          await page.evaluate(() => window.refreshFixture());
          await references.locator('[data-processing-spinner]').first().waitFor();
          assert.equal(await references.locator('.reference-source-row img').count(), 2);
          await page.waitForTimeout(1500); processingDelay = 0;
          processingFailure = true;
          await page.evaluate(() => window.refreshFixture());
          await references.getByRole('alert').waitFor();
          assert.equal(await references.locator('.reference-source-row img').count(), 2);
          processingFailure = false;
          await page.evaluate(() => window.refreshFixture());
          await page.waitForTimeout(300);
          toggleFailure = true;
          await toggle.click(); await references.locator('.cinematic-scene-environment [role="alert"]').waitFor();
          assert.equal(await toggle.getAttribute('aria-checked'), 'true');
          toggleFailure = false;
          project.castAssignments[1].generatedSheet.previewUrl = '/api/fixtures/missing';
          await page.evaluate(async () => window.updateFixture(await (await fetch('/__fixture-project')).json()));
          await page.waitForFunction(() => document.querySelectorAll('.reference-source-row img').length === 1);
          assert.equal(await references.locator('.reference-source-row__preview').count(), 2, 'Missing image retains its named source and stable box');
          await references.screenshot({ path: path.join(output, `references-${locale}-missing.png`) });
          project.castAssignments[1].generatedSheet.previewUrl = '/api/fixtures/sheet-1';
        }
        continue;
      }
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
  console.log(`PASS ${referenceMode ? 'named reference rows/count/OFF/keyboard/processing/error' : 'real Shot modal/tabs/prompt/processing/failure'} EN/TH, 390/820/1440, themes. Screenshots: ${output}`);
} catch (error) {
  console.error(errors);
  for (const context of browser.contexts()) for (const page of context.pages()) {
    await page.screenshot({ path: path.join(output, 'failure.png'), fullPage: true });
    console.error((await page.locator('body').innerText()).slice(-4500));
  }
  console.error(`Screenshots: ${output}`);
  throw error;
} finally { await browser.close(); }

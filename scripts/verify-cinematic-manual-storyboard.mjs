import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import { createSingleCharacterCinematicProject } from '../test/fixtures/cinematic/cinematicProjectFixtures.js';
import { createCinematicProjectRecord } from '../server/repositories/cinematic/cinematicProjectRecord.js';
import { createManualStoryboardScene } from '../server/domain/cinematic/CinematicManualStoryboard.js';
import { CinematicApplicationService } from '../server/domain/cinematic/CinematicApplicationService.js';

const origin = process.env.CINEMATIC_WEB_ORIGIN || 'http://127.0.0.1:6501';
const group = process.argv[2] || 'all';
assert.ok(['all', 'scene-gallery'].includes(group));
assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname));
const moduleSource = await (await fetch(`${origin}/src/components/generation/GenerationExperience.tsx`)).text();
const version = moduleSource.match(/react\.js(\?v=[a-z0-9]+)/)?.[1] || '';
const actorModule = moduleSource.match(/"(\/src\/lib\/auth\/ActorProvider\.tsx[^"]*)"/)?.[1] || '/src/lib/auth/ActorProvider.tsx';
const featureModule = moduleSource.match(/"(\/src\/lib\/permissions\/FeaturePolicyProvider\.tsx[^"]*)"/)?.[1] || '/src/lib/permissions/FeaturePolicyProvider.tsx';
const output = await fs.mkdtemp(path.join(os.tmpdir(), 'mpf-manual-storyboard-'));
const photo = await fs.readFile('client/assets/scene-builder/shot-recipes/cafe-seated-lifestyle.jpg');
const actor = { userId: 'usr_fixture_owner', username: 'fixture_owner', role: 'user', displayName: 'Fixture' };
const errors = [];
const browser = await chromium.launch({ headless: true });
try {
  for (const locale of ['en', 'th']) {
    let project = createCinematicProjectRecord({ title: 'Night at the flower shop', format: 'short-film', platform: 'reels', durationSeconds: 30,
      storyBrief: 'A quiet evening at the flower shop.', creativeDirection: '', genre: 'drama', audienceFeeling: 'moved', pacing: 'balanced',
      endingIntent: 'resolved', mode: 'simple', castPlanningMode: 'manual', storyRoleSlots: [] }, actor);
    const original = createSingleCharacterCinematicProject();
    project.castAssignments = original.castAssignments;
    project.scenes = original.scenes;
    project.generationAttempts = [original.generationAttempts[0]];
    const first = project.scenes[0].shots[0];
    first.manualStoryboard = true; first.storyboardFaceless = false;
    first.videoActionTimeline = [{ startMs: 0, endMs: 6000, description: 'She slowly reaches toward the flowerpot. Hands remain visible.' }];
    first.videoReferenceMode = 'storyboard_and_looks';
    first.approvedStoryboardSource.storyboardRenderStyle = 'photorealistic_storyboard_v1';
    delete first.approvedVideoAttemptId;
    let sequence = 0;
    const second = createManualStoryboardScene(project, prefix => `${prefix}_fixture_${++sequence}`);
    project.scenes.push(second);
    if (group === 'scene-gallery') project.generationAttempts.push(
      { id: 'scene_old', operation: 'cinematic_scene_environment', sceneId: second.id, generationJobId: 'job_environment_old', promptFingerprint: 'old' },
      { id: 'scene_new', operation: 'cinematic_scene_environment', sceneId: project.scenes[0].id, generationJobId: 'job_environment_new', promptFingerprint: 'new' }
    );
    const service = new CinematicApplicationService({
      repository: { findForActor: async () => structuredClone(project), mutateForActor: async (_id, _actor, fn) => {
        const draft = structuredClone(project), result = await fn(draft); project = draft; return structuredClone(result);
      } },
      assetRepository: { findByIdForOwner: async () => ({ publicUrl: '/api/fixture-media' }) },
      storyboardAssetService: {
        getGenerationPreview: async jobId => ({ jobId, imageUrl: '/api/fixture-media', thumbnailUrl: '/api/fixture-media' }),
        resolveSceneReference: async value => value,
        approveGenerationResult: async ({ jobId }) => ({ ...first.approvedStoryboardSource,
        assetId: 'asset_environment_fixture', contentHash: 'c'.repeat(64), sourceJobId: jobId,
        imageUrl: '/api/fixture-media', thumbnailUrl: '/api/fixture-media' }) },
      videoGenerationService: { getStoredTaskSummaries: async () => [] }
    });
    const catalogs = {};
    for (const ns of ['cinematic', 'playground', 'react-ui']) catalogs[ns] = JSON.parse(await fs.readFile(`client/i18n/locales/${locale}/${ns}.json`, 'utf8'));
    const t = key => catalogs.cinematic[key];
    const context = await browser.newContext();
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin !== origin) return route.abort();
      if (url.pathname === '/__manual-storyboard-check') return route.fulfill({ contentType: 'text/html', body: `<!doctype html>
        <html data-theme="default"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
        <body><main id="root" style="padding:16px;max-width:1440px;margin:auto"></main><script type="module">
        import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);
        window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;
        await import('/src/styles/globals.css');
        const {default:React}=await import('/node_modules/.vite/deps/react.js${version}');
        const {default:ReactDOM}=await import('/node_modules/.vite/deps/react-dom_client.js${version}');
        const {MemoryRouter}=await import('/node_modules/.vite/deps/react-router-dom.js${version}');
        const {QueryClient,QueryClientProvider}=await import('/node_modules/.vite/deps/@tanstack_react-query.js${version}');
        const {default:i18n}=await import('/node_modules/.vite/deps/i18next.js${version}');
        const {I18nextProvider,initReactI18next}=await import('/node_modules/.vite/deps/react-i18next.js${version}');
        const {ActorProvider}=await import(${JSON.stringify(actorModule)});
        const {FeaturePolicyProvider}=await import(${JSON.stringify(featureModule)});
        const {CinematicStageContent}=await import('/src/features/cinematic/components/CinematicStageContent.tsx');
        const {CinematicStageRail}=await import('/src/features/cinematic/components/CinematicStageRail.tsx');
        const {getCinematicProject}=await import('/src/features/cinematic/api/cinematicApi.ts');
        await i18n.use(initReactI18next).init({lng:${JSON.stringify(locale)},keySeparator:false,interpolation:{prefix:'{',suffix:'}',escapeValue:false},resources:{${locale}:${JSON.stringify(catalogs)}}});
        const e=React.createElement, client=new QueryClient({defaultOptions:{queries:{retry:false}}});
        function App(){const[p,setProject]=React.useState(${JSON.stringify(project)});const[dirty,setDirty]=React.useState(false); const refresh=()=>getCinematicProject(p.id).then(setProject);
          const mode=new URLSearchParams(location.search).get('mode')==='advanced'?'advanced':'simple';
          return e(React.Fragment,null,e(CinematicStageRail,{mode,activeStage:'storyboard',onStageChange:dirty?undefined:()=>{}}),
            e(CinematicStageContent,{mode,activeStage:'storyboard',project:p,onPrevious:()=>{},onNext:()=>{},onDirtyChange:setDirty,onProjectChanged:setProject,onProjectRefresh:refresh}));}
        ReactDOM.createRoot(document.getElementById('root')).render(e(QueryClientProvider,{client},e(ActorProvider,null,e(FeaturePolicyProvider,null,e(MemoryRouter,null,e(I18nextProvider,{i18n},e(App)))))));
        </script></body></html>` });
      if (url.pathname === '/api/me') return route.fulfill({ json: actor });
      if (url.pathname === '/api/mock-users') return route.fulfill({ json: { enabled: false, users: [] } });
      if (url.pathname === '/api/community/features') return route.fulfill({ json: { community: {}, development: {}, routing: {} } });
      if (url.pathname.includes('/share-status')) return route.fulfill({ json: { shared: false } });
      if (url.pathname === '/api/fixture-media' || url.pathname.startsWith('/api/fixtures/')) return route.fulfill({ body: photo, contentType: 'image/jpeg' });
      if (url.pathname === `/api/cinematic/projects/${project.id}`) return route.fulfill({ json: project });
      const scene = project.scenes.find(value => url.pathname.includes(`/scenes/${value.id}/`));
      const shot = scene?.shots.find(value => url.pathname.includes(`/shots/${value.id}/`));
      if (scene && url.pathname.endsWith('/environment')) return route.fulfill({ json: request.method() === 'PATCH'
        ? await service.saveSceneEnvironment(project.id, scene.id, request.postDataJSON(), actor)
        : await service.getSceneEnvironmentContext(project.id, scene.id, actor) });
      if (scene && url.pathname.endsWith('/environment/approve')) return route.fulfill({ json: await service.approveSceneEnvironment(project.id, scene.id, request.postDataJSON(), actor) });
      if (scene && url.pathname.endsWith('/environment/images')) return route.fulfill({ json: await service.listSceneEnvironmentImages(project.id, scene.id, actor, Object.fromEntries(url.searchParams)) });
      if (url.pathname.endsWith('/storyboard-generation-batches')) {
        const input = request.postDataJSON(), operation = input.operations[0];
        assert.equal(operation.purpose, 'scene_environment');
        assert.equal(operation.generationRequest.cinematicContainsPeople, false);
        assert.equal(operation.generationRequest.cinematicFaceless, false);
        assert.equal(operation.generationRequest.outputCount, 1);
        const jobId = `job_environment_${++sequence}`, batchId = `batch_environment_${sequence}`;
        await service.registerStoryboardBatchAttempts(project.id, { expectedVersion: input.expectedVersion, batchId,
          children: [{ jobId, sceneId: operation.sceneId, metadata: { purpose: 'scene_environment',
            expectedSceneVersion: operation.expectedSceneVersion, promptFingerprint: operation.promptFingerprint } }] }, actor);
        return route.fulfill({ status: 202, json: { batchId, groupId: batchId, status: 'queued', requestedOutputCount: 1, acceptedCount: 1, failedCount: 0,
          children: [{ operationId: operation.operationId, sceneId: operation.sceneId, shotId: null, jobId, status: 'queued', error: null }] } });
      }
      if (shot && url.pathname.endsWith('/storyboard-generation-context')) return route.fulfill({ json: await service.getStoryboardGenerationContext(project.id, scene.id, shot.id, actor) });
      if (shot && url.pathname.endsWith('/produce-context')) return route.fulfill({ json: await service.getProduceShotContext(project.id, scene.id, shot.id, actor, url.searchParams.get('referenceMode')) });
      if (shot && url.pathname.endsWith('/manual-storyboard')) return route.fulfill({ json: await service.saveManualStoryboard(project.id, scene.id, shot.id, request.postDataJSON(), actor) });
      if (shot && url.pathname.endsWith('/storyboard-settings')) return route.fulfill({ json: await service.updateStoryboardSettings(project.id, scene.id, shot.id, request.postDataJSON(), actor) });
      if (url.pathname.endsWith('/simple-scenes')) return route.fulfill({ json: await service.createSimpleScene(project.id, request.postDataJSON(), actor) });
      if (url.pathname === '/api/providers') return route.fulfill({ json: { defaultProvider: 'modelark', providers: [{ id: 'modelark', displayName: 'Seedream', defaultModel: 'fixture-image', models: [{
        id: 'fixture-image', displayName: 'Seedream 5.0 Pro', capabilities: { imageGeneration: true, imageReferences: true, maxReferenceImages: 6, aspectRatios: ['9:16', '16:9', '1:1'], resolutions: ['2K', '4K'] }, defaults: { resolution: '2K' }
      }] }] } });
      if (url.pathname === '/api/cinematic/video-capabilities') return route.fulfill({ json: { schemaVersion: 3, catalogVersion: 'fixture', mediaType: 'video', launchStatus: 'available', comparison: { enabled: false, minimumSlots: 2, maximumSlots: 2 }, models: [{
        providerId: 'modelark', modelId: 'seedance-fixture', displayName: 'Seedance 2.5', operations: ['image_to_video'], commercialOperations: ['cinematic_draft_clip'], inputModes: ['image_to_video', 'text_to_video', 'multimodal_reference'],
        durationControlMode: 'exact', durations: [4, 5, 6, 8], resolutions: ['720p', '1080p'], aspectRatios: ['9:16'], audioModes: ['generated', 'none'], referenceImageLimit: 9,
        supportsFirstFrame: true, firstFrameEnabled: false, supportsCinematicLookReferences: true, supportsLastFrame: false, qualificationStatus: 'internal_testing', paidRoutingEnabled: false, testingRoutingEnabled: true
      }] } });
      if (url.pathname.endsWith('/video-quote')) {
        const input = request.postDataJSON();
        return route.fulfill({ json: { estimate: { estimateId: 'fixture-video', estimatedCredits: 24, expiresAt: new Date(Date.now() + 60000).toISOString(), breakdown: {} }, account: { availableCredits: 100, canAfford: true },
          requestFingerprint: 'fixture', projectId: project.id, sceneId: scene.id, shotId: shot.id, shotVersion: shot.version, sourceFingerprint: input.sourceFingerprint,
          videoPacketFingerprint: input.videoPacketFingerprint, approvedStoryboardAssetVersionId: shot.approvedStoryboardSource?.assetVersionId || null, referenceMode: input.referenceMode, renderedPrompt: input.prompt } });
      }
      if (url.pathname === '/api/credits/account') return route.fulfill({ json: { account: { userId: actor.userId, availableCredits: 100, reservedCredits: 0, status: 'active' } } });
      if (url.pathname === '/api/credits/estimate') return route.fulfill({ json: { estimate: { estimateId: 'fixture', estimatedCredits: 12, expiresAt: Date.now() + 60000 }, account: { availableCredits: 100, canAfford: true } } });
      if (url.pathname === '/api/references/processing-plan') return route.fulfill({ json: { status: 'accepted', policyVersion: 'fixture', planFingerprint: 'fixture', publicAuthorityProjection: { schemaVersion: 1, policyVersion: 'fixture', planFingerprint: 'fixture' }, effectiveSelections: {}, providerPlan: { referenceCount: 1, executionMode: 'single_stage' } } });
      if (url.pathname === '/api/jobs/job_storyboard_single') return route.fulfill({ json: { jobId: 'job_storyboard_single', status: 'completed', result: { imageUrl: '/api/fixture-media' } } });
      if (url.pathname.startsWith('/api/jobs/job_environment_')) return route.fulfill({ json: { jobId: url.pathname.split('/').at(-1), status: 'completed', result: { imageUrl: '/api/fixture-media' } } });
      if (url.pathname.startsWith('/api/') || request.method() !== 'GET') {
        errors.push(`Unexpected request: ${request.method()} ${url.pathname}`); return route.abort();
      }
      return route.continue();
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    page.setDefaultTimeout(12000);
    for (const width of [1440, 820, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(`${origin}/__manual-storyboard-check`);
      await page.locator('.cinematic-inline-image .cinematic-storyboard-approval-callout__action').waitFor();
      const generateVideo = page.getByRole('button', { name: t('cinematic.produce.generate'), exact: true });
      await generateVideo.waitFor();
      await page.evaluate(() => document.fonts.ready);
      if (group === 'scene-gallery') {
        const control = page.locator('.cinematic-scene-environment').first();
        await control.getByRole('button').first().click();
        const dialog = page.locator('.cinematic-environment-dialog');
        const images = dialog.locator('.cinematic-environment-gallery__item');
        await images.first().waitFor();
        assert.equal(await images.count(), 2);
        await images.nth(1).click();
        await page.waitForFunction(() => document.querySelectorAll('.cinematic-environment-gallery__item[aria-pressed="true"]').length === 1);
        assert.equal(project.scenes[0].approvedEnvironmentSource.sourceJobId, 'job_environment_old');
        assert.ok(await images.nth(1).locator('img').evaluate(image => image.complete && image.naturalWidth > 0));
        assert.ok(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth + 1));
        await dialog.screenshot({ path: path.join(output, `${locale}-${width}-gallery.png`) });
        await dialog.locator('.cinematic-dialog__footer button').click();
        const toggle = control.getByRole('switch', { name: t('cinematic.environment.enabled') });
        await toggle.click();
        await page.waitForFunction(() => document.querySelector('.cinematic-scene-environment [role="switch"]')?.getAttribute('aria-checked') === 'false');
        const disabledContext = await service.getStoryboardGenerationContext(project.id, project.scenes[0].id, first.id, actor);
        assert.equal(disabledContext.cinematicSceneReference, null);
        assert.equal(project.scenes[0].approvedEnvironmentSource.sourceJobId, 'job_environment_old');
        await toggle.click();
        await page.waitForFunction(() => document.querySelector('.cinematic-scene-environment [role="switch"]')?.getAttribute('aria-checked') === 'true');
        assert.ok((await service.getStoryboardGenerationContext(project.id, project.scenes[0].id, first.id, actor)).cinematicSceneReference);
        await page.goto(`${origin}/__manual-storyboard-check?mode=advanced`);
        await page.locator('.cinematic-storyboard-board .cinematic-scene-environment').first().waitFor();
        assert.equal(await page.locator('.cinematic-storyboard-board .cinematic-scene-environment').count(), project.scenes.length);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        await page.screenshot({ path: path.join(output, `${locale}-${width}-gallery-board.png`), fullPage: true });
        continue;
      }
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `overflow ${locale}/${width}`);
      assert.ok(await page.locator('.cinematic-inline-image img').first().evaluate(image => image.complete && image.naturalWidth > 0));
      await page.screenshot({ path: path.join(output, `${locale}-${width}-rows.png`), fullPage: true });
      await page.locator('.cinematic-inline-video .cinematic-produce-render-panel').scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(output, `${locale}-${width}-video.png`) });
      await page.locator('.cinematic-scene-environment button').first().click();
      const environmentDialog = page.locator('.cinematic-environment-dialog');
      await environmentDialog.getByRole('textbox', { name: t('cinematic.environment.direction'), exact: true }).waitFor();
      await environmentDialog.getByRole('textbox', { name: t('cinematic.environment.direction'), exact: true }).fill(`Empty flower shop, wet street and amber lights. ${locale} ${width}`);
      await environmentDialog.getByRole('button', { name: t('cinematic.environment.save'), exact: true }).click();
      await page.waitForFunction(() => !document.querySelector('.cinematic-environment-dialog textarea')?.disabled);
      await page.waitForFunction(() => document.querySelector('.cinematic-environment-dialog .generation-command-bar strong')?.textContent?.includes('12'));
      await environmentDialog.getByRole('button', { name: catalogs.playground['playground.action.generate'], exact: true }).click();
      await environmentDialog.getByRole('button', { name: t('cinematic.environment.use'), exact: true }).click();
      await environmentDialog.locator('.cinematic-environment-dialog__approved img').waitFor();
      assert.equal(project.scenes[0].approvedEnvironmentSource.assetId, 'asset_environment_fixture');
      assert.ok(await environmentDialog.evaluate(element => element.scrollWidth <= element.clientWidth + 1), `Scene dialog overflow ${locale}/${width}`);
      await environmentDialog.screenshot({ path: path.join(output, `${locale}-${width}-environment.png`) });
      await environmentDialog.locator('.cinematic-environment-dialog__body').evaluate(element => { element.scrollTop = 0; });
      await environmentDialog.screenshot({ path: path.join(output, `${locale}-${width}-environment-top.png`) });
      await environmentDialog.locator('.cinematic-dialog__footer').getByRole('button', { name: t('cinematic.actions.close'), exact: true }).click();
      const imagePrompt = page.getByRole('textbox', { name: t('cinematic.manual.imagePrompt'), exact: true }).first();
      const editedPrompt = `A natural full-color opening frame. Both hands hover above the flowerpot rim. Fixture ${locale} ${width}.`;
      await imagePrompt.fill(editedPrompt);
      await page.waitForFunction(() => document.querySelector('.cinematic-inline-video .cinematic-produce-render-panel__footer button')?.disabled === true);
      assert.equal(await generateVideo.isEnabled(), false);
      await page.waitForFunction(() => [...document.querySelectorAll('.cinematic-authoring-mode button')].every(button => button.disabled));
      assert.equal(await page.getByRole('button', { name: t('cinematic.mode.advanced'), exact: true }).isEnabled(), false);
      assert.ok(await page.locator('.cinematic-stage-navigation__stage').evaluateAll(buttons => buttons.every(button => button.disabled)));
      await page.locator('.cinematic-manual__activate').nth(1).click();
      await page.locator('.cinematic-manual__activate').first().click();
      assert.equal(await imagePrompt.inputValue(), editedPrompt);
      await page.getByRole('button', { name: t('cinematic.manual.save'), exact: true }).first().click();
      await page.locator('.cinematic-manual__row.is-active .cinematic-manual__save-status').filter({ hasText: t('cinematic.manual.saved') }).waitFor();
      assert.equal(project.scenes[0].shots[0].prompt, editedPrompt);
      await page.waitForFunction(() => [...document.querySelectorAll('.cinematic-authoring-mode button')].every(button => !button.disabled));
      assert.equal(await page.getByRole('button', { name: t('cinematic.mode.advanced'), exact: true }).isEnabled(), true);
      await page.getByRole('switch', { name: t('cinematic.storyboard.faceless'), exact: true }).waitFor();
      await page.waitForFunction(() => !document.querySelector('.cinematic-manual__row.is-active [role="switch"][aria-label]')?.disabled);
      const faceless = page.getByRole('switch', { name: t('cinematic.storyboard.faceless'), exact: true });
      if (await faceless.getAttribute('aria-checked') !== 'true') await faceless.click();
      const treatment = page.getByRole('combobox', { name: t('cinematic.storyboard.facialTreatment'), exact: true });
      await treatment.selectOption('white_previs');
      await page.waitForFunction(() => document.querySelector('.cinematic-facial-treatment select')?.value === 'white_previs'
        && !document.querySelector('.cinematic-facial-treatment select')?.disabled);
      assert.equal(project.scenes[0].shots[0].storyboardFacialTreatment, 'white_previs');
      await treatment.scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(output, `${locale}-${width}-treatment.png`) });
      await page.goto(`${origin}/__manual-storyboard-check?mode=advanced`);
      await page.locator('.cinematic-storyboard-board .cinematic-scene-environment button').first().waitFor();
      assert.equal(await page.locator('.cinematic-storyboard-board .cinematic-scene-environment').count(), project.scenes.length);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Advanced board overflow ${locale}/${width}`);
      await page.screenshot({ path: path.join(output, `${locale}-${width}-advanced-board.png`), fullPage: true });
    }
    await context.close();
  }
  assert.deepEqual(errors, []);
  console.log(`PASS ${group} Storyboard real embedded owners EN/TH 390/820/1440. Screenshots: ${output}`);
} finally { if (errors.length) console.error(errors); await browser.close(); }

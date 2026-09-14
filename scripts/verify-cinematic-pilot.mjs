import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import { cinematicFieldManifestService } from '../server/domain/cinematic/CinematicFieldManifestService.js';
import { CinematicApplicationService } from '../server/domain/cinematic/CinematicApplicationService.js';
import { VideoCapabilityRegistry } from '../server/domain/generation/VideoCapabilityRegistry.js';
import { createSingleCharacterCinematicProject } from '../test/fixtures/cinematic/cinematicProjectFixtures.js';

const origin = process.env.CINEMATIC_WEB_ORIGIN || 'http://127.0.0.1:6501';
const mediaOnly = process.argv.includes('--media-only');
const recoveryOnly = process.argv.includes('--recovery-only');
assert.ok(!mediaOnly || !recoveryOnly, 'Choose only one isolated browser branch');
assert.ok(process.argv.slice(2).every(arg => ['--media-only', '--recovery-only'].includes(arg)), 'Unknown browser branch');
assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname));
const source = await (await fetch(`${origin}/src/lib/auth/ActorProvider.tsx`)).text();
const version = source.match(/react\.js(\?v=[a-z0-9]+)/)?.[1] || '';
const output = await fs.mkdtemp(path.join(os.tmpdir(), 'mpf-cinematic-pilot-'));
const project = createSingleCharacterCinematicProject(), scene = project.scenes[0], shot = scene.shots[0];
shot.videoReferenceMode = 'looks_only'; shot.approvedVideoAttemptId = null; shot.audioDirectionVersion = 1;
scene.cinematicOpening = true;
shot.dialogueCues = ['Wait. You forgot your letter.', 'I thought the last train had left.', 'There is still time.'].map((text, i) => ({ text, speakerCastAssignmentId: project.castAssignments[0].id, offscreenVoiceRole: '', delivery: 'Quietly, with a held breath', startOffsetMs: i * 1000, estimatedDurationMs: 700, speakerVisible: true }));
shot.audioCues = [{ kind: 'ambience', source: 'scene', description: 'Rain against the station roof', startOffsetMs: 0, durationMs: shot.durationMs }];
project.generationAttempts = Array.from({ length: 10 }, (_, i) => ({ id: `take_${i+1}`, shotId: shot.id, sceneId: scene.id, operation: 'cinematic_draft_clip', status: 'completed', modelId: 'dreamina-seedance-2-5-260628', providerId: 'modelark' }));
if (recoveryOnly) {
  project.generationAttempts = [
    { ...project.generationAttempts[0], id: 'recovery_old_take', generationJobId: 'videotask_recovery_old', createdAt: '2026-09-13T00:00:00Z' },
    { ...project.generationAttempts[1], id: 'recovery_review_take', generationJobId: 'videotask_recovery_review', status: 'reconciliation_required', createdAt: '2026-09-13T00:01:00Z' }
  ];
  shot.approvedVideoAttemptId = 'recovery_old_take';
}
const service = new CinematicApplicationService(); service.getProject = async () => structuredClone(project);
const contextData = await service.getProduceShotContext(project.id, scene.id, shot.id, {}, 'looks_only');
const model = new VideoCapabilityRegistry({ seedanceFirstFrameEnabled: false, developmentPocEnabled: true }).resolve('modelark', 'dreamina-seedance-2-5-260628');
const browser = await chromium.launch({ headless: true });
const errors = [], requests = [];
const recoveryLayoutFindings = [], recoveryEvidence = [];
try {
  for (const locale of ['en', 'th']) {
    const namespaces = {};
    for (const ns of ['cinematic', 'playground', 'react-ui']) namespaces[ns] = JSON.parse(await fs.readFile(new URL(`../client/i18n/locales/${locale}/${ns}.json`, import.meta.url), 'utf8'));
    const labels = namespaces.cinematic;
    const context = await browser.newContext();
    const recovery = { phase: 'cooldown', explicitChecks: 0, reads: 0, urls: [], release: null };
    const recoveryResponse = () => ({
      id: 'videotask_recovery_review', status: 'reconciliation_required', billingStatus: 'reserved',
      projectId: project.id, sceneId: scene.id, shotId: shot.id,
      automaticMonitoring: false, reviewRequired: true, recheckAllowed: recovery.phase === 'eligible',
      recovery: { stage: 'provider', policyVersion: 'video-recovery-v1',
        startedAt: '2026-09-12T00:00:00Z', deadlineAt: '2026-09-13T00:00:00Z', nextCheckAt: null,
        stoppedReason: 'video_recovery_deadline_elapsed', explicitCheckCount: recovery.explicitChecks,
        explicitMaxChecks: 3, ...(recovery.phase === 'eligible' ? {} : { explicitNextCheckAt: new Date(Date.now() + 60_000).toISOString() }) },
      outputAsset: { publicUrl: recovery.urls[1], technicalProbe: { status: 'passed' } }
    });
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin !== origin) return route.abort();
      if (url.pathname.startsWith('/api/')) {
        requests.push(`${request.method()} ${url.pathname}`);
        if (recoveryOnly && url.pathname.startsWith('/api/generation/video/tasks/')) {
          assert.equal(request.method(), 'GET', 'Recovery never submits a replacement');
          if (url.pathname.endsWith('/videotask_recovery_old') && !url.search) return route.fulfill({ json: {
            id: 'videotask_recovery_old', status: 'completed', billingStatus: 'captured',
            outputAsset: { publicUrl: recovery.urls[0], technicalProbe: { status: 'passed' } }
          } });
          assert.equal(url.pathname, '/api/generation/video/tasks/videotask_recovery_review', 'Only the same review task may be rechecked');
          if (url.search) {
            assert.equal(url.search, '?recheck=true');
            assert.equal(recovery.phase, 'eligible', 'No recheck during cooldown or another pending request');
            assert.equal(++recovery.explicitChecks, 1, 'Exactly one explicit provider-status request');
            recovery.phase = 'pending';
            await new Promise(resolve => { recovery.release = resolve; });
            recovery.phase = 'cooldown';
          } else recovery.reads += 1;
          return route.fulfill({ json: recoveryResponse() });
        }
        if (url.pathname === '/api/me') return route.fulfill({ json: { userId: 'fixture-owner', username: 'fixture', role: 'user', displayName: 'Fixture' } });
        if (url.pathname === '/api/mock-users') return route.fulfill({ json: { enabled: false, users: [] } });
        if (url.pathname === '/api/community/features') return route.fulfill({ json: { community: {}, development: {}, routing: {}, cinematic: { enabled: true } } });
        if (url.pathname === '/api/cinematic/video-capabilities') return route.fulfill({ json: { schemaVersion: 3, catalogVersion: 'fixture', mediaType: 'video', launchStatus: 'available', comparison: { enabled: false, minimumSlots: 2, maximumSlots: 2 }, models: [model] } });
        if (url.pathname.endsWith('/produce-context')) return route.fulfill({ json: contextData });
        if (url.pathname.endsWith('/video-quote')) return route.fulfill({ json: { estimate: { estimateId: 'fixture', estimatedCredits: 1, expiresAt: new Date(Date.now()+60_000).toISOString(), breakdown: {} }, account: { availableCredits: 100, canAfford: true }, requestFingerprint: 'fixture', renderedPrompt: contextData.videoPacket.providerIndependentPrompt, referenceSummary: [], projectId: project.id, sceneId: scene.id, shotId: shot.id, shotVersion: shot.version, approvedStoryboardAssetVersionId: null, sourceFingerprint: null, videoPacketFingerprint: contextData.videoPacket.packetFingerprint } });
        if (url.pathname.endsWith('/clip-bundle') && request.method() === 'GET') return route.fulfill({ json: { projectId: project.id, projectVersion: project.version, sizeBytes: 1024, clips: [{ name: 'Scene-01_Shot-01_Take-03.mp4', sizeBytes: 1024, assetId: 'asset', shotId: shot.id, attemptId: 'take_3' }], missing: [{ sceneNumber: 2, shotNumber: 1, shotId: 'missing' }] } });
        return route.abort();
      }
      if (request.method() !== 'GET') return route.abort();
      if (url.pathname.startsWith('/src/') && request.resourceType() === 'script') {
        const response = await route.fetch();
        return route.fulfill({ response, body: (await response.text()).replace(/\?t=\d+/g, '') });
      }
      if (url.pathname !== '/__cinematic-pilot') return route.continue();
      return route.fulfill({ contentType: 'text/html', body: `<!doctype html><html data-theme="default"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module">
        import RefreshRuntime from '/@react-refresh'; RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$=()=>{}; window.$RefreshSig$=()=>type=>type; window.__vite_plugin_react_preamble_installed__=true;
        await import('/src/styles/globals.css');
        const {default:React}=await import('/node_modules/.vite/deps/react.js${version}');
        const {default:ReactDOM}=await import('/node_modules/.vite/deps/react-dom_client.js${version}');
        const {default:i18n}=await import('/node_modules/.vite/deps/i18next.js${version}');
        const {I18nextProvider,initReactI18next}=await import('/node_modules/.vite/deps/react-i18next.js${version}');
        const {QueryClient,QueryClientProvider}=await import('/node_modules/.vite/deps/@tanstack_react-query.js${version}');
        const {ActorProvider}=await import('/src/lib/auth/ActorProvider.tsx');
        const {FeaturePolicyProvider}=await import('/src/lib/permissions/FeaturePolicyProvider.tsx');
        const {MemoryRouter}=await import('/node_modules/.vite/deps/react-router-dom.js${version}');
        const {VideoMediaPlayer}=await import('/src/components/media/VideoMediaPlayer.tsx');
        const {SceneDirectorDialog}=await import('/src/features/cinematic/components/CinematicDialogs.tsx');
        const {CinematicStageContent}=await import('/src/features/cinematic/components/CinematicStageContent.tsx');
        const {StoryboardSequenceBoard}=await import('/src/features/cinematic/components/StoryboardSequenceBoard.tsx');
        await i18n.use(initReactI18next).init({lng:${JSON.stringify(locale)},keySeparator:false,interpolation:{prefix:'{',suffix:'}',escapeValue:false},resources:{${locale}:${JSON.stringify(namespaces)}}});
        const e=React.createElement,p=${JSON.stringify(project)},noop=()=>{},client=new QueryClient({defaultOptions:{queries:{retry:false}}});
        window.refreshRecovery=()=>client.invalidateQueries({queryKey:['video-task']});
        window.projectRefreshes=0;
        function Screen(){const[selected,setSelected]=React.useState('');
          window.selectMedia=setSelected;
          if(location.search.includes('recovery')) return selected ? e('main',{className:'cinematic-page',style:{padding:'16px'}},e(CinematicStageContent,{activeStage:'produce',mode:'advanced',project:p,onOpenStage:noop,onProjectRefresh:()=>{window.projectRefreshes+=1}})) : null;
          if(location.search.includes('media')) return e('main',{style:{height:'80vh',width:'100%'}},e(VideoMediaPlayer,{videoUrl:selected,title:'Selected Take'}));
          if(location.search.includes('director')) return e(SceneDirectorDialog,{open:true,onOpenChange:noop,scene:p.scenes[0],isFirstScene:true,castAssignments:p.castAssignments,defaultMode:'simple',authoringManifest:${JSON.stringify(cinematicFieldManifestService.getPublicManifest())},onSave:v=>window.saved=v});
          if(location.search.includes('board')) return e('main',{className:'cinematic-page',style:{padding:'16px'}},e(StoryboardSequenceBoard,{sceneTitle:p.scenes[0].title,sceneDurationSeconds:8,selectedShotId:selected,onSelectShot:id=>{setSelected(id);window.selected=id},onMoveShot:()=>{window.moved=true},shots:[{id:'a',title:'Look Sheet opening',sequenceLabel:'Shot 1',durationSeconds:4,framing:'wide',action:'A deliberate turn into the light',status:'ready',videoReferenceMode:'looks_only',imageUrl:'/unused.jpg'},{id:'b',title:'Quiet station',sequenceLabel:'Shot 2',durationSeconds:4,framing:'wide',action:'Rain against glass',status:'ready',videoReferenceMode:'text_only'}]}));
          return e('main',{className:'cinematic-page',style:{padding:'16px'}},e(CinematicStageContent,{activeStage:'produce',mode:'advanced',project:p,onOpenStage:noop}));
        }
        ReactDOM.createRoot(document.getElementById('root')).render(e(QueryClientProvider,{client},e(ActorProvider,null,e(FeaturePolicyProvider,null,e(MemoryRouter,null,e(I18nextProvider,{i18n},e(Screen)))))));
      </script></body></html>` });
    });
    const page = await context.newPage(); page.on('pageerror', e => { errors.push(e.message); console.error(e.message); });
    for (const width of [1440, 820, 390]) {
      await page.setViewportSize({ width, height: 950 });
      if (recoveryOnly) {
        recovery.phase = 'cooldown'; recovery.explicitChecks = 0; recovery.reads = 0; recovery.release = null;
        await page.goto(`${origin}/__cinematic-pilot?recovery`);
        await page.waitForFunction(() => Boolean(window.selectMedia));
        recovery.urls = await createRecoveryMedia(page);
        await page.evaluate(() => window.selectMedia('ready'));
        const alert = page.locator('.cinematic-produce-provider-recovery');
        const button = alert.getByRole('button');
        await button.waitFor();
        assert.equal(await button.textContent(), labels['cinematic.produce.recheckStatus']);
        assert.equal(await button.isDisabled(), true, 'Cooldown is disabled');
        assert.equal(await alert.locator('strong').textContent(), labels['cinematic.produce.reviewRequiredTitle']);
        await page.locator('.cinematic-take').last().click();
        await page.waitForFunction(url => document.querySelector('video')?.currentSrc === url && document.querySelector('video')?.readyState >= 2, recovery.urls[0]);
        const draft = page.getByLabel(labels['cinematic.produce.additionalMotionDirection'], { exact: true });
        await draft.fill('Retain this unsaved direction.');
        await button.evaluate(el => { window.recoveryButton = el; el.click(); });
        assert.equal(recovery.explicitChecks, 0, 'Disabled cooldown click sends nothing');
        await page.evaluate(async () => {
          window.recoveryPlayer = document.querySelector('video');
          window.recoveryPlayer.muted = true;
          const frame = new Promise(resolve => window.recoveryPlayer.requestVideoFrameCallback(resolve));
          await window.recoveryPlayer.play(); await frame; window.recoveryPlayer.pause();
          const canvas = document.createElement('canvas'); canvas.width = 4; canvas.height = 4;
          const ctx = canvas.getContext('2d'); ctx.drawImage(window.recoveryPlayer, 0, 0, 4, 4);
          if (!ctx.getImageData(0, 0, 1, 1).data.slice(0, 3).some(value => value > 50)) throw new Error('Retained media is blank');
        });
        await verifyRecoveryLayout(page, alert, `${locale}/${width}/cooldown`);
        await page.screenshot({ path: path.join(output, `${locale}-${width}-recovery-cooldown.png`), fullPage: true });
        await alert.screenshot({ path: path.join(output, `${locale}-${width}-recovery-cooldown-control.png`) });
        recovery.phase = 'eligible';
        await page.evaluate(() => window.refreshRecovery());
        await page.waitForFunction(() => !window.recoveryButton.disabled);
        const eligibleRect = await button.boundingBox();
        await button.focus();
        await page.keyboard.press('Enter');
        await page.waitForFunction(label => window.recoveryButton.disabled && window.recoveryButton.textContent === label, labels['cinematic.produce.rechecking']);
        await button.evaluate(el => el.click());
        assert.equal(recovery.explicitChecks, 1, 'Pending click cannot repeat the explicit recheck');
        assert.ok(recovery.release, 'Same-task response is held for pending inspection');
        await page.emulateMedia({ reducedMotion: 'reduce' });
        const spinner = button.locator('[data-processing-spinner]');
        assert.equal(await spinner.count(), 1);
        assert.equal(await spinner.evaluate(el => getComputedStyle(el).animationName), 'none');
        await verifyRecoveryLayout(page, alert, `${locale}/${width}/pending`);
        const pendingRect = await button.boundingBox();
        await page.screenshot({ path: path.join(output, `${locale}-${width}-recovery-pending.png`), fullPage: true });
        await alert.screenshot({ path: path.join(output, `${locale}-${width}-recovery-pending-control.png`) });
        if (Math.abs(pendingRect.height - eligibleRect.height) > 1) {
          recoveryLayoutFindings.push(`${locale}/${width}: button height ${eligibleRect.height} -> ${pendingRect.height}`);
        }
        if (Math.abs(pendingRect.width - eligibleRect.width) > 1) {
          recoveryLayoutFindings.push(`${locale}/${width}: button width ${eligibleRect.width} -> ${pendingRect.width}`);
        }
        assert.ok(await page.evaluate(() => window.recoveryButton === document.querySelector('.cinematic-produce-provider-recovery button') && window.recoveryPlayer === document.querySelector('video')));
        recovery.release();
        await page.waitForFunction(() => window.projectRefreshes === 1);
        await page.waitForFunction(label => window.recoveryButton.textContent === label, labels['cinematic.produce.recheckStatus']);
        assert.equal(await button.isDisabled(), true, 'Returned cooldown stays disabled');
        assert.ok((await alert.textContent()).includes(labels['cinematic.produce.recheckBudget'].replace('{count}', '1').replace('{max}', '3')), 'Returned budget is visible');
        assert.equal(await button.locator('[data-processing-spinner]').count(), 0, 'Review-required is not generation progress');
        assert.equal(recovery.explicitChecks, 1);
        assert.equal(recovery.reads, 2, 'Only initial read and explicit fixture eligibility refresh');
        assert.ok(await page.evaluate(url => window.recoveryButton === document.querySelector('.cinematic-produce-provider-recovery button')
          && window.recoveryPlayer === document.querySelector('video') && window.recoveryPlayer.currentSrc === url, recovery.urls[0]));
        assert.equal(await page.locator('.cinematic-take').last().getAttribute('aria-pressed'), 'true');
        assert.equal(await draft.inputValue(), 'Retain this unsaved direction.');
        await verifyRecoveryLayout(page, alert, `${locale}/${width}/returned`);
        await page.screenshot({ path: path.join(output, `${locale}-${width}-recovery-returned.png`), fullPage: true });
        await alert.screenshot({ path: path.join(output, `${locale}-${width}-recovery-returned-control.png`) });
        recoveryEvidence.push({ locale, width, explicitChecks: recovery.explicitChecks, ordinaryReviewReads: recovery.reads,
          eligibleButton: eligibleRect, pendingButton: pendingRect, retainedSource: true, retainedDraft: true,
          reducedMotion: true, cooldownDisabled: true, pendingDisabled: true, projectRefreshes: 1 });
        await page.evaluate(urls => { window.selectMedia(''); urls.forEach(url => URL.revokeObjectURL(url)); }, recovery.urls);
        continue;
      }
      if (mediaOnly) {
        await page.goto(`${origin}/__cinematic-pilot?media`);
        await page.waitForFunction(() => Boolean(window.selectMedia));
        await page.evaluate(async () => {
          const canvas = document.createElement('canvas'); canvas.width = 320; canvas.height = 180;
          const ctx = canvas.getContext('2d'); ctx.fillStyle = '#00bbbb'; ctx.fillRect(0, 0, 320, 180);
          const stream = canvas.captureStream(10), chunks = [];
          const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
          recorder.ondataavailable = event => chunks.push(event.data);
          const ready = new Promise(resolve => { recorder.onstop = resolve; });
          recorder.start(); await new Promise(resolve => setTimeout(resolve, 300)); recorder.stop(); await ready;
          stream.getTracks().forEach(track => track.stop());
          const blob = new Blob(chunks, { type: 'video/webm' });
          window.mediaUrls = [URL.createObjectURL(blob), URL.createObjectURL(blob)];
          window.selectMedia(window.mediaUrls[0]);
        });
        await page.waitForFunction(() => document.querySelector('video')?.readyState >= 2);
        await page.evaluate(async () => {
          window.oldPlayer = document.querySelector('video'); window.oldPlayer.muted = true;
          await window.oldPlayer.play(); window.selectMedia(window.mediaUrls[1]);
        });
        await page.waitForFunction(() => document.querySelector('video')?.currentSrc === window.mediaUrls[1]);
        assert.ok(await page.evaluate(() => window.oldPlayer !== document.querySelector('video') && window.oldPlayer.paused));
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
        await page.screenshot({ path: path.join(output, `${locale}-${width}-media.png`) });
        await page.evaluate(() => window.selectMedia(''));
        await page.waitForFunction(() => !document.querySelector('video'));
        await page.evaluate(() => window.mediaUrls.forEach(url => URL.revokeObjectURL(url)));
        continue;
      }
      await page.goto(`${origin}/__cinematic-pilot?board`);
      const body = page.locator('[data-shot-id="b"] .cinematic-storyboard-card__body');
      await body.waitFor();
      const rect = await body.boundingBox(); await page.mouse.click(rect.x + 14, rect.y + 15);
      assert.equal(await page.evaluate(() => window.selected), 'b', 'Whole Shot card must select');
      assert.equal(await page.locator('.cinematic-storyboard-card__media img').count(), 0);
      await page.getByRole('button', { name: `${labels['cinematic.storyboard.moveEarlier']} b` }).click();
      assert.equal(await page.evaluate(() => window.moved), true, 'Reorder button stays above card hit area');
      await page.screenshot({ path: path.join(output, `${locale}-${width}-board.png`) });
      await page.goto(`${origin}/__cinematic-pilot?director`);
      await page.getByRole('heading', { name: labels['cinematic.director.title'], exact: true }).waitFor();
      const dialogue = page.locator('.cinematic-cue-editor'); await dialogue.scrollIntoViewIfNeeded();
      assert.equal(await dialogue.locator('.cinematic-cue-row').count(), 4);
      await dialogue.locator('textarea').nth(1).fill('Please wait for me.');
      await page.screenshot({ path: path.join(output, `${locale}-${width}-dialogue.png`) });
      await page.getByRole('button', { name: labels['cinematic.director.save'], exact: true }).click();
      assert.equal(await page.evaluate(() => window.saved.shots[0].dialogueCues[1].text), 'Please wait for me.');
      assert.equal(await page.evaluate(() => window.saved.cinematicOpening), true);
      await page.goto(`${origin}/__cinematic-pilot?produce`);
      await page.locator('.cinematic-takes').waitFor();
      await page.waitForFunction(label => [...document.querySelectorAll('button')].some(b => b.textContent === label && !b.disabled), labels['cinematic.produce.generate']);
      assert.equal(await page.locator('[role="alert"]').count(), 0, 'Ready Produce must not contain a hidden API/schema failure');
      await page.getByRole('button', { name: labels['cinematic.takes.more'], exact: true }).click();
      assert.equal(await page.locator('.cinematic-take').count(), 10);
      await page.locator('.cinematic-take').last().click();
      assert.equal(await page.locator('.cinematic-take').last().getAttribute('aria-pressed'), 'true');
      const referencesPanel = page.locator('.cinematic-produce-references');
      assert.equal(await referencesPanel.evaluate(element => element.open), false);
      assert.equal(await page.getByText(labels['cinematic.produce.technicalPrompt'], { exact: true }).count(), 0);
      assert.equal(await page.getByText(labels['cinematic.produce.shotDirection'], { exact: true }).count(), 1);
      await referencesPanel.locator('summary').click();
      const frameToggle = page.getByRole('switch', { name: labels['cinematic.produce.references.useFirstFrame'], exact: true });
      assert.equal(await frameToggle.isDisabled(), true);
      assert.equal(await frameToggle.getAttribute('aria-checked'), 'false');
      await page.screenshot({ path: path.join(output, `${locale}-${width}-produce.png`), fullPage: true });
      if (width === 820) {
        for (const theme of ['fashion', 'creative']) {
          await page.evaluate(theme => { document.documentElement.dataset.theme = theme; }, theme);
          await page.locator('.cinematic-takes').screenshot({ path: path.join(output, `${locale}-${width}-${theme}-takes.png`) });
        }
        await page.evaluate(() => { document.documentElement.dataset.theme = 'default'; });
      }
      await page.getByRole('button', { name: labels['cinematic.bundle.open'], exact: true }).click();
      const zipButton = page.getByRole('button', { name: labels['cinematic.bundle.download'], exact: true });
      await zipButton.waitFor(); assert.equal(await zipButton.isDisabled(), true);
      await page.getByRole('checkbox', { name: labels['cinematic.bundle.allowPartial'], exact: true }).check();
      assert.equal(await zipButton.isDisabled(), false);
      await page.screenshot({ path: path.join(output, `${locale}-${width}-bundle.png`) });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${locale}/${width} overflow`);
    }
    await context.close();
  }
  assert.deepEqual(errors, []);
  assert.ok(requests.every(request => !/POST .*video-attempts|POST .*clip-bundle/.test(request)), 'No paid generation or live file download');
  if (recoveryOnly) assert.ok(requests.every(request => request.startsWith('GET ') || /POST .*video-quote$/.test(request)), 'Only intercepted reads and quotes');
  if (recoveryOnly) {
    await fs.writeFile(path.join(output, 'recovery-evidence.json'), JSON.stringify({ recoveryEvidence, recoveryLayoutFindings, requests }, null, 2));
    assert.deepEqual(recoveryLayoutFindings, [], `Recovery layout findings; screenshots/evidence: ${output}`);
  }
  console.log(`Cinematic pilot browser checks passed. Screenshots: ${output}`);
} finally { await browser.close(); }

async function createRecoveryMedia(page) {
  return page.evaluate(async () => {
    const canvas = document.createElement('canvas'); canvas.width = 320; canvas.height = 180;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#00bbbb'; ctx.fillRect(0, 0, 320, 180);
    const stream = canvas.captureStream(10), chunks = [];
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    recorder.ondataavailable = event => chunks.push(event.data);
    const ready = new Promise(resolve => { recorder.onstop = resolve; });
    recorder.start(); await new Promise(resolve => setTimeout(resolve, 300)); recorder.stop(); await ready;
    stream.getTracks().forEach(track => track.stop());
    const blob = new Blob(chunks, { type: 'video/webm' });
    return [URL.createObjectURL(blob), URL.createObjectURL(blob)];
  });
}

async function verifyRecoveryLayout(page, alert, label) {
  await alert.scrollIntoViewIfNeeded();
  const checks = await alert.evaluate(el => {
    const rect = el.getBoundingClientRect(), button = el.querySelector('button'), box = button.getBoundingClientRect();
    const text = el.querySelector('div').getBoundingClientRect();
    const range = document.createRange(); range.selectNodeContents(button);
    const content = range.getBoundingClientRect();
    return {
      viewport: rect.left >= 0 && rect.right <= innerWidth + 1 && document.documentElement.scrollWidth <= innerWidth + 1,
      button: box.left >= rect.left && box.right <= rect.right + 1 && box.top >= rect.top && box.bottom <= rect.bottom + 1,
      content: content.left >= box.left && content.right <= box.right + 1 && button.scrollWidth <= button.clientWidth + 1,
      separated: box.top >= text.bottom - 1 || box.left >= text.right - 1 || box.right <= text.left + 1
    };
  });
  for (const [check, passed] of Object.entries(checks)) assert.ok(passed, `${label}: ${check}`);
}

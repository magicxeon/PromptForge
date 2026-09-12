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
const service = new CinematicApplicationService(); service.getProject = async () => structuredClone(project);
const contextData = await service.getProduceShotContext(project.id, scene.id, shot.id, {}, 'looks_only');
const model = new VideoCapabilityRegistry({ seedanceFirstFrameEnabled: false, developmentPocEnabled: true }).resolve('modelark', 'dreamina-seedance-2-5-260628');
const browser = await chromium.launch({ headless: true });
const errors = [], requests = [];
try {
  for (const locale of ['en', 'th']) {
    const namespaces = {};
    for (const ns of ['cinematic', 'playground', 'react-ui']) namespaces[ns] = JSON.parse(await fs.readFile(new URL(`../client/i18n/locales/${locale}/${ns}.json`, import.meta.url), 'utf8'));
    const labels = namespaces.cinematic;
    const context = await browser.newContext();
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin !== origin) return route.abort();
      if (url.pathname.startsWith('/api/')) {
        requests.push(`${request.method()} ${url.pathname}`);
        if (url.pathname === '/api/me') return route.fulfill({ json: { userId: 'fixture-owner', username: 'fixture', role: 'user', displayName: 'Fixture' } });
        if (url.pathname === '/api/mock-users') return route.fulfill({ json: { enabled: false, users: [] } });
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
        const {SceneDirectorDialog}=await import('/src/features/cinematic/components/CinematicDialogs.tsx');
        const {CinematicStageContent}=await import('/src/features/cinematic/components/CinematicStageContent.tsx');
        const {StoryboardSequenceBoard}=await import('/src/features/cinematic/components/StoryboardSequenceBoard.tsx');
        await i18n.use(initReactI18next).init({lng:${JSON.stringify(locale)},keySeparator:false,interpolation:{prefix:'{',suffix:'}',escapeValue:false},resources:{${locale}:${JSON.stringify(namespaces)}}});
        const e=React.createElement,p=${JSON.stringify(project)},noop=()=>{};
        function Screen(){const[selected,setSelected]=React.useState('');
          if(location.search.includes('director')) return e(SceneDirectorDialog,{open:true,onOpenChange:noop,scene:p.scenes[0],isFirstScene:true,castAssignments:p.castAssignments,defaultMode:'simple',authoringManifest:${JSON.stringify(cinematicFieldManifestService.getPublicManifest())},onSave:v=>window.saved=v});
          if(location.search.includes('board')) return e('main',{className:'cinematic-page',style:{padding:'16px'}},e(StoryboardSequenceBoard,{sceneTitle:p.scenes[0].title,sceneDurationSeconds:8,selectedShotId:selected,onSelectShot:id=>{setSelected(id);window.selected=id},onMoveShot:()=>{window.moved=true},shots:[{id:'a',title:'Look Sheet opening',sequenceLabel:'Shot 1',durationSeconds:4,framing:'wide',action:'A deliberate turn into the light',status:'ready',videoReferenceMode:'looks_only',imageUrl:'/unused.jpg'},{id:'b',title:'Quiet station',sequenceLabel:'Shot 2',durationSeconds:4,framing:'wide',action:'Rain against glass',status:'ready',videoReferenceMode:'text_only'}]}));
          return e('main',{className:'cinematic-page',style:{padding:'16px'}},e(CinematicStageContent,{activeStage:'produce',project:p,onOpenStage:noop}));
        }
        ReactDOM.createRoot(document.getElementById('root')).render(e(QueryClientProvider,{client:new QueryClient({defaultOptions:{queries:{retry:false}}})},e(ActorProvider,null,e(I18nextProvider,{i18n},e(Screen)))));
      </script></body></html>` });
    });
    const page = await context.newPage(); page.on('pageerror', e => { errors.push(e.message); console.error(e.message); });
    for (const width of [1440, 820, 390]) {
      await page.setViewportSize({ width, height: 950 });
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
  console.log(`Cinematic pilot browser checks passed. Screenshots: ${output}`);
} finally { await browser.close(); }

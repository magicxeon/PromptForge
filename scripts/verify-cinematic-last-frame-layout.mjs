import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { CinematicApplicationService } from '../server/domain/cinematic/CinematicApplicationService.js';
import { createSingleCharacterCinematicProject } from '../test/fixtures/cinematic/cinematicProjectFixtures.js';

const origin = process.env.CINEMATIC_WEB_ORIGIN || 'http://127.0.0.1:6501';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname));
const project = createSingleCharacterCinematicProject();
const scene = project.scenes[0];
const first = scene.shots[0];
const second = { ...structuredClone(first), id: 'shot_continuation', title: 'A continuing gesture', orderKey: 2,
  version: 1, storyboardStatus: 'draft', approvedStoryboardSource: undefined,
  approvedStoryboardAttemptId: undefined, approvedVideoAttemptId: null, approvedVideoSourceFingerprint: null,
  castMode: 'none', castAssignmentIds: [], wardrobeLookIds: [] };
project.castAssignments = [];
scene.castAssignmentIds = [];
scene.wardrobeLookIds = [];
first.castMode = 'none';
first.castAssignmentIds = [];
first.wardrobeLookIds = [];
scene.shots.push(second);
scene.shotOrder.push(second.id);
const take = project.generationAttempts.find(item => item.id === first.approvedVideoAttemptId);
take.outputAsset = { id: 'video_1', posterUrl: '/api/fixtures/poster', technicalProbe: { status: 'passed' } };
const actor = { userId: project.ownerUserId, username: project.ownerUsername, role: 'user' };
const service = new CinematicApplicationService({ assetRepository: {
  findByIdForOwner: async (id, owner) => id === 'video_1' && owner === actor.userId
    ? { id, status: 'active', assetType: 'cinematic_video_output', metadata: {
      projectId: project.id, sceneId: scene.id, shotId: first.id, attemptId: take.id,
      technicalProbe: { status: 'passed' }
    } } : null
} });
service.getProject = async () => structuredClone(project);
const generationContext = await service.getStoryboardGenerationContext(project.id, scene.id, second.id, actor);
assert.equal(generationContext.previousVideoFrame.available, true);
const version = (await (await fetch(`${origin}/src/lib/auth/ActorProvider.tsx`)).text()).match(/react\.js(\?v=[a-z0-9]+)/)?.[1] || '';
const poster = await sharp({ create: { width: 90, height: 160, channels: 3, background: '#637982' } }).png().toBuffer();
const output = await fs.mkdtemp(path.join(os.tmpdir(), 'mpf-last-frame-layout-'));
const browser = await chromium.launch({ headless: true });
try {
  for (const locale of ['en', 'th']) {
    const namespaces = {};
    for (const namespace of ['cinematic', 'playground', 'react-ui']) {
      namespaces[namespace] = JSON.parse(await fs.readFile(new URL(`../client/i18n/locales/${locale}/${namespace}.json`, import.meta.url), 'utf8'));
    }
    const context = await browser.newContext();
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin !== origin) return route.abort();
      if (url.pathname === '/api/fixtures/poster') return route.fulfill({ body: poster, contentType: 'image/png' });
      if (url.pathname.startsWith('/api/')) {
        if (url.pathname === '/api/me') return route.fulfill({ json: actor });
        if (url.pathname === '/api/mock-users') return route.fulfill({ json: { enabled: false, users: [] } });
        if (url.pathname === '/api/providers') return route.fulfill({ json: {
          defaultProvider: 'fixture', providers: [{ id: 'fixture', displayName: 'Fixture', defaultModel: 'image', models: [{
            id: 'image', displayName: 'Fixture image', capabilities: {
              imageGeneration: true, imageReferences: true, maxReferenceImages: 4, aspectRatios: ['9:16']
            }
          }] }]
        } });
        if (url.pathname === '/api/community/features') return route.fulfill({ json: { community: {}, development: {}, routing: {}, cinematic: { enabled: true } } });
        if (url.pathname.endsWith('/storyboard-generation-context')) return route.fulfill({ json: generationContext });
        return route.fulfill({ status: 404, json: { error: { code: 'fixture_unavailable', message: 'Fixture API unavailable' } } });
      }
      if (url.pathname.startsWith('/src/') && route.request().resourceType() === 'script') {
        const response = await route.fetch();
        return route.fulfill({ response, body: (await response.text()).replace(/\?t=\d+/g, '') });
      }
      if (url.pathname !== '/__last-frame-layout') return route.continue();
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
        const {StoryboardShotDialog}=await import('/src/features/cinematic/components/StoryboardShotDialog.tsx');
        await i18n.use(initReactI18next).init({lng:${JSON.stringify(locale)},keySeparator:false,interpolation:{prefix:'{',suffix:'}',escapeValue:false},resources:{${locale}:${JSON.stringify(namespaces)}}});
        const e=React.createElement,p=${JSON.stringify(project)},scene=p.scenes[0],shot=scene.shots[1];
        ReactDOM.createRoot(document.getElementById('root')).render(e(QueryClientProvider,{client:new QueryClient({defaultOptions:{queries:{retry:false}}})},e(ActorProvider,null,e(FeaturePolicyProvider,null,e(MemoryRouter,null,e(I18nextProvider,{i18n},e(StoryboardShotDialog,{open:true,onOpenChange:()=>{},project:p,scene,shot})))))));
      </script></body></html>` });
    });
    const page = await context.newPage();
    page.on('pageerror', error => console.error(`[${locale}] page error: ${error.message}`));
    for (const width of [1440, 820, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${origin}/__last-frame-layout`);
      const control = page.locator('.cinematic-previous-frame-wrap');
      await control.waitFor();
      await page.waitForFunction(() => !document.querySelector('.cinematic-previous-frame__actions button')?.disabled);
      const result = await control.evaluate(element => {
        const rect = element.getBoundingClientRect();
        const children = [...element.querySelectorAll('button, strong, .cinematic-previous-frame__preview')];
        return { viewport: innerWidth, bounds: [rect.left, rect.right],
          overflow: element.scrollWidth > element.clientWidth + 1,
          childrenOutside: children.some(child => { const box = child.getBoundingClientRect();
            return box.left < rect.left - 1 || box.right > rect.right + 1; }) };
      });
      assert.equal(result.overflow, false, `${locale}/${width}: horizontal overflow`);
      assert.equal(result.childrenOutside, false, `${locale}/${width}: control content outside panel`);
      await control.screenshot({ path: path.join(output, `${locale}-${width}.png`) });
    }
    await context.close();
  }
  console.log(`Last-frame Storyboard control responsive screenshots: ${output}`);
} finally {
  await browser.close();
}

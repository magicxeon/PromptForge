import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import { CinematicApplicationService } from '../server/domain/cinematic/CinematicApplicationService.js';
import { CinematicProjectRepository } from '../server/repositories/cinematic/CinematicProjectRepository.js';

const origin = process.env.CINEMATIC_WEB_ORIGIN || 'http://127.0.0.1:6501';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname));
const source = await (await fetch(`${origin}/src/lib/auth/ActorProvider.tsx`)).text();
const version = source.match(/react\.js(\?v=[a-z0-9]+)/)?.[1] || '';
const output = await fs.mkdtemp(path.join(os.tmpdir(), 'mpf-cinematic-series-'));
const actor = { userId: 'series-fixture', username: 'fixture', role: 'user', displayName: 'Fixture' };
const browser = await chromium.launch({ headless: true });
const errors = [], blocked = [];
try {
  for (const locale of ['en', 'th']) for (const width of [1440, 820, 390]) {
    const service = new CinematicApplicationService({ repository: new CinematicProjectRepository({ projectsFile: path.join(output, `${locale}-${width}-projects.json`) }) });
    const project = await service.createProject({ title: 'Station Stories', storyBrief: 'A woman receives a letter at the station.', creativeDirection: 'Warm natural station light.', durationSeconds: 30, castPlanningMode: 'solo' }, actor);
    const namespaces = {};
    for (const ns of ['cinematic', 'playground', 'react-ui']) namespaces[ns] = JSON.parse(await fs.readFile(new URL(`../client/i18n/locales/${locale}/${ns}.json`, import.meta.url), 'utf8'));
    const labels = namespaces.cinematic;
    const context = await browser.newContext({ viewport: { width, height: 950 } });
    await context.addInitScript(({ id }) => localStorage.setItem('mpf_active_mock_user_id', id), { id: actor.userId });
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin !== origin) return route.abort();
      if (url.pathname.startsWith('/api/')) {
        try {
          let data;
          const method = request.method(), body = request.postDataJSON() || {};
          if (url.pathname === '/api/me') data = actor;
          else if (url.pathname === '/api/mock-users') data = { enabled: false, users: [] };
          else if (url.pathname === '/api/community/features') data = { community: {}, development: {}, routing: {}, cinematic: { enabled: true } };
          else if (url.pathname === '/api/cinematic/authoring-manifest') data = service.getAuthoringManifest();
          else {
            const parts = url.pathname.split('/').filter(Boolean), id = parts[3], action = parts[4];
            if (parts[2] === 'projects' && method === 'GET' && !action) data = await service.getProject(id, actor);
            else if (parts[2] === 'projects' && action === 'setup' && method === 'PATCH') data = await service.updateSetup(id, body, actor);
            else if (parts[2] === 'projects' && action === 'series' && method === 'GET') data = await service.getSeriesWorkspace(id, actor);
            else if (parts[2] === 'projects' && action === 'series' && method === 'POST') data = await service.createSeries(id, body, actor);
            else if (parts[2] === 'series' && action === 'seasons' && method === 'POST') data = await service.addSeriesSeason(id, body, actor);
            else if (parts[2] === 'series' && action === 'chapters' && method === 'POST') data = await service.addSeriesChapter(id, body, actor);
            else if (parts[2] === 'series' && !action && method === 'PATCH') data = await service.updateSeries(id, body, actor);
            else { blocked.push(`${method} ${url.pathname}`); return route.abort(); }
          }
          return route.fulfill({ json: data });
        } catch (error) { return route.fulfill({ status: error.statusCode || 500, json: { error: error.message, code: error.code } }); }
      }
      if (request.method() !== 'GET') return route.abort();
      if (url.pathname.startsWith('/src/') && request.resourceType() === 'script') {
        const response = await route.fetch();
        return route.fulfill({ response, body: (await response.text()).replace(/\?t=\d+/g, '') });
      }
      if (!url.pathname.startsWith('/create/cinematic/')) return route.continue();
      return route.fulfill({ contentType: 'text/html', body: `<!doctype html><html data-theme="default"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root" style="padding:16px"></div><script type="module">
        import RefreshRuntime from '/@react-refresh'; RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$=()=>{}; window.$RefreshSig$=()=>type=>type; window.__vite_plugin_react_preamble_installed__=true;
        await import('/src/styles/globals.css');
        const {default:React}=await import('/node_modules/.vite/deps/react.js${version}');
        const {default:ReactDOM}=await import('/node_modules/.vite/deps/react-dom_client.js${version}');
        const {default:i18n}=await import('/node_modules/.vite/deps/i18next.js${version}');
        const {I18nextProvider,initReactI18next}=await import('/node_modules/.vite/deps/react-i18next.js${version}');
        const {QueryClient,QueryClientProvider}=await import('/node_modules/.vite/deps/@tanstack_react-query.js${version}');
        const {BrowserRouter,Routes,Route}=await import('/node_modules/.vite/deps/react-router-dom.js${version}');
        const {ActorProvider}=await import('/src/lib/auth/ActorProvider.tsx');
        const {FeaturePolicyProvider}=await import('/src/lib/permissions/FeaturePolicyProvider.tsx');
        const {CinematicStudioRoute}=await import('/src/features/cinematic/routes/CinematicStudioRoute.tsx');
        await i18n.use(initReactI18next).init({lng:${JSON.stringify(locale)},keySeparator:false,interpolation:{prefix:'{',suffix:'}',escapeValue:false},resources:{${locale}:${JSON.stringify(namespaces)}}});
        const e=React.createElement;
        ReactDOM.createRoot(document.getElementById('root')).render(e(QueryClientProvider,{client:new QueryClient({defaultOptions:{queries:{retry:false}}})},e(ActorProvider,null,e(FeaturePolicyProvider,null,e(I18nextProvider,{i18n},e(BrowserRouter,null,e(Routes,null,e(Route,{path:'/create/cinematic/:projectId/:stage',element:e(CinematicStudioRoute)}))))))));
      </script></body></html>` });
    });
    const page = await context.newPage(); page.on('pageerror', error => { errors.push(error.message); console.error(error.message); });
    const text = key => labels[`cinematic.series.${key}`];
    const projectUrl = `${origin}/create/cinematic/${project.id}/setup`;
    await page.goto(projectUrl);
    await page.getByRole('button', { name: text('create'), exact: true }).click();
    let dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: text('create'), exact: true }).click();
    await page.getByRole('button', { name: text('manage'), exact: true }).waitFor();
    assert.equal((await service.getProject(project.id, actor)).seriesMembership.chapterNumber, 1);
    await page.locator('.cinematic-series-bar').screenshot({ path: path.join(output, `${locale}-${width}-bar.png`) });
    await page.getByRole('button', { name: text('manage'), exact: true }).click();
    dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: text('tab.season'), exact: true }).click();
    await dialog.getByLabel(text('seasonTitleOptional')).fill(locale === 'th' ? 'คืนที่สถานีรถไฟ' : 'Nights at the station');
    await dialog.getByRole('button', { name: text('addSeason'), exact: true }).click();
    await page.waitForFunction(label => !document.querySelector('[role="dialog"]') && [...document.querySelectorAll('[role="combobox"]')].some(el => el.textContent.includes(label)), text('emptySeason'));
    await page.getByRole('button', { name: text('manage'), exact: true }).click();
    dialog = page.getByRole('dialog');
    await dialog.getByLabel(text('chapterTitle')).fill(locale === 'th' ? 'จดหมายฉบับสุดท้ายที่ยังไม่ได้เปิดอ่าน' : 'The last unopened letter');
    await dialog.getByLabel(labels['cinematic.setup.storyBrief'], { exact: true }).fill('A letter arrives in winter. The platform is empty.');
    await dialog.screenshot({ path: path.join(output, `${locale}-${width}-chapter.png`) });
    if (width === 820) for (const theme of ['fashion', 'creative']) {
      await page.evaluate(theme => { document.documentElement.dataset.theme = theme; }, theme);
      await dialog.screenshot({ path: path.join(output, `${locale}-${width}-${theme}.png`) });
    }
    await page.evaluate(() => { document.documentElement.dataset.theme = 'default'; });
    await dialog.getByRole('button', { name: text('addChapter'), exact: true }).click();
    await page.waitForURL(url => !url.pathname.includes(project.id));
    const freshId = new URL(page.url()).pathname.split('/')[3];
    const fresh = await service.getProject(freshId, actor);
    await page.getByRole('heading', { name: fresh.title, exact: true }).waitFor();
    assert.equal(fresh.seriesMembership.chapterNumber, 1);
    assert.equal(fresh.seriesMembership.seasonId, (await service.getSeriesWorkspace(project.id, actor)).series.seasons[1].id);
    assert.deepEqual(fresh.generationAttempts, []);
    // A Chapter switch must flush the current Setup, not leave the delayed autosave behind.
    const brief = page.locator('.cinematic-story-source textarea').first();
    await page.waitForFunction(value => document.querySelector('.cinematic-story-source textarea')?.value === value, fresh.setup.storyBrief);
    await brief.fill('A newly edited chapter brief before switching.');
    await page.waitForFunction(() => document.querySelector('[data-save-state]')?.getAttribute('data-save-state') === 'saving');
    const bar = page.locator('.cinematic-series-bar');
    await bar.getByRole('combobox', { name: text('season'), exact: true }).click();
    await page.getByRole('option', { name: text('seasonNumber').replace('{number}', '1'), exact: true }).click();
    await bar.getByRole('combobox', { name: text('chapter'), exact: true }).click();
    await page.getByRole('option', { name: `${text('chapterNumber').replace('{number}', '1')}: Station Stories`, exact: true }).click();
    await page.waitForURL(projectUrl);
    assert.equal((await service.getProject(freshId, actor)).setup.storyBrief, 'A newly edited chapter brief before switching.');
    assert.equal((await service.getProject(project.id, actor)).setup.storyBrief, 'A woman receives a letter at the station.');
    await page.reload();
    await page.getByRole('button', { name: text('manage'), exact: true }).waitFor();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${locale}/${width} overflow`);
    assert.equal(await page.getByRole('alert').count(), 0);
    await page.screenshot({ path: path.join(output, `${locale}-${width}-setup.png`) });
    await context.close();
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(blocked, []);
  console.log(`Series browser flow passed at 390/820/1440 in EN/TH. Temporary data and screenshots: ${output}`);
} finally { await browser.close(); }

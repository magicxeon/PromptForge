import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { registerLearningRoutes } from '../server/app/routes/learningRoutes.js';
import { TutorialApplicationService } from '../server/domain/tutorials/TutorialApplicationService.js';
import { AICinemaApplicationService } from '../server/domain/ai-cinema/AICinemaApplicationService.js';
import { TutorialCatalogRepository } from '../server/repositories/tutorials/TutorialCatalogRepository.js';
import { AICinemaCatalogRepository } from '../server/repositories/ai-cinema/AICinemaCatalogRepository.js';
import { LearningAccessPolicy } from '../server/domain/content-access/LearningAccessPolicy.js';
import { getLearningPolicy } from '../server/config/learningPolicy.js';

// Real catalog routes with temporary repositories, never the application's live stores.
const root = process.cwd();
const output = await fs.mkdtemp(path.join(os.tmpdir(), 'mpf-tutorial-layout-'));
const actor = { userId: 'usr_demo', role: 'admin', username: 'fixture-admin', displayName: 'Fixture Admin' };
const policy = new LearningAccessPolicy({ readPolicy: () => getLearningPolicy({ LEARNING_ENABLED: 'true' }) });
const tutorials = new TutorialApplicationService({ policy, repository: new TutorialCatalogRepository({ catalogFile: path.join(output, 'tutorial.json') }) });
const cinema = new AICinemaApplicationService({ policy, repository: new AICinemaCatalogRepository({ catalogFile: path.join(output, 'cinema.json') }) });
const course = await tutorials.create({ type: 'tutorial', title: 'Workshop: visual storytelling', description: 'Synthetic course for isolated layout verification.', language: 'en', accessMode: 'preview_then_paid', freeCount: 1, priceCredits: 50,
  chapters: Array.from({ length: 4 }, (_, i) => ({ title: `Chapter ${i + 1}`, description: '', lessons: [{ title: 'Planning the scene', description: '' }] })) }, actor);
const series = await cinema.create({ type: 'series', title: 'ภาพยนตร์เรื่องการเดินทางของความฝันและความทรงจำ', description: 'Synthetic series fixture.', language: 'th', accessMode: 'preview_then_paid', freeCount: 1, priceCredits: 100,
  episodes: Array.from({ length: 4 }, (_, i) => ({ title: `Episode ${i + 1}`, description: '', season: i < 2 ? 1 : 2 })) }, actor);
const resources = {};
for (const locale of ['en', 'th']) {
  resources[locale] = {};
  for (const namespace of ['tutorials', 'react-ui']) resources[locale][namespace] = JSON.parse(await fs.readFile(path.join(root, `client/i18n/locales/${locale}/${namespace}.json`), 'utf8'));
}
const app = express();
app.use(express.json({ limit: '300kb' }));
app.use((req, res, next) => { req.actorContext = req.headers['x-mpf-user-id'] === 'member' ? { ...actor, userId: 'member', role: 'user' } : actor; next(); });
app.get('/api/me', (req, res) => res.json(req.actorContext));
app.get('/api/mock-users', (req, res) => res.json({ enabled: false, users: [] }));
registerLearningRoutes(app, { tutorials, cinema, policy });
const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root" style="max-width:1320px;margin:auto;padding:16px"></div><script type="module">
import React from 'react'; import {createRoot} from 'react-dom/client';
import {createMemoryRouter,RouterProvider} from 'react-router-dom';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import i18next from 'i18next'; import {I18nextProvider,initReactI18next} from 'react-i18next';
import {ActorProvider} from '/src/lib/auth/ActorProvider.tsx';
import {ContentCatalogRoute} from '/src/features/content-catalog/routes/ContentCatalogRoute.tsx';
import '/src/styles/globals.css'; import '@fontsource/poppins/500.css'; import '@fontsource/noto-sans-thai/500.css';
const p=new URLSearchParams(location.search),e=React.createElement,kind=p.get('kind')||'tutorial';
document.documentElement.dataset.theme=p.get('theme')||'default';
const lang=p.get('locale')||'en',i18n=i18next.createInstance();
await i18n.use(initReactI18next).init({lng:lang,fallbackLng:'en',keySeparator:false,interpolation:{prefix:'{',suffix:'}',escapeValue:false},resources:${JSON.stringify(resources)}});
const prefix=kind==='tutorial'?'/tutorials':'/ai-cinema',manage=kind==='tutorial'?'teach':'manage';
const id=kind==='tutorial'?${JSON.stringify(course.id)}:${JSON.stringify(series.id)};
const router=createMemoryRouter([{path:prefix,element:e(ContentCatalogRoute,{kind})},{path:prefix+'/'+manage,element:e(ContentCatalogRoute,{kind})},{path:prefix+'/'+manage+'/new',element:e(ContentCatalogRoute,{kind})},{path:prefix+'/'+manage+'/:contentId/edit',element:e(ContentCatalogRoute,{kind})}],{initialEntries:[p.get('view')==='list'?prefix+'/'+manage:prefix+'/'+manage+'/'+id+'/edit']});
createRoot(document.getElementById('root')).render(e(I18nextProvider,{i18n},e(QueryClientProvider,{client:new QueryClient({defaultOptions:{queries:{retry:false}}})},e(ActorProvider,null,e(RouterProvider,{router})))));
</script></body></html>`;
const server = await createServer({ root: path.join(root, 'web'), configFile: path.join(root, 'web/vite.config.ts'), configLoader: 'runner', cacheDir: path.join(output, 'vite-cache'),
  server: { host: '127.0.0.1', port: 0, open: false }, plugins: [{ name: 'tutorial-review', configureServer(vite) {
    vite.middlewares.use(app);
    vite.middlewares.use(async (req, res, next) => {
      if (!req.url?.startsWith('/__catalog-review') || req.url.includes('html-proxy')) return next();
      try { res.setHeader('Content-Type', 'text/html'); res.end(await vite.transformIndexHtml(req.url, html)); } catch (error) { next(error); }
    });
  } }] });
let browser;
const evidence = [];
try {
  await server.listen();
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const kind of ['tutorial', 'cinema']) for (const locale of ['en', 'th']) for (const width of [390, 820, 1440]) {
    const theme = width === 390 ? 'default' : width === 820 ? 'fashion' : 'creative';
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`${origin}/__catalog-review?kind=${kind}&locale=${locale}&theme=${theme}`);
    await page.locator('.content-authoring__settings').waitFor();
    await page.evaluate(() => document.fonts.ready);
    assert.ok(await page.locator('body').evaluate(el => el.scrollWidth <= innerWidth + 1), `${kind}/${locale}/${width} overflow`);
    const boxes = await page.locator('input,select,textarea,.content-authoring__unit').evaluateAll(elements => elements.map(el => { const b = el.getBoundingClientRect(); return { left: b.left, right: b.right }; }));
    assert.ok(boxes.every(box => box.left >= 0 && box.right <= width + 1), 'Editor controls remain inside viewport');
    assert.ok(await page.getByRole('button', { name: resources[locale].tutorials.publish, exact: true }).isDisabled());
    const title = page.getByRole('textbox', { name: resources[locale].tutorials.title, exact: true });
    await title.fill(`${kind} layout ${locale} ${width}`);
    await page.getByRole('button', { name: resources[locale].tutorials.save, exact: true }).click();
    await page.getByRole('status').filter({ hasText: resources[locale].tutorials.saved }).waitFor();
    await page.screenshot({ path: path.join(output, `${kind}-${locale}-${width}.png`), fullPage: true });
    evidence.push({ kind, locale, width, theme, savedThroughRealApi: true });
  }
  await page.goto(`${origin}/__catalog-review?view=list`);
  await page.locator('.content-catalog__item').first().waitFor();
  await page.screenshot({ path: path.join(output, 'catalog-list.png'), fullPage: true });
  await page.evaluate(() => localStorage.setItem('mpf_active_mock_user_id', 'member'));
  await page.reload();
  await page.getByText(resources.en.tutorials.denied, { exact: true }).waitFor();
  assert.equal(await page.locator('.content-authoring').count(), 0);
  assert.deepEqual(errors, []);
  await fs.writeFile(path.join(output, 'evidence.json'), JSON.stringify(evidence, null, 2));
  console.log(`PASS: ${evidence.length} responsive editor cases, real isolated API saves, catalog list and non-admin denial. Evidence: ${output}`);
} catch (error) {
  if (browser) for (const context of browser.contexts()) for (const page of context.pages()) await page.screenshot({ path: path.join(output, 'failure.png'), fullPage: true });
  throw error;
} finally { await browser?.close(); await server.close(); }

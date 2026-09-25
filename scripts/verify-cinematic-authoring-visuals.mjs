import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { chromium } from 'playwright';

// Isolated UI review: no API server, workers, provider calls or Project mutations.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalogs = Object.fromEntries(await Promise.all(['en', 'th'].map(async locale => [locale,
  JSON.parse(await fs.readFile(path.join(root, `client/i18n/locales/${locale}/cinematic.json`), 'utf8'))])));
const shot = { id: 'shot-1', version: 1, orderKey: 1, title: 'A moment before the encounter', durationMs: 4000,
  shotDocument: 'SHOT DURATION\n4 seconds\n\nOPENING\nLalin stands near the curb. Kin approaches from behind.\n\nPERFORMANCE AND TIMELINE\n0.0-2.0s: Lalin reaches toward the pot.\n2.0-4.0s: Kin turns toward her.',
  shotPlanningStatus: 'ready', storyboardStatus: 'draft', castAssignmentIds: [], wardrobeLookIds: [] };
const scene = { id: 'scene-1', version: 1, orderKey: 1, title: 'Flower shop in the rain', synopsis: 'An unexpected encounter outside the flower shop.',
  purpose: 'dramatic', location: 'Flower shop pavement', time: 'Night', weather: 'Rain', shots: [shot], durationMs: 4000,
  castAssignmentIds: [], wardrobeLookIds: [], environmentPrompt: '', shotOrder: [shot.id] };
const project = { id: 'fixture', projectId: 'fixture', version: 1, title: 'Rain Letters', chapterTitle: 'The first encounter', scenes: [scene],
  generationAttempts: [], castAssignments: [], shotProposals: [], sceneProposals: [], activeChapterVersionId: 'revision-1' };
const html = `<!doctype html><html data-theme="default"><head><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body><div id="root" style="padding:16px;max-width:1440px;margin:auto"></div><script type="module">
import React from 'react';
import { createRoot } from 'react-dom/client';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ActorProvider } from '/src/lib/auth/ActorProvider.tsx';
import { CinematicShotWriter } from '/src/features/cinematic/components/CinematicShotWriter.tsx';
import { CinematicSceneOverview } from '/src/features/cinematic/components/CinematicSceneOverview.tsx';
import { SceneEnvironmentControl } from '/src/features/cinematic/components/SceneEnvironmentControl.tsx';
import '/src/styles/globals.css';
import '@fontsource/poppins/500.css';
import '@fontsource/noto-sans-thai/500.css';
const params = new URLSearchParams(location.search);
const catalogs = ${JSON.stringify(catalogs)};
const i18n = i18next.createInstance();
await i18n.use(initReactI18next).init({ lng: params.get('locale') || 'en', fallbackLng: 'en', ns: ['cinematic'], defaultNS: 'cinematic',
  keySeparator: false, interpolation: { prefix: '{', suffix: '}', escapeValue: false },
  resources: Object.fromEntries(Object.entries(catalogs).map(([language, cinematic]) => [language, { cinematic }])) });
const project = ${JSON.stringify(project)};
const noop = () => {};
const props = { actorId: 'fixture', project, online: true, onProjectChanged: noop, onOpenShot: noop };
const content = params.get('view') === 'scene'
  ? React.createElement(CinematicSceneOverview, { ...props, onBackToChapter: noop,
      renderEnvironment: (scene, disabled) => React.createElement(SceneEnvironmentControl, { project, scene, disabled, compact: true }) })
  : React.createElement(CinematicShotWriter, { ...props, shotId: 'shot-1', onBackToScenes: noop, onOpenFirstFrame: noop });
createRoot(document.getElementById('root')).render(React.createElement(QueryClientProvider, { client: new QueryClient() },
  React.createElement(ActorProvider, null, React.createElement(I18nextProvider, { i18n }, content))));
</script></body></html>`;
const output = await fs.mkdtemp(path.join(os.tmpdir(), 'mpf-authoring-visuals-'));
const server = await createServer({ root: path.join(root, 'web'), configFile: path.join(root, 'web/vite.config.ts'),
  server: { host: '127.0.0.1', port: 5174, strictPort: false, open: false },
  plugins: [{ name: 'cinematic-isolated-review', configureServer(vite) {
    vite.middlewares.use(async (req, res, next) => {
      if (!req.url?.startsWith('/__cinematic-review') || req.url.includes('html-proxy')) return next();
      try {
        res.setHeader('Content-Type', 'text/html');
        res.end(await vite.transformIndexHtml(req.url, html));
      } catch (error) { next(error); }
    });
  } }] });
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/**', route => {
    const pathname = new URL(route.request().url()).pathname;
    if (!pathname.startsWith('/api/')) return route.continue();
    if (route.request().method() !== 'GET') throw new Error('UI review attempted a mutation');
    const body = pathname === '/api/me' ? { userId: 'fixture', username: 'fixture', displayName: 'Fixture', role: 'user' }
      : pathname === '/api/mock-users' ? { enabled: false, users: [] } : {};
    return route.fulfill({ json: body });
  });
  const origin = server.resolvedUrls.local[0];
  for (const locale of ['th', 'en']) for (const view of ['scene', 'shot']) for (const width of [390, 820, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    await page.goto(`${origin}__cinematic-review?locale=${locale}&view=${view}`, { waitUntil: 'networkidle' });
    try {
      await page.locator('.cinematic-authoring-visuals, .cinematic-authoring-visuals__environment').first().waitFor({ timeout: 10000 });
    } catch (error) {
      console.error('Browser errors:', errors, 'Page:', await page.locator('body').innerText());
      throw error;
    }
    await page.evaluate(() => document.fonts.ready);
    assert.ok(await page.locator('body').evaluate(el => el.scrollWidth <= el.clientWidth + 1), `${locale}/${view}/${width} overflow`);
    if (view === 'shot') assert.equal(await page.locator('textarea').count(), 1);
    await page.screenshot({ path: path.join(output, `${locale}-${view}-${width}.png`), fullPage: true });
  }
  assert.deepEqual(errors, []);
  console.log(`PASS isolated Scene/Shot visual review, TH/EN at 390/820/1440. Screenshots: ${output}`);
} finally {
  await browser?.close();
  await server.close();
}

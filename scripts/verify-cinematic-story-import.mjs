import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const chapterOutline = process.argv.includes('--chapter-outline');
const importSource = process.argv.includes('--import-source');
const castTarget = process.argv.includes('--cast-target') || chapterOutline;
const sceneCast = process.argv.includes('--scene-cast');
const output = await fs.mkdtemp(path.join(os.tmpdir(), 'mpf-story-import-ui-'));
const readJson = async name => JSON.parse(await fs.readFile(path.join(root, name), 'utf8'));
const catalogs = Object.fromEntries(await Promise.all(['en', 'th'].map(async locale => [locale, await readJson(`client/i18n/locales/${locale}/cinematic.json`)])));
const workflow = await readJson('server/config/cinematic/workflow-policy.v1.json');
const storyAuthoring = await readJson('server/config/cinematic/story-authoring.v1.json');
const html = `<!doctype html><html data-theme="default"><head><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body><div id="root" style="padding:16px;max-width:1440px;margin:auto"></div><script type="module">
import React from 'react';
import { createRoot } from 'react-dom/client';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CinematicNewProjectComposer } from '/src/features/cinematic/components/CinematicNewProjectComposer.tsx';
import { CinematicFullStoryWriter } from '/src/features/cinematic/components/CinematicFullStoryWriter.tsx';
import { CinematicChapterWriter } from '/src/features/cinematic/components/CinematicChapterWriter.tsx';
import { CinematicSceneLooks } from '/src/features/cinematic/components/CinematicSceneLooks.tsx';
import { ActorProvider } from '/src/lib/auth/ActorProvider.tsx';
import { createCinematicSetupDraft } from '/src/features/cinematic/state/cinematicDraftStorage.ts';
import '/src/styles/globals.css';
import '@fontsource/poppins/500.css';
import '@fontsource/noto-sans-thai/500.css';
const catalogs = ${JSON.stringify(catalogs)};
const workflow = ${JSON.stringify(workflow)};
const storyAuthoring = ${JSON.stringify(storyAuthoring)};
const i18n = i18next.createInstance();
await i18n.use(initReactI18next).init({ lng: new URLSearchParams(location.search).get('locale') || 'en', fallbackLng: 'en', ns: ['cinematic'], defaultNS: 'cinematic',
  keySeparator: false, interpolation: { prefix: '{', suffix: '}', escapeValue: false },
  resources: Object.fromEntries(Object.entries(catalogs).map(([language, cinematic]) => [language, { cinematic }])) });
function Demo() {
  const [draft, setDraft] = React.useState(createCinematicSetupDraft());
  const [project, setProject] = React.useState(null);
  const [chapter, setChapter] = React.useState(false);
  const [showSetup, setShowSetup] = React.useState(false);
  const noop = () => {};
  if (${sceneCast}) {
    const cast = [{ id: 'one', displayName: 'แม่หญิงรัตนา', storyRole: 'นางเอก ผู้เริ่มต้นชีวิตใหม่และต้องดูแลครอบครัว', portraitUrl: null, looks: [] },
      { id: 'two', displayName: 'Choi, a trusted childhood companion', storyRole: 'A childhood friend and loyal companion with a long role description.', portraitUrl: '/api/fixture-missing-portrait', looks: [] }];
    const scene = { id: 'scene', version: 1, castMode: 'selected', castAssignmentIds: ['one', 'two'], wardrobeLookIds: [] };
    return React.createElement(ActorProvider, null, React.createElement(CinematicSceneLooks, { actorId: 'fixture',
      project: { id: 'fixture', version: 1, castAssignments: cast }, scene, disabled: false, onProjectChanged: noop }));
  }
  if (project && chapter) return React.createElement(CinematicChapterWriter, { actorId: 'fixture', project, online: true,
    onBackToFullStory: () => setChapter(false), onOpenSetup: noop, onNavigateChapter: noop, onOpenScenes: noop, onProjectChanged: setProject });
  if (project && !showSetup) return React.createElement(CinematicFullStoryWriter, { actorId: 'fixture', project, online: true,
    onBackToBrief: () => ${importSource ? 'setShowSetup(true)' : 'setProject(null)'}, onOpenChapters: () => setChapter(true), onProjectChanged: setProject });
  return React.createElement(CinematicNewProjectComposer, { draft, storyAuthoring, creationPolicy: workflow.projectCreation,
    variant: project ? 'edit' : 'create', importedFullStory: project?.fullStoryVersions[0], onContinueFullStory: () => setShowSetup(false), onSave: noop,
    importPolicy: workflow.storyImport, maximumStoryCharacters: workflow.authoring.fullStoryMaximumCharacters,
    saveState: 'saved', pending: false, online: true, onCreateDraft: noop, onPrepareStory: noop,
    onUpdate: (key, value) => setDraft(current => ({ ...current, [key]: value,
      ...(key === 'storyBrief' && current.storyBriefImport ? { storyBriefImport: { ...current.storyBriefImport, edited: true } } : {}) })),
    onImportFullStory: async file => setProject({ id: 'fixture', version: 1, title: file.fileName, setup: { ...draft, chapterCount: 8 },
      fullStoryVersions: [{ id: 'revision-1', version: 1, content: file.content, importFileName: file.fileName, source: 'manual', status: 'active', createdAt: '2026-09-25T00:00:00Z' }],
      activeFullStoryVersionId: 'revision-1', confirmedFullStoryVersionId: ${castTarget ? "'revision-1'" : 'null'},
      castAssignments: ${castTarget ? JSON.stringify(['Mina', 'Kin'].map((name, i) => ({ id: `cast-${i}`, active: true, sourceType: 'dossier', displayName: name, storyRole: 'Main character', dialogueStyle: '', identityReady: false }))) : '[]'}, scenes: [], chapterProposals: [],
      chapterOutline: ${chapterOutline ? JSON.stringify({ id: 'outline', sourceRevisionId: 'revision-1', sourceKey: 'fixture', status: 'proposed',
        settings: { format: 'mini-series', durationSeconds: 60, seasonEnabled: false, seasonCount: 1 },
        chapters: [{ title: 'Homecoming / การกลับบ้าน', synopsis: 'มินากลับมาเปิดร้านดอกไม้ เธอต้องตัดสินใจว่าจะเริ่มต้นใหม่อย่างไร', seasonNumber: 1 },
          { title: 'A difficult promise', synopsis: 'Old friends reunite as a long-kept secret changes their plans.', seasonNumber: 1 }],
        rationale: 'Two dramatic turns preserve the beginning and ending.', warnings: [], createdAt: '2026-09-26T00:00:00Z' }) : 'null'} }) });
}
createRoot(document.getElementById('root')).render(React.createElement(QueryClientProvider, { client: new QueryClient({ defaultOptions: { queries: { retry: false } } }) },
  React.createElement(MemoryRouter, null, React.createElement(I18nextProvider, { i18n }, React.createElement(Demo)))));
</script></body></html>`;
const server = await createServer({ root: path.join(root, 'web'), configFile: path.join(root, 'web/vite.config.ts'), configLoader: 'runner',
  cacheDir: path.join(output, 'vite-cache'), server: { host: '127.0.0.1', port: 5175, strictPort: false, open: false },
  plugins: [{ name: 'story-import-fixture', configureServer(vite) {
    vite.middlewares.use(async (req, res, next) => {
      if (!req.url?.startsWith('/__story-import') || req.url.includes('html-proxy')) return next();
      try { res.setHeader('Content-Type', 'text/html'); res.end(await vite.transformIndexHtml(req.url, html)); }
      catch (error) { next(error); }
    });
  } }] });
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  if (chapterOutline) await page.addInitScript(() => localStorage.setItem('mpf_active_mock_user_id', 'fixture'));
  const errors = [];
  page.on('pageerror', error => { errors.push(error.message); console.error(error.message); });
  await page.route('**/assets/cinematic/flags/*.svg', route => route.fulfill({
    path: path.join(root, 'client/assets/cinematic/flags', path.basename(new URL(route.request().url()).pathname))
  }));
  await page.route('**/api/**', route => {
    if (!new URL(route.request().url()).pathname.startsWith('/api/')) return route.continue();
    const pathname = new URL(route.request().url()).pathname;
    if (chapterOutline && pathname === '/api/cinematic/projects/fixture/chapter-outline/estimate') return route.fulfill({ json: {
      projectVersion: 1, billingStatus: 'qualification_no_charge', estimates: Object.fromEntries(['chapter_outline', 'chapters'].map(operation => [operation, {
        operation, model: 'fixture', credits: 165, retailThb: 16.5, chargeCredits: 0, policyVersion: 'fixture',
        costBasis: 'advisory_byte_estimate', exceedsValueTarget: false }])) } });
    if (route.request().method() !== 'GET') throw new Error('Isolated preview attempted an API mutation');
    if (pathname === '/api/me') return route.fulfill({ json: { userId: 'fixture', username: 'fixture', role: 'user', displayName: 'Fixture' } });
    if (pathname === '/api/mock-users') return route.fulfill({ json: { enabled: false, users: [] } });
    if (pathname === '/api/fixture-missing-portrait') return route.fulfill({ status: 404, body: '' });
    return route.fulfill({ json: { series: null,
      productionProject: { id: 'fixture', productionProjectId: 'fixture', storyProjectId: 'fixture', version: 1,
        title: 'Story fixture', format: 'mini-series', seasonsEnabled: false, chapterCount: castTarget ? 1 : 0, chapterWorkStarted: castTarget },
      chapters: castTarget ? [{ projectId: 'fixture', ownerUserId: 'fixture', activeStage: 'cast', durationSeconds: 60,
        status: 'draft', updatedAt: '2026-09-26T00:00:00Z', productionProjectId: 'fixture', chapterId: 'fixture',
        productionUnitId: 'fixture', seasonId: null, order: 1, title: 'Arrival', classification: 'authored', storyBrief: 'Existing Chapter prose.' }] : [] } });
  });
  for (const locale of ['th', 'en']) for (const width of [390, 820, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    await page.goto(`${server.resolvedUrls.local[0]}__story-import?locale=${locale}`, { waitUntil: 'networkidle' });
    if (sceneCast) {
      await page.locator('.cinematic-scene-looks').waitFor();
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await page.locator('.cinematic-director-cast__portrait svg').count(), 2);
      for (const item of await page.locator('.cinematic-director-cast__character').all()) {
        const portrait = await item.locator('.cinematic-director-cast__portrait').boundingBox();
        const identity = await item.locator(':scope > span:last-child').boundingBox();
        assert.ok(identity.width > 150 && identity.x >= portrait.x + portrait.width, `${locale}/${width} identity track`);
      }
      assert.ok(await page.locator('body').evaluate(element => element.scrollWidth <= element.clientWidth + 1), `${locale}/${width} Scene Cast overflow`);
      await page.screenshot({ path: path.join(output, `${locale}-${width}-scene-cast.png`), fullPage: true });
      continue;
    }
    await page.getByTestId('cinematic-new-project').waitFor();
    if (importSource) {
      await page.locator('input[type=file]').setInputFiles({ name: 'brief-' + 'long-name-'.repeat(8) + '.md', mimeType: 'text/markdown', buffer: Buffer.from('An imported story idea.') });
      await page.getByRole('button', { name: catalogs[locale]['cinematic.storyImport.apply.draft'] }).click();
      const brief = page.locator('.cinematic-new-project__brief-field');
      await page.locator('.cinematic-story-import__source').waitFor();
      assert.equal(await brief.isVisible(), false);
      await page.getByRole('button', { name: catalogs[locale]['cinematic.storyImport.editBrief'] }).click();
      assert.equal(await brief.locator('textarea').inputValue(), 'An imported story idea.');
      await brief.locator('textarea').fill('An edited imported idea.');
      await page.getByText(catalogs[locale]['cinematic.storyImport.sourceEdited'], { exact: true }).waitFor();
      await page.getByRole('button', { name: catalogs[locale]['cinematic.storyImport.hideBrief'] }).click();
      assert.ok(await page.locator('body').evaluate(element => element.scrollWidth <= element.clientWidth + 1), `${locale}/${width} source overflow`);
      await page.screenshot({ path: path.join(output, `${locale}-${width}-brief-source.png`), fullPage: true });
    }
    const content = locale === 'th' ? 'มินากลับบ้านและเปิดร้านดอกไม้ เธอได้พบเพื่อนเก่าที่มาช่วยดูแลร้าน\n'.repeat(30) : 'Mina returns home and opens her flower shop. An old friend helps her.\n'.repeat(30);
    await page.locator('input[type=file]').setInputFiles({ name: locale === 'th' ? 'เรื่องราวของมินา.md' : 'Mina-story.md', mimeType: 'text/markdown', buffer: Buffer.from(content) });
    await page.getByRole('textbox', { name: catalogs[locale]['cinematic.storyImport.preview'] }).waitFor();
    await page.evaluate(() => document.fonts.ready);
    assert.ok(await page.locator('body').evaluate(element => element.scrollWidth <= element.clientWidth + 1), `${locale}/${width} import overflow`);
    await page.screenshot({ path: path.join(output, `${locale}-${width}-preview.png`), fullPage: true });
    await page.getByRole('button', { name: catalogs[locale][`cinematic.storyImport.${importSource ? 'replace' : 'apply'}.full-story`] }).click();
    await page.getByTestId('cinematic-full-story').waitFor();
    assert.equal(await page.locator('.cinematic-full-story__document > textarea').inputValue(), content.trim());
    await page.getByRole('button', { name: catalogs[locale]['cinematic.storyImport.extractCharacters'] }).waitFor();
    assert.ok(await page.locator('body').evaluate(element => element.scrollWidth <= element.clientWidth + 1), `${locale}/${width} writer overflow`);
    await page.screenshot({ path: path.join(output, `${locale}-${width}-story.png`), fullPage: true });
    if (importSource) {
      await page.getByRole('button', { name: catalogs[locale]['cinematic.fullStory.backToBrief'], exact: true }).click();
      await page.getByRole('button', { name: catalogs[locale]['cinematic.storyImport.editFullStory'] }).waitFor();
      assert.equal(await page.locator('.cinematic-new-project__brief-field').isVisible(), false);
      assert.ok(await page.locator('body').evaluate(element => element.scrollWidth <= element.clientWidth + 1), `${locale}/${width} Full Story source overflow`);
      await page.screenshot({ path: path.join(output, `${locale}-${width}-full-source.png`), fullPage: true });
      await page.getByRole('button', { name: catalogs[locale]['cinematic.storyImport.editFullStory'] }).click();
      assert.equal(await page.locator('.cinematic-full-story__document > textarea').inputValue(), content.trim());
      continue;
    }
    if (chapterOutline) {
      const outline = page.locator('.cinematic-chapter-outline');
      await outline.scrollIntoViewIfNeeded();
      await page.getByRole('button', { name: catalogs[locale]['cinematic.chapterOutline.estimate'] }).click();
      await page.locator('.cinematic-chapter-outline__estimate').waitFor();
      const prices = outline.locator('.cinematic-chapter-outline__price');
      assert.deepEqual(await prices.allTextContents(), Array(2).fill(locale === 'th' ? '165 เครดิต' : '165 Credits'));
      for (const price of await prices.all()) {
        assert.ok(await price.evaluate(element => {
          const probe = document.createElement('span');
          probe.style.color = 'var(--theme-warning)'; element.append(probe);
          const matches = getComputedStyle(element).color === getComputedStyle(probe).color;
          probe.remove(); return matches;
        }), `${locale}/${width} Credit amount uses yellow theme token`);
      }
      await outline.getByRole('button', { name: catalogs[locale]['cinematic.chapterOutline.add'] }).click();
      assert.equal(await outline.getByRole('button', { name: catalogs[locale]['cinematic.chapterOutline.approve'] }).isEnabled(), false);
      await outline.getByRole('button', { name: catalogs[locale]['cinematic.chapterOutline.reset'] }).click();
      for (const field of await outline.locator('input,textarea').all()) {
        const bounds = await field.boundingBox();
        assert.ok(bounds.width >= 180 && bounds.x + bounds.width <= width, `${locale}/${width} outline field sizing`);
      }
      assert.ok(await page.locator('body').evaluate(element => element.scrollWidth <= element.clientWidth + 1), `${locale}/${width} outline overflow`);
      await outline.screenshot({ path: path.join(output, `${locale}-${width}-outline.png`) });
      await page.screenshot({ path: path.join(output, `${locale}-${width}-outline-page.png`), fullPage: true });
      continue;
    }
    if (castTarget) {
      await page.getByRole('button', { name: catalogs[locale]['cinematic.characters.collapse'] }).click();
      assert.equal(await page.locator('.cinematic-shared-characters__body').isVisible(), false);
      await page.screenshot({ path: path.join(output, `${locale}-${width}-collapsed.png`), fullPage: true });
      await page.getByRole('button', { name: catalogs[locale]['cinematic.characters.expand'] }).click();
      assert.equal(await page.locator('.cinematic-shared-characters__body').isVisible(), true);
      await page.getByRole('button', { name: catalogs[locale]['cinematic.fullStory.continueChapters'] }).click();
      await page.getByTestId('cinematic-chapter-writer').waitFor();
      await page.getByRole('button', { name: catalogs[locale]['cinematic.chapterPlan.editSetup'] }).waitFor();
      assert.ok(await page.locator('.cinematic-chapter-target').innerText().then(text => text.includes('8')));
      assert.ok(await page.locator('body').evaluate(element => element.scrollWidth <= element.clientWidth + 1), `${locale}/${width} Chapter overflow`);
      await page.screenshot({ path: path.join(output, `${locale}-${width}-chapter.png`), fullPage: true });
    }
  }
  assert.deepEqual(errors, []);
  console.log(`PASS ${chapterOutline ? 'Chapter outline' : sceneCast ? 'Scene Cast layout' : castTarget ? 'Cast disclosure and Chapter targets' : 'story import and Full Story'}, TH/EN 390/820/1440. Screenshots: ${output}`);
} finally {
  await browser?.close();
  await server.close();
}

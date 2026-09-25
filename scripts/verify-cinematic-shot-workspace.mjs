import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import { createSingleCharacterCinematicProject } from '../test/fixtures/cinematic/cinematicProjectFixtures.js';
import { createCinematicProjectRecord } from '../server/repositories/cinematic/cinematicProjectRecord.js';
import { CinematicApplicationService } from '../server/domain/cinematic/CinematicApplicationService.js';

const origin = process.env.CINEMATIC_WEB_ORIGIN || 'http://127.0.0.1:6502';
const lookReview = process.argv.includes('--looks');
const storyLayoutReview = process.argv.includes('--story-layout');
const lookRatioReview = process.argv.includes('--look-ratio');
assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname));
const moduleSource = await (await fetch(`${origin}/src/components/generation/GenerationExperience.tsx`)).text();
const version = moduleSource.match(/react\.js(\?v=[a-z0-9]+)/)?.[1] || '';
const actorModule = moduleSource.match(/"(\/src\/lib\/auth\/ActorProvider\.tsx[^"]*)"/)?.[1] || '/src/lib/auth/ActorProvider.tsx';
const actor = { userId: 'usr_fixture_owner', username: 'fixture_owner', role: 'user', displayName: 'Fixture' };
const output = await fs.mkdtemp(path.join(os.tmpdir(), 'mpf-shot-workspace-'));
const fontRoot = `/@fs/${path.resolve('node_modules/@fontsource').replaceAll('\\', '/')}`;
const photo = await fs.readFile('client/assets/scene-builder/shot-recipes/cafe-seated-lifestyle.jpg');
const browser = await chromium.launch({ headless: true });
const errors = [];
try {
  for (const locale of ['en', 'th']) {
    const original = createSingleCharacterCinematicProject();
    let project = createCinematicProjectRecord({ title: 'Rain Letters', format: 'short-film', durationSeconds: 30,
      platform: 'reels', storyBrief: 'Two people meet in the rain.', mode: 'simple', creativeDirection: '',
      genre: 'drama', audienceFeeling: 'moved', pacing: 'balanced', endingIntent: 'resolved' }, actor);
    project.castAssignments = original.castAssignments;
    project.scenes = original.scenes;
    const scene = project.scenes[0], shot = scene.shots[0], person = project.castAssignments[0];
    person.portraitUrl = '/api/fixture-media'; person.dialogueStyle = 'Soft, measured Thai speech';
    if (lookReview || storyLayoutReview) {
      Object.assign(person, { characterProfileId: 'fixture_profile', characterProfileVersionId: 'fixture_identity', identityReady: true });
      person.looks = [{ id: 'fixture_look', name: 'Work clothes / ชุดทำงานหน้าร้านดอกไม้', mode: 'character_look', locked: true,
        characterLookId: 'fixture_look', characterLookVersionId: 'fixture_look_v1', characterLookProvenance: { kind: 'user_uploaded' } }];
      scene.wardrobeLookIds = ['fixture_look']; shot.wardrobeLookIds = [];
    }
    let storyWorkspace;
    if (storyLayoutReview) {
      const names = locale === 'th' ? ['หญิงเล็ก (เล็ก)', 'ชาติ', 'ต้นน้ำ', 'วิน', 'เสี่ยประจวบ', 'ป้าสมพร']
        : ['Lek', 'Chat', 'Tonnam', 'Win', 'Prachuap', 'Somporn'];
      project.castAssignments = names.map((name, index) => ({ ...structuredClone(person),
        id: `fixture_cast_${index}`, displayName: name,
        storyRole: locale === 'th' ? 'คนงานในโรงงานผู้มุ่งมั่นสร้างชีวิตใหม่และดูแลครอบครัว'
          : 'A determined factory worker building a new life while caring for their family.',
        looks: index === 1 ? person.looks : [], portraitUrl: index < 2 ? '/api/fixture-media' : null
      }));
      const content = locale === 'th' ? 'เล็กออกจากบ้านเพื่อเริ่มต้นชีวิตใหม่ในเมือง เธอได้พบกับชาติและเพื่อนร่วมงานที่ค่อย ๆ กลายเป็นครอบครัว ท่ามกลางความกดดันในโรงงาน ทุกคนต้องตัดสินใจว่าจะรักษาความฝันของตัวเองไว้ได้อย่างไร'
        : 'Lek leaves home to begin a new life in the city. She meets Chat and a group of coworkers who gradually become her family. Under pressure at the factory, each must decide how to protect their dreams.';
      project.fullStoryVersions = [{ id: 'fixture_revision', version: 1, parentRevisionId: null,
        content, source: 'manual', revisionInstruction: '', status: 'confirmed', provenance: null,
        createdAt: '2026-09-25T00:00:00.000Z' }];
      project.activeFullStoryVersionId = 'fixture_revision';
      project.confirmedFullStoryVersionId = 'fixture_revision';
      storyWorkspace = { series: null,
        productionProject: { id: project.id, productionProjectId: project.id, version: 1, storyProjectId: project.id,
          title: project.title, format: project.setup.format, seasonsEnabled: false, chapterCount: 3, chapterWorkStarted: true },
        chapters: [1, 2, 3].map(order => ({ projectId: `fixture_chapter_${order}`, ownerUserId: actor.userId,
          title: locale === 'th' ? `บทที่ ${order}: เริ่มต้นชีวิตใหม่` : `Chapter ${order}: A new beginning`,
          activeStage: 'setup', durationSeconds: 60, status: 'draft', updatedAt: '2026-09-25T00:00:00.000Z',
          productionProjectId: project.id, chapterId: `fixture_chapter_${order}`, productionUnitId: `fixture_chapter_${order}`,
          seasonId: null, order, storyBrief: content, classification: 'generated' })) };
    }
    shot.approvedStoryboardSource.imageUrl = '/api/fixture-media';
    shot.approvedStoryboardSource.thumbnailUrl = '/api/fixture-media';
    scene.approvedEnvironmentSource = { ...shot.approvedStoryboardSource };
    shot.durationMs = 8000;
    shot.shotDocument = `SHOT DURATION\n8 seconds\n\nSCENE\nRainy night outside the shop.\n\nOPENING\nShe holds the door and looks toward her guest.\n\nCAMERA\nLocked medium shot.\n\nPERFORMANCE AND TIMELINE\n[0-8 sec] She speaks softly; her guest listens and nods.\n\nDIALOGUE AND FACIAL PERFORMANCE\n[0-5 sec] ${person.displayName} (apologetic): ขอโทษนะคะ ฉันจะชดใช้ให้ค่ะ\nThe listener relaxes his shoulders.\n\nAUDIO\nRain outside. No music.`;
    const service = new CinematicApplicationService({ repository: {
      findForActor: async () => structuredClone(project),
      mutateForActor: async (_id, _actor, operation) => {
        const draft = structuredClone(project), result = await operation(draft);
        project = draft; return structuredClone(result);
      }
    }, videoGenerationService: { getStoredTaskSummaries: async () => [] } });
    const catalogs = { cinematic: JSON.parse(await fs.readFile(`client/i18n/locales/${locale}/cinematic.json`, 'utf8')),
      playground: JSON.parse(await fs.readFile(`client/i18n/locales/${locale}/playground.json`, 'utf8')) };
    const context = await browser.newContext();
    await context.addInitScript(id => localStorage.setItem('mpf_active_mock_user_id', id), actor.userId);
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin !== origin) return route.abort();
      if (url.pathname === '/__shot-workspace') return route.fulfill({ contentType: 'text/html', body: `<!doctype html>
        <html data-theme="default"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
        <body><div id="root"></div><script type="module">
        import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);
        window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;
        await import('/src/styles/globals.css');
        await import('${fontRoot}/poppins/500.css');
        await import('${fontRoot}/noto-sans-thai/500.css');
        const {default:React}=await import('/node_modules/.vite/deps/react.js${version}');
        const {default:ReactDOM}=await import('/node_modules/.vite/deps/react-dom_client.js${version}');
        const {QueryClient,QueryClientProvider}=await import('/node_modules/.vite/deps/@tanstack_react-query.js${version}');
        const {default:i18n}=await import('/node_modules/.vite/deps/i18next.js${version}');
        const {I18nextProvider,initReactI18next}=await import('/node_modules/.vite/deps/react-i18next.js${version}');
        const {ActorProvider}=await import(${JSON.stringify(actorModule)});
        const {CinematicShotWriter}=await import('/src/features/cinematic/components/CinematicShotWriter.tsx');
        const {CinematicSceneLooks}=await import('/src/features/cinematic/components/CinematicSceneLooks.tsx');
        const {CinematicSharedCharactersPanel}=await import('/src/features/cinematic/components/CinematicSharedCharactersPanel.tsx');
        const {CinematicFullStoryWriter}=await import('/src/features/cinematic/components/CinematicFullStoryWriter.tsx');
        const {EngineTargetPanel}=await import('/src/components/generation/EngineTargetPanel.tsx');
        await i18n.use(initReactI18next).init({lng:'${locale}',keySeparator:false,interpolation:{prefix:'{',suffix:'}',escapeValue:false},resources:{${locale}:${JSON.stringify(catalogs)}}});
        const e=React.createElement, client=new QueryClient({defaultOptions:{queries:{retry:false}}});
        function App(){const[p,setProject]=React.useState(${JSON.stringify(project)});const view=new URL(location.href).searchParams.get('view');
        const common={actorId:'${actor.userId}',project:p,online:true,onProjectChanged:setProject};
        if(view==='look-ratio')return e('div',{style:{maxWidth:900,padding:20,margin:'auto'}},e(EngineTargetPanel,{
          catalog:{defaultProvider:'fixture',providers:[{id:'fixture',displayName:'Fixture Provider',models:[{id:'fixture-image',displayName:'Fixture Image',paidRoutingEnabled:true,capabilities:{aspectRatios:['1:1','9:16'],maxReferenceImages:6,imageGeneration:true}}]}]},
          value:{provider:'fixture',model:'fixture-image',aspectRatio:'1:1',resolution:null,outputCount:1},
          fixedAspectRatio:'9:16',allowComparison:false,allowMultiOutput:false,comparison:false,comparisonSlots:[],onChange:()=>{},onComparisonChange:()=>{},onSlotsChange:()=>{}}));
        if(view==='story')return e('div',{style:{maxWidth:1440,padding:16,margin:'auto'}},e(CinematicFullStoryWriter,{...common,onBackToBrief:()=>{},onOpenChapters:()=>{}}));
        if(view==='characters')return e('div',{style:{maxWidth:620,padding:20,margin:'auto'}},e(CinematicSharedCharactersPanel,{...common,storyProjectId:p.id}));
        if(view==='scene')return e('div',{style:{maxWidth:900,padding:20,margin:'auto'}},e(CinematicSceneLooks,{...common,scene:p.scenes[0],disabled:false}));
        return e(CinematicShotWriter,{...common,shotId:'${shot.id}',onBackToScenes:()=>{},onOpenShot:()=>{},onOpenFirstFrame:()=>{},onOpenCharacters:()=>{},onOpenVideo:()=>{window.openedVideo=true;}});}
        ReactDOM.createRoot(document.getElementById('root')).render(e(QueryClientProvider,{client},e(ActorProvider,null,e(I18nextProvider,{i18n},e(App)))));
        </script></body></html>` });
      if (url.pathname === '/api/me') return route.fulfill({ json: actor });
      if (url.pathname === '/api/mock-users') return route.fulfill({ json: { enabled: false, users: [] } });
      if (url.pathname === '/api/fixture-media') return route.fulfill({ body: photo, contentType: 'image/jpeg' });
      if ((lookReview || storyLayoutReview) && url.pathname.endsWith('/media/sheet')) return route.fulfill({ body: photo, contentType: 'image/jpeg' });
      if ((lookReview || storyLayoutReview) && url.pathname === `/api/cinematic/projects/${project.id}`) return route.fulfill({ json: project });
      if ((lookReview || storyLayoutReview) && url.pathname === '/api/character-profiles/fixture_profile/looks') return route.fulfill({ json: { items: [] } });
      if (storyLayoutReview && url.pathname === `/api/cinematic/projects/${project.id}/series`) return route.fulfill({ json: storyWorkspace });
      if (url.pathname.endsWith('/writer-preparation')) return route.fulfill({ json: await service.prepareShotWriter(project.id, scene.id, shot.id, actor) });
      if (url.pathname.endsWith('/document')) return route.fulfill({ json: await service.updateShotDocument(project.id, scene.id, shot.id, request.postDataJSON(), actor) });
      if (url.pathname.startsWith('/api/')) return route.fulfill({ status: 404, json: { error: { message: `Fixture API unavailable: ${url.pathname}` } } });
      return route.continue();
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    const t = key => catalogs.cinematic[key];
    if (lookRatioReview) {
      for (const width of [390, 820, 1440]) {
        await page.setViewportSize({ width, height: 950 });
        await page.goto(`${origin}/__shot-workspace?view=look-ratio`);
        const ratio = page.getByRole('button', { name: '9:16 Mobile' });
        await ratio.waitFor();
        await page.evaluate(() => document.fonts.ready);
        assert.equal(await page.getByLabel(catalogs.playground['playground.engine.width'], { exact: true }).inputValue(), '768');
        assert.equal(await page.getByLabel(catalogs.playground['playground.engine.height'], { exact: true }).inputValue(), '1365');
        assert.ok(await ratio.isDisabled());
        assert.ok((await ratio.getAttribute('class')).includes('is-selected'));
        assert.equal(await page.getByRole('button', { name: '1:1 Square' }).count(), 0);
        assert.ok(await page.locator('body').evaluate(element => element.scrollWidth <= element.clientWidth + 1));
        await page.screenshot({ path: path.join(output, `${locale}-look-ratio-${width}.png`), fullPage: true });
      }
      await context.close();
      continue;
    }
    if (storyLayoutReview) {
      for (const width of [390, 820, 1440]) {
        await page.setViewportSize({ width, height: 950 });
        await page.goto(`${origin}/__shot-workspace?view=story`);
        await page.locator('.cinematic-full-story__chapter-result li').first().waitFor();
        await page.evaluate(() => document.fonts.ready);
        const doc = page.locator('.cinematic-full-story__document');
        assert.equal(await doc.locator('.cinematic-full-story__chapter-result li').count(), 3);
        assert.equal(await page.locator('.cinematic-full-story__side-rail > .cinematic-full-story__assistant').count(), 1);
        assert.equal(await page.locator('.cinematic-full-story__side-rail > .cinematic-full-story__chapters-action').count(), 1);
        assert.equal(await page.locator('.cinematic-full-story__history').count(), 1);
        const people = page.locator('.cinematic-shared-characters > ul > li');
        assert.equal(await people.count(), 6);
        await people.first().locator('.cinematic-character-looks > summary').click();
        await people.first().getByRole('button', { name: t('cinematic.lookReferences.generate'), exact: true }).waitFor();
        assert.equal(await people.first().getByText(t('cinematic.lookReferences.empty'), { exact: true }).count(), 1);
        await page.waitForFunction(() => [...document.images].every(image => image.complete));
        assert.ok(await page.locator('img').evaluateAll(images => images.every(image => image.naturalWidth > 0)));
        assert.ok(await page.locator('body').evaluate(element => element.scrollWidth <= element.clientWidth + 1), `${locale}/${width} page overflow`);
        assert.ok(await people.evaluateAll(items => items.every((item, index) => {
          const bounds = item.getBoundingClientRect();
          return item.scrollWidth <= item.clientWidth + 1 && (!items[index + 1] || bounds.bottom <= items[index + 1].getBoundingClientRect().top);
        })), `${locale}/${width} Character overflow/overlap`);
        const editorBox = await doc.locator(':scope > footer').boundingBox();
        const resultBox = await doc.locator('.cinematic-full-story__chapter-result').boundingBox();
        assert.ok(resultBox.y >= editorBox.y + editorBox.height, 'Chapters must follow story actions');
        for (const theme of ['default', 'fashion', 'creative']) {
          await page.locator('html').evaluate((element, value) => element.dataset.theme = value, theme);
          await page.screenshot({ path: path.join(output, `${locale}-story-layout-${theme}-${width}.png`), fullPage: true });
        }
        await people.first().screenshot({ path: path.join(output, `${locale}-story-character-${width}.png`) });
        await people.first().locator('.cinematic-character-voice > summary').click();
        await people.first().locator('.cinematic-character-voice textarea').fill('A calm, measured voice.');
        assert.ok(await people.first().getByRole('button', { name: t('cinematic.characters.save'), exact: true }).isEnabled());
      }
      await context.close();
      continue;
    }
    if (lookReview) {
      for (const view of ['characters', 'scene', 'shot']) for (const width of [390, 820, 1440]) {
        await page.setViewportSize({ width, height: 950 });
        await page.goto(`${origin}/__shot-workspace?view=${view}`);
        await page.evaluate(() => document.fonts.ready);
        if (view === 'characters') {
          await page.locator('.cinematic-character-looks > summary').click();
          await page.getByRole('button', { name: t('cinematic.lookReferences.generate'), exact: true }).waitFor();
        } else if (view === 'scene') {
          await page.getByRole('combobox').waitFor();
          assert.equal(await page.getByRole('combobox').inputValue(), 'fixture_look');
        } else {
          await page.locator('.cinematic-shot-workspace__look').waitFor();
          assert.ok((await page.locator('.cinematic-shot-workspace__look').innerText()).includes(t('cinematic.lookReferences.scope.scene')));
        }
        await page.waitForFunction(() => [...document.images].every(image => image.complete));
        assert.ok(await page.locator('body').evaluate(element => element.scrollWidth <= element.clientWidth + 1), `${locale}/${view}/${width} overflow`);
        assert.ok(await page.locator('img').evaluateAll(images => images.every(image => image.naturalWidth > 0)), `${view} missing media`);
        await page.screenshot({ path: path.join(output, `${locale}-looks-${view}-${width}.png`), fullPage: true });
        if (view === 'characters') {
          await page.getByRole('button', { name: t('cinematic.lookReferences.generate'), exact: true }).click();
          await page.getByRole('dialog').waitFor();
          await page.getByRole('combobox', { name: t('cinematic.lookDraft.generationStyle') }).waitFor();
          assert.ok(await page.locator('body').evaluate(element => element.scrollWidth <= element.clientWidth + 1));
          await page.screenshot({ path: path.join(output, `${locale}-look-style-${width}.png`), fullPage: true });
        }
      }
      await context.close();
      continue;
    }
    for (const width of [390, 820, 1440]) {
      await page.setViewportSize({ width, height: 950 });
      await page.goto(`${origin}/__shot-workspace`);
      await page.getByTestId('cinematic-shot-writer').waitFor();
      await page.evaluate(() => document.fonts.ready);
      await page.locator('.cinematic-shot-workspace__exchange').waitFor();
      await page.getByText(t('cinematic.shotWorkspace.videoPrompt'), { exact: true }).click();
      const editor = page.getByRole('textbox', { name: t('cinematic.shotWorkspace.videoPrompt') });
      await editor.waitFor();
      assert.ok((await editor.inputValue()).includes('ขอโทษนะคะ'));
      assert.ok(await page.locator('body').evaluate(element => element.scrollWidth <= element.clientWidth + 1), `${locale}/${width} overflow`);
      assert.equal(await page.locator('img').evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0)), true);
      await page.screenshot({ path: path.join(output, `${locale}-${width}.png`), fullPage: true });
    }
    const editor = page.getByRole('textbox', { name: t('cinematic.shotWorkspace.videoPrompt') });
    const custom = `${await editor.inputValue()}\nHold the final expression.`;
    await editor.fill(custom);
    await page.getByRole('button', { name: t('cinematic.shotWorkspace.savePrompt'), exact: true }).click();
    try { await page.waitForFunction(() => document.querySelector('.cinematic-shot-workspace__section > button')?.disabled === false); }
    catch (error) {
      await page.screenshot({ path: path.join(output, 'failure.png'), fullPage: true });
      console.error({ output, alerts: await page.locator('[role="alert"]').allTextContents(), errors,
        overrideStale: (await service.prepareShotWriter(project.id, scene.id, shot.id, actor)).overrideStale });
      throw error;
    }
    assert.equal(project.scenes[0].shots[0].videoPromptOverride.text, custom);
    await page.reload();
    await page.locator('.cinematic-shot-workspace__exchange').waitFor();
    await page.getByText(t('cinematic.shotWorkspace.videoPrompt'), { exact: true }).click();
    assert.equal(await page.getByRole('textbox', { name: t('cinematic.shotWorkspace.videoPrompt') }).inputValue(), custom);
    await context.close();
  }
  assert.deepEqual(errors, []);
  console.log(`PASS ${lookRatioReview ? 'Fixed portrait engine with stored square selection' : storyLayoutReview ? 'Full Story chapter placement and six-Character layout (three themes)' : lookReview ? 'Character/Scene/Shot Look references and style dialog' : 'Shot workspace and custom prompt save/reload'} TH/EN at 390/820/1440. Screenshots: ${output}`);
} finally { await browser.close(); }

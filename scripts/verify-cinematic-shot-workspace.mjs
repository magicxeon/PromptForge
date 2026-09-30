import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import { createSingleCharacterCinematicProject } from '../test/fixtures/cinematic/cinematicProjectFixtures.js';
import { createCinematicProjectRecord } from '../server/repositories/cinematic/cinematicProjectRecord.js';
import { CinematicApplicationService } from '../server/domain/cinematic/CinematicApplicationService.js';

// GC04: node scripts/verify-cinematic-shot-workspace.mjs --writer-confirmation --isolated
// Requires installed Playwright Chromium; all API traffic is intercepted below.
let origin = process.env.CINEMATIC_WEB_ORIGIN || 'http://127.0.0.1:6502';
let vite;
let browser;
let output;
try {
if (process.argv.includes('--isolated')) {
  const { createServer } = await import('vite');
  vite = await createServer({ root: path.resolve('web'), configFile: path.resolve('web/vite.config.ts'),
    server: { host: '127.0.0.1', port: 0, open: false } });
  await vite.listen();
  origin = `http://127.0.0.1:${vite.httpServer.address().port}`;
}
const lookReview = process.argv.includes('--looks');
const writerConfirmationReview = process.argv.includes('--writer-confirmation');
const storyLayoutReview = process.argv.includes('--story-layout') || writerConfirmationReview;
const lookRatioReview = process.argv.includes('--look-ratio');
const flowReview = process.argv.includes('--flow');
const authoringReview = process.argv.includes('--authoring') || flowReview;
assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname));
const moduleSource = await (await fetch(`${origin}/src/components/generation/GenerationExperience.tsx`)).text();
const version = moduleSource.match(/react\.js(\?v=[a-z0-9]+)/)?.[1] || '';
const actorModule = moduleSource.match(/"(\/src\/lib\/auth\/ActorProvider\.tsx[^"]*)"/)?.[1] || '/src/lib/auth/ActorProvider.tsx';
const actor = { userId: 'usr_fixture_owner', username: 'fixture_owner', role: 'user', displayName: 'Fixture' };
output = await fs.mkdtemp(path.join(os.tmpdir(), 'mpf-shot-workspace-'));
console.log(`Fixture origin: ${origin}; screenshots: ${output}`);
const fontRoot = `/@fs/${path.resolve('node_modules/@fontsource').replaceAll('\\', '/')}`;
const photo = await fs.readFile('client/assets/scene-builder/shot-recipes/cafe-seated-lifestyle.jpg');
browser = await chromium.launch({ headless: true });
const errors = [];
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
    if (writerConfirmationReview) {
      project.chapterTitle = storyWorkspace.chapters[0].title;
      project.chapterStory = project.fullStoryVersions[0].content;
      project.activeChapterVersionId = 'fixture-chapter-revision';
      scene.synopsis = project.chapterStory;
    }
    shot.approvedStoryboardSource.imageUrl = '/api/fixture-media';
    shot.approvedStoryboardSource.thumbnailUrl = '/api/fixture-media';
    scene.approvedEnvironmentSource = { ...shot.approvedStoryboardSource };
    shot.durationMs = 8000;
    if (flowReview) {
      shot.approvedVideoAttemptId = 'fixture-selected-take';
      project.generationAttempts = [{ id: 'fixture-selected-take', shotId: shot.id, operation: 'cinematic_draft_clip', status: 'approved',
        outputAsset: { id: 'fixture-clip', publicUrl: '/api/fixture-video', posterUrl: '/api/fixture-media' },
        usableRange: { trimInMs: 500, trimOutMs: 4000 } }];
      scene.shots.push({ ...structuredClone(shot), id: 'fixture-missing-shot', title: locale === 'th' ? 'บทสนทนาต่อเนื่องที่ยังไม่ได้เลือกคลิป' : 'The next exchange without a selected Take', orderKey: 2, approvedVideoAttemptId: null });
      scene.shotOrder = [shot.id, 'fixture-missing-shot'];
    }
    if (authoringReview) { shot.videoReferenceMode = 'storyboard_only'; project.setup.videoDirection = 'No music. Rain ambience only.'; }
    shot.shotDocument = `SHOT DURATION\n8 seconds\n\nSCENE\nRainy night outside the shop.\n\nOPENING\nShe holds the door and looks toward her guest.\n\nCAMERA\nLocked medium shot.\n\nPERFORMANCE AND TIMELINE\n[0-8 sec] She speaks softly; her guest listens and nods.\n\nDIALOGUE AND FACIAL PERFORMANCE\n[0-5 sec] ${person.displayName} (apologetic): ขอโทษนะคะ ฉันจะชดใช้ให้ค่ะ\nThe listener relaxes his shoulders.\n\nAUDIO\nRain outside. No music.`;
    const service = new CinematicApplicationService({ repository: {
      findForActor: async () => structuredClone(project),
      mutateForActor: async (_id, _actor, operation) => {
        const draft = structuredClone(project), result = await operation(draft);
        project = draft; return structuredClone(result);
      }
    }, storyboardAssetService: { resolveSceneReference: async () => ({ referenceValue: '/api/fixture-media' }) },
      videoGenerationService: { getStoredTaskSummaries: async () => [] } });
    const mutations = [];
    const catalogs = { cinematic: JSON.parse(await fs.readFile(`client/i18n/locales/${locale}/cinematic.json`, 'utf8')),
      'react-ui': JSON.parse(await fs.readFile(`client/i18n/locales/${locale}/react-ui.json`, 'utf8')),
      playground: JSON.parse(await fs.readFile(`client/i18n/locales/${locale}/playground.json`, 'utf8')) };
    const context = await browser.newContext({ serviceWorkers: 'block' });
    await context.addInitScript(id => localStorage.setItem('mpf_active_mock_user_id', id), actor.userId);
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin !== origin) return route.abort();
      if (writerConfirmationReview && url.pathname.startsWith('/api/') && !['GET', 'HEAD'].includes(request.method())) {
        mutations.push({ path: url.pathname, method: request.method(), body: request.postDataJSON() });
        return route.fulfill({ status: 409, json: { error: { message: 'Fixture stopped after dispatch', code: 'FIXTURE_ONLY' } } });
      }
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
        const {CinematicChapterWriter}=await import('/src/features/cinematic/components/CinematicChapterWriter.tsx');
        const {CinematicSceneOverview}=await import('/src/features/cinematic/components/CinematicSceneOverview.tsx');
        const {useCreditConfirmation}=await import('/src/components/generation/useCreditConfirmation.tsx');
        const {CinematicChapterFinal}=await import('/src/features/cinematic/components/CinematicChapterFinal.tsx');
        const {EngineTargetPanel}=await import('/src/components/generation/EngineTargetPanel.tsx');
        await i18n.use(initReactI18next).init({lng:'${locale}',keySeparator:false,interpolation:{prefix:'{',suffix:'}',escapeValue:false},resources:{${locale}:${JSON.stringify(catalogs)}}});
        const e=React.createElement, client=new QueryClient({defaultOptions:{queries:{retry:false}}});
        function CreditFixture(){const consent=useCreditConfirmation({actorId:'${actor.userId}',requestKey:'fixture-quote',estimatedCredits:12.5,
          description:'Rain Letters / '+i18n.t('cinematic.scenes.shots',{ns:'cinematic'})+' 01 / Fixture Provider / Fixture Video Model / 1080p / 8s'});
          return e('main',{style:{padding:24}},consent.dialog,e('button',{onClick:async()=>{if(await consent.request()&&consent.isCurrent())window.fixtureCreditDispatch=(window.fixtureCreditDispatch||0)+1;}},'Open fixture credit consent'));}
        function App(){const[p,setProject]=React.useState(${JSON.stringify(project)});const view=new URL(location.href).searchParams.get('view');
        const common={actorId:'${actor.userId}',project:p,online:true,onProjectChanged:setProject};
        if(view==='credit')return e(CreditFixture);
        if(view==='chapter')return e(CinematicChapterWriter,{...common,onBackToFullStory:()=>{},onNavigateChapter:()=>{},onOpenScenes:()=>{}});
        if(view==='scenes')return e(CinematicSceneOverview,{...common,onBackToChapter:()=>{},onOpenShot:()=>{}});
        if(view==='final')return e('main',{style:{maxWidth:1440,padding:16,margin:'auto'}},e(CinematicChapterFinal,{...common,onBackToScenes:()=>{},onOpenShot:id=>{window.openedShot=id;},onOpenTimeline:()=>{}}));
        if(view==='look-ratio')return e('div',{style:{maxWidth:900,padding:20,margin:'auto'}},e(EngineTargetPanel,{
          catalog:{defaultProvider:'fixture',providers:[{id:'fixture',displayName:'Fixture Provider',models:[{id:'fixture-image',displayName:'Fixture Image',paidRoutingEnabled:true,capabilities:{aspectRatios:['1:1','9:16'],maxReferenceImages:6,imageGeneration:true}}]}]},
          value:{provider:'fixture',model:'fixture-image',aspectRatio:'1:1',resolution:null,outputCount:1},
          fixedAspectRatio:'9:16',allowComparison:false,allowMultiOutput:false,comparison:false,comparisonSlots:[],onChange:()=>{},onComparisonChange:()=>{},onSlotsChange:()=>{}}));
        if(view==='story')return e('div',{style:{maxWidth:1440,padding:16,margin:'auto'}},e(CinematicFullStoryWriter,{...common,onBackToBrief:()=>{},onOpenChapters:()=>{}}));
        if(view==='characters')return e('div',{style:{maxWidth:620,padding:20,margin:'auto'}},e(CinematicSharedCharactersPanel,{...common,storyProjectId:p.id}));
        if(view==='scene')return e('div',{style:{maxWidth:900,padding:20,margin:'auto'}},e(CinematicSceneLooks,{...common,scene:p.scenes[0],disabled:false}));
        return e(CinematicShotWriter,{...common,shotId:'${shot.id}',onBackToScenes:()=>{},onOpenShot:()=>{},onOpenFirstFrame:()=>{},onOpenCharacters:()=>{},onOpenFinal:()=>{},onOpenVideo:()=>{window.openedVideo=true;}});}
        ReactDOM.createRoot(document.getElementById('root')).render(e(QueryClientProvider,{client},e(ActorProvider,null,e(I18nextProvider,{i18n},e(App)))));
        </script></body></html>` });
      if (url.pathname === '/api/me') return route.fulfill({ json: actor });
      if (writerConfirmationReview && url.pathname === '/api/me/preferences') return route.fulfill({ json: { confirmCreditUsage: true } });
      if (url.pathname === '/api/mock-users') return route.fulfill({ json: { enabled: false, users: [] } });
      if (url.pathname === '/api/fixture-media') return route.fulfill({ body: photo, contentType: 'image/jpeg' });
      if (url.pathname === '/api/fixture-video') return route.fulfill({ status: 204 });
      if (flowReview && url.pathname.endsWith('/clip-bundle')) return route.fulfill({ json: {
        projectId: project.id, projectVersion: project.version, sizeBytes: 100,
        clips: [{ name: 'Scene-01_Shot-01_Take-01.mp4', sizeBytes: 100, assetId: 'fixture-clip', shotId: shot.id, attemptId: 'fixture-selected-take' }],
        missing: [{ sceneNumber: 1, shotNumber: 2, sceneId: scene.id, shotId: 'fixture-missing-shot', reason: 'no_selection' }]
      } });
      if ((lookReview || storyLayoutReview) && url.pathname.endsWith('/media/sheet')) return route.fulfill({ body: photo, contentType: 'image/jpeg' });
      if ((lookReview || storyLayoutReview) && url.pathname === `/api/cinematic/projects/${project.id}`) return route.fulfill({ json: project });
      if ((lookReview || storyLayoutReview) && url.pathname === '/api/character-profiles/fixture_profile/looks') return route.fulfill({ json: { items: [] } });
      if (storyLayoutReview && url.pathname === `/api/cinematic/projects/${project.id}/series`) return route.fulfill({ json: storyWorkspace });
      if (url.pathname.endsWith('/writer-preparation')) return route.fulfill({ json: await service.prepareShotWriter(project.id, scene.id, shot.id, actor) });
      if (url.pathname.endsWith('/writer-export')) return route.fulfill({ json: await service.exportShotWriter(project.id, scene.id, shot.id, request.postDataJSON(), actor) });
      if (url.pathname.endsWith('/document')) return route.fulfill({ json: await service.updateShotDocument(project.id, scene.id, shot.id, request.postDataJSON(), actor) });
      if (url.pathname.startsWith('/api/')) return route.fulfill({ status: 404, json: { error: { message: `Fixture API unavailable: ${url.pathname}` } } });
      return route.continue();
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    const t = key => catalogs.cinematic[key];
    if (writerConfirmationReview) {
      const assertLayout = async (label, locator) => {
        assert.ok(await page.locator('body').evaluate(element => element.scrollWidth <= element.clientWidth + 1), `${label}: page overflow`);
        if (locator) assert.ok(await locator.evaluate(element => {
          const box = element.getBoundingClientRect();
          return box.left >= 0 && box.top >= 0 && box.right <= innerWidth && box.bottom <= innerHeight
            && element.scrollWidth <= element.clientWidth + 1 && element.scrollHeight <= element.clientHeight + 1;
        }), `${label}: dialog clipped or outside viewport`);
      };
      for (const width of [390, 820, 1440]) {
        const initialMutations = mutations.length;
        await page.setViewportSize({ width, height: 950 });
        await page.goto(`${origin}/__shot-workspace?view=story`);
        await page.locator('.cinematic-full-story__chapter-result li').first().waitFor();
        await page.evaluate(() => document.fonts.ready);
        const instruction = page.getByRole('textbox', { name: t('cinematic.fullStory.instruction'), exact: true });
        await instruction.fill('Retain this unsubmitted instruction.');
        const instructionNode = await instruction.elementHandle();
        const assist = page.getByRole('tab', { name: t('cinematic.chapterWriter.assist'), exact: true });
        const characters = page.getByRole('tab', { name: t('cinematic.chapterWriter.characters'), exact: true });
        await assist.focus(); await page.keyboard.press('ArrowRight');
        await page.waitForFunction(label => document.querySelector('[role="tab"][aria-selected="true"]')?.textContent === label, t('cinematic.chapterWriter.characters'));
        assert.ok(await instructionNode.evaluate(element => element.isConnected && !element.checkVisibility()));
        const person = page.locator('.cinematic-shared-characters__body > ul > li').first();
        await person.locator('.cinematic-character-voice > summary').click();
        const voice = person.locator('.cinematic-character-voice textarea');
        await voice.fill('Keep this character voice draft.');
        const voiceNode = await voice.elementHandle();
        await characters.focus(); await page.keyboard.press('ArrowLeft');
        await instruction.waitFor();
        assert.equal(await instruction.inputValue(), 'Retain this unsubmitted instruction.');
        assert.ok(await voiceNode.evaluate(element => element.isConnected && !element.checkVisibility()));
        assert.equal(await page.locator('.cinematic-full-story__document textarea').first().evaluate(element => element.tagName), 'TEXTAREA');
        assert.equal(await page.locator('.cinematic-full-story__document .cinematic-full-story__chapter-result li').count(), 3);
        assert.equal(await page.locator('.cinematic-full-story__side-rail > .cinematic-full-story__chapters-action').count(), 1);
        assert.equal(await page.locator('.cinematic-full-story__history').count(), 1);
        assert.equal(await page.locator('[role="tabpanel"] .cinematic-full-story__history').count(), 0);
        for (const theme of ['default', 'fashion', 'creative']) {
          await page.locator('html').evaluate((element, value) => element.dataset.theme = value, theme);
          await assist.click(); await assertLayout(`${locale}/assist/${theme}/${width}`);
          await page.screenshot({ path: path.join(output, `${locale}-writer-assist-${theme}-${width}.png`), fullPage: true });
          await characters.click(); await voice.waitFor();
          assert.equal(await voice.inputValue(), 'Keep this character voice draft.');
          await assertLayout(`${locale}/characters/${theme}/${width}`);
          await page.screenshot({ path: path.join(output, `${locale}-writer-characters-${theme}-${width}.png`), fullPage: true });
        }
        assert.equal(mutations.length, initialMutations);
        for (const [scope, view, key] of [
          ['chapters', 'chapter', 'cinematic.chapterWriter.regenerateAll'],
          ['scenes', 'scenes', 'cinematic.scenes.regenerate'],
          ['shots', 'scenes', 'cinematic.scenes.regenerateShots']
        ]) {
          await page.goto(`${origin}/__shot-workspace?view=${view}`);
          const trigger = page.getByRole('button', { name: t(key), exact: true });
          await trigger.waitFor(); await page.evaluate(() => document.fonts.ready);
          const baseline = mutations.length;
          await trigger.click();
          const dialog = page.getByRole('alertdialog', { name: t(`cinematic.regeneration.${scope}Title`), exact: true });
          await dialog.waitFor();
          assert.ok((await dialog.innerText()).includes(t(`cinematic.regeneration.${scope}Description`)));
          assert.equal(await dialog.getByRole('checkbox').count(), 0);
          const cancel = dialog.getByRole('button', { name: catalogs['react-ui']['ui.action.cancel'], exact: true });
          const confirm = dialog.getByRole('button', { name: t('cinematic.regeneration.confirm'), exact: true });
          await page.waitForFunction(() => document.activeElement?.closest('[role="alertdialog"]'));
          for (const theme of ['default', 'fashion', 'creative']) {
            await page.locator('html').evaluate((element, value) => element.dataset.theme = value, theme);
            await assertLayout(`${locale}/${scope}/${theme}/${width}`, dialog);
            await page.screenshot({ path: path.join(output, `${locale}-confirm-${scope}-${theme}-${width}.png`) });
          }
          await cancel.focus(); await page.keyboard.press('Shift+Tab');
          assert.ok(await confirm.evaluate(element => element === document.activeElement));
          await page.keyboard.press('Tab');
          assert.ok(await cancel.evaluate(element => element === document.activeElement));
          await cancel.click(); await dialog.waitFor({ state: 'hidden' });
          assert.equal(mutations.length, baseline);
          await trigger.click(); await dialog.waitFor();
          await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'hidden' });
          await page.waitForFunction(label => document.activeElement?.textContent?.trim() === label, t(key));
          assert.equal(mutations.length, baseline);
          await trigger.click(); await dialog.waitFor(); await confirm.click();
          await page.getByText('Fixture stopped after dispatch', { exact: true }).waitFor();
          assert.equal(mutations.length, baseline + 1);
          assert.ok(mutations.at(-1).path.endsWith(scope === 'chapters' ? '/chapter-proposals' : scope === 'scenes' ? '/scene-proposals' : '/shot-proposals'));
          assert.equal(mutations.at(-1).body.expectedVersion, project.version);
        }
        await page.goto(`${origin}/__shot-workspace?view=credit`);
        const creditTrigger = page.getByRole('button', { name: 'Open fixture credit consent', exact: true });
        await creditTrigger.click();
        const ui = key => catalogs['react-ui'][key];
        const creditDialog = page.getByRole('alertdialog', { name: ui('ui.creditConsent.title'), exact: true });
        await creditDialog.waitFor(); await page.evaluate(() => document.fonts.ready);
        const skip = creditDialog.getByRole('checkbox', { name: ui('ui.creditConsent.skip'), exact: true });
        const creditCancel = creditDialog.getByRole('button', { name: ui('ui.action.cancel'), exact: true });
        const creditConfirm = creditDialog.getByRole('button', { name: ui('ui.creditConsent.confirm'), exact: true });
        assert.equal(await skip.isChecked(), false);
        assert.ok((await creditDialog.innerText()).includes(ui('ui.creditConsent.amount').replace('{credits}', '12.5')));
        for (const theme of ['default', 'fashion', 'creative']) {
          await page.locator('html').evaluate((element, value) => element.dataset.theme = value, theme);
          await assertLayout(`${locale}/credit/${theme}/${width}`, creditDialog);
          await page.screenshot({ path: path.join(output, `${locale}-credit-${theme}-${width}.png`) });
        }
        const creditBaseline = mutations.length;
        await skip.check(); await creditCancel.click(); await creditDialog.waitFor({ state: 'hidden' });
        assert.equal(mutations.length, creditBaseline);
        assert.equal(await page.evaluate(() => window.fixtureCreditDispatch || 0), 0);
        await creditTrigger.click(); await creditDialog.waitFor();
        assert.equal(await skip.isChecked(), false);
        await skip.focus(); await page.keyboard.press('Shift+Tab');
        assert.ok(await creditConfirm.evaluate(element => element === document.activeElement));
        await page.keyboard.press('Tab');
        assert.ok(await skip.evaluate(element => element === document.activeElement));
        await page.keyboard.press('Escape'); await creditDialog.waitFor({ state: 'hidden' });
        await page.waitForFunction(() => document.activeElement?.textContent === 'Open fixture credit consent');
        assert.equal(await page.evaluate(() => window.fixtureCreditDispatch || 0), 0);
        await creditTrigger.click(); await creditDialog.waitFor(); await skip.check(); await creditConfirm.click();
        await creditDialog.getByRole('alert').waitFor();
        assert.equal(await creditDialog.getByRole('alert').innerText(), ui('ui.creditConsent.saveFailed'));
        assert.equal(mutations.length, creditBaseline + 1);
        assert.equal(mutations.at(-1).path, '/api/me/preferences');
        assert.equal(mutations.at(-1).method, 'PATCH');
        assert.equal(await page.evaluate(() => window.fixtureCreditDispatch || 0), 0);
        await assertLayout(`${locale}/credit-error/${width}`, creditDialog);
        await page.screenshot({ path: path.join(output, `${locale}-credit-save-error-${width}.png`) });
        await skip.uncheck(); await creditConfirm.click(); await creditDialog.waitFor({ state: 'hidden' });
        assert.equal(await page.evaluate(() => window.fixtureCreditDispatch || 0), 1);
        assert.equal(mutations.length, creditBaseline + 1);
        console.log(`PASS writer tabs, Chapter/Scene/Shot confirmation and shared Credit consent ${locale}/${width}, three themes`);
        await page.evaluate(() => localStorage.clear());
      }
      await context.close();
      continue;
    }
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
        assert.equal(await page.locator('.cinematic-full-story__side-rail .cinematic-full-story__assistant').count(), 1);
        assert.equal(await page.locator('.cinematic-full-story__side-rail > .cinematic-full-story__chapters-action').count(), 1);
        assert.equal(await page.locator('.cinematic-full-story__history').count(), 1);
        await page.getByRole('tab', { name: t('cinematic.chapterWriter.characters'), exact: true }).click();
        const people = page.locator('.cinematic-shared-characters__body > ul > li');
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
    if (flowReview) for (const width of [390, 720, 820, 1440]) {
      await page.setViewportSize({ width, height: 950 });
      await page.goto(`${origin}/__shot-workspace?view=final`);
      await page.getByText(t('cinematic.chapterFinal.reason.ready'), { exact: true }).first().waitFor();
      await page.evaluate(() => document.fonts.ready);
      for (const theme of ['default', 'fashion', 'creative']) {
        await page.locator('html').evaluate((element, value) => element.dataset.theme = value, theme);
        assert.ok(await page.locator('body').evaluate(element => element.scrollWidth <= element.clientWidth + 1), `${locale}/final/${width}/${theme} overflow`);
        await page.screenshot({ path: path.join(output, `${locale}-final-${theme}-${width}.png`), fullPage: true });
      }
      const trigger = page.getByRole('button', { name: t('cinematic.bundle.open'), exact: true });
      await trigger.click(); await page.getByRole('dialog').waitFor();
      const download = page.getByRole('button', { name: t('cinematic.bundle.download'), exact: true });
      assert.ok(await download.isDisabled());
      await page.getByRole('checkbox').check(); assert.ok(await download.isEnabled());
      await page.keyboard.press('Escape'); await page.getByRole('dialog').waitFor({ state: 'hidden' });
      await page.waitForFunction(label => document.activeElement?.textContent?.trim() === label, t('cinematic.bundle.open'));
      assert.ok(await trigger.evaluate(element => element === document.activeElement));
    }
    for (const width of flowReview ? [390, 720, 820, 1440] : [390, 820, 1440]) {
      await page.setViewportSize({ width, height: 950 });
      await page.goto(`${origin}/__shot-workspace`);
      await page.getByTestId('cinematic-shot-writer').waitFor();
      await page.evaluate(() => document.fonts.ready);
      await page.locator('.cinematic-shot-workspace__exchange').waitFor();
      await page.getByText(t('cinematic.shotWorkspace.videoPrompt'), { exact: true }).click();
      const editor = page.getByRole('textbox', { name: t('cinematic.shotWorkspace.videoPrompt') });
      await editor.waitFor();
      if (authoringReview) {
        await page.locator('.cinematic-portable-shot > summary').click();
        await page.getByRole('button', { name: t('cinematic.portable.prepare'), exact: true }).click();
        const portable = page.getByRole('textbox', { name: t('cinematic.portable.title'), exact: true });
        await portable.waitFor();
        assert.equal((await portable.inputValue()).split('No music. Rain ambience only.').length - 1, 1);
        assert.ok((await portable.inputValue()).includes('@Image 1 = First Frame'));
        await page.getByRole('button', { name: t('cinematic.portable.download'), exact: true }).waitFor();
        for (const theme of ['default', 'fashion', 'creative']) {
          await page.locator('html').evaluate((element, value) => element.dataset.theme = value, theme);
          const contrast = await editor.evaluate(element => {
            const style = getComputedStyle(element), context = document.createElement('canvas').getContext('2d');
            const luminance = color => {
              context.fillStyle = color; context.fillRect(0, 0, 1, 1);
              const rgba = context.getImageData(0, 0, 1, 1).data;
              const linear = [...rgba].slice(0, 3).map(value => { const c = value / 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; });
              return linear[0] * .2126 + linear[1] * .7152 + linear[2] * .0722;
            };
            const a = luminance(style.color), b = luminance(style.backgroundColor);
            return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
          });
          assert.ok(contrast >= 4.5, `${theme} prose contrast ${contrast}`);
        }
        await page.locator('html').evaluate(element => element.dataset.theme = 'default');
      }
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
    if (flowReview) {
      const document = page.getByRole('textbox', { name: t('cinematic.shotWriter.direction'), exact: true });
      const draftText = `${await document.inputValue()}\nUnsubmitted recovery note / บทที่ยังไม่บันทึก`;
      await document.fill(draftText);
      page.on('dialog', dialog => dialog.accept());
      await page.reload();
      const restore = page.getByRole('button', { name: t('cinematic.recovery.restore'), exact: true });
      await restore.waitFor();
      await restore.focus(); await page.keyboard.press('Enter');
      assert.equal(await document.inputValue(), draftText);
      assert.ok(await document.evaluate(element => element === document.activeElement));
      await page.screenshot({ path: path.join(output, `${locale}-recovered.png`), fullPage: true });
    }
    await context.close();
  }
  assert.deepEqual(errors, []);
  console.log(`PASS ${writerConfirmationReview ? 'GC04 writer tabs and regeneration consent (three themes, fixture dispatch only)' : flowReview ? 'Shot recovery, portable export and Chapter Final (three themes)' : lookRatioReview ? 'Fixed portrait engine with stored square selection' : storyLayoutReview ? 'Full Story chapter placement and six-Character layout (three themes)' : lookReview ? 'Character/Scene/Shot Look references and style dialog' : 'Shot workspace and custom prompt save/reload'} TH/EN at ${flowReview ? '390/720/820/1440' : '390/820/1440'}. Screenshots: ${output}`);
} catch (error) {
  if (browser && output) for (const context of browser.contexts()) for (const page of context.pages()) {
    await page.screenshot({ path: path.join(output, 'failure.png'), fullPage: true }).catch(() => {});
  }
  throw error;
} finally {
  try { await browser?.close(); } finally { await vite?.close(); }
}

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';

const isolated = process.argv.includes('--isolated');
let origin = process.env.CINEMATIC_WEB_ORIGIN || 'http://localhost:5173';
let vite;
if (isolated) {
  const { createServer } = await import('vite');
  vite = await createServer({ root: path.resolve('web'), configFile: path.resolve('web/vite.config.ts'),
    server: { host: '127.0.0.1', port: 0, open: false } });
  await vite.listen();
  origin = `http://127.0.0.1:${vite.httpServer.address().port}`;
}
assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname));
const output = await fs.mkdtemp(path.join(os.tmpdir(), 'mpf-rewamp-new-project-'));
const browser = await chromium.launch({ headless: true });
const errors = [];
const unexpectedRequests = [];

try {
  for (const locale of ['th', 'en']) {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    if (isolated) {
      const catalogs = { cinematic: JSON.parse(await fs.readFile(`client/i18n/locales/${locale}/cinematic.json`, 'utf8')),
        'react-ui': JSON.parse(await fs.readFile(`client/i18n/locales/${locale}/react-ui.json`, 'utf8')) };
      const authoring = JSON.parse(await fs.readFile('server/config/cinematic/story-authoring.v1.json', 'utf8'));
      const importPolicy = JSON.parse(await fs.readFile('server/config/cinematic/workflow-policy.v1.json', 'utf8')).storyImport;
      const source = await (await fetch(`${origin}/src/features/cinematic/components/CinematicNewProjectComposer.tsx`)).text();
      const version = source.match(/react\.js(\?v=[a-z0-9]+)/)?.[1] || '';
      const fontRoot = `/@fs/${path.resolve('node_modules/@fontsource').replaceAll('\\', '/')}`;
      await context.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (url.origin !== origin || url.pathname.startsWith('/api/')) {
          unexpectedRequests.push(url.pathname);
          return route.abort();
        }
        if (/^\/assets\/cinematic\/flags\/[a-z]+\.svg$/.test(url.pathname)) {
          return route.fulfill({ contentType: 'image/svg+xml', body: await fs.readFile(`client${url.pathname}`) });
        }
        if (url.pathname !== '/create/cinematic/new') return route.continue();
        return route.fulfill({ contentType: 'text/html', body: `<!doctype html>
          <html data-theme="default"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
          <body><div id="root"></div><script type="module">
          import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);
          window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;
          await import('/src/styles/globals.css');
          await import('${fontRoot}/poppins/500.css');await import('${fontRoot}/noto-sans-thai/500.css');
          const {default:React}=await import('/node_modules/.vite/deps/react.js${version}');
          const {default:ReactDOM}=await import('/node_modules/.vite/deps/react-dom_client.js${version}');
          const {MemoryRouter}=await import('/node_modules/.vite/deps/react-router-dom.js${version}');
          const {default:i18n}=await import('/node_modules/.vite/deps/i18next.js${version}');
          const {I18nextProvider,initReactI18next}=await import('/node_modules/.vite/deps/react-i18next.js${version}');
          const {CinematicNewProjectComposer}=await import('/src/features/cinematic/components/CinematicNewProjectComposer.tsx');
          const {CinematicProjectNavigation}=await import('/src/features/cinematic/components/CinematicProjectNavigation.tsx');
          const {createCinematicSetupDraft}=await import('/src/features/cinematic/state/cinematicDraftStorage.ts');
          await i18n.use(initReactI18next).init({lng:'${locale}',keySeparator:false,interpolation:{prefix:'{',suffix:'}',escapeValue:false},resources:{${locale}:${JSON.stringify(catalogs)}}});
          const e=React.createElement;
          function App(){const[draft,setDraft]=React.useState(createCinematicSetupDraft());
            const[state,setState]=React.useState({variant:'create',pending:false,online:true});
            window.fixtureState=setState;window.fixtureDraft=setDraft;
            const composer=e(CinematicNewProjectComposer,{...state,draft,storyAuthoring:${JSON.stringify(authoring)},importPolicy:${JSON.stringify(importPolicy)},saveState:state.online?'saved':'offline',
              onUpdate:(key,value)=>setDraft(d=>({...d,[key]:value})),onSave:()=>{},onContinueFullStory:()=>{},
              onCreateDraft:()=>{},onPrepareStory:()=>{},onImportFullStory:async()=>{}});
            return e('div',{style:{maxWidth:1240,margin:'0 auto',padding:16}},state.variant==='edit'
              ?e(CinematicProjectNavigation,{actorId:'fixture',project:{id:'fixture-project',title:draft.projectName}},composer):composer);}
          ReactDOM.createRoot(document.getElementById('root')).render(e(I18nextProvider,{i18n},e(MemoryRouter,{initialEntries:['/create/cinematic/fixture-project/setup']},e(App))));
          </script></body></html>` });
      });
    }
    await context.addInitScript(language => {
      localStorage.clear();
      localStorage.setItem('model_prompt_forge_language', language);
    }, locale);
    const page = await context.newPage();
    page.setDefaultTimeout(15_000);
    page.on('pageerror', error => errors.push(error.message));

    for (const width of [390, 820, 1440]) {
      await page.setViewportSize({ width, height: 950 });
      await page.goto(`${origin}/create/cinematic/new`, { waitUntil: 'networkidle' });
      const composer = page.getByTestId('cinematic-new-project');
      await composer.waitFor();
      await page.evaluate(() => document.fonts.ready);

      assert.ok(await composer.evaluate(element => element.scrollWidth <= element.clientWidth + 1), `${locale}/${width} composer overflow`);
      assert.ok(await page.locator('body').evaluate(element => element.scrollWidth <= element.clientWidth + 1), `${locale}/${width} page overflow`);
      await page.getByRole('textbox', { name: locale === 'th' ? 'ชื่อโปรเจกต์' : 'Project title' }).waitFor();
      await page.getByRole('textbox', { name: locale === 'th' ? 'ไอเดียเรื่อง' : 'Story idea' }).waitFor();

      const prepare = page.getByRole('button', { name: locale === 'th' ? 'เตรียมเนื้อเรื่อง' : 'Prepare story' });
      assert.equal(await prepare.isDisabled(), true, `${locale}/${width} empty story must not call AI`);
      assert.equal(await page.getByRole('button', { name: locale === 'th' ? 'สร้างฉบับร่าง' : 'Create draft' }).isEnabled(), true);
      assert.equal(await page.locator('.cinematic-new-project__option input[value="mini-series"]').isChecked(), true);
      assert.equal(await page.locator('.cinematic-new-project__genre-choice input[type="checkbox"]:checked').count(), 1);

      const essentials = page.locator('.cinematic-new-project__essentials');
      assert.equal(await essentials.getAttribute('open'), '');
      assert.notEqual(await essentials.evaluate(element => getComputedStyle(element).borderRadius), '0px');
      await essentials.locator(':scope > summary').click();
      assert.equal(await essentials.getAttribute('open'), null, `${locale}/${width} essentials must collapse`);
      await essentials.locator(':scope > summary').click();
      assert.equal(await essentials.getAttribute('open'), '', `${locale}/${width} essentials must expand`);

      const settings = page.locator('.cinematic-new-project__settings');
      await settings.locator(':scope > summary').click();
      assert.equal(await settings.getAttribute('open'), '');
      await page.getByText(locale === 'th' ? 'ยุคสมัยของเรื่อง' : 'Story period').waitFor();
      const chapterDuration = page.getByRole('combobox', { name: locale === 'th' ? 'ความยาวเป้าหมายต่อ Chapter' : 'Target duration per Chapter' });
      await chapterDuration.click();
      assert.equal(await page.getByRole('option', { name: locale === 'th' ? '2 นาที' : '2 min' }).count(), 1);
      await page.keyboard.press('Escape');

      await page.screenshot({ path: path.join(output, `${locale}-${width}.png`), fullPage: true });
      if (isolated) {
        const movie = page.locator('.cinematic-new-project__option input[value="short-film"]');
        await movie.focus();
        await page.keyboard.press('Space');
        assert.equal(await movie.isChecked(), true);
        await page.keyboard.press('ArrowRight');
        assert.equal(await page.locator('.cinematic-new-project__option input[value="mini-series"]').isChecked(), true);
        await page.locator('.cinematic-new-project__option input[value="9:16"]').focus();
        await page.keyboard.press('ArrowRight');
        assert.equal(await page.locator('.cinematic-new-project__option input[value="16:9"]').isChecked(), true);
        assert.equal(await page.locator('.cinematic-new-project__option:has(input:focus-visible)').evaluate(el => getComputedStyle(el).outlineStyle), 'solid');
        await page.keyboard.press('ArrowLeft');
        await settings.locator(':scope > summary').click();
        await page.evaluate(language => window.fixtureDraft(draft => ({ ...draft,
          projectName: language === 'th' ? 'จดหมายในคืนฝนพรำ' : 'Letters in the Rain',
          storyBrief: language === 'th'
            ? 'หญิงสาวเปิดร้านดอกไม้เล็ก ๆ ในเมืองใหม่ คืนหนึ่งเธอได้พบกับชายแปลกหน้าที่นำจดหมายเก่ามาฝากไว้ ทั้งสองค่อย ๆ เรียนรู้เรื่องราวของกันและกัน ท่ามกลางความหวังและความทรงจำที่ยังไม่จางหาย'
            : 'A florist starts over in a new city. One rainy evening, a stranger leaves an old letter at her shop. As they piece together its story, they find the courage to confront their own unfinished pasts.'
        })), locale);
        for (const theme of ['default', 'fashion', 'creative']) {
          await page.evaluate(value => document.documentElement.dataset.theme = value, theme);
          for (const variant of ['create', 'edit']) {
            await page.evaluate(value => window.fixtureState({ variant: value, pending: false, online: true }), variant);
            await page.getByRole('button', { name: locale === 'th'
              ? variant === 'edit' ? 'บันทึกเรื่องย่อ' : 'สร้างฉบับร่าง'
              : variant === 'edit' ? 'Save brief' : 'Create draft' }).waitFor();
            assert.ok(await page.locator('body').evaluate(el => el.scrollWidth <= el.clientWidth + 1), `${locale}/${width}/${theme}/${variant} overflow`);
            if (variant === 'edit') {
              const header = page.locator('.cinematic-project-header');
              const link = header.getByRole('link');
              assert.equal(await link.count(), 1);
              const box = await link.boundingBox();
              assert.ok(box.height >= 44 && box.width < (await header.boundingBox()).width * 0.7);
              await link.focus();
              await page.keyboard.press('Tab');
              await page.keyboard.press('Shift+Tab');
              assert.equal(await link.evaluate(el => getComputedStyle(el).outlineStyle), 'solid');
              await page.keyboard.press('Enter');
              await header.getByRole('link', { name: locale === 'th' ? 'กลับไปเขียนเรื่อง' : 'Back to story', exact: true }).waitFor();
              assert.equal(await link.getAttribute('href'), '/create/cinematic/fixture-project/setup');
              await link.click();
              await header.getByRole('link', { name: locale === 'th' ? 'ตัวละคร' : 'Characters', exact: true }).waitFor();
              assert.equal(await link.getAttribute('aria-current'), null);
            }
            await page.screenshot({ path: path.join(output, `${locale}-${width}-${theme}-${variant}.png`), fullPage: true });
          }
        }
        await page.evaluate(() => window.fixtureState({ variant: 'edit', pending: true, online: true }));
        await page.evaluate(() => window.fixtureDraft(draft => ({ ...draft, projectName: 'A'.repeat(120) })));
        assert.ok(await page.locator('body').evaluate(el => el.scrollWidth <= el.clientWidth + 1), 'Long Project title overflow');
        assert.equal(await movie.isDisabled(), true);
        await page.evaluate(() => window.fixtureState({ variant: 'edit', pending: false, online: false }));
        assert.equal(await movie.isEnabled(), true);
        assert.equal(await page.locator('.cinematic-new-project__actions button').first().isDisabled(), true);
        await page.evaluate(() => window.fixtureDraft(draft => ({ ...draft, storyBrief: 'Imported story stays editable.', storyBriefImport: { fileName: 'story.md', edited: false } })));
        await page.locator('.cinematic-story-import__source').waitFor();
        assert.equal(await page.locator('#cinematic-imported-brief').isHidden(), true);
        await page.locator('[aria-controls="cinematic-imported-brief"]').click();
        assert.equal(await page.locator('#cinematic-imported-brief textarea').inputValue(), 'Imported story stays editable.');
        await page.evaluate(() => window.fixtureState({ variant: 'edit', pending: false, online: true }));
        await page.locator('input[type="file"]').setInputFiles({ name: 'replacement.md', mimeType: 'text/markdown', buffer: Buffer.from('A new story draft.') });
        const preview = page.locator('.cinematic-story-import__preview');
        await preview.waitFor();
        assert.equal(await preview.locator('textarea').inputValue(), 'A new story draft.');
        const destinations = preview.locator('[role="group"] button');
        assert.equal(await destinations.first().getAttribute('aria-pressed'), 'true');
        await destinations.last().click();
        await page.waitForFunction(() => document.querySelector('.cinematic-story-import__preview [role="group"] button:last-child')?.getAttribute('aria-pressed') === 'true');
        await destinations.first().click();
        assert.ok(await page.locator('body').evaluate(el => el.scrollWidth <= el.clientWidth + 1));
        await page.screenshot({ path: path.join(output, `${locale}-${width}-import-preview.png`), fullPage: true });
        await preview.locator('footer button').click();
        await page.waitForFunction(() => !document.querySelector('.cinematic-story-import__preview'));
        assert.equal(await page.locator('.cinematic-story-import__source strong').textContent(), 'replacement.md');
        assert.equal(await page.locator('#cinematic-imported-brief').isHidden(), true);
      }
    }
    await context.close();
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(unexpectedRequests, []);
  console.log(`PASS Cinematic New Project TH/EN at 390/820/1440. Screenshots: ${output}`);
} catch (error) {
  console.error(errors);
  for (const context of browser.contexts()) for (const page of context.pages()) {
    await page.screenshot({ path: path.join(output, 'failure.png'), fullPage: true });
  }
  console.error(`Screenshots: ${output}`);
  throw error;
} finally {
  await browser.close();
  await vite?.close();
}

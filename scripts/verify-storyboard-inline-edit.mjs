import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import { createSingleCharacterCinematicProject } from '../test/fixtures/cinematic/cinematicProjectFixtures.js';

const origin = process.env.CINEMATIC_WEB_ORIGIN || 'http://127.0.0.1:6501';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname));
const text = await (await fetch(`${origin}/src/lib/auth/ActorProvider.tsx`)).text();
const version = text.match(/react\.js(\?v=[a-z0-9]+)/)?.[1] || '';
const source = await (await fetch(`${origin}/src/components/generation/GeneratedLookSourceField.tsx`)).text();
const actorModule = source.match(/"(\/src\/lib\/auth\/ActorProvider\.tsx[^\"]*)"/)?.[1] || '/src/lib/auth/ActorProvider.tsx';
const output = await fs.mkdtemp(path.join(os.tmpdir(), 'mpf-inline-edit-'));
const photo = await fs.readFile('client/assets/scene-builder/shot-recipes/cafe-seated-lifestyle.jpg');
const project = createSingleCharacterCinematicProject();
const actor = { userId: 'fixture-owner', username: 'fixture', role: 'user', displayName: 'Fixture' };
const errors = [];
const browser = await chromium.launch({ headless: true });
try {
  for (const locale of ['en', 'th']) {
    const cinematic = JSON.parse(await fs.readFile(`client/i18n/locales/${locale}/cinematic.json`, 'utf8'));
    const playground = JSON.parse(await fs.readFile(`client/i18n/locales/${locale}/playground.json`, 'utf8'));
    const context = await browser.newContext();
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin !== origin) return route.abort();
      if (url.pathname === '/__inline-edit-check') return route.fulfill({ contentType: 'text/html', body: `
        <html data-theme="default"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
        <body><div id="root"></div><script type="module">
        import RefreshRuntime from '/@react-refresh';
        RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$=()=>{}; window.$RefreshSig$=()=>type=>type;
        window.__vite_plugin_react_preamble_installed__=true;
        await import('/src/styles/globals.css');
        const {default:React}=await import('/node_modules/.vite/deps/react.js${version}');
        const {default:ReactDOM}=await import('/node_modules/.vite/deps/react-dom_client.js${version}');
        const {MemoryRouter}=await import('/node_modules/.vite/deps/react-router-dom.js${version}');
        const {QueryClient,QueryClientProvider}=await import('/node_modules/.vite/deps/@tanstack_react-query.js${version}');
        const {default:i18n}=await import('/node_modules/.vite/deps/i18next.js${version}');
        const {I18nextProvider,initReactI18next}=await import('/node_modules/.vite/deps/react-i18next.js${version}');
        const {ActorProvider}=await import(${JSON.stringify(actorModule)});
        const {StoryboardShotEditor}=await import('/src/features/cinematic/components/StoryboardShotEditor.tsx');
        const {ReferenceSlotGrid}=await import('/src/components/generation/ReferenceSlotGrid.tsx');
        await i18n.use(initReactI18next).init({lng:${JSON.stringify(locale)},keySeparator:false,interpolation:{prefix:'{',suffix:'}',escapeValue:false},
          resources:{${locale}:{cinematic:${JSON.stringify(cinematic)},playground:${JSON.stringify(playground)}}}});
        const p=${JSON.stringify(project)}, e=React.createElement;
        function Screen(){const[refs,setRefs]=React.useState({style_reference:'/api/fixture-media'});
          return e('main',{style:{maxWidth:1100,margin:'auto',padding:16}},
            e(StoryboardShotEditor,{project:p,scene:p.scenes[0],shot:p.scenes[0].shots[0],initialPrompt:'Hold this opening moment.',onClose:()=>{},onSaved:()=>{}}),
            e(ReferenceSlotGrid,{value:refs,onChange:setRefs,maxReferences:3,supported:true,lookSheetSelection:true,roles:['character_reference','style_reference'],compact:true}));}
        ReactDOM.createRoot(document.getElementById('root')).render(e(QueryClientProvider,{client:new QueryClient()},
          e(ActorProvider,null,e(MemoryRouter,null,e(I18nextProvider,{i18n},e(Screen))))));
        </script></body></html>` });
      if (url.pathname === '/api/me') return route.fulfill({ json: actor });
      if (url.pathname === '/api/mock-users') return route.fulfill({ json: { enabled: false, users: [] } });
      if (url.pathname === '/api/fixture-media') return route.fulfill({ body: photo, contentType: 'image/jpeg' });
      if (url.pathname === '/api/generation/video/trusted-sources') {
        assert.equal(url.searchParams.get('category'), 'look-sheet');
        return route.fulfill({ json: { items: [{ id: 'sheet', previewUrl: '/api/fixture-media', modelId: 'Fixture Look Sheet',
          generationMode: 'text_to_image', generatedAt: null, expiresAt: null, eligible: true, reason: null,
          policyVersion: 'fixture', category: 'look-sheet' }], hasMore: false } });
      }
      if (url.pathname.startsWith('/api/') || route.request().method() !== 'GET') {
        errors.push(`Unexpected request: ${route.request().method()} ${url.pathname}`);
        return route.abort();
      }
      return route.continue();
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    for (const width of [1440, 820, 390]) {
      await page.setViewportSize({ width, height: 950 });
      await page.goto(`${origin}/__inline-edit-check`);
      await page.getByRole('heading', { name: cinematic['cinematic.storyboard.editShot'], exact: true }).waitFor();
      await page.evaluate(() => document.fonts.ready);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.screenshot({ path: path.join(output, `${locale}-${width}-editor.png`), fullPage: true });
      await page.getByRole('button', { name: playground['playground.reference.chooseLookSheet'], exact: true }).click();
      await page.getByRole('button', { name: /Fixture Look Sheet/ }).waitFor();
      assert.ok(await page.getByRole('dialog').evaluate(el => el.scrollWidth <= el.clientWidth + 1));
      await page.screenshot({ path: path.join(output, `${locale}-${width}-picker.png`) });
      await page.getByRole('button', { name: /Fixture Look Sheet/ }).click();
      assert.equal(await page.getByRole('dialog').count(), 0);
      assert.equal(await page.locator('.reference-slot.is-populated').count(), 2);
    }
    await context.close();
  }
  assert.deepEqual(errors, []);
  console.log(`PASS EN/TH 390/820/1440 editor and Look picker. Screenshots: ${output}`);
} catch (error) {
  console.error(errors);
  for (const context of browser.contexts()) for (const page of context.pages()) {
    await page.screenshot({ path: path.join(output, 'failure.png'), fullPage: true });
    console.error((await page.locator('body').innerText()).slice(-2400));
  }
  throw error;
} finally { await browser.close(); }

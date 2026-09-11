import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import sharp from 'sharp';

const origin = process.env.CINEMATIC_TEST_WEB_ORIGIN || 'http://localhost:6501';
if (!['localhost', '127.0.0.1'].includes(new URL(origin).hostname)) throw new Error('Use a local Vite server.');
const actorModule = await (await fetch(`${origin}/src/lib/auth/ActorProvider.tsx`)).text();
const dependencyVersion = actorModule.match(/react\.js(\?v=[a-z0-9]+)/)?.[1] || '';
const output = await fs.mkdtemp(path.join(os.tmpdir(), 'cinematic-reference-layout-'));
const messages = JSON.parse(await fs.readFile(new URL('../client/i18n/locales/en/cinematic.json', import.meta.url), 'utf8'));
const thumbnail = await sharp({ create: { width: 60, height: 90, channels: 3, background: '#398a91' } }).png().toBuffer();
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => { errors.push(error.message); console.error(error.message); });
  await page.route(url => url.pathname.startsWith('/api/'), route => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === '/api/test-reference') return route.fulfill({ contentType: 'image/png', body: thumbnail });
    return route.fulfill({ json: pathname === '/api/me'
      ? { userId: 'test', username: 'test', displayName: 'Test', role: 'user' }
      : { enabled: false, users: [] } });
  });
  await page.route('**/__cinematic-reference-layout', route => route.fulfill({ contentType: 'text/html', body: `
    <html data-theme="default"><head><meta name="viewport" content="width=device-width, initial-scale=1"></head>
    <body><main id="root" style="width:min(360px,calc(100% - 32px));margin:16px auto"></main>
    <script type="module">
      import RefreshRuntime from '/@react-refresh';
      RefreshRuntime.injectIntoGlobalHook(window);
      window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => type => type;
      window.__vite_plugin_react_preamble_installed__ = true;
      await import('/src/styles/globals.css');
      const {default:React} = await import('/node_modules/.vite/deps/react.js${dependencyVersion}');
      const {default:ReactDOM} = await import('/node_modules/.vite/deps/react-dom_client.js${dependencyVersion}');
      const {QueryClient, QueryClientProvider} = await import('/node_modules/.vite/deps/@tanstack_react-query.js${dependencyVersion}');
      const {default:i18n} = await import('/node_modules/.vite/deps/i18next.js${dependencyVersion}');
      const {I18nextProvider,initReactI18next} = await import('/node_modules/.vite/deps/react-i18next.js${dependencyVersion}');
      const {ActorProvider} = await import('/src/lib/auth/ActorProvider.tsx');
      const {EngineTargetPanelFrame} = await import('/src/components/generation/EngineTargetPanelFrame.tsx');
      const {ProduceVideoReferences} = await import('/src/features/cinematic/components/produce/ProduceVideoReferences.tsx');
      await i18n.use(initReactI18next).init({lng:'en',keySeparator:false,interpolation:{prefix:'{',suffix:'}'},resources:{en:{cinematic:${JSON.stringify(messages)}}}});
      const e = React.createElement;
      function Screen() {
        const [mode,setMode] = React.useState('storyboard_and_looks');
        const [loading,setLoading] = React.useState(false);
        window.setReferenceLoading = setLoading;
        const references = [
          {assetId:'board',purpose:'storyboard_opening',previewUrl:'/api/test-reference'},
          {assetId:'look-a',purpose:'character_look',roleName:'Character with a long role name',lookName:'A long approved wardrobe name for responsive wrapping',previewUrl:'/api/test-reference'},
          {assetId:'look-b',purpose:'character_look',roleName:'Second Character',lookName:'Visitor',previewUrl:'/api/test-reference'}
        ].filter(item => mode === 'looks_only' ? item.purpose !== 'storyboard_opening' : true)
          .map((item,index) => ({...item,imageNumber:index+1}));
        return e(EngineTargetPanelFrame,{title:'Render video',studioLayout:true,className:'engine-target-panel--compact'},
          e(ProduceVideoReferences,{mode,onChange:setMode,lastFirstFrameMode:'storyboard_and_looks',disabled:loading,loading,references}));
      }
      ReactDOM.createRoot(document.getElementById('root')).render(e(QueryClientProvider,{client:new QueryClient()},e(ActorProvider,null,e(I18nextProvider,{i18n},e(Screen)))));
    </script></body></html>` }));
  await page.goto(`${origin}/__cinematic-reference-layout`);
  await page.getByRole('combobox', { name: 'Reference mode' }).waitFor();
  await page.waitForFunction(() => [...document.querySelectorAll('img')].length === 3
    && [...document.querySelectorAll('img')].every(image => image.complete && image.naturalWidth > 0));
  for (const width of [390, 820, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ['default', 'fashion']) {
      await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      assert.equal(await page.locator('li').evaluateAll(items => items.every(item => item.scrollWidth <= item.clientWidth + 1)), true);
      await page.getByRole('combobox', { name: 'Reference mode' }).click();
      await page.getByRole('option', { name: 'Storyboard + Character Looks', exact: true }).click();
      await page.screenshot({ path: path.join(output, `${width}-${theme}.png`), fullPage: true });
      const toggle = page.getByRole('switch', { name: 'Use First Frame' });
      await toggle.focus();
      await page.keyboard.press('Space');
      assert.equal(await toggle.getAttribute('aria-checked'), 'false');
      assert.equal(await page.locator('li').count(), 2);
      assert.equal(await page.getByText('Storyboard reference', { exact: false }).count(), 0);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await toggle.evaluate(element => Promise.all(element.getAnimations({ subtree: true }).map(animation => animation.finished)));
      await page.screenshot({ path: path.join(output, `${width}-${theme}-looks-only.png`), fullPage: true });
      await page.evaluate(() => window.setReferenceLoading(true));
      await page.locator('[data-processing-spinner]').waitFor();
      assert.equal(await toggle.isDisabled(), true);
      await page.evaluate(() => window.setReferenceLoading(false));
      await toggle.click();
      assert.equal(await page.locator('li').count(), 3);
    }
  }
  assert.deepEqual(errors, []);
  console.log(`PASS: selector, thumbnail loading and overflow at 390/820/1440px in default/fashion. Screenshots: ${output}`);
} finally { await browser.close(); }

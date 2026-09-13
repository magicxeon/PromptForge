import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';

const origin = process.env.CINEMATIC_WEB_ORIGIN || 'http://127.0.0.1:6501';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname));
const source = await (await fetch(`${origin}/src/lib/auth/ActorProvider.tsx`)).text();
const version = source.match(/react\.js(\?v=[a-z0-9]+)/)?.[1] || '';
const output = await fs.mkdtemp(path.join(os.tmpdir(), 'mpf-composition-reference-'));
const browser = await chromium.launch({ headless: true });
const errors = [];
try {
  for (const locale of ['en', 'th']) {
    const labels = JSON.parse(await fs.readFile(`client/i18n/locales/${locale}/cinematic.json`, 'utf8'));
    const context = await browser.newContext();
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin !== origin || request.method() !== 'GET' || url.pathname.startsWith('/api/')) {
        errors.push(`${request.method()} ${url.pathname}`);
        return route.abort();
      }
      if (url.pathname !== '/__composition-reference-check') return route.continue();
      return route.fulfill({ contentType: 'text/html', body: `<!doctype html><html data-theme="default">
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
        <body><main id="root" style="padding:20px;max-width:700px;margin:auto"></main><script type="module">
        import RefreshRuntime from '/@react-refresh'; RefreshRuntime.injectIntoGlobalHook(window);
        window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;
        await import('/src/styles/globals.css');
        const {default:React}=await import('/node_modules/.vite/deps/react.js${version}');
        const {default:ReactDOM}=await import('/node_modules/.vite/deps/react-dom_client.js${version}');
        const {default:i18n}=await import('/node_modules/.vite/deps/i18next.js${version}');
        const {I18nextProvider,initReactI18next}=await import('/node_modules/.vite/deps/react-i18next.js${version}');
        const {ProduceVideoReferences}=await import('/src/features/cinematic/components/produce/ProduceVideoReferences.tsx');
        await i18n.use(initReactI18next).init({lng:${JSON.stringify(locale)},keySeparator:false,interpolation:{prefix:'{',suffix:'}'},resources:{${locale}:{cinematic:${JSON.stringify(labels)}}}});
        const e=React.createElement;
        function App(){const[mode,setMode]=React.useState('storyboard_and_looks');
          return e(ProduceVideoReferences,{mode,onChange:setMode,firstFrameEnabled:false,sketchAvailable:true,references:[]});}
        ReactDOM.createRoot(document.getElementById('root')).render(e(I18nextProvider,{i18n},e(App)));
        </script></body></html>` });
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    for (const width of [390, 820, 1440]) {
      await page.setViewportSize({ width, height: 500 });
      await page.goto(`${origin}/__composition-reference-check`);
      const toggle = page.getByRole('switch', { name: labels['cinematic.produce.references.useSketch'] });
      await toggle.waitFor();
      assert.equal(await toggle.isEnabled(), true);
      assert.equal(await toggle.getAttribute('aria-checked'), 'true');
      await page.evaluate(() => document.fonts.ready);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.screenshot({ path: path.join(output, `${locale}-${width}.png`) });
      await toggle.click();
      assert.equal(await toggle.getAttribute('aria-checked'), 'false');
      await toggle.click();
      assert.equal(await toggle.getAttribute('aria-checked'), 'true');
    }
    await context.close();
  }
  assert.deepEqual(errors, []);
  console.log(`PASS composition toggle EN/TH 390/820/1440. Screenshots: ${output}`);
} finally { await browser.close(); }

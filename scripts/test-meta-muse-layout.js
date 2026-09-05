import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';

// Component harness only: all API requests are intercepted, no provider calls.
const origin = process.env.MUSE_TEST_WEB_ORIGIN || 'http://localhost:6501';
if (!['localhost', '127.0.0.1'].includes(new URL(origin).hostname)) throw new Error('Use a local Vite server.');
const moduleText = await (await fetch(`${origin}/src/lib/auth/ActorProvider.tsx`)).text();
const version = moduleText.match(/react\.js(\?v=[a-z0-9]+)/)?.[1] || '';
const messages = JSON.parse(await fs.readFile(new URL('../client/i18n/locales/en/playground.json', import.meta.url), 'utf8'));
const output = await fs.mkdtemp(path.join(os.tmpdir(), 'muse-layout-'));
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/**', route => route.fulfill({ json: {} }));
  await page.route('**/__muse-layout', route => route.fulfill({ contentType: 'text/html', body: `
    <html data-theme="default"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body><main id="root" style="max-width:1000px;margin:16px auto;padding:16px"></main>
    <script type="module">
      import RefreshRuntime from '/@react-refresh';
      RefreshRuntime.injectIntoGlobalHook(window);
      window.$RefreshReg$=()=>{}; window.$RefreshSig$=()=>type=>type;
      window.__vite_plugin_react_preamble_installed__=true;
      await import('/src/styles/globals.css');
      const {default:React}=await import('/node_modules/.vite/deps/react.js${version}');
      const {default:ReactDOM}=await import('/node_modules/.vite/deps/react-dom_client.js${version}');
      const {default:i18n}=await import('/node_modules/.vite/deps/i18next.js${version}');
      const {I18nextProvider,initReactI18next}=await import('/node_modules/.vite/deps/react-i18next.js${version}');
      const {EngineTargetPanel}=await import('/src/components/generation/EngineTargetPanel.tsx');
      await i18n.use(initReactI18next).init({lng:'en',keySeparator:false,resources:{en:{playground:${JSON.stringify(messages)}}}});
      const e=React.createElement;
      const catalog={defaultProvider:'meta-muse',providers:[{id:'meta-muse',displayName:'Meta Muse',defaultModel:'muse-image-1.0',models:[{
        id:'muse-image-1.0',displayName:'Muse Image 1.0',paidRoutingEnabled:true,
        pricingStatus:'priced',qualificationStatus:'qualified',capabilities:{imageGeneration:true,imageReferences:false,
        imageEdit:false,maxReferenceImages:0,streaming:false,dimensionControl:'aspect_ratio_only',aspectRatios:['1:1','9:16','16:9','4:5']}
      }]}]};
      function Screen(){
        const [value,onChange]=React.useState({provider:'meta-muse',model:'muse-image-1.0',aspectRatio:'1:1',resolution:null,outputCount:1});
        const [comparison,onComparisonChange]=React.useState(false);
        const [comparisonSlots,onSlotsChange]=React.useState([
          {id:'one',provider:'meta-muse',model:'muse-image-1.0'},
          {id:'two',provider:'meta-muse',model:'muse-image-1.0'}
        ]);
        return e(EngineTargetPanel,{catalog,value,onChange,comparison,comparisonSlots,onSlotsChange,onComparisonChange});
      }
      ReactDOM.createRoot(document.getElementById('root')).render(e(I18nextProvider,{i18n},e(Screen)));
    </script></body></html>` }));
  await page.goto(`${origin}/__muse-layout`);
  await page.getByRole('button', { name: '9:16 Mobile' }).waitFor();
  assert.equal(await page.getByText('Internal testing - normal Credits apply; output not yet qualified.').count(), 0);
  const selectTops = await page.locator('.engine-target-panel__model-grid select').evaluateAll(
    selects => selects.map(select => Math.round(select.getBoundingClientRect().top))
  );
  assert.equal(selectTops[0], selectTops[1]);
  await page.getByRole('button', { name: 'Compare models' }).click();
  await page.getByText('Fair comparison').waitFor();
  for (const width of [390, 820, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ['default', 'fashion', 'creative']) {
      await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.getByRole('button', { name: '9:16 Mobile' }).click();
      assert.equal(await page.getByRole('option', { name: 'Muse Image 1.0' }).count(), 2);
      assert.equal(await page.getByRole('option', { name: 'Muse Image 1.0' }).evaluateAll(options => options.every(option => !option.disabled)), true);
      assert.equal(await page.getByText('Width (px)', { exact: true }).count(), 0);
      await page.screenshot({ path: path.join(output, `${width}-${theme}.png`), fullPage: true });
    }
  }
  assert.deepEqual(errors, []);
  console.log(`PASS: qualified Muse controls align, Comparison remains selectable, and no overflow at 390/820/1440px in default/fashion/creative. Screenshots: ${output}`);
} finally { await browser.close(); }

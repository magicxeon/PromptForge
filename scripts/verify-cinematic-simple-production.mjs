import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
const origin = process.env.CINEMATIC_WEB_ORIGIN || 'http://127.0.0.1:6501';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname));
const source = await (await fetch(`${origin}/src/lib/auth/ActorProvider.tsx`)).text();
const version = source.match(/react\.js(\?v=[a-z0-9]+)/)?.[1] || '';
const storyAuthoring = JSON.parse(await fs.readFile(new URL('../server/config/cinematic/story-authoring.v1.json', import.meta.url), 'utf8'));
const output = await fs.mkdtemp(path.join(os.tmpdir(), 'mpf-simple-production-'));
const browser = await chromium.launch({ headless: true });
const errors = [], results = [];
try {
  for (const locale of ['en', 'th']) for (const width of [1440, 820, 390]) {
    const labels = JSON.parse(await fs.readFile(new URL(`../client/i18n/locales/${locale}/cinematic.json`, import.meta.url), 'utf8'));
    const context = await browser.newContext({ viewport: { width, height: 950 } });
    await context.route('**/*', async route => {
      const req = route.request(), url = new URL(req.url());
      if (url.origin !== origin || req.method() !== 'GET' || url.pathname.startsWith('/api/')) {
        errors.push(`${req.method()} ${url.pathname}`); return route.abort();
      }
      if (url.pathname.startsWith('/src/') && req.resourceType() === 'script') {
        const response = await route.fetch();
        return route.fulfill({ response, body: (await response.text()).replace(/\?t=\d+/g, '') });
      }
      if (url.pathname !== '/__cinematic-simple-layout') return route.continue();
      return route.fulfill({ contentType: 'text/html', body: `<!doctype html><html data-theme="default"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><main id="root" style="padding:20px"></main><script type="module">
        import RefreshRuntime from '/@react-refresh'; RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$=()=>{}; window.$RefreshSig$=()=>type=>type; window.__vite_plugin_react_preamble_installed__=true;
        await import('/src/styles/globals.css'); await import('/src/styles/cinematic.css');
        const {default:React}=await import('/node_modules/.vite/deps/react.js${version}');
        const {default:ReactDOM}=await import('/node_modules/.vite/deps/react-dom_client.js${version}');
        const {default:i18n}=await import('/node_modules/.vite/deps/i18next.js${version}');
        const {I18nextProvider,initReactI18next}=await import('/node_modules/.vite/deps/react-i18next.js${version}');
        const {CinematicSetupForm}=await import('/src/features/cinematic/components/CinematicSetupForm.tsx');
        const {createCinematicSetupDraft}=await import('/src/features/cinematic/state/cinematicDraftStorage.ts');
        await i18n.use(initReactI18next).init({lng:${JSON.stringify(locale)},keySeparator:false,interpolation:{prefix:'{',suffix:'}',escapeValue:false},resources:{${locale}:{cinematic:${JSON.stringify(labels)}}}});
        const e=React.createElement;
        function App(){const [draft,setDraft]=React.useState(createCinematicSetupDraft()); const noop=()=>{};
          return e(CinematicSetupForm,{draft,storyAuthoring:${JSON.stringify(storyAuthoring)},saveState:'saved',pending:false,onUpdate:(key,value)=>setDraft(d=>({...d,[key]:value})),onPlanningModeChange:noop,onAddRole:noop,onUpdateRole:noop,onRemoveRole:noop,onEnhance:noop,onAnalyzeRoles:noop,onManualRoleCountChange:noop,onSave:noop,onContinue:noop});}
        ReactDOM.createRoot(document.getElementById('root')).render(e(I18nextProvider,{i18n},e(App)));
      </script></body></html>` });
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${origin}/__cinematic-simple-layout`);
    const prompt = 'Two strangers shelter outside a flower shop during a rainstorm.';
    await page.locator('.cinematic-simple-fields > label textarea').fill(prompt);
    assert.equal(await page.getByRole('button', { name: labels['cinematic.simple.prepare'], exact: true }).isEnabled(), true);
    await page.screenshot({ path: path.join(output, `${locale}-${width}-simple.png`), fullPage: true });
    await page.locator('.cinematic-simple-options > summary').first().click();
    const metrics = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth,
      clipped: [...document.querySelectorAll('button,input,textarea,[role="combobox"]')].filter(el => el.getBoundingClientRect().width && el.scrollWidth > el.clientWidth + 3).length,
      raw: /cinematic\.[a-z]/.test(document.body.innerText)
    }));
    assert.equal(metrics.overflow, false); assert.equal(metrics.clipped, 0); assert.equal(metrics.raw, false);
    await page.screenshot({ path: path.join(output, `${locale}-${width}-options.png`), fullPage: true });
    await page.getByRole('button', { name: labels['cinematic.mode.advanced'], exact: true }).click();
    assert.equal(await page.getByPlaceholder(labels['cinematic.setup.storyBriefPlaceholder']).inputValue(), prompt);
    await page.getByRole('button', { name: labels['cinematic.mode.simple'], exact: true }).click();
    assert.equal(await page.locator('.cinematic-simple-fields > label textarea').inputValue(), prompt);
    results.push({ locale, width, ...metrics });
    await context.close();
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ output, results }, null, 2));
} finally { await browser.close(); }

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { renderComparisonExport } from '../server/domain/assets/comparisonExportRenderer.js';
import { getMediaExportConfig } from '../server/config/mediaExports.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const origin = process.env.COMPARISON_WEB_ORIGIN || 'http://127.0.0.1:5173';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname));
const moduleText = await (await fetch(`${origin}/src/lib/auth/ActorProvider.tsx`)).text();
const version = moduleText.match(/react\.js(\?v=[a-z0-9]+)/)?.[1] || '';
const consumerText = await (await fetch(`${origin}/src/components/media/MediaExportButton.tsx`)).text();
const actorImport = consumerText.match(/from "([^"]*\/auth\/ActorProvider\.tsx[^\"]*)"/)?.[1] || '/src/lib/auth/ActorProvider.tsx';
const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'mpf-comparison-export-'));
const config = getMediaExportConfig({}), logo = await fs.readFile(config.logoPath);
const sources = [];
for (const [index, name] of ['window-shadow-lookbook', 'soft-character-portrait'].entries()) sources.push({
  bytes: await fs.readFile(path.join(root, `client/assets/scene-builder/shot-recipes/${name}.jpg`)),
  providerLabel: 'OpenAI', modelLabel: index ? 'GPT-Image 2.5 Sunburst' : 'GPT-Image 2 (Premium)'
});
for (const layout of ['side_by_side', 'stacked']) for (const count of [2, 3, 4]) {
  const result = await renderComparisonExport({ sources: [sources[0], sources[1], sources[0], sources[1]].slice(0, count), layout, logo, config });
  await fs.writeFile(path.join(directory, `${result.presetId}.png`), result.bytes);
}
const actor = { userId: 'fixture-owner', username: 'fixture', role: 'user', displayName: 'Fixture' };
const browser = await chromium.launch({ headless: true });
const errors = [];
try {
  for (const locale of ['en', 'th']) {
    const labels = JSON.parse(await fs.readFile(path.join(root, `client/i18n/locales/${locale}/comparisons.json`), 'utf8'));
    const context = await browser.newContext({ acceptDownloads: true });
    await context.addInitScript(id => localStorage.setItem('mpf_active_mock_user_id', id), actor.userId);
    let exported = null;
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin !== origin) return route.abort();
      if (url.pathname === '/__comparison-check') return route.fulfill({ contentType: 'text/html', body: `
        <html data-theme="default"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root" style="padding:12px"></div>
        <script type="module">
        import RefreshRuntime from '/@react-refresh'; RefreshRuntime.injectIntoGlobalHook(window);
        window.$RefreshReg$=()=>{}; window.$RefreshSig$=()=>type=>type; window.__vite_plugin_react_preamble_installed__=true;
        await import('/src/styles/globals.css');
        const {default:React}=await import('/node_modules/.vite/deps/react.js${version}');
        const {default:ReactDOM}=await import('/node_modules/.vite/deps/react-dom_client.js${version}');
        const {QueryClient,QueryClientProvider}=await import('/node_modules/.vite/deps/@tanstack_react-query.js${version}');
        const {default:i18n}=await import('/node_modules/.vite/deps/i18next.js${version}');
        const {I18nextProvider,initReactI18next}=await import('/node_modules/.vite/deps/react-i18next.js${version}');
        const {ActorProvider}=await import(${JSON.stringify(actorImport)});
        const {ComparisonWorkspace}=await import('/src/components/comparisons/ComparisonWorkspace.tsx');
        const {comparisonRunSchema}=await import('/src/features/comparisons/schemas/comparisonSchemas.ts');
        await i18n.use(initReactI18next).init({lng:${JSON.stringify(locale)},keySeparator:false,interpolation:{prefix:'{',suffix:'}',escapeValue:false},resources:{${locale}:{comparisons:${JSON.stringify(labels)}}}});
        const e=React.createElement;
        function Screen(){const[done,setDone]=React.useState(false);window.finishComparison=()=>setDone(true);
          const run=comparisonRunSchema.parse({id:'run',status:done?'completed':'processing',createdAt:Date.now(),configurationSnapshot:{aspectRatio:'3:4'},slots:['a','b'].map((id,i)=>({id,jobId:id,provider:'OpenAI',model:i?'GPT-Image 2.5 Sunburst':'GPT-Image 2 (Premium)',status:done?'completed':i?'queued':'processing',result:done?{imageUrl:'/outputs/'+id+'.jpg',width:768,height:1024}:undefined}))});
          return e(ComparisonWorkspace,{mode:'generation',run,exportSetId:'fixture-set'});}
        ReactDOM.createRoot(document.getElementById('root')).render(e(QueryClientProvider,{client:new QueryClient()},e(ActorProvider,null,e(I18nextProvider,{i18n},e(Screen)))));
        </script></body></html>` });
      if (url.pathname === '/api/me') return route.fulfill({ json: actor });
      if (url.pathname === '/api/mock-users') return route.fulfill({ json: { enabled: false, users: [] } });
      if (url.pathname === '/outputs/a.jpg' || url.pathname === '/outputs/b.jpg') return route.fulfill({ body: sources[url.pathname.includes('/a.') ? 0 : 1].bytes, contentType: 'image/jpeg' });
      if (url.pathname === '/api/media/exports') {
        const input = request.postDataJSON();
        assert.deepEqual(input.outputIds, ['a', 'b']);
        const result = await renderComparisonExport({ sources, layout: input.layout, format: input.format, size: input.size, locale: input.locale, config, logo });
        exported = result.bytes;
        const metadata = { width: result.width, height: result.height, count: 2, presetId: result.presetId,
          warnings: result.warnings, mimeType: result.mimeType, layoutVersion: result.layoutVersion,
          filename: `momelo-comparison-2-${result.presetId}-20260909-120000.${input.format === 'jpeg' ? 'jpg' : 'png'}` };
        return route.fulfill({ body: result.bytes, contentType: result.mimeType, headers: { 'X-Momelo-Export': JSON.stringify(metadata) } });
      }
      if (url.pathname.startsWith('/api/') || request.method() !== 'GET') { errors.push(`${request.method()} ${url.pathname}`); return route.abort(); }
      return route.continue();
    });
    const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
    for (const width of [1440, 820, 390]) {
      await page.setViewportSize({ width, height: 950 });
      await page.goto(`${origin}/__comparison-check`);
      await page.locator('[data-processing-spinner]').first().waitFor();
      assert.equal(await page.locator('[data-processing-spinner]').count(), 2);
      await page.screenshot({ path: path.join(directory, `${locale}-${width}-processing.png`) });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      assert.equal(await page.locator('[data-processing-spinner]').first().evaluate(el => getComputedStyle(el).animationName), 'none');
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.evaluate(() => window.finishComparison());
      await page.getByRole('button', { name: labels['comparisons.export.open'], exact: true }).click();
      const downloadButton = page.getByRole('button', { name: labels['comparisons.export.download'], exact: true });
      await downloadButton.waitFor();
      await page.waitForFunction(() => { const img = document.querySelector('.comparison-export-preview img'); return img?.naturalWidth && getComputedStyle(img).visibility === 'visible'; });
      assert.equal(await downloadButton.isEnabled(), true);
      assert.equal(await page.getByRole('dialog').evaluate(el => el.scrollWidth <= el.clientWidth + 1), true);
      await page.screenshot({ path: path.join(directory, `${locale}-${width}-preview.png`) });
      const event = page.waitForEvent('download'); await downloadButton.click();
      const download = await event, file = path.join(directory, `${locale}-${width}-download.png`);
      await download.saveAs(file); assert.deepEqual(await fs.readFile(file), exported);
      await page.getByRole('button', { name: labels['comparisons.export.close'], exact: true }).click();
    }
    await context.close();
  }
  assert.deepEqual(errors, []);
  console.log(`PASS Comparison processing/preview/download EN/TH at 390/820/1440 and six rendered files. Evidence: ${directory}`);
} catch (error) {
  console.error({ directory, errors });
  for (const context of browser.contexts()) for (const page of context.pages()) {
    await page.screenshot({ path: path.join(directory, 'failure.png') });
    console.error((await page.locator('body').innerText()).slice(0, 1800));
  }
  throw error;
} finally { await browser.close(); }

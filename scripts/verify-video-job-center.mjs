import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = await fs.mkdtemp(path.join(os.tmpdir(), 'mpf-video-job-center-'));
const server = await createServer({ root: path.join(root, 'web'), configLoader: 'runner',
  server: { host: '127.0.0.1', port: 6592, strictPort: true, open: false } });
let browser;
try {
  await server.listen();
  const origin = 'http://127.0.0.1:6592';
  const source = await (await fetch(`${origin}/src/lib/auth/ActorProvider.tsx`)).text();
  const version = source.match(/react\.js(\?v=[a-z0-9]+)/)?.[1] || '';
  browser = await chromium.launch({ headless: true });
  const errors = [];
  for (const locale of ['en', 'th']) {
    const shell = JSON.parse(await fs.readFile(path.join(root, `client/i18n/locales/${locale}/shell.json`), 'utf8'));
    for (const width of [390, 820, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 850 } });
      let status = 'idle', unavailable = false;
      await context.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (url.origin !== origin) return route.abort();
        if (url.pathname === '/api/me') return route.fulfill({ json: { userId: 'fixture-owner', username: 'fixture', role: 'user', displayName: 'Fixture' } });
        if (url.pathname === '/api/mock-users') return route.fulfill({ json: { enabled: false, users: [] } });
        if (url.pathname === '/api/generation/job-center') {
          if (unavailable) return route.abort();
          return route.fulfill({ json: { activeCount: status === 'provider_processing' ? 31 : 0,
            reviewRequiredCount: status === 'reconciliation_required' ? 1 : 0, terminalCount: status === 'completed' ? 1 : 0, polledAt: 'now',
            items: status === 'idle' ? [] : [{ id: 'video_same', kind: 'video_task', mediaType: 'video', status,
              terminal: status !== 'provider_processing', createdAt: null, updatedAt: null, completedAt: null,
              providerId: 'modelark', modelId: 'fixture', resultUrl: '/outputs/retained.mp4', thumbnailUrl: null,
              detailHref: '/create/cinematic/project_fixture/produce', resumeHref: '/create/cinematic/project_fixture/produce',
              billingStatus: 'reserved', estimatedCredits: 1, progress: null, error: null }] } });
        }
        if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/outputs/')) return route.abort();
        if (url.pathname !== '/__job-center') return route.continue();
        return route.fulfill({ contentType: 'text/html; charset=utf-8', body: `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module">
          import RefreshRuntime from '/@react-refresh'; RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$=()=>{}; window.$RefreshSig$=()=>type=>type; window.__vite_plugin_react_preamble_installed__=true;
          await import('/src/styles/globals.css');
          const {default:React}=await import('/node_modules/.vite/deps/react.js${version}');
          const {default:ReactDOM}=await import('/node_modules/.vite/deps/react-dom_client.js${version}');
          const {default:i18n}=await import('/node_modules/.vite/deps/i18next.js${version}');
          const {I18nextProvider,initReactI18next}=await import('/node_modules/.vite/deps/react-i18next.js${version}');
          const {QueryClient,QueryClientProvider}=await import('/node_modules/.vite/deps/@tanstack_react-query.js${version}');
          const {MemoryRouter}=await import('/node_modules/.vite/deps/react-router-dom.js${version}');
          const {ActorProvider}=await import('/src/lib/auth/ActorProvider.tsx');
          const {GenerationJobCenterIndicator}=await import('/src/features/generation/job-center/GenerationJobCenterIndicator.tsx');
          await i18n.use(initReactI18next).init({lng:'${locale}',keySeparator:false,resources:{${locale}:{shell:${JSON.stringify(shell)}}}});
          const e=React.createElement,client=new QueryClient();
          window.refreshJobs=()=>client.invalidateQueries({queryKey:['generation-job-center']});
          ReactDOM.createRoot(document.getElementById('root')).render(e(QueryClientProvider,{client},e(ActorProvider,null,e(I18nextProvider,{i18n},e(MemoryRouter,null,
            e('header',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px',gap:'12px'}},e('strong',null,'Momelo'),e(GenerationJobCenterIndicator)))))));
        </script></body></html>` });
      });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`${origin}/__job-center`);
      const trigger = page.locator('.generation-job-center__trigger');
      await trigger.waitFor();
      await page.waitForFunction(() => document.querySelector('.generation-job-center__trigger')?.getAttribute('aria-description') !== 'Unknown');
      await trigger.click();
      status = 'provider_processing';
      await page.evaluate(() => { void window.refreshJobs(); });
      await page.locator('.generation-job-center__item [data-processing-spinner]').waitFor();
      await page.emulateMedia({ reducedMotion: 'reduce' });
      assert.equal(await page.locator('.generation-job-center__trigger [data-processing-spinner]').evaluate(el => getComputedStyle(el).animationName), 'none');
      await page.screenshot({ path: path.join(output, `${locale}-${width}-active.png`) });
      unavailable = true;
      await page.evaluate(() => { void window.refreshJobs(); });
      await page.getByText(shell['shell.jobCenter.unavailable']).waitFor();
      assert.equal(await page.locator('.generation-job-center__item').count(), 1);
      assert.equal(await page.locator('.generation-job-center__trigger [data-processing-spinner]').count(), 1);
      unavailable = false; status = 'reconciliation_required';
      await page.evaluate(() => { void window.refreshJobs(); });
      await page.locator('.generation-job-center__item small').filter({ hasText: shell['shell.jobCenter.reviewRequired'] }).waitFor();
      assert.equal(await page.locator('[data-processing-spinner]').count(), 0);
      const panel = await page.locator('.generation-job-center__panel').boundingBox();
      assert.ok(panel.x >= 0 && panel.x + panel.width <= width + 1, `${locale}/${width}: panel fits viewport`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.screenshot({ path: path.join(output, `${locale}-${width}-review.png`) });
      await context.close();
    }
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: true, output, viewports: [390, 820, 1440], locales: ['en', 'th'], backendRequests: 'intercepted only' }));
} finally {
  await browser?.close();
  await server.close();
}

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import { storyAuthoringConfiguration } from '../server/config/cinematicStoryConfiguration.js';
import { cinematicFieldManifestService } from '../server/domain/cinematic/CinematicFieldManifestService.js';
import { createSingleCharacterCinematicProject } from '../test/fixtures/cinematic/cinematicProjectFixtures.js';

const origin = process.env.CINEMATIC_WEB_ORIGIN || 'http://127.0.0.1:5173';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname));
const moduleText = await (await fetch(`${origin}/src/lib/auth/ActorProvider.tsx`)).text();
const version = moduleText.match(/react\.js(\?v=[a-z0-9]+)/)?.[1] || '';
const output = await fs.mkdtemp(path.join(os.tmpdir(), 'mpf-directed-openings-'));
const project = createSingleCharacterCinematicProject();
project.scenes[0].artDirection = 'Oxidized green walls, warm practical lamps, layered foreground shelves.';
project.scenes[0].shots[0].openingFrameVersion = 1;
const browser = await chromium.launch({ headless: true });
const errors = [];
try {
  for (const locale of ['en', 'th']) {
    const labels = JSON.parse(await fs.readFile(new URL(`../client/i18n/locales/${locale}/cinematic.json`, import.meta.url), 'utf8'));
    const context = await browser.newContext();
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin === origin && url.pathname === '/api/cinematic/story-enhancements' && route.request().method() === 'POST') {
        const body = route.request().postDataJSON();
        assert.ok(['story', 'roles'].includes(body.purpose));
        assert.equal(body.storyCountryStyle, 'japan');
        assert.deepEqual(body.genres, ['drama', 'mystery']);
        return route.fulfill({ json: { enhancementId: 'fixture', purpose: body.purpose,
          enhancedStoryBrief: body.purpose === 'roles' ? body.storyBrief : 'Mira pauses at the departing train, choosing to return a lost letter before leaving.',
          creativeDirection: 'Restrained gestures, quiet uncertainty, warm practical light.', premise: 'A choice', conflict: 'Departure is imminent', emotionalArc: 'Uncertainty to resolve', ending: 'She returns the letter', candidateScenes: [], warnings: [],
          recommendedRoles: body.purpose === 'roles' ? [{ id: 'lead', label: 'Mira', importance: 'required', storyFunction: 'Makes the final choice', relationshipHint: 'A traveler helping a stranger', objective: 'Return the letter', emotionalArc: 'Uncertainty to resolve', performanceDirection: 'A held breath before turning back', personalityTraits: ['observant'] }] : [],
          provenance: { provider: 'fixture', model: 'fixture', responseId: null }, billingStatus: 'qualification_no_charge' } });
      }
      if (url.origin !== origin || route.request().method() !== 'GET') return route.abort();
      if (/^\/assets\/cinematic\/flags\/[a-z]{2}\.svg$/.test(url.pathname)) return route.fulfill({ contentType: 'image/svg+xml', body: await fs.readFile(new URL(`../client${url.pathname}`, import.meta.url)) });
      if (url.pathname === '/api/me') return route.fulfill({ json: { userId: 'fixture-owner', username: 'fixture', role: 'user', displayName: 'Fixture' } });
      if (url.pathname === '/api/mock-users') return route.fulfill({ json: { enabled: false, users: [] } });
      if (url.pathname.startsWith('/api/')) return route.abort();
      if (url.pathname !== '/__directed-opening-check') return route.continue();
      return route.fulfill({ contentType: 'text/html', body: `<!doctype html><html data-theme="default"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module">
      import RefreshRuntime from '/@react-refresh'; RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$=()=>{}; window.$RefreshSig$=()=>type=>type; window.__vite_plugin_react_preamble_installed__=true;
      await import('/src/styles/globals.css');
      const {default:React}=await import('/node_modules/.vite/deps/react.js${version}');
      const {default:ReactDOM}=await import('/node_modules/.vite/deps/react-dom_client.js${version}');
      const {default:i18n}=await import('/node_modules/.vite/deps/i18next.js${version}');
      const {I18nextProvider,initReactI18next}=await import('/node_modules/.vite/deps/react-i18next.js${version}');
      const {QueryClient,QueryClientProvider}=await import('/node_modules/.vite/deps/@tanstack_react-query.js${version}');
      const {ActorProvider}=await import('/src/lib/auth/ActorProvider.tsx');
      const {CinematicSetupForm}=await import('/src/features/cinematic/components/CinematicSetupForm.tsx');
      const {SceneDirectorDialog,StoryEnhanceDialog}=await import('/src/features/cinematic/components/CinematicDialogs.tsx');
      const {createCinematicSetupDraft}=await import('/src/features/cinematic/state/cinematicDraftStorage.ts');
      await i18n.use(initReactI18next).init({lng:${JSON.stringify(locale)},keySeparator:false,interpolation:{prefix:'{',suffix:'}',escapeValue:false},resources:{${locale}:{cinematic:${JSON.stringify(labels)}}}});
      const e=React.createElement, project=${JSON.stringify(project)}, noop=()=>{};
      function Screen(){const[draft,setDraft]=React.useState({...createCinematicSetupDraft(),projectName:'Night train',storyBrief:'At closing time, Mira decides whether to leave the station.', storyCountryStyle:'japan', genres:['drama','mystery'], audienceFeelings:['curious','tense','relieved'], pacingTraits:['slow-burn','accelerating']});
      if(location.search.includes('roles')) return e(StoryEnhanceDialog,{open:true,onOpenChange:noop,draft,purpose:'roles',onApply:noop});
      if(location.search.includes('story')) return e(StoryEnhanceDialog,{open:true,onOpenChange:noop,draft,purpose:'story',onApply:noop});
      return location.search.includes('director')? e(SceneDirectorDialog,{open:true,onOpenChange:noop,scene:project.scenes[0],castAssignments:project.castAssignments,mode:'advanced',authoringManifest:${JSON.stringify(cinematicFieldManifestService.getPublicManifest())},onSave:noop}) :
        e('main',{className:'cinematic-page','data-testid':'cinematic-workspace',style:{padding:'20px'}},e(CinematicSetupForm,{draft,storyAuthoring:${JSON.stringify(storyAuthoringConfiguration)},saveState:'saved',pending:false,onUpdate:(k,v)=>setDraft(d=>({...d,[k]:v})),onPlanningModeChange:noop,onAddRole:noop,onUpdateRole:noop,onRemoveRole:noop,onEnhance:noop,onAnalyzeRoles:noop,onManualRoleCountChange:noop,onSave:noop,onContinue:noop}));}
      ReactDOM.createRoot(document.getElementById('root')).render(e(QueryClientProvider,{client:new QueryClient()},e(ActorProvider,null,e(I18nextProvider,{i18n},e(Screen)))));
      </script></body></html>` });
    });
    const page = await context.newPage();
    page.on('pageerror', error => { errors.push(error.message); console.error(error.message); });
    for (const width of [1440, 820, 390]) {
      await page.setViewportSize({ width, height: 950 });
      for (const view of ['setup', 'director', 'roles', 'story']) {
        await page.goto(`${origin}/__directed-opening-check?${view}`);
        await page.getByRole('heading', { name: labels[view === 'setup' ? 'cinematic.setup.intentTitle' : view === 'roles' ? 'cinematic.enhance.roleTitle' : view === 'story' ? 'cinematic.enhance.title' : 'cinematic.director.title'], exact: true }).first().waitFor();
        if (view === 'setup') {
          const summary = page.locator('.cinematic-intent-choice__disclosure summary').first();
          await summary.focus();
          await page.keyboard.press('Enter');
          const romance = page.getByRole('checkbox', { name: labels['cinematic.genre.romance'], exact: true });
          await romance.focus();
          await page.keyboard.press('Space');
          assert.ok(await romance.isChecked(), 'Native checkbox must support keyboard selection');
          for (const theme of ['default', 'fashion', 'creative']) {
            await page.evaluate(theme => { document.documentElement.dataset.theme = theme; }, theme);
            const country = page.getByRole('combobox', { name: labels['cinematic.setup.storyCountryStyle'], exact: true });
            await country.click();
            assert.equal(await page.getByRole('option').count(), 7);
            await page.waitForFunction(() => [...document.querySelectorAll('[role="option"] img')].length === 6 && [...document.querySelectorAll('[role="option"] img')].every(img => img.complete && img.naturalWidth > 0));
            await page.screenshot({ path: path.join(output, `${locale}-${width}-${theme}-country-options.png`) });
            await page.getByRole('option', { name: labels['cinematic.countryStyle.japan'], exact: true }).click();
            assert.ok((await country.innerText()).includes(labels['cinematic.countryStyle.japan']));
            await country.focus();
            await page.keyboard.press('Enter');
            await page.getByRole('listbox').waitFor();
            await page.keyboard.press('Home');
            await page.waitForFunction(label => document.activeElement?.textContent?.includes(label), labels['cinematic.countryStyle.none']);
            await page.keyboard.press('Enter');
            await page.waitForFunction(label => document.querySelector('.cinematic-country-style button')?.textContent?.includes(label), labels['cinematic.countryStyle.none']);
            assert.ok((await country.innerText()).includes(labels['cinematic.countryStyle.none']));
            for (const details of await page.locator('.cinematic-intent-choice__disclosure').all()) {
              await details.evaluate(node => { node.open = true; });
            }
            const metrics = await page.locator('.cinematic-intent-choice__option').evaluateAll(nodes => nodes.map(node => {
              const box = node.querySelector('input').getBoundingClientRect();
              const label = node.querySelector('span').getBoundingClientRect();
              return { width: box.width, height: box.height, gap: label.left - box.right, aligned: Math.abs(label.top + label.height / 2 - box.top - box.height / 2) < 2 };
            }));
            assert.ok(metrics.length > 10 && metrics.every(m => m.width === 18 && m.height === 18 && m.gap >= 6 && m.gap <= 12 && m.aligned), `${locale}/${theme}/${width}: checkbox sizing and adjacent labels`);
            assert.ok(await page.locator('.cinematic-creative-intent').evaluate(node => node.scrollWidth <= node.clientWidth + 1), 'Intent section overflow');
            await page.locator('.cinematic-creative-intent').screenshot({ path: path.join(output, `${locale}-${width}-${theme}-intent-open.png`) });
            for (const details of await page.locator('.cinematic-intent-choice__disclosure').all()) {
              await details.evaluate(node => { node.open = false; });
            }
            await page.locator('.cinematic-creative-intent').screenshot({ path: path.join(output, `${locale}-${width}-${theme}-intent-closed.png`) });
          }
          await page.evaluate(() => { document.documentElement.dataset.theme = 'default'; });
        } else if (view === 'roles' || view === 'story') {
          const action = page.getByRole('button', { name: labels[view === 'roles' ? 'cinematic.roles.generate' : 'cinematic.enhance.generateStory'], exact: true });
          assert.equal(await action.locator('.lucide-sparkles').count(), 1);
          assert.equal(await action.locator('.lucide-lock-keyhole').count(), 0);
          assert.ok((await action.evaluate(node => getComputedStyle(node).backgroundImage)).includes('gradient'));
          const apply = page.getByRole('button', { name: labels[view === 'roles' ? 'cinematic.roles.apply' : 'cinematic.enhance.applyStory'], exact: true });
          assert.equal(await apply.isDisabled(), true);
          assert.equal(await page.locator('.cinematic-compare-grid').count(), view === 'roles' ? 0 : 1);
          await page.screenshot({ path: path.join(output, `${locale}-${width}-${view}-empty.png`) });
          await action.click();
          await apply.waitFor();
          await page.waitForFunction(label => [...document.querySelectorAll('button')].some(node => node.textContent.trim() === label && !node.disabled), labels[view === 'roles' ? 'cinematic.roles.apply' : 'cinematic.enhance.applyStory']);
          assert.equal(await page.locator('.cinematic-role-analysis article').count(), view === 'roles' ? 1 : 0);
          assert.ok(await page.getByRole('dialog').evaluate(node => node.scrollWidth <= node.clientWidth + 1));
          await apply.scrollIntoViewIfNeeded();
          const bounds = await apply.boundingBox();
          assert.ok(bounds && bounds.x >= 0 && bounds.x + bounds.width <= width && bounds.y >= 0 && bounds.y + bounds.height <= 950, 'Apply must be reachable inside the scrollable dialog');
          await page.screenshot({ path: path.join(output, `${locale}-${width}-${view}-actions.png`) });
          await page.getByRole('dialog').evaluate(node => { node.scrollTop = 0; });
        } else {
          await page.getByRole('button', { name: labels['cinematic.mode.advanced'], exact: true }).click();
          const coverage = page.getByRole('combobox', { name: labels['cinematic.director.castCoverage'], exact: true }).first();
          await coverage.selectOption('selected');
          await page.getByRole('group', { name: labels['cinematic.director.castSelected'], exact: true }).first().scrollIntoViewIfNeeded();
          const checkboxSize = await page.locator('.cinematic-shot-cast-choices input').first().boundingBox();
          assert.ok(checkboxSize && checkboxSize.width <= 20 && checkboxSize.height <= 20, 'Cast checkbox must not inherit text-input dimensions');
          await page.screenshot({ path: path.join(output, `${locale}-${width}-shot-cast.png`) });
          await coverage.selectOption('none');
          await page.getByText(labels['cinematic.director.shotAdvanced'], { exact: true }).first().click();
          await page.getByRole('textbox', { name: labels['cinematic.director.visibleMoment'], exact: true }).first().scrollIntoViewIfNeeded();
          await page.screenshot({ path: path.join(output, `${locale}-${width}-shot-opening.png`) });
        }
        await page.evaluate(() => document.fonts.ready);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${locale}/${view}/${width}: page overflow`);
        if (view === 'director') assert.ok(await page.getByRole('dialog').evaluate(node => node.scrollWidth <= node.clientWidth + 1), 'Dialog overflow');
        await page.screenshot({ path: path.join(output, `${locale}-${width}-${view}.png`), fullPage: view === 'setup' });
      }
    }
    await context.close();
  }
  assert.deepEqual(errors, []);
  console.log(`Directed openings verified in EN/TH at 390/820/1440px: ${output}`);
} finally { await browser.close(); }

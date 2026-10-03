import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createServer } from 'vite';
import { chromium } from 'playwright';

// Isolated component/container evidence; never dispatches provider or wallet calls.
const root = process.cwd();
const catalogs = Object.fromEntries(await Promise.all(['en', 'th'].map(async locale => [locale,
  Object.fromEntries(await Promise.all(['playground', 'react-ui'].map(async namespace => [namespace,
    JSON.parse(await fs.readFile(path.join(root, `client/i18n/locales/${locale}/${namespace}.json`), 'utf8'))])))])));
const output = await fs.mkdtemp(path.join(os.tmpdir(), 'mpf-generation-options-'));
const views = process.argv.includes('--view') ? [process.argv[process.argv.indexOf('--view') + 1]] : ['composer', 'comparison', 'look-sheet', 'settings', 'dialog', 'slot'];
assert.ok(views.every(view => ['composer', 'comparison', 'look-sheet', 'settings', 'dialog', 'slot'].includes(view)));
const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body><div id="root" style="max-width:1400px;padding:16px;margin:auto"></div><script type="module">
import React from 'react';
import {createRoot} from 'react-dom/client';
import i18next from 'i18next';
import {I18nextProvider,initReactI18next} from 'react-i18next';
import * as Dialog from '@radix-ui/react-dialog';
import {EngineTargetPanel} from '/src/components/generation/EngineTargetPanel.tsx';
import {VideoEngineTargetPanel} from '/src/components/generation/VideoEngineTargetPanel.tsx';
import {PlaygroundGenerationWorkspace} from '/src/components/generation/PlaygroundGenerationWorkspace.tsx';
import {GenerationReferenceDisclosure} from '/src/components/generation/GenerationReferenceDisclosure.tsx';
import {PromptEditor} from '/src/components/generation/PromptEditor.tsx';
import {CharacterLookSheetForm} from '/src/components/profiles/CharacterLookSheetForm.tsx';
import '/src/styles/globals.css';
import '/src/styles/character-look-sheet-form.css';
import '@fontsource/poppins/500.css';
import '@fontsource/noto-sans-thai/500.css';
const params=new URLSearchParams(location.search),e=React.createElement;
document.documentElement.dataset.theme=params.get('theme')||'default';
const i18n=i18next.createInstance();
await i18n.use(initReactI18next).init({lng:params.get('locale')||'en',fallbackLng:'en',keySeparator:false,
 interpolation:{prefix:'{',suffix:'}',escapeValue:false},resources:${JSON.stringify(catalogs)}});
const imageCatalog={defaultProvider:'openai',providers:[{id:'openai',displayName:'OpenAI',models:[
 {id:'image-one',displayName:'Image One / Long production model name',paidRoutingEnabled:true,
 capabilities:{imageGeneration:true,aspectRatios:['1:1','9:16','16:9'],resolutions:['1K','2K'],maxReferenceImages:6,imageReferences:true}},
 {id:'image-two',displayName:'Image Two',paidRoutingEnabled:true,
 capabilities:{imageGeneration:true,aspectRatios:['1:1','9:16'],dimensionControl:'aspect_ratio_only',maxReferenceImages:0,imageReferences:false}}]},
 {id:'second-provider',displayName:'Second provider',models:[{id:'image-three',displayName:'Image Three',paidRoutingEnabled:true,
 capabilities:{imageGeneration:true,aspectRatios:['1:1','9:16'],resolutions:['1K'],maxReferenceImages:6,imageReferences:true}}]}]};
const models=[{providerId:'modelark',modelId:'video-one',displayName:'Seedance / Long production model name',
 durations:[4,6,8],resolutions:['720p','1080p'],aspectRatios:['9:16','16:9'],audioModes:['none','generated'],paidRoutingEnabled:true},
 {providerId:'gemini',modelId:'video-two',displayName:'Veo Test',durations:[8],resolutions:['720p'],aspectRatios:['9:16'],audioModes:['generated'],paidRoutingEnabled:true}];
function App(){
 const[value,setValue]=React.useState({provider:'openai',model:'image-one',aspectRatio:'9:16',resolution:'1K',outputCount:1});
 const[slots,setSlots]=React.useState([{id:'slot-one',provider:'openai',model:'image-one'},{id:'slot-two',provider:'second-provider',model:'image-three'}]);
 const[video,setVideo]=React.useState({model:models[0],aspectRatio:'9:16',resolution:'720p',durationSeconds:4,audioMode:'none'});
 const[dialogOpen,setDialogOpen]=React.useState(true),[refinement,setRefinement]=React.useState(false);
 const[prompt,setPrompt]=React.useState('A quiet exchange in the flower shop.');
 const[renderStatus,setRenderStatus]=React.useState('idle');
 const[definition,setDefinition]=React.useState({schemaVersion:1,name:'Fixture Character',ageYears:28,
  appearance:'Adult character with short dark hair.',situation:'A quiet exchange in the flower shop.',outfit:'Plain clothing',personality:'Neutral'});
 const view=params.get('view');
 const image=e(EngineTargetPanel,{catalog:imageCatalog,value,comparison:view==='slot'||view==='comparison',comparisonSlots:slots,inlineModelAction:view==='look-sheet'||view==='comparison',
  comparisonEstimates:slots.map(slot=>({id:slot.id,estimatedCredit:15})),requiredReferenceCount:view==='look-sheet'?0:1,
  fixedAspectRatio:view==='dialog'?'9:16':null,allowComparison:!['dialog','look-sheet'].includes(view),allowMultiOutput:!['dialog','look-sheet'].includes(view),
  promptRefinementAvailable:!['dialog','look-sheet'].includes(view),promptRefinementEnabled:refinement,onPromptRefinementChange:setRefinement,
 onChange:setValue,onSlotsChange:setSlots,onComparisonChange:()=>{},presentation:'compact'});
 const references=e('div',{style:{display:'flex',flexWrap:'wrap',gap:12}},[1,2,3].map(n=>e('figure',{key:n,style:{margin:0}},
 e('img',{src:'/fixture-image',alt:'Reference '+n,style:{width:64,height:86,objectFit:'contain'}}),e('figcaption',null,'Image '+n))));
 const composerSummary=e(React.Fragment,null,e('ul',{className:'generation-reference-disclosure__previews'},[1,2].map(n=>e('li',{key:n},
 e('span',{className:'generation-reference-disclosure__thumbnail'},e('img',{src:'/fixture-image',alt:'Reference '+n})),e('strong',null,'Image '+n)))),
 e('small',null,i18n.t('playground.options.moreReferences',{ns:'playground',count:7})));
 const clip=e(VideoEngineTargetPanel,{models,selectedModel:video.model,aspectRatio:video.aspectRatio,resolution:video.resolution,
 durationSeconds:video.durationSeconds,audioMode:video.audioMode,comparisonEnabled:false,comparisonActive:false,quoteLoading:false,
 estimatedCredits:45,maximumCreditEstimate:true,compact:true,showComparisonAction:false,
 onModelChange:key=>setVideo(current=>({...current,model:models.find(item=>item.providerId+':'+item.modelId===key)})),
 onAspectRatioChange:aspectRatio=>setVideo(current=>({...current,aspectRatio})),
 onResolutionChange:resolution=>setVideo(current=>({...current,resolution})),
 onDurationChange:durationSeconds=>setVideo(current=>({...current,durationSeconds})),
 onAudioModeChange:audioMode=>setVideo(current=>({...current,audioMode})),onComparisonChange:()=>{},summary:view==='composer'?null:references,
 footer:view==='composer'?null:e('button',{type:'button',className:'btn btn-primary',onClick:()=>{}},'Generate fixture')});
 if(view==='dialog')return e(Dialog.Root,{open:dialogOpen,onOpenChange:setDialogOpen},e(Dialog.Portal,null,
 e(Dialog.Overlay,{style:{position:'fixed',inset:0,background:'var(--theme-overlay)',zIndex:160}}),
 e(Dialog.Content,{style:{position:'fixed',top:32,left:'50%',transform:'translateX(-50%)',width:'min(620px,calc(100vw - 24px))',
 maxHeight:'calc(100dvh - 64px)',overflow:'auto',padding:16,borderRadius:8,background:'var(--theme-surface)',zIndex:161}},
 e(Dialog.Title,null,'First Frame'),e(Dialog.Description,null,'Character and Scene references'),references,image,
 e(Dialog.Close,null,'Close fixture'))));
 const result=e('div',null,e('img',{src:'/fixture-image',alt:'Completed result',style:{width:'100%',maxHeight:420,objectFit:'contain'}}),
  e('button',{'data-fixture-complete':true,onClick:()=>setRenderStatus('completed')},'Complete fixture'),
  e('button',{'data-fixture-fail':true,onClick:()=>setRenderStatus('failed')},'Fail fixture'));
 const expansion={completedResultKey:renderStatus==='completed'?'fixture-1':null,activeRenderKey:renderStatus==='running'?'fixture-1':null,renderBusy:renderStatus==='running',showResult:renderStatus!=='idle',modelSummary:view==='composer'?video.model.displayName:'Image One'};
 const actions=e('button',{type:'button',className:'studio-generate-button btn-neon-yellow-glow',onClick:()=>setRenderStatus('running')},'Generate fixture');
 if(view==='composer'||view==='comparison')return e(PlaygroundGenerationWorkspace,{composer:true,...expansion,
 prompt:e(PromptEditor,{variant:'playground',value:prompt,onChange:setPrompt,negativeValue:'',onNegativeChange:()=>{},showNegative:false,
 primaryLabel:view==='composer'?i18n.t('playground.video.promptTitle',{ns:'playground'}):undefined,inputId:'fixture-prompt'}),
 result,
 queue:e('p',null,'Queue fixture'),recent:e('p',null,'Recent fixture'),engine:view==='comparison'?image:clip,
 references:e(GenerationReferenceDisclosure,{count:9,limit:9,summary:composerSummary},e('input',{'aria-label':'Reference name',defaultValue:'Preserved reference'})),
 actions,showRenderPromptHeading:false,recentExpanded:true,onRecentExpandedChange:()=>{},comparisonActive:view==='comparison'});
 if(view==='look-sheet')return e(PlaygroundGenerationWorkspace,{composer:true,engine:image,...expansion,
  builderTitle:i18n.t('lookSheet.title',{ns:'playground'}),builder:e(CharacterLookSheetForm,{value:definition,onChange:setDefinition}),
  references:e(GenerationReferenceDisclosure,{count:0,limit:6,label:i18n.t('playground.options.references',{ns:'playground'})},references),
  prompt:e('div',{className:'studio-prompt-preview'},e('textarea',{readOnly:true,'aria-label':i18n.t('lookSheet.promptPreview',{ns:'playground'}),value:JSON.stringify(definition)})),
  result,
  queue:e('p',{'data-fixture-queue':true},'Queue fixture'),recent:e('p',null,'Recent fixture'),
  actions,showRenderPromptHeading:false,recentExpanded:true,onRecentExpandedChange:()=>{},comparisonActive:false});
 return e('main',{className:view==='settings'?'cinematic-produce-render-panel':'',style:{maxWidth:view==='settings'?360:1000,margin:'auto'}},view==='settings'?clip:image);
}
createRoot(document.getElementById('root')).render(e(I18nextProvider,{i18n},e(App)));
</script></body></html>`;
const server = await createServer({ root: path.join(root, 'web'), configFile: path.join(root, 'web/vite.config.ts'),
  configLoader: 'runner', cacheDir: path.join(output, 'vite-cache'),
  server: { host: '127.0.0.1', port: 0, open: false },
  plugins: [{ name: 'generation-options-review', configureServer(vite) {
    vite.middlewares.use(async (req, res, next) => {
      if (!req.url?.startsWith('/__generation-options') || req.url.includes('html-proxy')) return next();
      try { res.setHeader('Content-Type', 'text/html'); res.end(await vite.transformIndexHtml(req.url, html)); }
      catch (error) { next(error); }
    });
  } }] });
let browser;
const records = [];
try {
  await server.listen();
  const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
  browser = await chromium.launch({ headless: true });
  const photo = await fs.readFile(path.join(root, 'client/assets/scene-builder/shot-recipes/cafe-seated-lifestyle.jpg'));
  const page = await browser.newPage();
  const errors = [], unexpected = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/**', route => { unexpected.push(route.request().url()); return route.abort(); });
  await page.route('**/fixture-image', route => route.fulfill({ body: photo, contentType: 'image/jpeg' }));
  for (const view of views) for (const locale of ['en', 'th']) for (const theme of ['default', 'fashion', 'creative']) for (const width of [390, 820, 1440]) {
    const height = width === 1440 ? 900 : width === 820 ? 1180 : 844;
    await page.setViewportSize({ width, height });
    await page.goto(`${origin}/__generation-options?view=${view}&locale=${locale}&theme=${theme}`);
    await page.locator('.generation-model-picker__trigger').first().waitFor();
    await page.evaluate(() => document.fonts.ready);
    assert.ok(await page.locator('body').evaluate(el => el.scrollWidth <= innerWidth + 1), `${view}/${locale}/${theme}/${width} overflow`);
    const clipped = await page.locator('.generation-model-picker__trigger,.generation-option-field__control').evaluateAll(elements => elements.filter(el => {
      const rect = el.getBoundingClientRect(); return rect.left < 0 || rect.right > innerWidth + 1;
    }).length);
    assert.equal(clipped, 0);
    assert.equal(await page.locator('body').evaluate(el => /playground\.(options|engine)\./.test(el.textContent)), false);
    const renderFrame = await inspectRenderFrame(page);
    let firstView, setupMotion;
    if (view === 'look-sheet') {
      const builder = page.locator('.playground-workspace__builder');
      assert.equal(await builder.getAttribute('open'), '');
      assert.ok((await builder.locator('summary').textContent()).trim());
      assert.equal(await builder.locator('.look-sheet-form').count(), 1);
      assert.equal(await page.locator('textarea[readonly]').count(), 1);
      assert.equal(await page.locator('.playground-workspace__action button').count(), 1);
      await builder.locator('.look-sheet-form').evaluate(el => { el.dataset.qaMounted = 'retained'; });
      const name = builder.locator('input[id$="-name"]');
      await name.fill('Edited guided Character');
      for (const field of ['age', 'appearance', 'situation', 'outfit', 'personality']) {
        const control = builder.locator(`[id$="-${field}"]`);
        await control.scrollIntoViewIfNeeded();
        assert.ok(await control.isVisible(), `Guided ${field} is unreachable`);
      }
      await builder.locator('summary').click();
      assert.equal(await builder.getAttribute('open'), null);
      assert.equal(await builder.locator('[data-qa-mounted="retained"]').count(), 1, 'Collapsed builder stays mounted');
      await builder.locator('summary').click();
      assert.equal(await name.inputValue(), 'Edited guided Character');
      await page.evaluate(() => { window.scrollTo(0,0); document.querySelector('.playground-workspace__composer').scrollTop=0; });
      firstView = await page.evaluate(() => {
        const rect = selector => { const r=document.querySelector(selector).getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,bottom:r.bottom}; };
        const composer=document.querySelector('.playground-workspace__composer');
        return {model:rect('.generation-model-picker__trigger'),tools:rect('.playground-workspace__tools-frame'),
          output:rect('.playground-workspace__output'),generate:rect('.playground-workspace__action button'),
          order:[...composer.children].map(el=>el.matches('.engine-target-panel')?'engine':el.matches('details.playground-workspace__builder')?'builder':el.matches('.generation-reference-disclosure')?'references':'prompt'),
          overflow:getComputedStyle(composer).overflowY};
      });
      assert.equal(firstView.overflow, 'visible');
      firstView = await inspectExpandable(page,width);
      await page.screenshot({path:path.join(output,`${view}-${locale}-${theme}-${width}-first-view.png`)});
    }
    if (view === 'composer') {
      await page.evaluate(() => window.scrollTo(0, 0));
      firstView = await page.evaluate(() => {
        const rect = selector => { const r = document.querySelector(selector).getBoundingClientRect();
          return { x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom }; };
        return { scrollTop:scrollY,model:rect('.generation-model-picker__trigger'),prompt:rect('textarea'),
          generate:rect('.playground-workspace__action button'),tools:rect('.playground-workspace__tools-frame'),
          output:rect('.playground-workspace__output'),referencesOpen:document.querySelector('.generation-reference-disclosure details').open };
      });
      assert.equal(firstView.scrollTop, 0);
      assert.equal(firstView.referencesOpen, false);
      assert.ok(firstView.model.y >= 0, JSON.stringify(firstView));
      if (width === 1440) {
        assert.ok(firstView.prompt.y >= 0 && firstView.prompt.bottom <= height, JSON.stringify(firstView));
        assert.ok(firstView.generate.y >= 0 && firstView.generate.bottom <= height, JSON.stringify(firstView));
        assert.ok(firstView.output.y >= firstView.tools.bottom);
      } else {
        assert.ok(firstView.output.y >= firstView.tools.bottom, JSON.stringify(firstView));
        assert.ok(firstView.prompt.y < height * 2, 'Prompt needs more than one viewport of scrolling');
      }
      const details = page.locator('.generation-reference-disclosure details');
      await details.locator('summary').click();
      await page.getByRole('textbox', { name:'Reference name' }).fill('Edited reference');
      await details.locator('summary').click();
      assert.equal(await details.getAttribute('open'), null);
      await details.locator('summary').click();
      assert.equal(await page.getByRole('textbox', { name:'Reference name' }).inputValue(), 'Edited reference');
      assert.equal(await page.locator('#fixture-prompt').inputValue(), 'A quiet exchange in the flower shop.');
      await details.locator('summary').click();
      await page.evaluate(() => { window.scrollTo(0,0); document.querySelector('.playground-workspace__composer').scrollTop=0; });
      await page.screenshot({ path:path.join(output, `${view}-${locale}-${theme}-${width}-first-view.png`) });
      firstView = await inspectExpandable(page,width);
    }
    if (view==='comparison') {
      firstView = await inspectExpandable(page,width);
      const settings=page.locator('.playground-workspace__render-settings');
      assert.match(await settings.evaluate(el=>getComputedStyle(el).backgroundImage),/linear-gradient/);
      assert.equal(await settings.locator('.comparison-configurator').evaluate(el=>getComputedStyle(el).boxShadow),'none');
      for (const count of [2,3,4]) {
        assert.equal(await page.locator('.comparison-slot-card').count(),count);
        const sizes=await page.locator('.comparison-slot-card').evaluateAll(cards=>cards.map(card=>{
          const value=card.querySelector('.generation-model-picker__value').getBoundingClientRect();
          const title=card.querySelector('.generation-model-picker__value strong');
          return {width:card.getBoundingClientRect().width,valueWidth:value.width,
            lines:title.getBoundingClientRect().height/parseFloat(getComputedStyle(title).lineHeight)};
        }));
        assert.ok(sizes.every(size=>size.width>=260 && size.valueWidth>=150 && size.lines<=4),JSON.stringify({width,count,sizes}));
        const controls=await page.locator('.comparison-slot-card__actions button').evaluateAll(buttons=>buttons.map(button=>button.getBoundingClientRect().height));
        assert.ok(controls.every(height=>height>=44));
        await page.screenshot({path:path.join(output,`${view}-${locale}-${theme}-${width}-${count}-slots.png`),fullPage:true});
        if(count<4) await page.locator('.comparison-slot-add').click();
      }
      await page.locator('.comparison-slot-card__actions button').last().click();
      assert.equal(await page.locator('.comparison-slot-card').count(),3);
    }
    if (view==='composer' || view==='comparison' || view==='look-sheet') {
      setupMotion = await inspectSetupMotion(page, `${view}-${locale}-${theme}-${width}`);
      const toggle=page.locator('.playground-workspace__setup-toggle');
      assert.equal(await page.locator('.playground-workspace__result').isVisible(),false);
      const field=page.locator(view==='look-sheet'?'input[id$="-name"]':'#fixture-prompt');
      const saved=await field.inputValue();
      await page.getByRole('button',{name:'Generate fixture'}).click();
      assert.equal(await toggle.getAttribute('aria-expanded'),'true','Pending does not collapse');
      await field.focus();
      await page.locator('[data-fixture-complete]').evaluate(button=>button.click());
      await page.waitForTimeout(50);
      assert.equal(await toggle.getAttribute('aria-expanded'),'true','Completion must wait for editing');
      await page.locator('.playground-workspace__output').evaluate(el=>{el.tabIndex=-1;el.focus();});
      await page.waitForFunction(()=>document.querySelector('.playground-workspace__setup-toggle').getAttribute('aria-expanded')==='false');
      await field.waitFor({state:'hidden'});
      assert.equal(await field.isVisible(),false);
      assert.equal(await field.inputValue(),saved,'Collapsed input stays mounted');
      await page.screenshot({path:path.join(output,`${view}-${locale}-${theme}-${width}-collapsed.png`)});
      await toggle.click();
      await page.locator('.playground-workspace__composer').evaluate(async element => {
        await Promise.all(element.getAnimations().map(animation=>animation.finished.catch(()=>{})));
      });
      assert.equal(await field.inputValue(),saved);
      await field.focus();
      await page.locator('.playground-workspace__output').focus();
      assert.equal(await toggle.getAttribute('aria-expanded'),'true','Manual reopen survives the same success');
      await page.locator('[data-fixture-fail]').click();
      assert.equal(await toggle.getAttribute('aria-expanded'),'true','Failure does not collapse');
    }
    await page.screenshot({ path: path.join(output, `${view}-${locale}-${theme}-${width}.png`), fullPage: true });
    const trigger = page.locator('.generation-model-picker__trigger').first();
    await trigger.focus();
    await page.keyboard.press('Enter');
    const search = page.locator('.generation-model-picker__search input');
    await search.waitFor();
    await page.waitForFunction(() => document.activeElement?.matches('.generation-model-picker__search input'));
    await search.fill('not-a-model');
    assert.equal(await page.getByRole('menuitemradio').count(), 0);
    await search.fill(view === 'settings' || view === 'composer' ? 'Seedance' : 'Image One');
    assert.equal(await page.getByRole('menuitemradio').count(), 1);
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.getByRole('menuitemradio').evaluate(el => el === document.activeElement), true);
    await page.keyboard.press('Escape');
    await page.locator('.generation-model-picker__menu').waitFor({ state: 'hidden' });
    await trigger.evaluate(el => new Promise(resolve => requestAnimationFrame(() => resolve(el === document.activeElement))));
    assert.equal(await trigger.evaluate(el => el === document.activeElement), true);
    if (view === 'dialog') assert.equal(await page.getByRole('dialog').count(), 1);
    await trigger.click();
    await page.waitForFunction(() => document.activeElement?.matches('.generation-model-picker__search input'));
    const bounds = await page.locator('.generation-model-picker__menu').boundingBox();
    assert.ok(bounds && bounds.x >= 0 && bounds.x + bounds.width <= width + 1);
    const selectedRow = page.locator('.generation-model-picker__item[data-state="checked"]').first();
    await selectedRow.hover();
    assert.equal(await search.evaluate(el => el === document.activeElement), true);
    await search.hover();
    assert.equal(await search.evaluate(el => el === document.activeElement), true);
    const menuContrast = await selectedRow.evaluate(el => {
      const rgb = value => value.trim().startsWith('#')
        ? [...value.trim().slice(1).match(/../g).map(part => parseInt(part,16)), 1]
        : value.match(/[\d.]+/g).map(Number);
      const over = (front, back) => front.slice(0,3).map((v,i) => v * (front[3] ?? 1) + back[i] * (1 - (front[3] ?? 1)));
      const background = node => {
        if (!node) return [255,255,255];
        return over(rgb(getComputedStyle(node).backgroundColor), background(node.parentElement));
      };
      const light = color => color.map(v => { const n=v/255; return n<=.04045?n/12.92:((n+.055)/1.055)**2.4; })
        .reduce((sum,n,i)=>sum+n*[.2126,.7152,.0722][i],0);
      const ratio = (a,b) => { const x=light(a),y=light(b); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); };
      const measure = () => { const bg=background(el); return {
        text:ratio(rgb(getComputedStyle(el).color).slice(0,3),bg),
        provider:ratio(rgb(getComputedStyle(el.querySelector('small')).color).slice(0,3),bg)
      }; };
      const selected=measure();
      el.dataset.highlighted='';
      const selectedHover=measure();
      el.dataset.state='unchecked';
      const hover=measure();
      el.dataset.state='checked'; delete el.dataset.highlighted;
      return {selected,selectedHover,hover};
    });
    for (const state of Object.values(menuContrast)) assert.ok(state.text >= 4.5 && state.provider >= 4.5,
      JSON.stringify({view,locale,theme,width,menuContrast}));
    await page.screenshot({ path: path.join(output, `${view}-${locale}-${theme}-${width}-picker.png`), fullPage: true });
    await page.keyboard.press('Tab');
    await page.locator('.generation-model-picker__menu').waitFor({ state: 'hidden' });
    assert.equal(await trigger.evaluate(el => el === document.activeElement), false);
    const contrast = await trigger.evaluate(el => {
      const rgb = value => value.trim().startsWith('#')
        ? value.trim().slice(1).match(/../g).map(part => parseInt(part,16))
        : value.match(/[\d.]+/g).slice(0,3).map(Number);
      const light = color => rgb(color).map(v => { const n=v/255; return n<=.04045?n/12.92:((n+.055)/1.055)**2.4; })
        .reduce((sum,n,i)=>sum+n*[.2126,.7152,.0722][i],0);
      const ratio = (a,b) => { const x=light(a),y=light(b); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); };
      const style=getComputedStyle(el), muted=getComputedStyle(el.querySelector('small'));
      const control=el.closest('.generation-options-panel')?.querySelector('.generation-option-field__control');
      return { text:ratio(style.color,style.backgroundColor), muted:ratio(muted.color,style.backgroundColor),
        border:ratio(style.borderTopColor,style.backgroundColor),
        focus:ratio(style.getPropertyValue('--theme-focus'),style.backgroundColor),
        touchHeight:control?.getBoundingClientRect().height || el.getBoundingClientRect().height };
    });
    assert.ok(contrast.text >= 4.5 && contrast.muted >= 4.5, JSON.stringify({ view, locale, theme, width, contrast }));
    assert.ok(contrast.border >= 3 && contrast.focus >= 3, JSON.stringify({ view, locale, theme, width, contrast }));
    assert.ok(contrast.touchHeight >= 44);
    records.push({ view, locale, theme, width, height, firstView, setupMotion, renderFrame, contrast, menuContrast });
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(unexpected, []);
  await fs.writeFile(path.join(output, 'evidence.json'), JSON.stringify(records, null, 2));
  console.log(JSON.stringify({ output, checks: records.length, evidence: 'isolated composer/guided Look Sheet/settings/dialog/slot containers; full-route UAT remains separate' }));
} catch (error) {
  console.error(`Evidence: ${output}`);
  if (browser) for (const context of browser.contexts()) for (const page of context.pages()) await page.screenshot({ path: path.join(output, 'failure.png'), fullPage: true });
  throw error;
} finally { await browser?.close(); await server.close(); }

async function inspectSetupMotion(page, name) {
  const content=page.locator('.playground-workspace__composer');
  const toggle=page.locator('.playground-workspace__setup-toggle');
  assert.equal(await content.evaluate(element=>element.getAnimations().length),0,'Entry does not animate');
  const fullHeight=(await content.boundingBox()).height;
  await toggle.click();
  const closing=await content.evaluate(element=>{
    const animation=element.getAnimations()[0];
    animation.pause(); animation.currentTime=120;
    const frames=animation.effect.getKeyframes();
    return {height:element.getBoundingClientRect().height,inert:element.inert,
      hidden:element.getAttribute('aria-hidden'),start:frames[0].height,end:frames[1].height};
  });
  assert.ok(closing.height>0 && closing.height<fullHeight,JSON.stringify(closing));
  assert.equal(closing.end,'0px');
  assert.equal(closing.inert,true);
  assert.equal(closing.hidden,'true');
  await page.screenshot({path:path.join(output,`${name}-slide-up.png`)});
  await toggle.click();
  const reversal=await content.evaluate(element=>{
    const animation=element.getAnimations()[0];
    animation.pause(); animation.currentTime=0;
    const height=element.getBoundingClientRect().height;
    animation.finish();
    return height;
  });
  assert.ok(Math.abs(reversal-closing.height)<2,'Rapid reversal starts from the visible height');
  await page.waitForFunction(()=>document.querySelector('.playground-workspace__composer').getAnimations().length===0 && document.querySelector('.playground-workspace__composer').style.overflow==='');
  await toggle.click();
  await content.evaluate(element=>element.getAnimations()[0].finish());
  await content.waitFor({state:'hidden'});
  await toggle.click();
  const opening=await content.evaluate(element=>{
    const animation=element.getAnimations()[0];
    animation.pause(); animation.currentTime=120;
    return {height:element.getBoundingClientRect().height,frames:animation.effect.getKeyframes().map(frame=>({height:frame.height,transform:frame.transform}))};
  });
  assert.equal(opening.frames[0].height,'0px');
  assert.ok(opening.height>0 && opening.height<fullHeight);
  await page.screenshot({path:path.join(output,`${name}-slide-down.png`)});
  await content.evaluate(element=>element.getAnimations()[0].finish());
  await page.waitForFunction(()=>document.querySelector('.playground-workspace__composer').getAnimations().length===0 && document.querySelector('.playground-workspace__composer').style.overflow==='');
  assert.equal(await content.evaluate(element=>getComputedStyle(element).overflow),'visible');
  await toggle.click();
  await content.evaluate(element=>{const animation=element.getAnimations()[0];animation.pause();animation.currentTime=120;});
  await page.emulateMedia({reducedMotion:'reduce'});
  await content.waitFor({state:'hidden'});
  assert.equal(await content.evaluate(element=>element.getAnimations().length),0,'Reduced-motion change cancels active slide');
  await toggle.click();
  assert.equal(await content.evaluate(element=>element.getAnimations().length),0,'Reduced motion opens immediately');
  assert.equal(await toggle.getAttribute('aria-expanded'),'true');
  await page.emulateMedia({reducedMotion:'no-preference'});
  return {closing,opening,reversal,reducedMotion:true};
}

async function inspectExpandable(page,width) {
  const layout=await page.evaluate(()=>{
    const rect=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,bottom:r.bottom};};
    return {writing:rect('.playground-workspace__writing'),render:rect('.playground-workspace__render-settings'),
      tools:rect('.playground-workspace__tools-frame'),output:rect('.playground-workspace__output')};
  });
  assert.equal(await page.locator('.playground-workspace__setup-toggle').getAttribute('aria-expanded'),'true');
  assert.ok(layout.output.y>=layout.tools.bottom,'Result region follows setup');
  if(width===1440){
    assert.ok(layout.writing.x+layout.writing.width<=layout.render.x,'Writing left, render right');
    assert.ok(layout.writing.width>layout.render.width,'Writing owns the wider region');
  } else assert.ok(layout.render.y>=layout.writing.bottom,'Narrow layouts preserve natural authoring/render tab order');
  assert.equal(await page.locator('.playground-workspace__writing .generation-render-frame').count(),0);
  assert.equal(await page.locator('.playground-workspace__render-settings .generation-option-field__control').evaluateAll(controls=>controls.filter(control=>{
    const box=control.getBoundingClientRect(),parent=control.closest('.generation-option-field').getBoundingClientRect();
    return box.right>parent.right+1 || box.left<parent.left-1;
  }).length),0,'Settings controls must stay inside their column');
  return layout;
}

async function inspectRenderFrame(page) {
  const frames = await page.locator('.generation-render-frame,.engine-target-panel').evaluateAll(elements => elements.map(el => {
    const style = getComputedStyle(el), probe = document.createElement('span');
    probe.style.color = style.getPropertyValue('--theme-render-accent');
    el.append(probe);
    const accent = getComputedStyle(probe).color;
    probe.remove();
    return { nested: Boolean(el.parentElement.closest('.generation-render-frame,.engine-target-panel')),
      accent, token:style.getPropertyValue('--theme-render-accent').trim(), border:style.borderTopColor,
      width:style.borderTopWidth, shadow:style.boxShadow, animation:style.animationName };
  }));
  assert.equal(frames.filter(frame=>!frame.nested).length, 1, JSON.stringify(frames));
  for (const frame of frames) {
    assert.ok(frame.token, 'Dedicated render accent token is required');
    assert.equal(frame.animation, 'none', 'Render signature must not animate');
    if (frame.nested) {
      assert.equal(frame.width, '0px', 'Nested engine border is suppressed');
      assert.equal(frame.shadow, 'none', 'Nested engine glow is suppressed');
    } else {
      assert.equal(frame.border, frame.accent, 'Outer render border uses the render accent');
      assert.ok(parseFloat(frame.width)>0);
      assert.notEqual(frame.shadow, 'none', 'Outer render frame retains its static glow');
    }
  }
  assert.equal(await page.locator('.playground-workspace__output .generation-render-frame,.look-sheet-form.generation-render-frame').count(), 0);
  return frames;
}

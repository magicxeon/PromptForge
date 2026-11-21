// Isolated gallery acceptance; no provider or live mutation requests.
import { chromium } from 'playwright';
import sharp from 'sharp';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
await fs.mkdir('_temp/fe24-media',{recursive:true});
const png=await sharp({create:{width:1600,height:900,channels:3,background:'#7e9e88'}}).png().toBuffer();
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000},hasTouch:true});
const items=Array.from({length:12},(_,i)=>({id:`image_${i}`,prompt:`Prompt ${i}`,imageUrl:`/outputs/image_${i}.png`,thumbnailUrl:`/outputs/thumb_${i}.png`,timestamp:Date.now()-i,provider:'fixture',submodel:`Model ${i}`,mode:'normal',width:1600,height:900}));
const errors=[],unexpected=[];page.on('pageerror',e=>errors.push(e.message));let failImage=false;
await page.addInitScript(()=>localStorage.setItem('mpf.next.language','en'));
await page.route('**/outputs/**',route=>failImage&&route.request().url().endsWith('/image_2.png')?route.abort():route.fulfill({contentType:'image/png',body:png}));
await page.route('**/api/**',route=>{
  const url=new URL(route.request().url()),p=url.pathname;if(!p.startsWith('/api/'))return route.continue();
  const json=value=>route.fulfill({contentType:'application/json',body:JSON.stringify(value)});
  if(p==='/api/web-next/config')return json({creditsEnabled:false});
  if(p==='/api/auth/config')return json({contractVersion:1,authMode:'development_bypass',methods:{password:false,emailOtp:false,google:false,facebook:false},csrfToken:'fixture',policy:{otpDigits:6,otpExpiresSeconds:300,resendSeconds:30,passwordMinLength:8,passwordMaxLength:128},legal:{termsVersion:null,privacyVersion:null}});
  if(p==='/api/me')return json({userId:'fixture',username:'fixture',displayName:'fixture',role:'admin',authMode:'development_bypass',accountStatus:'active'});
  if(p==='/api/providers')return json({defaultProvider:'fixture',providers:[{id:'fixture',displayName:'Fixture',defaultModel:'image',models:[{id:'image',displayName:'Image',capabilities:{imageGeneration:true,imageReferences:true,maxReferenceImages:6,aspectRatios:['1:1','16:9']}}]}]});
  if(p==='/api/history')return json({items:items.slice(url.searchParams.has('cursor')?6:0,url.searchParams.has('cursor')?12:6),hasMore:!url.searchParams.has('cursor'),nextCursor:url.searchParams.has('cursor')?null:'next'});
  if(p==='/api/generation/job-center')return json({items:[],activeCount:0,terminalCount:0,polledAt:new Date().toISOString()});
  if(p==='/api/generation/prompt-preview')return json({compiledPrompt:'fixture'});
  if(p==='/api/credits/estimate')return json({estimate:{estimateId:'fixture',estimatedCredits:1,expiresAt:Date.now()+60000},account:{availableCredits:10,canAfford:true}});
  unexpected.push(`${route.request().method()} ${p}`);return route.abort();
});
try {
  await page.goto('http://127.0.0.1:6502/image');await page.locator('.result-thumb').nth(5).waitFor();
  await page.locator('#prompt').fill('Keep this draft');
  await page.locator('.result-thumb').nth(1).click();
  const modal=page.locator('.gallery-viewer');await modal.locator('.image-stage img').waitFor();
  assert.ok((await modal.locator('.gallery-actions').innerText()).includes('Model 1'));
  await modal.getByRole('button',{name:'Next image',exact:true}).click();await modal.locator('.gallery-actions').getByText('Model 2',{exact:true}).waitFor();
  await modal.getByRole('button',{name:'Previous image',exact:true}).click();
  await modal.locator('.image-surface').focus();await page.keyboard.press('ArrowRight');await modal.locator('.gallery-actions').getByText('Model 2',{exact:true}).waitFor();
  await modal.getByRole('button',{name:'Load more',exact:true}).click();await modal.locator('.gallery-filmstrip button').nth(11).waitFor();
  await modal.getByRole('button',{name:'Hide thumbnails',exact:true}).click();assert.equal(await modal.locator('.gallery-filmstrip').count(),0);
  await modal.getByRole('button',{name:'Show thumbnails',exact:true}).click();
  await modal.getByRole('button',{name:'100%',exact:true}).click();
  const surface=modal.locator('.image-surface');await modal.locator('.zoom-value').click();
  await surface.hover();await page.waitForTimeout(1700);assert.equal(await surface.getAttribute('data-scroll-active'),'false');
  const bounds=await surface.boundingBox();await page.mouse.move(bounds.x+30,bounds.y+40);assert.equal(await surface.getAttribute('data-scroll-active'),'true');
  await surface.focus();await page.keyboard.press('ArrowRight');await page.waitForTimeout(1700);assert.equal(await surface.getAttribute('data-scroll-active'),'true');
  assert.ok((await modal.locator('.gallery-actions').innerText()).includes('Model 2'),'zoomed arrow pans instead of selecting');
  for(const width of [1440,820,390]) {
    await page.setViewportSize({width,height:900});await modal.getByRole('button',{name:'Fit',exact:true}).click();
    assert.ok(await modal.evaluate(n=>n.scrollWidth<=n.clientWidth));
    assert.ok((await surface.boundingBox()).height>100);
    await page.screenshot({path:`_temp/fe24-media/gallery-${width}.png`});
  }
  await modal.getByRole('button',{name:'Close',exact:true}).click();await modal.waitFor({state:'hidden'});
  assert.equal(await page.locator('#prompt').inputValue(),'Keep this draft');assert.equal(await page.locator('.result-thumb.selected span').innerText(),'Model 2');
  if(await page.locator('.mobile-tabs').isVisible())await page.locator('.mobile-tabs button').nth(1).click();
  await page.locator('.result-thumb').nth(1).click();await modal.locator('.image-stage img').waitFor();
  const cdp=await page.context().newCDPSession(page), touchBounds=await surface.boundingBox();
  const tx=touchBounds.x+touchBounds.width-40,ty=touchBounds.y+touchBounds.height/2;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:tx,y:ty}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:tx-120,y:ty}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await modal.locator('.gallery-actions').getByText('Model 2',{exact:true}).waitFor();
  await modal.getByRole('button',{name:'Previous image',exact:true}).click();
  failImage=true;await modal.getByRole('button',{name:'Next image',exact:true}).click();await modal.getByRole('alert').waitFor();failImage=false;await modal.getByRole('button',{name:'Try again',exact:true}).click();await modal.locator('.image-stage img').waitFor();
  await modal.getByRole('button',{name:'Close',exact:true}).click();
  assert.deepEqual(errors,[]);assert.deepEqual(unexpected,[]);
  console.log('PASS gallery next/previous/keyboard/load more/thumbnails/idle scrollbar/focus/error retry/draft/390-820-1440; no paid requests');
}catch(e){await page.screenshot({path:'_temp/fe24-media/failure.png'});console.error({errors,unexpected});throw e;}finally{await browser.close();}

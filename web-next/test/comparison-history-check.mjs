// Isolated history/export UI acceptance. No live mutations or provider requests.
import { chromium } from "playwright";
import sharp from "sharp";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const png = await sharp({create:{width:1600,height:900,channels:3,background:"#7e9e88"}}).png().toBuffer();
const portrait = await sharp({create:{width:900,height:1600,channels:3,background:"#a2b8a5"}}).png().toBuffer();
await fs.mkdir("_temp/fe24-history",{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true});
page.setDefaultTimeout(10000);
const errors=[], listRequests=[], exportRequests=[], unexpected=[];
page.on("pageerror",error=>errors.push(error.message));
let nextPageFails=true, actorId="fixture", winner=null;
const detail = id => ({id,name:`Set ${id}`,createdAt:Date.now(),updatedAt:Date.now(),winnerJobId:winner,runs:[{id:`run_${id}`,status:"completed",createdAt:Date.now(),sourcePrompt:`Historical prompt ${id}`,configurationSnapshot:{aspectRatio:"16:9",imageResolution:"2K"},slots:Array.from({length:id==="active"||id==="history_1"?2:id==="history_2"?3:4},(_,i)=>({id:`slot_${i}`,jobId:`${id}_job_${i}`,provider:"fixture",model:`image-${i}`,providerDisplayName:"Fixture",modelDisplayName:`Image ${i+1}`,status:"completed",actualCredit:2,result:{imageUrl:`/outputs/${id}_${i}.png`,width:id!=="history_0"&&i===1?900:1600,height:id!=="history_0"&&i===1?1600:900,generationDuration:12+i,mimeType:"image/png"}}))}]});
const summaries=Array.from({length:10},(_,i)=>({id:`history_${i}`,name:`History ${i+1}`,createdAt:Date.now()-i*1000,updatedAt:Date.now(),status:"completed",completedCount:4,slotCount:4,models:["Model A","Model B"],previewImages:Array.from({length:4},(_,n)=>({jobId:`history_${i}_job_${n}`,thumbnailUrl:`/outputs/thumb_${i}_${n}.png`}))}));
try {
  await page.addInitScript(()=>{
    localStorage.setItem("mpf.next.language","en");
    const feature="fe24-comparison-intent";
    localStorage.setItem(`mpf.react.draft:development_bypass:${feature}:fixture`,JSON.stringify({actorId:"fixture",authMode:"development_bypass",feature,schemaVersion:1,payload:{requestId:"request_active",fingerprint:"fixture",setId:"active",runId:"run_active",status:"accepted"}}));
  });
  await page.route("**/outputs/**",route=>route.fulfill({contentType:"image/png",body:/history_[12]_1\.png$/.test(route.request().url())?portrait:png}));
  await page.route("**/api/**",async route=>{
    const request=route.request(),url=new URL(request.url()),path=url.pathname;
    if(!path.startsWith("/api/"))return route.continue();
    const json=value=>route.fulfill({contentType:"application/json",body:JSON.stringify(value)});
    if(path==="/api/auth/config")return json({contractVersion:1,authMode:"development_bypass",methods:{password:false,emailOtp:false,google:false,facebook:false},csrfToken:"fixture",policy:{otpDigits:6,otpExpiresSeconds:300,resendSeconds:30,passwordMinLength:8,passwordMaxLength:128},legal:{termsVersion:null,privacyVersion:null}});
    if(path==="/api/me")return json({userId:actorId,username:actorId,displayName:actorId,role:"admin",authMode:"development_bypass",accountStatus:"active"});
    if(path==="/api/me/preferences")return json({confirmCreditUsage:false});
    if(path==="/api/providers")return json({defaultProvider:"fixture",providers:[{id:"fixture",displayName:"Fixture",defaultModel:"image-a",models:[{id:"image-a",displayName:"Image A",capabilities:{imageGeneration:true,imageReferences:true,maxReferenceImages:6,aspectRatios:["1:1","16:9"],resolutions:["2K"]}}]}]});
    if(path==="/api/comparisons/policy")return json({minimumSlots:2,maximumSlots:4});
    if(path==="/api/comparisons/estimate")return json({slots:request.postDataJSON().slots.map(slot=>({...slot,estimateId:slot.id,estimatedCredit:2,estimateExpiresAt:Date.now()+60000})),estimatedTotalCredit:4,providerConfigVersion:1,expiresAt:Date.now()+60000,estimateToken:"fixture"});
    if(path==="/api/comparisons"){
      listRequests.push({limit:url.searchParams.get("limit"),cursor:url.searchParams.get("cursor")});
      if(url.searchParams.get("cursor")&&nextPageFails){nextPageFails=false;return route.fulfill({status:503,contentType:"application/json",body:JSON.stringify({error:"fixture temporarily unavailable"})});}
      const start=url.searchParams.has("cursor")?5:0;
      return json({items:summaries.slice(start,start+Number(url.searchParams.get("limit"))),hasMore:start===0,nextCursor:start===0?"page2":null});
    }
    if(path.startsWith("/api/comparisons/")){const id=path.split("/")[3];if(path.endsWith("/winner"))winner=request.postDataJSON().jobId;return json(detail(id));}
    if(path==="/api/media/exports"){
      const input=request.postDataJSON();exportRequests.push(input);
      return route.fulfill({contentType:"image/png",headers:{"X-Momelo-Export":JSON.stringify({width:1600,height:900,count:input.outputIds.length,mimeType:"image/png",presetId:`landscape-${input.outputIds.length}`,layoutVersion:"comparison-black-v1",filename:`momelo-comparison-${input.outputIds.length}-landscape-${input.outputIds.length}-20261120-120000.png`,warnings:[]})},body:png});
    }
    unexpected.push(`${request.method()} ${path}`);return route.abort();
  });
  await page.goto("http://127.0.0.1:6502/comparison");
  await page.locator(".comparison-history-card").nth(4).waitFor();
  assert.equal(listRequests[0].limit,"5");assert.equal(await page.locator(".comparison-history-card").count(),5);
  await page.locator('.comparison-history-mosaic img').first().waitFor();
  assert.equal(await page.locator('.comparison-history-mosaic img').first().evaluate(node=>getComputedStyle(node).objectFit),'cover');
  assert.equal(await page.locator('a[href*="6500/comparisons"], .header-actions a').count(),0);
  await page.locator("#prompt").fill("Keep my current draft");
  await page.locator("main .comparison-result").nth(1).waitFor();
  await page.locator(".comparison-history-more").scrollIntoViewIfNeeded();
  await page.locator(".comparison-history").getByRole("button",{name:"Try again",exact:true}).click();
  await page.locator(".comparison-history-card").nth(9).waitFor();assert.equal(await page.locator(".comparison-history-card").count(),10);assert.ok(listRequests.every(item=>item.limit==="5"));
  const card=page.locator(".comparison-history-card").first();await card.click();
  const modal=page.locator(".comparison-history-dialog");await modal.locator(".comparison-image").nth(3).waitFor();assert.equal(await modal.locator(".comparison-image").count(),4);
  assert.equal(await page.locator("main .comparison-image").count(),2);
  await modal.getByText("Submitted prompt and settings",{exact:true}).click();await modal.getByText("Historical prompt history_0",{exact:true}).waitFor();
  assert.equal(await modal.locator('.generation-result-metadata__item[aria-label="Generation time: 12s"]').count(),1);
  assert.ok((await modal.innerText()).includes("16:9"));
  await modal.getByText("Submitted prompt and settings",{exact:true}).click();
  assert.ok((await modal.locator('.comparison-submitted-details').boundingBox()).y > (await modal.locator('.comparison-result-grid').boundingBox()).y);
  await modal.getByRole('button',{name:'Detail Compare',exact:true}).click();
  const detailViewer=page.locator('.detail-compare-dialog');
  await detailViewer.locator('img').nth(3).waitFor();
  for(const width of [1440,820,390]) {
    await page.setViewportSize({width,height:900});
    await page.waitForTimeout(150);
    assert.equal(await detailViewer.locator('.detail-compare-pane').count(),4);
    for(const pane of await detailViewer.locator('.detail-compare-pane').all()) {
      const bounds=await pane.boundingBox();assert.ok(bounds.x>=0&&bounds.y>=0&&bounds.x+bounds.width<=width+1&&bounds.y+bounds.height<=901);
    }
    await detailViewer.getByRole('button',{name:'Zoom in',exact:true}).click();
    await detailViewer.getByRole('button',{name:'Zoom in',exact:true}).click();
    const surfaces=detailViewer.locator('.detail-compare-surface');
    await surfaces.first().focus();await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(100);
    const positions=await surfaces.evaluateAll(nodes=>nodes.map(n=>(n.scrollLeft+n.clientWidth/2)/n.firstElementChild.clientWidth));
    assert.ok(positions.every(p=>Math.abs(p-positions[0])<0.02),'shared focal point');
    await detailViewer.getByRole('button',{name:'Fit / Reset',exact:true}).click();
    assert.equal(await detailViewer.locator('output').innerText(),'100%');
    await page.screenshot({path:`_temp/fe24-history/detail-${width}.png`});
  }
  await detailViewer.getByRole('button',{name:'Close',exact:true}).click();
  assert.ok(await modal.isVisible());await page.setViewportSize({width:1440,height:1000});
  await modal.getByRole("button",{name:"Download comparison",exact:true}).click();
  const exporter=page.locator(".comparison-export-dialog");await exporter.getByRole("button",{name:"Download image",exact:true}).waitFor();
  await page.waitForFunction(()=>!document.querySelector('.comparison-export-dialog footer button:last-child')?.disabled);
  assert.ok((await exporter.innerText()).includes("Selected images: 4 / 4"));assert.equal(exportRequests.at(-1).setId,"history_0");assert.equal(exportRequests.at(-1).outputIds.length,4);
  await exporter.getByRole("checkbox").last().uncheck();await page.waitForFunction(()=>!document.querySelector('.comparison-export-dialog footer button:last-child')?.disabled);assert.equal(exportRequests.at(-1).outputIds.length,3);
  await exporter.locator(".comparison-export-options select").first().selectOption("stacked");await page.waitForFunction(()=>!document.querySelector('.comparison-export-dialog footer button:last-child')?.disabled);assert.equal(exportRequests.at(-1).layout,"stacked");
  const download=page.waitForEvent("download");await exporter.getByRole("button",{name:"Download image",exact:true}).click();assert.match((await download).suggestedFilename(),/^momelo-comparison-3/);
  await exporter.getByRole("button",{name:"Close",exact:true}).click();assert.ok(await modal.isVisible());
  await modal.locator(".comparison-image").first().click();await page.locator(".expanded-viewer").waitFor();await page.keyboard.press("Escape");assert.ok(await modal.isVisible());
  for(const width of [1440,820,390]){
    await modal.getByRole("button",{name:"Close history details",exact:true}).click();
    await page.setViewportSize({width,height:1000});
    if(width===390)await page.locator(".mobile-tabs button").nth(1).click();
    for(const lang of ["en","th"]){
      await page.locator(".header-actions select").selectOption(lang);await card.click();await modal.locator(".comparison-image").nth(3).waitFor();
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      assert.ok(await modal.evaluate(node=>node.scrollWidth<=node.clientWidth));
      const strip=modal.locator('.comparison-result-grid');
      const cardsInModal=modal.locator('.comparison-result');
      const firstBounds=await cardsInModal.first().boundingBox(), lastBounds=await cardsInModal.last().boundingBox();
      assert.ok(Math.abs(firstBounds.y-lastBounds.y)<2,'all images share one row');
      const imageBounds=await modal.locator('.comparison-image').first().boundingBox();
      assert.ok(imageBounds.width>=Math.min(500,width-60),'large image width');
      assert.ok(Math.abs(imageBounds.width/imageBounds.height-1600/900)<0.02,'landscape image frame follows source ratio');
      assert.ok(firstBounds.width>=Math.min(300,width-28),'large comparison columns');
      await strip.evaluate(node=>node.scrollLeft=node.scrollWidth);
      assert.ok(await strip.evaluate(node=>node.scrollLeft>0),'every image reachable by scrolling');
      await strip.evaluate(node=>node.scrollLeft=0);
      await modal.locator('.history-view-options summary').click();
      await modal.locator('.comparison-history-layout select').selectOption('stacked');
      assert.ok((await cardsInModal.nth(1).boundingBox()).y>(await cardsInModal.first().boundingBox()).y,'stacked layout');
      await modal.locator('.comparison-history-layout select').selectOption('side_by_side');
      await modal.locator('.history-view-options summary').click();
      await page.screenshot({path:`_temp/fe24-history/modal-${width}-${lang}.png`});
      await modal.locator(".comparison-export-action").click();await exporter.waitFor();await page.waitForFunction(()=>!document.querySelector('.comparison-export-dialog footer button:last-child')?.disabled);
      assert.ok(await exporter.evaluate(node=>node.scrollWidth<=node.clientWidth));await page.screenshot({path:`_temp/fe24-history/export-${width}-${lang}.png`,fullPage:true});await exporter.locator("header button").click();
      await modal.locator("header button").first().click();await page.waitForFunction(()=>document.activeElement===document.querySelector(".comparison-history-card"));
    }
    await page.locator(".header-actions select").selectOption("en");await card.click();
  }
  await modal.locator("header button").first().click();await page.setViewportSize({width:1440,height:1000});await card.click();
  await page.evaluate(()=>document.documentElement.style.zoom="2");assert.ok(await modal.evaluate(node=>node.scrollWidth<=node.clientWidth));await page.screenshot({path:"_temp/fe24-history/modal-200percent.png",fullPage:true});await page.evaluate(()=>document.documentElement.style.zoom="1");
  await modal.locator("header button").first().click();assert.equal(await page.locator("#prompt").inputValue(),"Keep my current draft");assert.equal(await page.locator("main .comparison-image").count(),2);
  for(const [index,count] of [[1,2],[2,3]]) {
    await page.locator('.comparison-history-card').nth(index).click();
    await modal.getByRole('button',{name:'Detail Compare',exact:true}).click();
    await detailViewer.locator('img').nth(count-1).waitFor();
    for(const width of [390,820,1440]) {
      await page.setViewportSize({width,height:900});await page.waitForTimeout(100);
      for(const pane of await detailViewer.locator('.detail-compare-pane').all()) {
        const bounds=await pane.boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=width+1&&bounds.y+bounds.height<=901);
      }
    }
    await detailViewer.getByRole('button',{name:'Zoom in',exact:true}).click();
    const target=detailViewer.locator('.detail-compare-surface').first();const b=await target.boundingBox();
    await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2-40,b.y+b.height/2-30,{steps:4});await page.mouse.up();
    assert.notEqual(await detailViewer.locator('output').innerText(),'100%');
    await detailViewer.getByRole('button',{name:'Close',exact:true}).click();await modal.locator('header button').first().click();
  }
  await card.click();await modal.getByRole('button',{name:'Detail Compare',exact:true}).click();actorId="other";await page.evaluate(()=>window.dispatchEvent(new Event("mpf:identity-invalidated")));await modal.waitFor({state:"hidden"});assert.equal(await detailViewer.count(),0);
  assert.deepEqual(errors,[]);assert.deepEqual(unexpected,[]);
  console.log("PASS: five-set cursor/lazy/retry; thumbnails; modal four-slot metadata; legacy export selection/layout/download; active draft/result preservation; focus/TH-EN/390-820-1440/200%; identity cleanup. No paid calls.");
}catch(error){await page.screenshot({path:"_temp/fe24-history/failure.png",fullPage:true});console.error({errors,unexpected,listRequests});console.error(await page.locator("body").innerText());throw error;}finally{await browser.close();}

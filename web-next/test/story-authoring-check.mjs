// Exercise the new React workspace against production Cinematic routes and a disposable repository.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import express from "express";
import { chromium } from "playwright";
import { createServer } from "vite";
import { CinematicApplicationService } from "../../server/domain/cinematic/CinematicApplicationService.js";
import { CinematicProjectRepository } from "../../server/repositories/cinematic/CinematicProjectRepository.js";
import { registerCinematicRoutes } from "../../server/app/routes/cinematicRoutes.js";

const actor = {userId:"story-fixture", username:"story-fixture", displayName:"Story fixture",
  role:"admin", accountStatus:"active", authMode:"development_bypass"};
const script = "แขกเข้ามาถึงโรงเตี๊ยม เจ้าของร้านถามชื่อก่อนเชิญนั่ง\nAt sunrise the traveller finds a sealed letter by the door.";
const dialogue = "หญิงเจ้าของร้าน: จดหมายฉบับนี้เดินทางมาไกลนัก เก็บมันไว้ให้ดีนะ\nTraveller: I shall protect it.";
const directory = await fs.mkdtemp(path.join(os.tmpdir(),"mpf-story-authoring-"));
const projects = new CinematicProjectRepository({projectsFile:path.join(directory,"projects.json")});
const writingRequests = [];
const proposedScenes = ["Inn at twilight","Letter at sunrise"];
const proposedShot = "Breaking the seal";
const service = new CinematicApplicationService({
  repository:projects, videoGenerationService:{},
  fullStoryService:{
    async propose(input) {
      assert.equal(input.revisionInstruction,"A traveller returns to the inn.");
      writingRequests.push("manuscript");
      return {proposalId:"fixture-prose",fullStory:"A traveller returns at midnight.",characters:[],warnings:[],
        provenance:{provider:"fixture",model:"fixture",responseId:null},billingStatus:"free"};
    },
    async proposeScenes() {
      writingRequests.push("scenes");
      return {scenes:proposedScenes.map(title=>({title,synopsis:"The guests gather.",purpose:"dialogue",targetDurationSeconds:15}))};
    },
    async proposeShots() {
      writingRequests.push("shots");
      return {shots:[{title:proposedShot,durationMs:4500,shotDocument:dialogue}]};
    },
  }
});
// Expose only fixture-backed read and authoring actions. Any attempted media generation fails locally.
const permitted = ["listProjects","createProject","getProject","getSeriesWorkspace","getAuthoringManifest",
  "proposeFullStory","updateWritingSettings","updateSeriesChapter","saveFullStoryRevision","confirmFullStoryRevision","createManualScene","updateSceneOutline","createManualShot","updateShotDocument",
  "applySceneProposal","discardSceneProposal","applyShotProposal","discardShotProposal"];
const facade = Object.fromEntries(permitted.map(key=>[key,service[key].bind(service)]));
facade.quoteWriting = async (_project,{operation})=>({id:null,operation,credits:0,expiresAt:null,billingStatus:"free"});
facade.executeWriting = async (id,{operation,sceneId,input},owner)=>{
  if (operation==="scenes") return service.proposeScenes(id,input,owner);
  if (operation==="shots") return service.proposeShots(id,sceneId,input,owner);
  throw new Error("Unexpected fixture writing operation "+operation);
};
const app = express();
const failures = [];
let expectShotConflict=false;
let seriesReads=0;
app.use(express.json(),(req,res,next)=>{
  req.actorContext=actor;
  if(req.method==="GET" && req.path.endsWith("/series")) seriesReads++;
  res.on("finish",()=>{
    const expected=expectShotConflict && req.method==="PATCH" && req.path.endsWith("/document") && res.statusCode===409;
    if (!expected && req.path.startsWith("/api/") && res.statusCode>=400) failures.push(req.method+" "+req.path+" "+res.statusCode);
  });
  next();
});
app.get("/api/auth/config",(_req,res)=>res.json({contractVersion:1,authMode:actor.authMode,
  development:{liveGeneration:true},methods:{password:false,emailOtp:false,google:false,facebook:false},csrfToken:"fixture",
  policy:{otpDigits:6,otpExpiresSeconds:300,resendSeconds:30,passwordMinLength:8,passwordMaxLength:128},legal:{termsVersion:null,privacyVersion:null}}));
app.get("/api/me",(_req,res)=>res.json(actor));
app.get("/api/web-next/config",(_req,res)=>res.json({creditsEnabled:false}));
registerCinematicRoutes(app,{cinematicService:facade});
app.use("/api",(_req,res)=>res.status(404).json({error:"Offline fixture endpoint"}));
const vite=await createServer({root:"web-next",cacheDir:path.join(directory,"vite-cache"),configFile:false,
  server:{middlewareMode:true,hmr:false,fs:{allow:[process.cwd()]}}, logLevel:"warn"});
app.use(vite.middlewares);
const server=await new Promise(resolve=>{const s=app.listen(0,"127.0.0.1",()=>resolve(s));});
const origin="http://127.0.0.1:"+server.address().port;
let browser;
let page;
try {
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:900}});
  await context.route(/^https?:\/\//,route=>new URL(route.request().url()).origin===origin ? route.continue() : route.abort());
  page=await context.newPage();
  await page.addInitScript(()=>{if(!localStorage.getItem("mpf.next.language")) localStorage.setItem("mpf.next.language","en");});
  page.setDefaultTimeout(10000);
  page.on("pageerror",e=>failures.push(e.message));
  const button=name=>page.getByRole("button",{name,exact:true});
  await page.goto(origin+"/story");
  await page.locator(".story-workspace h1").waitFor();
  const editorLoaded=()=>page.evaluate(()=>performance.getEntriesByType("resource").some(entry=>new URL(entry.name).pathname.endsWith("/StoryEditor.tsx")));
  assert.equal(await editorLoaded(),false,"the library does not load the editor");
  await page.locator(".story-bar button.primary").click();
  const dialog=page.getByRole("dialog");
  for (const width of [390,820,1440]) {
    await page.setViewportSize({width,height:900});
    const fits=await dialog.evaluate(el=>{
      const bounds=el.getBoundingClientRect();
      return bounds.left>=0 && bounds.right<=innerWidth && el.scrollWidth<=el.clientWidth+1;
    });
    assert.ok(fits,"create dialog fits at "+width);
  }
  await dialog.locator("input").fill("Letters from the inn");
  await dialog.getByRole("button").last().click();
  await page.waitForURL(/\/story\/[^/?#]+$/);
  const projectUrl=page.url();
  const projectId=new URL(projectUrl).pathname.split("/").at(-1);
  const persisted=()=>projects.findForActor(projectId,actor);
  assert.equal((await persisted()).title,"Letters from the inn");
  assert.equal(writingRequests.length,0,"creating a project is manual");
  const openSettings=()=>page.getByRole("button",{name:/Writing AI/}).click();
  await openSettings();
  assert.equal(await editorLoaded(),true,"opening a project loads the editor");
  await dialog.getByRole("combobox").selectOption("gpt-6.2-sol");
  await dialog.getByRole("checkbox").first().check();
  for(const width of [390,820,1440]) {
    await page.setViewportSize({width,height:900});
    assert.ok(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth+1 && el.getBoundingClientRect().right<=innerWidth));
  }
  await dialog.getByRole("button",{name:"Save settings"}).click();
  await dialog.waitFor({state:"hidden"});
  assert.deepEqual((await persisted()).writingSettings,{modelId:"gpt-6.2-sol",skillIds:["story-structure"]});
  await page.reload();
  await openSettings();
  assert.equal(await dialog.getByRole("combobox").inputValue(),"gpt-6.2-sol");
  assert.equal(await dialog.getByRole("checkbox").first().isChecked(),true);
  await dialog.getByRole("button",{name:"Cancel"}).click();
  const prose=page.locator(".story-script textarea");
  const stages=page.locator(".story-stage-nav");
  assert.match(await stages.locator("[aria-current=step]").innerText(),/Script/);
  assert.equal(await stages.getByRole("button",{name:/Shots/}).isDisabled(),true);
  const destination=page.locator(".story-script [aria-pressed]");
  const importFile=page.locator(".story-script input[type=file]");
  const content=Buffer.from(script);
  const beforeDraft=seriesReads;
  await button("Draft with AI").click();
  await dialog.getByRole("textbox").fill("A traveller returns to the inn.");
  await dialog.getByRole("button",{name:"Generate draft"}).click();
  await page.waitForFunction(()=>document.querySelector(".story-script textarea")?.value==="A traveller returns at midnight.");
  assert.equal((await persisted()).chapterStory,"","AI prose stays editable until saved");
  await page.locator("fieldset.story-layout:not([disabled])").waitFor();
  assert.equal(seriesReads-beforeDraft,0,"an unsaved AI draft does not refetch the chapter list");
  await importFile.setInputFiles({name:"chapter.md",mimeType:"text/markdown",buffer:content});
  await page.waitForFunction(expected=>document.querySelector(".story-script textarea")?.value===expected,script);
  await importFile.setInputFiles({name:"invalid.png",mimeType:"image/png",buffer:content});
  await page.locator(".story-script [role=alert]").waitFor();
  assert.equal(await prose.inputValue(),script,"bad import keeps current script");
  await destination.last().click();
  assert.equal(await stages.getByRole("button",{name:/Chapter plan/}).isDisabled(),true);
  assert.equal(await prose.inputValue(),script,"changing to full-story destination preserves prose");
  await destination.first().click();
  assert.equal(await prose.inputValue(),script,"returning to chapter preserves prose");
  const savedChapter=page.waitForResponse(r=>r.request().method()==="PATCH" && r.url().endsWith("/chapter"));
  const beforeSave=seriesReads;
  await page.locator(".story-script textarea + .story-actions button").first().click();
  assert.ok((await savedChapter).ok());
  await page.locator("fieldset.story-layout:not([disabled])").waitFor();
  assert.equal(seriesReads-beforeSave,0,"saving uses the chapter list returned by the mutation");
  await page.reload();
  await page.waitForFunction(expected=>document.querySelector(".story-script textarea")?.value===expected,script);
  assert.equal((await persisted()).chapterStory,script);
  assert.equal((await persisted()).fullStoryVersions.length,0,"episode-only input stays in its chapter");

  // Cancelling an overwrite leaves the saved chapter alone and preserves the unsaved edit.
  await prose.fill(script+" (draft)");
  await page.locator(".story-script textarea + .story-actions button").first().click();
  await dialog.waitFor();
  await dialog.getByRole("button",{name:"Cancel",exact:true}).click();
  assert.equal((await persisted()).chapterStory,script);
  assert.equal(await prose.inputValue(),script+" (draft)");
  const revisedScript=script+" (revised)";
  await prose.fill(revisedScript);
  const scenesRequest=page.locator(".story-script textarea + .story-actions button").last();
  await scenesRequest.click();
  await dialog.getByRole("button",{name:"Save and propose scenes"}).click();
  await dialog.getByText(proposedScenes[1],{exact:false}).first().waitFor();
  assert.equal((await persisted()).chapterStory,revisedScript,"scene proposal uses the just-saved chapter");
  assert.equal((await persisted()).scenes.length,0,"proposals do not write the saved scene list");
  await dialog.getByRole("button",{name:"View source"}).click();
  assert.equal(await dialog.locator(".story-source p").innerText(),revisedScript);
  await dialog.getByRole("button",{name:"Show proposal"}).click();
  await dialog.getByRole("button",{name:"Discard proposal"}).click();
  await dialog.waitFor({state:"hidden"});
  assert.equal((await persisted()).scenes.length,0);
  await scenesRequest.click();
  await dialog.getByText(proposedScenes[1],{exact:false}).first().waitFor();
  const acceptSet=()=>dialog.getByRole("button",{name:/^(use|apply|accept) /i}).click();
  await acceptSet();
  const secondScene=page.locator(".story-index button").filter({hasText:proposedScenes[1]});
  await secondScene.waitFor();
  assert.match(await stages.locator("[aria-current=step]").innerText(),/Scenes/);
  await secondScene.focus();
  await page.keyboard.press("Enter");
  await page.locator(".story-reader h2").filter({hasText:proposedScenes[1]}).waitFor();
  assert.match(await stages.locator("[aria-current=step]").innerText(),/Shots/);
  const firstSaved=structuredClone((await persisted()).scenes[0]);
  const sceneActions=page.locator(".story-reader article > .story-actions");
  await sceneActions.locator("button.primary").click();
  await dialog.getByText(proposedShot,{exact:false}).first().waitFor();
  assert.equal(writingRequests.filter(r=>r==="shots").length,1);
  await page.keyboard.press("Escape");
  await page.reload();
  await sceneActions.locator("button.primary").click();
  await dialog.getByText(proposedShot,{exact:false}).first().waitFor();
  assert.equal(writingRequests.filter(r=>r==="shots").length,1,"reviewing a saved proposal does not submit again");
  await acceptSet();
  const shotRow=page.locator(".story-shots button").filter({hasText:proposedShot});
  await shotRow.focus();
  await page.keyboard.press("Enter");
  const shotText=dialog.locator("fieldset > label textarea");
  const revised=dialogue+"\nแขกถือจดหมายออกเดินทาง";
  await shotText.fill(revised);
  await dialog.locator("fieldset > footer button").first().click();
  const leave=page.getByRole("dialog").last();
  await leave.getByRole("button",{name:/keep editing|continue editing/i}).click();
  assert.equal(await shotText.inputValue(),revised,"continue editing keeps the unsaved dialogue");
  await dialog.locator("fieldset > footer button.primary").click();
  await dialog.waitFor({state:"hidden"});
  await page.reload();
  await shotRow.waitFor();
  assert.deepEqual((await persisted()).scenes[0],firstSaved,"editing scene two leaves scene one unchanged");
  assert.equal((await persisted()).scenes[1].shots[0].shotDocument,revised);
  assert.equal((await persisted()).scenes[1].shots[0].durationMs,4500);

  for(const width of [390,820,1440]) {
    await page.setViewportSize({width,height:width===390?844:900});
    for(const language of ["th","en"]) {
      await page.locator(".header-actions select").selectOption(language);
      assert.ok(await stages.locator("[aria-current=step]").isVisible());
      await shotRow.focus();
      await page.keyboard.press("Enter");
      await dialog.waitFor();
      assert.equal(await shotText.inputValue(),revised);
      assert.equal(await dialog.getAttribute("aria-label"),language==="en"?"Edit shot":"แก้ช็อต");
      assert.ok(await page.evaluate(()=>{
        const d=document.querySelector("dialog[open]"), box=d?.getBoundingClientRect();
        return document.documentElement.scrollWidth<=innerWidth+1 && box && box.left>=-1 &&
          box.right<=innerWidth+1 && d.scrollWidth<=d.clientWidth+1;
      }),"shot and actions fit at "+width+" / "+language);
      await page.keyboard.press("Escape");
      await dialog.waitFor({state:"hidden"});
      assert.ok(await shotRow.evaluate(el=>el===document.activeElement),"returns focus to the originating shot");
    }
  }
  // Two editors can read the same revision. The later save must not overwrite the first.
  const other=await context.newPage();
  await other.goto(page.url());
  await other.locator(".story-shots button").filter({hasText:proposedShot}).click();
  const otherEditor=other.getByRole("dialog");
  await shotRow.click();
  await otherEditor.locator("fieldset > label textarea").fill(revised+"\nSecond tab draft");
  await shotText.fill(revised+"\nFirst tab saved");
  await dialog.locator("fieldset > footer button.primary").click();
  await dialog.waitFor({state:"hidden"});
  expectShotConflict=true;
  const conflict=other.waitForResponse(r=>r.request().method()==="PATCH" && r.url().endsWith("/document"));
  await otherEditor.locator("fieldset > footer button.primary").click();
  assert.equal((await conflict).status(),409);
  expectShotConflict=false;
  assert.equal(await otherEditor.locator("fieldset > label textarea").inputValue(),revised+"\nSecond tab draft");
  assert.equal((await persisted()).scenes[1].shots[0].shotDocument,revised+"\nFirst tab saved");
  await other.close();
  // Manual creation remains available for scenes and shots even after accepting AI suggestions.
  await page.locator(".story-index > button").last().click();
  await page.locator(".story-reader h2").filter({hasText:/3/}).waitFor();
  await sceneActions.getByRole("button").last().click();
  await dialog.waitFor();
  assert.equal((await persisted()).scenes.length,3);
  assert.equal((await persisted()).scenes[2].shots.length,1);
  await page.keyboard.press("Escape");
  await stages.getByRole("button",{name:/Script/}).click();
  await destination.last().click();
  await prose.fill("A full story about the travelling letter.");
  await page.locator(".story-script textarea + .story-actions button").first().click();
  await stages.getByRole("button",{name:/Chapter plan/}).click();
  await page.locator(".story-panel h2").waitFor();
  assert.match(await stages.locator("[aria-current=step]").innerText(),/Chapter plan/);
  await stages.getByRole("button",{name:/Script/}).click();
  assert.equal(await prose.inputValue(),"A full story about the travelling letter.");
  assert.deepEqual(writingRequests,["manuscript","scenes","scenes","shots"]);
  await page.getByRole("link",{name:/projects/i}).click();
  await page.locator(".story-projects a").filter({hasText:"Letters from the inn"}).waitFor();
  assert.deepEqual(failures,[]);
  console.log("Story & Shots: saved chapter, proposals, manual scene/shot, edit recovery, refresh and six viewport/locale combinations passed.");
} catch(error) {
  if (failures.length) console.error("API / browser failures", failures);
  if(page && !page.isClosed()) console.error((await page.locator("body").innerText()).slice(0,3000));
  throw error;
} finally {
  await browser?.close();
  await vite.close();
  await new Promise(resolve=>server.close(resolve));
  await fs.rm(directory,{recursive:true,force:true});
}

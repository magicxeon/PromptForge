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
import { ReferenceAssetService } from "../../server/domain/assets/ReferenceAssetService.js";
import { CinematicStoryboardAssetService } from "../../server/domain/assets/CinematicStoryboardAssetService.js";

const actor = {userId:"story-fixture", username:"story-fixture", displayName:"Story fixture",
  role:"admin", accountStatus:"active", authMode:"development_bypass"};
const script = "แขกเข้ามาถึงโรงเตี๊ยม เจ้าของร้านถามชื่อก่อนเชิญนั่ง\nAt sunrise the traveller finds a sealed letter by the door.";
const dialogue = "หญิงเจ้าของร้าน: จดหมายฉบับนี้เดินทางมาไกลนัก เก็บมันไว้ให้ดีนะ\nTraveller: I shall protect it.";
const directory = await fs.mkdtemp(path.join(os.tmpdir(),"mpf-story-authoring-"));
const projects = new CinematicProjectRepository({projectsFile:path.join(directory,"projects.json")});
const assets = new Map();
const assetRepository = {
  async create(input, owner) {
    const asset = {...input, id: crypto.randomUUID(), createdAt:new Date().toISOString(), status:"active", ownerUserId:owner.userId};
    assets.set(asset.id, asset);
    return asset;
  },
  async findByIdForOwner(id, owner) {
    const asset = assets.get(id);
    return asset?.ownerUserId === owner ? asset : null;
  },
  async findBySourceJobIdForOwner(jobId, owner, type) {
    return [...assets.values()].find(asset => asset.sourceJobId === jobId && asset.ownerUserId === owner && asset.assetType === type);
  },
};
const references = new ReferenceAssetService({repository: assetRepository, outputsDirectory: directory});
const writingRequests = [];
const proposedScenes = ["Inn at twilight","Letter at sunrise"];
const proposedShot = "Breaking the seal";
let releaseDraft;
const draftGate = new Promise(resolve => {releaseDraft=resolve;});
const service = new CinematicApplicationService({
  repository:projects, videoGenerationService:{}, assetRepository,
  storyboardAssetService:new CinematicStoryboardAssetService({assetRepository,outputsDirectory:directory,
    generationHistory:{getById: async id => id === "still-fixture" ? {username:actor.username,imageUrl:"/outputs/test-set.png"} : null}}),
  fullStoryService:{
    async propose(input) {
      assert.equal(input.revisionInstruction,"A traveller returns to the inn.");
      writingRequests.push("manuscript");
      await draftGate;
      return {proposalId:"fixture-prose",fullStory:"A traveller returns at midnight.",characters:[],warnings:[],
        provenance:{provider:"fixture",model:"fixture",responseId:null},billingStatus:"free"};
    },
    async proposeScenes() {
      writingRequests.push("scenes");
      return {scenes:proposedScenes.map(title=>({title,synopsis:"The guests gather.",purpose:"dialogue",targetDurationSeconds:15}))};
    },
    async proposeCharacters({sources,existingCharacters}) {
      assert.ok(sources.some(source=>source.kind==="full_story" && source.text.includes("travelling letter")));
      assert.ok(sources.some(source=>source.kind==="chapter"));
      const lalin = existingCharacters.find(character=>character.displayName==="Lalin");
      return {proposalId:"fixture-cast",fullStory:sources[0].text,warnings:[],billingStatus:"free",
        provenance:{provider:"fixture",model:"fixture",responseId:null}, characters:[{
          existingCharacterId:lalin.id,displayName:lalin.displayName,storyRole:lalin.storyRole,
          storyImportance:lalin.storyImportance,objective:"",motivation:"",pressure:"",
          personalityTraits:["Observant"],emotionalBaseline:"",dialogueStyle:"",performanceDirection:"",
          appearance:"Dark hair",aliases:[],wardrobe:"",development:"",mentionedOnly:false,evidence:[]
        }]};
    },
    async proposeShots() {
      writingRequests.push("shots");
      return {shots:[{title:proposedShot,durationMs:4500,shotDocument:dialogue,
        summary:{en:"The innkeeper gives the traveller a letter.",th:"เจ้าของโรงเตี๊ยมส่งจดหมายให้ผู้เดินทาง"}}]};
    },
    async translateStoryPrompt(text, _cues, settings) {
      assert.equal(settings.direction.spokenLanguage,"English");
      assert.equal(settings.direction.country,"thailand");
      return {text:text.replaceAll("จดหมายฉบับนี้เดินทางมาไกลนัก เก็บมันไว้ให้ดีนะ","This letter has travelled far. Keep it safe."),
        provenance:{provider:"fixture",model:settings.modelId}};
    },
    async refineStoryPrompt(draft,source,settings,context) {
      assert.ok(source.length && draft.length);
      assert.ok(context.selectedTiming.length);
      return {text:draft,reviewNotes:[],provenance:{provider:"fixture",model:settings.modelId}};
    },
  }
});
// Expose only fixture-backed read and authoring actions. Any attempted media generation fails locally.
const permitted = ["listProjects","createProject","getProject","getSeriesWorkspace","getAuthoringManifest",
  "proposeFullStory","updateWritingSettings","updateSeriesChapter","saveFullStoryRevision","confirmFullStoryRevision","createManualScene","updateSceneOutline","createManualShot","updateShotDocument",
  "applySceneProposal","discardSceneProposal","applyShotProposal","discardShotProposal","upsertSharedCharacterDossier",
  "prepareShotWriter","storyPromptStatus","setChapterCharacters","getSceneEnvironmentContext","approveSceneEnvironment","approveStoryboardSource"];
const facade = Object.fromEntries(permitted.map(key=>[key,service[key].bind(service)]));
facade.quoteWriting = async (_project,{operation})=>({id:null,operation,credits:0,expiresAt:null,billingStatus:"free"});
facade.executeWriting = async (id,{operation,sceneId,input},owner)=>{
  if (operation==="scenes") return service.proposeScenes(id,input,owner);
  if (operation==="shots") return service.proposeShots(id,sceneId,input,owner);
  if (operation==="characters") return service.proposeFullStory(id,input,owner);
  throw new Error("Unexpected fixture writing operation "+operation);
};
const app = express();
const failures = [];
let expectShotConflict=false;
let expectMergedConflict=false;
let seriesReads=0;
app.use(express.json(),(req,res,next)=>{
  req.actorContext=actor;
  if(req.method==="GET" && req.path.endsWith("/series")) seriesReads++;
  res.on("finish",()=>{
    const expected=req.method==="PATCH" && res.statusCode===409 && (expectShotConflict && req.path.endsWith("/document")
      || expectMergedConflict && /\/scenes\/[^/]+$/.test(req.path));
    if (!expected && req.path.startsWith("/api/") && res.statusCode>=400) failures.push(req.method+" "+req.path+" "+res.statusCode);
  });
  next();
});
app.get("/api/auth/config",(_req,res)=>res.json({contractVersion:1,authMode:actor.authMode,
  development:{liveGeneration:true},methods:{password:false,emailOtp:false,google:false,facebook:false},csrfToken:"fixture",
  policy:{otpDigits:6,otpExpiresSeconds:300,resendSeconds:30,passwordMinLength:8,passwordMaxLength:128},legal:{termsVersion:null,privacyVersion:null}}));
app.get("/api/me",(_req,res)=>res.json(actor));
app.get("/api/web-next/config",(_req,res)=>res.json({creditsEnabled:false}));
app.get("/api/providers",(_req,res)=>res.json({defaultProvider:"fixture",providers:[{id:"fixture",displayName:"Fixture",defaultModel:"image",models:[{
  id:"image",displayName:"Image",capabilities:{imageGeneration:true,imageReferences:true,maxReferenceImages:6,aspectRatios:["1:1","16:9","9:16"]}
}]}]}));
app.get("/api/history",(_req,res)=>res.json({items:[{id:"still-fixture",prompt:"Fixture set",imageUrl:"/outputs/test-set.png",
  timestamp:Date.now(),provider:"fixture",submodel:"image",mode:"normal",width:1,height:1}],hasMore:false,nextCursor:null}));
app.get("/api/generation/job-center",(_req,res)=>res.json({items:[],activeCount:0,terminalCount:0,polledAt:new Date().toISOString()}));
app.post("/api/generation/prompt-preview",(_req,res)=>res.json({compiledPrompt:"Fixture preview"}));
app.post("/api/references/processing-plan",(_req,res)=>res.json({
  status:"accepted",policyVersion:"fixture",planFingerprint:"fixture",
  publicAuthorityProjection:{schemaVersion:1,policyVersion:"fixture",planFingerprint:"fixture"},
  effectiveSelections:{},providerPlan:{referenceCount:1,executionMode:"single_stage"}
}));
let looksheetRequests=0;
app.post("/api/generate",(req,res)=>{
  assert.match(req.body.sceneBuilder.manualPromptText,/character looksheet for Lalin/);
  assert.match(req.body.characterReferenceImageA,/^\/outputs\/references\//);
  looksheetRequests++;
  res.json({jobId:"looksheet-fixture",status:"queued"});
});
app.get("/api/jobs/looksheet-fixture",(_req,res)=>res.json({
  status:"completed",result:{imageUrl:"/outputs/character-looksheet.png"}
}));
registerCinematicRoutes(app,{cinematicService:facade});
app.post("/api/references",async (req,res)=>{
  try {res.json(await references.storeReference(req.body,actor));}
  catch (error) {res.status(error.statusCode || 500).json({error:error.message});}
});
app.use("/outputs",express.static(directory));
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
  await dialog.getByRole("textbox",{name:"Story title"}).fill("Letters from the inn");
  await dialog.getByRole("button").last().click();
  await page.waitForURL(/\/story\/[^/?#]+$/);
  const projectUrl=page.url();
  const projectId=new URL(projectUrl).pathname.split("/").at(-1);
  const persisted=()=>projects.findForActor(projectId,actor);
  assert.equal((await persisted()).title,"Letters from the inn");
  assert.equal(writingRequests.length,0,"creating a project is manual");
  const openSettings=()=>page.getByRole("button",{name:/Story settings/}).click();
  await openSettings();
  assert.equal(await editorLoaded(),true,"opening a project loads the editor");
  await dialog.getByLabel("Writing model").selectOption("gpt-6.2-sol");
  await dialog.getByLabel("Dialogue language").selectOption("English");
  await dialog.getByLabel("Drama tradition").selectOption("thailand");
  await dialog.getByRole("checkbox").first().check();
  for(const width of [390,820,1440]) {
    await page.setViewportSize({width,height:900});
    assert.ok(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth+1 && el.getBoundingClientRect().right<=innerWidth));
  }
  await dialog.getByRole("button",{name:"Save settings"}).click();
  await dialog.waitFor({state:"hidden"});
  const settings=(await persisted()).writingSettings;
  assert.equal(settings.modelId,"gpt-6.2-sol");
  assert.deepEqual(settings.skillIds,["story-structure"]);
  assert.equal(settings.direction.spokenLanguage,"English");
  await page.reload();
  await openSettings();
  assert.equal(await dialog.getByLabel("Writing model").inputValue(),"gpt-6.2-sol");
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
  assert.match(await dialog.innerText(),/Writing skills · Story structure/);
  await dialog.getByRole("textbox").fill("A traveller returns to the inn.");
  await dialog.getByRole("button",{name:"Generate draft"}).click();
  const progress=page.getByRole("dialog",{name:"AI is drafting the script…"});
  await progress.waitFor();
  await page.emulateMedia({reducedMotion:"reduce"});
  assert.equal(await progress.locator("svg.lucide-pen-line").evaluate(node=>getComputedStyle(node).animationName),"none");
  await page.emulateMedia({reducedMotion:"no-preference"});
  releaseDraft();
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
  await dialog.getByRole("button",{name:"Review suggested paragraph ranges"}).click();
  const sceneCards=dialog.locator(".story-range-review > li");
  assert.equal(await sceneCards.count(),2);
  const mergeAdjacent=sceneCards.first().getByRole("button",{name:"Merge with next scene"});
  assert.equal(await mergeAdjacent.isVisible(),false);
  await sceneCards.first().getByText("Split or merge scene",{exact:true}).click();
  await mergeAdjacent.click();
  assert.equal(await sceneCards.count(),1);
  for(const width of [390,820,1440]){
    await page.setViewportSize({width,height:520});
    assert.ok(await dialog.locator(".story-scene-review").evaluate(el=>{
      const box=el.parentElement.getBoundingClientRect();
      const footer=el.querySelector("footer").getBoundingClientRect();
      const list=el.querySelector(".story-proposals").getBoundingClientRect();
      return box.right<=innerWidth+1 && Math.abs(box.right-footer.right)<=2 &&
        footer.bottom<=innerHeight && list.bottom<=footer.top+1;
    }), "scene review actions remain visible at "+width);
  }
  await page.setViewportSize({width:1440,height:900});
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
  assert.match(await stages.locator("[aria-current=step]").innerText(),/Scene setup/);
  await page.getByRole("heading",{name:"Scene description"}).waitFor();
  for(const width of [390,820,1440]) {
    await page.setViewportSize({width,height:900});
    for(const language of ["th","en"]) {
      await page.locator(".header-actions select").selectOption(language);
      assert.ok(await page.locator(".story-staging").evaluate(el=>el.scrollWidth<=el.clientWidth+1 && el.getBoundingClientRect().right<=innerWidth));
      assert.ok(await page.locator(".story-stage-placeholder").isVisible());
    }
  }
  const firstSaved=structuredClone((await persisted()).scenes[0]);
  await button("Suggest shots with AI").click();
  await dialog.getByText(proposedShot,{exact:false}).first().waitFor();
  assert.equal(writingRequests.filter(r=>r==="shots").length,1);
  await page.keyboard.press("Escape");
  await page.reload();
  await button("Review shot proposal").click();
  await dialog.getByText(proposedShot,{exact:false}).first().waitFor();
  assert.equal(writingRequests.filter(r=>r==="shots").length,1,"reviewing a saved proposal does not submit again");
  await acceptSet();
  await button("Shot prompt for "+proposedShot).click();
  await dialog.locator(".story-shot-summary").getByText("The innkeeper gives the traveller a letter.").waitFor();
  let releaseReview;
  const reviewGate = new Promise(resolve=>{releaseReview=resolve;});
  let firstShotDraft;
  const failShotReview = async route=>{
    const body=route.request().postDataJSON();
    if (body.refineDraft === undefined) return route.fallback();
    firstShotDraft=body.refineDraft;
    await reviewGate;
    return route.fulfill({status:503,json:{error:"Fixture review unavailable"}});
  };
  await page.route("**/shot-proposals",failShotReview);
  await dialog.getByRole("button",{name:"Build prompt"}).click();
  const reviewing=page.getByRole("dialog",{name:"Reviewing and refining the prompt…",exact:true});
  await reviewing.waitFor();
  for (const width of [390,820,1440]) {
    await page.setViewportSize({width,height:900});
    assert.ok(await reviewing.evaluate(el=>{
      const rect=el.getBoundingClientRect();
      return Math.abs(rect.x+rect.width/2-innerWidth/2)<2 && Math.abs(rect.y+rect.height/2-innerHeight/2)<2;
    }));
  }
  releaseReview();
  await button("Use first draft").click();
  await page.unroute("**/shot-proposals",failShotReview);
  await dialog.getByLabel("Prompt text").waitFor();
  assert.equal(await dialog.getByLabel("Prompt text").inputValue(),firstShotDraft);
  assert.match(await dialog.getByLabel("Prompt text").inputValue(), /Duration: 5 seconds/);
  assert.equal(await dialog.getByText("This shot has no selected characters.").count(),1);
  await page.keyboard.press("Escape");
  await page.getByRole("dialog",{name:"Save your edits before leaving?"}).getByRole("button",{name:"Discard edits"}).click();
  const shotRow=page.locator(".story-shots button").filter({hasText:proposedShot});
  await shotRow.focus();
  await page.keyboard.press("Enter");
  const shotText=dialog.locator("fieldset > label textarea");
  const shotDuration=dialog.locator('input[type="number"]');
  assert.equal(await shotDuration.inputValue(),"5","fractional AI proposals are rounded up");
  const revised=dialogue+"\nแขกถือจดหมายออกเดินทาง";
  await shotText.fill(revised);
  await shotDuration.fill("4.5");
  assert.equal(await shotDuration.getAttribute("aria-invalid"),"true");
  assert.ok(await dialog.locator("fieldset > footer button").last().isDisabled());
  await shotDuration.fill("5");
  await dialog.locator("fieldset > footer button").first().click();
  const leave=page.getByRole("dialog").last();
  await leave.getByRole("button",{name:/keep editing|continue editing/i}).click();
  assert.equal(await shotText.inputValue(),revised,"continue editing keeps the unsaved dialogue");
  await page.keyboard.press("Escape");
  const saveConfirmation = page.getByRole("dialog",{name:"Save your edits before leaving?"});
  await saveConfirmation.getByRole("button",{name:"Save and close"}).click();
  await saveConfirmation.waitFor({state:"hidden"});
  await page.getByRole("dialog",{name:"Edit shot"}).waitFor({state:"hidden"});
  await page.reload();
  await shotRow.waitFor();
  assert.deepEqual((await persisted()).scenes[0],firstSaved,"editing scene two leaves scene one unchanged");
  assert.equal((await persisted()).scenes[1].shots[0].shotDocument,revised);
  assert.equal((await persisted()).scenes[1].shots[0].durationMs,5000);

  await shotRow.click();
  const shotEditor=page.getByRole("dialog",{name:"Edit shot"});
  await shotEditor.getByText("Revise this shot with AI",{exact:true}).click();
  await shotEditor.getByLabel("Direction",{exact:true}).fill("Keep the conversation between two characters.");
  let releaseShotRevision;
  const shotRevisionGate=new Promise(resolve=>{releaseShotRevision=resolve;});
  await page.route("**/shot-proposals",async route=>{
    const request=route.request().postDataJSON();
    assert.equal(request.targetShotId,(await persisted()).scenes[1].shots[0].id);
    assert.equal(request.instruction,"Keep the conversation between two characters.");
    await shotRevisionGate;
    await route.fulfill({response:await route.fetch()});
  },{times:1});
  await shotEditor.getByRole("button",{name:"Request revision"}).click();
  await shotEditor.getByRole("status").filter({hasText:"AI is drafting a revision for this shot"}).waitFor();
  assert.ok(await shotEditor.getByRole("button",{name:"Request revision"}).isDisabled());
  releaseShotRevision();
  const shotRevision=page.getByRole("dialog",{name:"Review this shot revision"});
  await shotRevision.getByRole("button",{name:"Close",exact:true}).click();
  await shotRevision.waitFor({state:"hidden"});
  await shotRow.click();
  await shotEditor.getByText("Revise this shot with AI",{exact:true}).click();
  const nextDirection=shotEditor.locator("details").filter({hasText:"Revise this shot with AI"}).locator("textarea");
  await nextDirection.fill("Keep the blocking as written.");
  assert.ok(await shotEditor.getByRole("button",{name:"Request revision"}).isDisabled());
  await shotEditor.getByRole("button",{name:"Review pending proposal"}).click();
  await shotRevision.getByRole("button",{name:"Discard proposal"}).click();
  await shotRevision.waitFor({state:"hidden"});
  assert.equal(await nextDirection.inputValue(),"Keep the blocking as written.");
  assert.ok(await shotEditor.getByRole("button",{name:"Request revision"}).isEnabled());
  await shotEditor.getByRole("button",{name:"Close",exact:true}).click();
  assert.equal((await persisted()).scenes[1].shots[0].shotDocument,revised);

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
      const shotHeading = dialog.locator(".story-shot-edit > header");
      assert.equal(await shotHeading.locator("p").innerText(),proposedShot);
      assert.equal(await shotHeading.getByRole("heading").innerText(),language==="en"?"Edit shot":"แก้ช็อต");
      assert.ok(await dialog.locator(".story-shot-edit > fieldset > footer").evaluate(el=>parseFloat(getComputedStyle(el).columnGap)>0));
      assert.ok(await page.evaluate(()=>{
        const d=document.querySelector("dialog[open]"), box=d?.getBoundingClientRect();
        return document.documentElement.scrollWidth<=innerWidth+1 && box && box.left>=-1 &&
          box.right<=innerWidth+1 && d.scrollWidth<=d.clientWidth+1;
      }),"shot and actions fit at "+width+" / "+language);
      await shotText.fill(revised+"\nUnsaved.");
      await page.keyboard.press("Escape");
      const confirmation = page.locator("dialog:has(> .story-save-confirmation)");
      assert.ok(await confirmation.getByRole("button",{name:language==="en"?"Save and close":"บันทึกแล้วปิด"}).isEnabled());
      assert.ok(await confirmation.evaluate(el=>{
        const box=el.getBoundingClientRect();
        return box.left>=0 && box.right<=innerWidth+1 && el.scrollWidth<=el.clientWidth+1
          && [...el.querySelectorAll("button")].every(button=>button.scrollWidth<=button.clientWidth+1);
      }), "save confirmation fits at "+width+" / "+language);
      await page.keyboard.press("Escape");
      await confirmation.waitFor({state:"hidden"});
      assert.equal(await shotText.inputValue(),revised+"\nUnsaved.");
      await shotText.fill(revised);
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
  await button("Add shot").click();
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
  await button("Characters").click();
  const reference = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aKw0AAAAASUVORK5CYII=", "base64");
  for (const [name, role] of [["Lalin","Innkeeper"],["Kin","Traveller"]]) {
    await button("Add character").click();
    await dialog.getByLabel("Name",{exact:true}).fill(name);
    await dialog.getByLabel("Role in the story").fill(role);
    await dialog.getByLabel("Reference image").setInputFiles({name:"reference.png",mimeType:"image/png",buffer:reference});
    await dialog.getByRole("button",{name:"Save character"}).click();
    await dialog.waitFor({state:"hidden"});
  }
  await page.reload();
  await page.locator(".story-character-list li img").last().waitFor();
  const characterRecords = (await persisted()).castAssignments;
  assert.equal(new Set(characterRecords.map(record=>record.storyReference.assetId)).size,2);
  await button("Check characters from story").click();
  await page.getByRole("dialog",{name:"Review character"}).getByLabel("Personality").fill("Observant, patient");
  await page.getByRole("button",{name:"Save and continue"}).click();
  await page.getByRole("dialog",{name:"Review character"}).waitFor({state:"hidden"});
  const revisedCast = (await persisted()).castAssignments;
  assert.equal(revisedCast.length,2);
  assert.deepEqual(revisedCast.find(record=>record.displayName==="Lalin").personalityTraits,["Observant","patient"]);
  await button("Select multiple to review").click();
  await page.getByRole("checkbox",{name:"Select Lalin for revision"}).check();
  await button("Review selected characters (1)").waitFor();
  await button("Exit multiple selection").click();
  await button("Lalin").click();
  await button("Edit Lalin").click();
  const editCast=page.getByRole("dialog",{name:"Edit Lalin"});
  await editCast.locator(".story-cast-edit-image img").waitFor();
  await editCast.getByRole("button",{name:"View reference at full size"}).click();
  await page.getByRole("dialog",{name:"View reference at full size"}).getByRole("button").click();
  await page.keyboard.press("Escape");
  const playgroundDraft=await page.evaluate(()=>localStorage.getItem("mpf.react.draft:development_bypass:fe24-image:story-fixture"));
  await fs.writeFile(path.join(directory,"character-looksheet.png"),reference);
  await button("Create looksheet").click();
  const mini=page.getByRole("dialog",{name:"Looksheet for Lalin"});
  await mini.waitFor();
  assert.match(await mini.locator("textarea").inputValue(),/character looksheet for Lalin/);
  await mini.locator(".generation-model-picker__trigger").click();
  await mini.getByRole("menu").waitFor();
  await page.keyboard.press("Escape");
  for (const width of [820,390,1440]) {
    await page.setViewportSize({width,height:900});
    assert.ok(await mini.evaluate(node=>node.scrollWidth<=node.clientWidth+2));
  }
  await mini.getByRole("button",{name:"Generate image",exact:true}).click();
  await mini.getByRole("button",{name:"Use as character reference"}).click();
  await mini.waitFor({state:"hidden"});
  assert.equal(looksheetRequests,1);
  assert.notEqual((await persisted()).castAssignments.find(record=>record.displayName==="Lalin").storyReference.assetId,
    revisedCast.find(record=>record.displayName==="Lalin").storyReference.assetId);
  assert.equal(await page.evaluate(()=>localStorage.getItem("mpf.react.draft:development_bypass:fe24-image:story-fixture")),playgroundDraft);
  await stages.getByRole("button",{name:/Scenes/}).click();
  await secondScene.click();
  await button("Edit scene tone").click();
  await dialog.getByText("Scene setting",{exact:true}).click();
  await dialog.getByRole("checkbox",{name:"Staged fight",exact:true}).check();
  await dialog.getByLabel("Scene tone and atmosphere",{exact:true}).fill("Lantern above the door.");
  await dialog.getByLabel("Scene sound",{exact:true}).fill("Wind in the courtyard.");
  await dialog.getByLabel("Audience focus or turning point",{exact:true}).fill("The seal draws attention.");
  await dialog.getByText("Characters in this scene",{exact:true}).click();
  await dialog.getByRole("checkbox",{name:/Lalin/}).check();
  await dialog.getByRole("checkbox",{name:/Kin/}).check();
  await dialog.getByRole("button",{name:"Save scene"}).click();
  await dialog.waitFor({state:"hidden"});
  const sceneViews = page.getByRole("navigation",{name:"Scene views"});
  const directed=(await persisted()).scenes.find(item=>item.title===proposedScenes[1]);
  assert.ok(directed.sceneEvents.includes("fight"));
  assert.equal(directed.audioIntent,"Wind in the courtyard.");
  assert.equal(directed.objective,"The seal draws attention.");
  assert.equal(directed.lighting,"Lantern above the door.");
  await page.locator(".story-scene-treatment").getByText(directed.lighting,{exact:true}).waitFor();
  await sceneViews.getByRole("button",{name:"Shot list",exact:true}).click();
  await sceneViews.locator("[aria-current=page]").filter({hasText:"Shot list"}).waitFor();
  await shotRow.click();
  await dialog.locator("fieldset details").first().locator("summary").click();
  for (const name of ["Lalin","Kin"]) {
    const selected = dialog.getByRole("checkbox",{name:new RegExp(name)});
    if (!(await selected.isChecked())) await selected.check();
  }
  const saveShot = dialog.getByRole("button",{name:"Save shot"});
  if (await saveShot.isEnabled()) await saveShot.click();
  else await dialog.getByRole("button",{name:"Close",exact:true}).click();
  await dialog.waitFor({state:"hidden"});
  await button("Shot prompt for "+proposedShot).click();
  await dialog.getByText("Innkeeper",{exact:true}).waitFor();
  await dialog.locator(".story-character-list img").last().waitFor();
  for (const width of [390,820,1440]) {
    await page.setViewportSize({width,height:900});
    assert.ok(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth+1 && el.getBoundingClientRect().right<=innerWidth));
  }
  await dialog.getByRole("button",{name:"Build prompt"}).click();
  const promptText = dialog.getByLabel("Prompt text");
  await promptText.waitFor();
  assert.match(await promptText.inputValue(),/Character 1: Lalin/);
  assert.match(await promptText.inputValue(),/Character 2: Kin/);
  assert.doesNotMatch(await promptText.inputValue(),/Character 1: Lalin.*Innkeeper|Build a causal chain/);
  const customPrompt = (await promptText.inputValue())+"\nHold on the seal.";
  await context.grantPermissions(["clipboard-read","clipboard-write"],{origin});
  await dialog.getByRole("button",{name:"Expand prompt"}).click();
  for(const width of [390,820,1440]){
    await page.setViewportSize({width,height:900});
    assert.ok(await dialog.evaluate(el=>Math.abs(el.getBoundingClientRect().width-innerWidth)<2 && el.scrollWidth<=el.clientWidth+1));
    if(width===390){
      await dialog.getByRole("button",{name:"Show attachments"}).click();
      assert.ok(await dialog.locator(".story-ref-content").isVisible());
    }else {
      const left=await dialog.locator(".story-text-pane").boundingBox();
      const right=await dialog.locator(".story-ref-pane").boundingBox();
      assert.ok(left.x+left.width<=right.x+1);
    }
  }
  await promptText.fill(customPrompt+"\nReference 99");
  const missingImage = dialog.getByText("Check Reference 99 against the attachment list.",{exact:true});
  await missingImage.waitFor();
  await promptText.fill(customPrompt);
  await missingImage.waitFor({state:"hidden"});
  await dialog.locator("footer").getByRole("button",{name:"Copy prompt"}).click();
  assert.equal((await page.evaluate(()=>navigator.clipboard.readText())).replaceAll("\r\n","\n"),customPrompt);
  await page.keyboard.press("Escape");
  assert.equal(await promptText.inputValue(),customPrompt);
  assert.ok(await dialog.getByRole("button",{name:"Expand prompt"}).evaluate(el=>el===document.activeElement));
  await dialog.getByRole("button",{name:"Save prompt"}).click();
  await dialog.waitFor({state:"hidden"});
  await page.reload();
  await button("Shot prompt for "+proposedShot).click();
  assert.equal(await promptText.inputValue(), customPrompt);
  await dialog.locator(".story-prompt-references li").first().waitFor();
  assert.ok(await dialog.getByRole("button",{name:"Copy prompt"}).isEnabled());
  await dialog.getByRole("button",{name:"Close",exact:true}).click();
  await shotRow.click();
  await dialog.locator("fieldset details").first().locator("summary").click();
  const kin = dialog.locator(".story-cast").filter({hasText:"Kin"});
  await kin.getByRole("checkbox").last().uncheck();
  await dialog.getByRole("button",{name:"Save shot"}).click();
  await dialog.waitFor({state:"hidden"});
  await button("Shot prompt for "+proposedShot).click();
  await dialog.getByRole("button",{name:"Edit saved prompt"}).click();
  await dialog.getByRole("alert").filter({hasText:"Rebuild it from the current shot"}).waitFor();
  assert.ok(await dialog.getByRole("button",{name:"Save prompt"}).isDisabled());
  await dialog.getByRole("button",{name:"Rebuild from shot"}).click();
  await page.waitForFunction(()=>document.querySelector(".story-prompt-dialog textarea")?.value.includes("Voice only, off-screen."));
  assert.match(await promptText.inputValue(),/Kin.*Voice only, off-screen/);
  assert.equal(await dialog.locator(".story-character-list li").last().locator("img").count(),0);
  await dialog.getByRole("button",{name:"Close",exact:true}).click();
  await page.getByRole("dialog",{name:"Save your edits before leaving?"}).getByRole("button",{name:"Discard edits"}).click();
  await sceneViews.getByRole("button",{name:"Scene setup",exact:true}).click();
  await sceneViews.locator("[aria-current=page]").filter({hasText:"Scene setup"}).waitFor();
  await page.getByLabel("Upload setting image").setInputFiles({name:"inn.png",mimeType:"image/png",buffer:reference});
  await page.locator(".story-stage-image").waitFor();
  const uploaded=(await persisted()).scenes[1];
  assert.ok(uploaded.approvedEnvironmentSource.assetId);
  await stages.getByRole("button",{name:/Scenes/}).click();
  await page.locator(".story-index button").filter({hasText:proposedScenes[0]}).click();
  await page.getByLabel("Reuse a setting from another scene").selectOption(uploaded.id);
  await page.locator(".story-stage-image").waitFor();
  const reused=(await persisted()).scenes[0];
  assert.equal(reused.approvedEnvironmentSource.assetId,uploaded.approvedEnvironmentSource.assetId);
  await fs.writeFile(path.join(directory,"test-set.png"),reference);
  await button("Design with AI").click();
  await page.waitForURL("**/image");
  await page.locator(".handoff-panel").first().getByRole("button").first().click();
  const returnImage=button("Use the displayed image for this scene");
  await returnImage.waitFor();
  assert.ok((await page.locator("#prompt").inputValue()).length>10);
  await page.reload();
  await returnImage.waitFor();
  const separate=await context.newPage();
  await separate.goto(origin+"/image");
  await separate.locator(".result-thumb").first().waitFor();
  assert.equal(await separate.getByRole("button",{name:"Use the displayed image for this scene"}).count(),0);
  await separate.close();
  await returnImage.click();
  await page.waitForURL(url=>url.pathname.endsWith("/"+projectId)&&url.searchParams.get("scene")===reused.id);
  await page.locator(".story-stage-image").waitFor();
  const returned=await persisted();
  assert.notEqual(returned.scenes[0].approvedEnvironmentSource.assetId,reused.approvedEnvironmentSource.assetId);
  assert.equal(returned.scenes[1].approvedEnvironmentSource.assetId,uploaded.approvedEnvironmentSource.assetId);
  assert.ok(!returned.scenes[2].approvedEnvironmentSource);
  assert.deepEqual(writingRequests,["manuscript","scenes","scenes","shots","shots"]);

  const mergeScene = returned.scenes[2];
  const sceneUrl = projectUrl + "?scene=" + mergeScene.id + "&step=shots";
  let mergeProject = returned;
  const names = ["Arrival", "Reply", "Exit"];
  for (let index = 0; index < names.length; index++) {
    let target = mergeScene.shots[0];
    if (index > 0) {
      const created = await service.createManualShot(projectId, mergeScene.id,
        {expectedVersion:mergeProject.version, idempotencyKey:crypto.randomUUID()}, actor);
      mergeProject = created.project;
      target = created.shot;
    }
    const result = await service.updateShotDocument(projectId, mergeScene.id, target.id, {
      expectedVersion:mergeProject.version, expectedShotVersion:target.version, title:names[index],
      durationMs:[3000,4000,3000][index],shotDocument:["The rider opens the door.", "The host answers quietly.", "Cut to the empty road."][index]
    },actor);
    mergeProject = result.project;
  }
  await page.goto(sceneUrl);
  const combine = button("Combine shots into one prompt");
  const build = button("Build merged prompt");
  const merged = page.getByRole("dialog", {name:"Merged video prompt"});
  const choices = page.locator(".story-merge-selection input");
  const writes = [];
  page.on("request", request => {
    if (request.method() !== "GET" && new URL(request.url()).pathname.startsWith("/api/")) writes.push(request.url());
  });
  for (const width of [390,820,1440]) {
    await page.setViewportSize({width,height:900});
    await combine.click();
    assert.ok(await build.isDisabled());
    await choices.nth(2).check();
    assert.ok(await build.isDisabled());
    await choices.nth(1).check();
    await choices.nth(0).focus();
    await page.keyboard.press("Space");
    assert.match(await page.locator(".story-merge-selection [role=status]").innerText(), /3 shots selected · 10 sec/);
    await build.click();
    assert.deepEqual(await merged.locator(".story-merge-timeline strong").allInnerTexts(), ["Arrival","Reply","Exit"]);
    assert.deepEqual(await merged.locator(".story-merge-timeline time").allInnerTexts(), ["0–3 sec","3–7 sec","7–10 sec"]);
    assert.ok(await merged.evaluate(el => document.documentElement.scrollWidth <= innerWidth + 1
      && el.getBoundingClientRect().right <= innerWidth + 1 && el.scrollWidth <= el.clientWidth + 1));
    await merged.getByRole("button",{name:"Close"}).click();
    await page.locator(".story-shot-card h4 button").first().waitFor();
    if (width === 390) {
      await page.locator(".header-actions select").selectOption("th");
      await button("รวมช็อตเป็น 1 พรอมป์").click();
      await choices.nth(0).check();
      await choices.nth(2).check();
      assert.equal(await page.locator(".story-merge-selection [role=status]").innerText(), "เลือก 2 ช็อต · 6 วินาที");
      await button("สร้างพรอมป์รวม").click();
      const thaiDialog = page.getByRole("dialog",{name:"พรอมป์วิดีโอรวม"});
      assert.equal(await thaiDialog.locator(".story-merge-timeline time").last().innerText(),"3–6 วินาที");
      assert.ok(await thaiDialog.evaluate(el => el.scrollWidth <= el.clientWidth + 1));
      await page.keyboard.press("Escape");
      await thaiDialog.waitFor({state:"hidden"});
      await page.locator(".header-actions select").selectOption("en");
    }
  }
  assert.equal(writes.length,0,"selection, timeline and new dialog opening are local");
  await combine.click();
  for (const index of [2,1,0]) await choices.nth(index).check();
  await choices.nth(1).uncheck();
  assert.match(await page.locator(".story-merge-selection [role=status]").innerText(), /2 shots selected · 6 sec/);
  await build.click();
  assert.deepEqual(await merged.locator(".story-merge-timeline strong").allInnerTexts(), ["Arrival","Exit"]);
  assert.deepEqual(await merged.locator(".story-merge-timeline time").allInnerTexts(), ["0–3 sec","3–6 sec"]);
  await merged.getByRole("button",{name:"Google Flow"}).click();
  assert.ok(await merged.getByRole("button",{name:"Build merged prompt"}).isDisabled());
  await merged.getByRole("button",{name:"Select opening frame"}).click();
  await page.locator(".story-frame-options button").first().click();
  await page.locator(".story-frame-options").waitFor({state:"hidden"});
  const framed = (await persisted()).scenes[2].shots;
  assert.ok(framed[0].approvedStoryboardSource);
  assert.ok(!framed[2].approvedStoryboardSource);
  assert.ok(await merged.getByRole("button",{name:"Build merged prompt"}).isEnabled());
  await merged.getByRole("button",{name:"Seedance"}).click();
  // Hold one offline request to observe duplicate prevention, then inject a recoverable network error.
  let releaseFirstBuild;
  const firstBuildGate = new Promise(resolve => {releaseFirstBuild = resolve;});
  await page.route("**/shot-proposals", async route => {
    await firstBuildGate;
    await route.fulfill({status:503,json:{error:"Fixture temporary failure"}});
  }, {times:1});
  await merged.getByRole("button",{name:"Build merged prompt"}).click();
  const writingStatus=page.getByRole("dialog",{name:"Writing the prompt…",exact:true}).getByRole("status");
  await writingStatus.waitFor();
  const mergedWritingPen=writingStatus.locator(".story-writing-pen");
  assert.equal(await mergedWritingPen.evaluate(node=>getComputedStyle(node).animationName),"story-writing");
  await page.emulateMedia({reducedMotion:"reduce"});
  assert.equal(await mergedWritingPen.evaluate(node=>getComputedStyle(node).animationName),"none");
  await page.emulateMedia({reducedMotion:"no-preference"});
  assert.ok(await page.locator(".story-merged-dialog footer button").first().isDisabled());
  releaseFirstBuild();
  await page.route("**/shot-proposals", async route => {
    const response = await route.fetch();
    const result = await response.json();
    const withoutMapping = result.text.replace(/^\[REFERENCE MAPPING\]\n[\s\S]*?(?=^\[[A-Z][A-Z &_-]+\]|(?![\s\S]))/m, "");
    result.text = "[PRESERVE EXACTLY]\r\nReference 1 — Wi: face and hair.\r\n0–3.3s — Hold the glance.\r\n\r\n" + withoutMapping;
    await route.fulfill({response,json:result});
  }, {times:1});
  let draftCalls=0;
  const reviewAttempts=[];
  const invalidReviewReceipt = {
    id:"cw_invalid_review",operation:"shots",credits:0,billingStatus:"free",
    expiresAt:new Date(Date.now()+60000).toISOString()
  };
  await page.route("**/writing/quotes",async route=>{
    if (reviewAttempts.length===1 && route.request().postDataJSON().input?.refineDraft !== undefined)
      return route.fulfill({json:invalidReviewReceipt});
    return route.fallback();
  });
  await page.route("**/writing/operations/cw_invalid_review",route=>route.fulfill({json:{
    ...invalidReviewReceipt,status:"failed",artifactExpiresAt:invalidReviewReceipt.expiresAt,
    errorCode:"cinematic_prompt_refinement_invalid"
  }}));
  await page.route("**/shot-proposals",async route=>{
    const body=route.request().postDataJSON();
    if (body.refineDraft === undefined) draftCalls++;
    else {
      reviewAttempts.push(body.refineDraft);
      if (reviewAttempts.length===1) return route.fulfill({status:503,json:{error:"Fixture review unavailable"}});
      if (reviewAttempts.length===2) {
        assert.equal(body.writingQuoteId,invalidReviewReceipt.id);
        return route.fulfill({status:502,json:{error:{
          code:"cinematic_prompt_refinement_invalid",message:"The prompt review returned an invalid edit."
        }}});
      }
    }
    return route.fallback();
  });
  const mergeResponse = page.waitForResponse(response => response.url().endsWith("/shot-proposals") && response.ok());
  await merged.getByRole("button",{name:"Try again"}).click();
  const recovery=page.getByRole("dialog",{name:"Review incomplete. Your first draft is ready."});
  await recovery.getByRole("button",{name:"Retry review"}).click();
  const mergedText = merged.getByLabel("Prompt text");
  await mergedText.waitFor();
  await merged.getByText("The proposed edits could not be applied. Your first draft is ready to edit, copy, or save.").waitFor();
  assert.equal(draftCalls,1);
  assert.equal(reviewAttempts.length,2);
  assert.equal(reviewAttempts[0],reviewAttempts[1]);
  assert.match(await mergedText.inputValue(), /\[REFERENCE MAPPING\]/);
  assert.doesNotMatch(await mergedText.inputValue(), /\[PRESERVE EXACTLY\]/);
  assert.match(await mergedText.inputValue(), /0–3s — Hold the glance/);
  assert.doesNotMatch(await mergedText.inputValue(), /The host answers quietly/);
  const tracks = merged.locator(".story-merge-track span");
  assert.equal(await tracks.count(), 2);
  for (const width of [390,820,1440]) {
    await page.setViewportSize({width,height:900});
    assert.ok(await merged.evaluate(el => el.scrollWidth <= el.clientWidth + 1));
    assert.ok(await merged.locator(".story-merge-timeline time").last().isVisible());
  }
  const editedMerge = (await mergedText.inputValue()) + "\nHold at the end.";
  const expandMerge=merged.getByRole("button",{name:"Expand prompt"});
  await expandMerge.click();
  const focusPrompt=page.getByRole("dialog",{name:"Expand prompt",exact:true});
  await focusPrompt.getByLabel("Prompt text").fill(editedMerge);
  for (const width of [390,820,1440]) {
    await page.setViewportSize({width,height:900});
    assert.ok(await focusPrompt.evaluate(el=>Math.abs(el.getBoundingClientRect().width-innerWidth)<2 &&
      Math.abs(el.getBoundingClientRect().height-innerHeight)<2 && el.scrollWidth<=el.clientWidth+1));
    assert.ok(await focusPrompt.getByRole("button",{name:"Copy prompt"}).isVisible());
  }
  await page.keyboard.press("Escape");
  assert.equal(await mergedText.inputValue(),editedMerge);
  assert.ok(await expandMerge.evaluate(el=>el===document.activeElement));
  await mergedText.fill(editedMerge + "\nShot 2\nHold [0:01.2] and wait [0:02.7].");
  const clockReview = merged.locator(".story-merge-clock-review");
  assert.equal(await clockReview.locator("summary").textContent(), "Check 2 cue times");
  assert.equal(await clockReview.getAttribute("open"), null);
  await clockReview.locator("summary").click();
  assert.match(await clockReview.getByRole("listitem").first().innerText(), /Shot 2.*0:01\.2/);
  const {maximumPromptCharacters} = await (await mergeResponse).json();
  assert.ok(maximumPromptCharacters > 0);
  await mergedText.fill("x".repeat(maximumPromptCharacters + 5));
  assert.match(await merged.locator("#merge-text-limit").innerText(), /Remove 5 to save/);
  assert.ok(await merged.getByRole("button",{name:"Copy prompt"}).isEnabled());
  assert.ok(await merged.getByRole("button",{name:"Save prompt"}).isDisabled());
  await mergedText.fill(editedMerge);
  await context.grantPermissions(["clipboard-read","clipboard-write"], {origin});
  await merged.getByRole("button",{name:"Copy prompt"}).click();
  await merged.getByRole("button",{name:"Copied"}).waitFor();
  const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
  assert.equal(clipboardText.replaceAll("\r\n","\n"), editedMerge);
  await merged.getByRole("button",{name:"Save prompt"}).click();
  await merged.waitFor({state:"hidden"});
  const mergedSaved = (await persisted()).scenes[2];
  assert.deepEqual(mergedSaved.shots, framed);
  assert.equal(mergedSaved.mergedPrompts[0].text, editedMerge);
  await page.reload();
  const beforeReopen = writes.length;
  const savedMergeSection = page.locator(".story-merge-saved");
  await savedMergeSection.waitFor();
  for (const width of [390,820,1440]) {
    await page.setViewportSize({width,height:900});
    assert.ok(await savedMergeSection.evaluate(section => {
      const toolbar = section.nextElementSibling;
      return toolbar?.classList.contains("story-scene-shot-toolbar")
        && section.getBoundingClientRect().bottom <= toolbar.getBoundingClientRect().top
        && section.scrollWidth <= section.clientWidth + 1;
    }));
  }
  await page.locator(".story-merge-saved").getByRole("button",{name:"Delete saved prompt"}).click();
  await page.getByRole("dialog",{name:"Delete saved prompt"}).getByRole("button",{name:"Cancel"}).click();
  assert.equal((await persisted()).scenes[2].mergedPrompts[0].text, editedMerge);
  await page.locator(".story-merge-saved button").first().click();
  assert.equal(await mergedText.inputValue(), editedMerge);
  assert.equal(writes.length, beforeReopen);
  const parallelWriter = await context.newPage();
  await parallelWriter.goto(sceneUrl);
  await parallelWriter.locator(".story-merge-saved button").first().click();
  const parallelPrompt = parallelWriter.getByRole("dialog",{name:"Merged video prompt"});
  const recoveredText = editedMerge + "\nAnother ending.";
  await parallelPrompt.getByLabel("Prompt text").fill(recoveredText);
  const finalMerge = editedMerge + "\nKeep the shot wide.";
  await mergedText.fill(finalMerge);
  await merged.getByRole("button",{name:"Save prompt"}).click();
  await merged.waitFor({state:"hidden"});
  expectMergedConflict = true;
  await parallelPrompt.getByRole("button",{name:"Save prompt"}).click();
  await parallelPrompt.getByRole("alert").filter({hasText:"Another edit was saved"}).waitFor();
  expectMergedConflict = false;
  assert.equal(await parallelPrompt.getByLabel("Prompt text").inputValue(), recoveredText);
  assert.ok(await parallelPrompt.getByRole("button",{name:"Save prompt"}).isDisabled());
  assert.equal((await persisted()).scenes[2].mergedPrompts[0].text, finalMerge);
  await parallelWriter.close();
  await page.locator(".story-shot-card h4 button").last().click();
  await shotText.fill("Cut to the rider waiting on the road.");
  await dialog.getByRole("button",{name:"Save shot"}).click();
  await dialog.waitFor({state:"hidden"});
  await page.locator(".story-merge-saved button").first().click();
  await merged.getByRole("status").filter({hasText:/Review these shots.*Exit/}).waitFor();
  assert.equal(await mergedText.inputValue(), finalMerge);
  assert.ok(await merged.getByRole("button",{name:"Save prompt"}).isDisabled());
  assert.ok(await merged.getByRole("button",{name:"Rebuild from selected shots"}).isEnabled());
  await merged.getByRole("button",{name:"Close"}).click();
  const firstCard = page.locator(".story-shot-card").first();
  for (const width of [390,820,1440]) {
    await page.setViewportSize({width,height:900});
    const shotToolbar = page.locator(".story-scene-shot-toolbar");
    for (const language of ["th","en"]) {
      await page.locator(".header-actions select").selectOption(language);
      await shotToolbar.getByRole("button",{name:language==="en"?"Add shot":"เพิ่มช็อต",exact:true}).waitFor();
      assert.equal(await shotToolbar.getByRole("button").count(),3);
      assert.ok(await shotToolbar.locator(".story-scene-shot-actions").evaluate(el=>parseFloat(getComputedStyle(el).columnGap)>0));
      for (const section of [shotToolbar,page.locator(".story-scene-header")]) {
        assert.ok(await section.evaluate(el=>el.scrollWidth<=el.clientWidth+1 &&
          el.getBoundingClientRect().right<=innerWidth+1));
      }
    }
    await firstCard.getByText("Arrange shot",{exact:true}).click();
    const withinScene = firstCard.getByRole("group",{name:"Within this scene"});
    const acrossScenes = firstCard.getByRole("group",{name:"Across scenes"});
    assert.ok(await withinScene.getByRole("button",{name:"Move up",exact:true}).isDisabled());
    assert.ok(await acrossScenes.getByRole("button",{name:"Move to start of next scene"}).isDisabled());
    assert.ok(await firstCard.locator(".story-arrange").evaluate(el => el.scrollWidth <= el.clientWidth + 1 &&
      el.getBoundingClientRect().right <= innerWidth + 1 &&
      [...el.querySelectorAll("button")].every(button=>button.scrollWidth<=button.clientWidth+1)));
    await firstCard.getByText("Arrange shot",{exact:true}).click();
    assert.equal(await withinScene.isVisible(),false);
  }
  const exitCard = page.locator(".story-shot-card").filter({has:page.locator("h4", {hasText:"Exit"})});
  await exitCard.getByText("Arrange shot",{exact:true}).click();
  await exitCard.getByRole("button",{name:"Move up",exact:true}).click();
  await page.waitForFunction(() => /Exit/.test(document.querySelectorAll(".story-shot-card h4")[1]?.textContent || ""));
  await page.waitForFunction(()=>document.activeElement===document.querySelectorAll(".story-shot-card h4 button")[1]);
  await exitCard.getByRole("button",{name:"Move to end of previous scene"}).click();
  await page.getByRole("button",{name:"Open destination scene"}).click();
  await page.locator(".story-shot-card").last().getByText(/Exit/).first().waitFor();
  const movedProject = await persisted();
  assert.equal(movedProject.scenes[1].shots.at(-1).id, framed[2].id);
  assert.equal(movedProject.scenes[2].shots.length,2);
  assert.equal(movedProject.scenes[2].mergedPrompts[0].text,finalMerge);
  await page.goto(sceneUrl);
  await page.locator(".story-merge-saved").getByRole("button",{name:"Delete saved prompt"}).click();
  const removeDialog=page.getByRole("dialog",{name:"Delete saved prompt"});
  await removeDialog.getByRole("button",{name:"Delete saved prompt"}).click();
  await removeDialog.waitFor({state:"hidden"});
  assert.deepEqual((await persisted()).scenes[2].mergedPrompts,[]);
  await page.getByRole("link",{name:/projects/i}).click();
  await page.locator(".story-projects a").filter({hasText:"Letters from the inn"}).waitFor();
  // Exercise the project header with a long selected chapter at each workspace width.
  await page.route(`**/api/cinematic/projects/${projectId}/series`, async route=>{
    const response = await route.fetch();
    const workspace = await response.json();
    const chapter = workspace.chapters[0];
    workspace.chapters = [
      {...chapter,title:"ตามหาแมวในคืนที่ฝนตก และจดหมายที่ไม่มีชื่อผู้ส่ง"},
      {...chapter,projectId:"chapter-fixture",title:"The following morning"}
    ];
    await route.fulfill({response,json:workspace});
  });
  await page.goto(projectUrl);
  const projectHeader = page.locator(".story-project-header");
  await projectHeader.getByRole("combobox").waitFor();
  for (const width of [390,820,1155,1440]) {
    await page.setViewportSize({width,height:900});
    for (const language of ["th","en"]) {
      await page.locator(".header-actions select").selectOption(language);
      await projectHeader.getByRole("button",{name:language==="th"?"ตัวละคร":"Characters",exact:true}).waitFor();
      const layout = await projectHeader.evaluate(header=>{
        const bounds = header.getBoundingClientRect();
        const title = header.querySelector("h1").getBoundingClientRect();
        const workflow = header.nextElementSibling.getBoundingClientRect();
        const controls = [...header.querySelectorAll("select, .story-project-controls > button")];
        const boxes = controls.map(control=>control.getBoundingClientRect());
        return {
          fits:header.scrollWidth<=header.clientWidth+1 &&
            header.nextElementSibling.scrollWidth<=header.nextElementSibling.clientWidth+1 &&
            boxes.every(box=>box.left>=bounds.left-1 && box.right<=bounds.right+1),
          alignedEdges:Math.abs(bounds.left-workflow.left)<1 && Math.abs(bounds.right-workflow.right)<1,
          alignedRow:boxes.every(box=>Math.abs(box.top-boxes[0].top)<1 && Math.abs(box.height-boxes[0].height)<1),
          belowTitle:boxes[0].top>=title.bottom,
          pickerAboveActions:boxes[0].bottom<boxes[1].top
        };
      });
      assert.ok(layout.fits && layout.alignedEdges,`story header fits at ${width} in ${language}`);
      if (width >= 1155) assert.ok(layout.alignedRow,`header controls line up at ${width} in ${language}`);
      else assert.ok(layout.belowTitle,`header controls sit below the project title at ${width}`);
      if (width === 390) assert.ok(layout.pickerAboveActions,"the episode picker has its own row on mobile");
    }
  }
  await page.route(`**/api/cinematic/projects/${projectId}`, async route=>{
    const response = await route.fetch();
    const project = await response.json();
    const {setup,writingSettings,activeFullStoryVersionId} = project;
    const savedAt = "2026-11-22T12:00:00.000Z";
    const title = "ตามหาแมวในคืนที่ฝนตก และจดหมายที่ไม่มีชื่อผู้ส่ง";
    project.confirmedFullStoryVersionId = activeFullStoryVersionId;
    project.chapterOutline = {
      id:"layout-outline",sourceRevisionId:activeFullStoryVersionId,sourceKey:"layout",status:"approved",
      settings:{format:setup.format,storyFormat:writingSettings.direction?.format,
        durationSeconds:writingSettings.direction?.targetSeconds ?? setup.durationSeconds,
        seasonEnabled:setup.seasonEnabled,seasonCount:setup.seasonEnabled?setup.seasonCount:1},
      chapters:[{title,synopsis:"Search for the owner of the letter.",seasonNumber:1}],
      rationale:"",warnings:[],createdAt:savedAt
    };
    project.chapterProposals = [{
      id:"layout-chapters",providerProposalId:"fixture",scope:"all",status:"applied",
      sourceFullStoryRevisionId:activeFullStoryVersionId,targetProjectId:projectId,instruction:"",
      baseChapterVersions:[],chapters:[{projectId,order:1,title,story:"The search begins."}],
      warnings:[],provenance:null,createdAt:savedAt,appliedAt:savedAt,discardedAt:null,appliedProjectIds:[projectId]
    }];
    await route.fulfill({response,json:project});
  });
  await page.goto(projectUrl+"?step=chapters");
  for (const width of [390,820,1440]) {
    await page.setViewportSize({width,height:900});
    for (const language of ["th","en"]) {
      await page.locator(".header-actions select").selectOption(language);
      const plan = page.locator(".story-chapter-plan");
      const draft = plan.getByRole("button",{name:language==="th"?"ให้ AI ร่างบททุกตอน":"Draft all chapters with AI"});
      const saved = plan.getByRole("region",{name:language==="th"?"บทตอนที่บันทึกแล้ว":"Saved chapter scripts"});
      await draft.waitFor();
      assert.ok(await saved.getByRole("button").isVisible());
      assert.ok(await plan.evaluate(el=>el.scrollWidth<=el.clientWidth+1 &&
        el.querySelector(".story-chapter-draft-action").getBoundingClientRect().bottom <
        el.querySelector(".story-saved-chapters").getBoundingClientRect().top));
    }
  }
  const writingCount = writes.length;
  await page.getByRole("region",{name:"Saved chapter scripts"}).getByRole("button").click();
  await page.locator(".story-script").waitFor();
  assert.equal(writes.length,writingCount,"opening the saved script does not submit writing work");
  assert.deepEqual(failures,[]);
  console.log("Story & Shots: authoring, saved prompts, merged shot selection, retry, opening frame, persistence, stale sources and responsive checks passed.");
} catch(error) {
  if (failures.length) console.error("API / browser failures", failures);
  if(page && !page.isClosed()) console.error((await page.locator("body").innerText()).slice(0,3000));
  throw error;
} finally {
  releaseDraft();
  await browser?.close();
  await vite.close();
  await new Promise(resolve=>server.close(resolve));
  await fs.rm(directory,{recursive:true,force:true});
}

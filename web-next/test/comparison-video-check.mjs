// Isolated UI acceptance. All API/provider/media traffic is intercepted.
import { chromium } from "playwright";
import assert from "node:assert/strict";
import sharp from "sharp";
import fs from "node:fs/promises";
import { execFileSync } from "node:child_process";

await fs.mkdir("_temp/fe24-cv", { recursive: true });
const png = await sharp({ create: { width: 1600, height: 1000, channels: 3, background: "#739b83" } }).png().toBuffer();
const browser = await chromium.launch({ headless: true });
let debugPage;
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const recorder = await context.newPage();
  const recordedClip = Buffer.from(await recorder.evaluate(async () => {
    const canvas = document.createElement("canvas"); canvas.width = 320; canvas.height = 180;
    const drawing = canvas.getContext("2d"); drawing.fillStyle = "#739b83"; drawing.fillRect(0,0,320,180);
    const stream = canvas.captureStream(10), chunks = [];
    const recording = new MediaRecorder(stream, { mimeType: "video/webm" });
    recording.ondataavailable = event => chunks.push(event.data);
    const stopped = new Promise(resolve => { recording.onstop = resolve; });
    recording.start();
    for(let frame=0;frame<12;frame++){drawing.fillStyle=frame%2 ? "#739b83" : "#83ab93";drawing.fillRect(0,0,320,180);await new Promise(resolve=>setTimeout(resolve,80));}
    recording.stop(); await stopped;
    stream.getTracks().forEach(track => track.stop());
    return [...new Uint8Array(await new Blob(chunks).arrayBuffer())];
  }));
  // Finalize the recorded fixture's seek index; MediaRecorder WebM alone may have none.
  execFileSync("ffmpeg",["-hide_banner","-loglevel","error","-y","-i","pipe:0","-c:v","libvpx","-g","1","_temp/fe24-cv/fixture.webm"],{input:recordedClip,windowsHide:true});
  const clip = await fs.readFile("_temp/fe24-cv/fixture.webm");
  await recorder.close();
  const page = await context.newPage(), errors = [];
  debugPage = page;
  page.setDefaultTimeout(10000);
  page.on("pageerror", error => errors.push(error.message));
  await context.addInitScript(() => localStorage.setItem("mpf.next.language", "en"));
  let cmpPosts = 0, videoPosts = 0, imagePosts = 0, cmpInput, videoInput, winner = null, setName = "Fixture comparison";
  let delayIdentity = false, identityChecks = 0, cmpQuotes = 0, videoQuotes = 0, allFailed = false;
  let creditsEnabled, imageInput;
  const directCreditCalls = [];
  const config = { contractVersion: 1, authMode: "development_bypass", methods: { password: false, emailOtp: false, google: false, facebook: false }, csrfToken: "fixture",
    policy: { otpDigits: 6, otpExpiresSeconds: 300, resendSeconds: 30, passwordMinLength: 8, passwordMaxLength: 128 }, legal: { termsVersion: null, privacyVersion: null } };
  const imageItem = { id: "image_fixture", prompt: "An image prompt", imageUrl: "/outputs/image.png", thumbnailUrl: "/outputs/image.png", timestamp: Date.now(), provider: "fixture", submodel: "Image A", mode: "normal", width: 1600, height: 1000 };
  const videoModel = { providerId: "fixture", modelId: "video-range", displayName: "Video Range", operations: ["text_to_video","image_to_video","character_to_video"], commercialOperations: ["playground_video"], inputModes: ["text_to_video","image_to_video","multimodal_reference"], durationControlMode: "exact", durations: Array.from({length:27},(_,index)=>index+4), resolutions: ["720p","1080p"], aspectRatios: ["16:9","9:16","1:1"], audioModes: ["none","generated"], referenceImageLimit: 9, supportsFirstFrame: true, firstFrameEnabled: true, supportsOrderedImageReferences: true, supportsLastFrame: false, qualificationStatus: "qualified", paidRoutingEnabled: true };
  const successVideo = { id: "video_success", status: "completed", providerId: "fixture", modelId: "Video Range", durationSeconds: 8, outputAsset: { publicUrl: "/outputs/video.webm", mimeType: "video/webm", posterUrl: "/outputs/image.png", width: 320, height: 180, durationSeconds: 0.4 }, submittedRequest: { durationSeconds: 8, aspectRatio: "16:9", resolution: "720p", audioMode: "none" } };
  const failedVideo = { id: "video_failed", status: "failed", modelId: "Failed fixture", durationSeconds: 8, providerError: { code: "provider_refused", referenceIssues: [{contentIndex:1,referenceIndex:0,reason:"possible_real_person"},{contentIndex:3,referenceIndex:2,reason:"possible_real_person"}] } };
  const submittedTask = () => ({ ...failedVideo, id: "video_submitted", modelId: "Video Range", submittedRequest: videoInput });
  const comparison = () => ({ id: "set_fixture", name: setName, description: "", winnerJobId: winner, createdAt: 1, updatedAt: 2,
    runs: [{ id: "run_fixture", status: "partially_completed", createdAt: 1, sourcePrompt: "Comparison prompt", configurationSnapshot: { aspectRatio: "1:1", imageResolution: "1K" },
      slots: (cmpInput?.slots || []).map((slot,index) => ({ ...slot, actualCredit:4, estimatedCredit:4, status: index === 0 && !allFailed ? "completed" : "failed", jobId: `cmp_job_${index}`, submittedPrompt: "Comparison prompt", result: index === 0 && !allFailed ? { imageUrl: "/outputs/image.png", width:1600,height:1000 } : null, error: index || allFailed ? { code:"provider_refused",message:"Fixture provider refusal" } : null })) }] });
  await page.route("**/outputs/**", route => {
    if(!route.request().url().endsWith(".webm"))return route.fulfill({contentType:"image/png",body:png});
    const range=/bytes=(\d+)-(\d*)/.exec(route.request().headers().range||"");
    const start=range?Number(range[1]):0,end=range&&range[2]?Math.min(Number(range[2]),clip.length-1):clip.length-1;
    return route.fulfill({status:range?206:200,contentType:"video/webm",headers:{"accept-ranges":"bytes",...(range?{"content-range":`bytes ${start}-${end}/${clip.length}`}:{})},body:clip.subarray(start,end+1)});
  });
  await page.route("**/api/**", async route => {
    const req=route.request(), url=new URL(req.url()), path=url.pathname;
    if(!path.startsWith("/api/"))return route.continue();
    const json=value=>route.fulfill({contentType:"application/json",body:JSON.stringify(value)});
    if(path==="/api/web-next/config") return json({creditsEnabled});
    if (creditsEnabled !== true && ["/api/credits/estimate", "/api/comparisons/estimate", "/api/generation/video/quote", "/api/me/preferences"].includes(path)) directCreditCalls.push(path);
    if(path==="/api/auth/config") { identityChecks++;if(delayIdentity)await new Promise(resolve=>setTimeout(resolve,500));return json(config); }
    if(path==="/api/me")return json({userId:"fixture",username:"fixture",displayName:"Fixture",role:"admin",authMode:config.authMode,accountStatus:"active"});
    if(path==="/api/me/preferences")return json({confirmCreditUsage:true});
    if(path==="/api/providers")return json({defaultProvider:"fixture",providers:[{id:"fixture",displayName:"Fixture",defaultModel:"image-a",models:["a","b"].map(id=>({id:`image-${id}`,displayName:`Image ${id.toUpperCase()}`,capabilities:{imageGeneration:true,imageReferences:true,maxReferenceImages:6,aspectRatios:id==="a"?["1:1","16:9","9:16"]:["1:1","16:9"],resolutions:["1K","2K"]},defaults:{resolution:"1K"}}))}]});
    if(path==="/api/history")return json({items:[imageItem],hasMore:false,nextCursor:null});
    if(path==="/api/generation/job-center")return json({items:[],activeCount:0,terminalCount:0,polledAt:new Date().toISOString()});
    if(path==="/api/credits/estimate")return json({estimate:{estimateId:"image_quote",estimatedCredits:1,expiresAt:Date.now()+60000},account:{availableCredits:100,canAfford:true}});
    if(path==="/api/generation/prompt-preview")return json({compiledPrompt:"fixture"});
    if(path==="/api/references/processing-plan")return json({status:"accepted",planVersion:1,references:[]});
    if(path==="/api/references")return json({referenceId:crypto.randomUUID(),imageUrl:"/outputs/image.png"});
    if(path==="/api/generate"){imagePosts++;imageInput=req.postDataJSON();return route.abort();}
    if(path==="/api/comparisons/policy")return json({minimumSlots:2,maximumSlots:4});
    if(path==="/api/comparisons/estimate") { const body=req.postDataJSON(), quote=++cmpQuotes;const stale=body.sceneBuilder.manualPromptText==="Stale comparison";if(stale)await new Promise(resolve=>setTimeout(resolve,1000));const expiry=Date.now()+(quote===1?2000:60000);return json({slots:body.slots.map(slot=>({...slot,estimateId:`quote_${slot.id}`,estimatedCredit:4,estimateExpiresAt:expiry,imageResolution:"1K"})),estimatedTotalCredit:stale?999:body.slots.length*4,providerConfigVersion:1,expiresAt:expiry,estimateToken:"fixture"}); }
    if(path.startsWith("/api/comparisons/requests/"))return json({state:"found",requestId:decodeURIComponent(path.split("/").pop()),setId:"set_fixture",runId:"run_fixture"});
    if(path==="/api/comparisons"&&req.method()==="POST"){cmpPosts++;cmpInput=req.postDataJSON();return route.abort("failed");}
    if(path==="/api/comparisons")return json({items:cmpPosts?[{id:"set_fixture",name:setName,createdAt:1,updatedAt:2,status:"partially_completed",slotCount:cmpInput.slots.length,completedCount:1}]:[],hasMore:false});
    if(path==="/api/comparisons/set_fixture/winner"){winner=req.postDataJSON().jobId;return json(comparison());}
    if(path==="/api/comparisons/set_fixture"){if(req.method()==="PATCH")setName=req.postDataJSON().name;return json(comparison());}
    if(path==="/api/generation/video/capabilities")return json({schemaVersion:1,catalogVersion:"fixture",mediaType:"video",promptMaximumCharacters:10000,models:[videoModel,{...videoModel,modelId:"video-discrete",displayName:"Video Discrete",durations:[5,10],inputModes:["text_to_video"]}],comparison:{enabled:false,minimumSlots:2,maximumSlots:2},launchStatus:"available"});
    if(path==="/api/generation/video/quote"){const quote=++videoQuotes;const stale=req.postDataJSON().prompt==="Stale video";if(stale)await new Promise(resolve=>setTimeout(resolve,1000));return json({estimate:{estimateId:`video_quote_${quote}`,estimatedCredits:stale?999:2,expiresAt:new Date(Date.now()+(quote===1?1500:60000)).toISOString(),chargeMode:"user_credits"},account:{availableCredits:100,canAfford:true},requestFingerprint:"fixture"});}
    if(path==="/api/generation/video/tasks"&&req.method()==="POST"){videoPosts++;videoInput=req.postDataJSON();return route.abort("failed");}
    if(path==="/api/generation/video/tasks")return json({items:[successVideo,failedVideo,...(videoPosts?[submittedTask()]:[])],hasMore:false});
    if(path.startsWith("/api/generation/video/requests/"))return json({state:"found",requestId:decodeURIComponent(path.split("/").pop()),taskId:"video_submitted"});
    if(path==="/api/generation/video/tasks/video_submitted")return json(submittedTask());
    if(path==="/api/generation/video/tasks/video_success")return json(successVideo);
    if(path==="/api/generation/video/tasks/video_failed")return json(failedVideo);
    console.error("UNMOCKED",req.method(),path); return route.fulfill({status:500,contentType:"application/json",body:JSON.stringify({error:{message:`Unmocked ${path}`}})});
  });
  await page.goto("http://127.0.0.1:6502/image");
  await page.locator("#prompt").fill("Direct image");
  const policyError = page.getByRole("alert").filter({hasText:"Workspace settings could not be loaded"});
  await policyError.waitFor();
  assert.equal(await page.locator(".generate-bar .primary-button").isDisabled(), true);
  creditsEnabled = false;
  await policyError.getByRole("button", {name:"Try again"}).click();
  for (const [surface, buttonSelector, endpoint] of [
    ["Image", ".generate-bar .primary-button", "/api/generate"],
    ["Comparison", ".generate-bar .primary-button", "/api/comparisons"],
    ["Video", ".video-submit .primary-button", "/api/generation/video/tasks"],
  ]) {
    await page.getByRole("link", {name:surface, exact:true}).click();
    if (surface === "Comparison") await page.locator(".comparison-slot").nth(1).waitFor();
    if (surface === "Video") await page.locator(".video-editor").waitFor();
    await page.locator("#prompt").fill("Direct " + surface);
    const submit = page.locator(buttonSelector + ":not(:disabled)");
    await submit.waitFor();
    assert.equal(await page.locator(".quote-line, .comparison-slot-price").count(), 0);
    const sent = page.waitForRequest(r => new URL(r.url()).pathname === endpoint && r.method() === "POST");
    await submit.evaluate(button => { button.click(); button.click(); });
    await sent;
    assert.equal(await page.getByRole("alertdialog").count(), 0);
    if (surface === "Comparison") {
      await page.locator(".operation-status").getByRole("button",{name:"Check status",exact:true}).click();
      await page.locator(".comparison-result.has-image .generation-result-metadata").waitFor();
      assert.equal(await page.getByLabel("Actual cost: 4 Credits").count(), 0);
    }
  }
  assert.deepEqual([imagePosts, cmpPosts, videoPosts], [1, 1, 1]);
  assert.deepEqual(directCreditCalls, []);
  assert.equal(imageInput.estimateId, undefined);
  assert.equal(cmpInput.creditEstimates, undefined);
  assert.equal(cmpInput.estimateToken, undefined);
  assert.equal(videoInput.estimateId, undefined);
  assert.equal(videoInput.requestFingerprint, undefined);
  assert.ok(imageInput.requestId && cmpInput.idempotencyKey && videoInput.idempotencyKey);
  console.log("PASS: missing policy blocks creation; credit-free image, comparison and video submit once without quotes, preferences or consent.");
  creditsEnabled = true;
  cmpPosts = videoPosts = imagePosts = 0;
  cmpInput = videoInput = imageInput = undefined;
  await page.evaluate(() => localStorage.clear());
  await page.goto("http://127.0.0.1:6502/image");
  await page.locator("#prompt").fill("Image draft stays here");
  assert.deepEqual(await page.locator(".media-tabs a").allTextContents(),["Image","Comparison","Video"]);
  await page.getByRole("link",{name:"Comparison",exact:true}).click();
  await page.locator(".comparison-slot").nth(1).waitFor();
  await page.locator("#prompt").fill("Comparison prompt");
  await page.locator(".primary-button:not(:disabled)").waitFor();
  await page.getByRole("button",{name:"Estimate expired. Refresh estimate",exact:true}).click();
  await page.locator(".primary-button:not(:disabled)").waitFor();
  const staleComparison=page.waitForResponse(response=>response.url().endsWith("/comparisons/estimate")&&response.request().postDataJSON().sceneBuilder.manualPromptText==="Stale comparison");
  const staleComparisonRequest=page.waitForRequest(request=>request.url().endsWith("/comparisons/estimate")&&request.postDataJSON().sceneBuilder.manualPromptText==="Stale comparison");
  await page.locator("#prompt").fill("Stale comparison");await staleComparisonRequest;await page.locator("#prompt").fill("Comparison prompt");await staleComparison;
  await page.getByRole("button",{name:"Add model",exact:true}).click();
  await page.locator(".comparison-slot").nth(2).getByRole("checkbox").uncheck();
  await page.locator(".primary-button:not(:disabled)").waitFor();
  assert.ok((await page.locator(".quote-line").innerText()).includes("8 credits"));
  await page.locator(".primary-button").click();await page.getByRole("alertdialog").getByRole("button",{name:"Cancel",exact:true}).click();assert.equal(cmpPosts,0);
  await page.locator(".primary-button").click();await page.getByRole("alertdialog").getByRole("button",{name:"Confirm and generate",exact:true}).evaluate(button=>{button.click();button.click();});
  await page.getByText("Submission is not confirmed.",{exact:false}).waitFor();
  assert.equal(cmpPosts,1);assert.equal(cmpInput.slots.length,2);assert.ok(cmpInput.idempotencyKey.startsWith("cmp_"));
  await page.reload();
  await page.locator(".operation-status").getByRole("button",{name:"Check status",exact:true}).click();
  await page.locator(".comparison-result.has-image").waitFor();
  await page.getByLabel("Actual cost: 4 Credits").first().waitFor();
  assert.equal(cmpPosts,1);assert.equal(await page.locator(".comparison-image").count(),1);
  await page.getByText("Fixture provider refusal",{exact:true}).waitFor();
  await page.getByRole("button",{name:"Choose result",exact:true}).click();
  await page.getByRole("button",{name:"Selected result",exact:false}).waitFor();assert.equal(winner,"cmp_job_0");
  await page.locator(".comparison-image").click();await page.getByRole("dialog").waitFor();await page.locator(".image-stage img").waitFor();await page.keyboard.press("Escape");
  allFailed=true;await page.reload();await page.locator(".comparison-result.status-only").nth(1).waitFor();assert.equal(await page.locator(".comparison-image").count(),0);assert.equal(await page.getByText("Fixture provider refusal",{exact:true}).count(),2);
  allFailed=false;await page.reload();await page.locator(".comparison-image").waitFor();
  await page.getByRole("link",{name:"Image",exact:true}).click();await page.locator(".handoff-actions").waitFor();assert.equal(await page.locator("#prompt").inputValue(),"Image draft stays here");
  await page.getByRole("button",{name:"Compare this prompt",exact:true}).click();await page.getByRole("button",{name:"Cancel",exact:true}).click();assert.equal(await page.locator("#prompt").inputValue(),"Comparison prompt");
  await page.getByRole("link",{name:"Video",exact:true}).click();
  await page.locator(".video-editor").waitFor();
  await page.locator("#prompt").fill("Video draft stays here");
  await page.locator(".video-submit .primary-button:not(:disabled)").waitFor();await page.getByRole("button",{name:"Refresh estimate",exact:true}).click();
  const staleVideo=page.waitForResponse(response=>response.url().endsWith("/video/quote")&&response.request().postDataJSON().prompt==="Stale video");
  const staleVideoRequest=page.waitForRequest(request=>request.url().endsWith("/video/quote")&&request.postDataJSON().prompt==="Stale video");
  await page.locator("#prompt").fill("Stale video");await staleVideoRequest;await page.locator("#prompt").fill("Video draft stays here");await staleVideo;
  await page.getByRole("spinbutton",{name:"Duration in seconds"}).fill("12");
  assert.equal(await page.getByRole("slider",{name:"Duration slider"}).inputValue(),"12");
  await page.getByRole("spinbutton",{name:"Duration in seconds"}).fill("31");assert.ok(await page.getByRole("button",{name:"Generate video",exact:true}).isDisabled());
  await page.getByRole("spinbutton",{name:"Duration in seconds"}).fill("12");
  await page.getByRole("button",{name:"Model",exact:true}).click();await page.getByRole("menuitemradio",{name:/Video Discrete/}).click();
  assert.equal(await page.getByRole("slider").count(),0);
  await page.getByLabel("Duration",{exact:true}).selectOption("5");
  await page.getByRole("button",{name:"Model",exact:true}).click();await page.getByRole("menuitemradio",{name:/Video Range/}).click();
  await page.getByRole("button",{name:"Generate video",exact:true}).filter({hasNot:page.locator(":disabled")}).waitFor();
  await page.locator(".video-submit .primary-button:not(:disabled)").waitFor();
  assert.ok((await page.locator(".video-submit").innerText()).includes("Estimate: 2 Credits"));
  await page.getByRole("button",{name:"Generate video",exact:true}).click();await page.getByRole("alertdialog").getByRole("button",{name:"Cancel",exact:true}).click();assert.equal(videoPosts,0);
  await page.getByRole("button",{name:"Generate video",exact:true}).click();await page.getByRole("alertdialog").getByRole("button",{name:"Confirm and generate",exact:true}).evaluate(button=>{button.click();button.click();});
  await page.getByText("The submission outcome is unknown.",{exact:false}).waitFor();assert.equal(videoPosts,1);
  await page.reload();await page.locator(".video-submit").getByRole("button",{name:"Check status",exact:true}).click();
  await page.getByText("provider_refused",{exact:true}).first().waitFor();assert.equal(videoPosts,1);
  assert.equal(await page.locator(".video-recent > button").count(),1,"failed jobs have no media cards");
  await page.locator(".video-recent > button").click();await page.locator("video").waitFor();
  await page.waitForFunction(()=>document.querySelector('video')?.readyState>=1);
  await page.locator('video').evaluate(async video=>{await video.play();video.pause();});
  await page.locator('video').evaluate(video=>new Promise(resolve=>{video.addEventListener("seeked",resolve,{once:true});video.currentTime=0.2;}));
  assert.ok((await page.locator('video').evaluate(video=>video.currentTime))>=0.19);
  await page.getByRole("button",{name:"Fullscreen",exact:true}).click();await page.waitForFunction(()=>!!document.fullscreenElement);await page.evaluate(()=>document.exitFullscreen());
  const checksBeforeMediaError=identityChecks;
  await page.locator('video').evaluate(video=>video.dispatchEvent(new Event("error")));
  await page.getByRole("button",{name:"Reload video",exact:true}).click();await page.waitForFunction(()=>document.querySelector('video')?.readyState>=1);
  const retriedPlayer=await page.locator('video').elementHandle();
  assert.equal(identityChecks,checksBeforeMediaError,"media failure does not refresh identity");assert.equal(videoPosts,1);
  for(const workspace of ["Comparison","Video"]){
    await page.getByRole("link",{name:workspace,exact:true}).click();
    await page.locator(workspace==="Comparison"?".comparison-workspace":".video-workspace").waitFor();
    if(workspace==="Comparison")assert.deepEqual(await retriedPlayer.evaluate(node=>({paused:node.paused,src:node.getAttribute("src")})),{paused:true,src:null});
    for(const width of [1440,820,390]){
      await page.setViewportSize({width,height:1000});
      for(const language of ["en","th"]){
        await page.locator(".header-actions select").selectOption(language);
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${workspace} ${width} ${language} overflow`);
        await page.screenshot({path:`_temp/fe24-cv/${workspace}-${width}-${language}.png`,fullPage:true});
      }
      await page.locator(".header-actions select").selectOption("en");
      if(width===390){await page.locator('.mobile-tabs button').nth(1).click();await page.screenshot({path:`_temp/fe24-cv/${workspace}-results-390.png`,fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
    }
    await page.setViewportSize({width:1440,height:1000});
    await page.evaluate(()=>document.documentElement.style.zoom="2");assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    if(workspace==="Comparison")assert.ok(await page.locator(".comparison-result").evaluateAll(cards=>cards.every(card=>{const bounds=card.getBoundingClientRect();return [...card.querySelectorAll("button")].every(button=>{const action=button.getBoundingClientRect();return action.left>=bounds.left && action.right<=bounds.right;});})),"200% actions stay inside their result cards");
    await page.screenshot({path:`_temp/fe24-cv/${workspace}-200percent.png`,fullPage:true});await page.evaluate(()=>document.documentElement.style.zoom="1");
  }
  // CSS zoom applies 200% layout/reflow, unlike deviceScaleFactor or screenshot scaling.
  await page.evaluate(()=>document.documentElement.style.zoom="2");
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:"_temp/fe24-cv/Video-200percent.png",fullPage:true});
  await page.evaluate(()=>document.documentElement.style.zoom="1");
  for(const path of ["image","comparison","video"]){
    await page.evaluate(path=>history.replaceState({usr:{identityScope:"another-actor",imageSettings:{prompt:"PRIVATE FOREIGN PROMPT"},handoff:{kind:"image",action:"settings",item:{id:"foreign",prompt:"PRIVATE FOREIGN PROMPT",imageUrl:"/outputs/foreign.png"}}},key:"foreign"},"",`/${path}`),path);
    await page.reload();await page.locator(".media-tabs").waitFor();
    assert.equal(await page.locator(".handoff-panel, [role=dialog]").count(),0);assert.notEqual(await page.locator("#prompt").inputValue(),"PRIVATE FOREIGN PROMPT");
  }
  await page.locator('.video-recent > button').click();await page.locator('video').waitFor();
  delayIdentity=true;await page.evaluate(()=>window.dispatchEvent(new Event('mpf:identity-invalidated')));await page.locator('.identity-status').waitFor();assert.equal(await page.locator('video').count(),0);
  assert.equal(imagePosts,0);assert.equal(cmpPosts,1);assert.equal(videoPosts,1);assert.deepEqual(errors,[]);
  console.log("PASS Comparison slots/quote/single-submit/recovery/partial/winner/zoom; Video duration/recovery/failure filtering/playback; draft isolation/handoff cancel; TH/EN390/820/1440; explicit identity gate. No paid calls.");
} catch (error) {
  console.error(await debugPage?.locator("main").innerText().catch(() => "No page"));
  await debugPage?.screenshot({path:"_temp/fe24-cv/failure.png",fullPage:true}).catch(()=>{});
  throw error;
} finally { await browser.close(); }

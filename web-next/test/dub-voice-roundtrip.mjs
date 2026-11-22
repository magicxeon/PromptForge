// Verify in-editor voice selection and retired bookmarks with isolated API responses.
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { createServer } from "vite";

const langs = ["th", "en"];
const project = {
  id: "roundtrip", name: "Test", revision: 1, status: "ready", sourceLanguage: "zh",
  targetLanguages: langs, durationMs: 5000, updatedAt: new Date().toISOString(), tracks: {},
  mediaUrl: "/api/dub-sub/projects/roundtrip/media",
  cues: ["first", "second"].map((id, i) => ({
    id, startMs: i * 2000, endMs: i * 2000 + 1700, text: id, speaker: i ? "Guest" : "Host",
    translations: { en: "EN " + id, th: "TH " + id },
    ...(i && {suggestedDelivery:{en:{emotion:"calm", intensity:"subtle", pace:"slow", direction:"Lower your voice."}}}),
  })),
};
const catalog = {
  catalogVersion: "fixture", defaultModelId: "a",
  models: ["dola-seed-audio", "b"].map(id => ({ id, displayName: id, providerId: "fixture", capabilities: { languages: langs } })),
  voices: ["a", "b"].map(id => ({ id: "voice-" + id, displayName: "Voice " + id, modelIds: [id], languages: langs })),
  policy: { maxRows: 4, maxTextLength: 900, maxStyleLength: 30, inlineTags: [],
    stylePresets:{emotion:["calm","sad"], intensity:["subtle"], pace:["slow"]} },
};
const pcm = Buffer.alloc(44 + 16000 * 5 * 2);
pcm.write("RIFF"); pcm.writeUInt32LE(pcm.length - 8, 4); pcm.write("WAVEfmt ", 8);
pcm.writeUInt32LE(16, 16); pcm.writeUInt16LE(1, 20); pcm.writeUInt16LE(1, 22);
pcm.writeUInt32LE(16000, 24); pcm.writeUInt32LE(32000, 28); pcm.writeUInt16LE(2, 32);
pcm.writeUInt16LE(16, 34); pcm.write("data", 36); pcm.writeUInt32LE(pcm.length - 44, 40);

const server = await createServer({ root: "web-next", configFile: false, server: { host: "127.0.0.1", port: 0, hmr: false, fs: { allow: [process.cwd()] } } });
server.middlewares.stack.unshift({route:"/api/dub-sub/projects/roundtrip/exports/render",handle:(_req,res)=>{
  res.setHeader("Content-Disposition",'attachment; filename="subtitles-1.srt"');
  res.setHeader("Content-Type","application/x-subrip");
  res.end("1\n00:00:00,000 --> 00:00:01,000\nHello\n");
}});
await server.listen();
const browser = await chromium.launch(process.env.PLAYWRIGHT_CHANNEL ? {channel:process.env.PLAYWRIGHT_CHANNEL} : {});
try {
  for (const width of [1440, 820, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    page.setDefaultTimeout(10000);
    const errors = [], writes = [];
    let lunaAttempts = 0;
    let draft = structuredClone(project);
    let batch = null;
    let confirmedRetry = false;
    let finishExport;
    const rendering = new Promise(resolve => { finishExport = resolve; });
    const seed = {id:"seed-saved", revision:1, operationId:"seed-saved", name:"English guest", displayDescription:"Quiet", designPrompt:"Quiet",
      modelId:"dola-seed-audio", providerId:"byteplus", language:"en", sourceType:"description", previewAssetId:"sample",
      audioUrl:"/outputs/voice-studio/sample.wav", durationMs:1000, savedAt:new Date().toISOString(), archivedAt:null,
      expiresAt:null, createdAt:new Date().toISOString(), lifecycleState:"ready"};
    const characters = [{id:"actor-a", name:"Character A", voiceId:"voice-a", voiceKind:"prebuilt", color:"#aaaaaa", revision:1}];
    await page.route("**/outputs/voice-studio/sample.wav", route => route.fulfill({contentType:"audio/wav",body:pcm}));
    page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(() => localStorage.setItem("mpf.next.language", "en"));
    await page.route("**/api/**", route => {
      const path = new URL(route.request().url()).pathname;
      if (!path.startsWith("/api/")) return route.continue();
      if (route.request().method() !== "GET") writes.push(path);
      const json = value => route.fulfill({ json: value });
      if (path.endsWith("/exports")) return rendering.then(() => json({
        id:"render",url:path+"/render",format:"srt",revision:1
      }));
      if (path.endsWith("/exports/render")) return route.continue();
      if (path === "/api/web-next/config") return json({ creditsEnabled: true });
      if (path === "/api/auth/config") return json({ contractVersion: 1, authMode: "development_bypass", methods: { password: false, emailOtp: false, google: false, facebook: false }, csrfToken: "fixture", policy: { otpDigits: 6, otpExpiresSeconds: 300, resendSeconds: 30, passwordMinLength: 8, passwordMaxLength: 128 }, legal: { termsVersion: null, privacyVersion: null } });
      if (path === "/api/me") return json({ userId: "fixture", username: "fixture", displayName: "Fixture", role: "admin", authMode: "development_bypass", accountStatus: "active" });
      if (path === "/api/dub-sub/projects/roundtrip") {
        if (route.request().method() === "PATCH") draft = { ...draft, ...route.request().postDataJSON(), revision:draft.revision + 1 };
        return json(draft);
      }
      if (path.endsWith("/peaks")) return json({ durationMs: 5000, peaks: [0, .2, .4, 0] });
      if (path.endsWith("/dubbing-timing-review")) {
        assert.equal(route.request().postDataJSON().language,"en");
        assert.ok(route.request().postDataJSON().cueIds.includes("second"));
        if (!draft.cues[1].voiceBindings?.en?.dubText && route.request().postDataJSON().director==="luna")
          return json([{id:"second",original:"EN second",suggested:"EN second",windowMs:1700,manual:true,reason:++lunaAttempts===1?"dub_luna_access":"dub_scene_outcome_unknown",director:"luna"}]);
        return json(draft.cues[1].voiceBindings?.en?.dubText ? [] :
          [{id:"second",original:"EN second",suggested:"Two.",windowMs:1700,speechWindows:[{startMs:200,endMs:800},{startMs:1150,endMs:1650}]}]);
      }
      if (path.endsWith("/dubbing-batches")) {
        if (route.request().method()==="POST") {
          const body = route.request().postDataJSON();
          if (body.mode==="failed") {
            assert.equal(body.acceptRhythmMismatch,true);
            confirmedRetry=true;
          } else assert.equal(body.mode,"missing");
          batch={id:"batch-1",language:"en",status:"prepared",totalCredits:2,items:[{cueId:"second",status:"pending"}]};
        }
        return route.fulfill({ contentType:"application/json", body:JSON.stringify(batch) });
      }
      if (path.endsWith("/advance")) {
        const request=route.request().postDataJSON();
        if (request.retime) {
          assert.deepEqual(request,{retime:true,revision:draft.revision,...(width===820 && {
            pauseException:{cueId:batch.items[0].cueId,takeId:"saved-take"}
          })});
          batch.status="complete";batch.items[0].status="done";delete batch.items[0].errorCode;
        } else if (confirmedRetry) {
          batch.status="complete";batch.items[0].status="done";
        } else {
          assert.deepEqual(request,{confirmed:true});
          batch.status="partial";batch.items[0].status=width===820 ? "failed" : "needs_listen";
          batch.items[0].errorCode=width===820?"dub_take_rhythm_pause":"dub_take_rhythm_onset";
          if (width===820) batch.items[0].takeId="saved-take";
        }
        return json(batch);
      }
      if (path.endsWith("/media")) {
        const range = /^bytes=(\d+)-(\d*)$/.exec(route.request().headers().range || "");
        if (!range) return route.fulfill({ contentType: "audio/wav", headers: { "Accept-Ranges": "bytes" }, body: pcm });
        const start = Number(range[1]), end = Math.min(pcm.length - 1, Number(range[2] || pcm.length - 1));
        return route.fulfill({ status: 206, contentType: "audio/wav", headers: { "Accept-Ranges": "bytes", "Content-Range": `bytes ${start}-${end}/${pcm.length}` }, body: pcm.subarray(start, end + 1) });
      }
      if (path.endsWith("/voice-studio/catalog")) return json(catalog);
      if (path.endsWith("/voice-studio/custom-voices")) return json({items:[seed]});
      if (path.endsWith("/voice-studio/characters")) {
        if (route.request().method() === "POST") {
          const character = {...route.request().postDataJSON(), id:"guest-cast", revision:1};
          characters.push(character);
          return json(character);
        }
        return json({items:characters});
      }
      return json({ items: [] });
    });
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/dub-sub/projects/roundtrip`);
    await page.getByRole("button", {name:"Export", exact:true}).first().click();
    const exportDialog = page.getByRole("dialog", {name:"Export",exact:true});
    await exportDialog.getByLabel("Dubbing from timeline").check();
    assert.ok(await exportDialog.getByLabel("Dubbing language").isVisible());
    assert.ok(await exportDialog.getByLabel("Keep original music and sound effects").isChecked());
    await exportDialog.getByLabel("Original soundtrack").check();
    assert.equal(await exportDialog.getByLabel("Dubbing language").count(),0);
    await exportDialog.getByLabel("File format").selectOption("wav");
    assert.equal(await exportDialog.getByText("Subtitle tracks",{exact:true}).count(),0);
    await exportDialog.getByLabel("File format").selectOption("srt");
    assert.ok(await exportDialog.getByLabel("Subtitle language").isVisible());
    assert.ok(await exportDialog.evaluate(el => el.scrollWidth <= el.clientWidth + 1));
    await exportDialog.getByRole("button",{name:"Export",exact:true}).click();
    await exportDialog.getByRole("status").filter({hasText:"Preparing your SRT"}).waitFor();
    assert.ok(await exportDialog.locator(".seed-generation-wave").isVisible());
    await page.keyboard.press("Escape");
    assert.ok(await exportDialog.isVisible());
    finishExport();
    const downloadEvent = page.waitForEvent("download");
    await exportDialog.getByRole("link",{name:"Download SRT"}).click();
    assert.equal(await exportDialog.locator(".seed-generation-wave").count(),0);
    const downloaded = await downloadEvent;
    assert.equal(downloaded.suggestedFilename(),"subtitles-1.srt");
    assert.equal(await downloaded.failure(),null);
    await exportDialog.getByRole("button",{name:"Close",exact:true}).click();
    await page.locator(".dub-script select").selectOption("en");
    const source = page.locator(".dub-rows").getByRole("textbox", { name: "Source language" }).nth(1);
    assert.equal(await source.inputValue(), "second");
    await page.waitForFunction(() => document.querySelector("video")?.duration === 5);
    if (width === 390) {
      await page.locator(".dub-rows").getByRole("textbox", {name:"English"}).nth(1).click();
      assert.equal(await page.locator(".dub-inspector").isVisible(), false);
    }
    await source.click();
    if (!(await page.getByRole("button", { name: "Choose dubbing voice" }).isVisible()))
      await page.locator(".dub-open-inspector").click();
    const selectedLine = page.getByRole("region", {name:"Selected line"});
    assert.equal(await selectedLine.locator(".dub-cue-excerpt").innerText(), "EN second");
    assert.match(await selectedLine.locator(".dub-cue-range").innerText(), /02\.000.*03\.700/);
    await selectedLine.getByText("Arrange timing", {exact:true}).click();
    await selectedLine.getByText("Move the playhead inside this line to split it.").waitFor();
    assert.ok(await selectedLine.getByRole("button", {name:"Split at playhead"}).isDisabled());
    assert.ok(await selectedLine.getByRole("button", {name:"Delete this line"}).isVisible());
    assert.ok(await selectedLine.evaluate(el => el.scrollWidth <= el.clientWidth + 1));
    await page.getByRole("button", { name: "Choose dubbing voice" }).click();
    const voice = page.getByLabel("Dubbing voice", { exact: true });
    await voice.selectOption(seed.id);
    const performance=page.locator(".dub-performance-settings");
    await performance.locator("summary").click();
    const boundaryMode=performance.getByRole("checkbox",{name:/Speak freely within the cue/});
    assert.equal(await boundaryMode.isChecked(),false);
    await boundaryMode.check();
    assert.ok(await performance.evaluate(el=>el.scrollWidth<=el.clientWidth+1));
    await performance.locator("summary").click();
    await page.waitForFunction(() => document.querySelector("video")?.duration === 5);
    await page.locator("video").evaluate(video => { video.currentTime = 2.525; });
    assert.equal(await page.getByRole("link", { name: /Voice Studio/ }).count(), 0);
    assert.equal(await voice.inputValue(), seed.id);
    assert.equal(await page.locator(".dub-script select").inputValue(), "en");
    assert.equal(await page.locator(".dub-line.selected").getByLabel("Source language").inputValue(), "second");
    await page.waitForFunction(() => Math.abs(document.querySelector("video").currentTime - 2.525) < .01);
    assert.equal(await page.locator(".dub-inspector").isVisible(), true);
    assert.deepEqual(errors, []); assert.deepEqual(writes, ["/api/dub-sub/projects/roundtrip/exports"]);
    await page.getByRole("button", { name:"Dub project" }).click();
    const casting = page.getByRole("dialog", { name:"Dub project" });
    await casting.waitFor();
    assert.equal(await casting.locator("fieldset").count(), 2, await casting.innerText());
    assert.ok(await casting.evaluate(el=>el.scrollWidth <= el.clientWidth + 1),"casting fits viewport");
    const firstRow=casting.locator(".dub-cast-row").first();
    const personBox=await firstRow.locator(".dub-cast-person").boundingBox();
    const selectBox=await firstRow.locator("select").first().boundingBox();
    assert.ok(width===390 ? selectBox.y > personBox.y + personBox.height : selectBox.x > personBox.x + personBox.width - 1,"responsive speaker and voice positions");
    if (process.env.DUB_SCREENSHOTS) await casting.screenshot({path:`_temp/dub-timeline/casting-${width}.png`});
    await casting.locator("fieldset").nth(1).getByLabel("Saved dubbing voice", {exact:true}).selectOption(seed.id);
    await casting.getByRole("button", {name:"Save assignments"}).click();
    await casting.waitFor({state:"hidden"});
    assert.equal(draft.characterMappings.en.Guest, "guest-cast");
    assert.equal(draft.speakerProfiles.Guest.voiceNames.en, seed.name);
    assert.equal(draft.characterMappings.en.Host, undefined);
    assert.equal(characters.at(-1).voiceId, seed.id);
    characters.pop();
    await page.reload();
    await page.locator(".dub-script select").selectOption("en");
    await source.click();
    if (!(await page.getByRole("button", { name:"Choose dubbing voice" }).isVisible()))
      await page.locator(".dub-open-inspector").click();
    await page.getByRole("button", { name:"Choose dubbing voice" }).click();
    await voice.locator("option", {hasText:"Selected voice unavailable for this line"}).waitFor({state:"attached"});
    assert.equal(await voice.inputValue(), "");
    assert.equal(await page.getByRole("button", {name:"Estimate take"}).isDisabled(), true);
    await voice.selectOption(seed.id);
    assert.equal(await page.getByRole("button", {name:"Estimate take"}).isEnabled(), true);
    await page.reload();
    await page.locator(".dub-script select").selectOption("en");
    await page.getByRole("button", {name:"Calm · AI", exact:true}).click();
    await page.locator(".dub-voice details summary").click();
    assert.equal(await page.getByLabel("Performance notes").inputValue(), "Lower your voice.");
    const persisted = page.waitForResponse(r => r.request().method() === "PATCH" && r.url().endsWith("/projects/roundtrip"));
    await page.getByLabel("Performance notes").fill("Pause first.");
    await persisted;
    await page.reload();
    await page.locator(".dub-script select").selectOption("en");
    await page.getByRole("button", {name:"Calm · Edited", exact:true}).click();
    const castBadges=page.locator(".dub-cue-button.has-cast .dub-cast-badge");
    await castBadges.first().waitFor({state:"attached"});
    assert.ok(await castBadges.evaluateAll(badges=>badges.every(b=>
      b.previousElementSibling.getBoundingClientRect().right <= b.getBoundingClientRect().left + 1)));
    await page.locator(".dub-voice details summary").click();
    assert.equal(await page.getByLabel("Performance notes").inputValue(), "Pause first.");
    await page.getByRole("button",{name:"Dub project"}).click();
    await casting.getByLabel("I have reviewed the dialogue for this language").check();
    assert.equal(await casting.getByRole("button",{name:/Dub .* remaining lines/}).isDisabled(),true);
    for (const select of await casting.getByLabel("Saved dubbing voice",{exact:true}).all()) await select.selectOption(seed.id);
    const previewButtons = casting.locator(".dub-cast-actions").locator("button:nth-child(2)");
    await previewButtons.first().click();
    assert.notEqual(await previewButtons.first().innerText(),await previewButtons.nth(1).innerText());
    await previewButtons.first().click();
    let continueTiming;
    const pauseTiming = new Promise(resolve => { continueTiming = resolve; });
    await page.route("**/dubbing-timing-review", async route => {
      await pauseTiming;
      await route.fallback();
    }, {times:1});
    await casting.getByRole("button",{name:/Dub .* remaining lines/}).click();
    const timingProgress = casting.getByRole("status").filter({hasText:"Preparing timed dialogue"});
    await timingProgress.locator(".seed-generation-wave").waitFor();
    continueTiming();
    await timingProgress.waitFor({state:"hidden"});
    const proposed = casting.getByRole("textbox",{name:"Suggested dubbing line"});
    await casting.getByRole("button",{name:"Retry with Luna"}).click();
    await casting.getByRole("button",{name:"Retry with Luna"}).waitFor({state:"hidden"});
    assert.equal(lunaAttempts,2);
    await casting.getByRole("button",{name:"Send dialogue to Gemini for shortening"}).click();
    await casting.getByRole("button",{name:"Send dialogue to Gemini for shortening"}).waitFor({state:"hidden"});
    assert.equal(await proposed.inputValue(),"Two.");
    await casting.getByText("Detected speech (1.1s) at 0.2–0.8, 1.15–1.65 seconds from the start of this cue").waitFor();
    await proposed.fill("Hello.");
    await casting.getByRole("button",{name:"Generate and use these lines"}).click();
    await casting.getByRole("button",{name:/Confirm dubbing/}).waitFor();
    assert.equal(draft.cues[1].voiceBindings.en.dubText,"Hello.");
    assert.equal(draft.cues[1].translations.en,"EN second");
    const firstVoice = casting.getByLabel("Saved dubbing voice",{exact:true}).first();
    await firstVoice.selectOption("");
    assert.equal(await casting.getByRole("button",{name:/Confirm dubbing/}).count(),0);
    await firstVoice.selectOption(seed.id);
    await casting.getByRole("button",{name:/Dub .* remaining lines/}).click();
    await casting.getByRole("button",{name:/Confirm dubbing/}).click();
    await casting.getByText(/Placed 0 of 1 lines.*Recorded but not placed: 1/).waitFor();
    const retry = casting.getByRole("button",{name:"Review and re-dub outstanding lines"});
    await retry.waitFor();
    const writeCount=writes.length;
    if (width===390) {
      await retry.click();
      const analyze = casting.getByRole("button",{name:"Analyze and revise dialogue with AI (Gemini)"});
      await analyze.waitFor();
      assert.equal(await proposed.inputValue(),"Hello.");
      await proposed.fill("My edit.");
      await analyze.click();
      const replaceDialog = page.getByRole("dialog",{name:"Analyze and revise dialogue with AI (Gemini)",exact:true});
      await replaceDialog.getByRole("button",{name:"Cancel"}).waitFor();
      await page.keyboard.press("Escape");
      await replaceDialog.waitFor({state:"hidden"});
      assert.equal(await proposed.inputValue(),"My edit.");
      assert.ok(await analyze.evaluate(el=>el===document.activeElement));
      await proposed.fill("Hello.");
      await casting.getByRole("button",{name:"Generate and use these lines"}).click();
      await casting.getByRole("button",{name:/Confirm dubbing/}).click();
    } else if (width===820) await casting.getByRole("button",{name:"Use this take if the start and end match"}).click();
    else await casting.getByRole("button",{name:"Analyze scene audio"}).click();
    await casting.getByText("Placed 1 of 1 lines").waitFor();
    if (width!==390) assert.deepEqual(writes.slice(writeCount),["/api/dub-sub/projects/roundtrip/dubbing-batches/batch-1/advance"]);
    else assert.ok(confirmedRetry);
    await casting.getByRole("button",{name:"Close",exact:true}).click();
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/dub-sub/voice?view=voices`);
    await page.waitForURL("**/dub-sub");
    assert.equal(await page.getByRole("link", { name: /Voice Studio/ }).count(), 0);
    console.log("PASS", width, "cue, language and time preserved in editor; old voice bookmark opens Projects");
    await page.close();
  }
} finally {
  await browser.close();
  await server.close();
}

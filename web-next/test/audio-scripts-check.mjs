import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium } from "playwright";
import { createServer } from "vite";

// The browser talks only to fixture endpoints. Distinct PCM values make the
// order and the exact length of inserted silence observable in the download.
const modelId = "dola-seed-audio";
const now = new Date().toISOString();
const source = Buffer.alloc(44 + 4800);
source.write("RIFF"); source.writeUInt32LE(source.length - 8, 4); source.write("WAVEfmt ", 8);
source.writeUInt32LE(16, 16); source.writeUInt16LE(1, 20); source.writeUInt16LE(1, 22);
source.writeUInt32LE(24000, 24); source.writeUInt32LE(48000, 28); source.writeUInt16LE(2, 32);
source.writeUInt16LE(16, 34); source.write("data", 36); source.writeUInt32LE(4800, 40);
const voice = { id: "voice", revision: 1, operationId: "preview", name: "Studio voice",
  displayDescription: "Warm", designPrompt: "Warm", modelId, providerId: "seed", language: "th",
  previewAssetId: "preview", audioUrl: "/outputs/voice-studio/preview.wav", durationMs: 1000,
  savedAt: now, archivedAt: null, expiresAt: null, lifecycleState: "ready", createdAt: now };
const speakers = ["Narrator","Young Master","Xiaomei"].map((name,i)=>({id:"speaker"+i,name,
  color:["#246052","#463390","#a45125"][i],voiceId:"voice"+i,voiceKind:"custom",revision:1}));
const row = (id, text, pauseAfterMs, speaker) => ({ id, text, pauseAfterMs, enabled: true, characterPresetId: speaker.id,
  selectedTakeId: null, selectedTakeCurrent: false, delivery: {} });
const server = await createServer({ root: "web-next", configFile: "web-next/vite.config.ts",
  server: { host: "127.0.0.1", port: 0, hmr: false } });
let browser;
try {
  await server.listen();
  browser = await chromium.launch(process.env.PLAYWRIGHT_CHANNEL ? {channel:process.env.PLAYWRIGHT_CHANNEL} : {});
  for (const width of [390, 820, 1440]) {
    const paid = width === 820;
    const errors = [], generated = [], history = {};
    let doc, resumedTake;
    const page = await browser.newPage({ viewport: {width, height: 850} });
    page.setDefaultTimeout(8500);
    page.on("pageerror", e => errors.push(e.message));
    await page.addInitScript(() => localStorage.setItem("mpf.next.language", "en"));
    await page.route("**/outputs/voice-studio/*", route => {
      if (route.request().url().endsWith("/preview.wav")) {
        const sample = Buffer.alloc(44 + 48000);
        source.copy(sample, 0, 0, 44);
        sample.writeUInt32LE(sample.length - 8, 4);
        sample.writeUInt32LE(sample.length - 44, 40);
        return route.fulfill({body:sample, contentType:"audio/wav"});
      }
      const pcm = Buffer.from(source);
      const number = Number(new URL(route.request().url()).pathname.match(/(\d+)\.wav$/)[1]);
      for (let i = 44; i < pcm.length; i += 2) pcm.writeInt16LE(number * 500, i);
      return route.fulfill({body:pcm, contentType:"audio/wav"});
    });
    await page.route("**/api/**", route => {
      const url = new URL(route.request().url()), path = url.pathname;
      if (!path.startsWith("/api/")) return route.continue();
      const json = value => route.fulfill({json:value});
      const method = route.request().method(), body = route.request().postDataJSON();
      if (path.endsWith("/web-next/config")) return json({creditsEnabled:paid});
      if (path.endsWith("/auth/config")) return json({contractVersion:1,authMode:"development_bypass",
        methods:{password:false,emailOtp:false,google:false,facebook:false},csrfToken:"fixture",
        policy:{otpDigits:6,otpExpiresSeconds:300,resendSeconds:30,passwordMinLength:8,passwordMaxLength:128},
        legal:{termsVersion:null,privacyVersion:null}});
      if (path === "/api/me") return json({userId:"test",username:"test",displayName:"Test",role:"admin",authMode:"development_bypass",accountStatus:"active"});
      if (path.endsWith("/catalog")) return json({catalogVersion:"1", defaultModelId:modelId, voices:[], models:[
        {id:modelId,providerId:"seed",displayName:"Seed",capabilities:{languages:["th","en"],audioControls:{speech_rate:{min:-50,max:100,step:1,default:0}}}}],
        policy:{maxTextLength:1000,maxStyleLength:300,maxRows:50,maxPauseAfterMs:30000,inlineTags:[],stylePresets:{emotion:["happy"]}}});
      if (path.endsWith("/characters")) return json({items:speakers});
      if (path.endsWith("/custom-voices")) return json({items:speakers.map(s=>({...voice,id:s.voiceId,name:s.name}))});
      if (path.endsWith("/documents")) {
        if (method === "GET") { assert.equal(url.searchParams.get("kind"), "audio-script"); return json({items:doc ? [doc] : []}); }
        assert.equal(body.kind, "audio-script");
        doc = {...body, id:"show", createdAt:now, updatedAt:now, revision:1,
          rows:[row("first","เสียงใครอยู่ข้างนอก",100,speakers[0]), row("second","ข้าเอง",0,speakers[1]),
            row("third","คุณชายมาได้อย่างไร",50,speakers[2])]};
        return json(doc);
      }
      if (path.endsWith("/documents/show")) {
        if (method === "PATCH") {
          assert.equal(body.expectedRevision,doc.revision);
          doc = {...doc, rows:body.rows,revision:doc.revision+1};
        }
        return json(doc);
      }
      if (path.endsWith("/generations/resuming")) {
        delete doc.rows[0].activeOperationId;
        return json({id:"resuming",status:"succeeded",take:resumedTake});
      }
      if (path.endsWith("/generations/resuming-fail")) {
        delete doc.rows[0].activeOperationId;
        return json({id:"resuming-fail",status:"failed",errorCode:"speech_provider_error"});
      }
      const match = path.match(/\/rows\/([^/]+)\/(quotes|takes|generations|selected-take)$/);
      if (match) {
        const [, id, action] = match, target = doc.rows.find(r=>r.id===id);
        if (action === "takes") return json({items:history[id] || []});
        assert.equal(body.expectedRevision,doc.revision);
        if (action === "quotes") return json({id:"quote-"+id+"-"+doc.revision,totalCredits:2});
        if (action === "selected-take") {
          target.selectedTakeId=body.takeId; target.selectedTakeCurrent=true; doc.revision++;
          return json(doc);
        }
        generated.push(id);
        const n=generated.length, take={id:"take"+n,jobId:"job"+n,rowId:id,documentId:doc.id,
          outputAssetId:"asset"+n, inputSnapshot:{text:target.text,delivery:target.delivery,voiceId:speakers.find(s=>s.id===target.characterPresetId).voiceId,characterName:target.characterPresetId,modelId,documentRevision:doc.revision},
          audioUrl:"/outputs/voice-studio/"+n+".wav",durationMs:100,displayTitle:"Line",tags:[],
          metadataRevision:1,savedAt:null,createdAt:now,takeNumber:n};
        (history[id] ||= []).push(take);
        return json({id:body.quoteId,status:"succeeded",take});
      }
      return json({items:[]});
    });
    const button = (name, area=page) => area.getByRole("button",{name,exact:true});
    await page.goto("http://127.0.0.1:"+server.httpServer.address().port+"/dub-sub/audio-scripts");
    await button("New script").click();
    await page.getByLabel("Script title").fill("Period drama");
    await page.getByLabel("Spoken language").selectOption("th");
    await button("Create script").click();
    const line = n => page.getByRole("article",{name:"Line "+n,exact:true});
    const firstLine = line(1);
    const performance = firstLine.getByRole("group", {name:"Voice direction"});
    const toggle = performance.locator("summary");
    const pause = performance.getByLabel("Silence after line (seconds)");
    await toggle.waitFor();
    await button("Preview voice", firstLine).click();
    assert.equal(await firstLine.locator("audio[controls]").count(), 0);
    await button("Stop", firstLine).click();
    await button("Preview voice", firstLine).click();
    await button("Preview voice", line(2)).click();
    await button("Preview voice", firstLine).waitFor();
    await button("Stop", line(2)).waitFor();
    await button("Preview voice", line(2)).waitFor();
    await button("New speaker", firstLine).click();
    const speakerDialog = page.getByRole("dialog");
    await speakerDialog.getByLabel("Saved voice").selectOption("voice0");
    await button("Preview voice", speakerDialog).click();
    assert.equal(await speakerDialog.locator("audio[controls]").count(), 0);
    await button("Stop", speakerDialog).click();
    await button("Cancel", speakerDialog).click();
    await page.evaluate(() => document.fonts.ready);
    assert.ok(!await pause.isVisible());
    assert.ok(await performance.getByLabel("Speed",{exact:true}).isVisible());
    const generateTop = () => button("Generate take",firstLine).evaluate(el => el.getBoundingClientRect().top + window.scrollY);
    const before = await generateTop();
    await toggle.focus();
    await toggle.press("Enter");
    assert.ok(await pause.isVisible());
    assert.ok(Math.abs(await generateTop() - before) < 1);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth+1));
    if (process.env.AUDIO_SCRIPT_SCREENSHOTS) {
      await firstLine.screenshot({path:process.env.AUDIO_SCRIPT_SCREENSHOTS+"/line-"+width+".png"});
    }
    await toggle.press("Space");
    assert.ok(!await pause.isVisible());
    const confirm = async () => { if (paid) await button("Confirm generation",page.getByRole("dialog")).click(); };
    await button("Generate take",line(3)).click(); await confirm();
    await button("Download WAV",line(3)).waitFor();
    await button("Play",line(3)).click();
    const [singleFile] = await Promise.all([page.waitForEvent("download"),button("Download WAV",line(3)).click()]);
    const single = await readFile(await singleFile.path());
    assert.equal(single.readUInt32LE(40),4800);
    assert.equal(single.readInt16LE(44),500);
    await button("Generate missing takes (2)").click(); await confirm();
    await page.getByText("3 of 3 lines ready").waitFor();
    assert.deepEqual(generated,["third","first","second"]);
    await button("Move line up",line(2)).click();
    const [file] = await Promise.all([page.waitForEvent("download"),button("Download script WAV").click()]);
    const bytes=await readFile(await file.path());
    assert.equal(bytes.readUInt32LE(40),21600);
    assert.equal(bytes.readInt16LE(44),1500);
    assert.equal(bytes.readInt16LE(44+4800),1000);
    assert.equal(bytes.readInt16LE(44+9600),0);
    assert.equal(bytes.readInt16LE(44+14400),500);
    assert.equal(bytes.readInt16LE(44+19200),0);
    await page.reload();
    await page.getByText("3 of 3 lines ready").waitFor();
    await line(1).getByLabel("Spoken text").fill("แก้บท");
    assert.ok(await button("Download script WAV").isDisabled());
    await button("Keep this take",line(1)).click();
    await page.getByText("3 of 3 lines ready").waitFor();
    // A fresh browser view finds a server-side operation without a local receipt.
    const first = doc.rows[0];
    first.selectedTakeId=null; first.selectedTakeCurrent=false; first.activeOperationId="resuming-fail";
    await page.reload();
    await button("Generate missing takes (1)").click();
    await line(1).getByRole("alert").waitFor();
    first.activeOperationId="resuming";
    resumedTake={...history[first.id][0],inputSnapshot:{...history[first.id][0].inputSnapshot,text:first.text, documentRevision:doc.revision}};
    await page.reload();
    await button("Generate missing takes (1)").click();
    await page.getByText("3 of 3 lines ready").waitFor();
    assert.deepEqual(generated,["third","first","second"]);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth+1));
    assert.deepEqual(errors,[]);
    await page.close();
    console.log("Audio Scripts passed at "+width+"px");
  }
} finally {
  await browser?.close();
  await server.close();
}

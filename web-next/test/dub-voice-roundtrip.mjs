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
  models: ["a", "b"].map(id => ({ id, displayName: id, providerId: "fixture", capabilities: { languages: langs } })),
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
await server.listen();
const browser = await chromium.launch();
try {
  for (const width of [1440, 820, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    page.setDefaultTimeout(10000);
    const errors = [], writes = [];
    let draft = structuredClone(project);
    const seed = {id:"seed-saved", revision:1, operationId:"seed-saved", name:"English guest", displayDescription:"Quiet", designPrompt:"Quiet",
      modelId:"dola-seed-audio", providerId:"byteplus", language:"en", sourceType:"description", previewAssetId:"sample",
      audioUrl:"/outputs/voice-studio/sample.wav", durationMs:1000, savedAt:new Date().toISOString(), archivedAt:null,
      expiresAt:null, createdAt:new Date().toISOString(), lifecycleState:"ready"};
    const characters = [{id:"actor-a", name:"Character A", voiceId:"voice-a", voiceKind:"prebuilt", color:"#aaaaaa", revision:1}];
    page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(() => localStorage.setItem("mpf.next.language", "en"));
    await page.route("**/api/**", route => {
      const path = new URL(route.request().url()).pathname;
      if (!path.startsWith("/api/")) return route.continue();
      if (route.request().method() !== "GET") writes.push(path);
      const json = value => route.fulfill({ json: value });
      if (path === "/api/web-next/config") return json({ creditsEnabled: true });
      if (path === "/api/auth/config") return json({ contractVersion: 1, authMode: "development_bypass", methods: { password: false, emailOtp: false, google: false, facebook: false }, csrfToken: "fixture", policy: { otpDigits: 6, otpExpiresSeconds: 300, resendSeconds: 30, passwordMinLength: 8, passwordMaxLength: 128 }, legal: { termsVersion: null, privacyVersion: null } });
      if (path === "/api/me") return json({ userId: "fixture", username: "fixture", displayName: "Fixture", role: "admin", authMode: "development_bypass", accountStatus: "active" });
      if (path === "/api/dub-sub/projects/roundtrip") {
        if (route.request().method() === "PATCH") draft = { ...draft, ...route.request().postDataJSON(), revision:draft.revision + 1 };
        return json(draft);
      }
      if (path.endsWith("/peaks")) return json({ durationMs: 5000, peaks: [0, .2, .4, 0] });
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
    await page.locator(".dub-script select").selectOption("en");
    const source = page.locator(".dub-rows").getByRole("textbox", { name: "Source language" }).nth(1);
    assert.equal(await source.inputValue(), "second");
    await source.click();
    if (!(await page.getByRole("button", { name: "Choose dubbing voice" }).isVisible()))
      await page.locator(".dub-open-inspector").click();
    await page.getByRole("button", { name: "Choose dubbing voice" }).click();
    const voice = page.getByLabel("Dubbing voice", { exact: true });
    await voice.selectOption("character/actor-a");
    await page.waitForFunction(() => document.querySelector("video")?.duration === 5);
    await page.locator("video").evaluate(video => { video.currentTime = 2.525; });
    assert.equal(await page.getByRole("link", { name: /Voice Studio/ }).count(), 0);
    assert.equal(await voice.inputValue(), "character/actor-a");
    assert.equal(await page.locator(".dub-script select").inputValue(), "en");
    assert.equal(await page.locator(".dub-line.selected").getByLabel("Source language").inputValue(), "second");
    await page.waitForFunction(() => Math.abs(document.querySelector("video").currentTime - 2.525) < .01);
    assert.equal(await page.locator(".dub-inspector").isVisible(), true);
    assert.deepEqual(errors, []); assert.deepEqual(writes, []);
    await page.getByRole("button", { name:"Assign speakers" }).click();
    const casting = page.getByRole("dialog", { name:"Assign speakers" });
    await casting.waitFor();
    assert.equal(await casting.locator("fieldset").count(), 2, await casting.innerText());
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
    await voice.selectOption("character/actor-a");
    assert.equal(await page.getByRole("button", {name:"Estimate take"}).isEnabled(), true);
    await page.reload();
    await page.locator(".dub-script select").selectOption("en");
    await page.getByRole("button", {name:"Calm · AI", exact:true}).click();
    assert.equal(await page.getByLabel("Performance notes").inputValue(), "Lower your voice.");
    const persisted = page.waitForResponse(r => r.request().method() === "PATCH" && r.url().endsWith("/projects/roundtrip"));
    await page.getByLabel("Performance notes").fill("Pause first.");
    await persisted;
    await page.reload();
    await page.locator(".dub-script select").selectOption("en");
    await page.getByRole("button", {name:"Calm · Edited", exact:true}).click();
    assert.equal(await page.getByLabel("Performance notes").inputValue(), "Pause first.");
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

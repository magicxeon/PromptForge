import assert from "node:assert/strict";
import { chromium } from "playwright";
import { createServer } from "vite";

const server = await createServer({ root: "web-next", configFile: "web-next/vite.config.ts",
  server: { host: "127.0.0.1", port: 0, hmr: false } });
await server.listen();
const browser = await chromium.launch();
const modelId = "dola-seed-audio";
const wav = Buffer.alloc(44 + 8000 * 2);
wav.write("RIFF"); wav.writeUInt32LE(wav.length - 8, 4); wav.write("WAVEfmt ", 8);
wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28); wav.writeUInt16LE(2, 32);
wav.writeUInt16LE(16, 34); wav.write("data", 36); wav.writeUInt32LE(wav.length - 44, 40);

try {
  for (const width of [390, 820, 1440]) {
    const creditsEnabled = width === 820;
    const page = await browser.newPage({ viewport: { width, height: 850 } });
    page.setDefaultTimeout(8000);
    const errors = [], quotes = [], generations = [], saved = [], deletions = [];
    let candidate;
    page.on("pageerror", err => errors.push(err.message));
    await page.addInitScript(() => localStorage.setItem("mpf.next.language", "en"));
    await page.route("**/outputs/voice-studio/*", r => r.fulfill({ body: wav, contentType: "audio/wav" }));
    await page.route("**/api/**", route => {
      const path = new URL(route.request().url()).pathname;
      if (!path.startsWith("/api/")) return route.continue();
      const method = route.request().method();
      const json = value => route.fulfill({ json: value });
      if (path === "/api/web-next/config") return json({ creditsEnabled });
      if (path === "/api/auth/config") return json({ contractVersion: 1, authMode: "development_bypass", methods: { password: false, emailOtp: false, google: false, facebook: false }, csrfToken: "fixture", policy: { otpDigits: 6, otpExpiresSeconds: 300, resendSeconds: 30, passwordMinLength: 8, passwordMaxLength: 128 }, legal: { termsVersion: null, privacyVersion: null } });
      if (path === "/api/me") return json({ userId: "test", username: "test", displayName: "Test", role: "admin", authMode: "development_bypass", accountStatus: "active" });
      if (path.endsWith("/catalog")) return json({ catalogVersion: "1", defaultModelId: modelId,
        models: [{ id: modelId, providerId: "byteplus", displayName: "Seed", capabilities: { languages: ["th","en"], voiceDesign: true } }],
        policy: { maxRows: 20, maxTextLength: 2000, maxStyleLength: 400, inlineTags: [] }, voices: [] });
      if (method === "DELETE" && path.includes("/custom-voices/")) {
        deletions.push(route.request().postDataJSON());
        const index = saved.findIndex(v => path.endsWith("/" + v.id));
        if (index >= 0) saved.splice(index, 1);
        return json({ deleted:true });
      }
      if (path.endsWith("/custom-voices/quotes")) {
        quotes.push(route.request().postDataJSON());
        return json({ id: "op" + quotes.length, totalCredits: 4 });
      }
      if (path.endsWith("/custom-voices") && method === "POST") {
        const input = route.request().postDataJSON();
        generations.push(input);
        candidate = { id: input.quoteId, revision: 1, operationId: input.quoteId, name: input.name,
          displayDescription: input.description, designPrompt: input.description, modelId, providerId: "byteplus",
          language: input.language, sourceType: input.sourceType, sampleText: input.sampleText, previewAssetId: "asset", audioUrl: "/outputs/voice-studio/example.wav",
          durationMs: 1000, archivedAt: null, savedAt: null, expiresAt: null, lifecycleState: "ready", createdAt: new Date().toISOString() };
        return json({ id: input.quoteId, status: "queued" });
      }
      if (path.includes("/generations/")) return json(generations.length === 3
        ? { id: candidate.id, status: "failed", errorCode: "speech_invalid_wav" }
        : { id: candidate.id, status: "succeeded", customVoice: candidate });
      if (path.endsWith("/save")) { candidate.savedAt = new Date().toISOString(); saved.push(candidate); return json(candidate); }
      if (path.endsWith("/custom-voices")) return json({ items: saved });
      return json({ items: [] });
    });
    await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/dub-sub/setup/voices`);
    for (const source of ["description", "reference"]) {
      const name = source + " " + width;
      await page.getByRole("button", { name: "Create dubbing voice" }).click();
      await page.getByLabel("Voice name", { exact: true }).fill(name);
      if (source === "reference") {
        await page.getByRole("radio", { name: "Reference audio" }).check();
        await page.getByLabel("Original recording", { exact: true }).first().setInputFiles({ name: "line.wav", mimeType: "audio/wav", buffer: wav });
      } else await page.getByLabel("Voice description", { exact: true }).fill("A soft clear adult voice.");
      await page.getByLabel("Line to speak in the sample").fill("Meet me at the inn.");
      if (creditsEnabled) {
        await page.getByRole("button", { name: "Get preview estimate" }).click();
        await page.getByRole("button", { name: "Generate sample" }).waitFor();
        await page.getByLabel("Voice name", { exact: true }).press("Enter");
      } else assert.equal(await page.getByRole("button", {name:"Get preview estimate"}).count(), 0);
      assert.equal(generations.length, saved.length);
      await page.getByRole("button", { name: "Generate sample" }).click();
      await page.getByRole("button", { name: "Save dubbing voice" }).waitFor();
      if (source === "description") await page.reload();
      await page.locator('audio[aria-label="Generated sample"]').evaluate(el => el.play());
      await page.getByRole("button", { name: "Save dubbing voice" }).click();
      await page.getByRole("button", { name: "Create dubbing voice" }).waitFor();
      const row = page.getByRole("listitem").filter({ hasText: name });
      await row.getByRole("button", { name: "Listen" }).click();
      await row.locator("audio").evaluate(el => el.play());
      assert.equal(generations.length, saved.length);
      const sent = generations.at(-1);
      assert.equal(sent.sourceType, source);
      if (creditsEnabled) assert.equal(sent.referenceAudio, quotes.at(-1).referenceAudio);
      else {
        assert.equal(quotes.length, 0);
        assert.equal(sent.quoteId, "speech_" + sent.requestId);
      }
      if (source === "reference") {
        const normalized = Buffer.from(sent.referenceAudio, "base64");
        assert.equal(normalized.readUInt32LE(24), 24000);
        assert.equal(sent.retainOriginal, true);
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    }
    const referenceRow = page.getByRole("listitem").filter({hasText:"reference " + width});
    const deleteButton = referenceRow.getByRole("button", {name:/Delete/});
    await deleteButton.click();
    await page.getByRole("dialog").getByRole("button", {name:"Cancel", exact:true}).click();
    assert.equal(deletions.length, 0);
    await deleteButton.click();
    await page.getByRole("dialog").getByRole("button", {name:"Delete permanently", exact:true}).click();
    await referenceRow.waitFor({state:"detached"});
    assert.deepEqual(deletions, [{retireLinkedCharacters:true}]);
    await page.getByRole("button", { name: "Create dubbing voice" }).click();
    await page.getByLabel("Voice name", {exact:true}).fill("Retry voice");
    await page.getByLabel("Voice description", {exact:true}).fill("Calm and clear.");
    await page.getByLabel("Line to speak in the sample").fill("Another sample.");
    if (creditsEnabled) await page.getByRole("button", {name:"Get preview estimate"}).click();
    await page.getByRole("button", {name:"Generate sample"}).click();
    await page.getByText("The audio file could not be used.", {exact:false}).waitFor();
    assert.equal(await page.getByRole("button", {name:"Check status"}).count(), 0);
    if (width === 1440) await page.reload();
    await page.getByRole("button", {name:"Back to voice design"}).click();
    if (width !== 1440) assert.equal(await page.getByLabel("Voice name", {exact:true}).inputValue(), "Retry voice");
    await page.getByRole("button", {name:"Cancel", exact:true}).click();
    await page.getByRole("button", {name:"Create dubbing voice"}).click();
    await page.getByLabel("Voice name", {exact:true}).waitFor();
    assert.equal(generations.length, 3);
    assert.deepEqual(errors, []);
    console.log("PASS", width, {creditsEnabled}, "reference + description, preview audition, reload and explicit save");
    await page.close();
  }
} finally { await browser.close(); await server.close(); }

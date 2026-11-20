// Isolated 40-minute / 3,000-cue Timeline fixture. No provider or live API calls.
import assert from "node:assert/strict";
import os from "node:os";
import fs from "node:fs/promises";
import { chromium } from "playwright";
import { createServer } from "vite";

const baseline = process.argv.includes("--baseline");
const samples = 16000;
const wav = Buffer.alloc(44 + samples * 2);
wav.write("RIFF", 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write("WAVEfmt ", 8);
wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(16000, 24); wav.writeUInt32LE(32000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
wav.write("data", 36); wav.writeUInt32LE(samples * 2, 40);
for (let i = 0; i < samples; i++) wav.writeInt16LE(Math.round(Math.sin(i * Math.PI * 880 / 16000) * (i / samples) * 24000), 44 + i * 2);
const duration = 2400000;
const cues = Array.from({ length: 3000 }, (_, i) => ({ id: `cue-${i}`, startMs: i * 800, endMs: i * 800 + 700, speaker: `Character ${i % 2 + 1}`, text: `Original cue ${i}`, translations: { th: `บทที่ ${i}`, en: `Line ${i}` }, voiceBindings: {}, takes: { th: { id: `take-${i}`, durationMs: 1000, audioUrl: `/outputs/voice-studio/take-${i}.wav` } } }));
let project = { id: "timeline-fixture", name: "3,000 cue fixture", sourceLanguage: "en", targetLanguages: ["th", "en"], durationMs: duration, status: "ready", updatedAt: new Date().toISOString(), revision: 1, mediaUrl: "/api/dub-sub/projects/timeline-fixture/media", cues, tracks: {} };
const vite = await createServer({ root: "web-next", configFile: false, server: { host: "127.0.0.1", port: 0, hmr: false, fs: { allow: [process.cwd()] } } });
await vite.listen();
const browser = await chromium.launch({ headless: true, args: ["--enable-precise-memory-info"] });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(15000);
  await page.addInitScript(() => localStorage.setItem("mpf.next.language", "en"));
  const errors = []; let audioRequests = 0;
  page.on("pageerror", e => errors.push(e.message));
  await page.route("**/outputs/voice-studio/**", route => { audioRequests++; return route.fulfill({ contentType: "audio/wav", body: wav }); });
  await page.route("**/api/**", route => {
    const path = new URL(route.request().url()).pathname;
    if (!path.startsWith("/api/")) return route.continue();
    const json = value => route.fulfill({ contentType: "application/json", body: JSON.stringify(value) });
    if (path === "/api/auth/config") return json({ contractVersion: 1, authMode: "development_bypass", methods: { password: false, emailOtp: false, google: false, facebook: false }, csrfToken: "fixture", policy: { otpDigits: 6, otpExpiresSeconds: 300, resendSeconds: 30, passwordMinLength: 8, passwordMaxLength: 128 }, legal: { termsVersion: null, privacyVersion: null } });
    if (path === "/api/me") return json({ userId: "fixture", username: "fixture", displayName: "Fixture", role: "admin", authMode: "development_bypass", accountStatus: "active" });
    if (path.endsWith("/peaks")) return json({ durationMs: duration, peaks: Array.from({ length: 10000 }, (_, i) => Math.abs(Math.sin(i / 30))) });
    if (path.endsWith("/media")) return route.fulfill({ contentType: "audio/wav", body: wav });
    if (path === "/api/dub-sub/projects/timeline-fixture") {
      if (route.request().method() === "PATCH") project = { ...project, ...route.request().postDataJSON(), revision: project.revision + 1 };
      return json(project);
    }
    return route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ error: { message: "Offline fixture" } }) });
  });
  const started = performance.now();
  await page.goto(`http://127.0.0.1:${vite.httpServer.address().port}/dub-sub/projects/timeline-fixture`);
  await page.locator(".dub-timeline").waitFor();
  const metrics = { browser: browser.version(), platform: `${os.platform()} ${os.arch()}`, cpu: os.cpus()[0]?.model, cueCount: cues.length, durationMinutes: 40, openMs: Math.round(performance.now() - started) };
  metrics.clipDom = await page.locator(".dub-timeline [data-cue-id], .dub-lane > button").count();
  metrics.heapBytes = await page.evaluate(() => performance.memory?.usedJSHeapSize);
  if (!baseline) {
    assert.ok(metrics.clipDom <= 200, `fit viewport clip DOM bound: ${metrics.clipDom}`);
    await page.getByRole("combobox", { name: "Timeline zoom", exact: true }).selectOption({ index: await page.getByRole("combobox", { name: "Timeline zoom", exact: true }).locator("option").count() - 1 });
    await page.locator('.dub-take-wave[data-ready="true"]').first().waitFor().catch(async error => { console.error("Timeline", await page.locator(".dub-timeline").innerText(), "audioRequests", audioRequests, "errors", errors); throw error; });
    assert.ok(await page.locator(".dub-timeline [data-cue-id]").count() <= 240, "zoomed viewport clip DOM remains bounded");
    metrics.zoomedClipDom = await page.locator(".dub-timeline [data-cue-id]").count();
    const waveform = await page.locator('.dub-take-wave[data-ready="true"]').first().evaluate(canvas => {
      const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
      return data.some((channel, index) => index % 4 === 3 && channel > 0);
    });
    assert.ok(waveform, "take waveform paints decoded PCM peaks");
    assert.ok(await page.locator(".dub-take-wave").count() <= 16, "at most 16 mounted take peak consumers");
    assert.ok(audioRequests <= 32, `bounded visible take requests: ${audioRequests}`);
  }
  const selection = [];
  for (let i = 1; i <= 12; i++) {
    const start = performance.now();
    await page.locator(".dub-rows > div + button, .dub-rows button").nth(i % 10).click();
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    selection.push(performance.now() - start);
  }
  metrics.selectionP95Ms = Math.round(selection.sort((a, b) => a - b)[Math.floor(selection.length * .95)]);
  metrics.eventToSelectionP95Ms = await page.evaluate(async () => {
    const rows = [...document.querySelectorAll(".dub-rows button")], values = [];
    for (let i = 0; i < 12; i++) {
      const start = performance.now(); rows[i % rows.length].click();
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      values.push(performance.now() - start);
    }
    values.sort((a, b) => a - b); return Math.round(values[Math.floor(values.length * .95)]);
  });
  metrics.playbackFramesMs = await page.evaluate(async () => {
    const video = document.querySelector(".dub-picture video");
    let clock = 0; Object.defineProperty(video, "currentTime", { configurable: true, get: () => clock, set: value => { clock = value; } });
    const start = performance.now();
    for (let i = 0; i < 40; i++) { clock = i / 30; video.dispatchEvent(new Event("timeupdate")); await new Promise(resolve => requestAnimationFrame(resolve)); }
    return Math.round(performance.now() - start);
  });
  if (!baseline) {
    const selectedClip = page.locator('.dub-timeline .dub-cue-button[aria-pressed="true"]').first();
    await selectedClip.focus();
    const before = Number(await selectedClip.getAttribute("data-start-ms"));
    await selectedClip.press("ArrowRight");
    await page.waitForFunction(value => Number(document.querySelector('.dub-cue-button[aria-pressed="true"]')?.getAttribute("data-start-ms")) > value, before);
    await selectedClip.press("Alt+ArrowLeft");
    const selectedCueId = await selectedClip.locator("..").getAttribute("data-cue-id");
    const originalLane = page.locator(".lane-subtitle").first();
    const dragging = originalLane.locator(`[data-cue-id="${selectedCueId}"] .dub-cue-button`);
    const dragBox = await dragging.boundingBox();
    const dragStart = Number(await dragging.getAttribute("data-start-ms"));
    await page.mouse.move(dragBox.x + dragBox.width / 2, dragBox.y + dragBox.height / 2);
    await page.mouse.down(); await page.mouse.move(dragBox.x + dragBox.width / 2 + 25, dragBox.y + dragBox.height / 2, { steps: 4 }); await page.mouse.up();
    await page.waitForFunction(({ id, start }) => Number(document.querySelector(`.lane-subtitle [data-cue-id="${id}"] .dub-cue-button`)?.getAttribute("data-start-ms")) > start, { id: selectedCueId, start: dragStart });
    const endInput = page.getByRole("spinbutton", { name: "Timeline cue end in milliseconds" });
    const endBefore = Number(await endInput.inputValue());
    const trim = originalLane.locator(`[data-cue-id="${selectedCueId}"] .dub-trim.end`), trimBox = await trim.boundingBox();
    await page.mouse.move(trimBox.x + trimBox.width / 2, trimBox.y + trimBox.height / 2); await page.mouse.down();
    await page.mouse.move(trimBox.x + trimBox.width / 2 + 16, trimBox.y + trimBox.height / 2, { steps: 4 }); await page.mouse.up();
    assert.ok(Number(await endInput.inputValue()) > endBefore, "pointer trim updates cue end");
    await page.locator(".dub-timeline-viewport").evaluate(el => {
      el.scrollLeft = (el.scrollWidth - 132) * (230 * 800 / 2400000);
    });
    await page.locator('.lane-subtitle [data-cue-id="cue-230"] button').getByText("Line 230", { exact: true }).click();
    assert.equal(await page.locator(".dub-script select").inputValue(), "en");
    await page.locator(".dub-rows button.selected").getByText("Original cue 230").waitFor();
    assert.ok(await page.locator(".dub-rows").evaluate(el => el.scrollTop > 0));
    assert.equal(await page.locator(".dub-picture video").evaluate(el => el.currentTime), 184);
    await fs.mkdir("_temp/dub-timeline", { recursive: true });
    for (const width of [390, 820, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.waitForTimeout(80);
      for (const language of ["en", "th"]) {
        await page.locator(".header-actions select").selectOption(language);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `no document overflow at ${width}/${language}`);
        assert.ok(!(await page.locator(".dub-timeline").innerText()).includes("subtitleTrack"));
        await page.locator(".dub-timeline").screenshot({ path: `_temp/dub-timeline/timeline-${width}-${language}.png` });
      }
    }
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ mode: baseline ? "baseline" : "implemented", ...metrics, audioRequests }, null, 2));
} finally { await browser.close(); await vite.close(); }

// Isolated 40-minute / 3,000-cue Timeline fixture. No provider or live API calls.
import assert from "node:assert/strict";
import os from "node:os";
import fs from "node:fs/promises";
import { chromium } from "playwright";
import { createServer } from "vite";
import { wrapSubtitle } from "../../server/domain/dub-sub/subtitleLayout.js";

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
const thaiDialogue = "คนในโรงเตี๊ยมนี้หายไปไหนกันหมด? ท่านพี่เรียกข้าหรือ";
cues.at(-1).translations.th = thaiDialogue;
const vite = await createServer({ root: "web-next", configFile: false, server: { host: "127.0.0.1", port: 0, hmr: false, fs: { allow: [process.cwd()] } } });
await vite.listen();
const browser = await chromium.launch({ channel:process.env.PLAYWRIGHT_CHANNEL, headless: true, ignoreDefaultArgs: ["--hide-scrollbars"], args: ["--enable-precise-memory-info"] });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(15000);
  await page.addInitScript(() => localStorage.setItem("mpf.next.language", "en"));
  const errors = []; let audioRequests = 0;
  page.on("pageerror", e => errors.push(e.message));
  await page.route("**/assets/dub-sub/fonts/NotoSansThai.ttf", route =>
    route.fulfill({ path: "client/assets/dub-sub/fonts/NotoSansThai.ttf", contentType: "font/ttf" }));
  await page.route("**/outputs/voice-studio/**", route => { audioRequests++; return route.fulfill({ contentType: "audio/wav", body: wav }); });
  await page.route("**/api/**", route => {
    const path = new URL(route.request().url()).pathname;
    if (!path.startsWith("/api/")) return route.continue();
    const json = value => route.fulfill({ contentType: "application/json", body: JSON.stringify(value) });
    if (path === "/api/web-next/config") return json({ creditsEnabled: false });
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
    const sourceAudio = page.locator(".lane-source input[type=checkbox]");
    const speakers = page.locator(".lane-take input[type=checkbox]");
    await page.locator(".lane-source .dub-track-preview span").click();
    assert.equal(await sourceAudio.isChecked(),false);
    assert.equal(await page.locator("video").evaluate(el=>el.muted),true);
    await sourceAudio.check();
    await speakers.first().uncheck();
    assert.equal(await speakers.nth(1).isChecked(),true);
    await speakers.first().check();
    assert.equal(await page.locator("video").evaluate(el=>el.muted),false);
    assert.equal(project.revision,1,"preview toggles leave saved mix untouched");
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
    await page.locator(".dub-line button").nth(i % 10).click();
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
    const timing = page.getByRole("button", { name: "Cue timing and keyboard controls" });
    await timing.click();
    const endBefore = Number(await endInput.inputValue());
    await page.keyboard.press("Escape");
    const trim = originalLane.locator(`[data-cue-id="${selectedCueId}"] .dub-trim.end`), trimBox = await trim.boundingBox();
    await page.mouse.move(trimBox.x + trimBox.width / 2, trimBox.y + trimBox.height / 2); await page.mouse.down();
    await page.mouse.move(trimBox.x + trimBox.width / 2 + 16, trimBox.y + trimBox.height / 2, { steps: 4 }); await page.mouse.up();
    await timing.click();
    assert.ok(Number(await endInput.inputValue()) > endBefore, "pointer trim updates cue end");
    await page.keyboard.press("Escape");
    await page.locator(".dub-timeline-viewport").evaluate(el => {
      el.scrollLeft = (el.scrollWidth - 132) * (230 * 800 / 2400000);
    });
    await page.locator('.lane-subtitle [data-cue-id="cue-230"] button').getByText("Line 230", { exact: true }).click();
    assert.equal(await page.locator(".dub-script select").inputValue(), "en");
    assert.equal(await page.locator(".dub-line.selected").getByLabel("Source language").inputValue(), "Original cue 230");
    assert.ok(await page.locator(".dub-rows").evaluate(el => el.scrollTop > 0));
    assert.equal(await page.locator(".dub-picture video").evaluate(el => el.currentTime), 184);
    await page.locator(".dub-picture video").evaluate(el => {
      el.currentTime = 240.2;
      el.dispatchEvent(new Event("timeupdate"));
    });
    const activeRow = page.locator('.dub-rows [aria-current="time"]');
    await page.waitForFunction(() => document.querySelector('.dub-line[aria-current="time"] textarea')?.value === "Original cue 300");
    assert.ok(await activeRow.evaluate(el => {
      const bounds = el.getBoundingClientRect(), panel = el.closest(".dub-rows").getBoundingClientRect();
      return bounds.top >= panel.top - 1 && bounds.bottom <= panel.bottom + 1;
    }));
    await page.locator(".dub-picture video").evaluate(el => {
      el.currentTime = 240.75;
      el.dispatchEvent(new Event("timeupdate"));
    });
    await activeRow.waitFor({ state: "detached" });
    const edited = page.locator(".dub-line textarea").first();
    const pinned = await edited.elementHandle();
    await pinned.focus();
    await pinned.evaluate(el => el.setSelectionRange(2, 5));
    await page.locator(".dub-rows").evaluate(el => { el.scrollTop += el.clientHeight * 7; });
    await page.waitForFunction(el => el.getBoundingClientRect().bottom < el.closest(".dub-rows").getBoundingClientRect().top, pinned);
    await page.locator(".dub-picture video").evaluate(el => { el.currentTime = 12.1; el.dispatchEvent(new Event("timeupdate")); });
    assert.deepEqual(await pinned.evaluate(el => [el === document.activeElement, el.selectionStart, el.selectionEnd]), [true, 2, 5]);
    await pinned.evaluate(el => el.blur());
    const tracking = await page.evaluate(async () => {
      const video = document.querySelector(".dub-picture video");
      const viewport = document.querySelector(".dub-timeline-viewport");
      const head = viewport.querySelector(".dub-timeline-playhead");
      const frame = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      video.currentTime = 240.6;
      video.dispatchEvent(new Event("play"));
      const offsets = [], anchors = [];
      for (let n = 0; n < 12; n++) {
        video.currentTime = 240.6 + n / 50;
        await frame();
        offsets.push(viewport.scrollLeft);
        anchors.push(head.getBoundingClientRect().left - viewport.getBoundingClientRect().left);
      }
      viewport.dispatchEvent(new WheelEvent("wheel", { bubbles: true, deltaX: -180 }));
      viewport.scrollLeft -= 180;
      const parked = viewport.scrollLeft;
      video.currentTime = 249;
      await frame();
      const held = viewport.scrollLeft === parked;
      video.dispatchEvent(new Event("pause"));
      await frame();
      video.dispatchEvent(new Event("play"));
      await frame();
      const resumed = viewport.scrollLeft > parked;
      video.dispatchEvent(new Event("pause"));
      return { offsets, anchors, held, resumed };
    });
    assert.ok(new Set(tracking.offsets).size >= 9, "scroll continues within a cue and through the following silent gap");
    assert.ok(Math.max(...tracking.anchors) - Math.min(...tracking.anchors) < 3, "head remains anchored while the waveform scrolls");
    assert.ok(tracking.held && tracking.resumed, "manual pan holds until playback restarts");
    await page.getByRole("combobox", { name: "Timeline zoom" }).selectOption("1");
    await page.waitForFunction(() => document.querySelector(".dub-timeline-viewport").scrollLeft === 0);
    const playback = await page.evaluate(async () => {
      const video = document.querySelector(".dub-picture video");
      const viewport = document.querySelector(".dub-timeline-viewport");
      const wave = viewport.querySelector(".lane-source canvas");
      const ruler = viewport.querySelector(".dub-ruler-ticks");
      const head = viewport.querySelector(".dub-timeline-playhead");
      const positions = new Set();
      const geometry = new Set();
      const seekBar = document.querySelector(".dub-transport input[type=range]");
      let backwards = false;
      let previous;
      // Settle the deliberate seek back from the preceding ~249s playback fixture.
      video.currentTime = 13;
      video.dispatchEvent(new Event("timeupdate"));
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      for (let ms = 13100; ms <= 19500; ms += 100) {
        video.currentTime = ms / 1000;
        video.dispatchEvent(new Event("timeupdate"));
        await new Promise(requestAnimationFrame);
        const x = head.getBoundingClientRect().left;
        if (previous !== undefined && x < previous) backwards = true;
        previous = x;
        positions.add(x);
        const bar = seekBar.getBoundingClientRect();
        geometry.add([bar.left, bar.width, viewport.clientWidth, viewport.scrollWidth, viewport.scrollLeft,
          wave.getBoundingClientRect().width, ruler.getBoundingClientRect().left].join("/"));
      }
      return { moving: positions.size > 1, backwards, geometry: [...geometry] };
    });
    assert.equal(playback.moving, true);
    assert.equal(playback.backwards, false);
    assert.equal(playback.geometry.length, 1, "Playback geometry changed: " + playback.geometry.join(", "));
    await page.locator(".dub-picture video").evaluate((video, endMs) => {
      video.currentTime = endMs / 1000;
      video.dispatchEvent(new Event("timeupdate"));
    }, duration);
    await page.waitForFunction(() => {
      const end = document.querySelector(".dub-timeline-content").getBoundingClientRect().right;
      return Math.abs(document.querySelector(".dub-timeline-playhead").getBoundingClientRect().right - end) < 1;
    });
    const stableFit = await page.locator(".dub-timeline-viewport").evaluate(async el => {
      const width = el.clientWidth;
      for (let i = 0; i < 30; i++) {
        await new Promise(requestAnimationFrame);
        if (el.clientWidth !== width || el.scrollWidth !== width || el.scrollLeft !== 0) return false;
      }
      return true;
    });
    assert.ok(stableFit, "the end playhead cannot create a horizontal scrollbar in fit mode");
    await page.locator(".dub-script select").selectOption("th");
    await page.locator(".dub-picture video").evaluate((video, ms) => {
      Object.defineProperties(video, { videoWidth: { value: 1080 }, videoHeight: { value: 1920 } });
      video.dispatchEvent(new Event("loadedmetadata"));
      video.currentTime = ms / 1000;
      video.dispatchEvent(new Event("timeupdate"));
    }, cues.at(-1).startMs + 100);
    const portraitText = wrapSubtitle(thaiDialogue, "th", { font: "sans", size: 48, x: 50, maxChars: 42 }, 9/16);
    assert.ok(portraitText.includes("\n"), "portrait fixture spans multiple lines");
    await page.waitForFunction(text => document.querySelector('.dub-caption[lang="th"]')?.textContent === text, portraitText);
    const layout = await page.locator('.dub-caption[lang="th"]').evaluate(async el => {
      await document.fonts.ready;
      const rect = el.getBoundingClientRect(), picture = el.parentElement.getBoundingClientRect();
      return { inside: rect.left >= picture.left && rect.right <= picture.right,
        lines: Math.round(rect.height / parseFloat(getComputedStyle(el).lineHeight)) };
    });
    assert.ok(layout.inside, "Thai portrait caption fits inside the video");
    assert.equal(layout.lines, portraitText.split("\n").length, "browser keeps the renderer's explicit line breaks");
    await fs.mkdir("_temp/dub-timeline", { recursive: true });
    for (const width of [390, 820, 1440]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 768 });
      await page.waitForTimeout(80);
      for (const language of ["en", "th"]) {
        await page.locator(".header-actions select").selectOption(language);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `no document overflow at ${width}/${language}`);
        assert.ok(await page.locator(".dub-timeline-viewport").evaluate(el => el.clientHeight >= 135 && el.getBoundingClientRect().bottom <= innerHeight), "waveform and caption lanes fit on screen");
        assert.ok(!(await page.locator(".dub-timeline").innerText()).includes("subtitleTrack"));
        await page.locator(".dub-timeline").screenshot({ path: `_temp/dub-timeline/timeline-${width}-${language}.png` });
      }
    }
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ mode: baseline ? "baseline" : "implemented", ...metrics, audioRequests }, null, 2));
} finally { await browser.close(); await vite.close(); }

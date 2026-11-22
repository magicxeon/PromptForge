// Isolated browser journey against the production Dub routes and real FFmpeg. No provider dispatch.
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import express from "express";
import { chromium } from "playwright";
import { createServer } from "vite";
import { DubProjectRepository } from "../../server/repositories/dub-sub/DubProjectRepository.js";
import { DubProjectService } from "../../server/domain/dub-sub/DubProjectService.js";
import { DubLanguageService } from "../../server/domain/dub-sub/DubLanguageService.js";
import { registerDubSubRoutes } from "../../server/app/routes/dubSubRoutes.js";

const root = await fs.mkdtemp(path.join(os.tmpdir(), "dub-ui-"));
const actor = {
  userId: "fixture",
  username: "fixture",
  displayName: "Preview",
  role: "admin",
  authMode: "development_bypass",
  accountStatus: "active",
};
let completeTranslation;
let translationCalls = 0;
const translationInputs = [];
const languageService = new DubLanguageService({ sceneGeneration: {
  assertAccess() {}, assertAvailable() {},
  async translate(_actor, context) {
    translationCalls++;
    translationInputs.push(context);
    if (translationCalls === 1) await new Promise((resolve) => {
      completeTranslation = resolve;
    });
    return { cues: context.cues.map(c => ({ id: c.id, translation: "Scene line",
      delivery:{ emotion:"calm", pace:"slow", intensity:"subtle", direction:"Speak gently." } })) };
  },
}});
const projects = new DubProjectService({
  languageService,
  repo: new DubProjectRepository(root),
  voiceStudio: {
    withDubTakePins: async (_a, _id, _takeIds, commit) => commit(),
  },
});
const app = express();
app.use(express.json(), (req, res, next) => {
  req.actorContext = actor;
  req.reauthorizeIdentity = async () => actor;
  next();
});
app.get("/api/web-next/config", (_, res) => res.json({ creditsEnabled: false }));
app.get("/api/auth/config", (_, res) =>
  res.json({
    contractVersion: 1,
    authMode: actor.authMode,
    development: { liveGeneration: true },
    methods: {
      password: false,
      emailOtp: false,
      google: false,
      facebook: false,
    },
    csrfToken: "fixture",
    policy: {
      otpDigits: 6,
      otpExpiresSeconds: 300,
      resendSeconds: 30,
      passwordMinLength: 8,
      passwordMaxLength: 128,
    },
    legal: { termsVersion: null, privacyVersion: null },
  }),
);
app.get("/api/me", (_, res) => res.json(actor));
app.get("/api/voice-studio/catalog", (_, res) => res.json({
  catalogVersion: "fixture", defaultModelId: "fixture",
  models: [{ id: "dola-seed-audio", providerId: "fixture", displayName: "Fixture", capabilities: { languages: ["th"] } }],
  voices: [{ id: "fixture", displayName: "Fixture voice", modelIds: ["fixture"], languages: ["th"] }],
  policy: { maxRows: 10, maxTextLength: 1000, maxStyleLength: 200, inlineTags: [] },
}));
app.get("/api/voice-studio/characters", (_, res) => res.json({ items: [] }));
app.get("/api/voice-studio/custom-voices", (_, res) => res.json({ items: [{
  id:"seed-fixture", revision:1, operationId:"fixture", name:"Thai fixture", displayDescription:"Warm", designPrompt:"Warm",
  modelId:"dola-seed-audio", providerId:"fixture", language:"th", sourceType:"description", previewAssetId:"sample",
  audioUrl:"/outputs/voice-studio/sample.wav", durationMs:1000, savedAt:new Date().toISOString(), archivedAt:null,
  expiresAt:null, createdAt:new Date().toISOString(), lifecycleState:"ready",
}] }));
registerDubSubRoutes(app, { projects });
app.use("/assets/dub-sub/fonts", express.static("client/assets/dub-sub/fonts"));
app.use("/api", (_, res) => res.status(404).json({ error: "Offline fixture" }));
const vite = await createServer({
  root: "web-next",
  cacheDir: path.join(root, "vite-cache"),
  configFile: false,
  server: { middlewareMode: true, hmr: false, fs: { allow: [process.cwd()] } },
});
app.use(vite.middlewares);
const server = await new Promise((resolve) => {
  const s = app.listen(0, "127.0.0.1", () => resolve(s));
});
let browser;
try {
  execFileSync(
    "ffmpeg",
    [
      "-nostdin",
      "-v",
      "error",
      "-f",
      "lavfi",
      "-i",
      "color=c=navy:s=320x180:d=4",
      "-f",
      "lavfi",
      "-i",
      "sine=duration=4",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      path.join(root, "scene.mp4"),
    ],
    { windowsHide: true },
  );
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  page.setDefaultTimeout(12000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() =>
    localStorage.setItem("mpf.next.language", "en"),
  );
  const origin = "http://127.0.0.1:" + server.address().port;
  await page.goto(origin + "/dub-sub");
  assert.equal(
    await page.evaluate(async () => {
      const { speakerGain } =
        await import("/src/features/dub-sub/SpeakerMixer.tsx");
      return speakerGain({}, "constructor");
    }),
    1,
  );
  await page.getByRole("button", { name: "Create", exact: true }).click();
  const form = page.getByRole("dialog");
  const era = "จีนโบราณ ใช้คำเรียกตามฐานะ";
  const context = "นางเอกปลอมตัวเป็นคนรับใช้";
  await form.getByLabel("Era and language style", { exact: false }).fill(era);
  await form
    .getByLabel("Story or scene context", { exact: false })
    .fill(context);
  for (const width of [390, 820, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    assert.ok(
      await form.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    );
  }
  await form
    .locator('input[type="file"]')
    .setInputFiles(path.join(root, "scene.mp4"));
  const preview = await form.locator("video").elementHandle();
  await form.getByRole("checkbox", { name: "English" }).check();
  let projectCreates = 0;
  page.on("request", (req) => {
    if (
      req.method() === "POST" &&
      new URL(req.url()).pathname === "/api/dub-sub/projects"
    )
      projectCreates++;
  });
  await page.route(
    "**/api/dub-sub/projects/*/media",
    (route) =>
      route.fulfill({ status: 415, json: { error: "unsupported_video" } }),
    { times: 1 },
  );
  await form.getByRole("button", { name: "Create project only", exact: true }).click();
  await form.getByRole("alert").waitFor();
  await form.locator('input[type="file"]').setInputFiles({
    name: "replacement.mp4",
    mimeType: "video/mp4",
    buffer: await fs.readFile(path.join(root, "scene.mp4")),
  });
  await form.getByRole("button", { name: "Create project only", exact: true }).click();
  await page.waitForURL("**/projects/*");
  assert.equal(
    projectCreates,
    1,
    "replacing rejected footage reuses the draft project",
  );
  await page.waitForFunction(
    (el) => !el.isConnected && !el.hasAttribute("src"),
    preview,
  );
  await page.locator(".dub-picture video").waitFor();
  await page.waitForFunction(() => document.querySelector(".dub-picture video")?.readyState >= 2);
  await page.evaluate(() => document.activeElement?.blur());
  await page.keyboard.down("Space");
  await page.waitForFunction(() => !document.querySelector(".dub-picture video").paused);
  await page.keyboard.down("Space");
  assert.equal(await page.locator(".dub-picture video").evaluate(el => el.paused), false);
  await page.keyboard.up("Space");
  await page.keyboard.press("Space");
  await page.waitForFunction(() => document.querySelector(".dub-picture video").paused);
  await page.getByRole("button", { name: "Add cue" }).click();
  const inspector = page.locator(".dub-inspector");
  const line = page.locator(".dub-line.selected");
  await line.getByRole("textbox", { name: "Source language" }).fill("你好");
  await line.getByRole("textbox", { name: "Thai" }).fill("สวัสดี");
  assert.equal(await inspector.getByRole("textbox", { name: "Thai" }).count(), 0);
  const voicePicker = inspector.getByRole("combobox", { name: "Dubbing voice" });
  await voicePicker.selectOption("seed-fixture");
  assert.equal(await voicePicker.inputValue(), "seed-fixture");
  await inspector.getByRole("button", { name: "Tracks" }).click();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByText("Saved", { exact: true }).waitFor();
  const caption = page.getByRole("slider", { name: /Thai subtitle position/ });
  const beforeY = await caption.getAttribute("aria-valuenow");
  const beforeX = await caption.evaluate(el => el.style.left);
  const box = await caption.boundingBox();
  const fromX = box.x + box.width / 2, fromY = box.y + box.height / 2;
  await page.mouse.move(fromX, fromY);
  await page.mouse.down();
  await page.mouse.move(fromX + 35, fromY - 25, { steps: 4 });
  const draggedY = await caption.getAttribute("aria-valuenow");
  assert.ok(Number(draggedY) < Number(beforeY));
  assert.equal(await page.getByRole("button", { name: "Save", exact: true }).isDisabled(), true);
  await page.mouse.up();
  assert.equal(await caption.evaluate(el => el.style.left), beforeX);
  await page.getByRole("button", { name: "Undo" }).click();
  assert.equal(await caption.getAttribute("aria-valuenow"), beforeY);
  await page.getByRole("button", { name: "Redo" }).click();
  assert.equal(await caption.getAttribute("aria-valuenow"), draggedY);
  await caption.press("ArrowUp");
  assert.equal(Number(await caption.getAttribute("aria-valuenow")), Number(draggedY) - 1);
  for (const width of [390, 820, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(80);
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      "overflow at " + width,
    );
  }

  await inspector
    .getByRole("button", { name: "Subtitle style" })
    .nth(1)
    .click();
  const fontPicker = inspector.getByLabel("Font family");
  assert.equal(await fontPicker.inputValue(), "sans");
  await fontPicker.selectOption("serif");
  assert.match(await caption.evaluate(el => el.style.fontFamily), /^"Dub Noto Serif Thai"/);
  const loadedFaces = await page.evaluate(async () => {
    const faces = await document.fonts.load('32px "Dub Noto Serif Thai"', "สวัสดี");
    return faces.map(face => face.status);
  });
  assert.deepEqual(loadedFaces, ["loaded"]);
  await fontPicker.selectOption("sans");
  await inspector.getByLabel("Text color").selectOption("yellow");
  assert.deepEqual(await inspector.getByRole("slider").evaluateAll(sliders=>sliders.map(slider=>slider.value)), ["32","29"]);
  assert.equal(await inspector.getByRole("slider").count(), 2);
  await inspector.getByLabel("Lock track").check();
  assert.equal(await caption.getAttribute("aria-disabled"), "true");
  assert.equal(await line.getByRole("textbox", { name: "Thai" }).getAttribute("readonly"), "");
  assert.equal(await line.getByRole("textbox", { name: "Source language" }).getAttribute("readonly"), null);
  await inspector.getByRole("button", { name: /Tracks/ }).click();
  const thaiTrack = inspector.getByRole("region", { name: "Thai", exact: true });
  await thaiTrack.locator("summary").click();
  assert.ok(await thaiTrack.getByRole("button", { name: "Translate all lines" }).isDisabled());
  await thaiTrack.getByRole("button", { name: "Unlock Thai track" }).click();
  assert.ok(await thaiTrack.getByRole("button", { name: "Translate all lines" }).isEnabled());
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByText("Saved", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const out = page.getByRole("dialog");
  await out.getByLabel("File format").selectOption("srt");
  await out.getByRole("button", { name: "Export", exact: true }).click();
  const download = out.getByRole("link", { name: "Download SRT", exact: true });
  await download.waitFor();
  assert.match(
    await (
      await page.request.get(
        new URL(await download.getAttribute("href"), origin).href,
      )
    ).text(),
    /สวัสดี/,
  );
  await page.reload();
  await page.getByRole("link", { name: /Download SRT/i }).waitFor();
  const englishTrack = inspector.getByRole("region", { name: "English", exact: true });
  await englishTrack.locator("summary").click();
  const translateDialog = page.getByRole("dialog", { name: "Translate all lines" });
  await englishTrack.getByRole("button", { name: "Translate all lines" }).click();
  await translateDialog.getByRole("button", { name: "Translate all lines" }).click();
  await page.waitForFunction(
    () => document.querySelector(".dub-editor fieldset")?.disabled,
  );
  for (let i = 0; i < 40 && !completeTranslation; i++)
    await new Promise((resolve) => setTimeout(resolve, 50));
  assert.ok(completeTranslation);
  await page.reload();
  await page.getByText("Processing history").waitFor();
  completeTranslation();
  await page.locator(".dub-script select").selectOption("en");
  await page.waitForFunction(() => document.querySelector('.dub-line textarea[aria-label="English"]')?.value === "Scene line");
  assert.equal(translationCalls, 1);
  assert.equal(translationInputs[0].targetLanguage, "en");
  assert.equal(translationInputs[0].storyContext, context);
  assert.equal(translationInputs[0].languageStyle, era);
  await englishTrack.locator("summary").click();
  const retranslate = englishTrack.getByRole("button", { name: "Translate all lines" });
  await retranslate.click();
  assert.match(await translateDialog.innerText(), /English/);
  await translateDialog.getByRole("button", { name: "Cancel" }).click();
  assert.equal(translationCalls, 1);
  await retranslate.click();
  await translateDialog.getByRole("button", { name: "Translate all lines" }).click();
  await page.waitForFunction(() => !document.querySelector(".dub-layout").disabled);
  assert.equal(translationInputs[1].targetLanguage, "en");
  await page.locator(".dub-script select").selectOption("th");
  assert.equal(await line.getByRole("textbox", { name: "Thai" }).inputValue(), "สวัสดี");
  const currentVideo = await page.locator(".dub-picture video").elementHandle();
  const sceneButton = page.getByRole("button", { name: "Transcribe again with Gemini" });
  let sends = 0;
  await page.route("**/api/dub-sub/projects/*/transcribe", async route => {
    const body = route.request().postDataJSON();
    if (body.method !== "gemini-scene") return route.continue();
    assert.equal(body.confirmed, true);
    assert.equal(body.language, "th");
    sends++;
    await route.fulfill({ json: { language: "zh", cues: [{ id: "scene_line_1", startMs: 500, endMs: 1800,
      text: "客栈在哪儿？", speaker: "Guest", sourceOrigin: "gemini", translations: { th: "โรงเตี๊ยมอยู่ที่ใด" }, translationOrigins: {th: "gemini"} }] } });
  });
  await sceneButton.click();
  const sceneDialog = page.getByRole("dialog", { name: "Transcribe and translate with Gemini" });
  assert.equal(await sceneDialog.getByLabel(/Story or scene context/).inputValue(), context);
  await sceneDialog.getByRole("button", { name: "Cancel" }).click();
  assert.equal(sends, 0);
  await sceneButton.click();
  await sceneDialog.getByRole("button", { name: "Send audio to Gemini" }).click();
  await sceneDialog.getByText("โรงเตี๊ยมอยู่ที่ใด").waitFor();
  assert.equal(await line.getByRole("textbox", { name: "Thai" }).inputValue(), "สวัสดี");
  for (const width of [390, 820, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    assert.ok(await sceneDialog.evaluate(el => el.scrollWidth <= el.clientWidth + 1));
  }
  await sceneDialog.getByRole("button", { name: "Use these subtitles" }).click();
  const speakerDialog = page.getByRole("dialog", { name: "Dub project" });
  await speakerDialog.locator(".dub-cast-row summary").click();
  await speakerDialog.getByLabel("Character name").fill("Inn guest");
  await speakerDialog.getByRole("button", { name: "Set up dubbing voices" }).click();
  await page.getByRole("heading", { name: "Dubbing voices", exact: true }).waitFor();
  await page.goBack();
  assert.equal(await speakerDialog.getByLabel("Character name").inputValue(), "Inn guest");
  await speakerDialog.getByRole("button", { name: "Close", exact:true }).click();
  await page.getByText("Current subtitles · Translated with Gemini", {exact:true}).waitFor();
  assert.equal(await line.getByRole("textbox", { name: "Thai" }).inputValue(), "โรงเตี๊ยมอยู่ที่ใด");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await page.getByText("Saved", { exact: true }).waitFor();
  assert.equal(sends, 1);
  await page
    .getByRole("link", { name: "Projects", exact: true })
    .first()
    .click();
  await page.getByRole("link", { name: "scene", exact: true }).waitFor();
  await page.locator(".dub-projects summary").first().click();
  await page.getByRole("button", { name: "Edit project", exact: true }).click();
  const rename = page.getByRole("dialog", { name: "Edit project" });
  assert.equal(
    await rename.getByLabel(/Era and language style/).inputValue(),
    era,
  );
  assert.equal(
    await rename.getByLabel(/Story or scene context/).inputValue(),
    context,
  );
  await rename.getByLabel(/Era and language style/).fill("Contemporary");
  await rename.getByLabel(/Story or scene context/).fill("");
  await rename.getByLabel("Project name").fill("Scene two");
  await rename.getByRole("button", { name: "Save" }).click();
  await page.getByRole("link", { name: "Scene two", exact: true }).waitFor();
  const savedProject = await projects.get(
    actor,
    (await projects.list(actor, {})).items[0].id,
  );
  assert.equal(savedProject.languageStyle, "Contemporary");
  assert.equal(savedProject.storyContext, "");
  assert.equal(savedProject.cues[0].translations.en, "Scene line");
  await page.waitForFunction(
    (el) => !el.isConnected && !el.hasAttribute("src"),
    currentVideo,
  );
  const actions = page.locator(".dub-project-menu summary").first();
  const deleteButton = page.getByRole("button", { name: "Delete project", exact: true });
  assert.equal(await deleteButton.count(), 0);
  for (const width of [390, 820, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await actions.click();
    const bounds = await deleteButton.boundingBox();
    assert.ok(bounds && bounds.x >= 0 && bounds.x + bounds.width <= width, "project actions fit in the viewport");
    await actions.press("Escape");
  }
  await actions.click();
  await deleteButton.click();
  const confirmation = page.getByRole("dialog", { name: "Delete project" });
  assert.ok((await confirmation.innerText()).includes("Scene two"));
  await confirmation.getByRole("button", { name: "Cancel" }).click();
  assert.equal((await projects.list(actor, {})).items.length, 1);
  await actions.click();
  await deleteButton.click();
  await confirmation.getByRole("button", { name: "Delete project" }).click();
  await confirmation.waitFor({ state: "detached" });
  await page.getByRole("link", { name: "Scene two", exact: true }).waitFor({ state: "detached" });
  assert.equal((await projects.list(actor, {})).items.length, 0);
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await form.locator('input[type="file"]').setInputFiles(path.join(root, "scene.mp4"));
  await form.getByRole("button", { name: "Create and transcribe with Gemini" }).click();
  await sceneDialog.getByText("New preview · Not applied").waitFor();
  assert.equal(sends, 2);
  await sceneDialog.getByRole("button", { name: "Use these subtitles" }).click();
  await speakerDialog.getByRole("button", { name: "Save assignments" }).click();
  await page.getByText("Saved", { exact: true }).waitFor();
  await page.reload();
  await page.getByText("Current subtitles · Translated with Gemini", {exact:true}).waitFor();
  assert.equal(sends, 2, "reloading an editor must never submit media again");
  assert.deepEqual(errors, []);
  console.log(
    "PASS create/upload, two targets, edit/save, style, responsive bounds, SRT export, reload and private video teardown",
  );
} finally {
  await browser?.close();
  await vite.close();
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  await fs.rm(root, { recursive: true, force: true });
}

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
const languageService = {
  async translate(project, language) {
    translationCalls++;
    await new Promise((resolve) => {
      completeTranslation = resolve;
    });
    return project.cues.map((c) => ({
      ...c,
      translations: { ...c.translations, [language]: "Scene line" },
    }));
  },
};
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
app.get("/api/auth/config", (_, res) =>
  res.json({
    contractVersion: 1,
    authMode: actor.authMode,
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
  await form.getByRole("button", { name: "Create", exact: true }).click();
  await form.getByRole("alert").waitFor();
  await form.locator('input[type="file"]').setInputFiles({
    name: "replacement.mp4",
    mimeType: "video/mp4",
    buffer: await fs.readFile(path.join(root, "scene.mp4")),
  });
  await form.getByRole("button", { name: "Create", exact: true }).click();
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
  await page.getByRole("button", { name: "Add cue" }).click();
  const inspector = page.locator(".dub-inspector");
  await inspector.getByLabel("Source language").fill("你好");
  await inspector
    .getByLabel("Thai", { exact: true })
    .filter({ visible: true })
    .last()
    .fill("สวัสดี");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByText("Saved", { exact: true }).waitFor();
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
  await inspector.getByLabel("Text color").selectOption("yellow");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByText("Saved", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const out = page.getByRole("dialog");
  await out.getByLabel("File format").selectOption("srt");
  await out.getByRole("button", { name: "Export", exact: true }).click();
  const download = page.getByRole("link", { name: /Download SRT/i });
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
  await page.locator(".dub-script select").selectOption("en");
  await page.getByRole("button", { name: "Translate dialogue" }).click();
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
  await page.locator(".dub-rows").getByText("Scene line").waitFor();
  assert.equal(translationCalls, 1);
  const currentVideo = await page.locator(".dub-picture video").elementHandle();
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

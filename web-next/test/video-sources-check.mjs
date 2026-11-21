// Focused VID04/VID05 acceptance. Every API/media call is intercepted; no provider calls.
import { chromium } from "playwright";
import assert from "node:assert/strict";
import sharp from "sharp";

const png = await sharp({ create: { width: 640, height: 480, channels: 3, background: "#739b83" } }).png().toBuffer();
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addInitScript(() => localStorage.setItem("mpf.next.language", "en"));
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  const errors = [], unexpected = [];
  page.on("pageerror", error => errors.push(error.message));
  let uploadCount = 0, videoPosts = 0, otherPaidPosts = 0, submittedInput;
  let releaseUpload, lateUploadFinished;
  const delayedResponse = new Promise(resolve => { lateUploadFinished = resolve; });
  const config = { contractVersion: 1, authMode: "development_bypass", methods: { password: false, emailOtp: false, google: false, facebook: false }, csrfToken: "fixture", policy: { otpDigits: 6, otpExpiresSeconds: 300, resendSeconds: 30, passwordMinLength: 8, passwordMaxLength: 128 }, legal: { termsVersion: null, privacyVersion: null } };
  const imageItem = { id: "image_handoff", prompt: "Original Image prompt", imageUrl: "/outputs/handoff.png", thumbnailUrl: "/outputs/handoff.png", timestamp: Date.now(), provider: "fixture", submodel: "Image fixture", mode: "normal", width: 640, height: 480 };
  const model = { providerId: "fixture", modelId: "video-fixture", displayName: "Video fixture", operations: ["text_to_video", "image_to_video", "character_to_video"], inputModes: ["text_to_video", "image_to_video", "multimodal_reference"], durationControlMode: "exact", durations: [4, 5, 6], resolutions: ["720p"], aspectRatios: ["16:9"], audioModes: ["none"], referenceImageLimit: 9, supportsFirstFrame: true, firstFrameEnabled: true, supportsOrderedImageReferences: true, supportsLastFrame: false, qualificationStatus: "qualified", paidRoutingEnabled: true };
  const failedTask = () => ({ id: "submitted_fixture", status: "failed", providerId: "fixture", modelId: model.modelId, submittedRequest: submittedInput, providerError: { code: "video_provider_input_image_rejected", referenceIssues: [{ contentIndex: 1, referenceIndex: 0, reason: "possible_real_person" }, { contentIndex: 3, referenceIndex: 2, reason: "possible_real_person" }] } });
  await page.route("**/outputs/**", route => route.fulfill({ contentType: "image/png", body: png }));
  await page.route("**/api/**", async route => {
    const req = route.request(), path = new URL(req.url()).pathname;
    if (!path.startsWith("/api/")) return route.continue();
    const json = value => route.fulfill({ contentType: "application/json", body: JSON.stringify(value) });
    if (path === "/api/auth/config") return json(config);
    if (path === "/api/web-next/config") return json({ creditsEnabled: true });
    if (path === "/api/me") return json({ userId: "fixture", username: "fixture", displayName: "Fixture", role: "admin", authMode: config.authMode, accountStatus: "active" });
    if (path === "/api/me/preferences") return json({ confirmCreditUsage: false });
    if (path === "/api/generation/video/capabilities") return json({ schemaVersion: 1, catalogVersion: "fixture", mediaType: "video", promptMaximumCharacters: 10000, models: [model], comparison: { enabled: false, minimumSlots: 2, maximumSlots: 2 }, launchStatus: "available" });
    if (path === "/api/generation/video/quote") return json({ estimate: { estimateId: "video_quote", estimatedCredits: 2, expiresAt: new Date(Date.now() + 60000).toISOString(), chargeMode: "user_credits" }, account: { availableCredits: 100, canAfford: true }, requestFingerprint: "fixture" });
    if (path === "/api/generation/video/tasks" && req.method() === "POST") { videoPosts++; submittedInput = req.postDataJSON(); return json(failedTask()); }
    if (path === "/api/generation/video/tasks") return json({ items: videoPosts ? [failedTask()] : [], hasMore: false });
    if (path === "/api/generation/video/tasks/submitted_fixture") return json(failedTask());
    if (path === "/api/generation/job-center") return json({ items: [], activeCount: 0, terminalCount: 0, polledAt: new Date().toISOString() });
    if (path === "/api/references") {
      const number = ++uploadCount;
      const uploaded = { referenceId: `asset-${number}`, imageUrl: `/outputs/upload-${number}.png`, mimeType: "image/png", byteSize: png.length, width: 640, height: 480, source: "upload" };
      if (number === 2) return route.fulfill({ status: 422, contentType: "application/json", body: JSON.stringify({ error: { code: "fixture_invalid_image", message: "Fixture upload rejection" } }) });
      if (number === 3) { await new Promise(resolve => { releaseUpload = resolve; }); await json(uploaded); lateUploadFinished(); return; }
      return json(uploaded);
    }
    if (path === "/api/providers") return json({ defaultProvider: "fixture", providers: [{ id: "fixture", displayName: "Fixture", defaultModel: "image", models: [{ id: "image", displayName: "Image fixture", capabilities: { imageGeneration: true, imageReferences: true, maxReferenceImages: 6, aspectRatios: ["1:1"], resolutions: ["1K"] }, defaults: { resolution: "1K" } }] }] });
    if (path === "/api/history") return json({ items: [imageItem], hasMore: false, nextCursor: null });
    if (path === "/api/credits/estimate") return json({ estimate: { estimateId: "image_quote", estimatedCredits: 1, expiresAt: Date.now() + 60000 }, account: { availableCredits: 100, canAfford: true } });
    if (path === "/api/generation/prompt-preview") return json({ compiledPrompt: "fixture" });
    if (path === "/api/references/processing-plan") return json({ status: "accepted", planVersion: 1, references: [] });
    if (path === "/api/generate" || path === "/api/comparisons") { otherPaidPosts++; return route.abort(); }
    unexpected.push(`${req.method()} ${path}`);
    return route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: { message: `Unmocked ${path}` } }) });
  });
  const file = name => ({ name, mimeType: "image/png", buffer: png });
  const sources = () => page.locator(".video-source");
  const addFiles = files => page.locator('.video-sources input[type="file"][multiple]').setInputFiles(files);
  const draft = () => page.evaluate(() => JSON.parse(localStorage.getItem("mpf.react.draft:development_bypass:fe24-video:fixture")).payload);
  await page.goto("http://127.0.0.1:6502/video");
  await page.locator("#prompt").fill("Keep my Video prompt").catch(async error => {
    console.error("Initial UI", await page.locator("body").innerText(), "Page errors", errors, "Unmocked", unexpected);
    throw error;
  });
  await page.locator(".video-editor > label select").selectOption("image_to_video");
  await addFiles([file("good.png"), file("bad.png")]);
  await page.getByText("Upload failed. Replace this file to retry.", { exact: true }).waitFor();
  assert.equal(await sources().count(), 2);
  assert.equal((await draft()).sources.filter(source => source.status === "ready").length, 1);
  assert.ok(await page.getByRole("button", { name: "Generate video", exact: true }).isDisabled());
  console.log("PASS VID04: mixed successful/failed uploads retain both editable rows and block submission.");

  await addFiles([file("delayed.png")]);
  await sources().nth(2).getByText("Uploading…", { exact: true }).waitFor();
  while (!releaseUpload) await new Promise(resolve => setTimeout(resolve, 20));
  await sources().nth(2).getByRole("button", { name: "Remove", exact: true }).click();
  releaseUpload(); await delayedResponse;
  await page.waitForFunction(() => !JSON.parse(localStorage.getItem("mpf.react.draft:development_bypass:fe24-video:fixture")).payload.sources.some(source => source.storageKey === "upload-3.png"));
  await page.waitForTimeout(150);
  assert.equal(await sources().count(), 2);
  assert.equal((await draft()).sources.some(source => source.storageKey === "upload-3.png"), false);
  console.log("PASS VID04: removal during pending upload rejects the late successful reply.");

  await sources().nth(1).locator('input[type="file"]').setInputFiles(file("replacement.png"));
  await page.waitForFunction(() => JSON.parse(localStorage.getItem("mpf.react.draft:development_bypass:fe24-video:fixture")).payload.sources.every(source => source.status === "ready"));
  assert.equal(uploadCount, 4);
  assert.equal((await draft()).sources[0].storageKey, "upload-1.png");
  await addFiles([file("third.png")]);
  await page.locator(".video-submit .primary-button:not(:disabled)").waitFor();
  await page.getByRole("button", { name: "Generate video", exact: true }).click();
  await page.locator(".video-source.is-invalid").nth(1).waitFor();
  assert.equal(videoPosts, 1);
  assert.deepEqual(submittedInput.references.map(source => source.referenceImageUrl), ["/outputs/upload-1.png", "/outputs/upload-4.png", "/outputs/upload-5.png"]);
  assert.equal(await sources().nth(0).getAttribute("class"), "video-source is-invalid");
  assert.equal(await sources().nth(1).getAttribute("class"), "video-source ");
  assert.equal(await sources().nth(2).getAttribute("class"), "video-source is-invalid");
  assert.equal(await page.locator(".video-source.is-invalid").getByRole("button", { name: "Remove", exact: true }).count(), 2);
  assert.equal(await page.locator('.video-source.is-invalid input[type="file"]').count(), 2);
  await sources().nth(0).getByRole("button", { name: "Remove", exact: true }).click();
  assert.equal(await sources().nth(0).getAttribute("class"), "video-source ");
  assert.equal(await sources().nth(1).getAttribute("class"), "video-source is-invalid");
  await sources().nth(1).locator('input:not([type="file"])').fill("Renamed same rejected image");
  assert.equal(await sources().nth(1).getAttribute("class"), "video-source is-invalid", "renaming must retain the rejection for the same asset");
  console.log("PASS VID04: both provider-mapped references are highlighted and editable; removing an earlier row preserves the correct later highlight.");
  await sources().nth(1).locator('input[type="file"]').setInputFiles(file("provider-replacement.png"));
  await page.waitForFunction(() => JSON.parse(localStorage.getItem("mpf.react.draft:development_bypass:fe24-video:fixture")).payload.sources[1]?.storageKey === "upload-6.png");
  assert.equal(await page.locator(".video-source.is-invalid").count(), 0, "a replacement file must not inherit the previous submitted file's provider rejection");
  console.log("PASS VID04: replacing a rejected reference clears the old file's provider highlight.");

  const beforeHandoff = await draft();
  await page.getByRole("link", { name: "Image", exact: true }).click();
  await page.locator(".handoff-actions").waitFor();
  await page.locator("#prompt").fill("Keep my Image prompt");
  await page.getByRole("button", { name: "Use in Video", exact: true }).click();
  await page.getByRole("dialog", { name: "Apply to Video draft?" }).waitFor();
  assert.deepEqual(await page.getByRole("dialog").locator("li").allTextContents(), ["Image references"]);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  assert.deepEqual(await draft(), beforeHandoff);
  assert.equal(await page.locator("#prompt").inputValue(), "Keep my Video prompt");
  assert.equal(videoPosts, 1);
  await page.getByRole("link", { name: "Image", exact: true }).click();
  await page.locator(".handoff-actions").waitFor();
  assert.equal(await page.locator("#prompt").inputValue(), "Keep my Image prompt");
  await page.getByRole("button", { name: "Use in Video", exact: true }).click();
  await page.getByRole("button", { name: "Apply changes", exact: true }).click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem("mpf.react.draft:development_bypass:fe24-video:fixture")).payload.sources[0]?.generationId === "image_handoff");
  const afterHandoff = await draft();
  assert.deepEqual({ ...afterHandoff, sources: [] }, { ...beforeHandoff, sources: [] });
  assert.equal(afterHandoff.sources.length, 1);
  assert.equal(videoPosts, 1); assert.equal(otherPaidPosts, 0);
  await page.reload(); await page.locator("#prompt").waitFor();
  assert.equal(await page.getByRole("dialog").count(), 0, "handled navigation state must not reopen confirmation");
  assert.equal((await draft()).sources[0].generationId, "image_handoff");
  assert.deepEqual(errors, []); assert.deepEqual(unexpected, []);
  console.log("PASS VID05: handoff lists changed fields; Cancel retains the complete Video draft; Confirm changes only references; Image draft survives; reload does not replay handoff; no auto-generation.");
  console.log("PASS focused Video sources/handoff browser acceptance. All API/media intercepted; exactly one fixture Video POST, zero other generation POSTs.");
} finally { await browser.close(); }

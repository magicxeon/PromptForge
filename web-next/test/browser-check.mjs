// Isolated browser acceptance: all API/media requests intercepted; never invokes a provider.
import { chromium } from "playwright";
import sharp from "sharp";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const output = new URL("../../_temp/fe24/", import.meta.url);
await fs.mkdir(output, { recursive: true });
const png = await sharp({
  create: { width: 1600, height: 1000, channels: 3, background: "#7e9e88" },
})
  .png()
  .toBuffer();
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  locale: "en-US",
  hasTouch: true,
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
let posts = 0,
  ready = false,
  delayIdentity = false,
  lastRequest = null;
let fixtureRole = "admin", previewCalls = 0, identityCalls = 0, mediaCalls = 0;
const item = {
  id: "fixture_job",
  prompt: "A quiet green landscape, soft morning light",
  imageUrl: "/outputs/fixture/image.png",
  thumbnailUrl: "/outputs/fixture/thumb.png",
  timestamp: Date.now(),
  provider: "fixture",
  submodel: "Image model",
  mode: "normal",
  width: 1600,
  height: 1000,
};
const config = {
  contractVersion: 1,
  authMode: "development_bypass",
  methods: { password: false, emailOtp: false, google: false, facebook: false },
  csrfToken: "fixture-only",
  policy: {
    otpDigits: 6,
    otpExpiresSeconds: 300,
    resendSeconds: 30,
    passwordMinLength: 8,
    passwordMaxLength: 128,
  },
  legal: { termsVersion: null, privacyVersion: null },
};
await page.route("**/outputs/**", (route) => {
  mediaCalls++;
  return route.fulfill({ contentType: "image/png", body: png });
});
await page.route("**/api/**", async (route) => {
  const request = route.request();
  const url = new URL(request.url());
  const path = url.pathname;
  if (!path.startsWith("/api/")) return route.continue();
  const json = (value) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(value),
    });
  if (path === "/api/auth/config") {
    identityCalls++;
    if (delayIdentity) await new Promise((resolve) => setTimeout(resolve, 650));
    return json(config);
  }
  if (path === "/api/web-next/config") return json({ creditsEnabled: true });
  if (path === "/api/me")
    return json({
      userId: "fixture",
      username: "fixture",
      displayName: "Preview account",
      role: fixtureRole,
      authMode: config.authMode,
      accountStatus: "active",
    });
  if (path === "/api/providers")
    return json({
      defaultProvider: "fixture",
      providers: [
        {
          id: "fixture",
          displayName: "Studio",
          defaultModel: "image",
          models: [
            {
              id: "image",
              displayName: "Image model",
              capabilities: {
                imageGeneration: true,
                imageReferences: true,
                maxReferenceImages: 6,
                aspectRatios: ["1:1", "16:9", "9:16", "3:2"],
                resolutions: ["1K", "2K"],
              },
              defaults: { resolution: "1K" },
            },
          ],
        },
        {
          id: "second", displayName: "Other provider", defaultModel: "other-image",
          models: [{ id: "other-image", displayName: "Other image model",
            capabilities: { imageGeneration: true, imageReferences: true, maxReferenceImages: 6,
              aspectRatios: ["1:1", "16:9"], resolutions: ["1K", "2K"] },
            defaults: { resolution: "1K" } }],
        },
      ],
    });
  if (path === "/api/history")
    return json({
      items: ready ? [item] : [],
      hasMore: false,
      nextCursor: null,
    });
  if (path === "/api/generation/job-center")
    return json({
      items: [],
      activeCount: 0,
      terminalCount: 0,
      polledAt: new Date().toISOString(),
    });
  if (path === "/api/credits/estimate")
    return json({
      estimate: {
        estimateId: "quote_fixture",
        estimatedCredits: 8,
        expiresAt: Date.now() + 60000,
      },
      account: { availableCredits: 100, canAfford: true },
    });
  if (path === "/api/generation/prompt-preview") {
    previewCalls++;
    return json({ compiledPrompt: "fixture prompt" });
  }
  if (path === "/api/generate") {
    posts++;
    lastRequest = JSON.parse(request.postData());
    return route.abort("failed");
  }
  if (path.startsWith("/api/generation/requests/")) {
    ready = true;
    return json({
      state: "found",
      requestId: path.split("/").pop(),
      jobId: "fixture_job",
      groupId: null,
    });
  }
  if (path === "/api/jobs/fixture_job")
    return json({
      id: "fixture_job",
      status: "completed",
      result: { imageUrl: item.imageUrl, mimeType: "image/png" },
    });
  return route.fulfill({
    status: 500,
    contentType: "application/json",
    body: JSON.stringify({ error: { message: `Unmocked ${path}` } }),
  });
});
try {
  await page.goto("http://127.0.0.1:6502");
  await page.locator(".header-actions select").selectOption("en");
  await page.getByRole('button', { name: 'Model', exact: true }).click();
  await page.getByRole('menuitemradio').first().waitFor();
  assert.equal(await page.getByRole('menuitemradio').count(), 2);
  await page.getByRole('button', { name: 'Other provider', exact: true }).click();
  assert.equal(await page.getByRole('menuitemradio').count(), 1);
  await page.getByRole('menuitemradio').click();
  assert.ok((await page.locator('.generation-model-picker__trigger').innerText()).includes('Other image model'));
  await page.getByRole('button', { name: 'Model', exact: true }).click();
  await page.getByRole('searchbox').fill('nonexistent model');
  await page.getByText('No matching models.', { exact: false }).waitFor();
  await page.getByRole('searchbox').fill('Studio');
  await page.getByRole('searchbox').press('ArrowDown');
  await page.keyboard.press('Enter');
  assert.ok((await page.locator('.generation-model-picker__trigger').innerText()).includes('Image model'));
  await page
    .locator("#prompt")
    .fill("A quiet green landscape\nSoft morning light");
  await page.locator(".primary-button:not(:disabled)").waitFor();
  await page.locator("#prompt").fill("A new scene");
  assert.equal(
    await page.locator(".quote-line strong").count(),
    0,
    "changed input must hide stale quote",
  );
  await page.locator(".primary-button:not(:disabled)").waitFor();
  await page.locator(".primary-button").evaluate((button) => {
    button.click();
    button.click();
  });
  await page
    .getByText("Submission status is unknown.", { exact: false })
    .waitFor();
  assert.equal(posts, 1, "double click submits once");
  assert.ok(lastRequest.requestId.startsWith("fe24_"));
  await page.reload();
  await page
    .getByText("Submission status is unknown.", { exact: false })
    .waitFor();
  assert.equal(posts, 1, "reload must not POST");
  await page
    .locator(".operation-status")
    .getByRole("button", { name: "Check status", exact: true })
    .click();
  await page.locator(".image-stage img").waitFor();
  assert.equal(posts, 1, "lookup must not POST");
  await page
    .locator(".viewer-toolbar")
    .getByRole("button", { name: "100%", exact: true })
    .click();
  assert.equal(
    Math.round(
      await page
        .locator(".image-stage img")
        .evaluate((image) => image.getBoundingClientRect().width),
    ),
    1600,
  );
  await page.locator(".image-surface").focus();
  await page.locator(".image-surface").evaluate((node) => {
    node.scrollLeft = 0;
  });
  await page.keyboard.press("ArrowRight");
  assert.ok(
    await page
      .locator(".image-surface")
      .evaluate((node) => node.scrollLeft > 0),
    "keyboard pans focused zoom",
  );
  await page.getByRole("button", { name: "Fit", exact: true }).click();
  const bounds = await page
    .locator(".image-stage img")
    .evaluate((image) => ({
      image: image.getBoundingClientRect().width,
      surface: image.closest(".image-surface").clientWidth,
    }));
  assert.ok(bounds.image <= bounds.surface);
  for (const width of [1440, 820, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    if (width === 390)
      await page
        .locator(".mobile-tabs")
        .getByRole("button", { name: "Create", exact: true })
        .click();
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      "no horizontal overflow",
    );
    await page.screenshot({
      path: new URL(`image-${width}-en.png`, output).pathname.replace(
        /^\/(\w:)/,
        "$1",
      ),
      fullPage: true,
    });
    await page.locator(".header-actions select").selectOption("th");
    await page.screenshot({
      path: new URL(`image-${width}-th.png`, output).pathname.replace(
        /^\/(\w:)/,
        "$1",
      ),
      fullPage: true,
    });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.locator(".header-actions select").selectOption("en");
    for (const language of ['en', 'th']) {
      await page.locator('.header-actions select').selectOption(language);
      await page.locator('.generation-model-picker__trigger').click();
      await page.getByRole('menu').waitFor();
      const menuBounds = await page.getByRole('menu').boundingBox();
      assert.ok(menuBounds.x >= 0 && menuBounds.x + menuBounds.width <= width + 1, 'model menu fits viewport');
      await page.screenshot({ path: new URL(`model-menu-${width}-${language}.png`, output).pathname.replace(/^\/(\w:)/, '$1') });
      await page.keyboard.press('Escape');
      const promptValue = await page.locator('#prompt').inputValue();
      await page.locator('#prompt').evaluate(node => node.setSelectionRange(2, 5));
      await page.getByRole('button', { name: language === 'en' ? 'Expand prompt' : 'ขยายช่องคำอธิบายภาพ', exact: true }).click();
      await page.locator('#expanded-prompt').waitFor();
      assert.equal(await page.locator('#expanded-prompt').inputValue(), promptValue);
      assert.deepEqual(await page.locator('#expanded-prompt').evaluate(node => [node.selectionStart, node.selectionEnd]), [2, 5]);
      await page.locator('#expanded-prompt').fill(`Edited ${language} prompt\nบทบรรยายบรรทัดใหม่`);
      const dialogBounds = await page.getByRole('dialog').boundingBox();
      assert.ok(dialogBounds.x >= 0 && dialogBounds.x + dialogBounds.width <= width && dialogBounds.height <= 1000, 'prompt dialog fits viewport');
      await page.screenshot({ path: new URL(`prompt-modal-${width}-${language}.png`, output).pathname.replace(/^\/(\w:)/, '$1') });
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#prompt').inputValue(), `Edited ${language} prompt\nบทบรรยายบรรทัดใหม่`);
      await page.waitForFunction(label => document.activeElement?.getAttribute('aria-label') === label,
        language === 'en' ? 'Expand prompt' : 'ขยายช่องคำอธิบายภาพ');
      await page.locator('#prompt').fill(promptValue);
      assert.equal(posts, 1, 'modal edit never submits generation');
    }
    await page.locator('.header-actions select').selectOption('en');
    if (width === 390) {
      await page
        .locator(".mobile-tabs")
        .getByRole("button", { name: "Results", exact: false })
        .click();
      await page.screenshot({
        path: new URL("results-390-en.png", output).pathname.replace(
          /^\/(\w:)/,
          "$1",
        ),
        fullPage: true,
      });
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      await page.locator(".header-actions select").selectOption("th");
      await page.screenshot({
        path: new URL("results-390-th.png", output).pathname.replace(
          /^\/(\w:)/,
          "$1",
        ),
        fullPage: true,
      });
      await page.locator(".header-actions select").selectOption("en");
      const cdp = await context.newCDPSession(page);
      const box = await page.locator(".image-surface").boundingBox();
      const y = box.y + 150,
        x = box.x + box.width / 2;
      const before = await page
        .locator(".image-stage img")
        .evaluate((image) => image.getBoundingClientRect().width);
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [
          { x: x - 30, y, id: 1 },
          { x: x + 30, y, id: 2 },
        ],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [
          { x: x - 80, y, id: 1 },
          { x: x + 80, y, id: 2 },
        ],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      await page.waitForTimeout(100);
      assert.ok(
        (await page
          .locator(".image-stage img")
          .evaluate((image) => image.getBoundingClientRect().width)) > before,
        "touch pinch enlarges image",
      );
      await cdp.detach();
      await page.getByRole("button", { name: "Fit", exact: true }).click();
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('button', { name: '100%', exact: true }).click();
  await page.getByRole("button", { name: "Expand", exact: true }).click();
  await page.getByRole("dialog").waitFor();
  const assertFit = async () => {
    await page.waitForFunction(() => {
      const img = document.querySelector('.image-stage img');
      if (!img) return false;
      const surface = img.closest('.image-surface');
      const expected = Math.min((surface.clientWidth - 32) / img.naturalWidth, (surface.clientHeight - 32) / img.naturalHeight, 1);
      return Math.abs(img.getBoundingClientRect().width - img.naturalWidth * expected) < 2;
    });
  };
  await assertFit();
  await page.getByRole('button', { name: '100%', exact: true }).click();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await assertFit();
  await page.waitForTimeout(100);
  assert.equal(
    await page
      .getByRole("button", { name: "Expand", exact: true })
      .evaluate((button) => button === document.activeElement),
    true,
    "close restores focus",
  );
  await page.getByRole("button", { name: "Expand", exact: true }).click();
  delayIdentity = true;
  await page.getByRole('button', { name: '100%', exact: true }).click();
  const beforeReturn = {
    media: mediaCalls, identity: identityCalls,
    src: await page.locator('.image-stage img').getAttribute('src'),
    zoom: await page.locator('.zoom-value').innerText(),
  };
  await page.evaluate(() => {
    window.dispatchEvent(new Event('focus'));
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(100);
  assert.equal(await page.locator('.identity-status').count(), 0, 'ordinary return has no full-page loading overlay');
  assert.equal(await page.getByRole('dialog').count(), 1, 'ordinary return keeps expanded viewer');
  await page.waitForTimeout(800);
  assert.equal(identityCalls, beforeReturn.identity + 1, 'focus and visibility coalesce');
  assert.equal(await page.locator('.image-stage img').getAttribute('src'), beforeReturn.src, 'original object URL retained');
  assert.equal(await page.locator('.zoom-value').innerText(), beforeReturn.zoom, 'manual zoom retained');
  assert.equal(mediaCalls, beforeReturn.media, 'return does not download images again');
  await page.evaluate(() =>
    window.dispatchEvent(new Event("mpf:identity-invalidated")),
  );
  await page.locator(".identity-status").waitFor();
  assert.equal(
    await page.getByRole("dialog").count(),
    0,
    "private portal hidden during reauth",
  );
  assert.equal(
    await page.locator("a[download]").filter({ visible: true }).count(),
    0,
    "private download hidden",
  );
  await page.locator(".identity-status").waitFor({ state: "hidden" });
  assert.equal(posts, 1);
  const adminPreviewCalls = previewCalls;
  fixtureRole = "user"; config.authMode = "session"; delayIdentity = false;
  await page.evaluate(() => window.dispatchEvent(new Event("mpf:identity-invalidated")));
  await page.locator('.primary-button').waitFor();
  await page.locator('#prompt').fill('A customer request without debug permissions');
  await page.locator('.primary-button:not(:disabled)').waitFor();
  assert.equal(previewCalls, adminPreviewCalls, 'regular customers never require admin debug preview');
  assert.equal(posts, 1);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: current quote, double click, unknown reload/lookup, fit/100%, TH/EN 390/820/1440, focus return, private portal suspension; no provider calls.",
  );
} finally {
  await browser.close();
}

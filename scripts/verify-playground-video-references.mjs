import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../', import.meta.url));
const origin = process.env.VIDEO_LAYOUT_ORIGIN || 'http://127.0.0.1:5173';
const trusted = process.argv.includes('--trusted');
const active = process.argv.includes('--active');
assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname));
const output = await fs.mkdtemp(
  path.join(os.tmpdir(), 'mpf-video-references-layout-'),
);
const actor = {
  userId: 'video-layout',
  username: 'layout',
  displayName: 'Video layout',
  role: 'admin',
};
const model = {
  ...(trusted ? { playgroundReferencePolicy: { kind: 'trusted_generated_only', version: 'layout-policy', maximumAgeDays: 30 } } : {}),
  providerId: 'modelark',
  modelId: 'dreamina-seedance-2-5-260628',
  displayName: 'Seedance 2.5',
  operations: ['text_to_video'],
  inputModes: ['text_to_video', 'image_to_video', 'multimodal_reference'],
  supportsFirstFrame: true,
  supportsOrderedImageReferences: true,
  referenceImageLimit: 9,
  qualificationStatus: 'internal_testing',
  testingRoutingEnabled: true,
  paidRoutingEnabled: false,
  durations: [6],
  resolutions: ['480p'],
  aspectRatios: ['9:16'],
  audioModes: ['none'],
};
const trustedImages = ['frame', 'look'].map(id => ({ id, previewUrl: `/outputs/layout-${id}.jpg`,
  modelId: 'seedream-5-0-lite-260128', generationMode: 'text_to_image', generatedAt: '2026-09-01T00:00:00Z',
  expiresAt: '2099-01-01T00:00:00Z', eligible: true, reason: null, policyVersion: 'layout-policy' }));
const activeTask = {
  id: 'videotask_layout_processing',
  status: 'provider_processing',
  createdAt: '2026-09-07T10:00:00.000Z',
  updatedAt: '2026-09-07T10:01:00.000Z',
  providerId: model.providerId,
  modelId: model.modelId,
  operation: 'character_to_video',
  inputMode: 'multimodal_reference',
  aspectRatio: '9:16',
  resolution: '480p',
  durationSeconds: 6,
  billingStatus: 'reserved',
  estimatedCredits: 1,
};
const activeJobItem = {
  id: activeTask.id,
  kind: 'video_task',
  mediaType: 'video',
  status: activeTask.status,
  terminal: false,
  createdAt: activeTask.createdAt,
  updatedAt: activeTask.updatedAt,
  completedAt: null,
  providerId: activeTask.providerId,
  modelId: activeTask.modelId,
  resultUrl: null,
  thumbnailUrl: null,
  detailHref: '/create/playground?media=video',
  resumeHref: '/create/playground?media=video',
  billingStatus: activeTask.billingStatus,
  estimatedCredits: activeTask.estimatedCredits,
  progress: null,
  error: null,
};
const api = {
  '/api/history': { items: ['frame', 'look'].map((id, index) => ({
    id: `job_layout_${id}`, imageUrl: `/outputs/layout-${id}.jpg`, timestamp: 1,
    provider: index ? 'openai' : 'gemini', submodel: index ? 'GPT Image' : 'Gemini',
    width: 720, height: 1280,
  })), hasMore: false },
  '/api/history': { items: ['frame', 'look'].map((id, index) => ({
    id: `job_layout_${id}`, imageUrl: `/outputs/layout-${id}.jpg`, timestamp: 1,
    provider: index ? 'openai' : 'gemini', submodel: index ? 'GPT Image' : 'Gemini',
    width: 720, height: 1280,
  })), hasMore: false },
  '/api/generation/video/trusted-sources': { items: [...trustedImages,
    { ...trustedImages[0], id: 'expired', eligible: false, reason: 'expired', expiresAt: '2000-01-01' }], hasMore: false },
  '/api/me': actor,
  '/api/mock-users': { enabled: false, users: [] },
  '/api/community/features': {
    community: {
      enabled: true,
      exploreEnabled: true,
      galleryEnabled: true,
      characterProfilesEnabled: true,
      creatorProfilesEnabled: true,
    },
    development: {},
    routing: {},
    cinematic: { enabled: true, playgroundVideoEnabled: true },
  },
  '/api/community/creator-profiles/me': {
    id: 'fixture-video',
    handle: 'layout',
    displayName: 'Video layout',
  },
  '/api/credits/account': {
    account: { availableCredits: 100, reservedCredits: 0 },
  },
  '/api/health': { status: 'ok', time: new Date().toISOString() },
  '/api/generation/job-center': {
    items: active ? [activeJobItem] : [],
    activeCount: active ? 1 : 0,
    terminalCount: 0,
    polledAt: new Date().toISOString(),
  },
  '/api/generation/video/capabilities': {
    schemaVersion: 1,
    catalogVersion: 'layout',
    mediaType: 'video',
    models: [model],
    comparison: { enabled: false, minimumSlots: 2, maximumSlots: 2 },
    launchStatus: 'available',
  },
  '/api/generation/video/tasks': { items: active ? [activeTask] : [] },
};
const image = await fs.readFile(
  path.join(
    root,
    'client/assets/scene-builder/shot-recipes/cafe-seated-lifestyle.jpg',
  ),
);
const browser = await chromium.launch({ headless: true });
const unexpected = [];
const results = [];
try {
  for (const locale of ['en', 'th']) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    });
    await context.addInitScript(
      ({ locale, actor, model, trusted, trustedImages, active, activeTask }) => {
        localStorage.setItem('model_prompt_forge_language', locale);
        localStorage.setItem('mpf_active_mock_user_id', actor.userId);
        localStorage.setItem(
          `mpf.react.draft:playground-video:${actor.userId}`,
          JSON.stringify({
            schemaVersion: 4,
            actorId: actor.userId,
            feature: 'playground-video',
            updatedAt: new Date().toISOString(),
            payload: {
              prompt:
                'Subtle motion in the supplied scene. Preserve identity and wardrobe.',
              operation: 'character_to_video',
              providerModelKey: `${model.providerId}:${model.modelId}`,
              aspectRatio: '9:16',
              resolution: '480p',
              durationSeconds: 6,
              audioMode: 'none',
              comparisonActive: false,
              referenceImageUrl: '/outputs/layout-frame.jpg',
              character: null,
              trustedFrame: trusted ? trustedImages[0] : null,
              trustedLook: trusted ? trustedImages[1] : null,
              lookSheet: {
                url: '/outputs/layout-look.jpg',
                assetId: 'fixture-look',
                name: 'Uploaded Look Sheet',
              },
              activeTaskId: active ? activeTask.id : null,
              recentExpanded: false,
            },
          }),
        );
      },
      { locale, actor, model, trusted, trustedImages, active, activeTask },
    );
    let lastQuote;
    await context.route('**/*', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.origin !== new URL(origin).origin) {
        unexpected.push(url.origin);
        return route.abort();
      }
      if (
        url.pathname === '/api/generation/video/quote' &&
        request.method() === 'POST'
      ) {
        lastQuote = request.postDataJSON();
        return route.fulfill({
          json: {
            estimate: {
              estimateId: 'fixture-quote',
              estimatedCredits: 1,
              expiresAt: '2099-01-01T00:00:00Z',
            },
            account: { availableCredits: 100, canAfford: true },
            requestFingerprint: 'fixture-only',
          },
        });
      }
      // No submission, real upload or other mutation may escape this isolated check.
      if (request.method() !== 'GET') {
        unexpected.push(`${request.method()} ${url.pathname}`);
        return route.abort();
      }
      if (api[url.pathname]) return route.fulfill({ json: api[url.pathname] });
      if (active && url.pathname === `/api/generation/video/tasks/${activeTask.id}`) {
        return route.fulfill({ json: activeTask });
      }
      if (url.pathname.startsWith('/outputs/layout-'))
        return route.fulfill({ body: image, contentType: 'image/jpeg' });
      if (url.pathname.startsWith('/api/')) {
        unexpected.push(url.pathname);
        return route.fulfill({ status: 404, json: {} });
      }
      if (
        url.pathname.startsWith('/i18n/') ||
        url.pathname.startsWith('/assets/')
      ) {
        const base = path.join(root, 'client');
        const file = path.resolve(
          base,
          decodeURIComponent(url.pathname.slice(1)),
        );
        assert.ok(file.startsWith(`${base}${path.sep}`));
        const contentType =
          {
            '.json': 'application/json',
            '.svg': 'image/svg+xml',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
          }[path.extname(file)] || 'application/octet-stream';
        return route.fulfill({ body: await fs.readFile(file), contentType });
      }
      return route.continue();
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${origin}/create/playground?media=video`);
    await page
      .locator('.playground-video-references__slots')
      .waitFor({ timeout: 45000 });
    await page.waitForFunction(
      () =>
        [
          ...document.querySelectorAll(
            '.playground-video-references__preview img',
          ),
        ].filter((img) => img.complete && img.naturalWidth > 0).length === 2,
    );
    await page.evaluate(() => document.fonts.ready);
    for (const width of [1440, 820, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.waitForTimeout(250);
      const measure = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        images: [
          ...document.querySelectorAll(
            '.playground-video-references__preview img',
          ),
        ].map((img) => ({
          width: img.naturalWidth,
          height: img.naturalHeight,
        })),
        clipped: [
          ...document.querySelectorAll('.playground-video-references button'),
        ].filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && (r.left < 0 || r.right > innerWidth + 1);
        }).length,
        rawKeys: /playground\.video\.(references|trusted)\./.test(
          document.querySelector('.playground-video-references')?.textContent ||
          '',
        ),
        activeStatusBars: document.querySelectorAll('.playground-video-task-status').length,
        rawProviderStatus: /provider_processing\s*[·]/.test(
          document.querySelector('#generation-video-results')?.textContent || '',
        ),
        activeJobCount: document.querySelector('.generation-job-center__trigger')?.textContent?.trim() || '',
      }));
      assert.ok(
        measure.scrollWidth <= width + 1,
        `Page overflow: ${JSON.stringify({ width, ...measure })}`,
      );
      assert.equal(measure.clipped, 0);
      assert.equal(measure.rawKeys, false);
      assert.equal(measure.activeStatusBars, active ? 1 : 0);
      assert.equal(measure.rawProviderStatus, false);
      if (active) assert.match(measure.activeJobCount, /1/);
      assert.equal(measure.images.length, 2);
      assert.ok(measure.images.every((item) => item.width > 0));
      await page.screenshot({
        path: path.join(output, `${locale}-${width}.png`),
        fullPage: true,
      });
      results.push({ locale, width, ...measure });
      if (trusted) {
        assert.equal(await page.locator('.playground-video-references input[type=file]').count(), 0);
        await page.locator('.playground-video-references__actions button').first().click();
        await page.locator('.trusted-video-picker__grid button').first().waitFor();
        await page.waitForFunction(() => [...document.querySelectorAll('.trusted-video-picker__grid img')].every(img => img.complete && img.naturalWidth > 0));
        const dialog = await page.locator('[role=dialog]').boundingBox();
        assert.ok(dialog && dialog.x >= 0 && dialog.x + dialog.width <= width + 1);
        assert.equal(await page.locator('.trusted-video-picker__grid button:disabled').count(), 1);
        assert.equal(await page.locator('.trusted-video-picker__grid').getByText('expired', { exact: true }).count(), 0);
        await page.screenshot({ path: path.join(output, `${locale}-${width}-picker.png`), fullPage: true });
        await page.keyboard.press('Escape');
        await page.locator('[role=dialog]').waitFor({ state: 'hidden' });
      } else {
        await page.locator('.playground-video-references__actions button').first().click();
        await page.locator('.trusted-video-picker__grid button').first().waitFor();
        await page.waitForFunction(() => [...document.querySelectorAll('.trusted-video-picker__grid img')].every(img => img.complete && img.naturalWidth > 0));
        const dialog = await page.locator('[role=dialog]').boundingBox();
        assert.ok(dialog && dialog.x >= 0 && dialog.x + dialog.width <= width + 1);
        assert.equal(await page.locator('.trusted-video-picker__grid button').count(), 2);
        assert.equal(await page.locator('.trusted-video-picker__grid button:disabled').count(), 1);
        await page.screenshot({ path: path.join(output, `${locale}-${width}-generated-picker.png`), fullPage: true });
        await page.locator('.trusted-video-picker__grid button:enabled').click();
        await page.locator('[role=dialog]').waitFor({ state: 'hidden' });
      }
    }
    assert.equal(lastQuote?.references.length, 2);
    if (trusted) {
      assert.equal(lastQuote.referencePlanVersion, 'playground-trusted-v1');
      assert.ok(lastQuote.references.every(row => row.generationId && !row.referenceImageUrl));
      assert.equal(lastQuote.characterProfileId, null);
    }
    assert.deepEqual(
      lastQuote.references.map((item) => item.role),
      ['reference_image', 'reference_image'],
    );
    const translations = JSON.parse(
      await fs.readFile(
        path.join(root, `client/i18n/locales/${locale}/playground.json`),
        'utf8',
      ),
    );
    await page
      .getByRole('button', {
        name: translations['playground.video.operation.image_to_video'],
        exact: true,
      })
      .click();
    await page.waitForFunction(
      () =>
        document.querySelectorAll('.playground-video-references__slot')
          .length === 1,
    );
    await page.waitForTimeout(250);
    assert.equal(lastQuote.references.length, 1);
    assert.equal(lastQuote.references[0].role, 'first_frame');
    assert.deepEqual(errors, []);
    await context.close();
  }
  assert.deepEqual(unexpected, []);
  console.log(
    JSON.stringify({ output, checks: results.length, results }, null, 2),
  );
} finally {
  await browser.close();
}

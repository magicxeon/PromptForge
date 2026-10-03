import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../', import.meta.url));
const origin = process.env.VIDEO_LAYOUT_ORIGIN || 'http://localhost:5173';
const lookSheetDefinition = {
  schemaVersion: 1, name: 'Fixture Character', ageYears: 28,
  appearance: 'Adult character with short dark hair and a calm expression.',
  situation: 'A quiet exchange in the flower shop.', outfit: 'Plain clothing', personality: 'Neutral'
};
const lookSheetPreset = {
  id: 'character-document-sheet', version: 1, strategy: 'single_image',
  defaults: { outfit: 'Plain clothing', personality: 'Neutral' }, direction: 'Fixture document direction'
};
const trusted = process.argv.includes('--trusted');
const named = process.argv.includes('--named');
const maximumReferences = process.argv.includes('--max-references');
const startImages = process.argv.includes('--images') || maximumReferences;
const expectedImages = maximumReferences ? 9 : named || startImages ? 3 : 2;
const active = process.argv.includes('--active');
const widthFilter = process.argv.includes('--width') ? Number(process.argv[process.argv.indexOf('--width') + 1]) : null;
const viewports = [{ width: 1440, height: 900 }, { width: 820, height: 1180 }, { width: 390, height: 844 }]
  .filter(viewport => widthFilter === null || viewport.width === widthFilter);
assert.ok(viewports.length, '--width must be 1440, 820 or 390');
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
  ...(process.argv.includes('--composition') ? { playgroundReferencePolicy: { kind: 'trusted_generated_only', version: 'layout-policy', maximumAgeDays: 30, allowImageReferenceUploads: true } } : {}),
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
const sourceIds = ['frame', 'look', ...(named || startImages ? ['second'] : []), ...(maximumReferences ? Array.from({length:6},(_,i)=>`extra-${i+1}`) : [])];
const trustedImages = sourceIds.map(id => ({ id, previewUrl: `/outputs/layout-${id}.jpg`,
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
  '/api/me/preferences': { confirmCreditUsage: true },
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
if (process.argv.includes('--image-workspace') || process.argv.includes('--look-sheet')) {
  await verifyImageWorkspace();
} else {
const browser = await chromium.launch({ headless: true });
const unexpected = [];
const results = [];
try {
  for (const theme of ['default', 'fashion', 'creative']) for (const locale of ['en', 'th']) {
    const context = await browser.newContext({
      viewport: viewports[0],
    });
    await context.addInitScript(
      ({ locale, theme, actor, model, trusted, trustedImages, active, activeTask, named, startImages, sourceIds }) => {
        localStorage.setItem('model_prompt_forge_language', locale);
        localStorage.setItem('mpf_active_mock_user_id', actor.userId);
        localStorage.setItem(`mpf.react.draft:ui-theme-preference:${actor.userId}`, JSON.stringify({ schemaVersion:1,
          actorId:actor.userId,feature:'ui-theme-preference',updatedAt:new Date().toISOString(),payload:{theme} }));
        if (localStorage.getItem(`mpf.react.draft:playground-video:${actor.userId}`)) return;
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
              operation: startImages ? 'image_to_video' : 'character_to_video',
              ...(startImages ? {
                imageReferences: trusted ? [] : sourceIds.map((id, index) => ({ url: `/outputs/layout-${id}.jpg`, characterName: `Photo ${index + 1}` })),
                trustedImages: trusted ? trustedImages.map((item, index) => ({ ...item, characterName: `Photo ${index + 1}` })) : []
              } : {}),
              providerModelKey: `${model.providerId}:${model.modelId}`,
              aspectRatio: '9:16',
              resolution: '480p',
              durationSeconds: 6,
              audioMode: 'none',
              comparisonActive: false,
              referenceImageUrl: '/outputs/layout-frame.jpg',
              character: null,
              ...(named ? {
                trustedLooks: trusted ? trustedImages.slice(1).map((item, index) => ({ ...item, characterName: index ? 'Ben' : 'Alice' })) : [],
                lookSheets: trusted ? [] : ['look', 'second'].map((id, index) => ({ url: `/outputs/layout-${id}.jpg`, assetId: `fixture-${id}`, name: id, characterName: index ? 'Ben' : 'Alice' })),
              } : {}),
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
      { locale, theme, actor, model, trusted, trustedImages, active, activeTask, named, startImages, sourceIds },
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
    const disclosure = page.locator('.generation-reference-disclosure details');
    await disclosure.waitFor();
    assert.equal(await disclosure.getAttribute('open'), null, 'Restored references must initially be collapsed');
    await disclosure.locator('summary').click();
    await page
      .locator('.playground-video-references__slots')
      .first()
      .waitFor({ timeout: 45000 });
    await page.waitForFunction(
      (expected) =>
        [
          ...document.querySelectorAll(
            '.playground-video-references__preview img',
          ),
        ].filter((img) => img.complete && img.naturalWidth > 0).length === expected,
      expectedImages,
    );
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator('html').getAttribute('data-theme'), theme);
    for (const { width, height } of viewports) {
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(250);
      await page.locator('.playground-video-reference-summary__list').scrollIntoViewIfNeeded();
      await page.waitForFunction(() => [...document.querySelectorAll('.playground-video-reference-summary__thumbnail img')]
        .every(img => img.complete && img.naturalWidth > 0));
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
          document.querySelector('.generation-experience')?.textContent || document.body.textContent ||
          '',
        ),
        activeStatusBars: document.querySelectorAll('.playground-video-task-status').length,
        rawProviderStatus: /provider_processing\s*[·]/.test(
          document.querySelector('#generation-video-results')?.textContent || '',
        ),
        activeJobCount: document.querySelector('.generation-job-center__trigger')?.textContent?.trim() || '',
        referenceThumbnails: [...document.querySelectorAll('.playground-video-reference-summary__thumbnail img')]
          .map(img => ({src: img.getAttribute('src'), width: img.getBoundingClientRect().width, height: img.getBoundingClientRect().height})),
        referenceStripClipped: [...document.querySelectorAll('.playground-video-reference-summary__list li')]
          .some(el => { const r=el.getBoundingClientRect(); return r.left < 0 || r.right > innerWidth + 1 || el.scrollWidth > el.clientWidth + 1; }),
      }));
      assert.ok(
        measure.scrollWidth <= width + 1,
        `Page overflow: ${JSON.stringify({ width, ...measure })}`,
      );
      assert.equal(measure.clipped, 0);
      assert.equal(measure.referenceStripClipped, false);
      assert.equal(measure.referenceThumbnails.length, Math.min(2, expectedImages));
      assert.ok(measure.referenceThumbnails.every(img => img.width === 40 && img.height === 50));
      assert.equal(measure.rawKeys, false);
      assert.equal(await page.locator('.video-look-sheet-list').evaluate(el => /\{(?:number|count|limit)\}/.test(el.textContent || '')), false);
      assert.equal(measure.activeStatusBars, active ? 1 : 0);
      assert.equal(measure.rawProviderStatus, false);
      if (active) assert.match(measure.activeJobCount, /1/);
      assert.equal(measure.images.length, expectedImages);
      assert.ok(measure.images.every((item) => item.width > 0));
      await page.screenshot({
        path: path.join(output, `${theme}-${locale}-${width}.png`),
        fullPage: true,
      });
      await disclosure.locator('summary').click();
      assert.equal(await disclosure.getAttribute('open'), null);
      const firstView = await inspectFirstView(page, width, height);
      await page.screenshot({ path: path.join(output, `${theme}-${locale}-${width}-first-view.png`) });
      results.push({ theme, locale, width, height, firstView, ...measure });
      await disclosure.locator('summary').click();
      if (maximumReferences) continue;
      if (trusted) {
        assert.equal(await page.locator('.playground-video-references input[type=file]').count(), 0);
        await page.locator('.playground-video-references__actions button').first().click();
        await page.locator('.trusted-video-picker__grid button').first().waitFor();
        await page.waitForFunction(() => [...document.querySelectorAll('.trusted-video-picker__grid img')].every(img => img.complete && img.naturalWidth > 0));
        const dialog = await page.locator('[role=dialog]').boundingBox();
        assert.ok(dialog && dialog.x >= 0 && dialog.x + dialog.width <= width + 1);
        assert.equal(await page.locator('.trusted-video-picker__grid button:disabled').count(), named || startImages ? 2 : 1);
        assert.equal(await page.locator('.trusted-video-picker__grid').getByText('expired', { exact: true }).count(), 0);
        await page.screenshot({ path: path.join(output, `${theme}-${locale}-${width}-picker.png`), fullPage: true });
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
        await page.screenshot({ path: path.join(output, `${theme}-${locale}-${width}-generated-picker.png`), fullPage: true });
        if (startImages) await page.keyboard.press('Escape');
        else await page.locator('.trusted-video-picker__grid button:enabled').click();
        await page.locator('[role=dialog]').waitFor({ state: 'hidden' });
      }
    }
    assert.equal(lastQuote?.references.length, expectedImages);
    if (trusted) {
      assert.equal(lastQuote.referencePlanVersion, 'playground-trusted-v1');
      assert.ok(lastQuote.references.every(row => row.generationId && !row.referenceImageUrl));
      assert.equal(lastQuote.characterProfileId, null);
    }
    assert.deepEqual(
      lastQuote.references.map((item) => item.role),
      Array(expectedImages).fill('reference_image'),
    );
    if (maximumReferences) {
      assert.equal(await page.locator('.generation-reference-disclosure__count').textContent(), '9 / 9');
      await context.close();
      continue;
    }
    const translations = JSON.parse(
      await fs.readFile(
        path.join(root, `client/i18n/locales/${locale}/playground.json`),
        'utf8',
      ),
    );
    if (startImages) {
      const names = page.locator('.video-look-sheet-list label input:not([type=file])');
      assert.equal(await names.count(), 3);
      await names.nth(1).fill('Market');
      await page.waitForTimeout(250);
      assert.equal(lastQuote.references[1].characterName, 'Market');
      assert.ok(lastQuote.references.every(row => row.purpose === 'image_reference'));
      await page.reload();
      await disclosure.waitFor();
      assert.equal(await disclosure.getAttribute('open'), null, 'Reload must not persist the disclosure state');
      await disclosure.locator('summary').click();
      await page.locator('.video-look-sheet-list').waitFor();
      assert.equal(await names.nth(1).inputValue(), 'Market');
      await page.getByRole('button', { name: translations['playground.video.references.addImage'], exact: true }).click();
      assert.equal(await page.locator('.playground-video-references__slot').count(), 4);
      await page.getByRole('button', { name: translations['playground.video.references.cancelLook'], exact: true }).click();
      for (let count = 3; count > 1; count--) {
        await page.locator('.video-look-sheet-list').getByRole('button', { name: new RegExp(translations['playground.reference.remove']) }).last().click();
        await page.waitForTimeout(250);
        assert.equal(lastQuote.references.length, count - 1);
      }
      await page.getByRole('button', { name: translations['playground.video.references.addImage'], exact: true }).click();
      await page.locator('.playground-video-references__slot').last().getByRole('button', { name: translations['playground.video.trusted.choose'], exact: true }).click();
      await page.locator('.trusted-video-picker__grid button:enabled').first().click();
      await page.locator('[role=dialog]').waitFor({ state: 'hidden' });
      await page.waitForTimeout(250);
      assert.equal(lastQuote.references.length, 2);
      assert.equal(lastQuote.inputMode, 'multimodal_reference');
      await page.locator('.video-look-sheet-list').getByRole('button', { name: new RegExp(translations['playground.reference.remove']) }).last().click();
      await names.first().fill('Final frame');
      await page.waitForTimeout(250);
    } else if (named) {
      const names = page.locator('.playground-video-references__slot input:not([type=file])');
      assert.equal(await names.count(), 2);
      await names.nth(1).fill('Changed');
      await page.waitForTimeout(250);
      assert.equal(lastQuote.references[2].characterName, 'Changed');
      const add = page.getByRole('button', { name: translations['playground.video.references.addLook'], exact: true });
      await add.click();
      assert.equal(await page.locator('.playground-video-references__slot').count(), 4);
      await page.getByRole('button', { name: translations['playground.video.references.cancelLook'], exact: true }).click();
      assert.equal(await page.locator('.playground-video-references__slot').count(), 3);
      await page.locator('.video-look-sheet-list__additional').getByRole('button', { name: new RegExp(translations['playground.reference.remove']) }).click();
      await page.waitForTimeout(250);
      assert.equal(lastQuote.references.length, 2);
    }
    await page.locator('.playground-video-source-options select').selectOption('image_to_video');
    await page.waitForFunction(
      () =>
        document.querySelectorAll('.playground-video-references__slot')
          .length === 1,
    );
    await page.waitForTimeout(250);
    assert.equal(lastQuote.references.length, 1);
    assert.equal(lastQuote.references[0].role, process.argv.includes('--composition') ? 'reference_image' : 'first_frame');
    assert.deepEqual(errors, []);
    await context.close();
  }
  assert.deepEqual(unexpected, []);
  await fs.writeFile(path.join(output, 'evidence.json'), JSON.stringify(results, null, 2));
  console.log(
    JSON.stringify({ output, checks: results.length, results }, null, 2),
  );
} catch (error) {
  console.error(`Evidence: ${output}; completed layout cases: ${results.length}`);
  await fs.writeFile(path.join(output, 'partial-evidence.json'), JSON.stringify({ results, failure:String(error) }, null, 2));
  for (const context of browser.contexts()) for (const page of context.pages()) await page.screenshot({ path: path.join(output, 'failure.png'), fullPage: true });
  throw error;
} finally {
  await browser.close();
}
}

async function verifyImageWorkspace() {
  const browser = await chromium.launch({ headless: true });
  const records = [], unexpected = [], errors = [];
  const roles = ['face_reference', 'character_reference', 'style_reference', 'pose_reference', 'outfit_front', 'outfit_back'];
  const imageModel = { id:'image-layout',displayName:'Image / Long production model name for first-entry discovery',paidRoutingEnabled:true,
    capabilities:{ imageGeneration:true,imageReferences:true,maxReferenceImages:6,aspectRatios:['9:16','1:1'],resolutions:['1K','2K'] } };
  const fixtures = { ...api,
    '/api/collections': { collections:[],defaultCollectionId:null },
    '/api/community/generations/job_layout_recent/share-status': { shared:false },
    '/api/generation/look-sheet-preset': lookSheetPreset,
    '/api/providers': { defaultProvider:'openai',providers:[{id:'openai',displayName:'OpenAI',defaultModel:imageModel.id,models:[imageModel]}] },
    '/api/history': { items:[{id:'job_layout_recent',mode:'playground',imageUrl:'/outputs/layout-recent.jpg',prompt:'Previous render, not current direction',
      provider:'openai',submodel:imageModel.id,timestamp:1,width:736,height:1288}],hasMore:false },
    '/api/attributes/bundle': { schema:{},templates:{},order:[],library:[],presets:{} }
  };
  const rejected = process.argv.includes('--rejected');
  const comparison = process.argv.includes('--comparison');
  if (comparison) fixtures['/api/providers'].providers[0].models.push({ ...imageModel,
    id:'image-layout-second', displayName:'Second Image / Long comparison model name' });
  const guided = process.argv.includes('--look-sheet');
  assert.ok(!guided || (!comparison && !rejected), 'Look Sheet checks do not combine with Image Comparison/rejection scenarios');
  try {
    for (const theme of ['default', 'fashion', 'creative']) for (const locale of ['en', 'th']) for (const restored of [false, true]) for (const guidedViewport of guided ? viewports : [null]) {
      const context = await browser.newContext({ viewport:guidedViewport || viewports[0] });
      await context.addInitScript(({actor,theme,locale,roles,restored,guided,lookSheetDefinition}) => {
        localStorage.setItem('model_prompt_forge_language',locale);
        localStorage.setItem('mpf_active_mock_user_id',actor.userId);
        const save = (feature,schemaVersion,payload) => localStorage.setItem(`mpf.react.draft:${feature}:${actor.userId}`,
          JSON.stringify({actorId:actor.userId,feature,schemaVersion,updatedAt:new Date().toISOString(),payload}));
        save('ui-theme-preference',1,{theme});
        if (restored && guided && !localStorage.getItem(`mpf.react.draft:look-sheet-playground:${actor.userId}`)) save('look-sheet-playground',1,{definition:lookSheetDefinition,character:null,enhancementEnabled:false,enhancementOperation:null});
        if (restored && !guided && !localStorage.getItem(`mpf.react.draft:playground:${actor.userId}`)) save('playground',2,{prompt:'Keep restored Image direction',references:Object.fromEntries(roles.map(role=>[role,`/outputs/layout-${role}.jpg`])),faceReferenceContext:null,characterSelection:null});
      }, {actor,theme,locale,roles,restored,guided,lookSheetDefinition});
      let lastEstimate, guidedHeader = false;
      await context.route('**/*',async route => {
        const request = route.request(), url = new URL(request.url());
        if (url.origin !== new URL(origin).origin) { unexpected.push(url.origin); return route.abort(); }
        // Only read-only pricing/preview POSTs are accepted. Every mutation fails closed.
        if (request.method() === 'POST' && url.pathname === '/api/credits/estimate') {
          lastEstimate = request.postDataJSON();
          return route.fulfill({json:{estimate:{estimateId:'fixture-image-price',estimatedCredits:10,expiresAt:'2099-01-01'},account:{availableCredits:100,canAfford:true}}});
        }
        if (request.method() === 'POST' && url.pathname === '/api/comparisons/estimate') {
          const input=request.postDataJSON();
          return route.fulfill({json:{slots:input.slots.map(slot=>({...slot,estimateId:'fixture-'+slot.id,estimatedCredit:10})),estimatedTotalCredit:input.slots.length*10,
            providerConfigVersion:1,expiresAt:Date.now()+60000,estimateToken:'fixture-comparison'}});
        }
        if (request.method() === 'POST' && url.pathname === '/api/references/processing-plan') {
          if (rejected) return route.fulfill({status:422,json:{error:'Fixture reference needs attention',code:'reference_rejected'}});
          return route.fulfill({json:{status:'accepted',policyVersion:'fixture',planFingerprint:'fixture',
            publicAuthorityProjection:{schemaVersion:1,policyVersion:'fixture',planFingerprint:'fixture',references:roles.map(role=>({slotId:role,role,intent:'reference',status:'accepted'}))},
            effectiveSelections:{},providerPlan:{referenceCount:6,executionMode:'single_stage'}}});
        }
        if (request.method() === 'POST' && url.pathname === '/api/generation/look-sheet-preview') {
          return route.fulfill({json:{compiledPrompt:`Fixture compiled Look Sheet\n${JSON.stringify(request.postDataJSON().lookSheetDefinition)}`}});
        }
        if (request.method() !== 'GET') { unexpected.push(`${request.method()} ${url.pathname}`); return route.abort(); }
        if ((guided || guidedHeader) && url.pathname === '/api/community/features') return route.fulfill({json:{...fixtures[url.pathname],generation:{lookSheetDocumentEnabled:true}}});
        if (fixtures[url.pathname]) return route.fulfill({json:fixtures[url.pathname]});
        if (url.pathname.startsWith('/outputs/layout-')) return route.fulfill({body:image,contentType:'image/jpeg'});
        if (url.pathname.startsWith('/api/')) { unexpected.push(url.pathname); return route.fulfill({status:404,json:{}}); }
        if (url.pathname.startsWith('/i18n/') || url.pathname.startsWith('/assets/')) {
          const base=path.join(root,'client'),file=path.resolve(base,decodeURIComponent(url.pathname.slice(1)));
          assert.ok(file.startsWith(`${base}${path.sep}`));
          return route.fulfill({body:await fs.readFile(file),contentType:{'.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg'}[path.extname(file)]||'application/octet-stream'});
        }
        return route.continue();
      });
      const page = await context.newPage();
      page.on('pageerror',error=>errors.push(error.message));
      await page.goto(`${origin}/create/playground?media=image${guided?'&imageMode=look-sheet':comparison?'&compare=1':''}`);
      await page.locator('.generation-model-picker__trigger').first().waitFor({timeout:45000});
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await page.locator('html').getAttribute('data-theme'),theme);
      if (guided) {
        await verifyGuidedWorkspace(page, {theme,locale,restored,records,caseViewports:[guidedViewport],lastEstimate:()=>lastEstimate});
        assert.deepEqual(errors,[]);
        await context.close();
        continue;
      }
      const prompt=page.locator('#generation-main-prompt'),negative=page.locator('#generation-negative-prompt');
      const disclosure=page.locator('.generation-reference-disclosure details');
      await disclosure.waitFor();
      assert.equal(await disclosure.getAttribute('open'),null);
      assert.equal(await prompt.inputValue(),restored?'Keep restored Image direction':'');
      await prompt.fill('Edited Image direction stays here');
      const negativeDetails=page.locator('.playground-prompt-editor__negative-disclosure');
      await negativeDetails.locator('summary').click();
      await negative.fill('No unwanted text');
      await negativeDetails.locator('summary').click();
      if (!comparison && !(rejected && restored)) await page.waitForFunction(() => document.querySelector('.studio-generate-button:not(:disabled)'));
      for (const {width,height} of viewports) {
        await page.setViewportSize({width,height});
        await page.waitForFunction(expected => {
          const images=[...document.querySelectorAll('.generation-reference-disclosure > :not(details) img')];
          return images.length === expected && images.every(img=>img.complete&&img.naturalWidth>0);
        },restored?2:0);
        const firstView=await inspectFirstView(page,width,height);
        assert.equal(await page.locator('.playground-workspace__setup-toggle').getAttribute('aria-expanded'),'true');
        if (comparison) {
          const slots=await page.locator('.comparison-slot-card').evaluateAll(cards=>cards.map(card=>{
            const name=card.querySelector('.generation-model-picker__value strong');
            return {width:card.getBoundingClientRect().width,
              lines:name.getBoundingClientRect().height/parseFloat(getComputedStyle(name).lineHeight)};
          }));
          assert.ok(slots.length>=2 && slots.every(slot=>slot.width>=250 && slot.lines<=5),JSON.stringify({width,slots}));
        }
        assert.equal(await page.locator('.playground-workspace__action .studio-generate-button').count(),1);
        assert.equal(await page.locator('.playground-workspace__comparison-result').count(),0);
        assert.equal(await page.locator('body').evaluate(el=>/playground\.(options|reference)\./.test(el.textContent)),false);
        const screenshot=`image-${theme}-${locale}-${restored?'restored':'fresh'}-${width}`;
        await page.screenshot({path:path.join(output,screenshot+'-first-view.png')});
        await page.screenshot({path:path.join(output,screenshot+'.png'),fullPage:true});
        const before=await prompt.inputValue();
        await disclosure.locator('summary').click();
        await page.locator('.reference-slot-grid').waitFor();
        await disclosure.locator('summary').click();
        assert.equal(await disclosure.getAttribute('open'),null);
        assert.equal(await prompt.inputValue(),before);
        assert.equal(await negative.inputValue(),'No unwanted text');
        records.push({media:'image',theme,locale,restored,width,height,firstView,screenshot});
      }
      if (!comparison) {
        assert.equal(lastEstimate.generationRequest.sceneBuilder.manualPromptText,'Edited Image direction stays here\n\nAvoid: No unwanted text');
        const persisted=await page.evaluate(actorId=>JSON.parse(localStorage.getItem(`mpf.react.draft:playground:${actorId}`)).payload,actor.userId);
        assert.deepEqual(persisted.references,restored?Object.fromEntries(roles.map(role=>[role,`/outputs/layout-${role}.jpg`])):{});
      }
      const expand=page.locator('.playground-recent-panel__heading button');
      if (await expand.getAttribute('aria-expanded') !== 'true') await expand.click();
      await page.locator('.playground-recent-grid__item').click();
      await page.getByRole('dialog').waitFor();
      await page.keyboard.press('Escape');
      await page.getByRole('dialog').waitFor({state:'hidden'});
      assert.equal(await prompt.inputValue(),'Edited Image direction stays here');
      assert.equal(await negative.inputValue(),'No unwanted text');
      if (rejected && restored) {
        const problem=page.locator('.generation-reference-disclosure__problem');
        await problem.waitFor();
        const message=await problem.textContent();
        await problem.getByRole('button').click();
        await page.waitForFunction(() => document.querySelector('.generation-reference-disclosure__editor')?.contains(document.activeElement));
        await disclosure.locator('summary').click();
        assert.equal(await problem.textContent(),message);
        assert.equal(await prompt.inputValue(),'Edited Image direction stays here');
      }
      await page.reload();
      await disclosure.waitFor();
      assert.equal(await page.locator('.playground-workspace__setup-toggle').getAttribute('aria-expanded'),'true');
      assert.equal(await disclosure.getAttribute('open'),null);
      assert.equal(await prompt.inputValue(),'Edited Image direction stays here');
      await page.goto(`${origin}/create/playground?media=image${comparison?'&compare=1':''}#reference-images`);
      await page.waitForFunction(() => document.querySelector('.generation-reference-disclosure details')?.open === true);
      assert.equal(await prompt.inputValue(),'Edited Image direction stays here');
      if (!restored) {
        guidedHeader = true;
        await page.goto(`${origin}/create/playground?media=image&imageMode=look-sheet`);
        await page.locator('.look-sheet-experience').waitFor();
        const header=page.locator('main > header').filter({has:page.locator('h1')});
        assert.equal(await header.count(),1);
        assert.equal(await header.locator('p').count(),0,'R3 Look Sheet shares the compact header');
        assert.equal(await header.locator(':scope > span').count(),0,'R3 Look Sheet removes the duplicate eyebrow');
        assert.equal(await page.locator('.playground-entry-header').count(),1);
        assert.equal(await page.locator('.playground-workspace--composer').count(),1);
        const setupToggle=page.locator('.playground-workspace__setup-toggle');
        const labels=JSON.parse(await fs.readFile(path.join(root,`client/i18n/locales/${locale}/playground.json`),'utf8'));
        assert.equal(await setupToggle.getAttribute('aria-expanded'),'true');
        await setupToggle.click();
        await page.getByRole('button',{name:labels['lookSheet.generalImage'],exact:true}).click();
        await page.locator('.look-sheet-experience').waitFor({state:'hidden'});
        await prompt.waitFor();
        assert.equal(await setupToggle.getAttribute('aria-expanded'),'true','General Image tab return resets setup disclosure');
        assert.equal(await prompt.inputValue(),'Edited Image direction stays here','Switching tabs preserves the writing draft');
        await setupToggle.click();
        await page.getByRole('button',{name:labels['lookSheet.title'],exact:true}).click();
        await page.locator('.look-sheet-experience').waitFor();
        assert.equal(await setupToggle.getAttribute('aria-expanded'),'true','Look Sheet tab return resets setup disclosure');
        await page.screenshot({path:path.join(output,`image-${theme}-${locale}-guided-header-${page.viewportSize().width}.png`)});
        records[records.length-1].guidedHeaderAligned=true;
      }
      assert.deepEqual(errors,[]);
      await context.close();
    }
    assert.deepEqual(unexpected,[]);
    await fs.writeFile(path.join(output,'evidence.json'),JSON.stringify(records,null,2));
    console.log(JSON.stringify({output,checks:records.length,evidence:`Actual ${guided?'Look Sheet':'Image'} route; intercepted reads and previews only; no paid/live mutation`},null,2));
  } catch(error) {
    console.error(`Evidence: ${output}; completed layout cases: ${records.length}`);
    await fs.writeFile(path.join(output,'partial-evidence.json'),JSON.stringify({records,failure:String(error)},null,2));
    for (const context of browser.contexts()) for (const page of context.pages()) await page.screenshot({path:path.join(output,'failure.png'),fullPage:true});
    throw error;
  } finally { await browser.close(); }
}

async function verifyGuidedWorkspace(page, {theme,locale,restored,records,caseViewports,lastEstimate}) {
  const builder=page.locator('.playground-workspace__builder');
  await builder.waitFor();
  assert.equal(await builder.getAttribute('open'),'','Guided definition starts expanded');
  assert.ok((await builder.locator('summary').textContent()).trim());
  const form=builder.locator('.look-sheet-form');
  await form.evaluate(el=>{el.dataset.qaMounted='retained';});
  const field=key=>form.locator(`[id$="-${key}"]`);
  const labels=JSON.parse(await fs.readFile(path.join(root,`client/i18n/locales/${locale}/playground.json`),'utf8'));
  assert.equal((await page.locator('.generation-reference-disclosure > details > summary strong').textContent()).trim(),
    labels['playground.options.references'],'Read-only guided references use their localized heading');
  assert.equal(await field('name').inputValue(),restored?lookSheetDefinition.name:'');
  assert.equal(await field('age').inputValue(),restored?'28':'');
  const {width,height}=caseViewports[0];
  const firstView=await inspectFirstView(page,width,height,{guided:true,hasPrompt:restored});
  const screenshot=`look-sheet-${theme}-${locale}-${restored?'restored':'fresh'}-${width}`;
  await page.screenshot({path:path.join(output,screenshot+'-first-view.png')});
  if (!restored) assert.equal(await page.locator('.studio-generate-button').isDisabled(),true);
  await field('appearance').fill('');
  assert.equal(await page.locator('.studio-generate-button').isDisabled(),true);
  await page.locator('.playground-workspace__setup-toggle').click();
  assert.equal(await field('appearance').isVisible(),false);
  await page.locator('.playground-workspace__setup-toggle').click();
  assert.equal(await field('appearance').inputValue(),'','Back to settings preserves incomplete input');
  for (const key of ['name','appearance','situation','outfit','personality']) await field(key).fill(lookSheetDefinition[key]);
  await field('age').fill('28');
  const preview=page.locator('.studio-prompt-preview textarea[readonly]');
  await preview.waitFor();
  await page.waitForFunction(()=>document.querySelector('.studio-prompt-preview textarea')?.value.includes('Fixture compiled Look Sheet'));
  await page.waitForFunction(()=>document.querySelector('.studio-generate-button:not(:disabled)'));
  assert.equal(await page.locator('#generation-main-prompt').count(),0,'Compiled Look Sheet is not an editable prompt');
  await field('age').fill('17');
  await page.waitForFunction(()=>document.querySelector('.studio-generate-button')?.disabled);
  assert.equal(await page.getByText(labels['lookSheet.adultRequired'],{exact:true}).count(),1);
  await field('age').fill('28');
  await page.waitForFunction(()=>document.querySelector('.studio-generate-button:not(:disabled)'));
  for (const {width,height} of caseViewports) {
    await page.setViewportSize({width,height});
    await page.locator('.playground-workspace__tools-frame').evaluate(el=>el.focus({preventScroll:true}));
    const frame=await inspectRouteRenderFrame(page);
    for (const key of ['name','age','appearance','situation','outfit','personality']) {
      await field(key).evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      assert.equal(await field(key).isVisible(),true,`Guided ${key} is reachable at ${width}`);
      const hit=await field(key).evaluate(el=>{
        const r=el.getBoundingClientRect(),x=r.left+Math.min(20,r.width/2),y=r.top+Math.min(20,r.height/2);
        const target=document.elementFromPoint(x,y);
        return {ok:el.contains(target),x,y,scrollTop:scrollY,viewport:innerHeight,target:target?.outerHTML.slice(0,250)};
      });
      assert.equal(hit.ok,true,`Guided ${key} is unobstructed at ${width}: ${JSON.stringify(hit)}`);
    }
    await builder.locator('summary').click();
    assert.equal(await builder.getAttribute('open'),null);
    assert.equal(await form.getAttribute('data-qa-mounted'),'retained','Collapsed guided fields stay mounted');
    assert.equal(await field('name').inputValue(),lookSheetDefinition.name);
    assert.equal(await page.locator('.studio-generate-button').count(),1);
    await builder.locator('summary').click();
    assert.equal(await field('appearance').inputValue(),lookSheetDefinition.appearance);
    await page.evaluate(()=>{
      window.scrollTo({top:0,left:0,behavior:'instant'});
      document.querySelector('.playground-workspace__composer').scrollTo({top:0,left:0,behavior:'instant'});
    });
    await page.screenshot({path:path.join(output,screenshot+'.png'),fullPage:true});
    records.push({media:'look-sheet',theme,locale,restored,width,height,firstView,frame,screenshot,
      checks:['model-visible','builder-mounted','definition-reachable','adult-validation','readonly-prompt','single-action']});
  }
  assert.deepEqual(lastEstimate().generationRequest.lookSheetDefinition,lookSheetDefinition,'Quoted definition matches guided form');
  const expand=page.locator('.playground-recent-panel__heading button');
  if (await expand.getAttribute('aria-expanded')!=='true') await expand.click();
  await page.locator('.playground-workspace__output .studio-recent__item').first().click();
  await page.getByRole('dialog').waitFor();
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').waitFor({state:'hidden'});
  assert.equal(await field('name').inputValue(),lookSheetDefinition.name,'Inspecting Recent does not overwrite the definition');
  await expand.click();
  assert.equal(await expand.getAttribute('aria-expanded'),'false','Guided Recent collapses through its existing route owner');
  assert.equal(await page.locator('#playground-recent-content').getAttribute('hidden'),'');
  await page.reload();
  await builder.waitFor();
  assert.equal(await builder.getAttribute('open'),'','Restored definition starts expanded');
  assert.equal(await expand.getAttribute('aria-expanded'),'false','Guided Recent collapse survives route reload');
  for (const key of ['name','appearance','situation','outfit','personality']) assert.equal(await field(key).inputValue(),lookSheetDefinition[key]);
  const persisted=await page.evaluate(actorId=>JSON.parse(localStorage.getItem(`mpf.react.draft:look-sheet-playground:${actorId}`)).payload,actor.userId);
  assert.deepEqual(persisted.definition,lookSheetDefinition);
  await page.setViewportSize({width:1440,height:900});
  await page.goto(`${origin}/create/playground?media=image`);
  await page.locator('.generation-model-picker__trigger').first().waitFor();
  await page.evaluate(()=>document.fonts.ready);
  records[records.length-1].generalImageFirstView=await inspectFirstView(page,1440,900);
  const imageModes=await page.locator('.playground-entry-header__modes').boundingBox();
  await page.goto(`${origin}/create/playground?media=image&imageMode=look-sheet`);
  await builder.waitFor();
  const guidedModes=await page.locator('.playground-entry-header__modes').boundingBox();
  for (const key of ['x','y','width','height']) assert.ok(Math.abs(imageModes[key]-guidedModes[key])<=1,`Image/Look Sheet media switch ${key} differs`);
}

async function inspectRouteRenderFrame(page) {
  const frames=await page.locator('.generation-render-frame,.engine-target-panel').evaluateAll(elements=>elements.map(el=>{
    const style=getComputedStyle(el),probe=document.createElement('span');
    probe.style.color=style.getPropertyValue('--theme-render-accent');el.append(probe);
    const accent=getComputedStyle(probe).color;probe.remove();
    return {nested:Boolean(el.parentElement.closest('.generation-render-frame,.engine-target-panel')),
      token:style.getPropertyValue('--theme-render-accent').trim(),accent,border:style.borderTopColor,
      width:style.borderTopWidth,shadow:style.boxShadow,animation:style.animationName};
  }));
  assert.equal(frames.filter(frame=>!frame.nested).length,1,JSON.stringify(frames));
  for (const frame of frames) {
    assert.ok(frame.token,'Dedicated render accent is present');
    assert.equal(frame.animation,'none');
    if (frame.nested) {
      assert.equal(frame.width,'0px','Nested engine border is suppressed');
      assert.equal(frame.shadow,'none','Nested engine glow is suppressed');
    } else {
      assert.equal(frame.border,frame.accent,'Outer frame uses dedicated render accent');
      assert.ok(parseFloat(frame.width)>0);
      assert.notEqual(frame.shadow,'none');
    }
  }
  assert.equal(await page.locator('.playground-workspace__output .generation-render-frame,.look-sheet-form.generation-render-frame,.generation-reference-disclosure.generation-render-frame').count(),0);
  return frames;
}

async function inspectFirstView(page, width, height, {guided=false,hasPrompt=true} = {}) {
  assert.equal(await page.locator('.app-sidebar.is-open').count(),0,'Entry fixture uses the closed app drawer');
  // Desktop-to-mobile resizing briefly animates the closed app drawer over tools.
  await page.waitForFunction(()=>{
    const sidebar=document.querySelector('.app-sidebar');
    return !sidebar || getComputedStyle(sidebar).position!=='fixed' || (sidebar.getBoundingClientRect().right<=0
      && !sidebar.getAnimations().some(animation=>animation instanceof CSSTransition
        && animation.transitionProperty==='transform' && animation.playState==='running'));
  });
  await page.evaluate(() => {
    window.scrollTo({top:0,left:0,behavior:'instant'});
    const composer = document.querySelector('.playground-workspace__composer');
    if (composer) composer.scrollTo({top:0,left:0,behavior:'instant'});
  });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.waitForFunction(()=>scrollY===0 && document.querySelector('.playground-workspace__composer').scrollTop===0,
    null,{timeout:3000});
  const measure = await page.evaluate(guided => {
    const rect = selector => { const node = document.querySelector(selector); if (!node) return null;
      const r = node.getBoundingClientRect(); return { x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom }; };
    const summary = document.querySelector('.generation-reference-disclosure');
    const images = [...(summary?.querySelectorAll(':scope > :not(details) img') || [])];
    const prompt=document.querySelector(guided?'.studio-prompt-preview textarea':'.playground-workspace__composer textarea');
    const input=prompt?.getBoundingClientRect(),composer=document.querySelector('.playground-workspace__composer').getBoundingClientRect();
    const entryTop=input ? Math.max(input.top,composer.top,0) : 0;
    const countGrid=document.querySelector('.playground-workspace__composer .engine-target-panel__output-grid:has(.engine-output-count:nth-child(3))');
    const settings=document.querySelector('.playground-workspace__render-settings');
    return { scrollTop:scrollY,scrollWidth:document.documentElement.scrollWidth,
      narrowImageColumns:countGrid && settings.clientWidth<=392 ? getComputedStyle(countGrid).gridTemplateColumns.split(/\s+/).length : null,
      sidebarOpen:document.querySelector('.app-sidebar')?.classList.contains('is-open') || false,
      sidebarTransform:document.querySelector('.app-sidebar') ? getComputedStyle(document.querySelector('.app-sidebar')).transform : null,
      header:rect('.playground-entry-header'),headerTitle:rect('.playground-entry-header h1'),
      headerModes:rect('.playground-entry-header__modes'),
      headerButtonHeights:[...document.querySelectorAll('.playground-entry-header__modes button')].map(button=>button.getBoundingClientRect().height),
      headerDescriptions:document.querySelectorAll('.playground-entry-header > p,.playground-entry-header > span').length,
      model:rect('.generation-model-picker__trigger'),prompt:rect(guided?'.studio-prompt-preview textarea':'.playground-workspace__composer textarea'),
      promptLabel:rect('.playground-workspace__composer label[for="generation-main-prompt"],.playground-workspace__composer .playground-prompt-editor__heading label'),
      generate:rect('.playground-workspace__action .studio-generate-button'),tools:rect('.playground-workspace__tools-frame'),
      composer:rect('.playground-workspace__composer'),
      writing:rect('.playground-workspace__writing'),renderSettings:rect('.playground-workspace__render-settings'),
      output:rect('.playground-workspace__output'),references:rect('.generation-reference-disclosure'),
      referencesOpen:summary?.querySelector('details')?.open,
      builderOpen:document.querySelector('.playground-workspace__builder')?.open,
      regionOrder:[...document.querySelector('.playground-workspace__writing').children].map(el=>el.matches('.playground-workspace__builder')?'builder':el.matches('.generation-reference-disclosure')?'references':'prompt'),
      thumbnailRows:new Set(images.map(img => Math.round(img.getBoundingClientRect().top))).size,
      promptUsableHeight:input ? Math.max(0,Math.min(input.bottom,composer.bottom,innerHeight)-entryTop) : 0,
      promptEntryUnobstructed:input ? prompt.contains(document.elementFromPoint(input.left+Math.min(20,input.width/2),entryTop+22)) : false,
      composerOverflow:getComputedStyle(document.querySelector('.playground-workspace__composer')).overflowY };
  },guided);
  assert.equal(measure.scrollTop, 0);
  assert.equal(measure.referencesOpen, false);
  assert.ok(measure.scrollWidth <= width + 1, JSON.stringify(measure));
  if (measure.narrowImageColumns !== null) assert.equal(measure.narrowImageColumns,2,'Narrow Image settings must use two columns, without an empty third track');
  assert.ok(measure.header && measure.headerTitle && measure.headerModes,'Editable Image/Video retains title and media switching');
  assert.equal(measure.headerDescriptions,0,'All Playground modes share the compact entry header');
  assert.equal(measure.headerButtonHeights.length,2);
  assert.ok(measure.headerButtonHeights.every(height=>height >= 44));
  assert.ok(measure.model && measure.model.y >= 0, `Model missing: ${JSON.stringify(measure)}`);
  assert.ok(measure.thumbnailRows <= 2, JSON.stringify(measure));
  if (guided) {
    assert.equal(measure.builderOpen,true);
    assert.deepEqual(measure.regionOrder,hasPrompt?['builder','references','prompt']:['builder','references']);
  } else {
    assert.ok(measure.promptLabel && measure.promptLabel.y < height * 2, `Prompt exceeds one viewport scroll: ${JSON.stringify(measure)}`);
    assert.ok(measure.prompt.height >= 180, 'Writing area must retain at least 180px rather than shrinking to fit settings');
  }
  if (width === 1440) {
    assert.ok(measure.model.bottom<=height,'Desktop model remains discoverable at entry');
    if (!guided) {
      assert.ok(measure.promptLabel.y >= measure.composer.y && measure.promptLabel.bottom <= Math.min(height,measure.composer.bottom), `Prompt label not in first viewport: ${JSON.stringify(measure)}`);
      assert.ok(measure.promptUsableHeight >= 44 && measure.promptEntryUnobstructed, `Less than 44px of usable Prompt entry above the action: ${JSON.stringify(measure)}`);
    }
    if (process.argv.includes('--comparison')) {
      assert.ok(measure.generate && measure.generate.y >= measure.renderSettings.y && measure.generate.bottom <= measure.renderSettings.bottom,
        'Comparison Generate follows readable slots within the naturally scrolling settings');
      await page.locator('.playground-workspace__action .studio-generate-button').scrollIntoViewIfNeeded();
      assert.equal(await page.locator('.playground-workspace__action .studio-generate-button').isVisible(),true);
      await page.evaluate(()=>window.scrollTo(0,0));
    } else assert.ok(measure.generate && measure.generate.y >= 0 && measure.generate.bottom <= height, `Generate not in first viewport: ${JSON.stringify(measure)}`);
    assert.ok(Math.abs(measure.headerTitle.y+measure.headerTitle.height/2-measure.headerModes.y-measure.headerModes.height/2)<=1,'Desktop title and media modes share one row');
    assert.ok(measure.renderSettings.x>=measure.writing.x+measure.writing.width,'Writing left, render settings right');
    assert.ok(measure.writing.width>measure.renderSettings.width,'Writing gets the wider column');
  } else {
    assert.ok(measure.renderSettings.y>=measure.writing.bottom,'Narrow screens follow authoring then render order');
  }
  assert.ok(measure.output.y >= measure.tools.bottom, JSON.stringify(measure));
  assert.equal(measure.composerOverflow, 'visible', 'Expanded setup uses natural page scrolling');
  measure.renderFrame = await inspectRouteRenderFrame(page);
  return measure;
}

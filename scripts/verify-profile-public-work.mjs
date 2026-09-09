import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import sharp from 'sharp';

const group = process.argv[2];
assert.ok(['profile', 'featured', 'works', 'creator', 'related'].includes(group), 'Choose profile, featured, works, creator or related');
const origin = process.env.PROFILE_LAYOUT_ORIGIN || 'http://127.0.0.1:5173';
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(origin).hostname));
const root = fileURLToPath(new URL('../', import.meta.url));
const output = await fs.mkdtemp(path.join(os.tmpdir(), `mpf-profile-public-${group}-`));
const actor = { userId: 'layout', username: 'layout', displayName: 'Layout', role: 'admin' };
const imageUrl = '/assets/scene-builder/shot-recipes/soft-character-portrait.jpg';
const character = { id: 'owner-character', displayName: 'Nara', personalitySummary: 'Quiet confidence.', visibility: 'private',
  status: 'approved', isOwner: true, characterType: 'reusable_model', reusePolicy: 'owner_only',
  characterProfileVersionId: 'v1', handoffAvailable: true, destinationCapabilities: ['scene_builder'],
  displayImageUrl: imageUrl, displayImageSource: 'owner_canonical_sheet', recordVersion: 1,
  ownerUsername: 'layout', intendedUses: ['scene_story'], stats: { totalOutputs: 0 } };
// Synthetic framed sources let the browser verify complete image boundaries without live media.
const sizes = [[600, 800], [600, 800], [1600, 900], [800, 800], [2400, 400], [400, 2400]];
const images = await Promise.all(sizes.map(async ([width, height]) => sharp(path.join(root, 'client', imageUrl))
  .resize(width - 12, height - 12, { fit: 'contain', background: '#232323' })
  .extend({ top: 6, bottom: 6, left: 6, right: 6, background: '#18dfb2' }).png().toBuffer()));
const posts = sizes.map(([width, height], index) => ({ id: `post-${index}`, title: `Image ${index}`, postType: 'image',
  imageUrl: `/fixture/image-${index}.png`, thumbnailUrl: imageUrl, presentationUrls: { templateCard: imageUrl },
  generationMetadata: { width, height }, visibility: 'public', status: 'published',
  creator: { username: 'layout', displayName: 'Layout' }, engagementSummary: { likeCount: 4 } }));
const api = {
  '/api/me': actor, '/api/mock-users': { enabled: false, users: [] },
  '/api/community/features': { community: { enabled: true, exploreEnabled: true, characterProfilesEnabled: true }, cinematic: {}, generation: {}, development: {}, routing: {} },
  '/api/community/creator-profiles/me': { id: 'creator', handle: 'layout', displayName: 'Layout' },
  '/api/credits/account': { account: { availableCredits: 100, reservedCredits: 0 } },
  '/api/generation/job-center': { items: [], activeCount: 0, terminalCount: 0, polledAt: new Date().toISOString() },
  '/api/health': { status: 'ok' }, '/api/collections': { collections: [] },
  '/api/providers': { providers: [], defaultProvider: null },
  '/api/community/posts': { items: posts, hasMore: false, ranking: { sort: 'latest', period: 'week', windowStart: '2026-09-01', windowEnd: '2026-09-08', algorithmVersion: 'fixture', calculatedAt: '2026-09-08' } },
  '/api/character-profiles/owner-character': character,
  '/api/community/characters/owner-character': { ...character, isOwner: false, visibility: 'public' },
  '/api/community/characters/owner-character/works': { items: group === 'works' ? posts : [], hasMore: false },
  '/api/character-profiles/owner-character/looks': { items: [], hasMore: false },
  '/api/character-profiles/owner-character/featured-image-candidates': { items: [], hasMore: false },
  '/api/scene-templates/shared/post-0': posts[0],
  '/api/community/posts/post-0/comments': { items: [], hasMore: false },
  '/api/community/posts/post-0/engagement': { postId: 'post-0', summary: {}, viewerState: {}, voteSummary: { bySlot: [], leaderSlotIds: [] } },
  '/api/community/creators/layout/page': { schemaVersion: 1, profile: { id: 'creator', handle: 'layout', displayName: 'Layout' },
    viewer: { isOwner: false, isFollowing: false, canEditProfile: false, canManageContent: false, canFollow: false, canReport: false },
    counts: {}, statistics: {}, capabilities: { availableTabs: ['overview', 'gallery'], defaultTab: 'overview', managementAvailable: false },
    selectedTab: 'gallery', tabData: { kind: 'gallery', page: { items: posts, hasMore: false } }, overview: null, management: null }
};
const browser = await chromium.launch({ headless: true });
const errors = [], unknown = new Set();
try {
  for (const locale of ['en', 'th']) {
    const context = await browser.newContext();
    await context.addInitScript(({ actor, locale }) => {
      localStorage.setItem('model_prompt_forge_language', locale);
      localStorage.setItem('mpf_active_mock_user_id', actor.userId);
    }, { actor, locale });
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin === origin && url.pathname === '/api/community/posts/post-0/views' && route.request().method() === 'POST') {
        return route.fulfill({ json: { recorded: true } });
      }
      if (url.origin !== origin || route.request().method() !== 'GET') {
        errors.push(`Blocked request: ${route.request().method()} ${url.pathname}`); return route.abort();
      }
      if (api[url.pathname]) return route.fulfill({ json: api[url.pathname] });
      if (url.pathname === '/api/community/posts/post-0/template-detail') return route.fulfill({ status: 404, json: { error: 'Not a template fixture' } });
      if (url.pathname.startsWith('/api/')) { unknown.add(url.pathname); return route.fulfill({ status: 404, json: {} }); }
      const match = /^\/fixture\/image-(\d).png$/.exec(url.pathname);
      if (match) return route.fulfill({ body: images[Number(match[1])], contentType: 'image/png' });
      if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/i18n/')) {
        const base = path.join(root, 'client');
        const file = path.resolve(base, decodeURIComponent(url.pathname.slice(1)));
        assert.ok(file.startsWith(`${base}${path.sep}`));
        try { return route.fulfill({ body: await fs.readFile(file), contentType: ({ '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg' })[path.extname(file)] || 'application/octet-stream' }); }
        catch { return route.fulfill({ status: 404, body: '' }); }
      }
      return route.continue();
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    const labels = JSON.parse(await fs.readFile(path.join(root, `client/i18n/locales/${locale}/character-profiles.json`), 'utf8'));
    const routePath = { profile: '/me/characters/owner-character', featured: '/', works: '/me/characters/owner-character', creator: '/profiles/layout/works', related: '/posts/post-0' }[group];
    const listSelector = { works: '.character-profile-work-grid', creator: '.creator-profile-tab-grid', related: '.community-more-from-creator__grid' }[group];
    await page.goto(`${origin}${routePath}`);
    if (group === 'profile') {
      await page.getByRole('tab', { name: labels['character-profiles.tabs.details'], exact: true }).click();
      await page.locator('.character-delete-danger').waitFor();
      assert.equal(await page.locator('.character-profile-panel > :last-child').getAttribute('class'), 'character-delete-danger');
      await page.getByRole('combobox', { name: labels['character-profiles.featured.sourceLabel'] }).waitFor();
    } else if (group === 'featured') await page.locator('.community-featured .community-media-card--adaptive-image').first().waitFor();
    else await page.locator(`${listSelector}.media-card-list .community-media-card--adaptive-image`).first().waitFor();
    await page.evaluate(() => document.fonts.ready);
    for (const width of [1440, 820, 390]) for (const theme of ['default', 'fashion', 'creative']) {
      console.log(`Checking ${group}/${locale}/${width}/${theme}`);
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
      await page.waitForTimeout(150);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'No document overflow');
      if (group === 'profile') {
        await page.locator('.character-delete-danger').scrollIntoViewIfNeeded();
        await page.screenshot({ path: path.join(output, `danger-${locale}-${width}-${theme}.png`) });
        await page.getByRole('button', { name: labels['character-profiles.delete.action'], exact: true }).click();
        const input = page.getByRole('textbox', { name: labels['character-profiles.delete.confirmation'], exact: true });
        const confirm = page.getByRole('button', { name: labels['character-profiles.delete.confirm'], exact: true });
        await input.fill('delete'); assert.equal(await confirm.isDisabled(), true);
        await input.fill('DELETE'); assert.equal(await confirm.isEnabled(), true);
        const bounds = await page.getByRole('dialog').boundingBox();
        assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width + 1 && bounds.y >= 0 && bounds.y + bounds.height <= 1001);
        await page.screenshot({ path: path.join(output, `dialog-${locale}-${width}-${theme}.png`) });
        await page.getByRole('button', { name: labels['character-profiles.delete.cancel'], exact: true }).click();
      } else if (group === 'featured') {
        const section = page.locator('.community-featured');
        await section.scrollIntoViewIfNeeded();
        const cards = section.locator('.community-media-card--adaptive-image');
        assert.equal(await cards.count(), 4);
        const viewport = section.locator('.horizontal-media-carousel__viewport');
        await viewport.evaluate(el => { el.scrollLeft = 0; });
        const geometry = await cards.evaluateAll(els => els.map(el => ({ width: el.getBoundingClientRect().width, height: el.querySelector('.community-media-card__stage').getBoundingClientRect().height })));
        assert.ok(geometry.every(item => item.height === (width <= 620 ? 280 : 320)));
        const available = await viewport.evaluate(el => el.clientWidth);
        assert.ok(geometry.every(item => item.width <= available + 1));
        if (width === 1440) assert.ok(geometry[1].width > geometry[0].width + 100);
        for (let i = 0; i < 4; i++) {
          const img = cards.nth(i).locator('img').first();
          await img.evaluate(async el => { el.loading = 'eager'; await el.decode(); });
          assert.equal(await img.evaluate(el => getComputedStyle(el).objectFit), 'contain');
          assert.equal(await img.getAttribute('src'), `/fixture/image-${i + 1}.png`);
        }
        assert.equal(await page.locator('.community-feed-grid .community-media-card--adaptive-image').count(), 6);
        await checkList(page, '.community-feed-grid', width);
        await page.screenshot({ path: path.join(output, `featured-${locale}-${width}-${theme}.png`) });
        const buttons = section.locator('.horizontal-media-carousel__controls button');
        if (await buttons.count() && await buttons.last().isEnabled()) {
          await buttons.last().click(); await page.waitForTimeout(400);
          assert.ok(await viewport.evaluate(el => el.scrollLeft > 0));
        }
        await page.locator('.community-feed-grid').scrollIntoViewIfNeeded();
        await page.screenshot({ path: path.join(output, `feed-${locale}-${width}-${theme}.png`) });
      } else {
        await checkList(page, listSelector, width);
        await page.locator(listSelector).scrollIntoViewIfNeeded();
        await page.screenshot({ path: path.join(output, `${group}-${locale}-${width}-${theme}.png`) });
      }
    }
    if (group === 'profile') {
      await page.goto(`${origin}/characters/owner-character`);
      await page.getByRole('tab', { name: labels['character-profiles.tabs.details'], exact: true }).click();
      assert.equal(await page.locator('.character-delete-danger').count(), 0);
    } else if (group === 'works') {
      await page.getByRole('tab', { name: labels['character-profiles.tabs.creations'], exact: true }).click();
      await checkList(page, listSelector, 390);
    }
    await context.close();
  }
  assert.deepEqual(errors, []); assert.deepEqual([...unknown], []);
  console.log(`PASS ${group}: EN/TH, 1440/820/390, three themes, no live writes. Screenshots: ${output}`);
} finally { await browser.close(); }

async function checkList(page, selector, width) {
  const list = page.locator(selector);
  const available = await list.evaluate(el => el.clientWidth);
  assert.equal(await list.evaluate(el => getComputedStyle(el).display), 'flex');
  const cards = list.locator('.community-media-card--adaptive-image');
  assert.ok(await cards.count() >= 4);
  for (const card of await cards.all()) {
    const cardBox = await card.boundingBox();
    assert.ok(cardBox.width <= available + 1);
    const stage = card.locator('.community-media-card__stage');
    assert.equal(await stage.evaluate(el => el.clientHeight), width <= 620 ? 280 : 320);
    const img = stage.locator('img');
    await img.evaluate(async el => { el.loading = 'eager'; await el.decode(); });
    assert.equal(await img.evaluate(el => getComputedStyle(el).objectFit), 'contain');
    const imageBox = await img.boundingBox(), stageBox = await stage.boundingBox();
    assert.ok(imageBox.height <= stageBox.height + 1 && imageBox.width <= stageBox.width + 1, 'Image fits the stage without grid intrinsic overflow');
    assert.match(await img.getAttribute('src'), /^\/fixture\/image-\d.png$/);
    assert.match(await card.locator('a').first().getAttribute('href'), /^\/posts\/post-/);
  }
}

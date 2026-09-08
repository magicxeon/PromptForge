import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import { installCharacterDiscoveryLayoutFixture } from '../test/fixtures/characterDiscoveryLayoutFixture.mjs';

// Entirely intercepted built-app fixture; no server, provider or live data access.
const origin = 'http://scroll-fixture.local';
const html = await fs.readFile(new URL('../web/dist/index.html', import.meta.url));
const output = await fs.mkdtemp(path.join(os.tmpdir(), 'route-scroll-'));
const browser = await chromium.launch({ headless: true });
const posts = Array.from({ length: 18 }, (_, i) => ({
  id: `scroll-post-${i}`, title: `Scroll verification ${i}`, postType: 'image', visibility: 'public', status: 'published',
  imageUrl: '/assets/scene-builder/shot-recipes/soft-character-portrait.jpg',
  creator: { username: 'demo', displayName: 'Demo creator' }, engagementSummary: {}
}));
try {
  for (const width of [390, 820, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    await context.addInitScript(() => {
      localStorage.setItem('model_prompt_forge_language', 'en');
      localStorage.setItem('mpf_active_mock_user_id', 'usr_demo');
    });
    const blocked = await installCharacterDiscoveryLayoutFixture(context, origin);
    await context.route('**/*', async route => {
      const req = route.request(); const url = new URL(req.url()); const p = url.pathname;
      if (url.origin !== origin) return route.fallback();
      if (req.isNavigationRequest()) return route.fulfill({ body: html, contentType: 'text/html' });
      if (p === '/api/community/posts') return route.fulfill({ json: { items: posts, hasMore: false,
        ranking: { sort: 'latest', period: 'week', windowStart: '2026-09-01', windowEnd: '2026-09-08', algorithmVersion: 'fixture', calculatedAt: '2026-09-08' } } });
      if (p.startsWith('/api/scene-templates/shared/scroll-post-')) {
        await new Promise(resolve => setTimeout(resolve, 250));
        return route.fulfill({ json: posts.find(item => p.endsWith(item.id)) });
      }
      if (p.endsWith('/template-detail')) return route.fulfill({ json: { template: null, items: [], hasMore: false, nextCursor: null } });
      if (p.endsWith('/comments')) return route.fulfill({ json: { items: [], hasMore: false } });
      if (p.endsWith('/engagement')) return route.fulfill({ json: { postId: p.split('/').at(-2), summary: {}, viewerState: { liked: false, saved: false }, voteSummary: { bySlot: [], leaderSlotIds: [] } } });
      if (p.endsWith('/views')) return route.fulfill({ json: { ok: true } });
      if (p === '/api/community/template-previews') return route.fulfill({ json: { items: [] } });
      if (p === '/api/providers') return route.fulfill({ json: { providers: [] } });
      return route.fallback();
    });
    const page = await context.newPage();
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${origin}/`);
    const card = page.locator('.community-feed-grid a[href="/posts/scroll-post-8"]').first();
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(100);
    const sourceY = await page.evaluate(() => scrollY);
    assert.ok(sourceY > 500);
    await card.click();
    await page.locator('.community-post-media-panel img').waitFor();
    await page.waitForFunction(() => scrollY < 2);
    await page.waitForFunction(() => !document.querySelector('.engagement-bar [aria-busy="true"]'));
    assert.equal(await page.locator('.engagement-bar__error').count(), 0);
    assert.ok(await page.locator('.community-post-page').evaluate(el => el.getBoundingClientRect().top >= 0));
    await page.screenshot({ path: path.join(output, `post-top-${width}.png`) });
    await page.locator('.community-post-page > a').first().click();
    await page.waitForFunction(expected => Math.abs(scrollY - expected) < 3, sourceY);
    await page.screenshot({ path: path.join(output, `gallery-return-${width}.png`) });
    // The context-return entry is separate from browser history Back/Forward.
    await page.goBack();
    await page.locator('.community-post-page').waitFor();
    await page.waitForFunction(() => scrollY < 2);
    await page.goBack();
    await page.waitForFunction(expected => Math.abs(scrollY - expected) < 3, sourceY);
    await page.goForward();
    await page.locator('.community-post-page').waitFor();
    await page.waitForFunction(() => scrollY < 2);
    const nextPost = page.locator('.community-media-card a[href="/posts/scroll-post-1"]').first();
    await nextPost.scrollIntoViewIfNeeded();
    await nextPost.click();
    await page.waitForURL('**/posts/scroll-post-1');
    await page.waitForFunction(() => scrollY < 2);
    await page.goto(`${origin}/#community-feed`);
    await page.waitForFunction(() => {
      const section = document.getElementById('community-feed');
      return section && scrollY > 0 && Math.abs(section.getBoundingClientRect().top) < 150;
    });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(errors, []);
    assert.deepEqual(blocked, []);
    console.log(`PASS ${width}px: new post, context return, Back/Forward, next post, async hash, overflow`);
    await context.close();
  }
  console.log(`Screenshots: ${output}`);
} finally { await browser.close(); }

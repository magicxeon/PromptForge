import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import { installTemplateSceneLayoutFixture } from '../test/fixtures/templateSceneLayoutFixture.mjs';

const scope = process.argv[2];
if (!['scene', 'profile', 'feed'].includes(scope)) throw new Error('Choose scene|profile|feed');
const origin = 'http://localhost:6500';
const html = await fs.readFile(new URL('../web/dist/index.html', import.meta.url));
const output = await fs.mkdtemp(path.join(os.tmpdir(), `publication-${scope}-layout-`));
const browser = await chromium.launch({ headless: true });
const imageUrl = '/assets/scene-builder/shot-recipes/soft-character-portrait.jpg';
const sheetBody = process.env.CHARACTER_PROFILE_LAYOUT_SHEET
  ? await fs.readFile(path.resolve(process.env.CHARACTER_PROFILE_LAYOUT_SHEET)) : null;
const character = { id: 'owner-character', displayName: 'Nara', personalitySummary: 'Quiet confidence.',
  visibility: 'private', status: 'approved', isOwner: true, characterType: 'reusable_model', reusePolicy: 'owner_only',
  characterProfileVersionId: 'v1', handoffAvailable: true, destinationCapabilities: ['scene_builder'],
  displayImageUrl: sheetBody ? '/fixture/character-sheet.png' : imageUrl, displayImageSource: 'owner_canonical_sheet',
  recordVersion: 1, ownerUsername: 'demo', intendedUses: ['scene_story'], stats: { totalOutputs: 0 },
  identityMetadata: { schemaVersion: 2, missingFields: ['Ethnicity'] } };
const posts = Array.from({ length: 6 }, (_, i) => ({ id: `round-post-${i}`, title: `Public image ${i + 1}`, postType: 'image',
  imageUrl, visibility: 'public', status: 'published', creator: { username: 'demo', displayName: 'Creator' }, engagementSummary: {} }));
let cases = 0;
try {
  for (const locale of ['en', 'th']) {
    const context = await browser.newContext();
    await context.addInitScript(value => {
      localStorage.setItem('model_prompt_forge_language', value);
      localStorage.setItem('mpf_active_mock_user_id', 'usr_demo');
    }, locale);
    const ui = JSON.parse(await fs.readFile(new URL(`../client/i18n/locales/${locale}/character-profiles.json`, import.meta.url), 'utf8'));
    const { blocked } = await installTemplateSceneLayoutFixture(context, origin);
    let coverSelected = false;
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      const p = url.pathname;
      if (['/', '/me/characters/owner-character'].includes(p)) return route.fulfill({ body: html, contentType: 'text/html' });
      if (p === '/fixture/character-sheet.png' && sheetBody) return route.fulfill({ body: sheetBody, contentType: 'image/png' });
      if (p === '/api/character-profiles/owner-character') {
        assert.equal(route.request().method(), 'GET', 'Never delete a live Character in layout verification');
        return route.fulfill({ json: coverSelected ? { ...character, displayImageUrl: imageUrl, displayImageSource: 'owner_selected_generation',
          featuredImageMode: 'manual', featuredImageSourceType: 'generation_result', featuredGenerationResultId: 'old-image', recordVersion: 2 } : character });
      }
      if (p === '/api/character-profiles/owner-character/featured-image' && route.request().method() === 'PATCH') {
        assert.equal(route.request().postDataJSON().displayConsentAccepted, true);
        coverSelected = true;
        return route.fulfill({ json: { characterProfileId: character.id, recordVersion: 2, featuredImageMode: 'manual',
          featuredImageSourceType: 'generation_result', featuredGenerationResultId: 'old-image', featuredWorkPostId: null } });
      }
      if (p === '/api/character-profiles/owner-character/featured-image-candidates') {
        const own = url.searchParams.get('scope') === 'own';
        const second = url.searchParams.has('cursor');
        return route.fulfill({ json: { items: own ? [{ id: 'generation_result:old-image', sourceType: 'generation_result',
          sourceId: 'old-image', generationResultId: 'old-image', postId: null, ownership: 'owner', linkedToCharacter: false,
          title: locale === 'th' ? 'ภาพของฉันที่ยังไม่ได้เชื่อมกับตัวละคร' : 'My unlinked image', imageUrl, createdAt: '2026-09-08' }] : [],
          hasMore: own && !second, nextCursor: own && !second ? 'page-2' : null } });
      }
      if (p === '/api/community/posts') return route.fulfill({ json: { items: posts, hasMore: false,
        ranking: { sort: 'latest', period: 'week', windowStart: '2026-09-01', windowEnd: '2026-09-08', algorithmVersion: 'fixture', calculatedAt: '2026-09-08' } } });
      if (p.includes('round-post-') && p.endsWith('/engagement')) return route.fulfill({ json: { postId: p.split('/').at(-2), summary: {}, viewerState: {}, voteSummary: { bySlot: [], leaderSlotIds: [] } } });
      if (p.includes('/owner-character/') && /works|featured-image|looks/.test(p)) return route.fulfill({ json: { items: [], hasMore: false } });
      return route.fallback();
    });
    const page = await context.newPage();
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    for (const width of [390, 820, 1440]) for (const theme of ['default', 'fashion', 'creative']) {
      console.log(`[Publication layout] ${scope}/${locale}/${width}/${theme}`);
      await page.setViewportSize({ width, height: 1000 });
      coverSelected = false;
      await page.goto(`${origin}${scope === 'scene' ? '/create/studio/scene' : scope === 'profile' ? '/me/characters/owner-character' : '/'}`);
      await page.locator(scope === 'scene' ? '.studio-configurator-panel' : scope === 'profile' ? '.character-showcase' : '.community-feed-grid').waitFor();
      await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
      if (scope === 'scene') {
        await page.locator('.template-scene-panel__character > button').click();
        await page.locator('.character-picker__grid button').first().waitFor();
        await page.screenshot({ path: path.join(output, `picker-${locale}-${width}-${theme}.png`) });
        await page.keyboard.press('Escape');
      } else if (scope === 'profile') {
        const sheetImage = page.locator('.character-showcase__image');
        await sheetImage.waitFor();
        await page.waitForFunction(() => document.querySelector('.character-showcase__image')?.naturalWidth > 0);
        assert.equal(await sheetImage.evaluate(img => getComputedStyle(img).objectFit), 'contain');
        await page.screenshot({ path: path.join(output, `sheet-${locale}-${width}-${theme}.png`), fullPage: true });
        assert.equal(await page.getByRole('button', { name: ui['character-profiles.actions.copyLink'], exact: true }).isDisabled(), true);
        await page.getByRole('button', { name: ui['character-profiles.actions.visibilityReuse'], exact: true }).click();
        await page.getByRole('button', { name: ui['character-profiles.sharing.save'], exact: true }).waitFor();
        assert.ok(await page.getByRole('status').filter({ hasText: ui['character-profiles.identity.Ethnicity'] }).count());
        const source = page.getByRole('combobox', { name: ui['character-profiles.featured.sourceLabel'] });
        await source.selectOption('own');
        await page.getByRole('button', { name: ui['character-profiles.featured.select'], exact: true }).waitFor();
        await page.getByRole('button', { name: ui['character-profiles.featured.next'], exact: true }).click();
        await page.getByRole('button', { name: ui['character-profiles.featured.previous'], exact: true }).click();
        await page.getByRole('button', { name: ui['character-profiles.featured.select'], exact: true }).click();
        await page.getByRole('dialog').waitFor();
        await page.screenshot({ path: path.join(output, `cover-consent-${locale}-${width}-${theme}.png`) });
        await page.getByRole('button', { name: ui['character-profiles.featured.confirm'], exact: true }).click();
        await page.getByRole('dialog').waitFor({ state: 'hidden' });
        await page.getByText(ui['character-profiles.featured.statusManual'], { exact: true }).waitFor();
        await page.getByRole('button', { name: ui['character-profiles.delete.action'], exact: true }).click();
        const confirmation = page.getByRole('textbox', { name: ui['character-profiles.delete.confirmation'], exact: true });
        await confirmation.fill('delete');
        assert.equal(await page.getByRole('button', { name: ui['character-profiles.delete.confirm'], exact: true }).isDisabled(), true);
        await confirmation.fill('DELETE');
        assert.equal(await page.getByRole('button', { name: ui['character-profiles.delete.confirm'], exact: true }).isEnabled(), true);
        await page.screenshot({ path: path.join(output, `delete-confirmation-${locale}-${width}-${theme}.png`) });
        const dialog = await page.getByRole('dialog').boundingBox();
        assert.ok(dialog && dialog.x >= 0 && dialog.x + dialog.width <= width + 1 && dialog.y >= 0 && dialog.y + dialog.height <= 1001);
        await page.getByRole('button', { name: ui['character-profiles.delete.cancel'], exact: true }).click();
      } else {
        assert.equal(await page.locator('.community-feed-grid .community-media-card').count(), 6);
      }
      await page.evaluate(() => Promise.race([
        Promise.all([...document.images].map(image => { image.loading = 'eager'; return image.decode(); })),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Fixture image decode timed out')), 8000))
      ]));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, 'No horizontal overflow');
      await page.screenshot({ path: path.join(output, `${locale}-${width}-${theme}.png`), fullPage: true });
      cases++;
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(blocked, []);
    await context.close();
  }
  console.log(JSON.stringify({ status: 'PASS', scope, cases, screenshots: output, liveMutations: false }));
} finally { await browser.close(); }

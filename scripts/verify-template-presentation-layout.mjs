import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import sharp from 'sharp';
import { creationFixtures, installTemplateDetailLayoutFixture, templateFixture } from '../test/fixtures/templateDetailLayoutFixture.mjs';

const scope = process.argv.find(arg => arg.startsWith('--scope='))?.slice(8) || 'gallery';
if (!['gallery', 'photo', 'icons'].includes(scope)) throw new Error('Use --scope=gallery|photo|icons');
const locale = process.argv.find(arg => arg.startsWith('--locale='))?.slice(9) || 'en';
if (!['en', 'th'].includes(locale)) throw new Error('Use --locale=en|th');
const stress = process.argv.includes('--stress');
const heroCreations = Number(process.argv.find(arg => arg.startsWith('--hero-creations='))?.split('=')[1] ?? 3);
if (![0, 1, 2, 3].includes(heroCreations)) throw new Error('Use --hero-creations=0|1|2|3');
const output = await fs.mkdtemp(path.join(os.tmpdir(), 'template-presentation-'));
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext();
  await context.addInitScript(value => localStorage.setItem('model_prompt_forge_language', value), locale);
  const blocked = await installTemplateDetailLayoutFixture(context, 'http://localhost:6500');
  if (scope === 'gallery') {
    await context.route('**/api/community/template-previews?*', route => route.fulfill({ json: {
      items: [{ templatePostId: templateFixture.id, items: creationFixtures.slice(0, heroCreations), hasMore: false }]
    } }));
  }
  if (scope === 'icons') {
    const html = await fs.readFile(new URL('../web/dist/index.html', import.meta.url));
    await context.route('http://localhost:6500/', route => route.fulfill({ body: html, contentType: 'text/html' }));
    await context.route(/\/api\/providers(?:\?.*)?$/, route => route.fulfill({ json: { defaultProvider: 'gemini', providers: ['gemini', 'openai', 'xai', 'modelark', 'meta-muse'].map(id => ({ id, displayName: id, defaultModel: 'fixture', models: [{ id: 'fixture', displayName: 'Fixture image model', capabilities: { imageGeneration: true } }] })) } }));
  }
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const width of (stress ? [320, 1920] : [390, 820, 1440])) {
    await page.setViewportSize({ width, height: 1000 });
    for (const theme of (stress ? ['default'] : ['default', 'fashion', 'creative'])) {
      await page.goto(scope === 'icons' ? 'http://localhost:6500/' : `http://localhost:6500/explore/templates${scope === 'photo' ? '/template-original' : ''}`);
      await page.locator(scope === 'icons' ? '.provider-mark__shape' : scope === 'photo' ? '.template-detail-creations__grid article' : '.template-discovery-card').first().waitFor();
      if (scope === 'gallery' && heroCreations >= 3) await page.locator('.template-hero__image--original').waitFor();
      await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
      await page.evaluate(() => document.querySelectorAll('main img').forEach(img => { img.loading = 'eager'; }));
      await page.waitForFunction(() => Array.from(document.querySelectorAll('main img')).every(img => img.complete));
      const layout = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth + 1,
        broken: Array.from(document.querySelectorAll('main img')).filter(img => !img.naturalWidth).length,
        nested: document.querySelectorAll('main a button, main button a').length }));
      assert.deepEqual(layout, { overflow: false, broken: 0, nested: 0 }, `${scope}/${width}/${theme}`);
      if (scope === 'gallery') {
        const emphasis = await page.evaluate(() => {
          const hero = document.querySelector('.template-gallery-page > .discovery-page-hero');
          const copy = hero.querySelector('.discovery-page-hero__copy');
          const description = copy.querySelector('p');
          const steps = document.querySelector('.template-gallery-page > .discovery-steps');
          const frame = steps.getBoundingClientRect();
          const actions = [...hero.querySelectorAll('a')];
          const band = hero.querySelector('.discovery-page-hero__media').getBoundingClientRect();
          const original = hero.querySelector('.template-hero__image--original')?.getBoundingClientRect();
          return {
            illustrated: hero.classList.contains('template-gallery-hero--illustrated'),
            width: hero.getBoundingClientRect().width,
            mediaWidth: band.width,
            originalAtRight: original ? Math.abs(original.right - band.right) <= 1 : false,
            visibleImages: [...hero.querySelectorAll('.template-hero__image')].filter(el => el.getBoundingClientRect().width > 0).length,
            clippedFade: getComputedStyle(hero.querySelector('.discovery-page-hero__scrim')).clipPath,
            height: hero.getBoundingClientRect().height,
            descriptionWidth: description.getBoundingClientRect().width,
            copyWidth: copy.getBoundingClientRect().width,
            featuredCount: document.querySelectorAll('.template-feature').length,
            controlsContained: actions.every(el => {
              const bounds = el.getBoundingClientRect();
              const parent = hero.getBoundingClientRect();
              return bounds.left >= parent.left - 1 && bounds.right <= parent.right + 1
                && bounds.top >= parent.top - 1 && bounds.bottom <= parent.bottom + 1;
            }),
            headerAboveSteps: hero.getBoundingClientRect().bottom < frame.top,
            catalogBelowSteps: document.querySelector('#template-catalog').getBoundingClientRect().top > frame.bottom,
            nextSectionIsSteps: hero.nextElementSibling === steps,
            steps: document.querySelectorAll('.template-gallery-page > .discovery-steps').length,
            tutorials: document.querySelectorAll('.template-gallery-page > .editorial-tutorial').length
          };
        });
        assert.equal(emphasis.illustrated, heroCreations >= 3, 'Only eligible families render an illustrated header');
        if (emphasis.illustrated) {
          assert.ok(Math.abs(emphasis.mediaWidth / emphasis.width - .75) < .01, 'Hero images use the right 75 percent');
          assert.ok(emphasis.originalAtRight, 'Original is the far-right image');
          assert.equal(emphasis.visibleImages, emphasis.width <= 560 ? 2 : 4);
          assert.equal(emphasis.clippedFade, 'none', 'Hero fade has no hard clipped edge');
          if (width >= 1440) assert.ok(emphasis.height >= 300 && emphasis.height <= 360, `Bounded desktop hero: ${emphasis.height}px`);
          const originalLink = page.locator('.template-hero__original-link');
          assert.ok(await originalLink.evaluate(el => {
            const rect = el.getBoundingClientRect();
            return el.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
          }), 'Original detail link is not blocked by the copy or gradient');
          await originalLink.focus();
          assert.ok(await originalLink.evaluate(el => el === document.activeElement && parseFloat(getComputedStyle(el).outlineWidth) >= 2), 'Original link has a visible keyboard focus indicator');
          await originalLink.evaluate(el => el.blur());
        } else {
          assert.ok(Math.abs(emphasis.descriptionWidth - emphasis.copyWidth) <= 1, 'Compact header description uses the available width');
          if (width >= 1440) assert.ok(emphasis.height < 180, `Compact desktop header: ${emphasis.height}px`);
        }
        assert.equal(emphasis.featuredCount, 0, 'Duplicate Featured section stays unmounted');
        assert.ok(emphasis.controlsContained, 'Header controls stay inside their section');
        assert.ok(emphasis.headerAboveSteps && emphasis.catalogBelowSteps && emphasis.nextSectionIsSteps);
        assert.equal(emphasis.steps, 1);
        assert.equal(emphasis.tutorials, 1);
        await page.screenshot({ path: path.join(output, `gallery-header-${width}-${theme}.png`) });
        console.log(`[Gallery emphasis] header=${Math.round(emphasis.height)}px copy=${Math.round(emphasis.copyWidth)}px`);
      }
      if (scope === 'icons') {
        assert.equal(await page.locator('.provider-mark__shape').count(), 5);
        for (const shape of await page.locator('.provider-mark__shape').all()) {
          const color = await shape.evaluate(el => {
            const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
            const ctx = canvas.getContext('2d'); ctx.fillStyle = getComputedStyle(el).color; ctx.fillRect(0, 0, 1, 1);
            return Array.from(ctx.getImageData(0, 0, 1, 1).data).slice(0, 3);
          });
          const { data, info } = await sharp(await shape.screenshot()).removeAlpha().raw().toBuffer({ resolveWithObject: true });
          let colored = 0;
          for (let i = 0; i < data.length; i += info.channels) if (color.every((v, c) => Math.abs(v - data[i + c]) < 60)) colored++;
          assert.ok(colored > 4, `Provider mask must paint real accent-color pixels: ${await shape.evaluate(el => el.parentElement.dataset.providerMark)} ${color} count=${colored}`);
        }
        await page.locator('.community-provider summary').first().click();
        assert.equal(await page.locator('.community-provider[open]').count(), 1);
      }
      if (scope === 'photo') {
        await page.locator('.photo-original-expand').click();
        await page.locator('.photo-original-dialog').waitFor();
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => !document.querySelector('.photo-original-dialog'));
        assert.ok(await page.locator('.photo-original-expand').evaluate(el => el === document.activeElement), 'Lightbox restores focus');
      }
      await page.screenshot({ path: path.join(output, `${scope}-${width}-${theme}.png`), fullPage: true });
      console.log(`[Presentation layout] ${scope}/${width}/${theme} passed`);
    }
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(blocked, []);
  console.log(`Screenshots: ${output}`);
} finally { await browser.close(); }

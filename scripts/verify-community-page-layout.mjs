import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';

const origin = process.env.COMMUNITY_LAYOUT_ORIGIN || 'http://localhost:6500';
const parsedOrigin = new URL(origin);
if (!['localhost', '127.0.0.1'].includes(parsedOrigin.hostname)) {
  throw new Error('Community layout verification only runs against a local server.');
}

const scope = readArgument('scope') || 'all';
const fixtureMode = process.argv.includes('--fixture');
if (fixtureMode && scope !== 'characters') throw new Error('--fixture supports only --scope=characters.');
const locale = readArgument('locale');
if (locale && !['en', 'th'].includes(locale)) throw new Error('--locale must be en or th.');
const captureScreenshots = process.argv.includes('--screenshots');
const routes = [
  { id: 'home', path: '/', selector: '.community-home' },
  { id: 'templates', path: '/explore/templates', selector: '.template-gallery-page' },
  { id: 'characters', path: '/explore/characters', selector: '.character-gallery-page' },
  { id: 'comparisons', path: '/explore/comparisons', selector: '.comparison-gallery-page' }
].filter(route => scope === 'all' || route.id === scope);

if (!routes.length) {
  throw new Error(`Unknown scope "${scope}". Use home, templates, characters, comparisons or all.`);
}

const viewports = [
  { id: 'mobile', width: 390, height: 844 },
  { id: 'tablet', width: 820, height: 1000 },
  { id: 'desktop', width: 1440, height: 1000 }
];
const themes = ['default', 'fashion', 'creative'];
const output = captureScreenshots
  ? await fs.mkdtemp(path.join(os.tmpdir(), 'community-page-layout-'))
  : null;
const browser = await chromium.launch({ headless: true });
const measurements = [];

try {
  for (const route of routes) {
    const context = await browser.newContext({ viewport: viewports[2] });
    if (locale) await context.addInitScript(value => localStorage.setItem('model_prompt_forge_language', value), locale);
    const blockedRequests = fixtureMode
      ? await (await import('../test/fixtures/characterDiscoveryLayoutFixture.mjs')).installCharacterDiscoveryLayoutFixture(context, parsedOrigin.origin)
      : [];
    const page = await context.newPage();
    const pageErrors = [];
    let measuring = true;
    let requestCount = 0;
    let mediaRequestCount = 0;
    let declaredResponseBytes = 0;
    let characterDirectory;

    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('request', request => {
      if (!measuring) return;
      requestCount += 1;
      if (request.resourceType() === 'image' || request.resourceType() === 'media') {
        mediaRequestCount += 1;
      }
    });
    page.on('response', response => {
      if (route.id === 'characters' && new URL(response.url()).pathname === '/api/community/characters') {
        characterDirectory = response.json();
      }
      if (!measuring) return;
      const value = Number(response.headers()['content-length']);
      if (Number.isFinite(value)) declaredResponseBytes += value;
    });

    await page.goto(new URL(route.path, parsedOrigin).toString(), { waitUntil: 'domcontentloaded' });
    await page.locator(route.selector).waitFor({ timeout: 30_000 });
    await page.waitForTimeout(1200);
    if (route.id === 'home') {
      await page.locator('.community-providers').waitFor();
      await page.waitForFunction(() => document.querySelector('.community-providers')?.getAttribute('aria-busy') === 'false');
    }
    if (route.id === 'characters') {
      await page.locator('.character-discovery-grid .character-discovery-card').first().waitFor();
      await page.waitForFunction(() => !document.querySelector('.character-moments [role="status"]'));
      await page.evaluate(() => Promise.all(Array.from(document.querySelectorAll('.character-gallery-page img'))
        .map(img => img.decode().catch(() => {}))));
    }
    measuring = false;
    measurements.push({ route: route.id, requestCount, mediaRequestCount, declaredResponseBytes });
    const characterSummaries = route.id === 'characters' ? (await characterDirectory)?.items : [];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      for (const theme of themes) {
        await page.evaluate(value => {
          document.documentElement.dataset.theme = value;
          document.documentElement.style.colorScheme = value === 'fashion' ? 'light' : 'dark';
        }, theme);
        await page.waitForTimeout(80);
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));

        if (route.id === 'characters') {
          await verifyCharacterHighlight(page, viewport, characterSummaries);
          const characterLayout = await page.evaluate(() => {
            const hero = document.querySelector('.character-gallery-hero');
            const grid = document.querySelector('.character-discovery-grid');
            return {
              heroHeight: hero.getBoundingClientRect().height,
              identityCount: hero.querySelectorAll('li').length,
              brokenImages: Array.from(document.querySelectorAll('.character-gallery-page img')).filter(img => !img.naturalWidth).length,
              columns: getComputedStyle(grid).gridTemplateColumns.split(' ').length,
              tutorialHeights: Array.from(document.querySelectorAll('.character-gallery-page .editorial-tutorial__item')).map(el => el.getBoundingClientRect().height),
              deniedActions: document.querySelectorAll('.character-discovery-card[data-reusable="false"] .character-create-action').length,
              hasStudioCta: Boolean(document.querySelector('.character-studio-cta a[href="/create/studio/character"]'))
            };
          });
          assert.ok(characterLayout.heroHeight < 360, 'Character hero must leave room for featured identity.');
          assert.ok(characterLayout.identityCount <= 4, 'Identity ribbon must stay bounded.');
          assert.equal(characterLayout.brokenImages, 0, 'Character public media failed to decode.');
          assert.equal(characterLayout.deniedActions, 0, 'View-only Characters must not expose Create with.');
          assert.equal(characterLayout.hasStudioCta, true, 'Bottom Character Studio CTA missing.');
          assert.ok(characterLayout.tutorialHeights.every(height => height <= 230), 'Character tutorials must remain compact.');
          if (viewport.width === 1440) assert.equal(characterLayout.columns, 2, 'Desktop must show two identity columns.');
          if (viewport.width === 390) assert.equal(characterLayout.columns, 1, 'Mobile must show one readable identity column.');
          const createTrigger = page.locator('.character-create-action > button').first();
          if (await createTrigger.count()) {
            await createTrigger.focus();
            await page.keyboard.press('ArrowDown');
            await page.getByRole('menu').waitFor();
            const menu = await page.getByRole('menu').boundingBox();
            assert.ok(menu && menu.x >= 0 && menu.x + menu.width <= viewport.width + 1, 'Character menu escapes viewport.');
            await page.keyboard.press('Escape');
            await page.getByRole('menu').waitFor({ state: 'hidden' });
            await page.waitForFunction(el => document.activeElement === el, await createTrigger.elementHandle(), { timeout: 3000 });
            assert.equal(await createTrigger.evaluate(el => document.activeElement === el), true, 'Menu must return focus.');
          }
          await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
        }

        if (route.id === 'home') {
          const checks = await page.evaluate(async () => {
            const hero = document.querySelector('.community-hero');
            const images = Array.from(hero?.querySelectorAll('img') || []);
            await Promise.all(images.map(img => img.decode().catch(() => null)));
            const copy = hero?.querySelector('.discovery-page-hero__copy')?.getBoundingClientRect();
            const cards = Array.from(hero?.querySelectorAll('.community-hero-art__card') || []);
            const copyContent = Array.from(hero?.querySelectorAll('.discovery-page-hero__copy > *') || []);
            const overlaps = cards.some(card => copyContent.some(content => {
              const a = card.getBoundingClientRect();
              const b = content.getBoundingClientRect();
              return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
            }));
            const sections = ['.community-start-paths', '.community-providers', '.community-feed', '.editorial-tutorial'];
            const providerAction = document.querySelector('.community-providers .community-section-action');
            const featured = document.querySelector('.community-featured');
            const featuredAction = featured?.querySelector('.community-section-action');
            return {
              imagesLoaded: images.length >= 3 && images.every(img => img.naturalWidth > 0),
              overlaps,
              hasCopy: Boolean(copy?.height),
              nextSectionVisible: (hero?.getBoundingClientRect().top ?? -1) >= 0
                && (hero?.getBoundingClientRect().bottom || Infinity) < window.innerHeight - 20,
              descriptions: sections.every(selector => Boolean(document.querySelector(`${selector} > header p`)?.textContent?.trim())),
              providerMarks: document.querySelectorAll('.community-provider [data-provider-mark]').length,
              providerAction: providerAction?.getAttribute('href'),
              featuredAction: featured ? featuredAction?.getAttribute('href') : '#community-feed'
            };
          });
          assert.equal(checks.imagesLoaded, true, `Home hero images missing at ${viewport.width}/${theme}`);
          assert.equal(checks.overlaps, false, `Home artwork overlaps copy at ${viewport.width}/${theme}`);
          assert.equal(checks.hasCopy && checks.descriptions && checks.nextSectionVisible, true,
            `Home hierarchy/description/first-viewport check failed at ${viewport.width}/${theme}: ${JSON.stringify(checks)}`);
          assert.equal(checks.providerMarks > 0 && checks.providerAction === '/create/playground'
            && checks.featuredAction === '#community-feed', true,
            `Home provider/section actions failed at ${viewport.width}/${theme}: ${JSON.stringify(checks)}`);
          const summary = page.locator('.community-provider summary').first();
          if (await summary.count()) {
            await summary.focus();
            await page.keyboard.press('Enter');
            assert.equal(await page.locator('.community-provider').first().getAttribute('open') !== null, true);
            await page.keyboard.press('Enter');
            await page.evaluate(() => window.scrollTo(0, 0));
          }
        }

        const layout = await page.evaluate(() => {
          const root = document.documentElement;
          const controls = Array.from(
            document.querySelectorAll('main a, main button, main input, main select')
          ).filter(element => {
            if (!(element instanceof HTMLElement) || !element.offsetParent) return false;
            return !element.closest('.horizontal-media-carousel__viewport')
              && !element.closest('.discovery-segmented-control');
          });
          const escapedControls = controls
            .map(element => {
              const rect = element.getBoundingClientRect();
              return {
                text: element.getAttribute('aria-label') || element.textContent?.trim().slice(0, 60) || element.tagName,
                left: Math.round(rect.left),
                right: Math.round(rect.right)
              };
            })
            .filter(rect => rect.left < -1 || rect.right > window.innerWidth + 1);
          return {
            pageWidth: root.scrollWidth,
            viewportWidth: root.clientWidth,
            escapedControls
          };
        });

        assert.equal(
          layout.pageWidth <= layout.viewportWidth + 1,
          true,
          `${route.id}/${viewport.id}/${theme} has page overflow ${layout.pageWidth}px > ${layout.viewportWidth}px.`
        );
        assert.deepEqual(
          layout.escapedControls,
          [],
          `${route.id}/${viewport.id}/${theme} has interactive controls outside the viewport.`
        );

        await page.keyboard.press('Tab');
        assert.notEqual(
          await page.evaluate(() => document.activeElement?.tagName),
          'BODY',
          `${route.id}/${viewport.id}/${theme} does not expose a keyboard focus target.`
        );

        if (output) {
          await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
          await page.screenshot({
            path: path.join(output, `${route.id}-${viewport.width}-${theme}-fold.png`)
          });
          await page.screenshot({
            path: path.join(output, `${route.id}-${viewport.width}-${theme}.png`),
            fullPage: true
          });
        }
      }
    }

    assert.deepEqual(pageErrors, [], `${route.id} emitted browser page errors.`);
    assert.deepEqual(blockedRequests, [], 'Isolated layout attempted an unmapped or mutating request.');
    if (route.id === 'home') {
      const normalAnimation = await page.evaluate(() => {
        const sidebar = document.querySelector('.app-sidebar');
        return sidebar ? getComputedStyle(sidebar).animationName : null;
      });
      assert.equal(normalAnimation, 'app-sidebar-color-wash', 'Sidebar color wash animation is missing.');
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const reducedAnimation = await page.evaluate(() => {
        const sidebar = document.querySelector('.app-sidebar');
        return sidebar ? getComputedStyle(sidebar).animationName : null;
      });
      assert.equal(reducedAnimation, 'none', 'Sidebar color wash must stop for reduced motion.');
      await page.emulateMedia({ reducedMotion: 'no-preference' });
    }
    await context.close();
  }

  console.log(JSON.stringify({
    status: 'PASS',
    dataSource: fixtureMode ? 'isolated synthetic fixture; no backend' : 'live local API',
    locale: locale || 'application default',
    routes: routes.map(route => route.id),
    viewports: viewports.map(viewport => viewport.width),
    themes,
    measurements,
    screenshots: output
  }, null, 2));
} finally {
  await browser.close();
}

function readArgument(name) {
  const prefix = `--${name}=`;
  return process.argv.find(value => value.startsWith(prefix))?.slice(prefix.length) || null;
}

async function verifyCharacterHighlight(page, viewport, summaries) {
  assert.ok(Array.isArray(summaries), 'Character directory response missing.');
  const expected = summaries.filter(character => character.displayImageUrl &&
    ['owner_generation', 'owner_selected_generation', 'featured_work', 'owner_selected_work'].includes(character.displayImageSource)).slice(0, 4);
  const layout = await page.evaluate(() => {
    const hero = document.querySelector('.character-gallery-hero');
    const featured = document.querySelector('.character-discovery-card--spotlight');
    const media = featured?.querySelector('.character-discovery-card__media');
    const footer = featured?.querySelector('footer');
    const headingBox = featured?.querySelector('.character-spotlight__heading')?.getBoundingClientRect();
    const section = document.querySelector('.character-spotlight');
    const mediaBox = media?.getBoundingClientRect();
    const footerBox = footer?.getBoundingClientRect();
    return {
      circles: Array.from(hero.querySelectorAll('li')).map(item => {
        const ring = item.querySelector('.character-gallery-hero__avatar');
        const box = ring.getBoundingClientRect();
        return { href: item.querySelector('a').getAttribute('href'), src: item.querySelector('img')?.getAttribute('src'),
          width: box.width, height: box.height, top: box.top, border: parseFloat(getComputedStyle(ring).borderTopWidth) };
      }),
      gradient: getComputedStyle(hero, '::before').backgroundImage,
      ribbonInset: hero.querySelector('ul') ? parseFloat(getComputedStyle(hero.querySelector('ul')).paddingRight) : null,
      discoverGradient: getComputedStyle(document.querySelector('.character-gallery-page .discovery-steps')).backgroundImage,
      featured: featured ? {
        fit: getComputedStyle(media.querySelector('img')).objectFit,
        portrait: mediaBox.height > mediaBox.width,
        fullWidth: Math.abs(mediaBox.width - featured.clientWidth) < 1,
        topGap: mediaBox.top - section.getBoundingClientRect().top - parseFloat(getComputedStyle(section).borderTopWidth) - parseFloat(getComputedStyle(section).paddingTop),
        corners: ['borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomLeftRadius', 'borderBottomRightRadius'].map(property => parseFloat(getComputedStyle(media)[property])),
        clipped: getComputedStyle(media).overflow === 'hidden',
        headingClear: Boolean(headingBox && (headingBox.right <= mediaBox.left || headingBox.bottom <= mediaBox.top)),
        headingFirst: Boolean(headingBox && headingBox.bottom <= mediaBox.top),
        fade: getComputedStyle(media, '::after').backgroundImage,
        outerBorder: parseFloat(getComputedStyle(document.querySelector('.character-spotlight')).borderTopWidth),
        nestedBorder: parseFloat(getComputedStyle(featured).borderTopWidth),
        overlapsFooter: mediaBox.left < footerBox.right && mediaBox.right > footerBox.left && mediaBox.top < footerBox.bottom && mediaBox.bottom > footerBox.top,
        followDisabled: featured.querySelector('.character-follow-preview')?.disabled,
        videoUpcoming: Boolean(featured.querySelector('[data-preview="video"] small')?.textContent),
        buttonRadius: parseFloat(getComputedStyle(footer.querySelector('a')).borderTopLeftRadius)
      } : null,
      directoryMocks: document.querySelectorAll('.character-discovery-grid .character-follow-preview, .character-discovery-grid [data-preview="video"]').length,
      momentFits: Array.from(document.querySelectorAll('.character-moment__media img')).map(img => getComputedStyle(img).objectFit),
      momentCount: document.querySelectorAll('.character-moment').length,
      engagementCount: document.querySelectorAll('.character-moment .engagement-bar--compact').length,
      viewCount: document.querySelectorAll('.character-moment .engagement-bar__views').length,
      nestedControls: document.querySelectorAll('.character-moment a button, .character-moment a a').length,
      wholeRowContained: Array.from(document.querySelectorAll('.character-spotlight__layout > *')).every(item => {
        const outer = document.querySelector('.character-spotlight').getBoundingClientRect();
        const box = item.getBoundingClientRect();
        return box.left >= outer.left && box.right <= outer.right && box.bottom <= outer.bottom;
      }),
      momentCaptionsClear: Array.from(document.querySelectorAll('.character-moment')).every(moment => {
        return moment.querySelector('.character-moment__media').getBoundingClientRect().bottom <= moment.querySelector('.character-moment__caption').getBoundingClientRect().top + 1;
      })
    };
  });
  assert.equal(layout.circles.length, expected.length, 'Header must show only curated Gallery identities.');
  layout.circles.forEach((circle, index) => {
    assert.equal(circle.href, `/characters/${expected[index].id}`);
    assert.equal(new URL(circle.src, origin).pathname, new URL(expected[index].displayImageUrl, origin).pathname, 'Circle uses a reference instead of Gallery media.');
    const [baseSize, step] = viewport.width === 1440 ? [112, 8] : viewport.width === 820 ? [96, 6] : [84, 4];
    assert.ok(Math.abs(circle.width - (baseSize - index * step) * 0.85) < 1, 'Each Header circle must be 15% smaller in layout.');
    assert.ok(Math.abs(circle.height - circle.width) < 1 && circle.border >= 3, 'Gallery circles must stay round and clearly outlined.');
    assert.ok(Math.abs(circle.top - layout.circles[0].top) < 1, 'Header circle top edges must align.');
    if (index > 0) assert.ok(circle.width < layout.circles[index - 1].width, 'Header circles must gradually decrease in size.');
  });
  if (layout.circles.length) assert.ok(layout.ribbonInset >= 12, 'Header circles need an inset from the right edge.');
  assert.ok(layout.gradient.includes('linear-gradient') && layout.discoverGradient.includes('linear-gradient'), 'Header/Discover theme gradient missing.');
  if (layout.featured) {
    assert.equal(layout.featured.fit, 'cover', 'Featured discovery media must fill its frame without stretching.');
    assert.ok(layout.featured.fade.includes('linear-gradient'), 'Featured media needs the theme edge blend.');
    assert.ok(layout.featured.clipped && layout.featured.corners.every(radius => radius >= 8), 'Featured portrait and fade must have rounded, clipped corners.');
    assert.ok(layout.featured.headingClear, 'Featured heading must not overlap the portrait.');
    if (viewport.width === 390) assert.ok(layout.featured.headingFirst, 'Mobile must retain heading before portrait.');
    else assert.ok(Math.abs(layout.featured.topGap) < 1, 'Featured portrait must start at the section top content inset.');
    assert.ok(layout.featured.outerBorder >= 1 && layout.featured.nestedBorder === 0, 'One border must enclose the Featured row, without a nested card border.');
    assert.equal(layout.featured.portrait, true, 'Featured media area must be portrait-oriented.');
    if (viewport.width === 390) assert.equal(layout.featured.fullWidth, true, 'Stacked Featured media must fill the card width.');
    assert.equal(layout.featured.overlapsFooter, false, 'Featured actions cover the portrait.');
    assert.equal(layout.featured.followDisabled && layout.featured.videoUpcoming, true, 'Mock Follow/Video must be explicitly upcoming.');
    assert.ok(layout.featured.buttonRadius >= 12, 'Character commands must have rounded corners.');
  }
  assert.equal(layout.directoryMocks, 0, 'Do not add Featured mockups to ordinary cards.');
  assert.equal(layout.engagementCount, layout.momentCount, 'Each Moment needs its own post engagement controls.');
  assert.equal(layout.viewCount, layout.momentCount, 'Each Moment needs its own view count.');
  assert.equal(layout.nestedControls, 0, 'Like buttons cannot be nested in post links.');
  assert.equal(layout.wholeRowContained, true, 'The Featured border must enclose the entire row.');
  assert.ok(layout.momentFits.every(fit => fit === 'cover') && layout.momentCaptionsClear, 'Moment frames must be filled and captions must stay below media.');
}

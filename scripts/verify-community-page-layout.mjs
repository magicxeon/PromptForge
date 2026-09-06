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
    const page = await context.newPage();
    const pageErrors = [];
    let measuring = true;
    let requestCount = 0;
    let mediaRequestCount = 0;
    let declaredResponseBytes = 0;

    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('request', request => {
      if (!measuring) return;
      requestCount += 1;
      if (request.resourceType() === 'image' || request.resourceType() === 'media') {
        mediaRequestCount += 1;
      }
    });
    page.on('response', response => {
      if (!measuring) return;
      const value = Number(response.headers()['content-length']);
      if (Number.isFinite(value)) declaredResponseBytes += value;
    });

    await page.goto(new URL(route.path, parsedOrigin).toString(), { waitUntil: 'domcontentloaded' });
    await page.locator(route.selector).waitFor({ timeout: 30_000 });
    await page.waitForTimeout(1200);
    measuring = false;
    measurements.push({ route: route.id, requestCount, mediaRequestCount, declaredResponseBytes });

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      for (const theme of themes) {
        await page.evaluate(value => {
          document.documentElement.dataset.theme = value;
          document.documentElement.style.colorScheme = value === 'fashion' ? 'light' : 'dark';
        }, theme);
        await page.waitForTimeout(80);

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
          await page.screenshot({
            path: path.join(output, `${route.id}-${viewport.width}-${theme}.png`),
            fullPage: true
          });
        }
      }
    }

    assert.deepEqual(pageErrors, [], `${route.id} emitted browser page errors.`);
    await context.close();
  }

  console.log(JSON.stringify({
    status: 'PASS',
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

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';

const origin = process.env.CINEMATIC_WEB_ORIGIN || 'http://localhost:5173';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname));
const output = await fs.mkdtemp(path.join(os.tmpdir(), 'mpf-rewamp-projects-'));
const browser = await chromium.launch({ headless: true });
const errors = [];

try {
  for (const locale of ['th', 'en']) {
    const context = await browser.newContext();
    await context.addInitScript(language => {
      localStorage.setItem('model_prompt_forge_language', language);
    }, locale);
    const page = await context.newPage();
    page.setDefaultTimeout(15_000);
    page.on('pageerror', error => errors.push(error.message));

    for (const width of [390, 820, 1440]) {
      await page.setViewportSize({ width, height: 950 });
      await page.goto(`${origin}/create/cinematic`, { waitUntil: 'networkidle' });
      const library = page.getByTestId('cinematic-project-list');
      await library.waitFor();
      await page.evaluate(() => document.fonts.ready);
      assert.ok(await library.evaluate(element => element.scrollWidth <= element.clientWidth + 1), `${locale}/${width} library overflow`);
      assert.ok(await page.locator('body').evaluate(element => element.scrollWidth <= element.clientWidth + 1), `${locale}/${width} page overflow`);
      await page.getByRole('link', { name: locale === 'th' ? /สร้างโปรเจกต์/ : /New project/ }).waitFor();

      const rows = page.locator('.cinematic-project-library__row');
      if (await rows.count()) {
        const first = rows.first();
        assert.ok((await first.getAttribute('href'))?.startsWith('/create/cinematic/'));
        const box = await first.boundingBox();
        assert.ok(box && box.width <= width, `${locale}/${width} row exceeds viewport`);
      }

      await page.screenshot({ path: path.join(output, `${locale}-${width}.png`), fullPage: true });
    }
    await context.close();
  }
  assert.deepEqual(errors, []);
  console.log(`PASS Cinematic Project Library TH/EN at 390/820/1440. Screenshots: ${output}`);
} catch (error) {
  console.error(errors);
  for (const context of browser.contexts()) for (const page of context.pages()) {
    await page.screenshot({ path: path.join(output, 'failure.png'), fullPage: true });
  }
  console.error(`Screenshots: ${output}`);
  throw error;
} finally {
  await browser.close();
}

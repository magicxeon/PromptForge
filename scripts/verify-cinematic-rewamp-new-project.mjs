import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';

const origin = process.env.CINEMATIC_WEB_ORIGIN || 'http://localhost:5173';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname));
const output = await fs.mkdtemp(path.join(os.tmpdir(), 'mpf-rewamp-new-project-'));
const browser = await chromium.launch({ headless: true });
const errors = [];

try {
  for (const locale of ['th', 'en']) {
    const context = await browser.newContext();
    await context.addInitScript(language => {
      localStorage.clear();
      localStorage.setItem('model_prompt_forge_language', language);
    }, locale);
    const page = await context.newPage();
    page.setDefaultTimeout(15_000);
    page.on('pageerror', error => errors.push(error.message));

    for (const width of [390, 820, 1440]) {
      await page.setViewportSize({ width, height: 950 });
      await page.goto(`${origin}/create/cinematic/new`, { waitUntil: 'networkidle' });
      const composer = page.getByTestId('cinematic-new-project');
      await composer.waitFor();
      await page.evaluate(() => document.fonts.ready);

      assert.ok(await composer.evaluate(element => element.scrollWidth <= element.clientWidth + 1), `${locale}/${width} composer overflow`);
      assert.ok(await page.locator('body').evaluate(element => element.scrollWidth <= element.clientWidth + 1), `${locale}/${width} page overflow`);
      await page.getByRole('textbox', { name: locale === 'th' ? 'ชื่อโปรเจกต์' : 'Project title' }).waitFor();
      await page.getByRole('textbox', { name: locale === 'th' ? 'ไอเดียเรื่อง' : 'Story idea' }).waitFor();

      const prepare = page.getByRole('button', { name: locale === 'th' ? 'เตรียมเนื้อเรื่อง' : 'Prepare story' });
      assert.equal(await prepare.isDisabled(), true, `${locale}/${width} empty story must not call AI`);
      assert.equal(await page.getByRole('button', { name: locale === 'th' ? 'สร้างฉบับร่าง' : 'Create draft' }).isEnabled(), true);
      assert.equal(await page.locator('.cinematic-new-project__segments button').filter({ hasText: locale === 'th' ? 'มินิซีรีส์' : 'Mini series' }).getAttribute('aria-pressed'), 'true');
      assert.equal(await page.locator('.cinematic-new-project__genre-choice input[type="checkbox"]:checked').count(), 1);

      const essentials = page.locator('.cinematic-new-project__essentials');
      assert.equal(await essentials.getAttribute('open'), '');
      assert.notEqual(await essentials.evaluate(element => getComputedStyle(element).borderRadius), '0px');
      await essentials.locator(':scope > summary').click();
      assert.equal(await essentials.getAttribute('open'), null, `${locale}/${width} essentials must collapse`);
      await essentials.locator(':scope > summary').click();
      assert.equal(await essentials.getAttribute('open'), '', `${locale}/${width} essentials must expand`);

      const settings = page.locator('.cinematic-new-project__settings');
      await settings.locator(':scope > summary').click();
      assert.equal(await settings.getAttribute('open'), '');
      await page.getByText(locale === 'th' ? 'ยุคสมัยของเรื่อง' : 'Story period').waitFor();
      const chapterDuration = page.getByRole('combobox', { name: locale === 'th' ? 'ความยาวเป้าหมายต่อ Chapter' : 'Target duration per Chapter' });
      await chapterDuration.click();
      assert.equal(await page.getByRole('option', { name: locale === 'th' ? '2 นาที' : '2 min' }).count(), 1);
      await page.keyboard.press('Escape');

      await page.screenshot({ path: path.join(output, `${locale}-${width}.png`), fullPage: true });
    }
    await context.close();
  }
  assert.deepEqual(errors, []);
  console.log(`PASS Cinematic New Project TH/EN at 390/820/1440. Screenshots: ${output}`);
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

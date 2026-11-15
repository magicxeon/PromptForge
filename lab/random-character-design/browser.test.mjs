import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import { createToolServer } from './serve.mjs';

const output = await mkdtemp(path.join(os.tmpdir(), 'character-dna-browser-'));
const server = createToolServer(); server.listen(0, '127.0.0.1'); await once(server, 'listening');
const origin = `http://127.0.0.1:${server.address().port}`, browser = await chromium.launch({ headless: true });
const errors = [], network = [], evidence = [];
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
await context.route('**/*', route => { const url = route.request().url(); if (!url.startsWith(origin) && !url.startsWith('blob:') && !url.startsWith('data:')) { network.push(url); return route.abort(); } return route.continue(); });
const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message)); page.on('dialog', dialog => dialog.accept(dialog.type() === 'prompt' ? 'ทดสอบ Preset' : undefined));
async function stored(name) { return page.evaluate(name => new Promise((resolve, reject) => { const open = indexedDB.open('character-dna-studio-v1', 1); open.onsuccess = () => { const db = open.result, request = db.transaction(name).objectStore(name).getAll(); request.onsuccess = () => { resolve(request.result.map(({ blob, ...record }) => record)); db.close(); }; request.onerror = () => reject(request.error); }; }), name); }
async function act(action) { await page.locator(`[data-action="${action}"]`).filter({ visible: true }).first().click(); }
async function waitCount(selector, count) { await page.waitForFunction(({ selector, count }) => document.querySelector(selector)?.textContent === String(count), { selector, count }); }
async function shot(name) { await page.screenshot({ path: path.join(output, `${name}.png`), fullPage: true }); }
try {
  await page.goto(origin); await page.waitForFunction(() => document.querySelector('#prompt-output')?.value.includes('เอกลักษณ์ใบหน้า'));
  assert.equal(await page.locator('#storage-error').isVisible(), false);
  assert.equal(await page.locator('#trending-random').isChecked(), true);
  assert.equal(await page.locator('#dna-fields .attribute-group').count(), 13);
  await page.locator('#character-name').fill('รินรดา <script>not-executed</script>');
  assert.ok((await page.locator('.identity-name').textContent()).includes('<script>'));
  await page.locator('#character-name').fill('รินรดา');
  await page.locator('#profile-presentation').selectOption('female');
  assert.ok((await page.locator('#trending-note').textContent()).includes('นางเอก'));
  assert.equal(await page.locator('#random-name-auto').isChecked(), true);
  assert.equal(await page.locator('#profile-characterType option').count(), 20);
  const beforeNameDNA = await page.locator('#field-faceShape').inputValue();
  await act('random-name'); assert.match(await page.locator('#character-name').inputValue(), /^[A-Z][a-z]+ [A-Z][a-z]+$/);
  assert.equal(await page.locator('#field-faceShape').inputValue(), beforeNameDNA);
  assert.equal((await stored('generations')).length, 0);
  await page.locator('#character-name').fill('รินรดา'); await act('lock-name'); await act('random-name');
  assert.equal(await page.locator('#character-name').inputValue(), 'รินรดา');
  await page.locator('#profile-characterType').selectOption('doctor');
  const beforeRoleDNA = await page.locator('#field-faceShape').inputValue();
  assert.ok((await page.locator('#casting-note').textContent()).includes('รับฟัง'));
  assert.equal(await page.locator('#field-faceShape').inputValue(), beforeRoleDNA);
  await page.locator('#advanced').check();
  await page.locator('[data-group="personality"] summary').click();
  await page.locator('#field-temperament').selectOption('calm');
  await page.locator('[data-action="lock"][data-id="temperament"]').click();
  await page.locator('[data-action="random"][data-mode="guided"]').click();
  assert.equal(await page.locator('#field-temperament').inputValue(), 'calm');
  assert.ok(['stethoscope', 'folder'].includes(await page.locator('#field-signatureProp').inputValue()));
  assert.ok((await page.locator('#prompt-output').inputValue()).includes('ประเภทตัวละครในเรื่อง: แพทย์'));
  assert.equal(await page.locator('#character-name').inputValue(), 'รินรดา');
  assert.equal((await stored('generations')).length, 0);
  await page.locator('#profile-characterType').selectOption('auto');
  await page.locator('#advanced').uncheck();
  for (let index = 0; index < 20; index++) await page.locator('#field-eyeSize').evaluate((element, value) => { element.value = value; element.dispatchEvent(new Event('input', { bubbles: true })); }, index % 5 + 1);
  assert.equal((await stored('generations')).length, 0);
  const beforeToggle = await page.locator('#prompt-output').inputValue();
  await page.locator('#trending-random').uncheck();
  assert.equal(await page.locator('#prompt-output').inputValue(), beforeToggle);
  assert.equal((await stored('generations')).length, 0);
  await page.locator('#trending-random').check();
  await page.locator('[data-action="lock"][data-id="eyeShape"]').click();
  const eye = await page.locator('#field-eyeShape').inputValue();
  await page.locator('[data-action="random"][data-mode="guided"]').click();
  assert.equal(await page.locator('#field-eyeShape').inputValue(), eye);
  assert.ok(['light', 'medium'].includes(await page.locator('#field-skinTone').inputValue()));
  const randomPrompt = await page.locator('#prompt-output').inputValue(); await act('replay');
  assert.equal(await page.locator('#prompt-output').inputValue(), randomPrompt);
  assert.ok(randomPrompt.includes('ทิศทางแคสติ้ง: ตัวเอกหญิง'));
  await page.locator('#trending-random').uncheck();
  assert.equal(await page.locator('#prompt-output').inputValue(), randomPrompt);
  await page.locator('#trending-random').check();
  await act('generate'); await waitCount('#history-count', 1); await act('generate'); await waitCount('#history-count', 2);
  const events = await stored('generations'); assert.notEqual(events[0].id, events[1].id); assert.equal(events[0].promptText, events[1].promptText);
  assert.equal(events[0].profile.trendingRandom, true);
  assert.equal(events[0].profile.nameLocked, true);
  assert.equal(events[0].profile.appearance.temperament, 'calm');
  assert.ok(['female-romantic', 'female-elegant'].includes(events[0].profile.randomization.leadingRecipeId));
  await act('save'); await waitCount('#library-count', 1);
  const photo = await readFile(new URL('../../client/assets/scene-builder/shot-recipes/cafe-seated-lifestyle.jpg', import.meta.url));
  await page.locator('#image-upload').setInputFiles({ name: 'reference.jpg', mimeType: 'image/jpeg', buffer: photo });
  await page.locator('#reference-images img').waitFor(); await act('save');
  await page.waitForFunction(() => document.querySelector('#toast').textContent.includes('เวอร์ชัน'));
  assert.equal((await stored('characters'))[0].versions.length, 1);
  assert.equal((await stored('characters'))[0].imageIds.length, 1);
  assert.equal((await stored('characters'))[0].profile.trendingRandom, true);
  await act('save-preset'); assert.equal((await stored('presets')).length, 1);
  for (const mode of ['hero', 'looksheet', 'scene']) {
    await page.locator(`[data-action="mode"][data-mode="${mode}"]`).click();
    const text = await page.locator('#prompt-output').inputValue();
    assert.ok(mode === 'looksheet' ? text.includes('LS-STD-9x16-V1') && text.includes('รวม18ภาพย่อย') : !text.includes('Angle Views'));
  }
  await act('wireframe'); assert.equal(await page.locator('.blueprint-cell').count(), 18); await act('close-dialog');
  const [txt] = await Promise.all([page.waitForEvent('download'), act('download-txt')]); assert.ok((await readFile(await txt.path(), 'utf8')).includes('Continuity Rules'));
  const [dnaFile] = await Promise.all([page.waitForEvent('download'), act('export-profile')]);
  const dnaPath = path.join(output, 'character-dna.json'); await dnaFile.saveAs(dnaPath);
  const exportedDNA = JSON.parse(await readFile(dnaPath, 'utf8')); assert.equal(exportedDNA.profile.name, 'รินรดา');
  assert.equal(exportedDNA.profile.trendingRandom, true);
  assert.equal(exportedDNA.profile.characterType, 'auto');
  assert.equal(exportedDNA.profile.appearance.temperament, 'calm');
  await page.waitForTimeout(700);
  await act('settings');
  const [zip] = await Promise.all([page.waitForEvent('download'), act('backup-zip')]); const zipPath = path.join(output, 'backup.zip'); await zip.saveAs(zipPath);
  await act('close-dialog');
  await page.locator('[data-action="navigate"][data-view="history"]').first().click();
  assert.equal(await page.locator('.record-card').count(), 2);
  await page.locator('#record-search').fill('not-found'); assert.equal(await page.locator('.record-card').count(), 0);
  await page.locator('#record-search').fill('รินรดา'); assert.equal(await page.locator('.record-card').count(), 2);
  await page.locator('[data-action="inspect-record"]').first().click(); assert.equal(await page.locator('#dialog-body script').count(), 0); await act('close-dialog');
  await page.locator('.record-card [data-action="compare-record"]').first().click(); assert.ok(await page.locator('.comparison-table tbody tr').count() >= 15);
  await page.locator('[data-action="navigate"][data-view="builder"]').first().click();
  for (const theme of ['light', 'dark', 'burgundy']) {
    await act('settings'); await page.locator('#setting-theme').selectOption(theme); await act('save-settings');
    for (const width of [390, 820, 1440]) {
      await page.setViewportSize({ width, height: width === 820 ? 1180 : 1000 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${theme}/${width} overflow`);
      assert.ok(await page.locator('#generate').evaluate(element => element.getBoundingClientRect().height >= 44));
      if (width < 1200) {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.locator('[data-action="jump"][data-target="output-panel"]').click();
        assert.ok(await page.locator('#output-panel').evaluate(element => element.getBoundingClientRect().top >= 44));
        await page.locator('[data-action="jump"][data-target="profile-fields"]').click();
      }
      await page.evaluate(() => scrollTo(0, 0));
      await shot(`${theme}-${width}-builder`);
      await act('wireframe'); assert.ok(await page.getByRole('dialog').evaluate(element => element.getBoundingClientRect().right <= innerWidth)); await shot(`${theme}-${width}-wireframe`); await act('close-dialog');
      evidence.push({ theme, width, overflow: false });
    }
  }
  await page.evaluate(() => {
    window.__originalPut = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args) {
      if (this.name === 'generations') throw new DOMException('Storage full', 'QuotaExceededError');
      return window.__originalPut.apply(this, args);
    };
  });
  await act('generate'); await page.waitForFunction(() => document.querySelector('#storage-error').textContent.includes('พื้นที่ Browser เต็ม'));
  assert.equal((await stored('generations')).length, 2); assert.equal(await page.locator('#character-name').inputValue(), 'รินรดา');
  await page.evaluate(() => { IDBObjectStore.prototype.put = window.__originalPut; delete window.__originalPut; });
  await page.locator('#trending-random').uncheck();
  await page.waitForTimeout(700);
  await page.reload(); await page.locator('#reference-images img').waitFor(); assert.equal(await page.locator('#character-name').inputValue(), 'รินรดา');
  assert.equal(await page.locator('#trending-random').isChecked(), false);
  await page.locator('#trending-random').check();
  const restored = await browser.newContext({ acceptDownloads: true });
  await restored.route('**/*', route => route.request().url().startsWith(origin) ? route.continue() : route.abort());
  const target = await restored.newPage(); target.on('pageerror', error => errors.push(error.message)); await target.goto(origin); await target.locator('#prompt-output').waitFor();
  await target.locator('#backup-upload').setInputFiles(zipPath); await target.locator('[data-action="confirm-import"]').click();
  await target.waitForFunction(() => document.querySelector('#history-count')?.textContent === '2');
  assert.equal(await target.locator('#library-count').textContent(), '1');
  await target.locator('#backup-upload').setInputFiles(zipPath); await target.locator('[data-action="confirm-import"]').click();
  await target.waitForFunction(() => !document.querySelector('#utility-dialog').open);
  assert.equal(await target.locator('#history-count').textContent(), '2'); assert.equal(await target.locator('#library-count').textContent(), '1');
  await target.locator('[data-action="navigate"][data-view="library"]').first().click(); await target.locator('.record-card img').waitFor();
  target.on('dialog', dialog => dialog.accept()); await target.locator('[data-action="delete-record"]').first().click();
  await target.waitForFunction(() => document.querySelector('#library-count').textContent === '0');
  await target.locator('[data-action="navigate"][data-view="history"]').first().click();
  await target.locator('[data-action="clear-history"]').click();
  await target.waitForFunction(() => document.querySelector('#history-count').textContent === '0');
  await target.locator('#backup-upload').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"format":"character-dna-studio","version":1,"__proto__":{}}') });
  await target.waitForFunction(() => document.querySelector('#toast').textContent.includes('ไม่ปลอดภัย'));
  await target.locator('#backup-upload').setInputFiles(dnaPath); await target.locator('[data-action="confirm-import"]').click();
  await target.waitForFunction(() => document.querySelector('#library-count').textContent === '1');
  await target.locator('#backup-upload').setInputFiles(dnaPath); await target.locator('[data-action="confirm-import"]').click();
  await target.waitForFunction(() => !document.querySelector('#utility-dialog').open);
  assert.equal(await target.locator('#library-count').textContent(), '1'); assert.equal(await target.locator('#history-count').textContent(), '0');
  await restored.close();
  assert.deepEqual(errors, []); assert.deepEqual(network, []);
  assert.equal((await fetch(`${origin}/%2e%2e%2f%2e%2e%2fpackage.json`)).status, 404);
  assert.equal((await fetch(origin, { method: 'POST' })).status, 405);
  await writeFile(path.join(output, 'evidence.json'), JSON.stringify({ evidence, historyEvents: 2, library: 1, imageRestore: true, idempotentImport: true, errors, network }, null, 2));
  console.log(JSON.stringify({ output, responsiveCases: evidence.length, result: 'pass' }));
} catch (error) {
  await page.screenshot({ path: path.join(output, 'failure.png'), fullPage: true }); console.error(`Evidence: ${output}`); throw error;
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }

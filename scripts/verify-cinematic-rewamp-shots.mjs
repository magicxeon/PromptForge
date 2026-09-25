import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';

const origin = process.env.CINEMATIC_WEB_ORIGIN || 'http://localhost:5173';
const apiOrigin = process.env.CINEMATIC_API_ORIGIN || 'http://localhost:6500';
const actorId = process.env.CINEMATIC_ACTOR_ID || 'usr_admin';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname));
assert.ok(['localhost', '127.0.0.1'].includes(new URL(apiOrigin).hostname));

const target = await resolveTarget();
const output = await fs.mkdtemp(path.join(os.tmpdir(), 'mpf-rewamp-shots-'));
const browser = await chromium.launch({ headless: true });
const errors = [];

try {
  for (const locale of ['th', 'en']) {
    const context = await browser.newContext();
    await context.addInitScript(({ language, actor }) => {
      localStorage.setItem('model_prompt_forge_language', language);
      localStorage.setItem('mpf_active_mock_user_id', actor);
    }, { language: locale, actor: actorId });
    const page = await context.newPage();
    page.setDefaultTimeout(20_000);
    page.on('pageerror', error => errors.push(error.message));

    for (const width of [390, 820, 1440]) {
      await page.setViewportSize({ width, height: 950 });
      await page.goto(`${origin}/create/cinematic/${encodeURIComponent(target.projectId)}/shot/${encodeURIComponent(target.shotId)}`, { waitUntil: 'domcontentloaded' });
      const writer = page.getByTestId('cinematic-shot-writer');
      await writer.waitFor();
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await writer.locator('textarea').count(), 1, `${locale}/${width} canonical editor count`);
      assert.ok((await writer.locator('textarea').inputValue()).trim(), `${locale}/${width} Shot document is empty`);
      assert.ok(await writer.evaluate(element => element.scrollWidth <= element.clientWidth + 1), `${locale}/${width} Shot Writer overflow`);
      assert.ok(await page.locator('body').evaluate(element => element.scrollWidth <= element.clientWidth + 1), `${locale}/${width} page overflow`);
      await page.screenshot({ path: path.join(output, `${locale}-${width}.png`), fullPage: true });
    }
    await context.close();
  }
  assert.deepEqual(errors, []);
  console.log(`PASS Cinematic Shot Writer TH/EN at 390/820/1440. Screenshots: ${output}`);
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

async function resolveTarget() {
  if (process.env.CINEMATIC_PROJECT_ID && process.env.CINEMATIC_SHOT_ID) {
    return { projectId: process.env.CINEMATIC_PROJECT_ID, shotId: process.env.CINEMATIC_SHOT_ID };
  }
  const headers = { 'x-mpf-user-id': actorId };
  const listResponse = await fetch(`${apiOrigin}/api/cinematic/projects`, { headers });
  assert.equal(listResponse.ok, true, `Project list failed with ${listResponse.status}`);
  const projects = await listResponse.json();
  for (const item of projects.items || []) {
    const projectId = item.id || item.projectId;
    const response = await fetch(`${apiOrigin}/api/cinematic/projects/${encodeURIComponent(projectId)}`, { headers });
    if (!response.ok) continue;
    const project = await response.json();
    const shot = (project.scenes || []).flatMap(scene => scene.shots || [])[0];
    if (shot) return { projectId: project.id, shotId: shot.id };
  }
  throw new Error(`No Shot is available for ${actorId}. Set CINEMATIC_PROJECT_ID and CINEMATIC_SHOT_ID.`);
}

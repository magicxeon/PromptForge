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

const response = await fetch(`${apiOrigin}/api/cinematic/projects`, { headers: { 'x-mpf-user-id': actorId } });
assert.equal(response.ok, true, `Project list failed with ${response.status}`);
const projects = await response.json();
const projectId = process.env.CINEMATIC_PROJECT_ID || projects.items?.[0]?.projectId;
assert.ok(projectId, `No Cinematic Project is available for ${actorId}. Set CINEMATIC_PROJECT_ID to an owned Project.`);
const selectedResponse = await fetch(`${apiOrigin}/api/cinematic/projects/${encodeURIComponent(projectId)}`, { headers: { 'x-mpf-user-id': actorId } });
assert.equal(selectedResponse.ok, true, `Selected Project failed with ${selectedResponse.status}`);
const selectedProject = await selectedResponse.json();
const authoringOwnerId = selectedProject.chapterOrigin?.projectId || selectedProject.id;
const ownerResponse = authoringOwnerId === selectedProject.id
  ? selectedResponse
  : await fetch(`${apiOrigin}/api/cinematic/projects/${encodeURIComponent(authoringOwnerId)}`, { headers: { 'x-mpf-user-id': actorId } });
assert.equal(ownerResponse.ok, true, `Project Brief owner failed with ${ownerResponse.status}`);
const authoringOwner = authoringOwnerId === selectedProject.id ? selectedProject : await ownerResponse.json();

const output = await fs.mkdtemp(path.join(os.tmpdir(), 'mpf-rewamp-story-writer-'));
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
      await page.goto(`${origin}/create/cinematic/${encodeURIComponent(projectId)}/setup`, { waitUntil: 'domcontentloaded' });
      const brief = page.getByTestId('cinematic-new-project');
      await brief.waitFor();
      await page.evaluate(() => document.fonts.ready);

      assert.equal(new URL(page.url()).pathname, `/create/cinematic/${encodeURIComponent(authoringOwnerId)}/setup`);
      assert.ok(await brief.evaluate(element => element.scrollWidth <= element.clientWidth + 1), `${locale}/${width} Project Brief overflow`);
      assert.ok(await page.locator('body').evaluate(element => element.scrollWidth <= element.clientWidth + 1), `${locale}/${width} Project Brief page overflow`);
      assert.equal(await brief.locator('.cinematic-new-project__brief-field textarea').count(), 1);
      assert.equal(await brief.locator('.cinematic-new-project__brief-field textarea').inputValue(), authoringOwner.setup.storyBrief);
      assert.notEqual(
        await brief.locator('.cinematic-new-project__settings').evaluate(element => getComputedStyle(element).borderRadius),
        '0px',
        `${locale}/${width} Project settings should be rounded`
      );
      await page.mouse.move(1, 1);
      await page.screenshot({ path: path.join(output, `${locale}-${width}-project-brief.png`), fullPage: true });

      await page.goto(`${origin}/create/cinematic/${encodeURIComponent(projectId)}/cast`, { waitUntil: 'domcontentloaded' });
      const writer = page.getByTestId('cinematic-full-story');
      await writer.waitFor();
      await page.evaluate(() => document.fonts.ready);
      assert.ok(await writer.evaluate(element => element.scrollWidth <= element.clientWidth + 1), `${locale}/${width} Full Story overflow`);
      assert.ok(await page.locator('body').evaluate(element => element.scrollWidth <= element.clientWidth + 1), `${locale}/${width} Full Story page overflow`);
      assert.equal(await writer.locator('.cinematic-full-story__document > textarea').count(), 1);
      assert.equal(await writer.locator('.cinematic-writer-panel-tabs').count(), 0, `${locale}/${width} obsolete Full Story tabs visible`);
      assert.equal(await writer.locator('.cinematic-full-story__side-rail > .cinematic-full-story__assistant').count(), 1, `${locale}/${width} AI Assist section missing`);
      assert.equal(await writer.locator('.cinematic-full-story__side-rail > .cinematic-shared-characters').count(), 1, `${locale}/${width} Character section missing`);
      assert.equal(await writer.locator('details.cinematic-full-story__history').count(), 1, `${locale}/${width} History section missing`);
      assert.equal(await page.locator('[data-testid="cinematic-story-writer"]').count(), 0, `${locale}/${width} superseded Chapter-first writer visible`);
      if (!authoringOwner.fullStoryVersions?.length) {
        assert.equal(await writer.locator('.cinematic-full-story__assistant > label').count(), 0, `${locale}/${width} revision instruction should stay hidden before the first Full Story`);
      }
      const characterList = writer.locator('.cinematic-shared-characters');
      assert.ok(await characterList.evaluate(element => element.scrollWidth <= element.clientWidth + 1), `${locale}/${width} Character list overflow`);
      assert.ok(await characterList.locator('.cinematic-shared-characters__entry').evaluateAll(entries => entries.every((entry, index) => {
        if (!entries[index + 1]) return true;
        return entry.getBoundingClientRect().bottom <= entries[index + 1].getBoundingClientRect().top;
      })), `${locale}/${width} Character rows overlap`);
      assert.notEqual(
        await writer.locator('.cinematic-full-story__document').evaluate(element => getComputedStyle(element).borderRadius),
        '0px',
        `${locale}/${width} Full Story document should be rounded`
      );
      await page.screenshot({ path: path.join(output, `${locale}-${width}-full-story.png`), fullPage: true });

      await page.goto(`${origin}/create/cinematic/${encodeURIComponent(authoringOwnerId)}/chapters`, { waitUntil: 'domcontentloaded' });
      const chapterWriter = page.getByTestId('cinematic-chapter-writer');
      await chapterWriter.waitFor();
      await page.evaluate(() => document.fonts.ready);
      assert.ok(await chapterWriter.evaluate(element => element.scrollWidth <= element.clientWidth + 1), `${locale}/${width} Chapter Writer overflow`);
      assert.ok(await page.locator('body').evaluate(element => element.scrollWidth <= element.clientWidth + 1), `${locale}/${width} Chapter Writer page overflow`);
      assert.equal(await chapterWriter.locator('.cinematic-story-writer__title-field input').count(), 1);
      assert.equal(await chapterWriter.locator('.cinematic-story-writer__prose-field textarea').count(), 1);
      await page.screenshot({ path: path.join(output, `${locale}-${width}-chapters.png`), fullPage: true });
    }
    await context.close();
  }
  assert.deepEqual(errors, []);
  console.log(`PASS Cinematic Project Brief, Full Story and Chapter Writer TH/EN at 390/820/1440. Screenshots: ${output}`);
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

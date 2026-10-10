import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { TutorialApplicationService } from '../server/domain/tutorials/TutorialApplicationService.js';
import { TutorialCatalogRepository } from '../server/repositories/tutorials/TutorialCatalogRepository.js';
import { writeJsonFileAtomic } from '../server/repositories/json/jsonFileStore.js';
import { admin, otherAdmin, catalogFixture, draft } from './fixtures/learningCatalog.js';

test('persistence: reads, rejected creates and disabled operations create no runtime files', async t => {
  const fixture = await catalogFixture(t);
  const { tutorials, cinema, directory } = fixture;
  assert.deepEqual(await tutorials.list({ kind: 'tutorial', includeDrafts: 'true' }, admin), { items: [], total: 0, limit: 20, offset: 0 });
  assert.equal((await cinema.list({ kind: 'cinema' }, admin)).total, 0);
  await assert.rejects(tutorials.get('tutorial_00000000-0000-0000-0000-000000000000', admin), { statusCode: 404 });
  await assert.rejects(tutorials.create({ ...draft(), ready: true }, admin), { statusCode: 400 });
  await assert.rejects(cinema.create(draft(), admin), { statusCode: 400 });
  await assert.rejects(tutorials.create(draft(), { ...admin, role: 'user' }), { statusCode: 403 });
  assert.deepEqual(await readdir(directory), []);
  const disabled = await catalogFixture(t, false);
  await assert.rejects(disabled.tutorials.create(draft(), admin), { code: 'learning_disabled' });
  assert.deepEqual(await readdir(disabled.directory), []);
});

test('persistence: stable IDs, owner-scoped reads, reload and deletion work for every title type', async t => {
  const { tutorials, cinema, tutorialFile, policy } = await catalogFixture(t);
  for (const type of ['tutorial', 'film', 'series']) {
    const service = type === 'tutorial' ? tutorials : cinema;
    const kind = type === 'tutorial' ? 'tutorial' : 'cinema';
    const created = await service.create(draft(type), admin);
    const units = created.chapters || created.episodes;
    assert.ok(created.id.startsWith(`${type}_`));
    assert.equal(created.ownerUserId, admin.userId);
    assert.equal(created.status, 'draft');
    assert.equal(created.revision, 1);
    assert.ok(units[0].id);
    assert.equal(units[0].description, '');
    assert.deepEqual(await service.get(created.id, admin), created);
    await assert.rejects(service.get(created.id, otherAdmin), { statusCode: 404 });
    await assert.rejects(service.patch(created.id, { revision: 1, title: 'Stolen' }, otherAdmin), { statusCode: 404 });
    await assert.rejects(service.remove(created.id, { revision: 1 }, otherAdmin), { statusCode: 404 });
    assert.equal((await service.list({ kind, includeDrafts: 'true' }, otherAdmin)).total, 0);
    assert.equal((await service.list({ kind }, admin)).total, 0);
    const edited = await service.patch(created.id, { revision: 1, title: 'Renamed' }, admin);
    assert.equal(edited.revision, 2);
    assert.deepEqual(edited.chapters || edited.episodes, units);
    assert.equal(edited.createdAt, created.createdAt);
    if (type === 'tutorial') {
      const reloaded = new TutorialApplicationService({ repository: new TutorialCatalogRepository({ catalogFile: tutorialFile }), policy });
      assert.deepEqual(await reloaded.get(created.id, admin), edited);
    }
    await assert.rejects(service.remove(created.id, { revision: 1 }, admin), { code: 'learning_revision_conflict' });
    await service.remove(created.id, { revision: 2 }, admin);
    await assert.rejects(service.get(created.id, admin), { statusCode: 404 });
  }
});

test('persistence: revision check is atomic across facade/repository instances and failed writes preserve bytes', async t => {
  const { tutorials, tutorialFile, policy } = await catalogFixture(t);
  const second = new TutorialApplicationService({ repository: new TutorialCatalogRepository({ catalogFile: tutorialFile }), policy });
  const created = await tutorials.create(draft(), admin);
  const attempts = await Promise.allSettled([
    tutorials.patch(created.id, { revision: 1, title: 'First edit' }, admin),
    second.patch(created.id, { revision: 1, title: 'Second edit' }, admin)
  ]);
  assert.equal(attempts.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(attempts.find(result => result.status === 'rejected').reason.code, 'learning_revision_conflict');
  const before = await readFile(tutorialFile, 'utf8');
  await assert.rejects(tutorials.patch(created.id, { revision: 1, title: 'Stale' }, admin), { statusCode: 409 });
  await assert.rejects(tutorials.patch(created.id, { revision: 2, ownerUserId: otherAdmin.userId }, admin), { statusCode: 400 });
  assert.equal(await readFile(tutorialFile, 'utf8'), before);
  assert.equal((await tutorials.get(created.id, admin)).revision, 2);
});

test('persistence: reorder preserves IDs and partial access is revalidated on curriculum edits', async t => {
  const { tutorials, cinema } = await catalogFixture(t);
  for (const type of ['tutorial', 'series']) {
    const service = type === 'tutorial' ? tutorials : cinema;
    const field = type === 'tutorial' ? 'chapters' : 'episodes';
    const created = await service.create({ ...draft(type, 6), accessMode: 'preview_then_paid', freeCount: 5, priceCredits: 10 }, admin);
    const reordered = [...created[field]].reverse();
    const changed = await service.patch(created.id, { revision: 1, [field]: reordered }, admin);
    assert.deepEqual(changed[field], reordered);
    assert.equal(changed.freeCount, 5);
    await assert.rejects(service.patch(created.id, { revision: 2, [field]: reordered.slice(0, 5) }, admin), { statusCode: 400 });
    const shrunk = await service.patch(created.id, { revision: 2, [field]: reordered.slice(0, 2), freeCount: 1 }, admin);
    assert.equal(shrunk[field].length, 2);
    assert.equal(shrunk.freeCount, 1);
  }
});

test('persistence: publication never trusts client readiness, fails without writes, and cross-type calls fail closed', async t => {
  const { tutorials, cinema, tutorialFile, cinemaFile, policy } = await catalogFixture(t);
  const course = await tutorials.create(draft(), admin);
  const film = await cinema.create(draft('film'), admin);
  for (const [service, record, file] of [[tutorials, course, tutorialFile], [cinema, film, cinemaFile]]) {
    const before = await readFile(file, 'utf8');
    await assert.rejects(service.publish(record.id, { revision: 1 }, admin), { code: 'learning_assets_not_ready', statusCode: 409 });
    await assert.rejects(service.publish(record.id, { revision: 2 }, admin), { code: 'learning_revision_conflict' });
    await assert.rejects(service.publish(record.id, { revision: 1, ready: true }, admin), { statusCode: 400 });
    await assert.rejects(service.publish(record.id, { revision: 1 }, otherAdmin), { statusCode: 404 });
    await assert.rejects(service.patch(record.id, { revision: 1, status: 'published' }, admin), { statusCode: 400 });
    assert.throws(() => policy.purchase(admin), { statusCode: 503 });
    assert.equal(await readFile(file, 'utf8'), before);
  }
  await assert.rejects(tutorials.get(film.id, admin), { statusCode: 404 });
  await assert.rejects(cinema.get(course.id, admin), { statusCode: 404 });
  await assert.rejects(cinema.patch(film.id, { revision: 1, type: 'series' }, admin), { statusCode: 400 });
  await assert.rejects(tutorials.create(draft('series'), admin), { statusCode: 400 });
});

test('persistence: owner filtering precedes bounded pagination and search', async t => {
  const { tutorials } = await catalogFixture(t);
  for (const title of ['Alpha', 'Alpha two', 'Beta']) await tutorials.create({ ...draft(), title }, admin);
  await tutorials.create({ ...draft(), title: 'Alpha private' }, otherAdmin);
  const first = await tutorials.list({ kind: 'tutorial', includeDrafts: 'true', search: 'alpha', limit: '1' }, admin);
  const second = await tutorials.list({ kind: 'tutorial', includeDrafts: 'true', search: 'alpha', limit: '1', offset: '1' }, admin);
  assert.equal(first.total, 2);
  assert.equal(first.items.length, 1);
  assert.notEqual(first.items[0].id, second.items[0].id);
  assert.equal(first.items[0].ownerUserId, admin.userId);
  const afterEnd = await tutorials.list({ kind: 'tutorial', includeDrafts: 'true', offset: '99' }, admin);
  assert.equal(afterEnd.total, 3);
  assert.deepEqual(afterEnd.items, []);
});

test('persistence: corrupt or unsupported stores fail closed instead of resetting data', async t => {
  const { tutorials, tutorialFile } = await catalogFixture(t);
  await writeJsonFileAtomic(tutorialFile, { schemaVersion: 2, items: [] });
  const before = await readFile(tutorialFile, 'utf8');
  await assert.rejects(tutorials.list({ kind: 'tutorial' }, admin));
  await assert.rejects(tutorials.create(draft(), admin));
  assert.equal(await readFile(tutorialFile, 'utf8'), before);
});

test('persistence: identical UUID suffixes in Tutorial and Cinema cannot cross-read or cross-update', async t => {
  const { tutorials, cinema } = await catalogFixture(t);
  const tutorial = await tutorials.create(draft(), admin);
  const film = await cinema.create(draft('film'), admin);
  const collision = { ...film, id: tutorial.id.replace('tutorial_', 'film_') };
  await cinema.repository.create(collision, admin);
  await assert.rejects(tutorials.get(collision.id, admin), { statusCode: 404 });
  await assert.rejects(cinema.get(tutorial.id, admin), { statusCode: 404 });
  await assert.rejects(tutorials.patch(collision.id, { revision: 1, title: 'Wrong owner' }, admin), { statusCode: 404 });
  await cinema.patch(collision.id, { revision: 1, title: 'Only film changed' }, admin);
  assert.equal((await tutorials.get(tutorial.id, admin)).title, tutorial.title);
  assert.equal((await tutorials.get(tutorial.id, admin)).revision, 1);
});

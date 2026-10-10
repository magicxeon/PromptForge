import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { once } from 'node:events';
import { readFile, readdir } from 'node:fs/promises';
import { registerLearningRoutes } from '../server/app/routes/learningRoutes.js';
import { MockUserRepository } from '../server/repositories/identity/MockUserRepository.js';
import { admin, otherAdmin, catalogFixture, draft } from './fixtures/learningCatalog.js';

async function httpFixture(t, { enabled = true, overrides = {}, jsonLimit = '1mb' } = {}) {
  const fixture = await catalogFixture(t, enabled);
  const app = express();
  app.use(express.json({ limit: jsonLimit }));
  const actors = {
    admin, other: otherAdmin,
    member: { ...admin, role: 'user' }, staff: { ...admin, role: 'support' },
    disabled: new MockUserRepository().toActorContext({ id: admin.userId, role: 'admin', status: 'disabled' }),
    suspended: new MockUserRepository().toActorContext({ id: admin.userId, role: 'admin', status: 'suspended' })
  };
  app.use((req, res, next) => {
    req.actorContext = actors[req.headers['x-test-identity']];
    next();
  });
  registerLearningRoutes(app, { ...fixture, ...overrides });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve());
    server.closeAllConnections();
  }));
  const request = async (method, suffix, body, actor = 'admin', headers = {}, raw = false) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/learning${suffix}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(actor ? { 'x-test-identity': actor } : {}), ...headers },
      ...(body === undefined ? {} : { body: raw ? body : JSON.stringify(body) })
    });
    return { status: response.status, body: response.status === 204 ? null : await response.json(), cache: response.headers.get('cache-control') };
  };
  return { ...fixture, request };
}

test('routes: config is safe for all actors; every catalog/purchase path denies unauthorized access', async t => {
  const { request, directory } = await httpFixture(t);
  const id = 'tutorial_00000000-0000-0000-0000-000000000000';
  for (const actor of [null, 'member', 'staff', 'disabled', 'suspended']) {
    const config = await request('GET', '/config', undefined, actor);
    assert.equal(config.status, 200);
    assert.equal(config.body.enabled, false);
    assert.equal(config.body.billingEnabled, false);
    assert.equal(config.cache, 'no-store');
    for (const [method, url, body] of [
      ['GET', '/catalog?kind=tutorial&includeDrafts=true'], ['GET', `/catalog/${id}`],
      ['POST', '/catalog', draft()], ['PATCH', `/catalog/${id}`, { revision: 1, title: 'Spoofed' }],
      ['DELETE', `/catalog/${id}`, { revision: 1 }], ['POST', `/catalog/${id}/publish`, { revision: 1 }],
      ['POST', '/purchases', {}], ['POST', `/catalog/${id}/purchase`, {}]
    ]) {
      const response = await request(method, url, body, actor, { 'x-role': 'admin', 'x-user-id': admin.userId });
      assert.equal(response.status, actor ? 403 : 401, `${actor}: ${method} ${url}`);
      assert.equal(response.cache, 'no-store');
    }
  }
  assert.equal((await request('GET', '/config')).body.enabled, true);
  assert.deepEqual(await readdir(directory), []);
});

test('routes: feature-off keeps config readable and rejects admin catalog and purchase operations', async t => {
  const { request, directory } = await httpFixture(t, { enabled: false });
  assert.equal((await request('GET', '/config')).body.enabled, false);
  for (const [method, url, body] of [['GET', '/catalog?kind=tutorial'], ['POST', '/catalog', draft()], ['POST', '/purchases', {}]]) {
    const result = await request(method, url, body);
    assert.equal(result.status, 403);
    assert.equal(result.body.error.code, 'learning_disabled');
  }
  assert.deepEqual(await readdir(directory), []);
});

test('routes: exact draft CRUD envelope, actor switching, revision conflict and deletion', async t => {
  const { request } = await httpFixture(t);
  for (const type of ['tutorial', 'film', 'series']) {
    const kind = type === 'tutorial' ? 'tutorial' : 'cinema';
    const created = await request('POST', '/catalog', draft(type));
    assert.equal(created.status, 201);
    const item = created.body.item;
    assert.equal(item.type, type);
    assert.equal(item.status, 'draft');
    assert.equal(item.revision, 1);
    assert.equal(item.ownerUserId, admin.userId);
    assert.equal(Object.hasOwn(item, type === 'tutorial' ? 'episodes' : 'chapters'), false);
    assert.deepEqual((await request('GET', `/catalog/${item.id}`)).body, { item });
    assert.equal((await request('GET', `/catalog?kind=${kind}`)).body.total, 0);
    const list = await request('GET', `/catalog?kind=${kind}&includeDrafts=true`);
    assert.deepEqual(list.body, { items: [item], total: 1, limit: 20, offset: 0 });
    assert.equal((await request('GET', `/catalog?kind=${kind}&includeDrafts=true`, undefined, 'other')).body.total, 0);
    for (const [method, body] of [['GET', undefined], ['PATCH', { revision: 1, title: 'Stolen' }], ['DELETE', { revision: 1 }]]) {
      assert.equal((await request(method, `/catalog/${item.id}`, body, 'other')).status, 404);
    }
    const patched = await request('PATCH', `/catalog/${item.id}`, { revision: 1, title: 'Edited' });
    assert.equal(patched.status, 200);
    assert.equal(patched.body.item.revision, 2);
    assert.equal(patched.body.item.title, 'Edited');
    const stale = await request('PATCH', `/catalog/${item.id}`, { revision: 1, title: 'Stale' });
    assert.equal(stale.status, 409);
    assert.equal(stale.body.error.code, 'learning_revision_conflict');
    assert.equal((await request('DELETE', `/catalog/${item.id}`, { revision: 2 })).status, 204);
    assert.equal((await request('GET', `/catalog/${item.id}`)).status, 404);
  }
});

test('routes: strict validation rejects cross-type/identity/media fields, counts and ambiguous queries', async t => {
  const { request } = await httpFixture(t);
  for (const payload of [null, [], {}, { ...draft(), kind: 'tutorial' }, { ...draft(), role: 'admin' },
    { ...draft(), ownerUserId: otherAdmin.userId }, { ...draft(), ready: true },
    { ...draft(), chapters: [{ title: 'Chapter', lessons: [{ title: 'Lesson', mediaUrl: 'https://private.invalid/video' }] }] },
    { ...draft('series'), chapters: [] }, { ...draft('film'), accessMode: 'preview_then_paid', freeCount: 1 },
    { ...draft(), accessMode: 'preview_then_paid', freeCount: 2 }]) {
    assert.equal((await request('POST', '/catalog', payload)).status, 400);
  }
  for (const query of ['', '?kind=tutorial&kind=cinema', '?kind=film', '?kind=cinema&limit=51',
    '?kind=tutorial&includeDrafts=1', '?kind=tutorial&ownerUserId=admin-b', '?kind=tutorial&offset=1.5']) {
    assert.equal((await request('GET', `/catalog${query}`)).status, 400);
  }
  const { item } = (await request('POST', '/catalog', draft())).body;
  for (const patch of [{ revision: 1, type: 'series' }, { revision: 1, episodes: [] }, { revision: 1, status: 'published' }, { title: 'No revision' }]) {
    assert.equal((await request('PATCH', `/catalog/${item.id}`, patch)).status, 400);
  }
});

test('routes: publish is blocked, purchase is 503, and both are write-free', async t => {
  const { request, tutorialFile } = await httpFixture(t);
  const { item } = (await request('POST', '/catalog', draft())).body;
  const before = await readFile(tutorialFile, 'utf8');
  const publish = await request('POST', `/catalog/${item.id}/publish`, { revision: 1 });
  assert.equal(publish.status, 409);
  assert.equal(publish.body.error.code, 'learning_assets_not_ready');
  assert.equal((await request('POST', `/catalog/${item.id}/publish`, { revision: 1, ready: true })).status, 400);
  for (const path of ['/purchases', `/catalog/${item.id}/purchase`]) {
    const result = await request('POST', path, { priceCredits: 0, entitled: true });
    assert.equal(result.status, 503);
    assert.equal(result.body.error.code, 'learning_billing_unavailable');
    assert.equal(Object.hasOwn(result.body, 'revenue'), false);
  }
  assert.equal(await readFile(tutorialFile, 'utf8'), before);
});

test('routes: language, draft price, chapter descriptions and ordered seasons round-trip through edits', async t => {
  const { request } = await httpFixture(t);
  const input = { ...draft(), language: 'en', accessMode: 'paid', priceCredits: 20 };
  input.chapters[0].description = 'Chapter description';
  input.chapters[0].lessons[0].description = 'Lesson description';
  const created = await request('POST', '/catalog', input);
  assert.equal(created.status, 201);
  assert.equal(created.body.item.language, 'en');
  assert.equal(created.body.item.priceCredits, 20);
  assert.equal(created.body.item.chapters[0].description, 'Chapter description');
  const updated = await request('PATCH', `/catalog/${created.body.item.id}`, { revision: 1, language: 'th', priceCredits: 30 });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.item.language, 'th');
  assert.equal(updated.body.item.priceCredits, 30);
  assert.deepEqual(updated.body.item.chapters, created.body.item.chapters);
  assert.equal((await request('PATCH', `/catalog/${created.body.item.id}`, { revision: 2, priceCredits: 0 })).status, 400);
  assert.equal((await request('PATCH', `/catalog/${created.body.item.id}`, { revision: 2, accessMode: 'free', priceCredits: 0 })).status, 200);
  const seriesInput = { ...draft('series', 4), accessMode: 'preview_then_paid', freeCount: 3, priceCredits: 10 };
  seriesInput.episodes.forEach((episode, index) => { episode.season = index < 2 ? 1 : 2; });
  const series = await request('POST', '/catalog', seriesInput);
  assert.equal(series.status, 201);
  assert.equal(series.body.item.language, 'th');
  assert.equal(series.body.item.freeCount, 3);
  assert.deepEqual(series.body.item.episodes.map(episode => episode.season), [1, 1, 2, 2]);
  const invalid = await request('PATCH', `/catalog/${series.body.item.id}`, { revision: 1, episodes: [...series.body.item.episodes].reverse() });
  assert.equal(invalid.status, 400);
  assert.equal((await request('GET', `/catalog/${series.body.item.id}`)).body.item.revision, 1);
});

test('routes: repository failures are sanitized even with forged status/code', async t => {
  const fail = async () => { throw Object.assign(new Error('secret token /private/path prompt payload'), { statusCode: 400, code: 'secret_code' }); };
  const { request } = await httpFixture(t, { overrides: { tutorials: { list: fail, create: fail, get: fail, patch: fail, remove: fail, publish: fail } } });
  for (const [method, url, body] of [['GET', '/catalog?kind=tutorial'], ['POST', '/catalog', draft()],
    ['GET', '/catalog/tutorial_00000000-0000-0000-0000-000000000000']]) {
    const result = await request(method, url, body);
    assert.equal(result.status, 500);
    assert.deepEqual(result.body, { error: { code: 'learning_unavailable', message: 'Learning catalog is unavailable.' } });
  }
});

test('routes: malformed JSON, oversized bodies, malformed IDs and unknown routes have sanitized JSON errors', async t => {
  const { request } = await httpFixture(t, { jsonLimit: '1kb' });
  const invalidJson = await request('POST', '/catalog', '{"secret":"private"', 'admin', {}, true);
  assert.equal(invalidJson.status, 400);
  assert.equal(JSON.stringify(invalidJson.body).includes('private'), false);
  const large = await request('POST', '/catalog', { ...draft(), description: 'x'.repeat(2000) });
  assert.equal(large.status, 413);
  assert.equal(large.body.error.code, 'learning_payload_too_large');
  assert.equal((await request('GET', '/catalog/%E0%A4%A')).status, 400);
  assert.equal((await request('GET', '/catalog/unknown')).status, 404);
  assert.equal((await request('GET', '/unknown')).status, 404);
});

test('integration: createApp registers learning after actor middleware without bootstrapping live services', async () => {
  const source = await readFile(new URL('../server/app/createApp.js', import.meta.url), 'utf8');
  assert.match(source, /import \{ registerLearningRoutes \} from '\.\/routes\/learningRoutes\.js'/);
  assert.ok(source.indexOf('app.use(actorContextMiddleware)') < source.indexOf('registerLearningRoutes(app)'));
  assert.ok(source.indexOf('registerLearningRoutes(app)') < source.indexOf("app.get('*'"));
});

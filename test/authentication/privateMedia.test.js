import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { once } from 'node:events';
import express from 'express';
import { requestOwnedHttp } from '../../scripts/authentication/fixtures.mjs';
import { AssetRepository } from '../../server/repositories/assets/AssetRepository.js';
import { HistoryRepository } from '../../server/repositories/generation/HistoryRepository.js';
import { GenerationResultRepository } from '../../server/repositories/generation/GenerationResultRepository.js';
import { GenerationExportSourceService } from '../../server/domain/generation/GenerationExportSourceService.js';
import { AssetDeliveryService } from '../../server/domain/assets/AssetDeliveryService.js';
import { registerAssetRoutes } from '../../server/app/routes/assetRoutes.js';
import { createIdentityAccessMiddleware } from '../../server/middleware/identityAccessMiddleware.js';

const ownerId = '6193b42c-89bb-4a0e-8461-70d1a1e9b9cb';
const otherId = '05ef8a3a-d43d-4e1c-86f0-71a59d27f14a';

test('source-authorized private binary delivery is isolated and closes on lost authority', async t => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'mpf-auth-private-media-'));
  const outputs = path.join(temporary, 'outputs');
  const outside = path.join(temporary, 'outside');
  await fs.mkdir(outputs); await fs.mkdir(outside);
  const bytes = Buffer.from([0, 255, 17, 128, 52, 0, 71, 10]);
  const names = ['original.png', 'thumb.webp', 'video.mp4', 'poster.png', 'generation.png',
    'generation-thumb.webp', 'deleted.png', 'unmapped.png', 'legacy.png', 'internal.png', 'failed.png'];
  for (const name of names) await fs.writeFile(path.join(outputs, name), bytes);
  await fs.writeFile(path.join(outside, 'secret.png'), Buffer.from('outside private bytes'));
  await fs.symlink(outside, path.join(outputs, 'escaped'), process.platform === 'win32' ? 'junction' : 'dir');
  await fs.writeFile(path.join(outputs, 'large.mp4'), Buffer.alloc(512 * 1024, 0x67));
  const assetRows = [{ id: 'asset-original', ownerUserId: ownerId, status: 'active', storageProvider: 'local',
    storageKey: 'original.png', publicUrl: '/outputs/original.png', thumbnailUrl: '/outputs/thumb.webp' },
  { id: 'asset-video', ownerUserId: ownerId, status: 'active', storageProvider: 'local',
    storageKey: 'video.mp4', publicUrl: '/outputs/video.mp4', metadata: { posterUrl: '/outputs/poster.png' } },
  { id: 'asset-deleted', ownerUserId: ownerId, status: 'deleted', storageProvider: 'local', publicUrl: '/outputs/deleted.png' },
  { id: 'asset-link', ownerUserId: ownerId, status: 'active', storageProvider: 'local', publicUrl: '/outputs/escaped/secret.png' },
  { id: 'asset-large', ownerUserId: ownerId, status: 'active', storageProvider: 'local', publicUrl: '/outputs/large.mp4' }];
  const historyRows = [{ id: 'new-owned-result', ownerUserId: ownerId, username: ownerId, timestamp: 10,
    imageUrl: '/outputs/generation.png', thumbnailUrl: '/outputs/generation-thumb.webp', status: 'completed' },
  { id: 'legacy-unmapped', username: 'user_demo', timestamp: 9, imageUrl: '/outputs/legacy.png' },
  { id: 'internal-proxy', ownerUserId: ownerId, timestamp: 8, status: 'completed',
    imageUrl: '/outputs/internal.png', artifactVisibility: 'template_owner_only' },
  { id: 'failed-result', ownerUserId: ownerId, timestamp: 7, status: 'failed', imageUrl: '/outputs/failed.png' },
  { id: 'deleted-result', ownerUserId: ownerId, timestamp: 6, status: 'completed', deletedAt: new Date().toISOString(),
    imageUrl: '/outputs/deleted.png' },
  { id: 'other-result', ownerUserId: otherId, username: ownerId, timestamp: 5, imageUrl: '/outputs/other.png' }];
  const assetsFile = path.join(temporary, 'assets.json'), historyFile = path.join(temporary, 'history.json');
  await fs.writeFile(assetsFile, JSON.stringify(assetRows)); await fs.writeFile(historyFile, JSON.stringify(historyRows));
  // No seeded/mock account is needed for a stable UUID recorded by the server.
  const users = { async findById() { return null; }, async findByUsername() { return null; } };
  const assets = new AssetRepository({ assetsFile, userRepository: users });
  const history = new HistoryRepository({ historyFile, cursorSecret: 'isolated-media-cursor' });
  const results = new GenerationResultRepository({ historyStore: history, userRepository: users, groupRepository: {} });
  const service = new AssetDeliveryService({ outputsDirectory: outputs, assetRepository: assets,
    generationSources: new GenerationExportSourceService({ repository: results }) });
  const proofs = new WeakSet();
  let checks = 0, denyAfter = Infinity;
  const actor = userId => {
    const value = Object.freeze({ userId, username: userId, role: 'user', authMode: 'session',
      isMockActor: false, accountStatus: 'active', securityVersion: 1 });
    proofs.add(value); return value;
  };
  const identity = {
    actorProof(value) { if (!proofs.has(value)) throw Object.assign(new Error('forged'), { code: 'auth_forbidden' }); },
    async resolveActor(cookie) {
      if (++checks > denyAfter) return null;
      return cookie === 'owner' ? actor(ownerId) : cookie === 'other' ? actor(otherId) : null;
    },
    async unsafe() { throw new Error('Not needed for read-only media.'); },
  };
  const app = express();
  app.use(async (req, res, next) => {
    req.actorContext = await identity.resolveActor(req.headers.cookie);
    req.requestId = 'isolated_media'; next();
  });
  app.use(createIdentityAccessMiddleware({ identityApplicationService: identity }));
  registerAssetRoutes(app, { assetDeliveryService: service });
  app.use((req, res) => res.status(404).end());
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = (url, options = {}) => requestOwnedHttp(base + url, { ...options, headers: { cookie: 'owner', ...options.headers } });
  try {
    await t.test('owner reads exact recorded original, thumbnail, video, poster and generation output bytes', async () => {
      for (const name of names.slice(0, 6)) {
        const response = await call(`/outputs/${name}`);
        assert.equal(response.status, 200, name);
        assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
        assert.equal(response.headers.get('cache-control'), 'private, no-store');
        assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
      }
    });
    await t.test('HEAD, bounded/suffix Range and conditional reads authorize before headers', async () => {
      const full = await call('/outputs/video.mp4'); await full.arrayBuffer();
      const head = await call('/outputs/video.mp4', { method: 'HEAD' });
      assert.equal(head.status, 200); assert.equal(head.headers.get('content-length'), String(bytes.length));
      assert.equal(await head.text(), '');
      const ranged = await call('/outputs/video.mp4', { headers: { range: 'bytes=1-3' } });
      assert.equal(ranged.status, 206); assert.deepEqual(Buffer.from(await ranged.arrayBuffer()), bytes.subarray(1, 4));
      const suffix = await call('/outputs/video.mp4', { headers: { range: 'bytes=-2' } });
      assert.equal(suffix.status, 206); assert.deepEqual(Buffer.from(await suffix.arrayBuffer()), bytes.subarray(6));
      assert.equal((await call('/outputs/video.mp4', { headers: { range: 'bytes=99-100' } })).status, 416);
      const conditional = await call('/outputs/video.mp4', { headers: { 'if-none-match': full.headers.get('etag') } });
      assert.equal(conditional.status, 304); assert.equal(await conditional.text(), '');
      const foreign = await call('/outputs/video.mp4', { headers: { cookie: 'other', 'if-none-match': full.headers.get('etag') } });
      assert.equal(foreign.status, 404); assert.equal(foreign.headers.get('etag'), null);
    });
    await t.test('guest/wrong owner/unmapped/deleted/internal/failed outputs deny without source bytes', async () => {
      assert.equal((await call('/outputs/original.png', { headers: { cookie: '', 'x-mpf-user-id': ownerId } })).status, 401);
      assert.equal((await call('/outputs/original.png', { headers: { cookie: 'other' } })).status, 404);
      for (const name of ['deleted.png', 'unmapped.png', 'legacy.png', 'internal.png', 'failed.png']) {
        const response = await call(`/outputs/${name}`); assert.equal(response.status, 404, name);
        assert.equal((await response.arrayBuffer()).byteLength === bytes.length, false);
      }
    });
    await t.test('escaped directory symlink and encoded/Windows traversal aliases cannot release files', async () => {
      const escaped = await call('/outputs/escaped/secret.png');
      assert.equal(escaped.status, 404); assert.equal((await escaped.text()).includes('outside private bytes'), false);
      for (const outputUrl of ['/outputs/%2e%2e/outside/secret.png', '/outputs/a%2fb.png', '/outputs/a\\secret.png',
        '/outputs/../outside/secret.png', '/outputs/a/./secret.png', '/outputs/a:/secret.png', '/outputs/original.png.']) {
        await assert.rejects(service.openOwnedOutput({ outputUrl, actor: actor(ownerId), reauthorize: async () => actor(ownerId) }),
          { code: 'output_unavailable' });
      }
    });
    await t.test('revocation during lookup denies GET/HEAD/304 before private headers', async () => {
      for (const options of [{}, { method: 'HEAD' }, { headers: { 'if-none-match': '*' } }]) {
        checks = 0; denyAfter = 1;
        const response = await call('/outputs/original.png', options);
        assert.equal(response.status, 401); assert.equal(response.headers.get('etag'), null);
      }
      denyAfter = Infinity;
    });
    await t.test('source deletion during authorization closes the opened file without delivery', async () => {
      let rechecks = 0;
      try {
        await assert.rejects(service.openOwnedOutput({ outputUrl: '/outputs/original.png', actor: actor(ownerId),
          reauthorize: async () => {
            rechecks++;
            await fs.writeFile(assetsFile, JSON.stringify(assetRows.map(item => item.id === 'asset-original'
              ? { ...item, deletedAt: new Date().toISOString() } : item)));
            return actor(ownerId);
          } }), { code: 'output_unavailable' });
        assert.equal(rechecks, 1);
      } finally { await fs.writeFile(assetsFile, JSON.stringify(assetRows)); }
    });
    await t.test('pinned descriptor retains the authorized original after a later filename replacement', async () => {
      const file = await service.openOwnedOutput({ outputUrl: '/outputs/original.png', actor: actor(ownerId),
        reauthorize: async () => actor(ownerId) });
      const original = path.join(outputs, 'original.png'), retained = path.join(outputs, 'retained.png');
      try {
        await fs.rename(original, retained);
        await fs.writeFile(original, Buffer.from('replacement not authorized at open'));
        assert.deepEqual(await file.handle.readFile(), bytes);
      } finally {
        await file.handle.close(); await fs.rm(original, { force: true }); await fs.rename(retained, original);
      }
    });
    await t.test('revocation between bounded video chunks stops transport without cancelling owned work', async () => {
      checks = 0; denyAfter = 4; // request + two pre-header checks + first chunk
      const received = await new Promise((resolve, reject) => {
        const request = http.get(base + '/outputs/large.mp4', { headers: { cookie: 'owner' } }, response => {
          const chunks = [];
          response.on('data', chunk => chunks.push(chunk));
          response.once('close', () => resolve({ status: response.statusCode, bytes: Buffer.concat(chunks) }));
          response.on('error', () => {});
        });
        request.on('error', reject);
      });
      assert.equal(received.status, 200); assert.equal(received.bytes.length, 64 * 1024);
      assert.equal(checks, 5); denyAfter = Infinity;
      assert.equal(historyRows[0].status, 'completed');
    });
    await t.test('new stable owner identity lists without mock lookup and cursor cannot cross actors', async () => {
      const first = await results.findByOwner(ownerId, { limit: 1 });
      assert.equal(first.items[0].id, 'new-owned-result'); assert.equal(first.hasMore, true);
      const second = await results.findByOwner(ownerId, { limit: 1, cursor: first.nextCursor });
      assert.equal(second.items[0].id, 'failed-result');
      await assert.rejects(results.findByOwner(otherId, { cursor: first.nextCursor }), { code: 'invalid_history_cursor' });
      assert.equal((await results.findByOwner(otherId)).items[0].id, 'other-result');
      assert.equal((await results.findByOwner(ownerId)).items.some(item => item.id === 'legacy-unmapped'), false);
      assert.deepEqual(JSON.parse(await fs.readFile(historyFile, 'utf8')), historyRows);
    });
  } finally {
    server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
    await fs.rm(temporary, { recursive: true, force: true });
  }
});

test('new Queue history completion records trusted stable owner without importing worker singletons', async () => {
  const source = await fs.readFile(new URL('../../server/domain/generation/QueueManager.js', import.meta.url), 'utf8');
  assert.match(source, /const historyEntry = \{\s*id: jobId,\s*ownerUserId: job\.options\.ownerUserId \|\| job\.options\.payerUserId \|\| null,/);
});

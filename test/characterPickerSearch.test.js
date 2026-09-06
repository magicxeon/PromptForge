import test from 'node:test';
import assert from 'node:assert/strict';
import { CharacterProfileRepository } from '../server/repositories/character-profiles/CharacterProfileRepository.js';

function repository() {
  const repo = new CharacterProfileRepository({ cursorSecret: 'character-picker-test' });
  repo.readAll = async () => Array.from({ length: 32 }, (_, i) => ({ id: `c${i}`, displayName: i >= 28 ? `Nara ${i}` : `Mali ${i}`,
    ownerUserId: i === 31 ? 'bob' : 'alice', status: i === 30 ? 'deleted' : 'approved', visibility: i === 29 ? 'private' : 'public',
    reusePolicy: 'public_reusable', intendedUses: ['scene_story'], createdAt: new Date(1700000000000 + i * 1000).toISOString() }));
  return repo;
}
test('Character name search runs before owner pagination without exposing another owner', async () => {
  const result = await repository().findByOwner('alice', { q: ' NARA ', limit: 1 });
  assert.equal(result.items.length, 1); assert.match(result.items[0].displayName, /Nara/);
  assert.equal(result.items[0].ownerUserId, 'alice'); assert.equal(result.hasMore, true);
});
test('Public name search retains visibility/deletion rules and scopes cursor to query', async () => {
  const repo = repository(); const result = await repo.listPublic({ q: 'nara', limit: 1 });
  assert.equal(result.items.length, 1); assert.equal(result.hasMore, true);
  await assert.rejects(() => repo.listPublic({ q: 'mali', limit: 1, cursor: result.nextCursor }));
  const next = await repo.listPublic({ q: 'nara', limit: 1, cursor: result.nextCursor });
  assert.equal(next.items[0].visibility, 'public'); assert.equal(next.items[0].status, 'approved');
  assert.notEqual(next.items[0].id, result.items[0].id);
});
test('Empty search preserves unfiltered ordering/cursor behavior', async () => {
  const repo = repository();
  assert.deepEqual(await repo.findByOwner('alice', { limit: 2 }), await repo.findByOwner('alice', { limit: 2, q: '' }));
  assert.deepEqual(await repo.listPublic({ limit: 2 }), await repo.listPublic({ limit: 2, q: '' }));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { IdentityPasswordAdapter } from '../../server/domain/identity/adapters/IdentityPasswordAdapter.js';

const screening = { available: true, check: async () => ({ compromised: false }) };
const create = options => new IdentityPasswordAdapter({ fixtureOnly: true, screening, ...options });
const rejectsCode = (work, code) => assert.rejects(work, { code });

test('native Argon2id qualifies and preserves Unicode, spaces and distinct normalization', async () => {
  const adapter = create();
  await adapter.prepare();
  const password = '  รหัสผ่าน🔐e\u0301ข้อความยาว  ';
  const hash = await adapter.hash(password);
  assert.match(hash, /^\$argon2id\$v=19\$m=65536,(?:t=3,p=1|p=1,t=3)\$/);
  assert.equal(await adapter.verify(hash, password), true);
  assert.equal(await adapter.verify(hash, password.trim()), false);
  assert.equal(await adapter.verify(hash, password.normalize('NFC')), false);
  assert.equal(await adapter.verify(hash, 'another wrong password'), false);
  assert.equal(adapter.needsRehash(hash), false);
  assert.equal(adapter.available, false);
  const next = await adapter.hash(password);
  assert.notEqual(next, hash);
});

test('creation enforces code-point bounds without silent surrogate replacement', async () => {
  const adapter = create();
  await adapter.prepare();
  for (const password of ['x'.repeat(14), 'x'.repeat(129), '🔐'.repeat(129), 'x'.repeat(15)+'\ud800', null, {}]) {
    await rejectsCode(() => adapter.hash(password), 'IDENTITY_PASSWORD_POLICY_REJECTED');
  }
  const hash = await adapter.hash('🔐'.repeat(128));
  assert.equal(await adapter.verify(hash, '🔐'.repeat(128)), true);
});

test('credential creation denies missing, unavailable, failed and compromised screening', async () => {
  for (const candidate of [undefined, { available: false, check: screening.check },
    { available: true, check: async () => ({ compromised: true }) },
    { available: true, check: async () => ({ compromised: false, extra: true }) },
    { available: true, check: async () => { throw new Error('secret/provider detail'); } }]) {
    const adapter = create({ screening: candidate });
    await adapter.prepare();
    await assert.rejects(() => adapter.hash('long enough test password'), error => {
      assert.equal(error.message, 'Password operation unavailable.');
      return ['IDENTITY_PASSWORD_UNAVAILABLE', 'IDENTITY_PASSWORD_POLICY_REJECTED'].includes(error.code);
    });
  }
  assert.throws(() => new IdentityPasswordAdapter(), { code: 'IDENTITY_PASSWORD_UNAVAILABLE' });
});

test('malformed and resource-excessive hashes execute a bounded dummy instead', async () => {
  const adapter = create();
  await adapter.prepare();
  const hash = await adapter.hash('valid fixture password');
  for (const bad of [null, '', hash.replace('m=65536', 'm=999999999'), hash.replace('t=3', 't=99999'),
    hash.replace('p=1', 'p=64'), hash.replace('argon2id', 'argon2i'), hash+'=', hash.replace('v=19', 'v=16'), 'x'.repeat(10000)]) {
    assert.equal(await adapter.verify(bad, 'valid fixture password'), false);
    assert.throws(() => adapter.needsRehash(bad), { code: 'IDENTITY_PASSWORD_UNAVAILABLE' });
  }
  assert.equal(await adapter.verify(hash, 'x'.repeat(10000)), false);
  assert.equal(await adapter.verify(hash, 'x'.repeat(15)+'\ud800'), false);
});

test('two shared slots reject excess work across instances until actual settlement', async () => {
  const first = create();
  const second = create();
  await first.prepare();
  await second.prepare();
  let release;
  const barrier = new Promise(resolve => { release = resolve; });
  const blockedScreening = { available: true, check: async () => { await barrier; return { compromised: false }; } };
  const a = create({ screening: blockedScreening });
  const b = create({ screening: blockedScreening });
  await a.prepare();
  await b.prepare();
  const pendingA = a.hash('long fixture password A');
  const pendingB = b.hash('long fixture password B');
  await rejectsCode(() => first.verify(null, 'wrong password'), 'IDENTITY_PASSWORD_BUSY');
  release();
  await Promise.all([pendingA, pendingB]);
  assert.equal(await second.verify(null, 'wrong password'), false);
});

test('timeout retains capacity for unresolved screening and ignores late success', async () => {
  let release;
  const barrier = new Promise(resolve => { release = resolve; });
  let calls = 0;
  const held = { available: true, check: async () => { calls++; await barrier; return { compromised: false }; } };
  const a = create({ screening: held });
  const b = create({ screening: held });
  const observer = create();
  await a.prepare(); await b.prepare(); await observer.prepare();
  const results = await Promise.allSettled([a.hash('fixture password timeout A'), b.hash('fixture password timeout B')]);
  assert.equal(calls, 2);
  for (const result of results) {
    assert.equal(result.status, 'rejected');
    assert.equal(result.reason.code, 'IDENTITY_PASSWORD_UNAVAILABLE');
  }
  await rejectsCode(() => observer.verify(null, 'wrong password'), 'IDENTITY_PASSWORD_BUSY');
  release();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(await observer.verify(null, 'wrong password'), false);
});

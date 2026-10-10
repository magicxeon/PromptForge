import test from 'node:test';
import assert from 'node:assert/strict';
import { getLearningPolicy } from '../server/config/learningPolicy.js';
import { LearningAccessPolicy } from '../server/domain/content-access/LearningAccessPolicy.js';
import { validateMetadata, validatePatch, validateListQuery, revisionCommand } from '../server/domain/content-access/catalogContract.js';
import { MockUserRepository } from '../server/repositories/identity/MockUserRepository.js';

const admin = { userId: 'admin-a', role: 'admin', accountStatus: 'active' };
const enabled = new LearningAccessPolicy({ readPolicy: () => getLearningPolicy({ LEARNING_ENABLED: 'true' }) });
const metadata = (type = 'tutorial', count = 2) => ({
  type, title: 'Title', description: 'Description', accessMode: 'free', freeCount: 0,
  [type === 'tutorial' ? 'chapters' : 'episodes']: Array.from({ length: count }, (_, index) => ({
    id: `unit_${index}`, title: `Unit ${index}`,
    ...(type === 'tutorial' ? { lessons: [{ id: `lesson_${index}`, title: 'Lesson' }] } : {})
  }))
});

test('access: config is off by default, exact opt-in only, and always off in production', () => {
  for (const value of [undefined, '', 'false', 'TRUE', '1', true]) {
    assert.equal(getLearningPolicy({ LEARNING_ENABLED: value }).enabled, false);
  }
  assert.equal(getLearningPolicy({ LEARNING_ENABLED: 'true' }).enabled, true);
  assert.equal(getLearningPolicy({ LEARNING_ENABLED: 'true', NODE_ENV: 'production' }).enabled, false);
  const config = enabled.getConfig(admin);
  assert.equal(config.adminOnly, true);
  assert.equal(config.billingEnabled, false);
  assert.equal(config.publicationEnabled, false);
  assert.equal(config.defaultFreeCount, 3);
  config.limits.titleLength = 1;
  assert.equal(enabled.getConfig(admin).limits.titleLength, 200);
});

test('access: missing/member/staff/impersonated/inactive actors cannot read or mutate catalogs', () => {
  for (const actor of [undefined, {}, { ...admin, userId: '' }, { ...admin, userId: 'anonymous_user' },
    ...['user', 'staff', 'support', 'Admin'].map(role => ({ ...admin, role })),
    ...['disabled', 'suspended', null, false, ''].map(accountStatus => ({ ...admin, accountStatus })),
    { ...admin, originalRequesterUserId: 'admin-b' }]) {
    assert.equal(enabled.getConfig(actor).enabled, false);
    assert.throws(() => enabled.assertCatalogAccess(actor), error => [401, 403].includes(error.statusCode));
    assert.throws(() => enabled.purchase(actor), error => [401, 403].includes(error.statusCode));
  }
  const disabled = new LearningAccessPolicy({ readPolicy: () => getLearningPolicy({}) });
  assert.throws(() => disabled.assertCatalogAccess(admin), { code: 'learning_disabled' });
  assert.equal(enabled.assertCatalogAccess(admin), admin);
  assert.throws(() => enabled.purchase(admin), { code: 'learning_billing_unavailable', statusCode: 503 });
  const projected = new MockUserRepository().toActorContext({ id: admin.userId, role: 'admin', status: 'disabled' });
  assert.equal(projected.accountStatus, 'disabled');
  assert.equal(enabled.getConfig(projected).enabled, false);
});

test('catalog: tutorial/cinema metadata is strictly typed and empty drafts remain editable', () => {
  for (const type of ['tutorial', 'film', 'series']) {
    const result = validateMetadata(metadata(type, type === 'film' ? 1 : 2), [type]);
    assert.equal(result.type, type);
    assert.equal(validateMetadata(metadata(type, 0), [type]).freeCount, 0);
    assert.throws(() => validateMetadata(metadata(type, 0), ['other']), { statusCode: 400 });
  }
  assert.throws(() => validateMetadata(metadata('film', 2), ['film']), { statusCode: 400 });
  assert.throws(() => validateMetadata({ ...metadata(), episodes: [] }, ['tutorial']), { statusCode: 400 });
  assert.throws(() => validateMetadata({ ...metadata('series'), chapters: [] }, ['series']), { statusCode: 400 });
});

test('catalog: partial access validates N=1/3/5 without clamping and rejects all-free/zero/fractional counts', () => {
  for (const type of ['tutorial', 'series']) {
    for (const freeCount of [1, 3, 5]) {
      assert.equal(validateMetadata({ ...metadata(type, freeCount + 1), accessMode: 'preview_then_paid', freeCount, priceCredits: 10 }, [type]).freeCount, freeCount);
    }
    for (const freeCount of [-1, 0, 2, 3, 1.5, '1', null, NaN, Infinity]) {
      assert.throws(() => validateMetadata({ ...metadata(type), accessMode: 'preview_then_paid', freeCount, priceCredits: 10 }, [type]), { statusCode: 400 });
    }
  }
  assert.throws(() => validateMetadata({ ...metadata('film', 1), accessMode: 'preview_then_paid', freeCount: 1 }, ['film']), { statusCode: 400 });
  for (const accessMode of ['free', 'paid']) {
    assert.throws(() => validateMetadata({ ...metadata(), accessMode, freeCount: 1 }, ['tutorial']), { statusCode: 400 });
  }
});

test('catalog: unknown fields, authority injection, duplicate IDs and oversized metadata are rejected', () => {
  for (const field of ['ownerUserId', 'role', 'username', 'status', 'revision', 'ready', 'mediaUrl', 'assetId', 'priceVersion', '__proto__', 'constructor']) {
    assert.throws(() => validateMetadata({ ...metadata(), [field]: 'injected' }, ['tutorial']), { statusCode: 400 });
    const input = metadata();
    input.chapters[0].lessons[0][field] = 'injected';
    if (field === '__proto__') Object.defineProperty(input.chapters[0].lessons[0], field, { value: 'injected', enumerable: true });
    assert.throws(() => validateMetadata(input, ['tutorial']), { statusCode: 400 });
  }
  for (const value of [null, [], true, 'title', { ...metadata(), title: ' ' }, { ...metadata(), title: 'x'.repeat(201) },
    { ...metadata(), description: 'x'.repeat(10001) }, { ...metadata(), freeCount: '0' },
    { ...metadata(), chapters: [{ title: 'Chapter', lessons: null }] }]) {
    assert.throws(() => validateMetadata(value, ['tutorial']), { statusCode: 400 });
  }
  const duplicate = metadata();
  duplicate.chapters[1].lessons[0].id = duplicate.chapters[0].id;
  assert.throws(() => validateMetadata(duplicate, ['tutorial']), { statusCode: 400 });
  const oversized = metadata('series', 30);
  oversized.episodes.forEach(unit => { unit.description = 'x'.repeat(10000); });
  assert.throws(() => validateMetadata(oversized, ['series']), { statusCode: 400 });
});

test('catalog: patch validates resulting curriculum/access together and requires a strict revision', () => {
  const record = { ...metadata(), accessMode: 'preview_then_paid', freeCount: 1, priceCredits: 10, revision: 1 };
  assert.throws(() => validatePatch({ revision: 1, chapters: [] }, record, ['tutorial']), { statusCode: 400 });
  assert.equal(validatePatch({ revision: 1, chapters: [], accessMode: 'free', freeCount: 0, priceCredits: 0 }, record, ['tutorial']).chapters.length, 0);
  for (const patch of [{}, { revision: 1 }, { revision: '1', title: 'New' }, { revision: 1, type: 'series' }, { revision: 1, episodes: [] }]) {
    assert.throws(() => validatePatch(patch, record, ['tutorial']), { statusCode: 400 });
  }
  for (const revision of [0, -1, 1.5, '1', null, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => revisionCommand({ revision }), { statusCode: 400 });
  }
});

test('catalog: queries are bounded, reject ambiguous arrays and enforce kind', () => {
  assert.deepEqual(validateListQuery({ kind: 'tutorial' }, 'tutorial'), { includeDrafts: false, search: '', limit: 20, offset: 0 });
  for (const query of [{ kind: 'cinema' }, { kind: 'tutorial', includeDrafts: true }, { kind: ['tutorial'] },
    { kind: 'tutorial', ownerUserId: 'other' }, { kind: 'tutorial', limit: '51' }, { kind: 'tutorial', offset: '-1' },
    { kind: 'tutorial', search: [] }, { kind: 'tutorial', limit: '1.5' }]) {
    assert.throws(() => validateListQuery(query, 'tutorial'), { statusCode: 400 });
  }
});

test('catalog: language and draft-only price defaults are strict without inventing a paid price', () => {
  assert.equal(validateMetadata(metadata(), ['tutorial']).language, 'th');
  assert.equal(validateMetadata(metadata(), ['tutorial']).priceCredits, 0);
  for (const language of ['th', 'en']) {
    assert.equal(validateMetadata({ ...metadata(), language }, ['tutorial']).language, language);
  }
  for (const language of ['', null, 'fr', ['th']]) {
    assert.throws(() => validateMetadata({ ...metadata(), language }, ['tutorial']), { statusCode: 400 });
  }
  for (const accessMode of ['paid', 'preview_then_paid']) {
    const base = { ...metadata(), accessMode, freeCount: accessMode === 'paid' ? 0 : 1 };
    for (const priceCredits of [undefined, null, 0, -1, 1.5, '10', Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      assert.throws(() => validateMetadata({ ...base, priceCredits }, ['tutorial']), { statusCode: 400 });
    }
    assert.equal(validateMetadata({ ...base, priceCredits: 10 }, ['tutorial']).priceCredits, 10);
  }
  assert.throws(() => validateMetadata({ ...metadata(), priceCredits: 10 }, ['tutorial']), { statusCode: 400 });
});

test('catalog: season numbers default to one and partial counts span the whole ordered series', () => {
  const input = { ...metadata('series', 6), accessMode: 'preview_then_paid', freeCount: 3, priceCredits: 10 };
  assert.equal(validateMetadata(input, ['series']).episodes[0].season, 1);
  input.episodes.forEach((episode, index) => { episode.season = index < 2 ? 1 : 2; });
  const result = validateMetadata(input, ['series']);
  assert.equal(result.freeCount, 3);
  assert.deepEqual(result.episodes.slice(0, result.freeCount).map(episode => episode.season), [1, 1, 2]);
  input.episodes[5].season = 1;
  assert.throws(() => validateMetadata(input, ['series']), { statusCode: 400 });
  for (const season of [0, -1, 1.5, '1', null]) {
    assert.throws(() => validateMetadata({ ...metadata('film', 1), episodes: [{ title: 'Film', season }] }, ['film']), { statusCode: 400 });
  }
  assert.throws(() => validateMetadata({ ...metadata(), chapters: [{ title: 'Chapter', season: 1, lessons: [] }] }, ['tutorial']), { statusCode: 400 });
});

test('catalog: curriculum bounds reject oversized chapters, lessons and episode arrays', () => {
  const tooManyLessons = metadata();
  tooManyLessons.chapters[0].lessons = Array.from({ length: 101 }, (_, index) => ({ title: `Lesson ${index}` }));
  const tooManyTotal = metadata('tutorial', 6);
  tooManyTotal.chapters.forEach(chapter => { chapter.lessons = Array.from({ length: 100 }, () => ({ title: 'Lesson' })); });
  for (const input of [metadata('tutorial', 101), tooManyLessons, tooManyTotal, metadata('series', 501)]) {
    assert.throws(() => validateMetadata(input, [input.type]), { statusCode: 400 });
  }
  const multiByte = metadata('series', 30);
  multiByte.episodes.forEach(episode => { episode.description = '\u0e01'.repeat(4000); });
  assert.throws(() => validateMetadata(multiByte, ['series']), { statusCode: 400 });
});

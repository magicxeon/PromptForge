import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DNA_FIELDS, FIELDS, LEGACY_FIELDS, GROUPS, clone, newProfile, normalizeDraft, validateProfile } from './js/schema.js';
import { randomize, replay, prng } from './js/randomizer.js';
import { CASTING_VERSION, CASTING_ROLES, castingPool, internationalName } from './js/casting.js';
import { canonicalDNA, compareDNA, hash } from './js/similarity.js';
import { TRENDING_VERSION, LEGACY_TRENDING_VERSION, LEADING_RECIPES, trendingPool } from './js/trending.js';
import { compose, LAYOUT } from './js/composer.js';
import { planImport, validateEnvelope } from './js/backup.js';
const record = profile => ({ id: profile.characterId, profile, createdAt: '2026-11-08T00:00:00.000Z', updatedAt: '2026-11-08T00:00:00.000Z', imageIds: [], versions: [] });
const empty = () => ({ characters: [], generations: [], presets: [], images: [], settings: [] });
const legacyProfile = () => {
  const profile = newProfile();
  for (const field of FIELDS.filter(item => item.extension)) delete profile.appearance[field.id];
  for (const key of ['characterType', 'nameLocked', 'randomName']) delete profile[key];
  return profile;
};
test('dictionary has13 groups, unique configurable fields and common presentation schema', () => {
  assert.equal(GROUPS.length, 13); assert.ok(DNA_FIELDS.length >= 15); assert.equal(new Set(FIELDS.map(field => field.id)).size, FIELDS.length);
  for (const presentation of ['male', 'female', 'custom']) { const profile = newProfile(); profile.presentation = presentation; validateProfile(profile); assert.ok(compose(profile).text.includes('เอกลักษณ์ใบหน้า')); }
});
test('trending presets use valid options for all presentations and exclude darker tones in all random modes', () => {
  for (const presentation of ['male', 'female', 'custom']) {
    const profile = newProfile(); profile.presentation = presentation;
    for (const field of FIELDS) for (const [value, weight] of trendingPool(field, presentation) || []) {
      assert.ok(weight > 0);
      const candidate = clone(profile); candidate[field.permanent ? 'facialDNA' : 'appearance'][field.id] = value; validateProfile(candidate);
    }
    for (const mode of ['full', 'guided', 'selective', 'novelty']) for (let seed = 0; seed < 24; seed++) {
      const result = randomize(profile, { mode, selected: mode === 'selective' ? ['skin'] : [], seed: `trending-${seed}`, records: mode === 'novelty' ? [record(profile)] : [] }).profile;
      assert.ok(['light', 'medium'].includes(result.facialDNA.skinTone)); validateProfile(result);
      assert.equal(result.randomization.trendingPresetVersion, TRENDING_VERSION);
      assert.deepEqual(replay(result), result);
    }
  }
});
test('turning trending off restores every skin option and locked/untargeted skin never changes', () => {
  const profile = newProfile(); profile.trendingRandom = false;
  const tones = new Set(Array.from({ length: 100 }, (_, index) => randomize(profile, { mode: 'selective', selected: ['skin'], seed: `unrestricted-${index}` }).profile.facialDNA.skinTone));
  assert.deepEqual(tones, new Set(['light', 'medium', 'tan', 'deep', 'rich-deep']));
  profile.trendingRandom = true; profile.facialDNA.skinTone = 'deep'; profile.locks.skinTone = true;
  assert.equal(randomize(profile).profile.facialDNA.skinTone, 'deep');
  profile.locks.skinTone = false;
  assert.equal(randomize(profile, { mode: 'selective', selected: ['eyes'] }).profile.facialDNA.skinTone, 'deep');
  assert.equal(randomize(profile, { mode: 'selective', selected: ['skinTone'] }).profile.facialDNA.skinTone === 'deep', false);
});

test('leading recipes cover every field and all draws remain inside one coherent casting recipe', () => {
  for (const recipe of LEADING_RECIPES) for (const field of FIELDS) {
    const pool = castingPool(field, newProfile(), trendingPool(field, recipe.presentation, TRENDING_VERSION, recipe));
    assert.ok(pool?.length, `${recipe.id}/${field.id} has no curated pool`);
    for (const [value, weight] of pool) {
      assert.ok(weight > 0); const profile = newProfile();
      profile[field.permanent ? 'facialDNA' : 'appearance'][field.id] = value; validateProfile(profile);
    }
  }
  const seen = new Set();
  for (const presentation of ['male', 'female', 'custom']) for (const archetype of ['custom', 'wolf', 'soft', 'elegant', 'sharp']) {
    const baseline = newProfile(); baseline.presentation = presentation; baseline.archetype = archetype;
    for (const mode of ['full', 'guided', 'novelty']) for (let seed = 0; seed < 18; seed++) {
      const result = randomize(baseline, { mode, seed: `casting-${seed}` }).profile;
      const recipe = LEADING_RECIPES.find(item => item.id === result.randomization.leadingRecipeId);
      assert.ok(recipe); seen.add(recipe.id);
      assert.ok(presentation === 'custom' || recipe.presentation === presentation);
      for (const field of FIELDS) {
        const value = result[field.permanent ? 'facialDNA' : 'appearance'][field.id];
        assert.ok(castingPool(field, baseline, trendingPool(field, presentation, TRENDING_VERSION, recipe)).some(([option]) => JSON.stringify(option) === JSON.stringify(value)), `${recipe.id}/${field.id} escaped pool`);
      }
      for (const key of ['age', 'role', 'aestheticStyle', 'bodyHeight', 'bodyBuild', 'presentation']) assert.equal(result[key], baseline[key]);
    }
  }
  assert.equal(seen.size, 4);
});

test('leading random respects out-of-pool locks, one-field scope and unrestricted OFF facial options', () => {
  const profile = newProfile(); profile.facialDNA.bridgeShape = 'convex'; profile.facialDNA.chinShape = 'cleft';
  profile.locks.bridgeShape = true; profile.locks.chinShape = true;
  assert.equal(randomize(profile).profile.facialDNA.bridgeShape, 'convex');
  assert.equal(randomize(profile).profile.facialDNA.chinShape, 'cleft');
  const one = randomize(profile, { mode: 'selective', selected: ['eyeShape'] }).profile;
  for (const field of FIELDS.filter(item => item.id !== 'eyeShape')) assert.deepEqual(one[field.permanent ? 'facialDNA' : 'appearance'][field.id], profile[field.permanent ? 'facialDNA' : 'appearance'][field.id]);
  profile.trendingRandom = false; profile.locks = {};
  const noses = new Set(), chins = new Set();
  for (let seed = 0; seed < 100; seed++) {
    const result = randomize(profile, { seed: `off-face-${seed}` }).profile;
    noses.add(result.facialDNA.bridgeShape); chins.add(result.facialDNA.chinShape);
    assert.equal(result.randomization.leadingRecipeId, null);
  }
  assert.ok(noses.has('convex')); assert.ok(chins.has('cleft'));
});

test('CR-003 trend replay keeps its original full, guided and multi-candidate outputs', () => {
  const baseline = legacyProfile(); baseline.presentation = 'male'; baseline.archetype = 'wolf';
  for (const [mode, golden] of [['full', '561eecba'], ['guided', 'a3ee6fcd'], ['novelty', '21bde1b9']]) {
    const profile = clone(baseline); profile.randomSeed = 'trending-v1-golden';
    profile.randomization = { version: 'mulberry32-v2', trendingPresetVersion: LEGACY_TRENDING_VERSION, seed: profile.randomSeed, mode, selected: [], baseline, candidateIndex: mode === 'novelty' ? 7 : 0 };
    const restored = replay(profile);
    assert.equal(hash(JSON.stringify({ dna: restored.facialDNA, appearance: restored.appearance })), golden);
    assert.ok(!compose(restored).text.includes('ทิศทางแคสติ้ง'));
    profile.randomization.trendingPresetVersion = 'unknown'; assert.throws(() => replay(profile), /Trending preset/);
  }
});

test('casting prompt follows the recorded recipe, keeps checkbox-only edits inert and avoids gendering Custom', () => {
  for (const presentation of ['male', 'female', 'custom']) {
    const baseline = newProfile(); baseline.presentation = presentation;
    const profile = randomize(baseline, { seed: 'casting-prompt' }).profile;
    const before = compose(profile).text;
    assert.ok(before.includes('ทิศทางแคสติ้ง')); assert.ok(before.includes('ให้ยึด DNA และค่าที่ผู้ใช้ปรับ'));
    if (presentation === 'custom') { assert.ok(!before.includes('ตัวเอกชาย')); assert.ok(!before.includes('ตัวเอกหญิง')); }
    profile.trendingRandom = false; assert.equal(compose(profile).text, before);
    profile.presentation = presentation === 'male' ? 'female' : 'male';
    assert.ok(!compose(profile).text.includes('ทิศทางแคสติ้ง'));
  }
});
test('legacy v1 seeds retain the recorded output before Trending Random was added', () => {
  const baseline = legacyProfile(); delete baseline.trendingRandom;
  const profile = clone(baseline); profile.randomSeed = 'legacy-v1-seed';
  profile.randomization = { version: 'mulberry32-v1', seed: profile.randomSeed, mode: 'full', selected: [], baseline, candidateIndex: 0 };
  const restored = replay(profile);
  assert.equal(hash(JSON.stringify({ dna: restored.facialDNA, appearance: restored.appearance })), 'a5818baa');
  validateProfile(baseline); profile.trendingRandom = 'yes'; assert.throws(() => validateProfile(profile), /Trending/);
});

test('CR-004 leading-v2 replay retains its60-field output without adding story attributes', () => {
  const baseline = legacyProfile(); baseline.presentation = 'female';
  const profile = clone(baseline); profile.randomSeed = 'leading-v2-seed';
  profile.randomization = { version: 'mulberry32-v2', trendingPresetVersion: TRENDING_VERSION, seed: profile.randomSeed, mode: 'full', selected: [], baseline, candidateIndex: 0 };
  const restored = replay(profile);
  assert.equal(hash(JSON.stringify({ dna: restored.facialDNA, appearance: restored.appearance })), 'ad14f067');
  assert.equal(restored.appearance.temperament, undefined); assert.equal(restored.characterType, undefined);
  const current = randomize(newProfile()).profile; current.randomization.castingVersion = 'future';
  assert.throws(() => replay(current), /Casting preset/);
});
test('seed replay preserves baseline and locked values in every randomization mode', () => {
  const profile = newProfile(); profile.locks = { faceShape: true, eyeShape: true, hairColor: true }; profile.facialDNA.faceShape = 'square';
  for (const mode of ['full', 'guided', 'selective', 'novelty']) {
    const input = { mode, seed: 'repro', selected: mode === 'selective' ? ['eyes', 'hair'] : [], records: [record(newProfile())] };
    const a = randomize(profile, input).profile, b = randomize(profile, input).profile;
    assert.deepEqual(a, b); assert.equal(a.facialDNA.faceShape, 'square'); assert.equal(a.facialDNA.eyeShape, profile.facialDNA.eyeShape); assert.equal(a.appearance.hairColor, profile.appearance.hairColor);
    const restored = replay(a); assert.deepEqual(restored, a); assert.equal(profile.randomization, null);
  }
});
test('selective reroll leaves other fields unchanged; all locks stay authoritative', () => {
  const profile = newProfile(); const result = randomize(profile, { mode: 'selective', selected: ['eyes'], seed: 'eyes' }).profile;
  for (const field of FIELDS.filter(field => field.group !== 'eyes')) assert.deepEqual(result[field.permanent ? 'facialDNA' : 'appearance'][field.id], profile[field.permanent ? 'facialDNA' : 'appearance'][field.id]);
  for (const field of FIELDS) profile.locks[field.id] = true;
  profile.nameLocked = true;
  assert.equal(randomize(profile, { mode: 'novelty', records: [record(profile)] }).changed, 0);
});

test('international names follow presentation, name lock and selective scope without affecting DNA sampling', () => {
  assert.equal(internationalName('male', () => 0), 'Adrian Bennett');
  assert.equal(internationalName('female', () => 0), 'Amelia Bennett');
  assert.equal(internationalName('custom', () => 0), 'Alex Bennett');
  for (const presentation of ['male', 'female', 'custom']) for (const mode of ['full', 'guided', 'novelty']) {
    const baseline = newProfile(); baseline.presentation = presentation; baseline.name = 'ชื่อที่พิมพ์ไว้';
    const result = randomize(baseline, { mode, seed: 'named-cast' }).profile;
    assert.match(result.name, /^[A-Z][a-z]+ [A-Z][a-z]+$/);
    assert.equal(result.name, internationalName(presentation, prng(`name|named-cast|${presentation}`)));
    assert.deepEqual(replay(result), result);
    const locked = clone(baseline); locked.nameLocked = true;
    const lockedResult = randomize(locked, { mode, seed: 'named-cast' }).profile;
    assert.equal(lockedResult.name, baseline.name); assert.deepEqual(result.facialDNA, lockedResult.facialDNA);
    assert.deepEqual(result.appearance, lockedResult.appearance);
    baseline.randomName = false; assert.equal(randomize(baseline, { mode }).profile.name, baseline.name);
    baseline.randomName = true;
    assert.equal(randomize(baseline, { mode: 'selective', selected: ['eyes'] }).profile.name, baseline.name);
  }
});

test('every dramatic role has valid explicit Trending pools for all85 fields in each presentation', () => {
  assert.equal(FIELDS.length, 85); assert.equal(LEGACY_FIELDS.length, 60); assert.equal(DNA_FIELDS.length, 40);
  assert.equal(CASTING_ROLES.length, 20);
  for (const role of CASTING_ROLES) for (const presentation of ['male', 'female', 'custom']) {
    const profile = newProfile(); profile.characterType = role.id; profile.presentation = presentation;
    for (const recipe of LEADING_RECIPES.filter(item => presentation === 'custom' || item.presentation === presentation)) for (const field of FIELDS) {
      const pool = castingPool(field, profile, trendingPool(field, presentation, TRENDING_VERSION, recipe));
      assert.ok(pool?.length, `${role.id}/${field.id}`);
      for (const [value, weight] of pool) { assert.ok(weight > 0); const candidate = clone(profile); candidate[field.permanent ? 'facialDNA' : 'appearance'][field.id] = value; validateProfile(candidate); }
    }
    for (const mode of ['full', 'guided', 'selective', 'novelty']) {
      const selected = mode === 'selective' ? ['personality', 'voice', 'performance'] : [];
      const result = randomize(profile, { mode, selected, seed: `role-${role.id}` }).profile;
      const recipe = LEADING_RECIPES.find(item => item.id === result.randomization.leadingRecipeId);
      for (const field of FIELDS.filter(item => mode !== 'selective' || selected.includes(item.group))) {
        const pool = castingPool(field, profile, trendingPool(field, presentation, TRENDING_VERSION, recipe));
        assert.ok(pool.some(([value]) => JSON.stringify(value) === JSON.stringify(result[field.permanent ? 'facialDNA' : 'appearance'][field.id])), `${role.id}/${field.id} escaped`);
      }
      assert.equal(result.randomization.castingVersion, CASTING_VERSION); assert.equal(result.presentation, presentation);
      assert.equal(result.role, profile.role); assert.equal(result.age, profile.age); assert.deepEqual(replay(result), result);
      if (role.id !== 'auto') { const text = compose(result).text; assert.ok(text.includes(role.label)); if (!['hero', 'heroine'].includes(role.id)) assert.ok(!text.includes('ทิศทางแคสติ้ง: ตัวเอก')); }
    }
  }
});

test('new personality/performance locks and single-field scope win; OFF restores extended choices', () => {
  const profile = newProfile(); profile.characterType = 'doctor'; profile.appearance.signatureProp = 'tray'; profile.locks.signatureProp = true;
  const result = randomize(profile).profile; assert.equal(result.appearance.signatureProp, 'tray');
  const one = randomize(profile, { mode: 'selective', selected: ['voiceTone'] }).profile;
  for (const field of FIELDS.filter(item => item.id !== 'voiceTone')) assert.deepEqual(one[field.permanent ? 'facialDNA' : 'appearance'][field.id], profile[field.permanent ? 'facialDNA' : 'appearance'][field.id]);
  assert.equal(canonicalDNA(result.facialDNA), canonicalDNA(replay(result).facialDNA));
  const baseline = clone(profile); baseline.trendingRandom = false; baseline.locks = {};
  const props = new Set(Array.from({ length: 150 }, (_, seed) => randomize(baseline, { seed: `all-props-${seed}` }).profile.appearance.signatureProp));
  assert.equal(props.size, 10);
});

test('legacy snapshots stay valid and unchanged; new fields persist in backup with unchanged DNA equality', () => {
  const old = legacyProfile(), before = JSON.stringify(old); validateProfile(old);
  const stores = empty(); stores.characters.push(record(old)); validateEnvelope({ format: 'character-dna-studio', version: 1, stores });
  const editable = normalizeDraft(clone(old)); assert.equal(JSON.stringify(old), before);
  assert.equal(editable.characterType, 'auto'); assert.equal(editable.randomName, true);
  assert.equal(canonicalDNA(editable.facialDNA), canonicalDNA(old.facialDNA));
  const current = randomize(editable, { seed: 'new-backup' }).profile; current.characterType = 'villain'; current.nameLocked = true;
  const saved = empty(); saved.characters = [record(current)];
  const incoming = { format: 'character-dna-studio', version: 1, stores: saved };
  const imported = planImport(incoming, empty(), 'skip').changes[0].record.profile;
  assert.equal(imported.characterType, 'villain'); assert.equal(imported.nameLocked, true); assert.equal(imported.appearance.temperament, current.appearance.temperament);
  const invalid = clone(current); invalid.characterType = 'unknown'; assert.throws(() => validateProfile(invalid));
  invalid.characterType = 'hero'; invalid.randomName = 'yes'; assert.throws(() => validateProfile(invalid));
});
test('replay after Save As New keeps the new character identity and metadata', () => {
  const result = randomize(newProfile(), { seed: 'replay-copy', mode: 'novelty' }).profile;
  result.characterId = 'new-character'; result.name = 'สำเนาใหม่';
  const restored = replay(result);
  assert.equal(restored.characterId, 'new-character'); assert.equal(restored.name, 'สำเนาใหม่');
  assert.deepEqual(restored.facialDNA, result.facialDNA);
});
test('novelty picks the candidate with minimum worst-case similarity deterministically', () => {
  const profile = newProfile(), records = [record(newProfile()), record(randomize(newProfile(), { seed: 'other' }).profile)];
  const result = randomize(profile, { mode: 'novelty', seed: 'novelty', records, candidateCount: 30 });
  assert.equal(result.profile.randomization.candidateCount, 30);
  assert.deepEqual(result, randomize(profile, { mode: 'novelty', seed: 'novelty', records, candidateCount: 30 }));
  assert.ok(result.nearest.score <= 100);
  const scores = Array.from({ length: 30 }, (_, candidateIndex) => {
    const snapshot = clone(result.profile); snapshot.randomization.candidateIndex = candidateIndex;
    const candidate = replay(snapshot);
    return Math.max(...records.map(record => compareDNA(candidate.facialDNA, record.profile.facialDNA).score));
  });
  assert.ok(Math.abs(result.nearest.score - Math.min(...scores)) < .000001);
});
test('exact DNA ignores variable styling, multi-value order and distinguishes small differences', () => {
  const a = newProfile(), b = clone(a); b.appearance.costume = 'formal'; b.presentation = 'male'; b.age = 40;
  assert.equal(canonicalDNA(a.facialDNA), canonicalDNA(b.facialDNA)); assert.equal(compareDNA(a.facialDNA, b.facialDNA).exact, true);
  b.facialDNA.earShape = 'attached'; const comparison = compareDNA(a.facialDNA, b.facialDNA);
  assert.equal(comparison.exact, false); assert.ok(comparison.score < 100); assert.deepEqual(comparison, compareDNA(a.facialDNA, b.facialDNA));
});
test('Thai composer keeps mode constraints,18-image layout and identity separate', () => {
  const profile = newProfile(); const dna = canonicalDNA(profile.facialDNA);
  assert.equal(LAYOUT.panels.reduce((sum, panel) => sum + panel.count, 0), 18);
  assert.ok(!compose(profile).text.includes('Angle Views'));
  profile.output.mode = 'looksheet'; const text = compose(profile).text; assert.ok(text.includes('LS-STD-9x16-V1')); assert.ok(text.includes('รวม18ภาพย่อย')); assert.ok(!text.includes('ไม่มีข้อความหรือตาราง'));
  profile.output.mode = 'scene'; profile.appearance.expression = 'anger'; assert.equal(canonicalDNA(profile.facialDNA), dna); assert.ok(compose(profile).text.includes('ที่ผู้ใช้แนบ'));
});
test('backup repeated import is idempotent and deliberate copies remap character identities', () => {
  const profile = newProfile(), existing = empty(), stores = empty(); stores.characters.push(record(profile));
  const incoming = { format: 'character-dna-studio', version: 1, stores };
  const first = planImport(incoming, existing, 'skip'); assert.equal(first.changes.length, 1); existing.characters = stores.characters;
  assert.equal(planImport(incoming, existing, 'skip').changes.length, 0);
  const copy = planImport(incoming, existing, 'copy').changes[0].record; assert.notEqual(copy.id, profile.characterId); assert.equal(copy.id, copy.profile.characterId);
  assert.throws(() => validateEnvelope(JSON.parse('{"format":"character-dna-studio","version":1,"__proto__":{"polluted":true}}')), /ไม่ปลอดภัย/);
});
test('import merge preserves existing Library version and does not rewrite history', () => {
  const profile = newProfile(), existing = empty(), stores = empty(); existing.characters = [record(profile)]; stores.characters = [record(clone(profile))]; stores.characters[0].profile.name = 'แก้ชื่อ';
  const merged = planImport({ format: 'character-dna-studio', version: 1, stores }, existing, 'merge'); assert.equal(merged.changes[0].record.versions.length, 1); assert.equal(merged.changes[0].record.versions[0].profile.name, '');
});
test('invalid values, unsupported schema and unsafe nested input are rejected', () => {
  const profile = newProfile(); profile.age = 12; assert.throws(() => validateProfile(profile)); profile.age = 25; profile.facialDNA.eyeSize = 10; assert.throws(() => validateProfile(profile));
  profile.facialDNA.eyeSize = 3; profile.schemaVersion = 'future'; assert.throws(() => validateProfile(profile));
});
test('backup copy remaps generation and image relationships, including version references', () => {
  const profile = newProfile(), stores = empty();
  stores.images.push({ id: 'image-one', mimeType: 'image/jpeg', createdAt: '2026-11-08T00:00:00.000Z' });
  stores.generations.push({ id: 'generation-one', profile: clone(profile), characterId: profile.characterId, createdAt: '2026-11-08T00:00:00.000Z', promptText: compose(profile).text });
  stores.characters.push({ ...record(profile), generationId: 'generation-one', imageIds: ['image-one'], versions: [{ profile: clone(profile), imageIds: ['image-one'], savedAt: '2026-11-08T00:00:00.000Z' }] });
  const changes = planImport({ format: 'character-dna-studio', version: 1, stores }, empty(), 'copy').changes;
  const character = changes.find(change => change.store === 'characters').record, generation = changes.find(change => change.store === 'generations').record, image = changes.find(change => change.store === 'images').record;
  assert.equal(character.generationId, generation.id); assert.equal(character.imageIds[0], image.id); assert.equal(character.versions[0].imageIds[0], image.id);
  assert.equal(character.id, generation.profile.characterId); assert.equal(generation.characterId, character.id);
});
test('import rejects missing timestamps and missing immutable prompt snapshots before committing', () => {
  const stores = empty(); stores.characters = [record(newProfile())]; delete stores.characters[0].createdAt;
  assert.throws(() => validateEnvelope({ format: 'character-dna-studio', version: 1, stores }), /วันที่/);
  stores.characters = []; stores.generations = [record(newProfile())];
  assert.throws(() => validateEnvelope({ format: 'character-dna-studio', version: 1, stores }), /Snapshot/);
});

import { FIELDS, LEGACY_FIELDS, clone, fieldValue, setField, validateProfile, normalizeDraft } from './schema.js';
import { closest, datasetFingerprint, hash } from './similarity.js';
import { TRENDING_VERSION, LEGACY_TRENDING_VERSION, selectLeadingRecipe, trendingPool, weightedChoice } from './trending.js';
import { CASTING_VERSION, castingRole, castingPool, internationalName } from './casting.js';
export const RNG_VERSION = 'mulberry32-v3';
export function prng(seed) {
  let state = parseInt(hash(String(seed)), 16);
  return () => { state += 0x6D2B79F5; let n = state; n = Math.imul(n ^ n >>> 15, n | 1); n ^= n + Math.imul(n ^ n >>> 7, n | 61); return ((n ^ n >>> 14) >>> 0) / 4294967296; };
}
const guide = {
  fox: { eyeShape: 'fox', faceShape: 'diamond', canthalTilt: 4, jawDefinition: 4 },
  cat: { eyeShape: 'cat', faceShape: 'heart', cheekboneProminence: 4, lipFullness: 4 },
  wolf: { faceShape: 'square', jawWidth: 4, jawDefinition: 5, browShape: 'sword' },
  soft: { faceShape: 'oval', eyeShape: 'round', jawAngularness: 2, cheekFullness: 4 },
  sharp: { faceShape: 'diamond', jawDefinition: 5, cheekboneProminence: 5, browAngle: 4 },
  elegant: { faceShape: 'oblong', eyeShape: 'almond', chinLength: 4, facialThirdBalance: 4 }, custom: {}
};
function candidate(baseline, rng, mode, selected, trending = baseline.trendingRandom === true, trendVersion = TRENDING_VERSION, extended = true) {
  const result = clone(baseline);
  const direction = extended ? castingRole(baseline).direction : null;
  const recipe = trending && trendVersion === TRENDING_VERSION ? selectLeadingRecipe(baseline.presentation, rng, direction ? 'guided' : mode, direction || baseline.archetype) : null;
  for (const field of extended ? FIELDS : LEGACY_FIELDS) {
    if (baseline.locks[field.id] || (selected?.length && !selected.includes(field.id) && !selected.includes(field.group))) continue;
    let value;
    const basePool = trending ? trendingPool(field, baseline.presentation, trendVersion, recipe) : null;
    const pool = trending && extended ? castingPool(field, baseline, basePool) : basePool;
    const preferred = guide[baseline.archetype]?.[field.id];
    if (pool) {
      value = !recipe && mode !== 'full' && preferred !== undefined && pool.some(([option]) => option === preferred) && rng() < .62
        ? preferred : weightedChoice(pool, rng);
    }
    else if (mode !== 'full' && guide[baseline.archetype]?.[field.id] !== undefined && rng() < .62) value = guide[baseline.archetype][field.id];
    else if (field.type === 'range') value = 1 + Math.floor(rng() * 5);
    else if (field.type === 'multi') value = field.options.filter(() => rng() < .10).map(option => option.value);
    else if (field.type === 'color') value = `#${Math.floor(rng() * 0xffffff).toString(16).padStart(6, '0')}`;
    else value = field.options[Math.floor(rng() * field.options.length)].value;
    setField(result, field, value);
  }
  // Soft conflicts remain warnings. Never normalize by altering locked values.
  return { profile: result, recipeId: recipe?.id ?? null };
}
export function randomize(profile, { mode = 'full', selected = [], seed = profile.randomSeed, records = [], candidateCount = 20, scope = 'both' } = {}) {
  validateProfile(profile);
  if (mode === 'selective' && !selected.length) throw new Error('เลือกกลุ่มหรือฟิลด์ที่ต้องการสุ่มก่อน');
  const baseline = clone(profile); baseline.randomization = null;
  normalizeDraft(baseline);
  const rng = prng(seed), count = mode === 'novelty' ? Math.max(20, Math.min(200, candidateCount)) : 1;
  let best = null;
  for (let index = 0; index < count; index++) {
    const { profile: result, recipeId } = candidate(baseline, rng, mode, selected);
    const near = records.length ? closest(result.facialDNA, records, null, 1)[0] : null;
    const quality = near?.exact ? -1 : 100 - (near?.score ?? 0);
    if (!best || quality > best.quality) best = { result, recipeId, index, near, quality };
  }
  best.result.randomSeed = String(seed);
  const nameGenerated = baseline.randomName && !baseline.nameLocked && !selected.length && mode !== 'selective';
  if (nameGenerated) best.result.name = internationalName(baseline.presentation, prng(`name|${seed}|${baseline.presentation}`));
  best.result.randomization = { version: RNG_VERSION, castingVersion: CASTING_VERSION, schemaVersion: '1.0', presetVersion: '1.0', trendingPresetVersion: baseline.trendingRandom ? TRENDING_VERSION : null, leadingRecipeId: best.recipeId, nameGenerated, constraintVersion: 'soft-v1', mode, selected, seed: String(seed), baseline, candidateCount: count, candidateIndex: best.index, scope, datasetFingerprint: datasetFingerprint(records) };
  return { profile: best.result, nearest: best.near, changed: FIELDS.filter(field => JSON.stringify(fieldValue(profile, field)) !== JSON.stringify(fieldValue(best.result, field))).length + Number(profile.name !== best.result.name) };
}
export function replay(profile) {
  const trace = profile.randomization;
  if (!trace || trace.seed !== profile.randomSeed) return randomize(profile, { seed: profile.randomSeed }).profile;
  if (![RNG_VERSION, 'mulberry32-v2', 'mulberry32-v1'].includes(trace.version) || !Number.isInteger(trace.candidateIndex) || trace.candidateIndex < 0 || trace.candidateIndex >= 200) throw new Error('ไม่รองรับข้อมูลการสุ่มรุ่นนี้');
  if (trace.version === RNG_VERSION && trace.castingVersion !== CASTING_VERSION) throw new Error('ไม่รองรับ Casting preset รุ่นนี้ กรุณาใช้ JSON Snapshot เดิม');
  if (trace.version !== 'mulberry32-v1' && trace.baseline?.trendingRandom && ![TRENDING_VERSION, LEGACY_TRENDING_VERSION].includes(trace.trendingPresetVersion)) throw new Error('ไม่รองรับ Trending preset รุ่นนี้ กรุณาใช้ JSON Snapshot เดิม');
  validateProfile(trace.baseline);
  const rng = prng(trace.seed); let result;
  for (let index = 0; index <= trace.candidateIndex; index++) result = candidate(trace.baseline, rng, trace.mode, trace.selected, trace.version !== 'mulberry32-v1' && trace.baseline.trendingRandom === true, trace.trendingPresetVersion, trace.version === RNG_VERSION).profile;
  // Replay attributes, never revert the identity of a deliberate Save As New.
  for (const key of ['characterId', 'name', 'project', 'presentation', 'age', 'role', 'aestheticStyle', 'personalityDirection', 'bodyHeight', 'bodyBuild', 'output', 'sameIdentity', 'characterType', 'nameLocked', 'randomName']) if (profile[key] !== undefined) result[key] = clone(profile[key]);
  result.trendingRandom = trace.version === 'mulberry32-v1' ? (profile.trendingRandom ?? false) : Boolean(trace.baseline.trendingRandom);
  result.randomSeed = trace.seed; result.randomization = clone(trace);
  return result;
}

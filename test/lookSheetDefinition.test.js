import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeLookSheetDefinition, acceptLookSheetSnapshot, compileLookSheetPrompt, getLookSheetPreset } from '../server/domain/character-profiles/LookSheetDefinitionService.js';
import { readFileSync } from 'node:fs';
import { prepareEnhancementInput, validateEnhancementResult } from '../server/domain/generation/lookSheetEnhancementPrompt.js';

const definition = { schemaVersion: 1, name: 'MIRA', ageYears: 24, appearance: 'Short dark hair', situation: 'Market stall owner' };
const context = (fields = definition, extra = {}) => ({ lookSheetDefinition: fields, generationSurface: 'playground', ...extra });
test('editorial recipe pins sections and a layout variant without overwriting the legacy recipe', () => {
  const preset = getLookSheetPreset();
  assert.equal(preset.version, 2);
  assert.equal(preset.strategy, 'single_image');
  const legacy = JSON.parse(readFileSync(new URL('../server/config/prompt-recipes/character-looks/document-sheet.v1.json', import.meta.url), 'utf8'));
  assert.equal(legacy.version, 1);
  assert.match(legacy.direction, /Do not render names/);
  assert.deepEqual(preset.defaults, legacy.defaults);
  assert.doesNotMatch(preset.direction, /Do not render names|Do not add an expression grid/);
  for (const [ratio, layout] of [['3:4', 'portrait'], ['6:8', 'portrait'], ['2:3', 'portrait'], ['1:1', 'square'], ['16:9', 'landscape'], ['auto', 'portrait']]) {
    const input = context(definition, { aspectRatio: ratio });
    const prompt = compileLookSheetPrompt(input);
    for (const label of ['HEADER:', 'IDENTITY VIEWS:', 'EXPRESSIONS:', 'HAIR & DETAILS:', 'WARDROBE & PROPS:', 'COLOR PALETTE:', 'CHARACTER NOTES:']) assert.ok(prompt.includes(label), label);
    assert.ok(prompt.includes(preset.layouts[layout]));
    assert.match(prompt, /Momelo branding is added only on Download/);
    assert.match(prompt, /Show feet completely/);
    const snapshot = acceptLookSheetSnapshot(input);
    assert.equal(snapshot.layoutId, `editorial-v2-${layout}`);
    assert.equal(snapshot.textMode, 'generated');
    assert.equal(snapshot.presetVersion, 2);
  }
  preset.direction = 'mutated';
  assert.notEqual(getLookSheetPreset().direction, preset.direction);
});

test('editorial fields and approved authority survive enhancement with the full pattern', () => {
  const fields = { ...definition, name: '\u0e19\u0e25\u0e34\u0e19', outfit: 'Blue jacket and plain trousers', personality: 'Thoughtful and cheerful' };
  const input = context(fields, { aspectRatio: '3:4' });
  const snapshot = acceptLookSheetSnapshot(input);
  const original = compileLookSheetPrompt({ ...input, lookSheetSnapshot: snapshot });
  for (const text of [fields.name, fields.appearance, fields.situation, fields.outfit, fields.personality, '24 years']) assert.ok(original.includes(text));
  const prepared = prepareEnhancementInput(snapshot, original);
  const result = validateEnhancementResult({ sourceFingerprint: prepared.sourceFingerprint,
    refinedPrompt: 'Create a polished editorial character sheet with natural photographic skin texture and consistent soft studio lighting. Keep the supplied composition and personal identity unchanged.',
    coveredFields: ['name', 'ageYears', 'appearance', 'situation', 'outfit', 'personality'] }, prepared, original);
  assert.ok(result.includes(original));
  const oldSnapshot = { ...snapshot, presetVersion: 1, recipeFingerprint: 'legacy', textMode: undefined, layoutId: undefined };
  assert.notEqual(prepareEnhancementInput(oldSnapshot, 'legacy five views').sourceFingerprint, prepared.sourceFingerprint);
});

test('document-only adult boundary rejects underage and mixed approved ranges without changing identity', () => {
  for (const ageYears of [1, 17, 121]) assert.throws(() => normalizeLookSheetDefinition({ ...definition, ageYears }), { code: 'look_sheet_adult_required' });
  for (const ageYears of [18, 120]) assert.equal(normalizeLookSheetDefinition({ ...definition, ageYears }).ageYears, ageYears);
  const characterProfileContext = { purpose: 'character_usage', identityPack: { ageRange: { minimum: 15, maximum: 19 } } };
  assert.throws(() => acceptLookSheetSnapshot(context({ ...definition, ageYears: null }, { characterProfileContext })), { code: 'look_sheet_adult_required' });
  assert.equal(characterProfileContext.identityPack.ageRange.minimum, 15);
});
test('layout follows chosen ratio and invalidates enhancement source when orientation changes', () => {
  const portrait = context(definition, { aspectRatio: '6:8' });
  const landscape = context(definition, { aspectRatio: '16:9' });
  assert.match(compileLookSheetPrompt(portrait), /6:8 portrait canvas/);
  assert.match(compileLookSheetPrompt(landscape), /16:9 landscape canvas/);
  assert.match(compileLookSheetPrompt(context(definition, { aspectRatio: '1:1' })), /1:1 square canvas/);
  assert.notEqual(acceptLookSheetSnapshot(portrait).fingerprint, acceptLookSheetSnapshot(landscape).fingerprint);
});
test('appearance accepts 2000 Unicode code points and the complete multilingual byte budget', () => {
  const wide = '\u{1f642}';
  const maximum = { ...definition, name: wide.repeat(80), appearance: wide.repeat(2000),
    situation: wide.repeat(800), outfit: wide.repeat(800), personality: wide.repeat(240) };
  assert.ok(Buffer.byteLength(JSON.stringify(maximum), 'utf8') > 8192);
  assert.equal(normalizeLookSheetDefinition(maximum).appearance, maximum.appearance);
  assert.throws(() => normalizeLookSheetDefinition({ ...maximum, appearance: wide.repeat(2001) }));
});
test('definition validates Unicode bounds, required age and strict input', () => {
  assert.equal(normalizeLookSheetDefinition(definition).name, 'MIRA');
  for (const patch of [{ name: '' }, { name: 'x'.repeat(81) }, { ageYears: 0 }, { ageYears: 1.5 }, { unknown: true }, { situation: 'x'.repeat(801) }]) {
    assert.throws(() => normalizeLookSheetDefinition({ ...definition, ...patch }));
  }
  assert.throws(() => acceptLookSheetSnapshot(context({ ...definition, ageYears: null })), { code: 'look_sheet_age_required' });
});
test('snapshot is deterministic, immutable from input and changes fingerprint with definition', () => {
  const original = structuredClone(definition);
  const a = acceptLookSheetSnapshot(context(original));
  assert.deepEqual(a, acceptLookSheetSnapshot(context(original)));
  original.name = 'changed';
  assert.equal(a.fields.name, 'MIRA');
  assert.notEqual(a.fingerprint, acceptLookSheetSnapshot(context(original)).fingerprint);
  assert.match(compileLookSheetPrompt(context(definition, { lookSheetSnapshot: a })), /24 years/);
});
test('approved ranges and wardrobe stay authoritative', () => {
  const characterProfileContext = { purpose: 'character_usage', characterProfileId: 'profile', characterProfileVersionId: 'v1',
    outfitBehavior: 'preserve', identityPack: { ageRange: { minimum: 20, maximum: 29 } } };
  const snapshot = acceptLookSheetSnapshot(context({ ...definition, ageYears: null }, { characterProfileContext }));
  assert.deepEqual(snapshot.ageRange, { attributeId: null, minimum: 20, maximum: 29 });
  assert.equal(snapshot.fields.ageYears, null);
  assert.throws(() => acceptLookSheetSnapshot(context({ ...definition, ageYears: 45 }, { characterProfileContext })), { code: 'look_sheet_age_conflict' });
  assert.throws(() => acceptLookSheetSnapshot(context({ ...definition, outfit: 'New suit' }, { characterProfileContext })), { code: 'look_sheet_outfit_locked' });
});

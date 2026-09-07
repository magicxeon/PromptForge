import assert from 'node:assert/strict';
import test from 'node:test';
import { PlaygroundVideoReferenceService } from '../server/domain/generation/PlaygroundVideoReferenceService.js';

const actor = { userId: 'owner', username: 'owner' };
function setup() {
  const state = { history: { id: 'job_owned', imageUrl: '/outputs/job_owned.png', provider: 'gemini', status: 'completed' }, revoked: false, hash: 'original' };
  const service = new PlaygroundVideoReferenceService({
    assetRepository: { async findById() { return null; }, async findByPublicUrlForOwner() { return null; } },
    historyRepository: { async findByIdForOwner(id, userId) { return userId === actor.userId && id === state.history?.id ? state.history : null; } },
    characterService: { async validateGenerationContext() {
      if (state.revoked) throw new Error('revoked');
      return { authorizedCharacterReferenceAssetId: '/outputs/shared-character.png', attribution: { characterProfileId: 'character' } };
    } },
    contentLoader: async asset => ({ bytes: Buffer.from(asset.storageKey), contentHash: state.hash, mimeType: 'image/png', width: 720, height: 1280, sizeBytes: 100 }),
  });
  const input = { inputMode: 'image_to_video', references: [{ role: 'first_frame', purpose: 'opening_frame', referenceImageUrl: '/outputs/job_owned.png' }] };
  return { service, state, input };
}
test('Owned generated images from any provider resolve original bytes without a trusted expiry', async () => {
  const { service, state, input } = setup();
  for (const provider of ['gemini', 'openai', 'meta', 'seedream']) {
    state.history.provider = provider;
    const plan = await service.prepare(input, actor);
    assert.equal(plan.input.references[0].sourceKind, 'owned_generation');
    assert.equal(plan.assets[0].storageKey, 'job_owned.png');
    const result = await service.resolve(plan, { providerId: 'gemini', inputMode: 'image_to_video' }, actor, {});
    assert.match(result.referenceImage, /^data:image\/png;base64,/);
  }
});
test('Foreign, deleted, private template artifact and substituted URLs are rejected', async () => {
  for (const mutation of [
    ({ state }) => { state.history = null; },
    ({ state }) => { state.history.status = 'deleted'; },
    ({ state }) => { state.history.artifactVisibility = 'template_owner_only'; },
    ({ state }) => { state.history.imageUrl = '/outputs/job_other.png'; },
    ({ input }) => { input.references[0].referenceImageUrl = 'https://example.invalid/private.png'; },
  ]) {
    const fixture = setup(); mutation(fixture);
    await assert.rejects(fixture.service.prepare(fixture.input, actor), { code: 'video_reference_unavailable' });
  }
});
test('Generated Look and already registered outputs use the same owned History authority', async () => {
  const { service, input } = setup();
  service.assetRepository.findByPublicUrlForOwner = async () => ({ assetType: 'character_face', publicUrl: input.references[0].referenceImageUrl });
  input.inputMode = 'multimodal_reference';
  input.references[0].role = 'reference_image';
  input.references[0].purpose = 'generated_look';
  const plan = await service.prepare(input, actor);
  assert.equal(plan.input.references[0].purpose, 'generated_look');
  assert.equal(plan.assets[0].sourceKind, 'owned_generation');
});
test('Character resolves the approved canonical image, not a submitted decorative preview', async () => {
  const { service, state } = setup();
  const input = { inputMode: 'multimodal_reference', characterProfileId: 'character', characterProfileVersionId: 'v1',
    references: [{ role: 'reference_image', purpose: 'character_reference', characterProfileId: 'character', referenceImageUrl: '/outputs/fake.png' }] };
  const plan = await service.prepare(input, actor);
  assert.equal(plan.assets[0].publicUrl, '/outputs/shared-character.png');
  assert.equal(plan.attributions[0].characterProfileId, 'character');
  state.revoked = true;
  await assert.rejects(service.prepare(input, actor), /revoked/);
});
test('Character and Look cannot coexist; byte changes after preparation fail', async () => {
  const { service, state, input } = setup();
  await assert.rejects(service.prepare({ inputMode: 'multimodal_reference', references: [
    { role: 'reference_image', purpose: 'character_reference' },
    { role: 'reference_image', purpose: 'look_sheet_upload' },
  ] }, actor), { code: 'video_reference_identity_conflict' });
  const plan = await service.prepare(input, actor);
  state.hash = 'changed';
  await assert.rejects(service.resolve(plan, { providerId: 'gemini' }, actor, {}), { code: 'video_reference_content_invalid' });
});

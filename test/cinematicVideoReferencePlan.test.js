import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { CinematicVideoReferencePlanService } from '../server/domain/cinematic/CinematicVideoReferencePlanService.js';
import { loadVideoReferenceAssetContent } from '../server/domain/assets/VideoReferenceAssetContent.js';
import { CharacterLookService } from '../server/domain/character-profiles/CharacterLookService.js';
import { CinematicApplicationService } from '../server/domain/cinematic/CinematicApplicationService.js';
import { createSingleCharacterCinematicProject } from './fixtures/cinematic/cinematicProjectFixtures.js';
import { normalizeVideoReferences, fingerprintVideoReferencePlan, sanitizeVideoReferences } from '../server/domain/generation/VideoReferencePlan.js';

function fixture() {
  const calls = [];
  const service = new CinematicVideoReferencePlanService({ lookService: {
    async resolveApprovedSheetReference(profile, look, version, actor) {
      calls.push({ profile, look, version, actor });
      return { asset: { id: `asset_${profile}`, publicUrl: `/outputs/${profile}.png`, contentHash: `hash_${profile}` },
        sourceFingerprint: `fingerprint_${version}`, previewUrl: `/api/looks/${version}` };
    }
  } });
  const input = {
    project: { castAssignments: ['a', 'b', 'unused'].map(id => ({ id, characterProfileId: id,
      active: true, identityReady: true, storyRole: `role ${id}`, looks: [{ id: `look_${id}`,
        mode: 'character_look', locked: true, name: `Costume ${id}`,
        characterLookId: `look_${id}`, characterLookVersionId: `version_${id}` }] })) },
    scene: { castAssignmentIds: ['a', 'b'], wardrobeLookIds: ['look_a', 'look_b'] },
    shot: { castAssignmentIds: ['b', 'a', 'b'], wardrobeLookIds: ['look_a', 'look_b'] },
    source: { assetId: 'board', assetVersionId: 'board', sourceFingerprint: 'board_hash', imageUrl: '/outputs/board.png' },
    model: { supportsCinematicLookReferences: true, inputModes: ['multimodal_reference'], referenceImageLimit: 9 },
    actorContext: { userId: 'owner' }, mode: 'storyboard_and_looks'
  };
  return { input, service, calls };
}

test('dynamic references retain Shot order, deduplicate cast and exclude unused assignments', async () => {
  const { input, service, calls } = fixture();
  const result = await service.prepare(input);
  assert.equal(result.inputMode, 'multimodal_reference');
  assert.deepEqual(result.references.map(item => item.assetId), ['board', 'asset_b', 'asset_a']);
  assert.deepEqual(result.references.map(item => item.role), Array(3).fill('reference_image'));
  assert.deepEqual(result.references.slice(1).map(item => item.roleName), ['role b', 'role a']);
  assert.deepEqual(calls.map(item => item.version), ['version_b', 'version_a']);
  assert.ok(calls.every(item => item.actor === input.actorContext));
  const normalized = normalizeVideoReferences(result);
  assert.equal(normalized[1].characterLookVersionId, 'version_b');
  assert.doesNotMatch(JSON.stringify(sanitizeVideoReferences(normalized)), /outputs|\/api\//);
  assert.notEqual(fingerprintVideoReferencePlan(normalized, result.inputMode),
    fingerprintVideoReferencePlan([...normalized].reverse(), result.inputMode));
});

test('Cinematic quote and attempt use the same server-derived reference set and provider prompt', async () => {
  const { input: referenceFixture, service: resolver } = fixture();
  let project = createSingleCharacterCinematicProject();
  const scene = project.scenes[0];
  const shot = scene.shots[0];
  const look = project.castAssignments[0].looks[0];
  Object.assign(look, { mode: 'character_look', locked: true, characterLookId: 'approved_look', characterLookVersionId: 'approved_version' });
  const originalSource = structuredClone(shot.approvedStoryboardSource);
  const requests = [];
  const service = new CinematicApplicationService({
    repository: { async findForActor() { return structuredClone(project); },
      async mutateForActor(_id, _actor, update) { project = update(structuredClone(project)); return project; } },
    lookService: resolver.lookService,
    videoCapabilities: { resolve: () => referenceFixture.model },
    videoGenerationService: { async quote(request) { requests.push(request); return { estimate: { estimateId: 'test_quote' } }; },
      async submit(request) { requests.push(request); return { id: 'test_task', status: 'provider_queued', modelId: request.modelId, providerId: request.providerId }; } },
    providerTaskRepository: { async findForActor() { return null; } }
  });
  const packet = service.videoPacketCompiler.compile({ project, scene, shot });
  const input = { expectedVersion: project.version, expectedShotVersion: shot.version,
    sourceFingerprint: originalSource.sourceFingerprint, videoPacketFingerprint: packet.packetFingerprint,
    prompt: packet.providerIndependentPrompt, providerId: 'modelark', modelId: 'dreamina-seedance-2-5-260628',
    resolution: '480p', durationSeconds: 6, audioMode: 'none', referenceMode: 'storyboard_and_looks' };
  const quote = await service.quoteVideoAttempt(project.id, scene.id, shot.id, input, referenceFixture.actorContext);
  assert.equal(quote.referenceSummary.length, 2);
  assert.equal(quote.referenceSummary[0].purpose, 'storyboard_opening');
  assert.equal(quote.referenceSummary[1].purpose, 'character_look');
  assert.equal(quote.renderedPrompt, requests[0].prompt);
  assert.equal(quote.referenceMode, 'storyboard_and_looks');
  await service.createVideoAttempt(project.id, scene.id, shot.id, { ...input,
    estimateId: 'test_quote', idempotencyKey: 'reference-facade-attempt' }, referenceFixture.actorContext);
  assert.deepEqual(requests[0].references, requests[1].references);
  assert.equal(requests[0].prompt, requests[1].prompt);
  assert.equal(requests[1].inputMode, 'multimodal_reference');
  assert.deepEqual(project.scenes[0].shots[0].approvedStoryboardSource, originalSource);
});

test('single first-frame mode remains unchanged and never loads a Look', async () => {
  const { input, service, calls } = fixture();
  const result = await service.prepare({ ...input, mode: undefined, model: null });
  assert.equal(result.inputMode, 'image_to_video');
  assert.equal(result.references.length, 1);
  assert.equal(result.references[0].role, 'first_frame');
  assert.equal(calls.length, 0);
});

test('scene selections are the fallback when the Shot has no overrides', async () => {
  const { input, service } = fixture();
  input.shot = {};
  const result = await service.prepare(input);
  assert.deepEqual(result.references.slice(1).map(item => item.castAssignmentId), ['a', 'b']);
});

test('unsupported mode and reference overflow fail before loading media', async () => {
  const { input, service, calls } = fixture();
  await assert.rejects(service.prepare({ ...input, model: {} }), { code: 'cinematic_video_look_references_unsupported' });
  await assert.rejects(service.prepare({ ...input, model: { ...input.model, referenceImageLimit: 2 } }), { code: 'cinematic_video_reference_limit' });
  assert.equal(calls.length, 0);
});

test('missing, ambiguous or inactive approved Looks are not silently dropped', async () => {
  for (const change of [
    input => { input.project.castAssignments[1].looks = []; },
    input => { input.project.castAssignments[1].looks[0].locked = false; },
    input => { input.project.castAssignments[1].looks.push({ ...input.project.castAssignments[1].looks[0] }); }
  ]) {
    const { input, service } = fixture();
    change(input);
    await assert.rejects(service.prepare(input), { code: 'cinematic_video_reference_look_required' });
  }
  const { input, service } = fixture();
  input.project.castAssignments[1].active = false;
  await assert.rejects(service.prepare(input), { code: 'cinematic_video_reference_cast_unavailable' });
});

test('legacy approved sheets are probed without rewriting assets and reject changed bytes or traversal', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'look-video-reference-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const bytes = await sharp({ create: { width: 512, height: 512, channels: 3, background: '#888888' } }).png().toBuffer();
  await fs.writeFile(path.join(directory, 'sheet.png'), bytes);
  const asset = { id: 'sheet', ownerUserId: 'owner', storageKey: 'sheet.png', assetType: 'character_look_sheet', metadata: {}, width: null };
  const snapshot = structuredClone(asset);
  const resolved = await loadVideoReferenceAssetContent(asset, { outputsDirectory: directory });
  assert.equal(resolved.width, 512);
  assert.equal(resolved.mimeType, 'image/png');
  assert.deepEqual(resolved.bytes, bytes);
  const service = new CharacterLookService({ outputsDirectory: directory, assetRepository: {
    async findByIdForOwner(id, owner) { return id === 'sheet' && owner === 'owner' ? asset : null; }
  } });
  service.resolveApprovedVersion = async () => ({ version: { approvedSheetAsset: { assetId: 'sheet' } } });
  const reference = await service.resolveApprovedSheetReference('character', 'look', 'v1', { userId: 'owner' });
  assert.equal(reference.asset.contentHash, resolved.contentHash);
  assert.deepEqual(asset, snapshot);
  await assert.rejects(service.resolveApprovedSheetReference('character', 'look', 'v1', { userId: 'other' }), { code: 'character_look_sheet_unavailable' });
  await assert.rejects(loadVideoReferenceAssetContent({ ...asset, contentHash: 'changed' }, { outputsDirectory: directory }), { code: 'video_reference_content_invalid' });
  await assert.rejects(loadVideoReferenceAssetContent({ ...asset, storageKey: '../sheet.png' }, { outputsDirectory: directory }), { code: 'video_reference_content_invalid' });
});

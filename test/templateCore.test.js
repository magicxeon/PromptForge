import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { TemplateCoreService } from '../server/domain/templates/TemplateCoreService.js';
import { TemplateRepository } from '../server/repositories/templates/TemplateRepository.js';
import { TemplateVersionRepository } from '../server/repositories/templates/TemplateVersionRepository.js';
import { TemplateUseSessionRepository } from '../server/repositories/templates/TemplateUseSessionRepository.js';
import { TemplateUsageEventRepository } from '../server/repositories/templates/TemplateUsageEventRepository.js';
import {
  validateTemplateReplacements
} from '../server/domain/templates/templateContracts.js';

const actor = { userId: 'usr_creator', username: 'creator', role: 'creator' };
const viewer = { userId: 'usr_viewer', username: 'viewer', role: 'user' };

test('Template Core publishes an immutable version and pins actor-scoped use sessions', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'mpf-template-core-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const service = new TemplateCoreService({
    templateRepository: new TemplateRepository({ templatesFile: path.join(directory, 'templates.json') }),
    versionRepository: new TemplateVersionRepository({ versionsFile: path.join(directory, 'versions.json') }),
    sessionRepository: new TemplateUseSessionRepository({ sessionsFile: path.join(directory, 'sessions.json') }),
    usageEventRepository: new TemplateUsageEventRepository({ eventsFile: path.join(directory, 'events.json') })
  });
  const snapshot = createSnapshot();
  const published = await service.publishFromGeneration({
    title: 'Fashion cafe',
    promptVisibility: 'remix_only',
    visibility: 'public',
    executionSnapshot: snapshot,
    pricing: { accessCredits: 7 },
    preview: { imageUrl: '/outputs/job_source.png' },
    sourceGenerationId: 'job_source'
  }, actor);

  assert.equal(published.version.versionNumber, 1);
  assert.equal(published.template.currentVersionId, published.version.id);
  assert.equal(published.template.pricing.accessCredits, 7);
  assert.equal(published.template.pricing.creatorShareBps, 7500);
  assert.equal(published.template.pricing.platformShareBps, 2500);

  const handoff = await service.createUseSession({
    templateId: published.template.id,
    sourceCommunityPostId: 'post_1'
  }, viewer);
  assert.equal(handoff.sceneTemplateSnapshot.finalPromptSnapshot, '');
  assert.equal(handoff.sceneTemplateSnapshot.additionalDirectionSnapshot, undefined);
  assert.equal(
    handoff.sceneTemplateSnapshot.referenceSlotMapping.face_reference.value,
    undefined
  );
  assert.equal(handoff.useSession.sourceCommunityPostId, 'post_1');
  assert.equal(handoff.pricing.accessCredits, 7);

  const resolved = await service.resolveSession(handoff.useSession.id, viewer, {
    environment: { id: 'environment.rooftop', value: 'city rooftop' }
  });
  assert.equal(resolved.executionSnapshot.finalPromptSnapshot, snapshot.finalPromptSnapshot);
  assert.equal(
    resolved.executionSnapshot.additionalDirectionSnapshot,
    'private creator direction'
  );
  assert.equal(
    resolved.executionSnapshot.structuredSelectionsSnapshot.Environment.value,
    'city rooftop'
  );
  assert.deepEqual(resolved.baselineReference, {
    imageUrl: '/outputs/job_source.png',
    sourceGenerationId: 'job_source'
  });
  const pricing = await service.resolvePricing(handoff.useSession.id, viewer);
  assert.equal(pricing.executionReferenceCount, 1);
  await service.attachGeneration(handoff.useSession.id, viewer, 'job_result_1');
  const firstUsage = await service.recordSuccessfulUse({
    sessionId: handoff.useSession.id,
    jobId: 'job_result_1',
    pricingSnapshot: {
      breakdown: { templateUsageCredits: 7 }
    }
  }, viewer);
  const duplicateUsage = await service.recordSuccessfulUse({
    sessionId: handoff.useSession.id,
    jobId: 'job_result_1',
    pricingSnapshot: {
      breakdown: { templateUsageCredits: 7 }
    }
  }, viewer);
  assert.equal(duplicateUsage.id, firstUsage.id);
  assert.equal(firstUsage.creatorEarningCredits, 5.25);
  assert.equal(firstUsage.platformRevenueCredits, 1.75);
  assert.equal(firstUsage.creatorUserId, actor.userId);
  assert.equal(firstUsage.ownerUserId, viewer.userId);
  assert.deepEqual(firstUsage.replacementSummary, []);

  const secondSnapshot = createSnapshot();
  secondSnapshot.finalPromptSnapshot = 'A revised fashion portrait in a gallery';
  const republished = await service.publishFromGeneration({
    templateId: published.template.id,
    title: 'Fashion gallery',
    promptVisibility: 'full',
    visibility: 'public',
    executionSnapshot: secondSnapshot,
    pricing: { accessCredits: 9 },
    preview: { imageUrl: '/outputs/job_source_v2.png' }
  }, actor);
  assert.equal(republished.version.versionNumber, 2);
  assert.notEqual(republished.version.id, published.version.id);
  const fullPromptHandoff = await service.createUseSession({
    templateId: published.template.id,
    sourceCommunityPostId: 'post_2'
  }, viewer);
  assert.equal(
    fullPromptHandoff.sceneTemplateSnapshot.additionalDirectionSnapshot,
    undefined
  );

  const pinnedSession = await service.resolveSession(handoff.useSession.id, viewer, {
    environment: { id: 'environment.cafe', value: 'original cafe' }
  });
  assert.equal(pinnedSession.version.id, published.version.id);
  assert.equal(pinnedSession.executionSnapshot.finalPromptSnapshot, snapshot.finalPromptSnapshot);
  assert.deepEqual(pinnedSession.replacementSummary, [{
    inputId: 'environment',
    inputType: 'select_option',
    supplied: true
  }, {
    inputId: 'face_reference',
    inputType: 'reference_image',
    supplied: false
  }]);

  await service.archiveTemplate(published.template.id, actor);
  assert.equal((await service.listPublished()).length, 0);
  assert.equal(
    (await service.resolveSession(handoff.useSession.id, viewer, {
      environment: { id: 'environment.cafe', value: 'archived but pinned' }
    })).version.id,
    published.version.id
  );

  await assert.rejects(
    () => service.resolveSession(handoff.useSession.id, actor, {
      environment: { value: 'owner must not consume another actor session' }
    }),
    error => error.code === 'template_use_session_not_found'
  );
  await assert.rejects(
    () => service.resolveSession(handoff.useSession.id, viewer, { locked_face: 'changed' }),
    error => error.code === 'template_replacement_not_allowed'
  );
  await assert.rejects(
    () => service.resolveSession(handoff.useSession.id, viewer, {
      environment: { id: 'environment.unknown', value: 'unknown place' }
    }),
    error => error.code === 'template_replacement_option_invalid'
  );
});

test('Template Core accepts either face or character for a shared identity requirement', () => {
  const schema = {
    inputs: [{
      id: 'face_reference',
      type: 'reference_image',
      sourceFieldName: 'face_reference',
      required: true,
      replacementPolicy: 'replaceable'
    }, {
      id: 'character_reference',
      type: 'reference_image',
      sourceFieldName: 'character_reference',
      required: true,
      replacementPolicy: 'replaceable'
    }, {
      id: 'outfit_front',
      type: 'reference_image',
      sourceFieldName: 'outfit_front',
      required: true,
      replacementPolicy: 'replaceable'
    }]
  };

  assert.deepEqual(validateTemplateReplacements({
    character_reference: '/outputs/character.png',
    outfit_front: '/outputs/outfit-front.png'
  }, schema), {
    character_reference: '/outputs/character.png',
    outfit_front: '/outputs/outfit-front.png'
  });
});

function createSnapshot() {
  return {
    sceneTemplateVersion: 1,
    authoringMode: 'guided',
    finalPromptSnapshot: 'A fashion portrait in a cafe',
    structuredSelectionsSnapshot: {
      Environment: { id: 'environment.cafe', value: 'bright cafe' },
      'Face Shape': { id: 'face.oval', value: 'oval face' }
    },
    manualPromptSnapshot: '',
    additionalDirectionSnapshot: 'private creator direction',
    referenceSlotMapping: {
      face_reference: {
        required: false,
        sharePolicy: 'required_user_replacement',
        value: '/outputs/private-face.png'
      }
    },
    replaceableVariables: [{
      id: 'environment',
      label: 'Environment',
      type: 'select_option',
      sourceFieldName: 'Environment',
      replacementPolicy: 'replaceable',
      allowedOptionIds: ['environment.cafe', 'environment.rooftop']
    }, {
      id: 'locked_face',
      label: 'Face',
      type: 'select_option',
      sourceFieldName: 'Face Shape',
      replacementPolicy: 'locked'
    }, {
      id: 'face_reference',
      label: 'Face Reference',
      type: 'reference_image',
      sourceFieldName: 'face_reference',
      replacementPolicy: 'replaceable'
    }],
    providerModelSnapshot: { providerId: 'gemini', modelId: 'gemini-3.1-flash-lite-image' },
    generationSettingsSnapshot: { aspectRatio: '6:8', resolution: '1K' }
  };
}

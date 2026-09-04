import { describe, expect, it } from 'vitest';
import {
  cinematicAuthoringManifestSchema,
  cinematicDataLineageSchema,
  cinematicProjectSchema,
  cinematicProduceShotContextSchema,
  cinematicStoryPlanProposalSchema
} from './cinematicSchemas';

describe('Cinematic core engine response contracts', () => {
  it('parses additive unified Story Plan workflow and bounded repair evidence', () => {
    const result = cinematicStoryPlanProposalSchema.parse({
      proposalId: 'proposal-1', operation: 'cinematic_story_plan_generate', mode: 'generate',
      status: 'blocked', expectedProjectVersion: 2, storySourceVersionId: 'source-1',
      plan: null, provenance: null, billingStatus: 'qualification_no_charge',
      workflow: {
        contractVersion: 'cinematic-story-plan-workflow-v1', status: 'blocked',
        stages: [{ id: 'source_preflight', status: 'blocked', issueCount: 1, repairCount: 0 }],
        repairRoundCount: 1,
        initialFindings: [{
          code: 'non_visual_action', severity: 'warning', repairable: true,
          sceneId: 'scene-1', sceneTitle: 'Cafe', shotId: 'shot-1', shotTitle: 'Hands',
          fieldPaths: ['shot.subjectAction'], summary: 'Action is not visible.',
          recommendation: 'Use one visible gesture.'
        }],
        repairs: [{
          round: 1, sceneIndex: 0, shotIndex: 0, sceneTitle: 'Cafe', shotTitle: 'Hands',
          fieldPath: 'shot.subjectAction', before: 'She waits.', after: 'Her hand tightens.',
          reasonCodes: ['non_visual_action']
        }],
        repairRounds: [{
          round: 1, status: 'accepted', findingCountBefore: 1, findingCountAfter: 0,
          repairableCountBefore: 1, repairableCountAfter: 0, acceptedChangeCount: 1,
          provenance: {
            provider: 'openai', model: 'test-model', responseId: null,
            recipeId: 'story-plan', recipeVersion: 5, recipeFingerprint: '1234567890abcdef'
          }
        }],
        remainingFindings: []
      }
    });
    expect(result.workflow?.repairs[0]?.after).toBe('Her hand tightens.');
  });

  it('parses sanitized visual repair timeout evidence without provider provenance', () => {
    const result = cinematicStoryPlanProposalSchema.parse({
      proposalId: 'proposal-timeout', operation: 'cinematic_story_plan_generate', mode: 'generate',
      status: 'blocked', expectedProjectVersion: 2, storySourceVersionId: 'source-1',
      plan: null, provenance: null, billingStatus: 'qualification_no_charge',
      workflow: {
        contractVersion: 'cinematic-story-plan-workflow-v1', status: 'ready_with_warnings',
        stages: [{ id: 'visual_repair', status: 'stopped', issueCount: 1, repairCount: 0 }],
        repairRoundCount: 1, initialFindings: [], repairs: [], remainingFindings: [],
        repairRounds: [{
          round: 1, status: 'provider_timeout', findingCountBefore: 1, findingCountAfter: 1,
          repairableCountBefore: 1, repairableCountAfter: 1, acceptedChangeCount: 0,
          provenance: null,
          failure: {
            code: 'cinematic_story_plan_repair_timeout',
            message: 'Visual repair exceeded its time budget.',
            retryable: true, stage: 'visual_repair', timeoutMs: 90_000
          }
        }]
      }
    });

    expect(result.workflow?.repairRounds[0]?.status).toBe('provider_timeout');
    expect(result.workflow?.repairRounds[0]?.failure?.timeoutMs).toBe(90_000);
  });

  it('accepts the canonical authoring state shape and rejects the obsolete authority key', () => {
    const state = {
      inferenceMode: 'explicit',
      fieldStates: {
        'scene:scene-1.title': {
          source: 'user', status: 'current', locked: true,
          sourceRevision: 'cineplan-1', recipe: null,
          updatedAt: '2026-09-01T00:00:00.000Z', updatedByActorId: 'usr-1'
        }
      }
    };
    expect(cinematicProjectSchema.shape.authoringState.safeParse(state).success).toBe(true);
    expect(cinematicProjectSchema.shape.authoringState.safeParse({
      inferenceMode: 'explicit',
      fieldStates: { 'scene:scene-1.title': { authority: 'user', status: 'current', locked: true } }
    }).success).toBe(false);
  });

  it('parses the public manifest projection without exposing dependency internals', () => {
    const result = cinematicAuthoringManifestSchema.parse({
      schemaVersion: 1,
      id: 'cinematic-authoring-field-manifest',
      version: 1,
      fingerprint: '1234567890abcdef',
      fields: [{
        path: 'scene.title', group: 'scene', visibility: 'simple', requirement: 'required',
        authorities: ['user', 'ai'], consumers: ['storyboard'], localizationKey: 'cinematic.director.sceneTitle'
      }],
      readiness: { storyboard: { requiredPaths: ['scene.title'] } }
    });
    expect(result.fields[0]?.path).toBe('scene.title');
    expect(result).not.toHaveProperty('dependencies');
  });

  it('parses a sanitized, read-only lineage report', () => {
    const result = cinematicDataLineageSchema.parse({
      schemaVersion: 1,
      reportVersion: 'cinematic-lineage-v1',
      fingerprint: 'fedcba0987654321',
      project: {
        id: 'project-1', version: 1, activeStage: 'story-plan', status: 'planning',
        aspectRatio: '9:16', durationTargetMs: 30000
      },
      setup: { activeStorySourceVersionId: 'source-1', storySourceVersion: 1, status: 'current' },
      storyRoles: [], castAssignments: [], lookBindings: [], storyPlan: null, beats: [], scenes: [], shots: [],
      storyboardContracts: [], approvedStoryboardSources: [], videoPackets: [], approvedVideoSources: [],
      timelineEntries: [], exports: [], findings: []
    });
    expect(result.fingerprint).toBe('fedcba0987654321');
    expect(JSON.stringify(result)).not.toContain('storyBrief');
  });

  it('parses the server-owned Produce packet and its immutable fingerprint', () => {
    const result = cinematicProduceShotContextSchema.parse({
      projectId: 'project-1', projectVersion: 2, sceneId: 'scene-1', shotId: 'shot-1', shotVersion: 1,
      approvedStoryboardSource: null, generationEligible: false,
      blockingReason: 'cinematic_storyboard_source_required',
      videoPacket: {
        contractVersion: 'cinematic-video-packet-v1',
        projectId: 'project-1', projectVersion: 2, sceneId: 'scene-1', sceneVersion: 1,
        shotId: 'shot-1', shotVersion: 1, keyframeContractFingerprint: 'keyframe-1',
        approvedKeyframeContractFingerprint: null, approvedStoryboardSourceFingerprint: null,
        timing: { plannedDurationMs: 4000, estimatedActionDurationMs: 3000 },
        referenceStrategy: {
          mode: 'unavailable', firstFrameAssetVersionId: null, firstFrameSourceFingerprint: null,
          lastFrameAssetVersionId: null, additionalReferenceAssetIds: []
        },
        authority: { characters: [], looks: [] },
        motion: {
          visibleStart: 'Nara pauses.', primaryAction: 'Nara turns.', visibleEnd: 'Nara faces the door.',
          cameraMovement: 'locked', blocking: 'stable axis', screenDirection: 'left to right'
        },
        performance: { emotionalTarget: 'hesitant', direction: 'restrained', observableCue: 'one breath', gaze: 'door' },
        environment: { location: 'cafe', time: 'evening', lighting: 'practical', environment: 'dry', propContinuity: '' },
        continuity: { entry: 'still', exit: 'turned', transitionToNext: 'cut', notes: [] },
        audio: { intent: 'room tone', dialogueCues: [], audioCues: [] },
        authorDirection: '', prohibitions: ['Keep identity.'],
        provenance: { policyId: 'cinematic-video-packet-policy', policyVersion: 1 },
        findings: [{ severity: 'blocking', code: 'cinematic_storyboard_source_required', fieldPath: 'shot.approvedStoryboardSource' }],
        packetFingerprint: 'packet-1', providerIndependentPrompt: 'CINEMATIC VIDEO EXECUTION PACKET'
      },
      directingContract: {
        visibleMoment: 'Nara pauses.', subjectAction: 'Nara turns.', emotionalTarget: 'hesitant',
        performanceCue: 'one breath', continuityEntry: 'still', continuityExit: 'turned',
        transitionToNext: 'cut', dialogueCues: [], audioCues: [], characterAliases: []
      },
      videoAttempts: [], timelineDependencyStatus: 'current'
    });
    expect(result.videoPacket.packetFingerprint).toBe('packet-1');
  });
});

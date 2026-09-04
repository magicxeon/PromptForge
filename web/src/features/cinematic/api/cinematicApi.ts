import type { z } from 'zod';
import {
  cinematicArchiveResponseSchema,
  cinematicProjectSchema,
  cinematicProjectListResponseSchema,
  cinematicProjectSummarySchema,
  cinematicProduceShotContextSchema,
  cinematicVideoAttemptResponseSchema,
  cinematicVideoQuoteSchema,
  cinematicStoryEnhancementSchema,
  cinematicWardrobeSuggestionSchema,
  cinematicStoryPlanProposalSchema,
  cinematicStoryPlanLiveProgressSchema,
  cinematicSceneDirectionProposalSchema,
  cinematicStoryboardGenerationContextSchema,
  cinematicStoryboardBatchResponseSchema,
  cinematicAuthoringManifestSchema,
  cinematicDataLineageSchema
} from '../schemas/cinematicSchemas';
import { apiRequest, apiRequestWithProgress } from '../../../lib/api/apiClient';
import type { CinematicSetupDraft, CinematicStoryPlanLiveProgress } from '../schemas/cinematicSchemas';
import type { CinematicStage } from '../cinematicStages';
import { videoCapabilityCatalogSchema } from '../../generation/schemas/videoGenerationSchemas';
import {
  generationPayload,
  type GenerationRequestDraft
} from '../../generation/api/generationApi';

export const cinematicApiPaths = {
  projects: '/api/cinematic/projects',
  project: (projectId: string) => `/api/cinematic/projects/${encodeURIComponent(projectId)}`
} as const;

export const cinematicApiSchemas = {
  project: cinematicProjectSchema,
  projectList: cinematicProjectListResponseSchema
} as const;

export type CinematicProjectSummary = z.infer<typeof cinematicProjectSummarySchema>;
export type CinematicProjectListResponse = z.infer<typeof cinematicProjectListResponseSchema>;

export function listCinematicProjects() {
  return apiRequest(cinematicApiPaths.projects, { schema: cinematicProjectListResponseSchema });
}

export function getCinematicVideoCapabilityCatalog() {
  return apiRequest('/api/cinematic/video-capabilities', {
    schema: videoCapabilityCatalogSchema,
    cache: 'no-store'
  });
}

export function getCinematicProject(projectId: string) {
  return apiRequest(cinematicApiPaths.project(projectId), { schema: cinematicProjectSchema });
}

export function getCinematicAuthoringManifest() {
  return apiRequest('/api/cinematic/authoring-manifest', {
    schema: cinematicAuthoringManifestSchema,
    cache: 'no-store'
  });
}

export function getCinematicDataLineage(projectId: string, scope: { sceneId?: string; shotId?: string } = {}) {
  const query = new URLSearchParams();
  if (scope.sceneId) query.set('sceneId', scope.sceneId);
  if (scope.shotId) query.set('shotId', scope.shotId);
  const suffix = query.size ? `?${query.toString()}` : '';
  return apiRequest(`${cinematicApiPaths.project(projectId)}/data-lineage${suffix}`, {
    schema: cinematicDataLineageSchema,
    cache: 'no-store'
  });
}

export function createCinematicProject(draft: CinematicSetupDraft) {
  return apiRequest(cinematicApiPaths.projects, {
    method: 'POST',
    body: draft,
    schema: cinematicProjectSchema
  });
}

export function updateCinematicSetup(projectId: string, draft: CinematicSetupDraft, expectedVersion: number) {
  return apiRequest(`${cinematicApiPaths.project(projectId)}/setup`, {
    method: 'PATCH',
    body: { ...draft, expectedVersion },
    schema: cinematicProjectSchema
  });
}

export function enhanceCinematicStory(draft: CinematicSetupDraft) {
  return apiRequest('/api/cinematic/story-enhancements', {
    method: 'POST',
    body: draft,
    schema: cinematicStoryEnhancementSchema
  });
}

export function suggestCinematicWardrobe(projectId: string, assignmentId: string) {
  return apiRequest(
    `${cinematicApiPaths.project(projectId)}/cast/${encodeURIComponent(assignmentId)}/wardrobe-suggestion`,
    { method: 'POST', schema: cinematicWardrobeSuggestionSchema }
  );
}

export function updateCinematicStage(projectId: string, stage: CinematicStage, expectedVersion: number) {
  return apiRequest(`${cinematicApiPaths.project(projectId)}/stage`, {
    method: 'PUT',
    body: { stage, expectedVersion },
    schema: cinematicProjectSchema
  });
}

export function upsertCinematicCast(projectId: string, assignmentId: string, input: {
  expectedVersion: number;
  characterProfileId: string;
  characterProfileVersionId: string;
  displayName: string;
  storyImportance: 'protagonist' | 'supporting';
  storyRole?: string;
  storyRoleSlotId?: string | null;
  objective?: string;
  motivation?: string;
  pressure?: string;
  personalityTraits?: string[];
  emotionalBaseline?: string;
  dialogueStyle?: string;
  performanceDirection?: string;
}) {
  return apiRequest(`${cinematicApiPaths.project(projectId)}/cast/${encodeURIComponent(assignmentId)}`, {
    method: 'PUT', body: input, schema: cinematicProjectSchema
  });
}

export function removeCinematicCast(projectId: string, assignmentId: string, expectedVersion: number) {
  return apiRequest(`${cinematicApiPaths.project(projectId)}/cast/${encodeURIComponent(assignmentId)}`, {
    method: 'DELETE', body: { expectedVersion }, schema: cinematicProjectSchema
  });
}

export function upsertCinematicWardrobeLook(projectId: string, assignmentId: string, lookId: string, input: {
  expectedVersion: number;
  name: string;
  mode: 'character_default' | 'uploaded' | 'character_look';
  characterLookId?: string;
  characterLookVersionId?: string;
  assetIds?: string[];
  garmentSummary?: string;
  accessorySummary?: string;
  coverage?: 'front' | 'front_back' | 'multi_view';
  sceneIds?: string[];
  locked?: boolean;
}) {
  return apiRequest(`${cinematicApiPaths.project(projectId)}/cast/${encodeURIComponent(assignmentId)}/looks/${encodeURIComponent(lookId)}`, {
    method: 'PUT', body: input, schema: cinematicProjectSchema
  });
}

export function archiveCinematicProject(projectId: string, expectedVersion: number) {
  return apiRequest(cinematicApiPaths.project(projectId), {
    method: 'DELETE',
    body: { expectedVersion },
    schema: cinematicArchiveResponseSchema
  });
}

export type StoryPlanInput = {
  contractVersion?: 'story-plan-v2' | 'story-plan-v3';
  authoringMode?: 'simple' | 'advanced';
  expectedVersion: number;
  parentVersionId?: string | null;
  objective?: string;
  logline?: string;
  emotionalArc?: string;
  beats?: unknown[];
  warnings?: string[];
  approved?: boolean;
  source?: 'manual' | 'generated';
  aiFieldKeys?: string[];
  warningsAcknowledged?: boolean;
  scenes: Array<Record<string, unknown>>;
};

export function saveCinematicStoryPlan(projectId: string, input: StoryPlanInput) {
  return apiRequest(`${cinematicApiPaths.project(projectId)}/story-plan`, {
    method: 'PUT', body: input, schema: cinematicProjectSchema
  });
}

export function generateCinematicStoryPlan(projectId: string, input: {
  mode?: 'generate' | 'review_current';
  sourceResolution?: 'story_brief' | 'creative_direction' | null;
} = {}, onProgress?: (progress: CinematicStoryPlanLiveProgress) => void) {
  if (onProgress) {
    return apiRequestWithProgress(`${cinematicApiPaths.project(projectId)}/story-plan/proposals`, {
      method: 'POST', body: input,
      schema: cinematicStoryPlanProposalSchema,
      progressSchema: cinematicStoryPlanLiveProgressSchema,
      onProgress,
      cache: 'no-store'
    });
  }
  return apiRequest(`${cinematicApiPaths.project(projectId)}/story-plan/proposals`, {
    method: 'POST', body: input, schema: cinematicStoryPlanProposalSchema, cache: 'no-store'
  });
}

export function generateCinematicSceneDirection(projectId: string, sceneId: string, input: {
  expectedVersion: number;
  direction?: string;
  sceneDraft?: unknown;
  requestedFieldPaths?: string[];
  lockedFieldPaths?: string[];
}) {
  return apiRequest(`${cinematicApiPaths.project(projectId)}/scenes/${encodeURIComponent(sceneId)}/direction-proposals`, {
    method: 'POST', body: input, schema: cinematicSceneDirectionProposalSchema, cache: 'no-store'
  });
}

export function approveCinematicStoryboardSource(projectId: string, shotId: string, input: {
  expectedVersion: number;
  expectedShotVersion: number;
  jobId: string;
  idempotencyKey: string;
}) {
  return apiRequest(`${cinematicApiPaths.project(projectId)}/shots/${encodeURIComponent(shotId)}/storyboard-source`, {
    method: 'PUT', body: input, schema: cinematicProduceShotContextSchema
  });
}

export function getCinematicStoryboardGenerationContext(projectId: string, sceneId: string, shotId: string) {
  return apiRequest(`${cinematicApiPaths.project(projectId)}/scenes/${encodeURIComponent(sceneId)}/shots/${encodeURIComponent(shotId)}/storyboard-generation-context`, {
    schema: cinematicStoryboardGenerationContextSchema,
    cache: 'no-store'
  });
}

export function submitCinematicStoryboardBatch(projectId: string, input: {
  expectedVersion: number;
  idempotencyKey: string;
  operations: Array<{
    operationId: string;
    sceneId: string;
    shotId: string;
    expectedShotVersion: number;
    keyframeContractFingerprint: string;
    estimateId: string;
    draft: GenerationRequestDraft;
  }>;
}) {
  return apiRequest(`${cinematicApiPaths.project(projectId)}/storyboard-generation-batches`, {
    method: 'POST',
    body: {
      expectedVersion: input.expectedVersion,
      idempotencyKey: input.idempotencyKey,
      operations: input.operations.map(operation => ({
        operationId: operation.operationId,
        sceneId: operation.sceneId,
        shotId: operation.shotId,
        expectedShotVersion: operation.expectedShotVersion,
        keyframeContractFingerprint: operation.keyframeContractFingerprint,
        estimateId: operation.estimateId,
        generationRequest: generationPayload(operation.draft, {
          estimateId: operation.estimateId,
          requestId: `${input.idempotencyKey}:${operation.operationId}`
        })
      }))
    },
    schema: cinematicStoryboardBatchResponseSchema
  });
}

export function getCinematicProduceContext(projectId: string, sceneId: string, shotId: string) {
  return apiRequest(`${cinematicApiPaths.project(projectId)}/scenes/${encodeURIComponent(sceneId)}/shots/${encodeURIComponent(shotId)}/produce-context`, {
    schema: cinematicProduceShotContextSchema
  });
}

export type CinematicVideoAttemptInput = {
  expectedVersion: number;
  expectedShotVersion: number;
  sourceFingerprint: string;
  videoPacketFingerprint: string;
  providerId: string;
  modelId: string;
  prompt: string;
  aspectRatio: string;
  resolution: string;
  durationSeconds: number;
  audioMode: 'none' | 'generated';
  requestFingerprint?: string;
};

function cinematicShotVideoPath(projectId: string, sceneId: string, shotId: string) {
  return `${cinematicApiPaths.project(projectId)}/scenes/${encodeURIComponent(sceneId)}/shots/${encodeURIComponent(shotId)}`;
}

export function quoteCinematicVideoAttempt(projectId: string, sceneId: string, shotId: string, input: CinematicVideoAttemptInput) {
  return apiRequest(`${cinematicShotVideoPath(projectId, sceneId, shotId)}/video-quote`, {
    method: 'POST', body: input, schema: cinematicVideoQuoteSchema
  });
}

export function createCinematicVideoAttempt(projectId: string, sceneId: string, shotId: string, input: CinematicVideoAttemptInput & {
  estimateId: string;
  idempotencyKey: string;
}) {
  return apiRequest(`${cinematicShotVideoPath(projectId, sceneId, shotId)}/video-attempts`, {
    method: 'POST', body: input, schema: cinematicVideoAttemptResponseSchema
  });
}

export function approveCinematicVideoAttempt(projectId: string, sceneId: string, shotId: string, attemptId: string, expectedVersion: number) {
  return apiRequest(`${cinematicShotVideoPath(projectId, sceneId, shotId)}/video-attempts/${encodeURIComponent(attemptId)}/approve`, {
    method: 'POST', body: { expectedVersion }, schema: cinematicProduceShotContextSchema
  });
}

export function updateCinematicShotDirection(projectId: string, sceneId: string, shotId: string, input: {
  expectedVersion: number;
  expectedShotVersion: number;
  prompt: string;
  durationMs?: number;
}) {
  return apiRequest(`${cinematicApiPaths.project(projectId)}/scenes/${encodeURIComponent(sceneId)}/shots/${encodeURIComponent(shotId)}`, {
    method: 'PATCH', body: input, schema: cinematicProjectSchema
  });
}

export function updateCinematicShotMotionDirection(projectId: string, sceneId: string, shotId: string, input: {
  expectedVersion: number;
  expectedShotVersion: number;
  additionalMotionDirection: string;
}) {
  return apiRequest(`${cinematicApiPaths.project(projectId)}/scenes/${encodeURIComponent(sceneId)}/shots/${encodeURIComponent(shotId)}/motion-direction`, {
    method: 'PATCH', body: input, schema: cinematicProjectSchema
  });
}

export function reorderCinematicSceneShots(projectId: string, sceneId: string, input: {
  expectedVersion: number;
  shotIds: string[];
}) {
  return apiRequest(`${cinematicApiPaths.project(projectId)}/scenes/${encodeURIComponent(sceneId)}/shot-order`, {
    method: 'PUT', body: input, schema: cinematicProjectSchema
  });
}

export function saveCinematicTimeline(projectId: string, input: {
  expectedVersion: number;
  entries: Array<{
    shotId: string;
    trimInMs: number;
    trimOutMs: number;
    transition: 'cut' | 'dissolve' | 'fade';
    transitionDurationMs?: number;
  }>;
}) {
  return apiRequest(`${cinematicApiPaths.project(projectId)}/timeline`, {
    method: 'PUT', body: input, schema: cinematicProjectSchema
  });
}

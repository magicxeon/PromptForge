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
  cinematicSceneDirectionProposalSchema,
  cinematicStoryboardGenerationContextSchema,
  cinematicStoryboardBatchResponseSchema
} from '../schemas/cinematicSchemas';
import { apiRequest } from '../../../lib/api/apiClient';
import type { CinematicSetupDraft } from '../schemas/cinematicSchemas';
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
  contractVersion?: 'story-plan-v2';
  expectedVersion: number;
  objective?: string;
  logline?: string;
  emotionalArc?: string;
  beats?: unknown[];
  warnings?: string[];
  approved?: boolean;
  source?: 'manual' | 'generated';
  scenes: Array<Record<string, unknown>>;
};

export function saveCinematicStoryPlan(projectId: string, input: StoryPlanInput) {
  return apiRequest(`${cinematicApiPaths.project(projectId)}/story-plan`, {
    method: 'PUT', body: input, schema: cinematicProjectSchema
  });
}

export function generateCinematicStoryPlan(projectId: string) {
  return apiRequest(`${cinematicApiPaths.project(projectId)}/story-plan/proposals`, {
    method: 'POST', schema: cinematicStoryPlanProposalSchema, cache: 'no-store'
  });
}

export function generateCinematicSceneDirection(projectId: string, sceneId: string, input: {
  expectedVersion: number;
  direction?: string;
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
  providerId: string;
  modelId: string;
  prompt: string;
  aspectRatio: string;
  resolution: string;
  durationSeconds: number;
  audioMode: 'none' | 'generated';
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
  }>;
}) {
  return apiRequest(`${cinematicApiPaths.project(projectId)}/timeline`, {
    method: 'PUT', body: input, schema: cinematicProjectSchema
  });
}

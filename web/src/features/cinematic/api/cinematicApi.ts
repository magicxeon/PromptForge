import { z } from 'zod';
import {
  cinematicArchiveResponseSchema,
  cinematicClipBundleSchema,
  cinematicPromptPreflightSchema,
  cinematicProjectSchema,
  cinematicProjectListResponseSchema,
  cinematicProjectLibrarySummarySchema,
  cinematicProduceShotContextSchema,
  cinematicVideoAttemptResponseSchema,
  cinematicVideoQuoteSchema,
  cinematicStoryEnhancementSchema,
  cinematicFullStoryProposalSchema,
  cinematicChapterPlanningEstimateSchema,
  cinematicWardrobeSuggestionSchema,
  cinematicStoryPlanProposalSchema,
  cinematicStoryPlanLiveProgressSchema,
  cinematicSceneDirectionProposalSchema,
  cinematicApprovedStoryboardSourceSchema,
  cinematicStoryboardGenerationContextSchema,
  cinematicSceneEnvironmentContextSchema,
  cinematicSceneEnvironmentProposalSchema,
  cinematicSceneEnvironmentImagesSchema,
  cinematicStoryboardBatchResponseSchema,
  cinematicAuthoringManifestSchema,
  cinematicDataLineageSchema
} from '../schemas/cinematicSchemas';
import { cinematicChapterProposalMutationSchema } from '../schemas/cinematicSeriesSchemas';
import { apiRequest, apiRequestWithProgress } from '../../../lib/api/apiClient';
import type {
  CinematicSetupDraft,
  CinematicFullStoryProposal,
  CinematicChapterOutlineRow,
  CinematicStoryEnhancement,
  CinematicStoryPlanLiveProgress
} from '../schemas/cinematicSchemas';
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

export type CinematicProjectSummary = z.infer<typeof cinematicProjectLibrarySummarySchema>;
export type CinematicProjectListResponse = z.infer<typeof cinematicProjectListResponseSchema>;
export type CinematicStoryPreparationContext = Pick<
  CinematicStoryEnhancement,
  'enhancementId' | 'provenance' | 'billingStatus'
>;

export function listCinematicProjects() {
  return apiRequest(cinematicApiPaths.projects, { schema: cinematicProjectListResponseSchema });
}

export function getCinematicClipBundleManifest(projectId: string, signal?: AbortSignal) {
  return apiRequest(`${cinematicApiPaths.project(projectId)}/clip-bundle`, { schema: cinematicClipBundleSchema, signal });
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

export function getCinematicPromptPreflight(projectId: string) {
  return apiRequest(`${cinematicApiPaths.project(projectId)}/prompt-preflight`, { schema: cinematicPromptPreflightSchema });
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

export function createCinematicProject(
  draft: CinematicSetupDraft,
  creationIntent: 'draft' | 'prepare-story' = 'draft',
  storyPreparation?: CinematicStoryPreparationContext,
  storyImport?: { fileName: string; content: string }
) {
  return apiRequest(cinematicApiPaths.projects, {
    method: 'POST',
    body: { ...draft, creationIntent, ...(storyPreparation ? { storyPreparation } : {}), ...(storyImport ? { storyImport } : {}) },
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

export function enhanceCinematicStory(draft: CinematicSetupDraft, purpose: 'story' | 'roles' = 'story') {
  return apiRequest('/api/cinematic/story-enhancements', {
    method: 'POST',
    body: { ...draft, purpose },
    schema: cinematicStoryEnhancementSchema
  });
}

export function proposeCinematicFullStory(projectId: string, expectedVersion: number, revisionInstruction: string, purpose?: 'characters') {
  return apiRequest(`${cinematicApiPaths.project(projectId)}/full-story/proposals`, {
    method: 'POST', body: { expectedVersion, revisionInstruction, ...(purpose ? { purpose } : {}) }, schema: cinematicFullStoryProposalSchema
  });
}

export function saveCinematicFullStoryRevision(projectId: string, input: {
  expectedVersion: number;
  content: string;
  source: 'manual' | 'ai' | 'restore';
  revisionInstruction?: string;
  provenance?: { provider: string; model: string; responseId: string | null } | null;
  characters?: CinematicFullStoryProposal['characters'];
  importFileName?: string;
}) {
  return apiRequest(`${cinematicApiPaths.project(projectId)}/full-story/revisions`, {
    method: 'POST', body: input, schema: cinematicProjectSchema
  });
}

export function confirmCinematicFullStoryRevision(projectId: string, expectedVersion: number, revisionId: string) {
  return apiRequest(`${cinematicApiPaths.project(projectId)}/full-story/confirm`, {
    method: 'POST', body: { expectedVersion, revisionId }, schema: cinematicProjectSchema
  });
}

export function estimateCinematicChapterPlanning(projectId: string, expectedVersion: number) {
  return apiRequest(`${cinematicApiPaths.project(projectId)}/chapter-outline/estimate`, {
    method: 'POST', body: { expectedVersion }, schema: cinematicChapterPlanningEstimateSchema
  });
}

export function proposeCinematicChapterOutline(projectId: string, expectedVersion: number) {
  return apiRequest(`${cinematicApiPaths.project(projectId)}/chapter-outline/proposals`, {
    method: 'POST', body: { expectedVersion }, schema: cinematicProjectSchema
  });
}

export function reviewCinematicChapterOutline(projectId: string, input: {
  expectedVersion: number; outlineId: string; action: 'approve' | 'discard'; chapters?: CinematicChapterOutlineRow[];
}) {
  return apiRequest(`${cinematicApiPaths.project(projectId)}/chapter-outline/approve`, {
    method: 'POST', body: input, schema: cinematicProjectSchema
  });
}

export function generateCinematicFullStoryChapters(projectId: string, expectedVersion: number) {
  return apiRequest(`${cinematicApiPaths.project(projectId)}/full-story/chapters`, {
    method: 'POST', body: { expectedVersion }, schema: cinematicChapterProposalMutationSchema
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
  sourceType?: 'character' | 'generated_sheet' | 'dossier';
  generationId?: string;
  sheetConfirmed?: boolean;
  characterProfileId?: string | null;
  characterProfileVersionId?: string | null;
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
  jobId?: string;
  sourceType?: 'previous_video_last_frame' | 'faceless_previs';
  frameAssetId?: string;
  assetId?: string;
  crossSceneConfirmed?: boolean;
  idempotencyKey: string;
}) {
  return apiRequest(`${cinematicApiPaths.project(projectId)}/shots/${encodeURIComponent(shotId)}/storyboard-source`, {
    method: 'PUT', body: input, schema: cinematicProduceShotContextSchema
  });
}

export function prepareCinematicPreviousVideoFrame(projectId: string, sceneId: string, shotId: string, input: {
  expectedVersion: number;
  expectedShotVersion: number;
}) {
  return apiRequest(`${cinematicApiPaths.project(projectId)}/scenes/${encodeURIComponent(sceneId)}/shots/${encodeURIComponent(shotId)}/previous-video-frame`, {
    method: 'POST', body: input, schema: cinematicApprovedStoryboardSourceSchema, cache: 'no-store'
  });
}

export function getCinematicFacelessPrevisCapability() {
  return apiRequest('/api/cinematic/faceless-previs/capabilities', {
    schema: z.object({
      available: z.boolean(),
      reason: z.string().nullable().optional(),
      policyVersion: z.string().optional(),
      modelHash: z.string().nullable().optional(),
      maxBytes: z.number().optional(),
      maxPixels: z.number().optional(),
      maxFaces: z.number().optional()
    }),
    cache: 'no-store'
  });
}

export function prepareCinematicFacelessPrevis(projectId: string, sceneId: string, shotId: string, input: {
  expectedVersion: number;
  expectedShotVersion: number;
  sourceType: 'generation_job' | 'previous_video_last_frame';
  jobId?: string;
  frameAssetId?: string;
  expectedFaces: number;
}) {
  const url = cinematicApiPaths.project(projectId) + '/scenes/' + encodeURIComponent(sceneId)
    + '/shots/' + encodeURIComponent(shotId) + '/faceless-previs';
  return apiRequest(url, {
    method: 'POST', body: input, schema: cinematicApprovedStoryboardSourceSchema, cache: 'no-store'
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
    shotId?: string;
    expectedShotVersion?: number;
    keyframeContractFingerprint?: string;
    purpose?: 'scene_environment';
    expectedSceneVersion?: number;
    promptFingerprint?: string;
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
        purpose: operation.purpose,
        expectedSceneVersion: operation.expectedSceneVersion,
        promptFingerprint: operation.promptFingerprint,
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

function cinematicEnvironmentPath(projectId: string, sceneId: string) {
  return `${cinematicApiPaths.project(projectId)}/scenes/${encodeURIComponent(sceneId)}/environment`;
}
export function getCinematicSceneEnvironment(projectId: string, sceneId: string) {
  return apiRequest(cinematicEnvironmentPath(projectId, sceneId), { schema: cinematicSceneEnvironmentContextSchema });
}
export function saveCinematicSceneEnvironment(projectId: string, sceneId: string, input: {
  expectedVersion: number; expectedSceneVersion: number; environmentPrompt?: string; referenceEnabled?: boolean;
}) {
  return apiRequest(cinematicEnvironmentPath(projectId, sceneId), { method: 'PATCH', body: input, schema: cinematicProjectSchema });
}
export function proposeCinematicSceneEnvironment(projectId: string, sceneId: string, input: {
  expectedVersion: number; expectedSceneVersion: number; currentDirection?: string;
}) {
  return apiRequest(`${cinematicEnvironmentPath(projectId, sceneId)}/proposals`, {
    method: 'POST', body: input, schema: cinematicSceneEnvironmentProposalSchema
  });
}
export function listCinematicSceneEnvironmentImages(projectId: string, sceneId: string, cursor: string | null = null) {
  const query = new URLSearchParams({ limit: '12', ...(cursor ? { cursor } : {}) });
  return apiRequest(`${cinematicEnvironmentPath(projectId, sceneId)}/images?${query}`, { schema: cinematicSceneEnvironmentImagesSchema });
}
export function approveCinematicSceneEnvironment(projectId: string, sceneId: string, input: { expectedVersion: number; jobId: string; reuse?: boolean }) {
  return apiRequest(`${cinematicEnvironmentPath(projectId, sceneId)}/approve`, { method: 'POST', body: input, schema: cinematicProjectSchema });
}

export type CinematicVideoReferenceMode = 'storyboard_only' | 'storyboard_and_looks' | 'looks_only' | 'text_only';

export function getCinematicProduceContext(projectId: string, sceneId: string, shotId: string, referenceMode?: CinematicVideoReferenceMode) {
  return apiRequest(`${cinematicApiPaths.project(projectId)}/scenes/${encodeURIComponent(sceneId)}/shots/${encodeURIComponent(shotId)}/produce-context${referenceMode ? `?referenceMode=${referenceMode}` : ''}`, {
    schema: cinematicProduceShotContextSchema
  });
}

export type CinematicVideoAttemptInput = {
  referenceMode?: CinematicVideoReferenceMode;
  expectedVersion: number;
  expectedShotVersion: number;
  sourceFingerprint: string | null;
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

export function updateCinematicShotVideoReferences(projectId: string, sceneId: string, shotId: string, input: {
  expectedVersion: number; expectedShotVersion: number; referenceMode: CinematicVideoReferenceMode;
}) {
  return apiRequest(`${cinematicShotVideoPath(projectId, sceneId, shotId)}/video-references`, {
    method: 'PATCH', body: input, schema: cinematicProjectSchema
  });
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

export function approveCinematicVideoAttempt(projectId: string, sceneId: string, shotId: string, attemptId: string, expectedVersion: number,
  manualOverride?: { kind: 'planned_duration'; submittedDurationMs: number; currentDurationMs: number }) {
  return apiRequest(`${cinematicShotVideoPath(projectId, sceneId, shotId)}/video-attempts/${encodeURIComponent(attemptId)}/approve`, {
    method: 'POST', body: { expectedVersion, ...(manualOverride ? { manualOverride } : {}) }, schema: cinematicProduceShotContextSchema
  });
}

export function updateCinematicShotDirection(projectId: string, sceneId: string, shotId: string, input: {
  expectedVersion: number;
  expectedShotVersion: number;
  prompt: string;
  durationMs?: number;
  title?: string;
  purpose?: string;
  visibleMoment?: string;
  subjectAction?: string;
  emotionalTarget?: string;
  performanceCue?: string;
  continuityEntry?: string;
  continuityExit?: string;
  transitionToNext?: string;
  framing?: string;
  cameraAngle?: string;
  lensIntent?: string;
  cameraMovement?: string;
  lighting?: string;
  environment?: string;
}) {
  return apiRequest(`${cinematicApiPaths.project(projectId)}/scenes/${encodeURIComponent(sceneId)}/shots/${encodeURIComponent(shotId)}`, {
    method: 'PATCH', body: input, schema: cinematicProjectSchema
  });
}

export function createCinematicSimpleScene(projectId: string, input: { expectedVersion: number; idempotencyKey: string }) {
  return apiRequest(`${cinematicApiPaths.project(projectId)}/simple-scenes`, {
    method: 'POST', body: input, schema: cinematicProjectSchema
  });
}

export function saveCinematicManualStoryboard(projectId: string, sceneId: string, shotId: string, input: {
  expectedVersion: number; expectedShotVersion: number; title: string; imagePrompt: string; durationMs: number;
  castAssignmentIds: string[]; wardrobeLookIds: string[];
  videoActionTimeline: Array<{ startMs: number; endMs: number; description: string }>;
}) {
  return apiRequest(`${cinematicShotVideoPath(projectId, sceneId, shotId)}/manual-storyboard`, {
    method: 'PATCH', body: input, schema: cinematicProjectSchema
  });
}

export function updateCinematicStoryboardSettings(projectId: string, sceneId: string, shotId: string, input: {
  expectedVersion: number; expectedShotVersion: number; storyboardFaceless: boolean;
  storyboardFacialTreatment?: 'blank' | 'white_previs';
}) {
  return apiRequest(`${cinematicShotVideoPath(projectId, sceneId, shotId)}/storyboard-settings`, {
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

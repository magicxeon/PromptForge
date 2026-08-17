import type { z } from 'zod';
import {
  cinematicArchiveResponseSchema,
  cinematicProjectSchema,
  cinematicProjectListResponseSchema,
  cinematicProjectSummarySchema,
  cinematicProduceShotContextSchema
} from '../schemas/cinematicSchemas';
import { apiRequest } from '../../../lib/api/apiClient';
import type { CinematicSetupDraft } from '../schemas/cinematicSchemas';
import type { CinematicStage } from '../cinematicStages';

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

export function upsertCinematicWardrobeLook(projectId: string, assignmentId: string, lookId: string, input: {
  expectedVersion: number;
  name: string;
  mode: 'character_default' | 'uploaded';
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

export function getCinematicProduceContext(projectId: string, sceneId: string, shotId: string) {
  return apiRequest(`${cinematicApiPaths.project(projectId)}/scenes/${encodeURIComponent(sceneId)}/shots/${encodeURIComponent(shotId)}/produce-context`, {
    schema: cinematicProduceShotContextSchema
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

import { apiRequest } from '../../../lib/api/apiClient';
import { cinematicChapterProposalMutationSchema, cinematicManualSceneMutationSchema, cinematicManualShotMutationSchema, cinematicSceneProposalMutationSchema, cinematicSeriesMutationSchema, cinematicSeriesWorkspaceSchema, cinematicSharedCharacterMutationSchema, cinematicShotDocumentMutationSchema, cinematicShotProposalMutationSchema } from '../schemas/cinematicSeriesSchemas';
import type { SeriesCommand } from '../schemas/cinematicSeriesSchemas';
import { cinematicShotWriterPreparationSchema } from '../schemas/cinematicSeriesSchemas';

export function getCinematicSeriesWorkspace(projectId: string) {
  return apiRequest(`/api/cinematic/projects/${encodeURIComponent(projectId)}/series`, { schema: cinematicSeriesWorkspaceSchema, cache: 'no-store' });
}

export function updateCinematicSharedVoice(projectId: string, assignmentId: string, input: {
  expectedProjectVersion: number; expectedStoryProjectVersion: number; dialogueStyle: string;
}) {
  return apiRequest(`/api/cinematic/projects/${encodeURIComponent(projectId)}/shared-characters/${encodeURIComponent(assignmentId)}/voice`, {
    method: 'PATCH', body: input, schema: cinematicSharedCharacterMutationSchema
  });
}

export function updateCinematicChapter(projectId: string, expectedProjectVersion: number, title: string, story: string, input: {
  source?: 'manual' | 'ai'; revisionInstruction?: string; sourceFullStoryRevisionId?: string | null;
} = {}) {
  return apiRequest(`/api/cinematic/projects/${encodeURIComponent(projectId)}/chapter`, {
    method: 'PATCH', body: { expectedProjectVersion, title, story, ...input }, schema: cinematicSeriesMutationSchema
  });
}

export function proposeCinematicChapters(projectId: string, input: {
  expectedVersion: number; scope: 'all' | 'selected'; instruction?: string; draftTitle?: string; draftStory?: string;
}) {
  return apiRequest(`/api/cinematic/projects/${encodeURIComponent(projectId)}/chapter-proposals`, {
    method: 'POST', body: input, schema: cinematicChapterProposalMutationSchema
  });
}

export function applyCinematicChapterProposal(projectId: string, proposalId: string) {
  return apiRequest(`/api/cinematic/projects/${encodeURIComponent(projectId)}/chapter-proposals/${encodeURIComponent(proposalId)}/apply`, {
    method: 'POST', body: {}, schema: cinematicChapterProposalMutationSchema
  });
}

export function discardCinematicChapterProposal(projectId: string, proposalId: string) {
  return apiRequest(`/api/cinematic/projects/${encodeURIComponent(projectId)}/chapter-proposals/${encodeURIComponent(proposalId)}/discard`, {
    method: 'POST', body: {}, schema: cinematicChapterProposalMutationSchema
  });
}

export function proposeCinematicScenes(projectId: string, expectedVersion: number) {
  return apiRequest(`/api/cinematic/projects/${encodeURIComponent(projectId)}/scene-proposals`, {
    method: 'POST', body: { expectedVersion }, schema: cinematicSceneProposalMutationSchema
  });
}

export function applyCinematicSceneProposal(projectId: string, proposalId: string, expectedVersion: number) {
  return apiRequest(`/api/cinematic/projects/${encodeURIComponent(projectId)}/scene-proposals/${encodeURIComponent(proposalId)}/apply`, {
    method: 'POST', body: { expectedVersion }, schema: cinematicSceneProposalMutationSchema
  });
}

export function discardCinematicSceneProposal(projectId: string, proposalId: string, expectedVersion: number) {
  return apiRequest(`/api/cinematic/projects/${encodeURIComponent(projectId)}/scene-proposals/${encodeURIComponent(proposalId)}/discard`, {
    method: 'POST', body: { expectedVersion }, schema: cinematicSceneProposalMutationSchema
  });
}

export function createCinematicManualScene(projectId: string, expectedVersion: number, idempotencyKey: string) {
  return apiRequest(`/api/cinematic/projects/${encodeURIComponent(projectId)}/manual-scenes`, {
    method: 'POST', body: { expectedVersion, idempotencyKey }, schema: cinematicManualSceneMutationSchema
  });
}

export function updateCinematicSceneOutline(projectId: string, sceneId: string, input: {
  expectedVersion: number;
  expectedSceneVersion: number;
  title: string;
  synopsis: string;
  purpose: 'dialogue' | 'action' | 'montage' | 'establishing' | 'atmosphere' | 'transition' | 'dramatic';
  objective: string;
  location: string;
  time: string;
  weather: string;
  environment: string;
  entryState: string;
  exitState: string;
  emotionalStart: string;
  emotionalEnd: string;
  transitionIntent: string;
  targetDurationSeconds: number;
  dialogueTargetPercent: number;
  characterIds: string[];
}) {
  return apiRequest(`/api/cinematic/projects/${encodeURIComponent(projectId)}/scenes/${encodeURIComponent(sceneId)}`, {
    method: 'PATCH', body: input, schema: cinematicManualSceneMutationSchema
  });
}

export function updateCinematicSceneLooks(projectId: string, sceneId: string, input: {
  expectedVersion: number; expectedSceneVersion: number; wardrobeLookIds: string[];
}) {
  return apiRequest(`/api/cinematic/projects/${encodeURIComponent(projectId)}/scenes/${encodeURIComponent(sceneId)}/looks`, {
    method: 'PATCH', body: input, schema: cinematicManualSceneMutationSchema
  });
}

export function proposeCinematicShots(projectId: string, sceneId: string, expectedVersion: number, revision?: { targetShotId: string; instruction: string }) {
  return apiRequest(`/api/cinematic/projects/${encodeURIComponent(projectId)}/scenes/${encodeURIComponent(sceneId)}/shot-proposals`, {
    method: 'POST', body: { expectedVersion, ...revision }, schema: cinematicShotProposalMutationSchema
  });
}

export function applyCinematicShotProposal(projectId: string, sceneId: string, proposalId: string, expectedVersion: number) {
  return apiRequest(`/api/cinematic/projects/${encodeURIComponent(projectId)}/scenes/${encodeURIComponent(sceneId)}/shot-proposals/${encodeURIComponent(proposalId)}/apply`, {
    method: 'POST', body: { expectedVersion }, schema: cinematicShotProposalMutationSchema
  });
}

export function discardCinematicShotProposal(projectId: string, sceneId: string, proposalId: string, expectedVersion: number) {
  return apiRequest(`/api/cinematic/projects/${encodeURIComponent(projectId)}/scenes/${encodeURIComponent(sceneId)}/shot-proposals/${encodeURIComponent(proposalId)}/discard`, {
    method: 'POST', body: { expectedVersion }, schema: cinematicShotProposalMutationSchema
  });
}

export function createCinematicManualShot(projectId: string, sceneId: string, expectedVersion: number, idempotencyKey: string) {
  return apiRequest(`/api/cinematic/projects/${encodeURIComponent(projectId)}/scenes/${encodeURIComponent(sceneId)}/manual-shots`, {
    method: 'POST', body: { expectedVersion, idempotencyKey }, schema: cinematicManualShotMutationSchema
  });
}

export function updateCinematicShotDocument(projectId: string, sceneId: string, shotId: string, input: {
  expectedVersion: number;
  expectedShotVersion: number;
  title: string;
  durationMs: number;
  shotDocument: string;
  speakerBindings?: { alias: string; castAssignmentId: string; visible: boolean }[];
  videoPromptOverride?: { text: string; sourceFingerprint: string } | null;
  source?: 'manual' | 'ai_proposal' | 'restored' | 'legacy';
}) {
  return apiRequest(`/api/cinematic/projects/${encodeURIComponent(projectId)}/scenes/${encodeURIComponent(sceneId)}/shots/${encodeURIComponent(shotId)}/document`, {
    method: 'PATCH', body: input, schema: cinematicShotDocumentMutationSchema
  });
}

export function prepareCinematicShotWriter(projectId: string, sceneId: string, shotId: string) {
  return apiRequest(`/api/cinematic/projects/${encodeURIComponent(projectId)}/scenes/${encodeURIComponent(sceneId)}/shots/${encodeURIComponent(shotId)}/writer-preparation`, {
    schema: cinematicShotWriterPreparationSchema, cache: 'no-store'
  });
}

export function restoreCinematicChapterRevision(projectId: string, revisionId: string, expectedProjectVersion: number) {
  return apiRequest(`/api/cinematic/projects/${encodeURIComponent(projectId)}/chapter-revisions/${encodeURIComponent(revisionId)}/restore`, {
    method: 'POST', body: { expectedProjectVersion }, schema: cinematicSeriesMutationSchema
  });
}

export function upsertCinematicSharedCharacter(projectId: string, assignmentId: string | null, input: {
  expectedProjectVersion: number;
  expectedStoryProjectVersion: number;
  sourceType?: 'dossier' | 'character';
  characterProfileId?: string;
  characterProfileVersionId?: string;
  displayName: string;
  storyRole: string;
  storyRoleSlotId?: string;
  storyImportance?: 'protagonist' | 'supporting';
  objective?: string;
}) {
  return apiRequest(`/api/cinematic/projects/${encodeURIComponent(projectId)}/shared-characters/${encodeURIComponent(assignmentId || 'new')}`, {
    method: 'PUT', body: input, schema: cinematicSharedCharacterMutationSchema
  });
}

export function setCinematicChapterCharacters(projectId: string, expectedProjectVersion: number, characterIds: string[]) {
  return apiRequest(`/api/cinematic/projects/${encodeURIComponent(projectId)}/chapter-characters`, {
    method: 'PUT', body: { expectedProjectVersion, characterIds }, schema: cinematicSeriesMutationSchema
  });
}

export function detachCinematicSharedCharacter(projectId: string, assignmentId: string, expectedProjectVersion: number, expectedStoryProjectVersion: number) {
  return apiRequest(`/api/cinematic/projects/${encodeURIComponent(projectId)}/shared-characters/${encodeURIComponent(assignmentId)}/detach`, {
    method: 'POST', body: { expectedProjectVersion, expectedStoryProjectVersion }, schema: cinematicSharedCharacterMutationSchema
  });
}

export function removeCinematicSharedCharacter(projectId: string, assignmentId: string, expectedProjectVersion: number, expectedStoryProjectVersion: number) {
  return apiRequest(`/api/cinematic/projects/${encodeURIComponent(projectId)}/shared-characters/${encodeURIComponent(assignmentId)}`, {
    method: 'DELETE', body: { expectedProjectVersion, expectedStoryProjectVersion }, schema: cinematicSharedCharacterMutationSchema
  });
}

export async function mutateCinematicSeries(projectId: string, projectVersion: number, seriesId: string | undefined, seriesVersion: number | undefined, command: SeriesCommand) {
  if (command.kind === 'create') return apiRequest(`/api/cinematic/projects/${encodeURIComponent(projectId)}/series`, {
    method: 'POST', body: { title: command.title, expectedProjectVersion: projectVersion }, schema: cinematicSeriesMutationSchema
  });
  if (!seriesId || !seriesVersion) throw new Error('Series workspace is unavailable.');
  const path = `/api/cinematic/series/${encodeURIComponent(seriesId)}`;
  if (command.kind === 'chapter') return apiRequest(`${path}/chapters`, { method: 'POST',
    body: { ...command, expectedVersion: seriesVersion, sourceProjectId: projectId, expectedProjectVersion: projectVersion }, schema: cinematicSeriesMutationSchema });
  const workspace = await apiRequest(command.kind === 'season' ? `${path}/seasons` : path, {
    method: command.kind === 'season' ? 'POST' : 'PATCH', body: { ...command, expectedVersion: seriesVersion }, schema: cinematicSeriesWorkspaceSchema
  });
  return { project: null, workspace };
}

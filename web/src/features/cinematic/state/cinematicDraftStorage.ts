import {
  readActorScopedDraft,
  removeActorScopedDraft,
  writeActorScopedDraft
} from '../../../lib/persistence/actorScopedStorage';
import {
  cinematicSetupDraftSchema,
  type CinematicSetupDraft
} from '../schemas/cinematicSchemas';

export const CINEMATIC_DRAFT_SCHEMA_VERSION = 3;

export function createCinematicSetupDraft(now = new Date()): CinematicSetupDraft {
  return {
    clientDraftId: `cinedraft_${now.getTime().toString(36)}`,
    projectName: '',
    format: 'short-film',
    platform: 'tiktok',
    durationSeconds: 30,
    storyBrief: '',
    creativeDirection: '',
    genre: 'drama',
    audienceFeeling: 'moved',
    pacing: 'balanced',
    endingIntent: 'resolved',
    mode: 'simple',
    castPlanningMode: 'ai-recommended',
    storyRoleSlots: [],
    activeStage: 'setup',
    updatedAt: now.toISOString()
  };
}

export function readCinematicSetupDraft(actorId: string) {
  const fallback = createCinematicSetupDraft();
  const value = readActorScopedDraft<unknown>({
    actorId,
    feature: 'cinematic-project:new',
    schemaVersion: CINEMATIC_DRAFT_SCHEMA_VERSION,
    fallback
  });
  return cinematicSetupDraftSchema.safeParse(value).data ?? fallback;
}

export function writeCinematicSetupDraft(actorId: string, draft: CinematicSetupDraft) {
  const parsed = cinematicSetupDraftSchema.parse(draft);
  writeActorScopedDraft({
    actorId,
    feature: 'cinematic-project:new',
    schemaVersion: CINEMATIC_DRAFT_SCHEMA_VERSION,
    payload: parsed
  });
}

export function removeCinematicSetupDraft(actorId: string) {
  removeActorScopedDraft(actorId, 'cinematic-project:new');
}

export function readCinematicSetupRecoveryDraft(actorId: string, projectId: string) {
  const value = readActorScopedDraft<unknown>({
    actorId,
    feature: recoveryFeature(projectId),
    schemaVersion: CINEMATIC_DRAFT_SCHEMA_VERSION,
    fallback: null
  });
  const parsed = cinematicSetupDraftSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function writeCinematicSetupRecoveryDraft(actorId: string, projectId: string, draft: CinematicSetupDraft) {
  writeActorScopedDraft({
    actorId,
    feature: recoveryFeature(projectId),
    schemaVersion: CINEMATIC_DRAFT_SCHEMA_VERSION,
    payload: cinematicSetupDraftSchema.parse(draft)
  });
}

export function removeCinematicSetupRecoveryDraft(actorId: string, projectId: string) {
  removeActorScopedDraft(actorId, recoveryFeature(projectId));
}

function recoveryFeature(projectId: string) {
  return `cinematic-project:${projectId}:setup-recovery`;
}

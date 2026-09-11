import type { CinematicProject, CinematicScene, CinematicShot } from '../../schemas/cinematicSchemas';
import type { StoryboardShotSummary } from '../StoryboardSequenceBoard';

export type ProduceAttemptAsset = {
  publicUrl: string;
  posterUrl?: string | null;
};

export type ProduceShotQueueItem = StoryboardShotSummary & {
  sceneId: string;
  sceneTitle: string;
  approvedVideoAttemptId?: string | null;
  approvedVideoAsset?: ProduceAttemptAsset | null;
};

export type ProduceSceneQueue = {
  id: string;
  title: string;
  durationSeconds: number;
  shots: ProduceShotQueueItem[];
};

export type ProduceReadiness = {
  totalShots: number;
  storyboardReady: number;
  videoApproved: number;
  activeJobs: number;
  failedJobs: number;
  plannedDurationSeconds: number;
  assembledDurationSeconds: number;
  firstBlockedShotId: string | null;
};

export function buildProduceSceneQueue(project: CinematicProject): ProduceSceneQueue[] {
  return project.scenes.map(scene => ({
    id: scene.id,
    title: scene.title,
    durationSeconds: scene.durationMs / 1000,
    shots: scene.shots.map(shot => buildShot(project, scene, shot))
  }));
}

export function buildProduceReadiness(project: CinematicProject): ProduceReadiness {
  const scenes = buildProduceSceneQueue(project);
  const shots = scenes.flatMap(scene => scene.shots);
  const approvedAttempts = shots
    .map(shot => findVideoAttempt(project, shot.approvedVideoAttemptId || null))
    .filter((attempt): attempt is Record<string, unknown> => Boolean(attempt));
  const videoAttempts = records(project.generationAttempts).filter(isVideoAttempt);
  return {
    totalShots: shots.length,
    storyboardReady: project.scenes.flatMap(scene => scene.shots).filter(shot => Boolean(shot.approvedStoryboardSource)).length,
    videoApproved: shots.filter(shot => shot.status === 'approved').length,
    activeJobs: videoAttempts.filter(attempt => isActiveStatus(text(attempt.status))).length,
    failedJobs: videoAttempts.filter(attempt => text(attempt.status) === 'failed').length,
    plannedDurationSeconds: round(project.scenes.reduce((total, scene) => total + scene.durationMs, 0) / 1000),
    assembledDurationSeconds: round(approvedAttempts.reduce((total, attempt) => (
      total + number(attempt.renderDurationMs)
    ), 0) / 1000),
    firstBlockedShotId: shots.find(shot => shot.status === 'storyboard_required' || shot.status === 'source_changed')?.id || null
  };
}

export function findVideoAttempt(project: CinematicProject, attemptId: string | null | undefined) {
  if (!attemptId) return null;
  return records(project.generationAttempts).find(attempt => text(attempt.id) === attemptId && isVideoAttempt(attempt)) || null;
}

export function overlayProduceTaskStatus(
  scenes: ProduceSceneQueue[],
  shotId: string | null | undefined,
  taskStatus: string | null | undefined
): ProduceSceneQueue[] {
  if (!shotId || !taskStatus) return scenes;
  const status = taskQueueStatus(taskStatus);
  if (!status) return scenes;
  return scenes.map(scene => ({
    ...scene,
    shots: scene.shots.map(shot => (
      shot.id !== shotId || shot.status === 'approved' || shot.status === 'source_changed'
        ? shot
        : { ...shot, status }
    ))
  }));
}

function buildShot(project: CinematicProject, scene: CinematicScene, shot: CinematicShot): ProduceShotQueueItem {
  const latestAttempt = [...records(project.generationAttempts)]
    .reverse()
    .find(attempt => text(attempt.shotId) === shot.id && isVideoAttempt(attempt)) || null;
  const approvedAttempt = findVideoAttempt(project, shot.approvedVideoAttemptId);
  return {
    id: shot.id,
    sceneId: scene.id,
    sceneTitle: scene.title,
    durationSeconds: shot.durationMs / 1000,
    title: shot.title,
    framing: shot.framing,
    action: shot.subjectAction || shot.blocking || shot.purpose,
    status: resolveStatus(shot, latestAttempt),
    imageUrl: shot.approvedStoryboardSource?.imageUrl || null,
    castNames: project.castAssignments
      .filter(assignment => shot.castAssignmentIds.includes(assignment.id))
      .map(assignment => assignment.displayName),
    lookNames: project.castAssignments
      .flatMap(assignment => records(assignment.looks))
      .filter(look => shot.wardrobeLookIds.includes(text(look.id)))
      .map(look => text(look.name))
      .filter(Boolean),
    approvedVideoAttemptId: shot.approvedVideoAttemptId,
    approvedVideoAsset: asset(approvedAttempt?.outputAsset)
  };
}

function resolveStatus(
  shot: CinematicShot,
  attempt: Record<string, unknown> | null
): StoryboardShotSummary['status'] {
  if (!shot.approvedStoryboardSource && shot.videoReferenceMode !== 'looks_only') return 'storyboard_required';
  if (shot.approvedVideoAttemptId) return 'approved';
  if (!attempt) return 'ready';
  if (['source_changed', 'packet_changed'].includes(text(attempt.downstreamSourceStatus))) return 'source_changed';
  const status = text(attempt.status);
  if (status === 'failed') return 'failed';
  if (status === 'completed') return 'review';
  if (status === 'quoted') return 'quoted';
  if (status === 'queued') return 'queued';
  if (isActiveStatus(status)) return 'generating';
  return 'ready';
}

function isVideoAttempt(value: Record<string, unknown>) {
  return text(value.operation) === 'cinematic_draft_clip';
}

function isActiveStatus(value: string) {
  return ['preparing', 'pending', 'queued', 'processing', 'running'].includes(value);
}

function taskQueueStatus(value: string): StoryboardShotSummary['status'] | null {
  if (value === 'completed') return 'review';
  if (value === 'failed' || value === 'cancelled' || value === 'expired' || value === 'reconciliation_required') return 'failed';
  if (value === 'queued' || value === 'pending') return 'queued';
  if (isActiveStatus(value)) return 'generating';
  return null;
}

function records(values: unknown[]): Record<string, unknown>[] {
  return values.filter((value): value is Record<string, unknown> => Boolean(value && typeof value === 'object'));
}

function asset(value: unknown): ProduceAttemptAsset | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const publicUrl = text(record.publicUrl);
  if (!publicUrl) return null;
  return { publicUrl, posterUrl: text(record.posterUrl) || null };
}

function text(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function number(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}

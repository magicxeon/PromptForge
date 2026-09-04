import { describe, expect, it } from 'vitest';
import type { CinematicProject } from '../../schemas/cinematicSchemas';
import { buildProduceReadiness, buildProduceSceneQueue, overlayProduceTaskStatus } from './produceReadModel';

describe('Produce read model', () => {
  it('keeps Storyboard order and projects approved, failed and blocked Shots', () => {
    const project = fixtureProject();
    const scenes = buildProduceSceneQueue(project);
    const readiness = buildProduceReadiness(project);

    expect(scenes.flatMap(scene => scene.shots.map(shot => shot.id))).toEqual(['shot-a', 'shot-b', 'shot-c']);
    expect(scenes[0]?.shots.map(shot => shot.status)).toEqual(['approved', 'failed']);
    expect(scenes[1]?.shots[0]?.status).toBe('storyboard_required');
    expect(scenes[0]?.shots[0]?.approvedVideoAsset?.publicUrl).toBe('/outputs/video-a.mp4');
    expect(readiness).toMatchObject({
      totalShots: 3,
      storyboardReady: 2,
      videoApproved: 1,
      activeJobs: 0,
      failedJobs: 1,
      plannedDurationSeconds: 12,
      assembledDurationSeconds: 4,
      firstBlockedShotId: 'shot-c'
    });
  });

  it('overlays the selected live task without mutating Story order or approved authority', () => {
    const scenes = buildProduceSceneQueue(fixtureProject());

    const processing = overlayProduceTaskStatus(scenes, 'shot-b', 'processing');
    const completed = overlayProduceTaskStatus(scenes, 'shot-b', 'completed');
    const approved = overlayProduceTaskStatus(scenes, 'shot-a', 'failed');

    expect(processing.flatMap(scene => scene.shots.map(shot => shot.id))).toEqual(['shot-a', 'shot-b', 'shot-c']);
    expect(processing[0]?.shots[1]?.status).toBe('generating');
    expect(completed[0]?.shots[1]?.status).toBe('review');
    expect(approved[0]?.shots[0]?.status).toBe('approved');
    expect(scenes[0]?.shots[1]?.status).toBe('failed');
  });
});

function fixtureProject() {
  const shot = (id: string, orderKey: number, approved: boolean) => ({
    id, version: 1, orderKey, title: id, purpose: `Purpose ${id}`, subjectAction: `Action ${id}`,
    durationMs: 4000, framing: 'medium', cameraAngle: 'eye', cameraMovement: 'static', lensIntent: '',
    blocking: '', performance: '', gaze: '', lighting: '', environment: '', audioIntent: '', prompt: 'Prompt',
    castAssignmentIds: [], wardrobeLookIds: [], continuityNotes: [], storyboardStatus: approved ? 'approved' : 'draft',
    ...(approved ? { approvedStoryboardSource: { imageUrl: `/${id}.jpg`, assetId: `asset-${id}`, assetVersionId: `version-${id}`, sourceJobId: `job-${id}`, sourceFingerprint: `source-${id}` } } : {})
  });
  const shotA = { ...shot('shot-a', 1, true), approvedVideoAttemptId: 'attempt-a' };
  const shotB = shot('shot-b', 2, true);
  const shotC = shot('shot-c', 1, false);
  return {
    scenes: [
      { id: 'scene-a', version: 1, orderKey: 1, title: 'Scene A', durationMs: 8000, shots: [shotA, shotB] },
      { id: 'scene-b', version: 1, orderKey: 2, title: 'Scene B', durationMs: 4000, shots: [shotC] }
    ],
    castAssignments: [],
    generationAttempts: [
      { id: 'attempt-a', operation: 'cinematic_draft_clip', shotId: 'shot-a', status: 'approved', renderDurationMs: 4000, outputAsset: { publicUrl: '/outputs/video-a.mp4' } },
      { id: 'attempt-b', operation: 'cinematic_draft_clip', shotId: 'shot-b', status: 'failed' }
    ]
  } as unknown as CinematicProject;
}

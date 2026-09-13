import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../lib/api/apiError';
import type { CinematicProject } from '../schemas/cinematicSchemas';
import { cinematicStages, simpleCinematicStages, visibleCinematicStage } from '../cinematicStages';
import { updateCinematicStageWithRecovery } from './cinematicStageNavigation';

describe('cinematic Stage navigation', () => {
  it('keeps the approved Simple four-stage order separate from all six Advanced stages', () => {
    expect(simpleCinematicStages).toEqual(['setup', 'cast', 'storyboard', 'finish']);
    expect(cinematicStages).toEqual(['setup', 'cast', 'story-plan', 'storyboard', 'produce', 'finish']);
    expect(simpleCinematicStages).not.toBe(cinematicStages);
    expect(simpleCinematicStages).not.toContain('story-plan');
    expect(simpleCinematicStages).not.toContain('produce');
  });

  it.each([
    ['setup', 'setup'],
    ['cast', 'cast'],
    ['story-plan', 'storyboard'],
    ['storyboard', 'storyboard'],
    ['produce', 'storyboard'],
    ['finish', 'finish']
  ] as const)('projects Simple %s to %s, including legacy deep-link stages', (requested, visible) => {
    expect(visibleCinematicStage(requested, 'simple')).toBe(visible);
    expect(simpleCinematicStages).toContain(visible);
    expect(visibleCinematicStage(visible, 'simple')).toBe(visible);
  });

  it.each(cinematicStages)('keeps Advanced %s visible without remapping', stage => {
    expect(visibleCinematicStage(stage, 'advanced')).toBe(stage);
  });

  it('steps directly between Cast, Storyboard and Finish in Simple without changing Advanced order', () => {
    expect(simpleCinematicStages[simpleCinematicStages.indexOf('cast') + 1]).toBe('storyboard');
    expect(simpleCinematicStages[simpleCinematicStages.indexOf('storyboard') - 1]).toBe('cast');
    expect(simpleCinematicStages[simpleCinematicStages.indexOf('storyboard') + 1]).toBe('finish');
    expect(simpleCinematicStages[simpleCinematicStages.indexOf('finish') - 1]).toBe('storyboard');
    expect(cinematicStages[cinematicStages.indexOf('cast') + 1]).toBe('story-plan');
    expect(cinematicStages[cinematicStages.indexOf('storyboard') + 1]).toBe('produce');
    expect(cinematicStages[cinematicStages.indexOf('finish') - 1]).toBe('produce');
  });

  it('refreshes and retries once with the latest Project version after a version conflict', async () => {
    const latest = { id: 'cineproj_1', version: 91 } as CinematicProject;
    const saved = { ...latest, version: 92, activeStage: 'story-plan' } as CinematicProject;
    const saveStage = vi.fn()
      .mockRejectedValueOnce(new ApiError({
        status: 409,
        code: 'cinematic_version_conflict',
        message: 'The Project changed in another session.',
        details: { currentVersion: 91 }
      }))
      .mockResolvedValueOnce(saved);
    const refreshProject = vi.fn().mockResolvedValue(latest);

    await expect(updateCinematicStageWithRecovery('cineproj_1', 'story-plan', 90, {
      refreshProject,
      saveStage
    })).resolves.toBe(saved);

    expect(refreshProject).toHaveBeenCalledTimes(1);
    expect(saveStage).toHaveBeenNthCalledWith(1, 'cineproj_1', 'story-plan', 90);
    expect(saveStage).toHaveBeenNthCalledWith(2, 'cineproj_1', 'story-plan', 91);
  });

  it('does not retry non-version failures', async () => {
    const error = new ApiError({ status: 403, code: 'cinematic_access_forbidden', message: 'Forbidden' });
    const saveStage = vi.fn().mockRejectedValue(error);
    const refreshProject = vi.fn();

    await expect(updateCinematicStageWithRecovery('cineproj_1', 'story-plan', 90, {
      refreshProject,
      saveStage
    })).rejects.toBe(error);

    expect(saveStage).toHaveBeenCalledTimes(1);
    expect(refreshProject).not.toHaveBeenCalled();
  });

  it('stops after one refreshed retry when the Project changes again', async () => {
    const conflict = new ApiError({
      status: 409,
      code: 'cinematic_version_conflict',
      message: 'The Project changed in another session.'
    });
    const saveStage = vi.fn().mockRejectedValue(conflict);
    const refreshProject = vi.fn().mockResolvedValue({ id: 'cineproj_1', version: 91 } as CinematicProject);

    await expect(updateCinematicStageWithRecovery('cineproj_1', 'story-plan', 90, {
      refreshProject,
      saveStage
    })).rejects.toBe(conflict);

    expect(saveStage).toHaveBeenCalledTimes(2);
    expect(refreshProject).toHaveBeenCalledTimes(1);
  });
});

import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../lib/api/apiError';
import type { CinematicProject } from '../schemas/cinematicSchemas';
import { updateCinematicStageWithRecovery } from './cinematicStageNavigation';

describe('cinematic Stage navigation', () => {
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

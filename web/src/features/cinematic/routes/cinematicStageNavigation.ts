import { ApiError } from '../../../lib/api/apiError';
import type { CinematicStage } from '../cinematicStages';
import type { CinematicProject } from '../schemas/cinematicSchemas';
import { getCinematicProject, updateCinematicStage } from '../api/cinematicApi';

type StageNavigationDependencies = {
  refreshProject?: (projectId: string) => Promise<CinematicProject>;
  saveStage?: (projectId: string, stage: CinematicStage, expectedVersion: number) => Promise<CinematicProject>;
};

export async function updateCinematicStageWithRecovery(
  projectId: string,
  stage: CinematicStage,
  expectedVersion: number,
  dependencies: StageNavigationDependencies = {}
) {
  const refreshProject = dependencies.refreshProject || getCinematicProject;
  const saveStage = dependencies.saveStage || updateCinematicStage;

  try {
    return await saveStage(projectId, stage, expectedVersion);
  } catch (error) {
    if (!(error instanceof ApiError) || error.code !== 'cinematic_version_conflict') throw error;
    const latest = await refreshProject(projectId);
    return saveStage(projectId, stage, latest.version);
  }
}

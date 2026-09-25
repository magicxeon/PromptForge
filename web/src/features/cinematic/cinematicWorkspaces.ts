import type { CinematicStage } from './cinematicStages';

export type CinematicWorkspace = 'story' | 'production' | 'final';

export const cinematicWorkspaces: CinematicWorkspace[] = ['story', 'production', 'final'];

const workspaceByStage: Record<CinematicStage, CinematicWorkspace> = {
  setup: 'story',
  cast: 'story',
  'story-plan': 'story',
  storyboard: 'production',
  produce: 'production',
  finish: 'final'
};

const stagesByWorkspace: Record<CinematicWorkspace, Record<'simple' | 'advanced', CinematicStage[]>> = {
  story: { simple: ['setup', 'cast'], advanced: ['setup', 'cast', 'story-plan'] },
  production: { simple: ['storyboard'], advanced: ['storyboard', 'produce'] },
  final: { simple: ['finish'], advanced: ['finish'] }
};

export function workspaceForCinematicStage(stage: CinematicStage): CinematicWorkspace {
  return workspaceByStage[stage];
}

export function stagesForCinematicWorkspace(workspace: CinematicWorkspace, mode: 'simple' | 'advanced'): CinematicStage[] {
  return stagesByWorkspace[workspace][mode];
}

export function entryStageForCinematicWorkspace(workspace: CinematicWorkspace, mode: 'simple' | 'advanced'): CinematicStage {
  return stagesForCinematicWorkspace(workspace, mode)[0]!;
}

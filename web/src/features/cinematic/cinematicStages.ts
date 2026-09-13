import type { z } from 'zod';
import { cinematicStageSchema } from './schemas/cinematicSchemas';

export type CinematicStage = z.infer<typeof cinematicStageSchema>;

export const cinematicStages: CinematicStage[] = [
  'setup',
  'cast',
  'story-plan',
  'storyboard',
  'produce',
  'finish'
];

export const simpleCinematicStages: CinematicStage[] = ['setup', 'cast', 'storyboard', 'finish'];

export function visibleCinematicStage(stage: CinematicStage, mode: 'simple' | 'advanced'): CinematicStage {
  return mode === 'simple' && ['story-plan', 'produce'].includes(stage) ? 'storyboard' : stage;
}

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

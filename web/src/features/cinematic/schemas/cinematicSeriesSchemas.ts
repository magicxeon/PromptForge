import { z } from 'zod';
import { cinematicProjectSchema, cinematicProjectSummarySchema } from './cinematicSchemas';

export const cinematicSeriesSchema = z.object({
  id: z.string().min(1), ownerUserId: z.string().min(1), title: z.string().min(1), version: z.number().int().positive(),
  seasons: z.array(z.object({ id: z.string().min(1), number: z.number().int().positive(), title: z.string() })).max(24),
  createdAt: z.string().datetime(), updatedAt: z.string().datetime()
});
export const cinematicSeriesWorkspaceSchema = z.object({ series: cinematicSeriesSchema.nullable(), chapters: z.array(cinematicProjectSummarySchema).max(120) });
export const cinematicSeriesMutationSchema = z.object({ project: cinematicProjectSchema, workspace: cinematicSeriesWorkspaceSchema });
export type CinematicSeriesWorkspace = z.infer<typeof cinematicSeriesWorkspaceSchema>;

export type SeriesCommand =
  | { kind: 'create'; title: string }
  | { kind: 'rename'; title: string; seasonId?: string }
  | { kind: 'season'; title: string }
  | { kind: 'chapter'; seasonId: string; title: string; storyBrief: string; copyCast: boolean };

import type { z } from 'zod';
import {
  cinematicProjectListResponseSchema,
  cinematicProjectSummarySchema
} from '../schemas/cinematicSchemas';

export const cinematicApiPaths = {
  projects: '/api/cinematic/projects',
  project: (projectId: string) => `/api/cinematic/projects/${encodeURIComponent(projectId)}`
} as const;

export const cinematicApiSchemas = {
  project: cinematicProjectSummarySchema,
  projectList: cinematicProjectListResponseSchema
} as const;

export type CinematicProjectSummary = z.infer<typeof cinematicProjectSummarySchema>;
export type CinematicProjectListResponse = z.infer<typeof cinematicProjectListResponseSchema>;

// C1 freezes the response boundary only. Network mutations begin with the
// private Project service in C2 so this module cannot dispatch paid work.

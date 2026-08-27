import { z } from 'zod';
import { apiRequest } from '../../../lib/api/apiClient';

const operationalProjectSchema = z.object({
  projectId: z.string(), ownerUserId: z.string(), ownerUsername: z.string(), title: z.string(),
  activeStage: z.string(), status: z.string(), sceneCount: z.number(), shotCount: z.number(),
  attemptCount: z.number(), staleAttemptCount: z.number(), updatedAt: z.string()
});
const projectPageSchema = z.object({
  items: z.array(operationalProjectSchema), nextCursor: z.string().nullable(), hasMore: z.boolean(),
  totalApprox: z.number().optional()
});
const taskSchema = z.object({
  id: z.string(), ownerUserId: z.string(), ownerUsername: z.string(), status: z.string(),
  projectId: z.string().nullable().optional(), sceneId: z.string().nullable().optional(), shotId: z.string().nullable().optional(), providerId: z.string(), modelId: z.string(),
  providerTaskId: z.string().nullable(), supportReference: z.string(), updatedAt: z.string()
}).passthrough();
const tasksSchema = z.object({
  items: z.array(taskSchema), nextCursor: z.string().nullable(), hasMore: z.boolean(),
  totalApprox: z.number().optional()
});
const capabilitiesSchema = z.object({
  schemaVersion: z.number(), catalogVersion: z.string(), models: z.array(z.object({
    providerId: z.string(), modelId: z.string(), displayName: z.string(), pricingStatus: z.string(),
    qualificationStatus: z.string(), paidRoutingEnabled: z.boolean()
  }).passthrough())
});

export type OperationalCinematicProject = z.infer<typeof operationalProjectSchema>;
export type OperationalVideoTask = z.infer<typeof taskSchema>;

export function parseOperationalVideoTasks(input: unknown) {
  return tasksSchema.parse(input);
}

export function listOperationalCinematicProjects(filters: { search?: string; status?: string; cursor?: string | null } = {}) {
  const query = buildQuery(filters);
  return apiRequest(`/api/admin/cinematic/projects?${query}`, { schema: projectPageSchema });
}

export function listOperationalVideoTasks(filters: { search?: string; status?: string; cursor?: string | null } = {}) {
  const query = buildQuery(filters);
  return apiRequest(`/api/admin/cinematic/video-tasks?${query}`, { schema: tasksSchema });
}

export function getOperationalVideoCapabilities() {
  return apiRequest('/api/admin/cinematic/video-capabilities', { schema: capabilitiesSchema });
}

function buildQuery(filters: Record<string, string | null | undefined>) {
  const query = new URLSearchParams({ limit: '25' });
  Object.entries(filters).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  return query;
}

import { getActorScope } from '../auth/actorStore';

export const queryKeys = {
  actor: ['actor'] as const,
  mockUsers: ['mock-users'] as const,
  features: ['community-features'] as const,
  credits: (actorId: string) => ['credits', getActorScope(actorId)] as const,
  ownCreatorProfile: (actorId: string) => ['own-creator-profile', getActorScope(actorId)] as const,
  communityPosts: (filters: Record<string, string>) => ['community-posts', filters] as const,
  communityPost: (postId: string, actorId: string) => ['community-post', postId, getActorScope(actorId)] as const,
  templateDetail: (actorId: string, postId: string, sort: string, limit: number) => ['community-template-detail', getActorScope(actorId), postId, sort, limit] as const,
  engagement: (postId: string, actorId: string) => ['community-engagement', postId, getActorScope(actorId)] as const,
  comments: (postId: string, actorId: string) => ['community-comments', postId, getActorScope(actorId)] as const,
  generationJob: (actorId: string, jobId: string | null) =>
    ['generation-job', getActorScope(actorId), jobId] as const,
  generationJobCenter: (actorId: string) => ['generation-job-center', getActorScope(actorId)] as const,
  cinematicProjects: (actorId: string) => ['cinematic-projects', getActorScope(actorId)] as const,
  cinematicProject: (actorId: string, projectId: string) =>
    ['cinematic-project', getActorScope(actorId), projectId] as const,
  comparison: (actorId: string, comparisonId: string | null) =>
    ['comparison', getActorScope(actorId), comparisonId] as const,
  comparisons: (actorId: string) => ['comparisons', getActorScope(actorId)] as const,
  fashionRun: (actorId: string, runId: string | null) =>
    ['fashion-run', getActorScope(actorId), runId] as const,
  creditLedger: (actorId: string) => ['credit-ledger', getActorScope(actorId)] as const,
  templatePoseProxy: (actorId: string, templateId: string | null) =>
    ['template-pose-proxy', getActorScope(actorId), templateId] as const
};

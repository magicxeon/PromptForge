export const queryKeys = {
  actor: ['actor'] as const,
  mockUsers: ['mock-users'] as const,
  features: ['community-features'] as const,
  credits: (actorId: string) => ['credits', actorId] as const,
  ownCreatorProfile: (actorId: string) => ['own-creator-profile', actorId] as const,
  communityPosts: (filters: Record<string, string>) => ['community-posts', filters] as const,
  communityPost: (postId: string, actorId: string) => ['community-post', postId, actorId] as const,
  templateDetail: (actorId: string, postId: string, sort: string, limit: number) => ['community-template-detail', actorId, postId, sort, limit] as const,
  engagement: (postId: string, actorId: string) => ['community-engagement', postId, actorId] as const,
  comments: (postId: string, actorId: string) => ['community-comments', postId, actorId] as const,
  generationJob: (actorId: string, jobId: string | null) =>
    ['generation-job', actorId, jobId] as const,
  generationJobCenter: (actorId: string) => ['generation-job-center', actorId] as const,
  comparison: (actorId: string, comparisonId: string | null) =>
    ['comparison', actorId, comparisonId] as const,
  comparisons: (actorId: string) => ['comparisons', actorId] as const,
  fashionRun: (actorId: string, runId: string | null) =>
    ['fashion-run', actorId, runId] as const,
  creditLedger: (actorId: string) => ['credit-ledger', actorId] as const,
  templatePoseProxy: (actorId: string, templateId: string | null) =>
    ['template-pose-proxy', actorId, templateId] as const
};

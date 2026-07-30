export const queryKeys = {
  actor: ['actor'] as const,
  mockUsers: ['mock-users'] as const,
  features: ['community-features'] as const,
  credits: (actorId: string) => ['credits', actorId] as const,
  ownCreatorProfile: (actorId: string) => ['own-creator-profile', actorId] as const,
  communityPosts: (filters: Record<string, string>) => ['community-posts', filters] as const,
  communityPost: (postId: string, actorId: string) => ['community-post', postId, actorId] as const,
  engagement: (postId: string, actorId: string) => ['community-engagement', postId, actorId] as const,
  comments: (postId: string, actorId: string) => ['community-comments', postId, actorId] as const
};

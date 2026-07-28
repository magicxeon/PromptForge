import { z } from 'zod';

const nullableText = z.string().nullable().optional();
const count = z.number().int().nonnegative().default(0);

export const engagementSummarySchema = z.object({
  viewCount: count,
  likeCount: count,
  saveCount: count,
  commentCount: count,
  remixSuccessCount: count,
  comparisonVoteCount: count,
  updatedAt: nullableText
});

const creatorSchema = z.object({
  username: nullableText,
  displayName: z.string().default('Creator'),
  profileId: nullableText,
  handle: nullableText
});

const comparisonSlotSchema = z.object({
  slotId: z.string(),
  position: z.number().nullable().optional(),
  providerDisplayName: nullableText,
  modelDisplayName: nullableText,
  imageUrl: z.string(),
  thumbnailUrl: z.string(),
  status: z.enum(['completed', 'failed', 'cancelled']).default('completed'),
  generationDuration: z.union([z.string(), z.number()]).nullable().optional()
});

const collectionItemSchema = z.object({
  itemId: z.string(),
  imageUrl: nullableText,
  thumbnailUrl: nullableText,
  providerDisplayName: nullableText,
  modelDisplayName: nullableText,
  createdAt: nullableText
});

export const communityPostSchema = z.object({
  id: z.string(),
  postType: z.enum(['image', 'template', 'comparison', 'collection']),
  creator: creatorSchema,
  title: z.string().default(''),
  description: z.string().default(''),
  imageUrl: nullableText,
  thumbnailUrl: nullableText,
  officialTags: z.array(z.string()).default([]),
  customTags: z.array(z.string()).default([]),
  promptVisibility: z.string().default('hidden'),
  promptPreview: nullableText,
  providerModelDisplay: nullableText,
  generationMetadata: z.object({
    aspectRatio: nullableText,
    width: z.number().nullable().optional(),
    height: z.number().nullable().optional(),
    resolution: nullableText
  }).default({}),
  remixAvailability: z.boolean().default(false),
  templateAvailability: z.boolean().default(false),
  comparisonSnapshot: z.object({
    criteria: nullableText,
    slots: z.array(comparisonSlotSchema).default([])
  }).nullable().default(null),
  collectionSnapshot: z.object({
    itemCount: count,
    items: z.array(collectionItemSchema).default([])
  }).nullable().default(null),
  engagementSummary: engagementSummarySchema,
  createdAt: nullableText,
  viewer: z.object({
    isOwner: z.boolean().default(false),
    permissions: z.object({
      canVoteComparison: z.boolean().default(false),
      canReport: z.boolean().default(false),
      canUsePrivateReferences: z.boolean().default(false),
      canDownloadPrivateOutput: z.boolean().default(false)
    })
  }).optional(),
  ranking: z.object({
    rank: z.number(),
    score: z.number(),
    metrics: z.record(z.string(), z.number()).optional()
  }).optional()
});

export const communityFeedPageSchema = z.object({
  items: z.array(communityPostSchema),
  ranking: z.object({
    sort: z.string(),
    period: z.string(),
    officialTag: nullableText,
    windowStart: z.string(),
    windowEnd: z.string(),
    algorithmVersion: z.string(),
    calculatedAt: z.string()
  }),
  facets: z.unknown().optional(),
  nextCursor: nullableText,
  hasMore: z.boolean()
});

const voteSummarySchema = z.object({
  total: count,
  bySlot: z.array(z.object({ slotId: z.string(), count })),
  highestCount: count,
  leaderSlotIds: z.array(z.string()),
  actorSlotId: nullableText
});

export const engagementResponseSchema = z.object({
  postId: z.string(),
  summary: engagementSummarySchema,
  viewerState: z.object({
    liked: z.boolean(),
    saved: z.boolean(),
    comparisonVoteSlotId: nullableText
  }),
  voteSummary: voteSummarySchema
});

export const reactionResponseSchema = z.object({
  changed: z.boolean(),
  active: z.boolean(),
  summary: engagementSummarySchema
});

export const commentSchema = z.object({
  id: z.string(),
  postId: z.string(),
  author: z.object({ displayName: z.string().default('Creator') }),
  body: z.string(),
  createdAt: z.string(),
  updatedAt: z.string().nullable().optional(),
  viewerCanDelete: z.boolean().optional()
});

export const commentPageSchema = z.object({
  items: z.array(commentSchema),
  nextCursor: nullableText,
  hasMore: z.boolean().default(false)
}).passthrough();

export const createCommentResponseSchema = z.object({
  comment: commentSchema,
  summary: engagementSummarySchema
});

export const deleteCommentResponseSchema = z.object({
  changed: z.boolean(),
  summary: engagementSummarySchema
});

export const templateHandoffSchema = z.object({
  postId: z.string(),
  sceneTemplateSnapshot: z.record(z.string(), z.unknown())
}).passthrough();

export type CommunityPost = z.infer<typeof communityPostSchema>;
export type EngagementResponse = z.infer<typeof engagementResponseSchema>;
export type CommunityComment = z.infer<typeof commentSchema>;

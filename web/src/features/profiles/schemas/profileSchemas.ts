import { z } from 'zod';
import { communityPostSchema } from '../../community/schemas/communitySchemas';

const pageSchema = <T extends z.ZodTypeAny>(item: T) => z.object({
  items: z.array(item).default([]),
  nextCursor: z.string().nullable().optional(),
  hasMore: z.boolean().default(false),
  totalApprox: z.number().optional()
}).passthrough();

export const characterSummarySchema = z.object({
  id: z.string(),
  displayName: z.string(),
  personalitySummary: z.string().default(''),
  shortDescription: z.string().optional(),
  intendedUses: z.array(z.string()).default([]),
  characterType: z.enum(['reusable_model', 'styled_character']).default('reusable_model'),
  destinationCapabilities: z.array(z.string()).default([]),
  outfitBehavior: z.string().optional(),
  ownerUsername: z.string().nullable().optional(),
  reusePolicy: z.string().default('view_only'),
  reuseStatus: z.string().default('view_only'),
  handoffAvailable: z.boolean().default(false),
  imageUrl: z.string().nullable().optional(),
  thumbnailUrl: z.string().nullable().optional(),
  faceThumbnailUrl: z.string().nullable().optional(),
  displayImageUrl: z.string().nullable().optional(),
  displayImageSource: z.string().optional(),
  featuredImageMode: z.enum(['auto', 'manual']).default('auto'),
  featuredImageSourceType: z.enum(['generation_result', 'community_post']).nullable().default(null),
  featuredGenerationResultId: z.string().nullable().default(null),
  featuredWorkPostId: z.string().nullable().default(null),
  characterProfileVersionId: z.string().default(''),
  identityFacets: z.object({
    presentationGender: z.string().nullable(),
    ageRange: z.object({
      minimum: z.number().nullable(),
      maximum: z.number().nullable(),
      label: z.string().nullable()
    }).nullable(),
    ethnicity: z.string().nullable()
  }).optional(),
  stats: z.object({
    totalOutputs: z.number().default(0),
    byUseCase: z.object({
      fashion: z.number().default(0),
      sceneStory: z.number().default(0),
      other: z.number().default(0)
    }).default({ fashion: 0, sceneStory: 0, other: 0 })
  }).default({
    totalOutputs: 0,
    byUseCase: { fashion: 0, sceneStory: 0, other: 0 }
  })
}).passthrough();

export const profileMediaItemSchema = z.object({
  id: z.string(),
  title: z.string().default(''),
  description: z.string().default(''),
  imageUrl: z.string().nullable().optional(),
  thumbnailUrl: z.string().nullable().optional()
}).passthrough();

export const characterDirectorySchema = pageSchema(characterSummarySchema);
export const characterDetailSchema = characterSummarySchema.extend({
  createdAt: z.string().nullable().optional(),
  updatedAt: z.string().nullable().optional(),
  isOwner: z.boolean().default(false),
  recordVersion: z.number().optional()
});
export const ownerCharacterDetailSchema = characterDetailSchema.extend({
  status: z.string().optional(),
  visibility: z.string().optional(),
  personality: z.string().optional(),
  reusePolicy: z.string().optional(),
  rightsDeclarationAcceptedAt: z.string().nullable().optional(),
  lifecycleStatus: z.string().optional()
}).passthrough();
export const characterWorksSchema = pageSchema(communityPostSchema);
export const characterFeaturedImageCandidateSchema = z.object({
  id: z.string(),
  sourceType: z.enum(['generation_result', 'community_post']),
  sourceId: z.string(),
  generationResultId: z.string(),
  postId: z.string().nullable(),
  ownership: z.enum(['owner', 'community']),
  title: z.string(),
  imageUrl: z.string().nullable().optional(),
  thumbnailUrl: z.string().nullable().optional(),
  createdAt: z.string()
});
export const characterFeaturedImageCandidatesSchema = pageSchema(characterFeaturedImageCandidateSchema);
export const characterFeaturedImageUpdateSchema = z.object({
  characterProfileId: z.string(),
  recordVersion: z.number(),
  featuredImageMode: z.enum(['auto', 'manual']),
  featuredImageSourceType: z.enum(['generation_result', 'community_post']).nullable(),
  featuredGenerationResultId: z.string().nullable(),
  featuredWorkPostId: z.string().nullable()
});

const profileSchema = z.object({
  id: z.string(),
  handle: z.string(),
  displayName: z.string(),
  bio: z.string().default(''),
  profileTheme: z.enum(['default', 'fashion', 'creative']).default('default'),
  headline: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
  coverImageUrl: z.string().nullable().optional(),
  creatorRoles: z.array(z.string()).default([]),
  locationText: z.string().nullable().optional(),
  websiteUrl: z.string().nullable().optional(),
  languageCodes: z.array(z.string()).default([]),
  contentCategoryCodes: z.array(z.string()).default([]),
  badgeCodes: z.array(z.string()).default([]),
  createdAt: z.string().nullable().optional()
});

export const creatorPageSchema = z.object({
  schemaVersion: z.number(),
  profile: profileSchema,
  viewer: z.object({
    isOwner: z.boolean(),
    isFollowing: z.boolean(),
    canEditProfile: z.boolean(),
    canManageContent: z.boolean(),
    canFollow: z.boolean(),
    canReport: z.boolean()
  }),
  counts: z.record(z.string(), z.number()),
  statistics: z.record(z.string(), z.union([z.number(), z.string()])),
  capabilities: z.object({
    availableTabs: z.array(z.string()),
    defaultTab: z.string(),
    managementAvailable: z.boolean()
  }),
  selectedTab: z.string(),
  tabData: z.object({
    kind: z.string(),
    page: z.object({
      items: z.array(z.union([
        communityPostSchema,
        characterSummarySchema,
        profileMediaItemSchema
      ])).default([]),
      nextCursor: z.string().nullable().optional(),
      hasMore: z.boolean().default(false),
      totalApprox: z.number().optional()
    }).passthrough().optional()
  }).passthrough(),
  overview: z.object({
    sectionOrder: z.array(z.string()),
    featured: z.object({ items: z.array(communityPostSchema) }),
    gallery: z.object({ items: z.array(profileMediaItemSchema) }),
    videos: z.object({ items: z.array(communityPostSchema) }),
    characters: z.object({ items: z.array(characterSummarySchema) }),
    templates: z.object({ items: z.array(communityPostSchema) }),
    comparisons: z.object({ items: z.array(communityPostSchema) }),
    latestCollection: communityPostSchema.nullable()
  }).nullable(),
  management: z.object({
    recordVersion: z.number(),
    presentation: z.object({
      profileTheme: z.enum(['default', 'fashion', 'creative']).default('default')
    }).passthrough()
  }).passthrough().nullable()
});

export const followResponseSchema = z.object({
  changed: z.boolean().optional(),
  isFollowing: z.boolean().optional(),
  followerCount: z.number().optional()
}).passthrough();

export const characterHandoffSchema = z.object({
  handoffVersion: z.number(),
  destination: z.enum(['fashion_blueprint', 'scene_builder']),
  characterProfileId: z.string(),
  characterProfileVersionId: z.string(),
  characterReferenceAssetId: z.string(),
  characterReferenceUrl: z.string(),
  displayName: z.string(),
  personalitySummarySnapshot: z.string().default(''),
  intendedUsesSnapshot: z.array(z.string()).default([]),
  characterType: z.string(),
  outfitBehavior: z.string(),
  characterProfileContext: z.record(z.string(), z.unknown())
}).passthrough();

export type CreatorPage = z.infer<typeof creatorPageSchema>;
export type CharacterSummary = z.infer<typeof characterSummarySchema>;
export type CharacterFeaturedImageCandidate = z.infer<typeof characterFeaturedImageCandidateSchema>;

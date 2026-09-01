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

const characterLookProvenanceSchema = z.object({
  kind: z.enum(['system_generated', 'user_uploaded', 'legacy_unknown']),
  characterProfileId: z.string(),
  characterProfileVersionId: z.string(),
  sourceAssetIds: z.array(z.string()).default([]),
  generationResultId: z.string().nullable(),
  generationJobId: z.string().nullable(),
  recipeId: z.string().nullable(),
  recipeVersion: z.number().int().positive().nullable(),
  recipeFingerprint: z.string().nullable(),
  provider: z.string().nullable(),
  model: z.string().nullable(),
  recordedAt: z.string()
});

const characterLookIdentityAssuranceSchema = z.object({
  status: z.enum([
    'unverified', 'user_confirmed', 'lineage_bound', 'validated',
    'validation_failed', 'legacy_unknown'
  ]),
  characterProfileVersionId: z.string(),
  validationEvidenceId: z.string().nullable(),
  updatedAt: z.string()
});

const characterLookRightsDeclarationSchema = z.object({
  accepted: z.literal(true),
  acceptedByUserId: z.string(),
  acceptedAt: z.string(),
  policyVersion: z.string()
});

export const characterLookVersionSchema = z.object({
  id: z.string(),
  versionNumber: z.number(),
  sourceMode: z.enum(['character_default', 'uploaded', 'uploaded_character_sheet', 'ai_suggestion']),
  sourceSheetAssetId: z.string().nullable().optional(),
  garmentAuthorities: z.record(z.string(), z.record(z.string(), z.string())).default({}),
  canonicalFaceAssetId: z.string().nullable(),
  status: z.enum(['source_ready', 'review', 'approved', 'superseded', 'retired']),
  approvedViewAssets: z.record(z.string(), z.unknown()).nullable(),
  approvedSheetAsset: z.object({ assetId: z.string(), contentHash: z.string().nullable() }).nullable().optional(),
  cropManifest: z.object({
    layoutVersion: z.string(),
    regions: z.record(z.string(), z.object({
      x: z.number(), y: z.number(), width: z.number(), height: z.number()
    }))
  }).nullable().optional(),
  provenance: characterLookProvenanceSchema.nullable().optional(),
  identityAssurance: characterLookIdentityAssuranceSchema.nullable().optional(),
  rightsDeclaration: characterLookRightsDeclarationSchema.nullable().optional(),
  reviewMediaUrl: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  approvedAt: z.string().nullable()
}).passthrough();

export const characterLookSchema = z.object({
  id: z.string(),
  characterProfileId: z.string(),
  sourceCharacterProfileVersionId: z.string(),
  name: z.string(),
  description: z.string().default(''),
  tags: z.array(z.string()).default([]),
  official: z.boolean(),
  visibility: z.string(),
  lifecycleStatus: z.enum(['draft', 'review', 'approved', 'retired']),
  activeVersionId: z.string(),
  approvedVersionId: z.string().nullable(),
  versions: z.array(characterLookVersionSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
  retiredAt: z.string().nullable(),
  suggestionSnapshot: z.record(z.string(), z.unknown()).nullable().optional(),
  workflowState: z.enum([
    'source_ready', 'generation_ready', 'generation_active', 'generation_completed',
    'review_ready', 'approved_unbound', 'approved_bound', 'failed_recoverable', 'retired'
  ]).optional(),
  capabilities: z.object({
    characterMatchCheck: z.object({
      available: z.boolean(),
      qualified: z.boolean(),
      reason: z.string()
    })
  }).optional()
}).passthrough();

export const characterLooksResponseSchema = z.object({ items: z.array(characterLookSchema) });
export type CharacterLook = z.infer<typeof characterLookSchema>;

export const characterLookGenerationPlanSchema = z.object({
  operation: z.literal('character_look_sheet'),
  recipe: z.object({
    id: z.string(),
    version: z.number().int().positive(),
    fingerprint: z.string()
  }),
  prompt: z.string(),
  references: z.object({
    outfit_front: z.string().optional(),
    outfit_back: z.string().optional()
  }),
  characterProfileContext: z.record(z.string(), z.unknown()),
  output: z.object({
    aspectRatio: z.string(),
    outputCount: z.literal(1)
  }),
  source: z.object({
    characterProfileId: z.string(),
    characterProfileVersionId: z.string(),
    lookId: z.string(),
    lookVersionId: z.string()
  })
});
export type CharacterLookGenerationPlan = z.infer<typeof characterLookGenerationPlanSchema>;

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

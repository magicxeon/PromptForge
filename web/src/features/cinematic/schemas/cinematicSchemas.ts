import { z } from 'zod';
import { videoQuoteSchema, videoTaskSchema } from '../../generation/schemas/videoGenerationSchemas';

export const cinematicStageSchema = z.enum([
  'setup',
  'cast',
  'story-plan',
  'storyboard',
  'produce',
  'finish'
]);

export const cinematicStoryRoleSlotSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(80),
  importance: z.enum(['required', 'optional']),
  storyFunction: z.string().max(240),
  relationshipHint: z.string().max(160),
  objective: z.string().max(240).optional(),
  emotionalArc: z.string().max(240).optional(),
  personalityTraits: z.array(z.string().max(80)).max(6).optional(),
  performanceDirection: z.string().max(320).optional()
});

export const cinematicSetupDraftSchema = z.object({
  clientDraftId: z.string().min(1),
  projectName: z.string().max(120),
  format: z.literal('short-film'),
  platform: z.enum(['tiktok', 'youtube-shorts', 'reels', 'multi-platform']),
  durationSeconds: z.union([z.literal(20), z.literal(30), z.literal(45), z.literal(60)]),
  storyBrief: z.string().max(600),
  creativeDirection: z.string().max(800),
  genre: z.enum(['drama', 'romance', 'comedy', 'thriller', 'fashion']),
  audienceFeeling: z.enum(['moved', 'excited', 'curious', 'uplifted', 'surprised']),
  pacing: z.enum(['slow', 'balanced', 'fast']),
  endingIntent: z.enum(['resolved', 'hopeful', 'twist', 'cliffhanger']),
  mode: z.enum(['simple', 'advanced']),
  castPlanningMode: z.enum(['ai-recommended', 'solo', 'duo', 'manual']).default('ai-recommended'),
  storyRoleSlots: z.array(cinematicStoryRoleSlotSchema).max(4).default([]),
  activeStage: cinematicStageSchema,
  updatedAt: z.string()
});

export type CinematicSetupDraft = z.infer<typeof cinematicSetupDraftSchema>;

export const cinematicStoryEnhancementSchema = z.object({
  enhancementId: z.string().min(1),
  enhancedStoryBrief: z.string().min(1).max(600),
  creativeDirection: z.string().max(800),
  premise: z.string(),
  conflict: z.string(),
  emotionalArc: z.string(),
  ending: z.string(),
  candidateScenes: z.array(z.string()).max(5),
  recommendedRoles: z.array(cinematicStoryRoleSlotSchema).min(1).max(4),
  warnings: z.array(z.string()),
  provenance: z.object({ provider: z.string(), model: z.string(), responseId: z.string().nullable() }),
  billingStatus: z.literal('qualification_no_charge')
});

export type CinematicStoryEnhancement = z.infer<typeof cinematicStoryEnhancementSchema>;

export const cinematicWardrobeSuggestionSchema = z.object({
  lookName: z.string().min(1).max(100),
  wardrobeDirection: z.string().min(1).max(1200),
  garments: z.object({
    upper: z.string(), lower: z.string(), outerwear: z.string(), footwear: z.string(),
    accessories: z.array(z.string())
  }),
  palette: z.array(z.string()),
  materials: z.array(z.string()),
  sceneScope: z.enum(['film_wide', 'scene_specific']),
  recommendedSceneIds: z.array(z.string()),
  rationale: z.string(),
  movementConstraints: z.array(z.string()),
  continuityNotes: z.array(z.string()),
  warnings: z.array(z.string()),
  provenance: z.object({
    provider: z.string(), model: z.string(), responseId: z.string().nullable(),
    recipeId: z.string(), recipeVersion: z.number().int(), recipeFingerprint: z.string()
  }),
  billingStatus: z.literal('qualification_no_charge')
});

export type CinematicWardrobeSuggestion = z.infer<typeof cinematicWardrobeSuggestionSchema>;

export const cinematicVideoCapabilitySchema = z.object({
  providerId: z.string().min(1),
  modelId: z.string().min(1),
  displayName: z.string().min(1),
  resolutions: z.array(z.string()).min(1),
  aspectRatios: z.array(z.string()).min(1),
  durationsSeconds: z.array(z.number().int().positive()).min(1),
  audioModes: z.array(z.enum(['none', 'generated'])),
  paidRoutingEnabled: z.literal(false)
});

export const cinematicLifecycleEventSchema = z.object({
  eventId: z.string().min(1),
  requestId: z.string().min(1),
  correlationId: z.string().min(1),
  actorId: z.string().min(1),
  projectId: z.string().nullable(),
  sceneId: z.string().nullable(),
  shotId: z.string().nullable(),
  attemptId: z.string().nullable(),
  generationGroupId: z.string().nullable(),
  jobId: z.string().nullable(),
  providerOperationId: z.string().nullable(),
  providerTaskId: z.string().nullable(),
  quoteId: z.string().nullable(),
  reservationId: z.string().nullable(),
  settlementId: z.string().nullable(),
  assetId: z.string().nullable(),
  exportId: z.string().nullable(),
  supportCaseId: z.string().nullable(),
  supportCommandId: z.string().nullable(),
  eventType: z.string().min(1),
  occurredAt: z.string().datetime()
});

export const cinematicProjectSummarySchema = z.object({
  projectId: z.string().min(1),
  ownerUserId: z.string().min(1),
  title: z.string().min(1),
  activeStage: cinematicStageSchema,
  durationSeconds: z.number().int().positive(),
  status: z.enum(['draft', 'planning', 'planned', 'storyboard_ready', 'production_ready', 'producing', 'review', 'finalizing', 'finishing', 'completed', 'failed_recoverable', 'archived']),
  updatedAt: z.string().datetime()
});

export const cinematicProjectListResponseSchema = z.object({
  items: z.array(cinematicProjectSummarySchema),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
  totalApprox: z.number().optional()
});

export const cinematicCastAssignmentSchema = z.object({
  id: z.string().min(1),
  characterProfileId: z.string().min(1),
  characterProfileVersionId: z.string().min(1),
  portraitUrl: z.string().nullable().optional(),
  displayName: z.string().min(1),
  storyRole: z.string(),
  storyRoleSlotId: z.string().nullable().optional(),
  storyImportance: z.enum(['protagonist', 'supporting']),
  objective: z.string(),
  motivation: z.string(),
  pressure: z.string(),
  personalityTraits: z.array(z.string()),
  emotionalBaseline: z.string(),
  dialogueStyle: z.string(),
  performanceDirection: z.string(),
  identityReady: z.boolean(),
  identityReadinessSnapshot: z.object({
    status: z.string(),
    ageRange: z.unknown().nullable().optional(),
    presentationGender: z.unknown().nullable().optional(),
    characterType: z.string().optional(),
    outfitBehavior: z.string().optional(),
    identityPolicyVersion: z.string().optional()
  }).nullable().optional(),
  apparentAgeRange: z.unknown().nullable(),
  looks: z.array(z.unknown()),
  active: z.boolean(),
  updatedAt: z.string().datetime()
});

export const cinematicApprovedStoryboardSourceSchema = z.object({
  assetId: z.string().min(1),
  assetVersionId: z.string().min(1),
  sourceJobId: z.string().min(1),
  imageUrl: z.string().min(1),
  thumbnailUrl: z.string().min(1),
  contentHash: z.string(),
  sourceFingerprint: z.string().min(1),
  approvedAt: z.string().datetime()
});

export const cinematicShotSchema = z.object({
  id: z.string().min(1),
  version: z.number().int().positive(),
  orderKey: z.number(),
  title: z.string(),
  purpose: z.string(),
  durationMs: z.number().int().positive(),
  framing: z.string(),
  cameraAngle: z.string(),
  cameraMovement: z.string(),
  lensIntent: z.string(),
  blocking: z.string(),
  performance: z.string(),
  gaze: z.string(),
  lighting: z.string(),
  environment: z.string(),
  audioIntent: z.string(),
  prompt: z.string(),
  castAssignmentIds: z.array(z.string()),
  wardrobeLookIds: z.array(z.string()),
  continuityNotes: z.array(z.string()),
  storyboardStatus: z.string(),
  approvedStoryboardSource: cinematicApprovedStoryboardSourceSchema.optional(),
  approvedStoryboardAttemptId: z.string().optional(),
  approvedVideoAttemptId: z.string().nullable().optional(),
  approvedVideoSourceFingerprint: z.string().nullable().optional()
});

export const cinematicSceneSchema = z.object({
  id: z.string().min(1),
  version: z.number().int().positive(),
  orderKey: z.number(),
  title: z.string(),
  purpose: z.string(),
  location: z.string(),
  time: z.string(),
  emotionalStart: z.string(),
  emotionalEnd: z.string(),
  transitionIntent: z.string(),
  castAssignmentIds: z.array(z.string()),
  shots: z.array(cinematicShotSchema),
  shotOrder: z.array(z.string()),
  durationMs: z.number().int().nonnegative()
});

export const cinematicProjectSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  schemaVersion: z.number().int().positive(),
  version: z.number().int().positive(),
  ownerUserId: z.string().min(1),
  ownerUsername: z.string().min(1),
  title: z.string().min(1),
  format: z.literal('short-film'),
  platformTargets: z.array(z.string()).min(1),
  aspectRatio: z.string().min(1),
  durationTargetMs: z.number().int().positive(),
  activeStage: cinematicStageSchema,
  status: cinematicProjectSummarySchema.shape.status,
  setup: z.object({
    title: z.string(),
    format: z.literal('short-film'),
    platform: cinematicSetupDraftSchema.shape.platform,
    durationSeconds: cinematicSetupDraftSchema.shape.durationSeconds,
    storyBrief: z.string(),
    creativeDirection: z.string(),
    genre: cinematicSetupDraftSchema.shape.genre,
    audienceFeeling: cinematicSetupDraftSchema.shape.audienceFeeling,
    pacing: cinematicSetupDraftSchema.shape.pacing,
    endingIntent: cinematicSetupDraftSchema.shape.endingIntent,
    mode: cinematicSetupDraftSchema.shape.mode,
    castPlanningMode: cinematicSetupDraftSchema.shape.castPlanningMode,
    storyRoleSlots: cinematicSetupDraftSchema.shape.storyRoleSlots
  }),
  storySourceVersions: z.array(z.unknown()),
  activeStorySourceVersionId: z.string().min(1),
  castAssignments: z.array(cinematicCastAssignmentSchema),
  storyPlanVersions: z.array(z.unknown()),
  scenes: z.array(cinematicSceneSchema),
  generationAttempts: z.array(z.unknown()),
  timelineVersions: z.array(z.unknown()),
  commandReceipts: z.array(z.unknown()).optional(),
  activeStoryPlanVersionId: z.string().nullable().optional(),
  activeTimelineVersionId: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  archivedAt: z.string().datetime().nullable()
});

export const cinematicArchiveResponseSchema = z.object({
  success: z.literal(true),
  projectId: z.string().min(1)
});

export const cinematicProduceShotContextSchema = z.object({
  projectId: z.string().min(1),
  projectVersion: z.number().int().positive(),
  sceneId: z.string().min(1),
  shotId: z.string().min(1),
  shotVersion: z.number().int().positive(),
  approvedStoryboardSource: cinematicApprovedStoryboardSourceSchema.nullable(),
  generationEligible: z.boolean(),
  blockingReason: z.string().nullable(),
  videoAttempts: z.array(z.object({
    id: z.string(), operation: z.string(), status: z.string(),
    generationJobId: z.string().nullable().optional(),
    providerTaskId: z.string().nullable().optional(),
    providerId: z.string().nullable().optional(),
    modelId: z.string().nullable().optional(),
    quoteId: z.string().nullable().optional(),
    reservationId: z.string().nullable().optional(),
    outputAsset: z.object({
      publicUrl: z.string(),
      posterUrl: z.string().nullable().optional()
    }).passthrough().nullable().optional(),
    reviewDecision: z.string().optional(),
    downstreamSourceStatus: z.enum(['current', 'source_changed', 'source_unavailable'])
  })),
  timelineDependencyStatus: z.enum(['current', 'source_changed', 'source_unavailable'])
});

export const cinematicVideoQuoteSchema = videoQuoteSchema.extend({
  projectId: z.string(),
  sceneId: z.string(),
  shotId: z.string(),
  shotVersion: z.number().int().positive(),
  sourceFingerprint: z.string(),
  approvedStoryboardAssetVersionId: z.string()
});

export const cinematicVideoAttemptResponseSchema = z.object({
  attemptId: z.string(),
  task: videoTaskSchema
});

export type CinematicVideoCapability = z.infer<typeof cinematicVideoCapabilitySchema>;
export type CinematicProject = z.infer<typeof cinematicProjectSchema>;
export type CinematicCastAssignment = z.infer<typeof cinematicCastAssignmentSchema>;
export type CinematicScene = z.infer<typeof cinematicSceneSchema>;
export type CinematicShot = z.infer<typeof cinematicShotSchema>;
export type CinematicProduceShotContext = z.infer<typeof cinematicProduceShotContextSchema>;

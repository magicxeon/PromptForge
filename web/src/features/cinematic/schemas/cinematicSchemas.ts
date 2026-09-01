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

export const cinematicStoryboardGenerationContextSchema = z.object({
  schemaVersion: z.literal(1),
  projectId: z.string(),
  projectVersion: z.number().int().positive(),
  sceneId: z.string(),
  shotId: z.string(),
  shotVersion: z.number().int().positive(),
  characterProfileContext: z.record(z.string(), z.unknown()).nullable(),
  references: z.object({
    outfit_front: z.string().nullable(),
    outfit_back: z.string().nullable(),
    style_reference: z.string().nullable()
  }),
  cast: z.array(z.object({
    assignmentId: z.string(), displayName: z.string(), storyRole: z.string(), identityReady: z.boolean()
  })),
  looks: z.array(z.object({
    lookId: z.string(), assignmentId: z.string(), name: z.string(), locked: z.boolean()
  })),
  continuitySource: z.object({ shotId: z.string(), sourceFingerprint: z.string() }).nullable(),
  generationEligible: z.boolean(),
  blockingReason: z.string().nullable()
});

export const cinematicStoryboardBatchResponseSchema = z.object({
  batchId: z.string(),
  groupId: z.string(),
  status: z.string(),
  requestedOutputCount: z.number().int().positive(),
  acceptedCount: z.number().int().nonnegative(),
  failedCount: z.number().int().nonnegative(),
  children: z.array(z.object({
    operationId: z.string().nullable(),
    sceneId: z.string().nullable(),
    shotId: z.string().nullable(),
    jobId: z.string(),
    status: z.string(),
    error: z.object({
      code: z.string().optional(),
      message: z.string().optional()
    }).nullable().optional()
  }))
});

export const cinematicShotSchema = z.object({
  id: z.string().min(1),
  version: z.number().int().positive(),
  orderKey: z.number(),
  title: z.string(),
  purpose: z.string(),
  visibleMoment: z.string().optional(),
  subjectAction: z.string().optional(),
  emotionalTarget: z.string().optional(),
  performanceCue: z.string().optional(),
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
  continuityEntry: z.string().optional(),
  continuityExit: z.string().optional(),
  transitionToNext: z.string().optional(),
  estimatedActionDurationMs: z.number().int().nonnegative().optional(),
  dialogueCues: z.array(z.object({
    speakerCastAssignmentId: z.string(),
    offscreenVoiceRole: z.string(),
    text: z.string(),
    delivery: z.string(),
    startOffsetMs: z.number().int().nonnegative(),
    estimatedDurationMs: z.number().int().nonnegative(),
    speakerVisible: z.boolean()
  })).optional(),
  audioCues: z.array(z.object({
    kind: z.string(),
    source: z.string(),
    description: z.string(),
    startOffsetMs: z.number().int().nonnegative(),
    durationMs: z.number().int().nonnegative()
  })).optional(),
  castAssignmentIds: z.array(z.string()),
  wardrobeLookIds: z.array(z.string()),
  continuityNotes: z.array(z.string()),
  storyboardStatus: z.string(),
  approvedStoryboardSource: cinematicApprovedStoryboardSourceSchema.optional(),
  approvedStoryboardAttemptId: z.string().optional(),
  approvedVideoAttemptId: z.string().nullable().optional(),
  approvedVideoSourceFingerprint: z.string().nullable().optional()
});

export const cinematicStoryBeatSchema = z.object({
  id: z.string().min(1),
  orderKey: z.number().optional().default(0),
  type: z.string().optional().default('development'),
  title: z.string(),
  purpose: z.string().optional().default(''),
  storyChange: z.string().optional().default(''),
  cause: z.string().optional(),
  consequence: z.string().optional(),
  emotionalStart: z.string().optional().default(''),
  emotionalTurn: z.string().optional(),
  emotionalEnd: z.string().optional().default(''),
  requiredElements: z.array(z.string()).optional(),
  targetDurationMs: z.number().int().nonnegative().optional().default(0),
  sceneIds: z.array(z.string()).optional().default([])
});

export const cinematicSceneSchema = z.object({
  id: z.string().min(1),
  version: z.number().int().positive(),
  orderKey: z.number(),
  beatId: z.string().optional().default(''),
  title: z.string(),
  purpose: z.string(),
  storyChange: z.string().optional().default(''),
  entryState: z.string().optional(),
  exitState: z.string().optional(),
  objective: z.string().optional(),
  pressure: z.string().optional(),
  location: z.string(),
  time: z.string(),
  emotionalStart: z.string(),
  emotionalEnd: z.string(),
  transitionIntent: z.string(),
  castAssignmentIds: z.array(z.string()),
  wardrobeLookIds: z.array(z.string()).optional().default([]),
  blocking: z.string().optional().default(''),
  lighting: z.string().optional().default(''),
  performance: z.string().optional().default(''),
  audioIntent: z.string().optional().default(''),
  propContinuity: z.string().optional(),
  screenDirection: z.string().optional(),
  continuityNotes: z.array(z.string()).optional().default([]),
  shots: z.array(cinematicShotSchema),
  shotOrder: z.array(z.string()),
  durationMs: z.number().int().nonnegative()
});

export const cinematicStoryPlanVersionSchema = z.object({
  id: z.string().min(1),
  version: z.number().int().positive(),
  parentVersionId: z.string().nullable(),
  storySourceVersionId: z.string().min(1),
  objective: z.string(),
  logline: z.string(),
  beats: z.array(cinematicStoryBeatSchema),
  emotionalArc: z.string(),
  centralDramaticQuestion: z.string().optional(),
  storyPromise: z.string().optional(),
  finalPayoff: z.string().optional(),
  spokenLanguage: z.string().optional(),
  onScreenTextPolicy: z.string().optional(),
  dialoguePolicy: z.enum(['none', 'sparse', 'normal', 'dialogue-led']).optional(),
  characterAliases: z.array(z.object({ castAssignmentId: z.string(), storyCharacterName: z.string() })).optional(),
  directorOperation: z.enum(['generate', 'review_current', 'manual']).optional(),
  directorSummary: z.string().optional(),
  directorFindings: z.array(z.lazy(() => cinematicFilmReadinessFindingSchema)).optional(),
  sourceResolution: z.enum(['story_brief', 'creative_direction']).nullable().optional(),
  warningsAcknowledged: z.boolean().optional(),
  filmReadiness: z.lazy(() => cinematicFilmReadinessSchema).optional(),
  scriptPreview: z.array(z.lazy(() => cinematicFilmScriptEntrySchema)).optional(),
  sceneIds: z.array(z.string()),
  estimatedDurationMs: z.number().int().nonnegative(),
  estimatedShotCount: z.number().int().nonnegative(),
  warnings: z.array(z.string()),
  source: z.enum(['manual', 'generated']),
  status: z.enum(['draft', 'approved', 'superseded', 'source_changed']),
  contractVersion: z.enum(['story-plan-v3', 'story-plan-v2', 'legacy']).optional(),
  createdAt: z.string().datetime()
});

export const cinematicStoryPlanDraftSchema = z.object({
  objective: z.string(),
  logline: z.string(),
  emotionalArc: z.string(),
  centralDramaticQuestion: z.string().optional(),
  storyPromise: z.string().optional(),
  finalPayoff: z.string().optional(),
  spokenLanguage: z.string().optional(),
  onScreenTextPolicy: z.string().optional(),
  dialoguePolicy: z.enum(['none', 'sparse', 'normal', 'dialogue-led']).optional(),
  characterAliases: z.array(z.object({ castAssignmentId: z.string(), storyCharacterName: z.string() })).optional(),
  directorOperation: z.enum(['generate', 'review_current', 'manual']).optional(),
  directorSummary: z.string().optional(),
  directorFindings: z.array(z.lazy(() => cinematicFilmReadinessFindingSchema)).optional(),
  sourceResolution: z.enum(['story_brief', 'creative_direction']).nullable().optional(),
  warningsAcknowledged: z.boolean().optional(),
  filmReadiness: z.lazy(() => cinematicFilmReadinessSchema).optional(),
  scriptPreview: z.array(z.lazy(() => cinematicFilmScriptEntrySchema)).optional(),
  beats: z.array(cinematicStoryBeatSchema).min(1).max(24),
  scenes: z.array(cinematicSceneSchema).min(1).max(24),
  warnings: z.array(z.string()),
  source: z.enum(['manual', 'generated']),
  approved: z.boolean()
});

const cinematicAiProvenanceSchema = z.object({
  provider: z.string(), model: z.string(), responseId: z.string().nullable(),
  recipeId: z.string(), recipeVersion: z.number().int(), recipeFingerprint: z.string()
});

export const cinematicSourceDiagnosticSchema = z.object({
  code: z.string(),
  severity: z.enum(['blocking', 'warning', 'info']),
  fieldPath: z.string(),
  comparedPath: z.string().optional(),
  summary: z.string(),
  recoveryAction: z.string(),
  autoFixAvailable: z.boolean(),
  requiresConfirmation: z.boolean(),
  resolved: z.boolean(),
  entityId: z.string().optional()
});

export const cinematicStoryPlanPreflightSchema = z.object({
  status: z.enum(['ready', 'blocked']),
  diagnostics: z.array(cinematicSourceDiagnosticSchema),
  sourceResolution: z.enum(['story_brief', 'creative_direction']).nullable(),
  resolvedStoryBrief: z.string(),
  resolvedCreativeDirection: z.string(),
  storyLocations: z.array(z.string()),
  directionLocations: z.array(z.string())
});

export const cinematicFilmReadinessFindingSchema: z.ZodType<{
  code: string;
  dimension: 'story' | 'script' | 'performance' | 'visual' | 'editorial' | 'audio' | 'continuity' | 'production';
  severity: 'blocking' | 'warning' | 'info';
  summary: string;
  recommendation: string;
  beatId?: string | null;
  sceneId?: string | null;
  shotId?: string | null;
}> = z.object({
  code: z.string(),
  dimension: z.enum(['story', 'script', 'performance', 'visual', 'editorial', 'audio', 'continuity', 'production']),
  severity: z.enum(['blocking', 'warning', 'info']),
  summary: z.string(),
  recommendation: z.string(),
  beatId: z.string().nullable().optional(),
  sceneId: z.string().nullable().optional(),
  shotId: z.string().nullable().optional()
});

const cinematicReadinessStateSchema = z.enum(['ready', 'ready_with_warnings', 'not_ready', 'not_evaluated']);
export const cinematicFilmReadinessSchema = z.object({
  status: cinematicReadinessStateSchema,
  dimensions: z.record(z.string(), cinematicReadinessStateSchema),
  findings: z.array(cinematicFilmReadinessFindingSchema)
});

export const cinematicFilmScriptEntrySchema = z.object({
  sceneId: z.string(), sceneTitle: z.string(), shotId: z.string(), shotTitle: z.string(),
  startMs: z.number().int().nonnegative(), endMs: z.number().int().nonnegative(),
  visual: z.string(), action: z.string(), performance: z.string(),
  dialogue: z.array(cinematicShotSchema.shape.dialogueCues.unwrap().element),
  audio: z.array(cinematicShotSchema.shape.audioCues.unwrap().element),
  cut: z.string()
});

export const cinematicStoryPlanProposalSchema = z.object({
  proposalId: z.string().min(1),
  operation: z.enum(['cinematic_story_plan_generate', 'cinematic_story_plan_review']),
  mode: z.enum(['generate', 'review_current']).optional(),
  status: z.enum(['blocked', 'proposal']).optional(),
  expectedProjectVersion: z.number().int().positive(),
  storySourceVersionId: z.string().min(1),
  sourceResolution: z.enum(['story_brief', 'creative_direction']).nullable().optional(),
  preflight: cinematicStoryPlanPreflightSchema.optional(),
  plan: cinematicStoryPlanDraftSchema.nullable(),
  filmReadiness: cinematicFilmReadinessSchema.nullable().optional(),
  scriptPreview: z.array(cinematicFilmScriptEntrySchema).optional(),
  provenance: cinematicAiProvenanceSchema.nullable(),
  billingStatus: z.literal('qualification_no_charge')
});

export const cinematicSceneDirectionProposalSchema = z.object({
  proposalId: z.string().min(1),
  operation: z.literal('cinematic_scene_direction_generate'),
  expectedProjectVersion: z.number().int().positive(),
  storySourceVersionId: z.string().min(1),
  sceneId: z.string().min(1),
  scene: cinematicSceneSchema,
  warnings: z.array(z.string()),
  provenance: cinematicAiProvenanceSchema,
  billingStatus: z.literal('qualification_no_charge')
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
  storyPlanVersions: z.array(cinematicStoryPlanVersionSchema),
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
  directingContract: z.object({
    visibleMoment: z.string(),
    subjectAction: z.string(),
    emotionalTarget: z.string(),
    performanceCue: z.string(),
    continuityEntry: z.string(),
    continuityExit: z.string(),
    transitionToNext: z.string(),
    dialogueCues: cinematicShotSchema.shape.dialogueCues.unwrap(),
    audioCues: cinematicShotSchema.shape.audioCues.unwrap(),
    characterAliases: z.array(z.object({ castAssignmentId: z.string(), storyCharacterName: z.string() }))
  }),
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
export type CinematicStoryboardGenerationContext = z.infer<typeof cinematicStoryboardGenerationContextSchema>;
export type CinematicStoryBeat = z.infer<typeof cinematicStoryBeatSchema>;
export type CinematicStoryPlanDraft = z.infer<typeof cinematicStoryPlanDraftSchema>;
export type CinematicStoryPlanProposal = z.infer<typeof cinematicStoryPlanProposalSchema>;
export type CinematicSceneDirectionProposal = z.infer<typeof cinematicSceneDirectionProposalSchema>;
export type CinematicProduceShotContext = z.infer<typeof cinematicProduceShotContextSchema>;

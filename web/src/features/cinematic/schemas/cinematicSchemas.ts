import { z } from 'zod';
import { cinematicCastReferenceSchema } from '../../generation/schemas/generationSchemas';
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
  storyBrief: z.string().max(10000),
  creativeDirection: z.string().max(10000),
  genre: z.string().min(1).max(40),
  audienceFeeling: z.string().min(1).max(40),
  pacing: z.string().min(1).max(40),
  genres: z.array(z.string().max(40)).min(1).max(3).optional(),
  audienceFeelings: z.array(z.string().max(40)).min(1).max(3).optional(),
  pacingTraits: z.array(z.string().max(40)).min(1).max(3).optional(),
  storyCountryStyle: z.string().min(1).max(40).optional(),
  endingIntent: z.enum(['resolved', 'hopeful', 'twist', 'cliffhanger']),
  mode: z.enum(['simple', 'advanced']),
  castPlanningMode: z.enum(['ai-recommended', 'solo', 'duo', 'manual']).default('ai-recommended'),
  storyRoleSlots: z.array(cinematicStoryRoleSlotSchema).max(4).default([]),
  activeStage: cinematicStageSchema,
  updatedAt: z.string()
});

export type CinematicSetupDraft = z.infer<typeof cinematicSetupDraftSchema>;

export const cinematicStoryEnhancementSchema = z.object({
  purpose: z.enum(['story', 'roles']).optional(),
  enhancementId: z.string().min(1),
  enhancedStoryBrief: z.string().min(1).max(10000),
  creativeDirection: z.string().max(10000),
  premise: z.string(),
  conflict: z.string(),
  emotionalArc: z.string(),
  ending: z.string(),
  candidateScenes: z.array(z.string()).max(5),
  recommendedRoles: z.array(cinematicStoryRoleSlotSchema).max(4),
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

export const cinematicSeriesMembershipSchema = z.object({
  seriesId: z.string().min(1), seasonId: z.string().min(1), chapterNumber: z.number().int().positive()
});

export const cinematicProjectSummarySchema = z.object({
  seriesMembership: cinematicSeriesMembershipSchema.optional(),
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
  sourceType: z.enum(['character', 'generated_sheet']).optional(),
  generatedSheet: z.object({
    generationId: z.string(), assetId: z.string(), contentHash: z.string(), previewUrl: z.string(),
    modelId: z.string(), expiresAt: z.string().nullable().optional(), sourceFingerprint: z.string(), assurance: z.literal('user_confirmed')
  }).nullable().optional(),
  characterProfileId: z.string().min(1).nullable(),
  characterProfileVersionId: z.string().min(1).nullable(),
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
}).superRefine((assignment, context) => {
  const sheet = assignment.sourceType === 'generated_sheet';
  if (sheet ? !assignment.generatedSheet || Boolean(assignment.characterProfileId || assignment.characterProfileVersionId)
    : !assignment.characterProfileId || !assignment.characterProfileVersionId || Boolean(assignment.generatedSheet)) {
    context.addIssue({ code: 'custom', path: ['sourceType'], message: 'A Cast assignment requires exactly one identity source.' });
  }
});

const cinematicProviderOutputProvenanceSchema = z.object({
  kind: z.literal('provider_generated_image'),
  providerId: z.string().min(1),
  requestedModelId: z.string().min(1),
  resolvedModelId: z.string().min(1),
  providerRequestId: z.string().nullable(),
  credentialScope: z.string().nullable(),
  generatedAt: z.string().datetime(),
  responseFormat: z.string().nullable(),
  originalBytesPreserved: z.boolean()
});

const cinematicStoryboardVideoCompatibilitySchema = z.object({
  targetId: z.literal('modelark-seedance-2'),
  status: z.enum(['eligible_internal_testing', 'not_qualified']),
  reasonCode: z.string().nullable(),
  sourceProviderId: z.string().nullable(),
  sourceModelId: z.string().nullable(),
  generatedAt: z.string().datetime().nullable(),
  validUntil: z.string().datetime().nullable(),
  originalBytesPreserved: z.boolean()
});

export const cinematicApprovedStoryboardSourceSchema = z.object({
  storyboardRenderStyle: z.literal('concept_sketch_v1').nullable().optional(),
  assetId: z.string().min(1),
  assetVersionId: z.string().min(1),
  sourceJobId: z.string().min(1),
  imageUrl: z.string().min(1),
  thumbnailUrl: z.string().min(1),
  contentHash: z.string(),
  sourceFingerprint: z.string().min(1),
  providerOutputProvenance: cinematicProviderOutputProvenanceSchema.nullable().optional(),
  videoCompatibility: cinematicStoryboardVideoCompatibilitySchema.nullable().optional(),
  approvedAt: z.string().datetime()
});

export const cinematicStoryboardKeyframeContractSchema = z.object({
  contractVersion: z.string().min(1),
  projectId: z.string().min(1),
  projectVersion: z.number().int().positive(),
  storyPlanVersionId: z.string().nullable(),
  beatId: z.string().nullable(),
  sceneId: z.string().min(1),
  sceneVersion: z.number().int().positive(),
  shotId: z.string().min(1),
  shotVersion: z.number().int().positive(),
  currentState: z.object({
    projectIntent: z.string(), planObjective: z.string(), beatPurpose: z.string(),
    beatVisibleChange: z.string(), sceneEntryState: z.string(), sceneExitState: z.string(),
    exactVisibleMoment: z.string(), primaryPhysicalAction: z.string(),
    coverageRole: z.enum(['establishing', 'action', 'reaction', 'insert', 'transition', 'payoff']).optional()
  }),
  characterAuthority: z.array(z.object({
    assignmentId: z.string(), characterProfileId: z.string().nullable(),
    characterProfileVersionId: z.string().nullable(), displayName: z.string(),
    storyRole: z.string(), identityReady: z.boolean()
  })),
  lookAuthority: z.array(z.object({
    lookId: z.string(), assignmentId: z.string(), name: z.string(),
    garmentSummary: z.string(), accessorySummary: z.string(), locked: z.boolean(),
    assetIds: z.array(z.string())
  })),
  composition: z.object({
    aspectRatio: z.string().nullable(), framing: z.string(), cameraAngle: z.string(),
    lensIntent: z.string(), authoredMovement: z.string(), stillFramePosition: z.string(),
    blocking: z.string(), screenDirection: z.string()
  }),
  performance: z.object({
    emotionalTarget: z.string(), direction: z.string(), observableCue: z.string(), gaze: z.string()
  }),
  lightingEnvironment: z.object({
    location: z.string(), time: z.string(), lighting: z.string(), environment: z.string(),
    propContinuity: z.string()
  }),
  continuity: z.object({
    entryAnchor: z.string(), exitAnchor: z.string(), outgoingTransition: z.string(),
    notes: z.array(z.string()), previousApprovedSourceFingerprint: z.string().nullable()
  }),
  visualSpec: z.object({
    moment: z.object({
      description: z.string(), action: z.string(),
      coverageRole: z.enum(['establishing', 'action', 'reaction', 'insert', 'transition', 'payoff']),
      framePosition: z.string()
    }),
    subject: z.object({
      characters: z.array(z.object({ assignmentId: z.string(), displayName: z.string(), storyRole: z.string() })),
      approvedLooks: z.array(z.object({
        lookId: z.string(), assignmentId: z.string(), name: z.string(),
        garmentSummary: z.string(), accessorySummary: z.string()
      }))
    }),
    performance: z.object({
      emotion: z.string(), expressionAndPosture: z.string(), observableCue: z.string(), gaze: z.string()
    }),
    environment: z.object({
      location: z.string(), time: z.string(), requiredElements: z.array(z.string()), propState: z.string()
    }),
    composition: z.object({
      aspectRatio: z.string().nullable(), framing: z.string(), cameraAngle: z.string(),
      lensIntent: z.string(), blocking: z.string(), screenDirection: z.string()
    }),
    lighting: z.object({ sourceAndMotivation: z.string(), contrastAndFalloff: z.string() }),
    continuity: z.object({
      requiredVisibleConstraints: z.array(z.string()),
      previousApprovedSourceFingerprint: z.string().nullable()
    })
  }).optional(),
  prohibitions: z.array(z.string()),
  referencePlan: z.object({
    characterProfileVersionIds: z.array(z.string()), lookAssetIds: z.array(z.string()),
    previousApprovedShotId: z.string().nullable(),
    previousApprovedSourceFingerprint: z.string().nullable()
  }),
  provenance: z.object({
    policyId: z.string(), policyVersion: z.number().int().positive(),
    promptBudgetId: z.string(), promptBudgetVersion: z.number().int().positive(),
    captureProfileId: z.string(), captureProfileVersion: z.number().int().positive(),
    configurationFingerprint: z.string()
  }),
  authorDirection: z.string(),
  findings: z.array(z.object({
    severity: z.enum(['blocking', 'warning']), code: z.string(), fieldPath: z.string()
  })),
  sourceFingerprint: z.string().min(1),
  providerIndependentPrompt: z.string().min(1)
});

export const cinematicStoryboardGenerationContextSchema = z.object({
  cinematicCastReferences: z.array(cinematicCastReferenceSchema).max(6).optional(),
  cinematicContainsPeople: z.boolean().optional(),
  schemaVersion: z.literal(1),
  projectId: z.string(),
  projectVersion: z.number().int().positive(),
  sceneId: z.string(),
  shotId: z.string(),
  shotVersion: z.number().int().positive(),
  characterProfileContext: z.record(z.string(), z.unknown()).nullable(),
  references: z.object({
    character_reference: z.string().nullable().optional(),
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
  keyframeContract: cinematicStoryboardKeyframeContractSchema,
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
  castMode: z.enum(['none', 'selected', 'inherit']).optional(),
  openingFrameVersion: z.literal(1).optional(),
  audioDirectionVersion: z.literal(1).optional(),
  id: z.string().min(1),
  version: z.number().int().positive(),
  orderKey: z.number(),
  title: z.string(),
  purpose: z.string(),
  coverageRole: z.enum(['establishing', 'action', 'reaction', 'insert', 'transition', 'payoff']).optional(),
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
  additionalMotionDirection: z.string().max(300).optional(),
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
  videoReferenceMode: z.enum(['storyboard_only', 'storyboard_and_looks', 'looks_only', 'text_only']).optional(),
  lastFirstFrameMode: z.enum(['storyboard_only', 'storyboard_and_looks']).optional(),
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
  cinematicOpening: z.boolean().optional(),
  castMode: z.enum(['none', 'selected', 'inherit']).optional(),
  artDirection: z.string().max(1000).optional(),
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
  recipeId: z.string(), recipeVersion: z.number().int(), recipeFingerprint: z.string(),
  fallbackUsed: z.boolean().optional(), fallbackReason: z.string().nullable().optional()
});

const cinematicVisualPlanFindingSchema = z.object({
  code: z.string(),
  severity: z.enum(['blocking', 'warning']),
  repairable: z.boolean(),
  sceneId: z.string(),
  sceneTitle: z.string(),
  shotId: z.string(),
  shotTitle: z.string(),
  fieldPaths: z.array(z.string()),
  summary: z.string(),
  recommendation: z.string()
});

const cinematicStoryPlanRepairSchema = z.object({
  round: z.number().int().positive(),
  sceneIndex: z.number().int().nonnegative().nullable(),
  shotIndex: z.number().int().nonnegative().nullable(),
  sceneTitle: z.string(),
  shotTitle: z.string(),
  fieldPath: z.string(),
  before: z.string(),
  after: z.string(),
  reasonCodes: z.array(z.string())
});

const cinematicStoryPlanRepairRoundSchema = z.object({
  round: z.number().int().positive(),
  status: z.enum(['accepted', 'no_change', 'no_progress', 'provider_timeout']),
  findingCountBefore: z.number().int().nonnegative(),
  findingCountAfter: z.number().int().nonnegative(),
  repairableCountBefore: z.number().int().nonnegative(),
  repairableCountAfter: z.number().int().nonnegative(),
  acceptedChangeCount: z.number().int().nonnegative(),
  provenance: cinematicAiProvenanceSchema.nullable(),
  failure: z.object({
    code: z.string(),
    message: z.string(),
    retryable: z.boolean(),
    stage: z.literal('visual_repair'),
    timeoutMs: z.number().int().positive()
  }).optional()
});

export const cinematicStoryPlanWorkflowStageSchema = z.object({
  id: z.enum([
    'source_preflight', 'plan_generation', 'director_review',
    'visual_validation', 'visual_repair', 'storyboard_readiness'
  ]),
  status: z.enum(['queued', 'processing', 'completed', 'skipped', 'stopped', 'blocked']),
  issueCount: z.number().int().nonnegative(),
  repairCount: z.number().int().nonnegative()
});

export const cinematicStoryPlanLiveProgressSchema = z.object({
  contractVersion: z.literal('cinematic-story-plan-live-progress-v1'),
  activeStageId: cinematicStoryPlanWorkflowStageSchema.shape.id.nullable(),
  stages: z.array(cinematicStoryPlanWorkflowStageSchema).length(6),
  updatedAt: z.string()
});

const cinematicStoryPlanWorkflowSchema = z.object({
  contractVersion: z.literal('cinematic-story-plan-workflow-v1'),
  status: z.enum(['ready', 'ready_with_warnings', 'blocked']),
  stages: z.array(cinematicStoryPlanWorkflowStageSchema),
  repairRoundCount: z.number().int().nonnegative(),
  initialFindings: z.array(cinematicVisualPlanFindingSchema),
  repairs: z.array(cinematicStoryPlanRepairSchema),
  repairRounds: z.array(cinematicStoryPlanRepairRoundSchema),
  remainingFindings: z.array(cinematicVisualPlanFindingSchema)
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
  workflow: cinematicStoryPlanWorkflowSchema.optional(),
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
  fieldProposals: z.array(z.object({
    fieldKey: z.string().min(1),
    manifestPath: z.string().min(1),
    group: z.string().min(1),
    visibility: z.enum(['simple', 'advanced', 'system']),
    localizationKey: z.string().min(1),
    currentValue: z.unknown(),
    proposedValue: z.unknown(),
    outcome: z.enum(['proposed', 'locked', 'unchanged']),
    recommended: z.boolean()
  })).optional(),
  mergeSummary: z.object({
    requested: z.number().int().nonnegative(),
    proposed: z.number().int().nonnegative(),
    recommended: z.number().int().nonnegative(),
    locked: z.number().int().nonnegative(),
    unchanged: z.number().int().nonnegative()
  }).optional(),
  warnings: z.array(z.string()),
  provenance: cinematicAiProvenanceSchema,
  billingStatus: z.literal('qualification_no_charge')
});

const cinematicAuthoringAuthoritySchema = z.enum(['user', 'ai', 'inherited', 'default', 'legacy_inferred']);
const cinematicAuthoringFieldStateSchema = z.object({
  source: cinematicAuthoringAuthoritySchema,
  status: z.enum(['current', 'stale', 'missing', 'conflict']),
  locked: z.boolean(),
  sourceRevision: z.string().nullable(),
  recipe: z.object({
    id: z.string().min(1),
    version: z.number().int().positive(),
    fingerprint: z.string().min(1)
  }).nullable(),
  updatedAt: z.string().datetime().nullable(),
  updatedByActorId: z.string().nullable()
});

const storyChoiceSchema = z.object({
  maxSelections: z.number().int().min(1).max(3), default: z.string(), ids: z.array(z.string()).max(40),
  incompatiblePairs: z.array(z.tuple([z.string(), z.string()])).optional()
});
export const cinematicStoryAuthoringSchema = z.object({
  schemaVersion: z.literal(1), version: z.number().int().positive(),
  limits: z.object({ storyBrief: z.number().int().positive().max(10000), creativeDirection: z.number().int().positive().max(10000) }),
  choices: z.object({ genres: storyChoiceSchema, audienceFeelings: storyChoiceSchema, pacingTraits: storyChoiceSchema }),
  countryStyles: z.object({ default: z.string(), options: z.array(z.object({
      id: z.string().min(1).max(40), flag: z.string().regex(/^[a-z]{2}$/).nullable(), guidance: z.string().max(1200)
    })).max(30) }).optional()
});
export type CinematicStoryAuthoring = z.infer<typeof cinematicStoryAuthoringSchema>;
export const cinematicAuthoringManifestSchema = z.object({
  storyAuthoring: cinematicStoryAuthoringSchema.optional(),
  schemaVersion: z.literal(1),
  id: z.literal('cinematic-authoring-field-manifest'),
  version: z.number().int().positive(),
  fingerprint: z.string().regex(/^[a-f0-9]{16}$/),
  fields: z.array(z.object({
    path: z.string().regex(/^(setup|cast|plan|beat|scene|shot)\.[A-Za-z][A-Za-z0-9]*$/),
    group: z.string().min(1),
    visibility: z.enum(['simple', 'advanced', 'system']),
    requirement: z.enum(['required', 'optional', 'derived']),
    authorities: z.array(cinematicAuthoringAuthoritySchema).min(1),
    consumers: z.array(z.enum(['cast', 'story-plan', 'storyboard', 'produce', 'finish'])),
    localizationKey: z.string().min(1),
    maxLength: z.number().int().positive().optional()
  })),
  readiness: z.record(z.string(), z.object({
    requiredPaths: z.array(z.string().min(1))
  }))
});

const cinematicLineageStatusSchema = z.enum([
  'current', 'missing', 'stale', 'conflict', 'eligible', 'blocked', 'source_unavailable', 'source_changed'
]);
const cinematicLineageEntitySchema = z.object({
  id: z.string().nullable().optional(),
  status: cinematicLineageStatusSchema.optional()
}).passthrough();

export const cinematicDataLineageSchema = z.object({
  schemaVersion: z.literal(1),
  reportVersion: z.literal('cinematic-lineage-v1'),
  fingerprint: z.string().regex(/^[a-f0-9]{16}$/),
  project: z.object({
    id: z.string().min(1),
    version: z.number().int().positive(),
    activeStage: cinematicStageSchema,
    status: cinematicProjectSummarySchema.shape.status,
    aspectRatio: z.string().min(1),
    durationTargetMs: z.number().int().positive()
  }),
  setup: z.object({
    activeStorySourceVersionId: z.string().nullable(),
    storySourceVersion: z.number().int().positive().nullable(),
    status: z.enum(['current', 'missing'])
  }),
  storyRoles: z.array(cinematicLineageEntitySchema),
  castAssignments: z.array(cinematicLineageEntitySchema),
  lookBindings: z.array(cinematicLineageEntitySchema),
  storyPlan: cinematicLineageEntitySchema.nullable(),
  beats: z.array(cinematicLineageEntitySchema),
  scenes: z.array(cinematicLineageEntitySchema),
  shots: z.array(cinematicLineageEntitySchema),
  storyboardContracts: z.array(cinematicLineageEntitySchema),
  approvedStoryboardSources: z.array(cinematicLineageEntitySchema),
  videoPackets: z.array(cinematicLineageEntitySchema),
  approvedVideoSources: z.array(cinematicLineageEntitySchema),
  timelineEntries: z.array(cinematicLineageEntitySchema),
  exports: z.array(cinematicLineageEntitySchema),
  findings: z.array(z.object({
    code: z.string().min(1),
    severity: z.enum(['blocking', 'warning']),
    stage: z.string().min(1),
    entityType: z.string().min(1),
    entityId: z.string().nullable(),
    fieldPath: z.string().min(1),
    sourceId: z.string().nullable(),
    sourceVersion: z.number().int().positive().nullable(),
    consumerId: z.string().nullable(),
    consumerVersion: z.number().int().positive().nullable(),
    summaryKey: z.string().min(1),
    recoveryStage: z.string().min(1),
    recoveryTargetId: z.string().nullable()
  }))
});

export const cinematicProjectSchema = z.object({
  seriesMembership: cinematicSeriesMembershipSchema.optional(),
  chapterOrigin: z.object({ projectId: z.string(), projectVersion: z.number().int().positive(), copiedCast: z.boolean() }).optional(),
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
  authoringContractVersion: z.literal('cinematic-authoring-v1').optional(),
  authoringState: z.object({
    inferenceMode: z.enum(['explicit', 'legacy']),
    fieldStates: z.record(z.string(), cinematicAuthoringFieldStateSchema)
  }).optional(),
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
    genres: cinematicSetupDraftSchema.shape.genres,
    audienceFeelings: cinematicSetupDraftSchema.shape.audienceFeelings,
    pacingTraits: cinematicSetupDraftSchema.shape.pacingTraits,
    storyCountryStyle: cinematicSetupDraftSchema.shape.storyCountryStyle,
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

export const cinematicVideoPacketSchema = z.object({
  contractVersion: z.string().min(1),
  projectId: z.string().min(1),
  projectVersion: z.number().int().positive(),
  sceneId: z.string().min(1),
  sceneVersion: z.number().int().positive(),
  shotId: z.string().min(1),
  shotVersion: z.number().int().positive(),
  keyframeContractFingerprint: z.string().min(1),
  approvedKeyframeContractFingerprint: z.string().nullable(),
  approvedStoryboardSourceFingerprint: z.string().nullable(),
  storyboardRenderStyle: z.literal('concept_sketch_v1').optional(),
  referenceMode: z.enum(['looks_only', 'text_only']).optional(),
  composition: cinematicStoryboardKeyframeContractSchema.shape.composition.optional(),
  timing: z.object({ plannedDurationMs: z.number().nonnegative(), estimatedActionDurationMs: z.number().nonnegative() }),
  referenceStrategy: z.object({
    mode: z.enum(['first_frame', 'composition_reference', 'unavailable', 'looks_only', 'text_only']),
    firstFrameAssetVersionId: z.string().nullable(),
    firstFrameSourceFingerprint: z.string().nullable(),
    lastFrameAssetVersionId: z.string().nullable(),
    additionalReferenceAssetIds: z.array(z.string())
  }),
  authority: z.object({
    characters: cinematicStoryboardKeyframeContractSchema.shape.characterAuthority,
    looks: cinematicStoryboardKeyframeContractSchema.shape.lookAuthority
  }),
  motion: z.object({
    visibleStart: z.string(), primaryAction: z.string(), visibleEnd: z.string(),
    additionalDirection: z.string().optional(),
    cameraMovement: z.string(), blocking: z.string(), screenDirection: z.string()
  }),
  performance: z.object({
    emotionalTarget: z.string(), direction: z.string(), observableCue: z.string(), gaze: z.string()
  }),
  environment: z.object({
    location: z.string(), time: z.string(), lighting: z.string(), environment: z.string(), propContinuity: z.string()
  }),
  continuity: z.object({
    entry: z.string(), exit: z.string(), transitionToNext: z.string(), notes: z.array(z.string())
  }),
  audio: z.object({
    directionVersion: z.literal(1).optional(),
    intent: z.string(),
    dialogueCues: z.array(z.object({
      speaker: z.string(), text: z.string(), delivery: z.string(),
      startOffsetMs: z.number().nonnegative(), estimatedDurationMs: z.number().nonnegative(), speakerVisible: z.boolean()
    })),
    audioCues: z.array(z.object({
      kind: z.string(), source: z.string(), description: z.string(),
      startOffsetMs: z.number().nonnegative(), durationMs: z.number().nonnegative()
    }))
  }),
  authorDirection: z.string(),
  prohibitions: z.array(z.string()),
  provenance: z.object({
    policyId: z.string(),
    policyVersion: z.number().int().positive(),
    promptStrategyId: z.string().optional(),
    promptStrategyVersion: z.number().int().positive().optional()
  }),
  findings: z.array(z.object({ severity: z.enum(['blocking', 'warning']), code: z.string(), fieldPath: z.string() })),
  packetFingerprint: z.string().min(1),
  renderedPromptFingerprint: z.string().min(1).optional(),
  providerIndependentPrompt: z.string().min(1)
});

export const cinematicProduceShotContextSchema = z.object({
  referenceMode: z.enum(['storyboard_only', 'storyboard_and_looks', 'looks_only', 'text_only']).optional(),
  projectId: z.string().min(1),
  projectVersion: z.number().int().positive(),
  sceneId: z.string().min(1),
  shotId: z.string().min(1),
  shotVersion: z.number().int().positive(),
  approvedStoryboardSource: cinematicApprovedStoryboardSourceSchema.nullable(),
  generationEligible: z.boolean(),
  blockingReason: z.string().nullable(),
  videoPacket: cinematicVideoPacketSchema,
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
    qualificationAuthorizationId: z.string().nullable().optional(),
    developmentPocUnverified: z.boolean().optional(),
    developmentPocCredits: z.number().int().positive().nullable().optional(),
    developmentPocWarningCode: z.string().nullable().optional(),
    keyframeContractFingerprint: z.string().nullable().optional(),
    videoPacketFingerprint: z.string().nullable().optional(),
    videoSourceFingerprint: z.string().nullable().optional(),
    renderDurationMs: z.number().nullable().optional(),
    settlementStatus: z.string().nullable().optional(),
    outputAsset: z.object({
      publicUrl: z.string(),
      posterUrl: z.string().nullable().optional()
    }).passthrough().nullable().optional(),
    reviewDecision: z.string().optional(),
    downstreamSourceStatus: z.enum(['current', 'source_changed', 'source_unavailable', 'packet_changed'])
  })),
  timelineDependencyStatus: z.enum(['current', 'source_changed', 'source_unavailable', 'packet_changed'])
});

export const cinematicVideoQuoteSchema = videoQuoteSchema.extend({
  referenceMode: z.enum(['storyboard_only', 'storyboard_and_looks', 'looks_only', 'text_only']).optional(),
  renderedPrompt: z.string().optional(),
  referenceSummary: z.array(z.object({
    imageNumber: z.number().int().positive(), assetId: z.string().nullable(),
    purpose: z.enum(['storyboard_opening', 'sketch_composition', 'character_look', 'generated_look']),
    roleName: z.string().nullable(), lookName: z.string().nullable(), previewUrl: z.string()
  })).optional(),
  projectId: z.string(),
  sceneId: z.string(),
  shotId: z.string(),
  shotVersion: z.number().int().positive(),
  sourceFingerprint: z.string().nullable(),
  videoPacketFingerprint: z.string(),
  promptStrategy: z.object({
    id: z.string(), version: z.number().int().positive(),
    policyId: z.string(), policyVersion: z.number().int().positive()
  }).nullable().optional(),
  renderedPromptFingerprint: z.string().nullable().optional(),
  approvedStoryboardAssetVersionId: z.string().nullable()
});

export const cinematicVideoAttemptResponseSchema = z.object({
  attemptId: z.string(),
  task: videoTaskSchema
});

export type CinematicVideoCapability = z.infer<typeof cinematicVideoCapabilitySchema>;
export type CinematicProject = z.infer<typeof cinematicProjectSchema>;
export type CinematicAuthoringManifest = z.infer<typeof cinematicAuthoringManifestSchema>;
export type CinematicDataLineage = z.infer<typeof cinematicDataLineageSchema>;
export type CinematicCastAssignment = z.infer<typeof cinematicCastAssignmentSchema>;
export type CinematicScene = z.infer<typeof cinematicSceneSchema>;
export type CinematicShot = z.infer<typeof cinematicShotSchema>;
export type CinematicStoryboardGenerationContext = z.infer<typeof cinematicStoryboardGenerationContextSchema>;
export type CinematicStoryboardKeyframeContract = z.infer<typeof cinematicStoryboardKeyframeContractSchema>;
export type CinematicVideoPacket = z.infer<typeof cinematicVideoPacketSchema>;
export type CinematicStoryBeat = z.infer<typeof cinematicStoryBeatSchema>;
export type CinematicStoryPlanDraft = z.infer<typeof cinematicStoryPlanDraftSchema>;
export type CinematicStoryPlanProposal = z.infer<typeof cinematicStoryPlanProposalSchema>;
export type CinematicStoryPlanLiveProgress = z.infer<typeof cinematicStoryPlanLiveProgressSchema>;
export type CinematicSceneDirectionProposal = z.infer<typeof cinematicSceneDirectionProposalSchema>;
export type CinematicProduceShotContext = z.infer<typeof cinematicProduceShotContextSchema>;

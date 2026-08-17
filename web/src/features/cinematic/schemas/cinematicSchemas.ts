import { z } from 'zod';

export const cinematicStageSchema = z.enum([
  'setup',
  'cast',
  'story-plan',
  'storyboard',
  'produce',
  'finish'
]);

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
  activeStage: cinematicStageSchema,
  updatedAt: z.string()
});

export type CinematicSetupDraft = z.infer<typeof cinematicSetupDraftSchema>;

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
  status: z.enum(['draft', 'planning', 'producing', 'finishing', 'completed', 'archived']),
  updatedAt: z.string().datetime()
});

export const cinematicProjectListResponseSchema = z.object({
  items: z.array(cinematicProjectSummarySchema),
  nextCursor: z.string().nullable()
});

export type CinematicVideoCapability = z.infer<typeof cinematicVideoCapabilitySchema>;

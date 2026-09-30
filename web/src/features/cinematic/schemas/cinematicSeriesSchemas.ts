import { z } from 'zod';

export const cinematicPortableShotSchema = z.object({
  warnings: z.array(z.enum(['prompt_changed', 'frame_changed', 'reference_numbers_changed'])).default([]),
  copyReady: z.boolean().default(true),
  issues: z.array(z.object({ slot: z.number().int().positive(), name: z.string(), castAssignmentId: z.string().optional(),
    code: z.enum(['first_frame_unavailable', 'look_unavailable']) })).max(25).default([]),
  prompt: z.string(), references: z.array(z.object({ number: z.number().int().positive(), name: z.string(),
    purpose: z.string(), source: z.string(), imageUrl: z.string().min(1) })).max(25)
});

export const cinematicShotWriterPreparationSchema = z.object({
  shotDocument: z.string(), sourceFingerprint: z.string(), generatedPrompt: z.string(),
  projectVideoDirection: z.string().optional(),
  overrideStale: z.boolean(), maximumPromptCharacters: z.number().int().positive(),
  dialogue: z.object({
    cues: z.array(z.object({ speakerCastAssignmentId: z.string(), offscreenVoiceRole: z.string(), text: z.string(),
      delivery: z.string(), startOffsetMs: z.number(), estimatedDurationMs: z.number(), speakerVisible: z.boolean() })),
    findings: z.array(z.object({ code: z.string(), line: z.number(), speaker: z.string() })), performance: z.string()
  }),
  timing: z.object({ advisory: z.boolean(), findings: z.array(z.object({ code: z.string() })) })
});
import { cinematicChapterProposalSchema, cinematicProjectSchema, cinematicProjectSummarySchema, cinematicSceneProposalSchema, cinematicSceneSchema, cinematicShotProposalSchema, cinematicShotSchema } from './cinematicSchemas';

export const cinematicSeriesSchema = z.object({
  storyProjectId: z.string().optional(),
  id: z.string().min(1), ownerUserId: z.string().min(1), title: z.string().min(1), version: z.number().int().positive(),
  seasons: z.array(z.object({ id: z.string().min(1), number: z.number().int().positive(), title: z.string() })).max(24),
  createdAt: z.string().datetime(), updatedAt: z.string().datetime()
});
export const cinematicProductionProjectSchema = z.object({
  id: z.string().min(1), productionProjectId: z.string().min(1), version: z.number().int().positive(),
  storyProjectId: z.string().min(1).optional(),
  title: z.string().min(1), format: z.string().min(1), seasonsEnabled: z.boolean(),
  chapterCount: z.number().int().min(0).max(120), chapterWorkStarted: z.boolean()
});
export const cinematicChapterSummarySchema = cinematicProjectSummarySchema.extend({
  productionProjectId: z.string().min(1), chapterId: z.string().min(1), productionUnitId: z.string().min(1),
  seasonId: z.string().min(1).nullable(), order: z.number().int().positive(),
  storyBrief: z.string().max(50000),
  activeChapterVersionId: z.string().nullable().default(null),
  revisionCount: z.number().int().nonnegative().default(0),
  classification: z.enum(['empty', 'authored', 'generated', 'production_only']).default('empty'),
  pendingProposalId: z.string().nullable().default(null),
  sceneCount: z.number().int().nonnegative().default(0),
  shotCount: z.number().int().nonnegative().default(0),
  scenePlanningStatus: z.enum(['not_started', 'proposal_pending', 'source_changed', 'ready']).default('not_started'),
  pendingSceneProposalId: z.string().nullable().default(null)
});
export const cinematicSeriesWorkspaceSchema = z.object({
  productionProject: cinematicProductionProjectSchema,
  series: cinematicSeriesSchema.nullable(),
  chapters: z.array(cinematicChapterSummarySchema).max(120)
});
export const cinematicSeriesMutationSchema = z.object({ project: cinematicProjectSchema, workspace: cinematicSeriesWorkspaceSchema });
export const cinematicChapterProposalMutationSchema = cinematicSeriesMutationSchema.extend({ proposal: cinematicChapterProposalSchema });
export const cinematicSceneProposalMutationSchema = z.object({ project: cinematicProjectSchema, proposal: cinematicSceneProposalSchema });
export const cinematicManualSceneMutationSchema = z.object({ project: cinematicProjectSchema, scene: cinematicSceneSchema.nullable() });
export const cinematicShotProposalMutationSchema = z.object({
  project: cinematicProjectSchema,
  proposal: cinematicShotProposalSchema,
  scene: cinematicSceneSchema.optional()
});
export const cinematicManualShotMutationSchema = z.object({
  project: cinematicProjectSchema,
  scene: cinematicSceneSchema.nullable(),
  shot: cinematicShotSchema.nullable()
});
export const cinematicShotDocumentMutationSchema = z.object({
  project: cinematicProjectSchema,
  scene: cinematicSceneSchema,
  shot: cinematicShotSchema
});
export const cinematicSharedCharacterMutationSchema = cinematicSeriesMutationSchema.extend({
  storyProject: cinematicProjectSchema,
  characterId: z.string().min(1)
});
export type CinematicSeriesWorkspace = z.infer<typeof cinematicSeriesWorkspaceSchema>;

export type SeriesCommand =
  | { kind: 'create'; title: string }
  | { kind: 'rename'; title: string; seasonId?: string }
  | { kind: 'season'; title: string }
  | { kind: 'chapter'; seasonId: string; title: string; storyBrief: string; copyCast: boolean };

import { z } from "zod";

export const deliverySchema = z.object({
  emotion: z.string().optional(),
  intensity: z.string().optional(),
  pace: z.string().optional(),
  method: z.string().optional(),
  direction: z.string().optional(),
});
const audioConfigSchema = z.object({
  speech_rate: z.number().int().optional(),
  loudness_rate: z.number().int().optional(),
  pitch_rate: z.number().int().optional(),
});
const audioControlSchema = z.object({
  min: z.number().int(), max: z.number().int(), step: z.number().int().positive(), default: z.number().int(),
});
export const rowSchema = z.object({
  id: z.string(),
  enabled: z.boolean(),
  characterPresetId: z.string(),
  text: z.string(),
  targetDurationMs: z.number().int().positive().optional(),
  boundaryTimingOnly: z.boolean().optional(),
  speechWindows: z.array(z.object({startMs:z.number().int().nonnegative(), endMs:z.number().int().positive()})).min(1).max(12).optional(),
  delivery: deliverySchema,
  selectedTakeId: z.string().nullable(),
  selectedTakeCurrent: z.boolean().optional(),
  pauseAfterMs: z.number().int().nonnegative().optional(),
  audioConfig: audioConfigSchema.optional(),
  activeOperationId: z.string().nullable().optional(),
});
export const documentSchema = z.object({
  id: z.string(),
  kind: z.literal("audio-script").optional(),
  title: z.string(),
  modelId: z.string(),
  language: z.string(),
  revision: z.number(),
  rows: z.array(rowSchema),
  archivedAt: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export const characterSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
  voiceId: z.string(),
  voiceKind: z.enum(["prebuilt", "custom"]).default("prebuilt"),
  revision: z.number(),
  archivedAt: z.string().nullable().optional(),
});
export const takeSchema = z.object({
  takeNumber: z.number().int().positive().optional(),
  id: z.string(),
  documentId: z.string(),
  rowId: z.string(),
  jobId: z.string(),
  outputAssetId: z.string(),
  inputSnapshot: z
    .object({
      text: z.string(),
      delivery: deliverySchema,
      voiceId: z.string(),
      characterName: z.string(),
      modelId: z.string(),
      audioConfig: audioConfigSchema.optional(),
      documentRevision: z.number().optional(),
    })
    .passthrough(),
  audioUrl: z
    .string()
    .refine((value) => value.startsWith("/outputs/") && !value.includes("..")),
  durationMs: z.number(),
  rhythmReview: z.object({
    status:z.enum(["matched","review"]),
    reasons:z.array(z.enum(["onset","ending","pause","unmeasurable"])),
    actualStartMs:z.number().nullable(), actualEndMs:z.number().nullable(), shiftMs:z.number(),
  }).optional(),
  displayTitle: z.string(),
  tags: z.array(z.string()),
  savedAt: z.string().nullable(),
  metadataRevision: z.number(),
  createdAt: z.string(),
});
export const catalogSchema = z.object({
  catalogVersion: z.string(),
  defaultModelId: z.string(),
  models: z.array(
    z.object({
      id: z.string(),
      displayName: z.string(),
      providerId: z.string(),
      enabled: z.boolean().optional(),
      available: z.boolean().optional(),
      capabilities: z
        .object({
          voiceDesign: z.boolean().optional(),
          customVoiceSynthesis: z.boolean().optional(),
          audioControls: z.object({
            speech_rate: audioControlSchema.optional(),
            loudness_rate: audioControlSchema.optional(),
            pitch_rate: audioControlSchema.optional(),
          }).optional(),
          languages: z.array(z.string()).optional(),
        })
        .passthrough(),
      defaults: z.object({}).passthrough().optional(),
    }),
  ),
  voices: z.array(
    z
      .object({
        id: z.string(),
        displayName: z.string(),
        modelIds: z.array(z.string()).optional(),
        languages: z.array(z.string()).optional(),
      })
      .passthrough(),
  ),
  policy: z
    .object({
      maxRows: z.number(),
      maxPauseAfterMs: z.number().int().nonnegative().optional(),
      maxTextLength: z.number(),
      maxStyleLength: z.number(),
      inlineTags: z.array(z.string()),
      eventToolbarTags: z.array(z.string()).optional(),
      eventGroups: z
        .array(
          z.object({
            id: z.string(),
            labelKey: z.string(),
            tags: z.array(z.string()),
          }),
        )
        .optional(),
      stylePresets: z.record(z.string(), z.array(z.string())).optional(),
    })
    .passthrough(),
});
export const documentsSchema = z.object({
  items: z.array(documentSchema),
  nextCursor: z.string().nullable().optional(),
});
export const charactersSchema = z.object({
  items: z.array(characterSchema),
  nextCursor: z.string().nullable().optional(),
});
export const takesSchema = z.object({
  items: z.array(takeSchema),
  nextCursor: z.string().nullable().optional(),
});
export const quoteSchema = z.object({
  id: z.string(),
  totalCredits: z.number(),
  expiresAt: z.string().optional(),
});
export const customVoiceSchema = z.object({
  id: z.string(),
  revision: z.number(),
  operationId: z.string(),
  name: z.string(),
  displayDescription: z.string(),
  designPrompt: z.string(),
  genre: z.string().optional(),
  sourceType: z.enum(["description", "reference"]).optional(),
  voiceGender: z.enum(["female", "male", "unspecified"]).optional(),
  sampleText: z.string().optional(),
  modelId: z.string(),
  providerId: z.string(),
  language: z.string(),
  previewAssetId: z.string(),
  audioUrl: takeSchema.shape.audioUrl,
  durationMs: z.number(),
  savedAt: z.string().nullable(),
  archivedAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
  lifecycleState: z.enum(["ready", "archived", "expired", "delete_pending"]),
  createdAt: z.string(),
});
export const operationSchema = z.object({
  id: z.string(),
  jobId: z.string().optional(),
  status: z.string(),
  take: takeSchema.nullable().optional(),
  errorCode: z.string().nullable().optional(),
  operation: z.enum(["speech", "voice_design"]).optional(),
  customVoice: customVoiceSchema.nullable().optional(),
  snapshot: z
    .object({
      providerPrompt: z.string().optional(),
      name: z.string().optional(),
      description: z.string().optional(),
      modelId: z.string().optional(),
      language: z.string().optional(),
    })
    .passthrough()
    .optional(),
});
export const customVoicesSchema = z.object({
  items: z.array(customVoiceSchema),
  nextCursor: z.string().nullable().optional(),
  operations: z.array(operationSchema).default([]),
});
export type VoiceDocument = z.infer<typeof documentSchema>;
export type DialogueRow = z.infer<typeof rowSchema>;
export type VoiceCharacter = z.infer<typeof characterSchema>;
export type VoiceTake = z.infer<typeof takeSchema>;
export type VoiceCatalog = z.infer<typeof catalogSchema>;
export type CustomVoice = z.infer<typeof customVoiceSchema>;

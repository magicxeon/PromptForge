import { z } from 'zod';

export const promptProposalSchema = z.object({
  composerMode: z.string(),
  generationMode: z.string(),
  finalPromptDraft: z.string(),
  fieldSelections: z.array(z.object({
    fieldId: z.string(),
    valueId: z.string(),
    value: z.string(),
    group: z.string(),
    category: z.string()
  }).passthrough()).default([]),
  missingFields: z.array(z.string()).default([]),
  safetyNotes: z.array(z.string()).default([])
}).passthrough();

export const promptProposalResponseSchema = z.object({ proposal: promptProposalSchema });

import { z } from "zod";
import {
  referenceSchema,
  type ImageReference,
} from "../../playground/state/imageDraft";

export const comparisonDraftSchema = z.object({
  prompt: z.string(),
  negative: z.string(),
  ratio: z.string(),
  resolution: z.string(),
  name: z.string(),
  references: z.array(referenceSchema),
  slots: z.array(
    z.object({
      id: z.string(),
      provider: z.string(),
      model: z.string(),
      enabled: z.boolean(),
    }),
  ),
});
export type ComparisonDraft = z.infer<typeof comparisonDraftSchema>;
export const emptyComparison: ComparisonDraft = {
  prompt: "",
  negative: "",
  ratio: "1:1",
  resolution: "",
  name: "",
  references: [],
  slots: [],
};
export const comparisonIntentSchema = z.object({
  requestId: z.string(),
  fingerprint: z.string(),
  setId: z.string().nullable(),
  runId: z.string().nullable(),
  status: z.enum(["unknown", "accepted", "reconciliation_required"]),
});
export type ComparisonIntent = z.infer<typeof comparisonIntentSchema>;
export function persistentComparison(draft: ComparisonDraft) {
  return {
    ...draft,
    references: draft.references.map((ref): ImageReference => ({
      ...ref,
      status: ref.status === "uploading" ? "reselect" : ref.status,
    })),
  };
}

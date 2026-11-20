import { z } from "zod";
export const roles = [
  "face_reference",
  "character_reference",
  "style_reference",
  "pose_reference",
  "outfit_front",
  "outfit_back",
] as const;
export const referenceSchema = z.object({
  id: z.string(),
  role: z.enum(roles),
  name: z.string(),
  storageKey: z.string().optional(),
  status: z.enum(["ready", "uploading", "failed", "reselect"]),
  error: z.string().optional(),
});
export type ImageReference = z.infer<typeof referenceSchema>;
export const draftSchema = z.object({
  prompt: z.string(),
  negative: z.string(),
  provider: z.string(),
  model: z.string(),
  ratio: z.string(),
  resolution: z.string(),
  count: z.number().int().min(1).max(4),
  references: z.array(referenceSchema).max(6),
});
export type ImageDraft = z.infer<typeof draftSchema>;
export const emptyDraft: ImageDraft = {
  prompt: "",
  negative: "",
  provider: "",
  model: "",
  ratio: "1:1",
  resolution: "",
  count: 1,
  references: [],
};
export const intentSchema = z.object({
  requestId: z.string(),
  estimateId: z.string(),
  fingerprint: z.string(),
  jobId: z.string().nullable(),
  groupId: z.string().nullable(),
  status: z.enum(["unknown", "accepted", "reconciliation_required"]),
});
export type ImageIntent = z.infer<typeof intentSchema>;
// Store only a relative output storage key, never signed URLs, credentials, blobs or data URLs.
export function outputStorageKey(url: string) {
  if (
    !url.startsWith("/outputs/") ||
    /[?#\\]/.test(url) ||
    url.split("/").includes("..")
  )
    throw new Error("Unsupported reference location");
  return url.slice("/outputs/".length);
}
export function referenceUrl(reference: ImageReference) {
  return reference.storageKey &&
    !/[?#\\]/.test(reference.storageKey) &&
    !reference.storageKey.split("/").includes("..") &&
    !reference.storageKey.startsWith("/")
    ? `/outputs/${reference.storageKey}`
    : undefined;
}
export function persistentDraft(draft: ImageDraft): ImageDraft {
  return {
    ...draft,
    references: draft.references.map((ref) => ({
      ...ref,
      status: ref.status === "uploading" ? "reselect" : ref.status,
    })),
  };
}

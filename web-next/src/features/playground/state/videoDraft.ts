import { z } from "zod";
import type {
  VideoModelCapability,
  VideoTask,
} from "../../../../../web/src/features/generation/schemas/videoGenerationSchemas";
import { buildVideoReferenceSelection } from "../../../../../web/src/features/playground/components/videoReferenceSelection";
import { referenceUrl } from "./imageDraft";

export const videoSourceSchema = z.object({
  id: z.string(),
  name: z.string().max(80),
  kind: z.enum(["image", "look"]),
  storageKey: z.string().optional(),
  generationId: z.string().optional(),
  assetId: z.string().optional(),
  policyVersion: z.string().optional(),
  generated: z.boolean().optional(),
  characterProfileId: z.string().optional(),
  characterProfileVersionId: z.string().optional(),
  lookId: z.string().optional(),
  lookVersionId: z.string().optional(),
  status: z.enum(["ready", "uploading", "failed", "reselect"]),
});
export type VideoSource = z.infer<typeof videoSourceSchema>;
export const videoDraftSchema = z.object({
  providerModelKey: z.string(),
  prompt: z.string(),
  operation: z.enum(["text_to_video", "image_to_video", "character_to_video"]),
  duration: z.string(),
  aspectRatio: z.string(),
  resolution: z.string(),
  audioMode: z.enum(["none", "generated"]),
  sources: z.array(videoSourceSchema).max(12),
});
export type VideoDraft = z.infer<typeof videoDraftSchema>;
export const emptyVideoDraft: VideoDraft = {
  providerModelKey: "",
  prompt: "",
  operation: "text_to_video",
  duration: "",
  aspectRatio: "",
  resolution: "",
  audioMode: "none",
  sources: [],
};
export const videoIntentSchema = z.object({
  requestId: z.string(),
  estimateId: z.string(),
  fingerprint: z.string(),
  taskId: z.string().nullable(),
  status: z.enum(["unknown", "accepted", "reconciliation_required"]),
  snapshot: videoDraftSchema,
});
export type VideoIntent = z.infer<typeof videoIntentSchema>;
export function persistentVideoDraft(draft: VideoDraft): VideoDraft {
  return {
    ...draft,
    sources: draft.sources.map((source) => ({
      ...source,
      status: source.status === "uploading" ? "reselect" : source.status,
    })),
  };
}
export function videoSourceUrl(source: VideoSource) {
  if (source.characterProfileId && source.lookId && source.lookVersionId)
    return `/api/character-profiles/${encodeURIComponent(source.characterProfileId)}/looks/${encodeURIComponent(source.lookId)}/versions/${encodeURIComponent(source.lookVersionId)}/media/sheet`;
  return referenceUrl({ ...source, role: "character_reference" });
}
export function videoReferencePlan(
  draft: VideoDraft,
  model: VideoModelCapability | null,
) {
  const trusted = (kind: VideoSource["kind"]) =>
    draft.sources
      .filter((source) => source.kind === kind && source.generationId)
      .map((source) => ({
        id: source.generationId!,
        previewUrl: videoSourceUrl(source) || "",
        modelId: "",
        generationMode: "",
        generatedAt: null,
        expiresAt: null,
        eligible: source.status === "ready",
        reason: null,
        policyVersion: source.policyVersion || "",
        characterName: source.name,
      }));
  return buildVideoReferenceSelection(
    {
      operation: draft.operation,
      referenceImageUrl: null,
      character: null,
      lookSheet: null,
      imageReferences: draft.sources
        .filter(
          (source) =>
            source.kind === "image" &&
            source.storageKey &&
            (!source.policyVersion ||
              model?.playgroundReferencePolicy?.allowImageReferenceUploads),
        )
        .map((source) => ({
          url: videoSourceUrl(source) || "",
          characterName: source.name,
        })),
      trustedImages: trusted("image"),
      trustedLooks: trusted("look"),
      lookSheets: draft.sources
        .filter(
          (source) =>
            source.kind === "look" &&
            (source.storageKey || source.lookVersionId) &&
            !source.policyVersion,
        )
        .map((source) => ({
          url: videoSourceUrl(source) || "",
          name: source.name,
          characterName: source.name,
          generated: source.generated,
          assetId: source.assetId,
          lookId: source.lookId,
          versionId: source.lookVersionId,
          characterProfileId: source.characterProfileId,
          characterProfileVersionId: source.characterProfileVersionId,
        })),
    },
    model,
  );
}
export function exactDurationRange(model: VideoModelCapability | null) {
  const values = [...new Set(model?.durations || [])].sort((a, b) => a - b);
  return model?.durationControlMode === "exact" &&
    values.length > 1 &&
    values.every(
      (value, index) =>
        Number.isInteger(value) && (!index || value === values[index - 1] + 1),
    )
    ? { min: values[0], max: values[values.length - 1] }
    : null;
}
export const terminalVideoStates = new Set([
  "completed",
  "failed",
  "cancelled",
  "expired",
  "reconciliation_required",
]);
export function canRecheckVideo(task?: VideoTask, now = Date.now()) {
  if (!task?.recheckAllowed) return false;
  const recovery = task.recovery;
  return (
    !(
      recovery?.explicitNextCheckAt &&
      Date.parse(recovery.explicitNextCheckAt) > now
    ) &&
    !(recovery?.deadlineAt && Date.parse(recovery.deadlineAt) <= now) &&
    !(recovery && recovery.explicitCheckCount >= recovery.explicitMaxChecks)
  );
}

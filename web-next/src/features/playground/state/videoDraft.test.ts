import { describe, expect, it } from "vitest";
import { canRecheckVideo, emptyVideoDraft, exactDurationRange, persistentVideoDraft, videoReferencePlan } from "./videoDraft";
import { videoModelCapabilitySchema, videoTaskSchema } from "../../../../../web/src/features/generation/schemas/videoGenerationSchemas";

const model = videoModelCapabilitySchema.parse({ providerId: "fixture", modelId: "fixture", displayName: "Fixture", qualificationStatus: "available", paidRoutingEnabled: false,
  durations: Array.from({ length: 27 }, (_, index) => index + 4), inputModes: ["text_to_video", "image_to_video", "multimodal_reference"], supportsOrderedImageReferences: true, referenceImageLimit: 9,
});
describe("FE24 Video contracts", () => {
  it("uses a range only for exact consecutive integer values", () => {
    expect(exactDurationRange(model)).toEqual({ min: 4, max: 30 });
    expect(exactDurationRange({ ...model, durations: [5, 10] })).toBeNull();
    expect(exactDurationRange({ ...model, durationControlMode: "prompted" })).toBeNull();
    expect(exactDurationRange({ ...model, durations: [4, 4.5, 5] })).toBeNull();
  });
  it("retains per-source recovery without persisting upload bytes", () => {
    const result = persistentVideoDraft({ ...emptyVideoDraft, sources: [{ id: "upload", name: "", kind: "image", status: "uploading" }] });
    expect(result.sources[0].status).toBe("reselect");
    expect(JSON.stringify(result)).not.toContain("data:");
  });
  it("keeps the canonical reference order and exact roles", () => {
    const source = (id: string) => ({ id, name: "", kind: "image" as const, status: "ready" as const, storageKey: `${id}.png` });
    const draft = { ...emptyVideoDraft, operation: "image_to_video" as const, sources: [source("first")] };
    expect(videoReferencePlan(draft, model).references[0]).toMatchObject({ role: "first_frame", referenceImageUrl: "/outputs/first.png" });
    const plan = videoReferencePlan({ ...draft, sources: [...draft.sources, source("second")] }, model);
    expect(plan.inputMode).toBe("multimodal_reference");
    expect(plan.references.map(row => row.referenceImageUrl)).toEqual(["/outputs/first.png", "/outputs/second.png"]);
    expect(plan.references.every(row => row.role === "reference_image")).toBe(true);
  });
  it("preserves mixed uploaded and trusted composition images when upload policy explicitly permits them", () => {
    const policyModel = { ...model, playgroundReferencePolicy: { kind: "trusted_generated_only" as const, version: "v1", allowImageReferenceUploads: true } };
    const plan = videoReferencePlan({ ...emptyVideoDraft, operation: "image_to_video", sources: [
      { id: "upload", name: "", kind: "image", status: "ready", storageKey: "upload.png" },
      { id: "trusted", name: "", kind: "image", status: "ready", storageKey: "trusted.png", generationId: "trusted", policyVersion: "v1" },
    ] }, policyModel);
    expect(plan.references).toHaveLength(2);
  });
  it("honors recovery cooldown, deadline and explicit check allowance", () => {
    const task = videoTaskSchema.parse({ id: "task", status: "reconciliation_required", recheckAllowed: true, recovery: { stage: "provider", policyVersion: "v1", startedAt: null, deadlineAt: "2026-11-20T12:00:00Z", nextCheckAt: null, explicitNextCheckAt: "2026-11-20T11:00:00Z", explicitCheckCount: 0, explicitMaxChecks: 2 } });
    expect(canRecheckVideo(task, Date.parse("2026-11-20T10:00:00Z"))).toBe(false);
    expect(canRecheckVideo(task, Date.parse("2026-11-20T11:30:00Z"))).toBe(true);
    expect(canRecheckVideo(task, Date.parse("2026-11-20T12:00:00Z"))).toBe(false);
    expect(canRecheckVideo({ ...task, recheckAllowed: false }, Date.parse("2026-11-20T11:30:00Z"))).toBe(false);
  });
  it("reconstructs approved Character look authority from IDs without persisting private URLs", () => {
    const draft = { ...emptyVideoDraft, operation: "character_to_video" as const, sources: [{ id: "look", name: "", kind: "look" as const, status: "ready" as const, characterProfileId: "char-1", characterProfileVersionId: "cv-1", lookId: "look-1", lookVersionId: "lv-1" }] };
    const plan = videoReferencePlan(draft, model);
    expect(plan.ready).toBe(true);
    expect(plan.references[0]).toMatchObject({ purpose: "character_look", characterProfileId: "char-1", characterLookId: "look-1", characterLookVersionId: "lv-1" });
    expect(JSON.stringify(persistentVideoDraft(draft))).not.toContain("/api/");
  });
});

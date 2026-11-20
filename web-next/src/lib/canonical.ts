// Temporary FE24 compatibility boundary. Implementations stay with their existing owners.
export {
  ActorProvider,
  useActor,
} from "../../../web/src/lib/auth/ActorProvider";
export { apiMediaBlob, apiRequest } from "../../../web/src/lib/api/apiClient";
export { getIdentitySnapshot } from "../../../web/src/lib/auth/actorStore";
export {
  readActorScopedDraft,
  writeActorScopedDraft,
  removeActorScopedDraft,
} from "../../../web/src/lib/persistence/actorScopedStorage";
export { ProcessingSpinner } from "../../../web/src/components/ui/ProcessingSpinner";
export { GenerationModelPicker } from "../../../web/src/components/generation/GenerationModelPicker";
export {
  getProviderCatalog,
  uploadGenerationReference,
  estimateGeneration,
  previewCompiledPrompt,
  previewReferenceProcessing,
  submitGeneration,
} from "../../../web/src/features/generation/api/generationApi";
export type {
  GenerationRequestDraft,
  GenerationReferenceRole,
} from "../../../web/src/features/generation/api/generationApi";
export type { ProviderCatalog } from "../../../web/src/features/generation/schemas/generationSchemas";
export { listHistory } from "../../../web/src/features/history/api/historyApi";
export type { HistoryItem } from "../../../web/src/features/history/schemas/historySchemas";
export { useGenerationJob } from "../../../web/src/features/generation/hooks/useGenerationJob";
export { useGenerationGroup } from "../../../web/src/features/generation/hooks/useGenerationGroup";
export { useGenerationJobCenter } from "../../../web/src/features/generation/job-center/useGenerationJobCenter";
export { imageModelUnavailableReason } from "../../../web/src/features/generation/modelAvailability";
export { getImageRequestStatus } from "../../../web/src/features/generation/api/generationApi";

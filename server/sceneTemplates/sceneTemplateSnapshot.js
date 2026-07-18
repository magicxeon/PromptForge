/**
 * ModelPromptForge - Scene Template Snapshot Generator (Server Side)
 */

function createSceneTemplateSnapshot(input = {}) {
  const authoringMode = input.authoringMode === "manual" ? "manual" : "guided";
  const providerId = input.providerId || input.provider || null;
  const modelId = input.modelId || input.submodel || null;
  
  return {
    sceneTemplateVersion: 1,
    authoringMode,
    finalPromptSnapshot: input.finalPrompt || "",
    structuredSelectionsSnapshot: authoringMode === "guided" ? (input.selections || {}) : {},
    manualPromptSnapshot: authoringMode === "manual" ? (input.manualPromptText || "") : "",
    referenceSlotMapping: input.referenceSlotMapping || {},
    replaceableVariables: input.replaceableVariables || [],
    providerModelSnapshot: {
      providerId,
      providerDisplayName: input.providerDisplayName || null,
      modelId,
      modelDisplayName: input.modelDisplayName || null,
      resolutionAspectRatios: input.resolutionAspectRatios || [],
      referenceSupportSummary: input.referenceSupportSummary || "",
      estimatedCreditCost: typeof input.estimatedCreditCost === "number" ? input.estimatedCreditCost : 1
    },
    generationSettingsSnapshot: {
      aspectRatio: input.aspectRatio || "6:8",
      width: input.width || "768",
      height: input.height || "1024",
      resolution: input.imageResolution || null
    },
    createdFromGenerationId: input.createdFromGenerationId || null,
    createdAt: Date.now()
  };
}

/**
 * Filter public template payloads based on prompt visibility policies
 */
function sanitizeSceneTemplateSnapshot(snapshot, visibilityPolicy = "full") {
  if (!snapshot || typeof snapshot !== "object") return null;
  const sanitized = JSON.parse(JSON.stringify(snapshot));

  // Visibility options: full, partial, remix_only, private
  if (visibilityPolicy === "private") {
    // Completely hide details
    sanitized.finalPromptSnapshot = "";
    sanitized.structuredSelectionsSnapshot = {};
    sanitized.manualPromptSnapshot = "";
  } else if (visibilityPolicy === "remix_only") {
    // Hide text values but keep slots / variables
    sanitized.finalPromptSnapshot = "";
    sanitized.manualPromptSnapshot = "";
    // Redact structured text values
    Object.keys(sanitized.structuredSelectionsSnapshot || {}).forEach(key => {
      if (sanitized.structuredSelectionsSnapshot[key]) {
        sanitized.structuredSelectionsSnapshot[key].value = "[Hidden]";
      }
    });
  } else if (visibilityPolicy === "partial") {
    // Keep structuredSelections but clear full prompt text
    sanitized.finalPromptSnapshot = "";
  }

  // Strip sensitive local file paths or private links from reference previews
  if (sanitized.referenceSlotMapping) {
    Object.keys(sanitized.referenceSlotMapping).forEach(slotId => {
      const slot = sanitized.referenceSlotMapping[slotId];
      if (slot && typeof slot === "object") {
        delete slot.sourceAssetId;
        delete slot.sourceJobId;
      }
    });
  }

  return sanitized;
}

export {
  createSceneTemplateSnapshot,
  sanitizeSceneTemplateSnapshot
};

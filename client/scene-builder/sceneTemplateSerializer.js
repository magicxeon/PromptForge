/**
 * ModelPromptForge - Scene Template Serializer (Pure Functions)
 */
(function () {
  /**
   * Create an immutable versioned snapshot of the Scene configuration based on pure input context.
   */
  function createSceneTemplateSnapshot(input = {}) {
    const authoringMode = input.authoringMode === "manual" ? "manual" : "guided";
    const finalPrompt = input.finalPrompt || "";

    // 1. Generation settings
    const generationSettings = {
      aspectRatio: input.aspectRatio || "6:8",
      width: input.width || "768",
      height: input.height || "1024",
      resolution: input.resolution || null
    };

    // 2. Structured selections (guided only)
    const selections = authoringMode === "guided" 
      ? JSON.parse(JSON.stringify(input.selections || {})) 
      : {};

    // 3. Reference slots mappings
    const referenceSlotMapping = {};
    const imgRefs = input.imageReferences || {};
    if (imgRefs.faceMatch) {
      referenceSlotMapping["face_reference"] = {
        required: true,
        policy: "required_user_replacement",
        sharePolicy: "required_user_replacement"
      };
    }
    if (imgRefs.characterReference) {
      referenceSlotMapping["character_reference"] = {
        required: true,
        policy: "required_user_replacement",
        sharePolicy: "required_user_replacement"
      };
    }
    if (imgRefs.styleMatch) {
      referenceSlotMapping["style_reference"] = {
        required: false,
        policy: "shared_as_reusable_reference",
        sharePolicy: "shared_as_reusable_reference"
      };
    }
    if (imgRefs.outfitReference) {
      referenceSlotMapping["outfit_front_reference"] = {
        required: false,
        policy: "optional_user_replacement",
        sharePolicy: "shared_preview_only"
      };
      referenceSlotMapping["outfit_back_reference"] = {
        required: false,
        policy: "optional_user_replacement",
        sharePolicy: "shared_preview_only"
      };
    }

    // 4. Replaceable variables default list
    const replaceableVariables = [];
    if (authoringMode === "guided") {
      ["Primary Color", "Secondary Color", "Pattern", "Material", "Outfit Base"].forEach(field => {
        if (selections[field]) {
          replaceableVariables.push({
            id: field.toLowerCase().replace(/\s+/g, "_"),
            label: field,
            type: "select_option",
            sourceFieldName: field,
            required: false
          });
        }
      });
      // Custom colors variables
      Object.keys(input.customColors || {}).forEach(colorKey => {
        const colorConfig = input.customColors[colorKey];
        if (colorConfig && colorConfig.enabled) {
          replaceableVariables.push({
            id: `custom_color_${colorKey.toLowerCase().replace(/\s+/g, "_")}`,
            label: `${colorKey} Color`,
            type: "color",
            sourceFieldName: colorKey,
            required: false,
            defaultValue: colorConfig.color || "#000000"
          });
        }
      });
    }

    // Reference images are always replaceable if active
    Object.keys(referenceSlotMapping).forEach(slotId => {
      let refVal = null;
      if (slotId === "face_reference") refVal = input.faceReferenceImageA || input.faceReferenceImageB;
      else if (slotId === "style_reference") refVal = input.styleReferenceImageA || input.styleReferenceImageB;
      else if (slotId === "character_reference") refVal = input.characterReferenceImageA || input.characterReferenceImageB;
      else if (slotId === "outfit_front_reference") refVal = input.outfitReferenceImageFront;
      else if (slotId === "outfit_back_reference") refVal = input.outfitReferenceImageBack;

      let defaultValue = null;
      if (refVal && typeof refVal === "string") {
        if (!refVal.startsWith("data:image/")) {
          defaultValue = refVal;
        }
      }

      replaceableVariables.push({
        id: slotId,
        label: slotId.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
        type: "reference_image",
        sourceFieldName: slotId,
        required: referenceSlotMapping[slotId].required,
        defaultValue
      });
    });

    return {
      sceneTemplateVersion: 1,
      authoringMode,
      finalPromptSnapshot: finalPrompt,
      structuredSelectionsSnapshot: selections,
      manualPromptSnapshot: authoringMode === "manual" ? (input.manualPromptText || "") : "",
      referenceSlotMapping,
      replaceableVariables,
      providerModelSnapshot: {
        providerId: input.providerId || null,
        providerDisplayName: input.providerDisplayName || null,
        modelId: input.modelId || null,
        modelDisplayName: input.modelDisplayName || null,
        resolutionAspectRatios: input.resolutionAspectRatios || [],
        referenceSupportSummary: input.referenceSupportSummary || "",
        estimatedCreditCost: typeof input.estimatedCreditCost === "number" ? input.estimatedCreditCost : 1
      },
      generationSettingsSnapshot: generationSettings,
      createdFromGenerationId: input.createdFromGenerationId || null,
      createdAt: Date.now()
    };
  }

  // Expose to window namespace
  window.ModelPromptForgeSceneTemplateSerializer = {
    createSceneTemplateSnapshot
  };
})();

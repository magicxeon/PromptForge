/**
 * ModelPromptForge - Scene Template Validator (Server Side)
 */

function validateSceneTemplateSnapshot(snapshot) {
  const errors = [];

  if (!snapshot || typeof snapshot !== "object") {
    errors.push("Template snapshot must be a valid JSON object");
    return { success: false, errors };
  }

  if (typeof snapshot.sceneTemplateVersion !== "number") {
    errors.push("Missing or invalid 'sceneTemplateVersion'");
  }

  if (snapshot.authoringMode !== "guided" && snapshot.authoringMode !== "manual") {
    errors.push("Invalid 'authoringMode', must be 'guided' or 'manual'");
  }

  if (typeof snapshot.finalPromptSnapshot !== "string") {
    errors.push("Missing or invalid 'finalPromptSnapshot'");
  }

  if (!snapshot.providerModelSnapshot || typeof snapshot.providerModelSnapshot !== "object") {
    errors.push("Missing or invalid 'providerModelSnapshot'");
  }

  if (!snapshot.generationSettingsSnapshot || typeof snapshot.generationSettingsSnapshot !== "object") {
    errors.push("Missing or invalid 'generationSettingsSnapshot'");
  }

  if (!Array.isArray(snapshot.replaceableVariables)) {
    errors.push("Missing or invalid 'replaceableVariables' array");
  }

  return {
    success: errors.length === 0,
    errors
  };
}

export {
  validateSceneTemplateSnapshot
};

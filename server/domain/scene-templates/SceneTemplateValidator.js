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
  } else {
    const ids = new Set();
    snapshot.replaceableVariables.forEach((variable, index) => {
      if (!variable || typeof variable !== "object") {
        errors.push(`Variable at index ${index} must be a valid JSON object`);
        return;
      }
      if (typeof variable.id !== "string" || !variable.id.trim()) {
        errors.push(`Variable at index ${index} has missing or invalid 'id'`);
      } else {
        if (ids.has(variable.id)) {
          errors.push(`Duplicate variable id '${variable.id}' detected`);
        }
        ids.add(variable.id);
      }
      const validTypes = new Set(["reference_image", "select_option", "custom_text", "color", "locked_text"]);
      if (!validTypes.has(variable.type)) {
        errors.push(`Variable at index ${index} ('${variable.id || index}') has invalid type '${variable.type}'`);
      }
      if (typeof variable.sourceFieldName !== "string" || !variable.sourceFieldName.trim()) {
        errors.push(`Variable at index ${index} ('${variable.id || index}') has missing or invalid 'sourceFieldName'`);
      }
      if (variable.replacementPolicy && variable.replacementPolicy !== "locked" && variable.replacementPolicy !== "replaceable") {
        errors.push(`Variable '${variable.id || index}' has invalid replacementPolicy '${variable.replacementPolicy}'`);
      }
      if (variable.required !== undefined && typeof variable.required !== "boolean") {
        errors.push(`Variable '${variable.id || index}' has invalid required flag (must be boolean)`);
      }
      if (variable.allowedOptionIds !== undefined && !Array.isArray(variable.allowedOptionIds)) {
        errors.push(`Variable '${variable.id || index}' allowedOptionIds must be an array`);
      }
    });
  }

  return {
    success: errors.length === 0,
    errors
  };
}

export {
  validateSceneTemplateSnapshot
};

/**
 * ModelPromptForge - Scene Template Variable Resolver (Server Side)
 */

function resolveTemplateVariablesOnServer(snapshot, userInput = {}) {
  if (!snapshot || typeof snapshot !== "object") {
    return { success: false, patch: null, errors: ["Invalid template snapshot"] };
  }

  const errors = [];
  const selectionsPatch = {};
  const customColorsPatch = {};
  const referencesPatch = {};

  const variables = snapshot.replaceableVariables || [];

  variables.forEach(variable => {
    const val = userInput[variable.id] !== undefined ? userInput[variable.id] : variable.defaultValue;

    // Check locked policy
    if (variable.replacementPolicy === "locked" && userInput[variable.id] !== undefined) {
      errors.push(`Variable '${variable.id}' is locked and cannot be replaced.`);
      return;
    }

    // Check requirement
    const hasValue = val !== undefined && val !== null && String(val).trim() !== "";
    if (variable.required && !hasValue) {
      errors.push(`Required variable '${variable.id}' is missing.`);
      return;
    }

    if (!hasValue) return;

    // Validate type constraints
    if (variable.type === "color") {
      const colorRegex = /^#([0-9a-fA-F]{3}){1,2}$/;
      if (!colorRegex.test(val)) {
        errors.push(`Value '${val}' is not a valid hex color.`);
      } else {
        customColorsPatch[variable.sourceFieldName] = {
          enabled: true,
          color: String(val)
        };
      }
    } else if (variable.type === "reference_image") {
      const isBase64 = String(val).startsWith("data:image/");
      const isUrl = String(val).startsWith("/") || String(val).startsWith("http://") || String(val).startsWith("https://");
      if (!isBase64 && !isUrl) {
        errors.push(`Reference image '${variable.id}' must be a valid base64 data URL or file path.`);
      } else {
        referencesPatch[variable.sourceFieldName] = val;
      }
    } else if (variable.type === "select_option") {
      selectionsPatch[variable.sourceFieldName] = {
        id: val,
        group: variable.sourceGroup || ""
      };
    } else if (variable.type === "custom_text") {
      selectionsPatch[variable.sourceFieldName] = {
        value: String(val),
        isCustom: true,
        group: variable.sourceGroup || ""
      };
    }
  });

  return {
    success: errors.length === 0,
    patch: {
      selections: selectionsPatch,
      customColors: customColorsPatch,
      references: referencesPatch
    },
    errors
  };
}

export {
  resolveTemplateVariablesOnServer
};

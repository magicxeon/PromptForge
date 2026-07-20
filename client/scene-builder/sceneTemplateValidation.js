/**
 * ModelPromptForge - Scene Template Variable Validation (Pure Functions)
 */
(function () {
  /**
   * Validate a variable's structure.
   */
  function validateTemplateVariable(variable) {
    const errors = [];
    if (!variable || typeof variable !== "object") {
      return { success: false, errors: ["Variable must be a valid JSON object"] };
    }

    if (typeof variable.id !== "string" || !variable.id.trim()) {
      errors.push("Variable missing or invalid 'id'");
    }

    const validTypes = new Set(["reference_image", "select_option", "custom_text", "color", "locked_text"]);
    if (!validTypes.has(variable.type)) {
      errors.push(`Variable type '${variable.type}' is invalid`);
    }

    if (typeof variable.sourceFieldName !== "string" || !variable.sourceFieldName.trim()) {
      errors.push("Variable missing or invalid 'sourceFieldName'");
    }

    return {
      success: errors.length === 0,
      errors
    };
  }

  /**
   * Validate an input value against variable constraints.
   */
  function validateReplacementInput(variable, value) {
    const errors = [];
    if (!variable) return { success: false, errors: ["Missing variable definition"] };

    // Check requirement
    const hasValue = value !== undefined && value !== null && String(value).trim() !== "";
    if (variable.required && !hasValue) {
      errors.push(`Required field '${variable.id}' is missing`);
      return { success: false, errors };
    }

    if (!hasValue) {
      return { success: true, errors };
    }

    // Type validation
    if (variable.type === "color") {
      const colorRegex = /^#([0-9a-fA-F]{3}){1,2}$/;
      if (!colorRegex.test(value)) {
        errors.push(`Value '${value}' is not a valid hex color`);
      }
    } else if (variable.type === "reference_image") {
      // Validate that it's a URL or base64 data string
      const isBase64 = String(value).startsWith("data:image/");
      const isUrl = String(value).startsWith("/") || String(value).startsWith("http://") || String(value).startsWith("https://");
      if (!isBase64 && !isUrl) {
        errors.push(`Value for reference image must be a valid base64 data string or URL`);
      }
    }

    return {
      success: errors.length === 0,
      errors
    };
  }

  /**
   * Scan snapshot and return any required variables that are missing from user inputs.
   */
  function getMissingRequiredVariables(snapshot, userInput = {}) {
    if (!snapshot || !Array.isArray(snapshot.replaceableVariables)) {
      return [];
    }

    return snapshot.replaceableVariables.filter(variable => {
      if (!variable.required) return false;
      const userVal = userInput[variable.id];
      const hasUserVal = userVal !== undefined && userVal !== null && String(userVal).trim() !== "";
      const hasDefault = variable.defaultValue !== undefined && variable.defaultValue !== null && String(variable.defaultValue).trim() !== "";
      return !hasUserVal && !hasDefault;
    });
  }

  // Expose to window
  window.ModelPromptForgeSceneTemplateValidation = {
    validateTemplateVariable,
    validateReplacementInput,
    getMissingRequiredVariables
  };
})();

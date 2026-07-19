/**
 * ModelPromptForge - Scene Template Variable Resolver (Pure Functions)
 */
(function () {
  const IDENTITY_GROUPS = new Set(["Character", "Face", "Hair", "Skin"]);

  /**
   * Automatically generate variable options from selections, references, and colors.
   */
  function createSceneVariablesFromSelections(selections = {}, referenceSlots = {}, customColors = {}, policies = {}) {
    const variables = [];

    // 1. Process selections
    Object.keys(selections).forEach(fieldName => {
      const selection = selections[fieldName];
      if (!selection) return;

      const group = selection.group || "";
      const isIdentity = IDENTITY_GROUPS.has(group);
      
      // Default policy: identity locked, others replaceable
      let replacementPolicy = isIdentity ? "locked" : "replaceable";
      if (policies[fieldName]) {
        replacementPolicy = policies[fieldName]; // override if custom policy is specified
      }

      variables.push({
        id: fieldName.toLowerCase().replace(/\s+/g, "_"),
        type: selection.isCustom ? "custom_text" : "select_option",
        sourceFieldName: fieldName,
        sourceGroup: group,
        required: false,
        defaultValue: selection.id || selection.value || null,
        allowedOptionIds: selection.isCustom ? [] : [selection.id],
        acceptsCustomText: !!selection.isCustom,
        replacementPolicy
      });
    });

    // 2. Process custom colors
    Object.keys(customColors).forEach(colorKey => {
      const colorConfig = customColors[colorKey];
      if (colorConfig && colorConfig.enabled) {
        variables.push({
          id: `custom_color_${colorKey.toLowerCase().replace(/\s+/g, "_")}`,
          type: "color",
          sourceFieldName: colorKey,
          required: false,
          defaultValue: colorConfig.color || "#000000",
          replacementPolicy: "replaceable"
        });
      }
    });

    // 3. Process reference image slots
    Object.keys(referenceSlots).forEach(slotId => {
      const slot = referenceSlots[slotId];
      if (!slot) return;

      variables.push({
        id: slotId,
        type: "reference_image",
        sourceFieldName: slotId,
        required: !!slot.required,
        defaultValue: null,
        replacementPolicy: "replaceable"
      });
    });

    return variables;
  }

  /**
   * Resolve user inputs against a template snapshot, generating patches for selections, references, and custom colors.
   */
  function resolveTemplateVariables(snapshot, userInput = {}, library = []) {
    if (!snapshot || typeof snapshot !== "object") {
      return { success: false, patch: null, warnings: ["Invalid template snapshot"] };
    }

    const warnings = [];
    const selectionsPatch = {};
    const customColorsPatch = {};
    const referencesPatch = {};

    const variables = snapshot.replaceableVariables || [];
    const validIds = new Set((library || []).filter(item => item.enabled !== false).map(item => item.id));

    variables.forEach(variable => {
      const val = userInput[variable.id] !== undefined ? userInput[variable.id] : variable.defaultValue;

      if (variable.replacementPolicy === "locked" && userInput[variable.id] !== undefined) {
        warnings.push(`Variable '${variable.id}' is locked and cannot be replaced.`);
        return;
      }

      if (variable.type === "reference_image") {
        if (val) {
          referencesPatch[variable.sourceFieldName] = val;
        } else if (variable.required) {
          warnings.push(`Required reference image '${variable.id}' is missing.`);
        }
      } else if (variable.type === "select_option") {
        if (val) {
          if (validIds.size > 0 && !validIds.has(val)) {
            warnings.push(`Option ID '${val}' is not available in the library schema.`);
          } else {
            selectionsPatch[variable.sourceFieldName] = {
              id: val,
              group: variable.sourceGroup || ""
            };
          }
        } else if (variable.required) {
          warnings.push(`Required field '${variable.id}' is missing.`);
        }
      } else if (variable.type === "custom_text") {
        if (val) {
          selectionsPatch[variable.sourceFieldName] = {
            value: String(val),
            isCustom: true,
            group: variable.sourceGroup || ""
          };
        } else if (variable.required) {
          warnings.push(`Required text field '${variable.id}' is missing.`);
        }
      } else if (variable.type === "color") {
        if (val) {
          customColorsPatch[variable.sourceFieldName] = {
            enabled: true,
            color: String(val)
          };
        }
      }
    });

    return {
      success: warnings.length === 0,
      patch: {
        selections: selectionsPatch,
        customColors: customColorsPatch,
        references: referencesPatch
      },
      warnings
    };
  }

  // Expose to window
  window.ModelPromptForgeSceneVariableResolver = {
    createSceneVariablesFromSelections,
    resolveTemplateVariables
  };
})();

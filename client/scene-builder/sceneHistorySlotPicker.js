/**
 * ModelPromptForge - Scene History Slot Picker for Template Mode
 */
(function () {
  /**
   * Get all variables of type "reference_image" in the template snapshot
   */
  function getTemplateReferenceVariables(snapshot) {
    if (!snapshot || !Array.isArray(snapshot.replaceableVariables)) return [];
    return snapshot.replaceableVariables.filter(v => v.type === "reference_image");
  }

  /**
   * Get any required reference variables that do not have values assigned in userInputValues
   */
  function getMissingRequiredReferenceVariables(snapshot, userInputValues) {
    const refs = getTemplateReferenceVariables(snapshot);
    return refs.filter(v => v.required && !userInputValues[v.id]);
  }

  /**
   * Infer target slot suggestion based on historyItem mode
   */
  function getDefaultHistoryTargetSlot(snapshot, userInputValues, historyItem) {
    if (!snapshot || !historyItem) return null;
    const mode = historyItem.mode;
    const refs = getTemplateReferenceVariables(snapshot);
    if (refs.length === 0) return null;

    if (mode === "headshot") {
      const match = refs.find(v => v.id === "face_reference");
      if (match) return match.id;
    } else if (mode === "character-sheet") {
      const match = refs.find(v => v.id === "character_reference");
      if (match) return match.id;
    }
    return null;
  }

  /**
   * Check if historyItem is usable for template
   */
  function isHistoryImageUsableForTemplate(historyItem) {
    return !!(historyItem && (historyItem.imageUrl || historyItem.thumbnailUrl));
  }

  /**
   * Assign history image to target slot, with overwrite confirmation
   */
  async function assignHistoryImageToTemplateSlot(slotId, historyItem) {
    const checklist = window.ModelPromptForgeSceneReplacementChecklist;
    if (!checklist) return { success: false, error: "Replacement checklist module not loaded" };

    const snapshot = checklist.getActiveTemplateSnapshot();
    if (!snapshot) return { success: false, error: "No active template snapshot" };

    const variables = snapshot.replaceableVariables || [];
    const variable = variables.find(v => v.id === slotId);
    if (!variable) return { success: false, error: "Target slot not found in template" };

    // Contract ReferenceValue structure
    const refValue = {
      source: "history",
      jobId: historyItem.jobId || historyItem.id,
      imageUrl: historyItem.imageUrl || "",
      thumbnailUrl: historyItem.thumbnailUrl || "",
      provider: historyItem.provider || null,
      submodel: historyItem.submodel || null,
      sourceMode: historyItem.mode || null
    };

    // Update checklist input value
    const userInputValues = window.ModelPromptForgeSceneReplacementChecklist.userInputValues || {};
    userInputValues[slotId] = refValue;

    // Trigger checklist re-render and generate button update
    if (typeof window.ModelPromptForgeSceneReplacementChecklist.renderChecklist === "function") {
      window.ModelPromptForgeSceneReplacementChecklist.renderChecklist();
    }
    if (typeof window.ModelPromptForgeSceneReplacementChecklist.updateGenerateButtonState === "function") {
      window.ModelPromptForgeSceneReplacementChecklist.updateGenerateButtonState();
    }

    return { success: true, slotId };
  }

  /**
   * Open the selector modal to pick target slot for historyItem
   */
  async function openTemplateSlotPicker(historyItem) {
    if (!isHistoryImageUsableForTemplate(historyItem)) {
      if (window.AppDialog) {
        await window.AppDialog.alert("Selected history entry does not contain a valid image.", { title: "Invalid Reference" });
      }
      return;
    }

    const checklist = window.ModelPromptForgeSceneReplacementChecklist;
    if (!checklist || !checklist.isTemplateWorkflowActive()) return;

    const snapshot = checklist.getActiveTemplateSnapshot();
    const userInputValues = checklist.userInputValues || {};
    const refVars = getTemplateReferenceVariables(snapshot);

    if (refVars.length === 0) {
      if (window.AppDialog) {
        await window.AppDialog.alert("This template does not accept reference images.", { title: "No Reference Slots" });
      }
      return;
    }

    const missingRequired = getMissingRequiredReferenceVariables(snapshot, userInputValues);
    const recommendedSlotId = getDefaultHistoryTargetSlot(snapshot, userInputValues, historyItem);

    // Rule: If exactly one missing required slot remains, auto-fill it
    if (missingRequired.length === 1) {
      const targetSlot = missingRequired[0].id;
      await handleAssignmentWithOverwriteCheck(targetSlot, historyItem);
      return;
    }

    // Build option choices for AppDialog.select
    const selectOptions = refVars.map(v => {
      let label = v.label || v.sourceFieldName;
      const tags = [];
      if (v.id === recommendedSlotId) tags.push("Recommended");
      if (v.required) tags.push("Required");
      if (userInputValues[v.id]) tags.push("Filled");

      if (tags.length > 0) {
        label += ` (${tags.join(", ")})`;
      }
      return {
        label: label,
        value: v.id
      };
    });

    if (window.AppDialog) {
      const selectedSlotId = await window.AppDialog.select("Select target reference slot:", {
        title: "Add to Template",
        options: selectOptions,
        value: recommendedSlotId || refVars[0].id
      });

      if (selectedSlotId) {
        await handleAssignmentWithOverwriteCheck(selectedSlotId, historyItem);
      }
    }
  }

  async function handleAssignmentWithOverwriteCheck(slotId, historyItem) {
    const checklist = window.ModelPromptForgeSceneReplacementChecklist;
    const userInputValues = checklist.userInputValues || {};

    if (userInputValues[slotId]) {
      // Overwrite Confirmation
      if (window.AppDialog) {
        const confirm = await window.AppDialog.confirm(
          `Slot "${slotId}" is already filled. Do you want to replace it?`,
          { title: "Overwrite Reference" }
        );
        if (!confirm) return;
      }
    }

    const res = await assignHistoryImageToTemplateSlot(slotId, historyItem);
    if (res.success) {
      if (window.closeLightbox) window.closeLightbox();
      if (window.AppDialog) {
        console.log(`Successfully assigned reference to slot ${slotId}`);
      }
    } else {
      if (window.AppDialog) {
        await window.AppDialog.alert(res.error || "Failed to assign slot", { title: "Error" });
      }
    }
  }

  // Expose to window namespace
  window.ModelPromptForgeSceneHistorySlotPicker = {
    getTemplateReferenceVariables,
    getMissingRequiredReferenceVariables,
    getDefaultHistoryTargetSlot,
    assignHistoryImageToTemplateSlot,
    openTemplateSlotPicker,
    isHistoryImageUsableForTemplate
  };
})();

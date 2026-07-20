/**
 * ModelPromptForge - Scene Reference Slot Policy Validator
 */

/**
 * Determine if a specific reference slot can be reused by the executing viewer context.
 */
export function isReferenceReusableByViewer(slot = {}, viewerContext = {}, ownerUsername = null) {
  const isOwner = viewerContext.username && viewerContext.username === ownerUsername;
  if (isOwner) return true;

  const policy = slot.sharePolicy || slot.policy || 'required_user_replacement';
  return policy === 'shared_as_reusable_reference';
}

/**
 * Validate reference slots against user context, segregating allowed references from required replacements.
 */
export function validateReferenceSlotPolicies(slots = {}, viewerContext = {}, ownerUsername = null) {
  const publicSlots = {};
  const privateSlots = {};
  const requiredReplacements = [];
  const warnings = [];

  Object.entries(slots).forEach(([slotId, slot]) => {
    const isReusable = isReferenceReusableByViewer(slot, viewerContext, ownerUsername);
    
    if (isReusable) {
      publicSlots[slotId] = slot;
    } else {
      privateSlots[slotId] = slot;
      if (slot.required) {
        requiredReplacements.push(slotId);
      }
    }
  });

  return {
    publicSlots,
    privateSlots,
    requiredReplacements,
    warnings
  };
}

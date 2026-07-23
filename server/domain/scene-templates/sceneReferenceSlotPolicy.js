const VALID_POLICIES = new Set([
  'required_user_replacement',
  'shared_preview_only',
  'shared_as_reusable_reference',
  'not_shared'
]);

export function getReferenceSharePolicy(slotId = '', slot = {}) {
  const candidate = slot.sharePolicy || slot.policy;
  if (VALID_POLICIES.has(candidate)) return candidate;

  // Identity-bearing inputs are private by default. Other slots also remain private
  // unless a creator explicitly elects reusable sharing.
  if (/face|character/i.test(slotId)) return 'required_user_replacement';
  return 'required_user_replacement';
}

export function isReferenceReusableByViewer(slot = {}, viewerContext = {}, ownerIdentity = null) {
  if (isOwner(viewerContext, ownerIdentity)) return true;
  return getReferenceSharePolicy('', slot) === 'shared_as_reusable_reference';
}

export function validateReferenceSlotPolicies(slots = {}, viewerContext = {}, ownerIdentity = null) {
  const publicSlots = {};
  const privateSlots = {};
  const requiredReplacements = [];
  const warnings = [];

  Object.entries(slots).forEach(([slotId, slot]) => {
    const policy = getReferenceSharePolicy(slotId, slot);
    const isReusable = isReferenceReusableByViewer(slot, viewerContext, ownerIdentity);
    if (isReusable) {
      publicSlots[slotId] = slot;
      return;
    }

    privateSlots[slotId] = slot;
    if (slot.required || policy === 'required_user_replacement') requiredReplacements.push(slotId);
  });

  return { publicSlots, privateSlots, requiredReplacements, warnings };
}

export function isOwner(viewerContext = {}, ownerIdentity = null) {
  if (!ownerIdentity) return false;
  const owner = typeof ownerIdentity === 'string'
    ? { username: ownerIdentity }
    : ownerIdentity;
  if (owner.userId && viewerContext.userId) return owner.userId === viewerContext.userId;
  return Boolean(owner.username && viewerContext.username && owner.username === viewerContext.username);
}

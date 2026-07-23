import {
  getReferenceSharePolicy,
  isOwner,
  isReferenceReusableByViewer
} from './sceneReferenceSlotPolicy.js';

/**
 * Sanitizes a Scene Template snapshot before it crosses an ownership boundary.
 * `shared_preview_only` retains only a thumbnail for UI preview, never an image URL
 * or source identifier that a provider request could consume.
 */
export function sanitizeReferenceSlotsForPublic(snapshot, viewerContext = {}, ownerIdentity = null) {
  if (!snapshot || typeof snapshot !== 'object') return snapshot;
  if (isOwner(viewerContext, ownerIdentity)) return structuredClone(snapshot);

  const clone = structuredClone(snapshot);
  const mapping = clone.referenceSlotMapping || {};

  Object.entries(mapping).forEach(([slotId, slot]) => {
    const policy = getReferenceSharePolicy(slotId, slot);
    const reuseAllowed = isReferenceReusableByViewer(slot, viewerContext, ownerIdentity);
    const previewAllowed = policy === 'shared_preview_only' || reuseAllowed;

    slot.sharePolicy = policy;
    slot.reuseAllowed = reuseAllowed;
    slot.previewAllowed = previewAllowed;

    if (!reuseAllowed) {
      delete slot.sourceAssetId;
      delete slot.sourceJobId;
      delete slot.imageUrl;
      delete slot.provider;
      delete slot.submodel;
      delete slot.source;
    }
    if (!previewAllowed || policy === 'not_shared') delete slot.thumbnailUrl;
  });

  if (Array.isArray(clone.replaceableVariables)) {
    clone.replaceableVariables.forEach(variable => {
      if (variable.type !== 'reference_image') return;
      const slot = mapping[variable.id] || {};
      const policy = getReferenceSharePolicy(variable.id, slot);
      const reuseAllowed = isReferenceReusableByViewer(slot, viewerContext, ownerIdentity);

      if (reuseAllowed) return;
      if (policy === 'shared_preview_only') {
        const thumbnailUrl = slot.thumbnailUrl || variable.defaultValue?.thumbnailUrl || null;
        variable.previewValue = thumbnailUrl ? { thumbnailUrl } : null;
      } else {
        delete variable.previewValue;
      }
      variable.defaultValue = null;
    });
  }

  return clone;
}

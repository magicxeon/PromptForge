/**
 * ModelPromptForge - Scene Template Snapshot Sanitizer
 */

import { isReferenceReusableByViewer } from './sceneReferenceSlotPolicy.js';

/**
 * Sanitize a template snapshot for public/cross-user sharing, stripping unauthorized reference assets.
 */
export function sanitizeReferenceSlotsForPublic(snapshot, viewerContext = {}, ownerUsername = null) {
  if (!snapshot || typeof snapshot !== 'object') return snapshot;
  
  const isOwner = viewerContext.username && viewerContext.username === ownerUsername;
  if (isOwner) return snapshot; // Owner has full access, no sanitization needed

  const clone = JSON.parse(JSON.stringify(snapshot));
  const mapping = clone.referenceSlotMapping || {};

  // 1. Sanitize referenceSlotMapping to avoid leaks of sourceAssetId/sourceJobId/imageUrl
  Object.entries(mapping).forEach(([slotId, slot]) => {
    const policy = slot.sharePolicy || slot.policy || 'required_user_replacement';
    const reuseAllowed = isReferenceReusableByViewer(slot, viewerContext, ownerUsername);
    const previewAllowed = reuseAllowed || policy === 'shared_preview_only';

    slot.reuseAllowed = reuseAllowed;
    slot.previewAllowed = previewAllowed;

    if (!reuseAllowed) {
      delete slot.sourceAssetId;
      delete slot.sourceJobId;
      delete slot.imageUrl;
      delete slot.provider;
      delete slot.submodel;
      delete slot.source;

      if (!previewAllowed) {
        delete slot.thumbnailUrl;
      }
    }
  });

  // 2. Sanitize replaceableVariables defaultValue
  if (Array.isArray(clone.replaceableVariables)) {
    clone.replaceableVariables.forEach(variable => {
      if (variable.type === 'reference_image') {
        const slot = mapping[variable.id] || {};
        const policy = slot.sharePolicy || slot.policy || 'required_user_replacement';

        const reuseAllowed = isReferenceReusableByViewer(slot, viewerContext, ownerUsername);
        const previewAllowed = reuseAllowed || policy === 'shared_preview_only';

        if (!reuseAllowed) {
          if (previewAllowed && variable.defaultValue && typeof variable.defaultValue === 'object') {
            // Put preview image in separate previewValue field, and nullify defaultValue
            variable.previewValue = {
              imageUrl: variable.defaultValue.imageUrl || '',
              thumbnailUrl: variable.defaultValue.thumbnailUrl || ''
            };
          }
          variable.defaultValue = null;
        }
      }
    });
  }

  return clone;
}

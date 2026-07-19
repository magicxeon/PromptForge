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

  if (Array.isArray(clone.replaceableVariables)) {
    clone.replaceableVariables.forEach(variable => {
      if (variable.type === 'reference_image') {
        const slot = mapping[variable.id] || {};
        const policy = slot.sharePolicy || slot.policy || 'required_user_replacement';

        const reuseAllowed = isReferenceReusableByViewer(slot, viewerContext, ownerUsername);
        const previewAllowed = reuseAllowed || policy === 'shared_preview_only';

        if (!reuseAllowed) {
          if (previewAllowed && variable.defaultValue && typeof variable.defaultValue === 'object') {
            // Keep preview imagery but clear generation details
            variable.defaultValue = {
              source: 'history',
              imageUrl: variable.defaultValue.imageUrl || '',
              thumbnailUrl: variable.defaultValue.thumbnailUrl || '',
              jobId: null,
              provider: null,
              submodel: null,
              sourceMode: variable.defaultValue.sourceMode || null
            };
          } else {
            // Strip completely
            variable.defaultValue = null;
          }
        }
      }
    });
  }

  return clone;
}

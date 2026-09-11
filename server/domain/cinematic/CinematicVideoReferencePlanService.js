import { characterLookService } from '../character-profiles/CharacterLookService.js';
import { cinematicGeneratedCastService } from './CinematicGeneratedCastService.js';
import { resolveShotCastIds, resolveShotLookIds } from './CinematicCastCoverage.js';

export function cinematicVideoReferenceMode(value) {
  const mode = value || 'storyboard_only';
  if (!['storyboard_only', 'storyboard_and_looks', 'looks_only'].includes(mode)) throw referenceError('cinematic_video_reference_mode_invalid', 'Unknown video reference mode.');
  return mode;
}

export class CinematicVideoReferencePlanService {
  constructor({ lookService = characterLookService, generatedCastService = cinematicGeneratedCastService } = {}) {
    Object.assign(this, { lookService, generatedCastService });
  }

  async prepare({ project, scene, shot, source, mode, model, actorContext }) {
    mode = cinematicVideoReferenceMode(mode);
    const multiple = mode !== 'storyboard_only';
    if (mode !== 'looks_only' && !source?.sourceFingerprint) {
      throw referenceError('cinematic_storyboard_source_required', 'Approve a Storyboard source before using First Frame.');
    }
    const references = mode === 'looks_only' ? [] : [{
      role: multiple ? 'reference_image' : 'first_frame',
      assetId: source.assetId || null, assetVersionId: source.assetVersionId,
      sourceFingerprint: source.sourceFingerprint, referenceImageUrl: source.imageUrl,
      ...(multiple ? { purpose: 'storyboard_opening' } : {})
    }];
    if (!multiple) return { mode, inputMode: 'image_to_video', references };
    if (!model?.supportsCinematicLookReferences || !model.inputModes?.includes('multimodal_reference')) {
      throw referenceError('cinematic_video_look_references_unsupported', 'This model does not support the Storyboard and Look reference mode.');
    }
    const castIds = resolveShotCastIds(scene, shot);
    if (!castIds.length) throw referenceError('cinematic_video_reference_cast_missing', 'This Shot has no selected Character for a Look Sheet reference.');
    const referenceCount = castIds.length + references.length;
    if (referenceCount > model.referenceImageLimit) throw referenceError('cinematic_video_reference_limit', `This Shot needs ${referenceCount} images; the selected model allows ${model.referenceImageLimit}.`);
    const selectedLooks = new Set(resolveShotLookIds(scene, shot));
    const sceneCastIds = new Set(scene.castAssignmentIds || []);
    for (const castAssignmentId of castIds) {
      const assignment = project.castAssignments.find(item => item.id === castAssignmentId && item.active !== false);
      if (!assignment || !sceneCastIds.has(castAssignmentId) || assignment.identityReady !== true) {
        throw referenceError('cinematic_video_reference_cast_unavailable', 'A selected Character is unavailable or not ready.');
      }
      const matches = (assignment.looks || []).filter(look => selectedLooks.has(look.id));
      const label = assignment.storyRole || assignment.displayName || castAssignmentId;
      if (assignment.sourceType === 'generated_sheet') {
        const sheet = await this.generatedCastService.resolve(assignment, actorContext);
        if (matches.length !== 1 || matches[0].mode !== 'generated_sheet' || matches[0].locked !== true) {
          throw referenceError('cinematic_video_reference_look_required', `Choose the Cast sheet for ${label}.`);
        }
        references.push({ role: 'reference_image', purpose: 'generated_look',
          assetId: sheet.assetId, assetVersionId: sheet.assetId,
          sourceFingerprint: sheet.sourceFingerprint, referenceImageUrl: sheet.previewUrl,
          contentHash: sheet.contentHash, castAssignmentId, trustedGenerationId: sheet.generationId,
          characterName: assignment.displayName, roleName: label, lookName: assignment.displayName, previewUrl: sheet.previewUrl });
        continue;
      }
      if (matches.length !== 1 || matches[0].locked !== true || matches[0].mode !== 'character_look'
        || !matches[0].characterLookId || !matches[0].characterLookVersionId) {
        throw referenceError('cinematic_video_reference_look_required', `Choose one approved Character Look for ${label}.`);
      }
      const look = matches[0];
      const resolved = await this.lookService.resolveApprovedSheetReference(
        assignment.characterProfileId, look.characterLookId, look.characterLookVersionId, actorContext
      );
      references.push({
        role: 'reference_image', purpose: 'character_look',
        assetId: resolved.asset.id, assetVersionId: resolved.asset.id,
        sourceFingerprint: resolved.sourceFingerprint, referenceImageUrl: resolved.asset.publicUrl,
        contentHash: resolved.asset.contentHash, castAssignmentId,
        characterProfileId: assignment.characterProfileId,
        characterLookId: look.characterLookId, characterLookVersionId: look.characterLookVersionId,
        ...(resolved.trustedGenerationId ? { trustedGenerationId: resolved.trustedGenerationId } : {}),
        roleName: label, lookName: look.name || '', previewUrl: resolved.previewUrl
      });
    }
    return { mode, inputMode: 'multimodal_reference', references };
  }
}

function referenceError(code, message) { return Object.assign(new Error(message), { code, statusCode: 409 }); }

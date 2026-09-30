import { characterLookService } from '../character-profiles/CharacterLookService.js';
import { cinematicGeneratedCastService } from './CinematicGeneratedCastService.js';
import { resolveShotCastIds, resolveShotLookIds } from './CinematicCastCoverage.js';
import { assertFirstFramePolicy } from '../generation/VideoCapabilityRegistry.js';
import { storyboardCompositionPurpose } from './CinematicStoryboardRenderStyle.js';

export const usesFirstFrame = mode => !['looks_only', 'text_only'].includes(mode);

export function cinematicVideoReferenceMode(value) {
  const mode = value || 'storyboard_only';
  if (!['storyboard_only', 'storyboard_and_looks', 'looks_only', 'text_only'].includes(mode)) throw referenceError('cinematic_video_reference_mode_invalid', 'Unknown video reference mode.');
  return mode;
}

export class CinematicVideoReferencePlanService {
  constructor({ lookService = characterLookService, generatedCastService = cinematicGeneratedCastService } = {}) {
    Object.assign(this, { lookService, generatedCastService });
  }

  async prepare({ project, scene, shot, source, mode, model, actorContext, reviewExistingTake = false, portable = false }) {
    // Review reconstructs an already-submitted source; model flags still gate every new submission.
    mode = cinematicVideoReferenceMode(mode);
    if (mode === 'text_only') {
      if (resolveShotCastIds(scene, shot).length) throw referenceError('cinematic_video_text_only_cast', 'Use Look Sheets for a Shot with Cast.');
      if (!portable && !reviewExistingTake && !model?.inputModes?.includes('text_to_video')) throw referenceError('cinematic_video_text_only_unsupported', 'Choose a model that supports text-to-video.');
      return { mode, inputMode: 'text_to_video', references: [] };
    }
    const compositionPurpose = mode === 'storyboard_and_looks' && storyboardCompositionPurpose(source?.storyboardRenderStyle);
    if (!portable && !reviewExistingTake && usesFirstFrame(mode) && !compositionPurpose) assertFirstFramePolicy({ inputMode: 'image_to_video' }, model);
    const multiple = mode !== 'storyboard_only';
    const issues = [];
    const missingFrame = usesFirstFrame(mode) && (!source?.sourceFingerprint || (portable && !source?.imageUrl));
    if (missingFrame && !portable) {
      throw referenceError('cinematic_storyboard_source_required', 'Approve a Storyboard source before using First Frame.');
    }
    if (missingFrame) issues.push({ slot: 1, name: 'First Frame', code: 'first_frame_unavailable' });
    const references = mode === 'looks_only' || missingFrame ? [] : [{
      role: multiple ? 'reference_image' : 'first_frame',
      assetId: source.assetId || null, assetVersionId: source.assetVersionId,
      sourceFingerprint: source.sourceFingerprint, referenceImageUrl: source.imageUrl,
      ...(multiple ? { purpose: compositionPurpose || 'storyboard_opening' } : {})
    }];
    if (!multiple) return { mode, inputMode: 'image_to_video', references, ...(portable ? { issues } : {}) };
    if (!portable && !reviewExistingTake && (!model?.supportsCinematicLookReferences || !model.inputModes?.includes('multimodal_reference'))) {
      throw referenceError('cinematic_video_look_references_unsupported', 'This model does not support the Storyboard and Look reference mode.');
    }
    const castIds = resolveShotCastIds(scene, shot);
    if (!castIds.length && !compositionPurpose) throw referenceError('cinematic_video_reference_cast_missing', 'This Shot has no selected Character for a Look Sheet reference.');
    const referenceCount = castIds.length + references.length;
    const referenceLimit = portable ? 25 : reviewExistingTake ? 12 : model.referenceImageLimit;
    if (referenceCount > referenceLimit) throw referenceError('cinematic_video_reference_limit', `This Shot needs ${referenceCount} images; the selected model allows ${referenceLimit}.`);
    const selectedLooks = new Set(resolveShotLookIds(scene, shot));
    const sceneCastIds = new Set(scene.castAssignmentIds || []);
    for (const [castIndex, castAssignmentId] of castIds.entries()) {
      const assignment = project.castAssignments.find(item => item.id === castAssignmentId && item.active !== false);
      const referenceStart = references.length;
      try {
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
          characterName: assignment.displayName, roleName: label, lookName: assignment.displayName, previewUrl: sheet.previewUrl,
          referenceSource: 'generated', selectionScope: shot.manualStoryboard || shot.wardrobeLookIds?.length ? 'shot' : 'scene' });
        if (portable && !sheet.previewUrl) throw referenceError('cinematic_video_reference_unavailable', 'Reference image is unavailable.');
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
      if (!assignment.characterProfileVersionId || !resolved.characterProfileVersionId
        || resolved.characterProfileVersionId !== assignment.characterProfileVersionId) {
        throw referenceError('cinematic_look_identity_version_mismatch', 'Select a Look approved for the current Character identity version.');
      }
      references.push({
        role: 'reference_image', purpose: 'character_look',
        assetId: resolved.asset.id, assetVersionId: resolved.asset.id,
        sourceFingerprint: resolved.sourceFingerprint, referenceImageUrl: resolved.asset.publicUrl,
        contentHash: resolved.asset.contentHash, castAssignmentId,
        characterProfileId: assignment.characterProfileId,
        characterLookId: look.characterLookId, characterLookVersionId: look.characterLookVersionId,
        ...(resolved.trustedGenerationId ? { trustedGenerationId: resolved.trustedGenerationId } : {}),
        roleName: label, characterName: assignment.displayName, lookName: look.name || '', previewUrl: resolved.previewUrl,
        referenceSource: look.characterLookProvenance?.kind === 'user_uploaded' ? 'uploaded'
          : ['system_generated', 'generated_import'].includes(look.characterLookProvenance?.kind) ? 'generated' : 'library',
        selectionScope: shot.manualStoryboard || shot.wardrobeLookIds?.length ? 'shot' : 'scene'
      });
      if (portable && !references.at(-1)?.referenceImageUrl) throw referenceError('cinematic_video_reference_unavailable', 'Reference image is unavailable.');
      } catch (error) {
        if (!portable) throw error;
        references.splice(referenceStart);
        // Export reports only owned slot metadata, never a resolver's private error/URL.
        issues.push({ slot: castIndex + (usesFirstFrame(mode) ? 2 : 1),
          name: assignment?.displayName || assignment?.storyRole || castAssignmentId,
          castAssignmentId, code: 'look_unavailable' });
      }
    }
    return { mode, inputMode: 'multimodal_reference', references, ...(portable ? { issues } : {}), ...(compositionPurpose ? { storyboardRenderStyle: source.storyboardRenderStyle } : {}) };
  }
}

function referenceError(code, message) { return Object.assign(new Error(message), { code, statusCode: 409 }); }

import { trustedGeneratedSourceService, generatedCastSourceFingerprint } from '../generation/TrustedGeneratedSourceService.js';
import { cinematicWardrobeAuthorityService } from '../assets/CinematicWardrobeAuthorityService.js';

const unavailable = () => Object.assign(new Error('Select an eligible generated Look Sheet again.'), {
  code: 'cinematic_generated_cast_unavailable', statusCode: 409
});

// A project-owned source, never a fabricated reusable Character or Character Look.
export class CinematicGeneratedCastService {
  constructor({ trustedSources = trustedGeneratedSourceService, assetAuthority = cinematicWardrobeAuthorityService } = {}) {
    Object.assign(this, { trustedSources, assetAuthority });
  }

  async prepare(input, actor, existing = null) {
    if (input.characterProfileId || input.characterProfileVersionId || input.looks
      || !String(input.generationId || '').trim() || !String(input.displayName || '').trim()
      || String(input.displayName).length > 80) throw unavailable();
    const same = existing?.sourceType === 'generated_sheet' && existing.generatedSheet?.generationId === input.generationId;
    if (!same && input.sheetConfirmed !== true) throw unavailable();
    const source = await this.trustedSources.describeOwnedImage(input.generationId, actor, { requireLookSheet: !same });
    if (same && source.contentHash !== existing.generatedSheet.contentHash) throw unavailable();
    const asset = await this.assetAuthority.importGeneratedSheet(source, actor);
    return {
      generationId: source.id, assetId: asset.id, contentHash: source.contentHash,
      previewUrl: source.publicUrl, modelId: source.modelId, expiresAt: source.expiresAt,
      sourceFingerprint: generatedCastSourceFingerprint(source.id, source.contentHash),
      assurance: 'user_confirmed'
    };
  }

  async resolve(assignment, actor) {
    const pinned = assignment.generatedSheet;
    if (!pinned?.generationId || !pinned.contentHash || !pinned.assetId || pinned.assurance !== 'user_confirmed') throw unavailable();
    const source = await this.trustedSources.describeOwnedImage(pinned.generationId, actor);
    if (source.contentHash !== pinned.contentHash || source.publicUrl !== pinned.previewUrl
      || generatedCastSourceFingerprint(source.id, source.contentHash) !== pinned.sourceFingerprint) throw unavailable();
    return { ...pinned, expiresAt: source.expiresAt };
  }
}

export const cinematicGeneratedCastService = new CinematicGeneratedCastService();

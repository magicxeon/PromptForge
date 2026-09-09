import { loadVideoReferenceAssetContent } from '../assets/VideoReferenceAssetContent.js';
import { generationResultRepo } from '../../repositories/generation/GenerationResultRepository.js';
import { normalizeReferenceValue } from './referenceUtils.js';
import { normalizeLookName, validateLookNames } from './VideoReferencePlan.js';

const fail = (code, message) =>
  Object.assign(new Error(message), { code, statusCode: 409 });

// Only pass URLs obtained from an owning History/Character authority here.
function localReferenceAsset(value, id, ownerUserId) {
  const url = normalizeReferenceValue(value)?.imageUrl;
  if (!url?.startsWith('/outputs/') || /[?#%\\]/.test(url)) {
    throw fail('video_reference_unavailable', 'The original local image is unavailable.');
  }
  return { id, ownerUserId, publicUrl: url, storageKey: url.slice('/outputs/'.length), status: 'active' };
}

// Internal to VideoGenerationApplicationService; callers cannot grant asset authority.
export class PlaygroundVideoReferenceService {
  constructor({
    assetRepository,
    lookService,
    characterService,
    referenceResolver,
    firstFrameTransport,
    contentLoader = loadVideoReferenceAssetContent,
    historyRepository = generationResultRepo,
  }) {
    Object.assign(this, {
      assetRepository,
      lookService,
      characterService,
      referenceResolver,
      firstFrameTransport,
      contentLoader,
      historyRepository,
    });
  }

  async prepare(input, actor) {
    const rows = input.references;
    const mode = input.inputMode;
    if (
      !Array.isArray(rows) ||
      rows.length < 1 ||
      rows.length > 12 ||
      !['image_to_video', 'multimodal_reference'].includes(mode) ||
      (mode === 'image_to_video' &&
        (rows.length !== 1 || rows[0]?.role !== 'first_frame')) ||
      (mode === 'multimodal_reference' &&
        rows.some((row) => row?.role !== 'reference_image'))
    ) {
      throw fail(
        'video_reference_roles_invalid',
        'Choose one first frame or an ordered reference-image plan.',
      );
    }
    validateLookNames(rows);
    const hasCharacter = rows.some(row => row.purpose === 'character_reference');
    if ((hasCharacter && rows.some(row => ['character_look', 'look_sheet_upload', 'generated_look'].includes(row.purpose)))
      || (input.characterProfileId && rows.some(row => ['look_sheet_upload', 'generated_look'].includes(row.purpose)))) {
      throw fail('video_reference_identity_conflict', 'Choose either a Character or a Look Sheet.');
    }
    let attribution = null;
    let characterContext = null;
    if (input.characterProfileId || input.characterProfileVersionId) {
      const context = await this.characterService.validateGenerationContext(
        {
          purpose: 'character_usage',
          characterProfileId: input.characterProfileId,
          characterProfileVersionId: input.characterProfileVersionId,
          useCase: 'video',
          sourceType: 'playground_video',
          sourceId: input.characterProfileId,
        },
        actor,
      );
      characterContext = context;
      attribution = context.attribution || {
        characterProfileId: input.characterProfileId,
        characterProfileVersionId: input.characterProfileVersionId,
        role: 'primary',
      };
    }
    const assets = [];
    const references = [];
    for (const row of rows) {
      let asset;
      if (row.purpose === 'character_reference') {
        if (!characterContext || row.characterProfileId !== input.characterProfileId || mode !== 'multimodal_reference') {
          throw fail('video_character_reference_invalid', 'Choose an available Character version.');
        }
        const canonical = characterContext.authorizedCharacterReferenceAssetId;
        asset = await this.assetRepository.findById(canonical);
        if (!asset) asset = localReferenceAsset(canonical, `character:${input.characterProfileVersionId}`, actor.userId);
        asset = { ...asset, sourceKind: 'authorized_character' };
      } else if (row.purpose === 'character_look') {
        if (
          !attribution ||
          row.characterProfileId !== input.characterProfileId ||
          !row.characterLookId ||
          !row.characterLookVersionId
        ) {
          throw fail(
            'video_character_look_invalid',
            'Choose a pinned Character Look Sheet.',
          );
        }
        const approved = await this.lookService.resolveApprovedSheetReference(
          row.characterProfileId,
          row.characterLookId,
          row.characterLookVersionId,
          actor,
        );
        if (
          approved.characterProfileVersionId !== input.characterProfileVersionId
        ) {
          throw fail(
            'video_character_look_version_changed',
            'The Look Sheet belongs to a different Character version.',
          );
        }
        asset = approved.asset;
      } else {
        if (!['opening_frame', 'look_sheet_upload', 'generated_look'].includes(row.purpose)) {
          throw fail(
            'video_reference_purpose_invalid',
            'Choose a first frame or Look Sheet.',
          );
        }
        asset = row.assetId
          ? await this.assetRepository.findByIdForOwner(
              row.assetId,
              actor.userId,
            )
          : await this.assetRepository.findByPublicUrlForOwner(
              row.referenceImageUrl,
              actor.userId,
            );
        if (!row.assetId && (!asset || asset.assetType !== 'generation_reference')) {
          const normalized = normalizeReferenceValue(row.referenceImageUrl);
          const result = normalized?.jobId
            ? await this.historyRepository.findByIdForOwner(normalized.jobId, actor.userId)
            : null;
          if (result && result.status !== 'deleted'
            && !['failed', 'cancelled', 'processing', 'queued'].includes(result.status)
            && result.artifactVisibility !== 'template_owner_only'
            && result.imageUrl === row.referenceImageUrl) {
            asset = { ...localReferenceAsset(result.imageUrl, result.id, actor.userId), sourceKind: 'owned_generation' };
          }
        }
        if (
          !asset ||
          asset.publicUrl !== row.referenceImageUrl ||
          (asset.assetType !== 'generation_reference' && asset.sourceKind !== 'owned_generation')
        ) {
          throw fail(
            'video_reference_unavailable',
            'The uploaded reference is unavailable for this actor.',
          );
        }
      }
      if ((asset.ownerUserId !== actor.userId && asset.sourceKind !== 'authorized_character') || asset.status === 'deleted') {
        throw fail(
          'video_reference_unavailable',
          'The reference is unavailable for this actor.',
        );
      }
      const { bytes: _bytes, ...content } = await this.contentLoader(asset);
      assets.push({ ...asset, ...content });
      references.push({
        ...(normalizeLookName(row.characterName) ? { characterName: normalizeLookName(row.characterName) } : {}),
        role: row.role,
        purpose: row.purpose,
        assetId: asset.id,
        assetVersionId: asset.id,
        contentHash: content.contentHash,
        sourceFingerprint: content.contentHash,
        ...(asset.sourceKind ? { sourceKind: asset.sourceKind } : {}),
        referenceImageUrl: asset.publicUrl,
        ...(row.purpose === 'character_look'
          ? {
              characterProfileId: row.characterProfileId,
              characterLookId: row.characterLookId,
              characterLookVersionId: row.characterLookVersionId,
            }
          : {}),
      });
    }
    const purposes = references.map((row) => row.purpose);
    if (
      (mode === 'image_to_video' && purposes[0] !== 'opening_frame') ||
      (mode === 'multimodal_reference' &&
        (purposes.at(-1) === 'opening_frame' ||
          purposes.slice(1).includes('opening_frame') ||
          purposes.filter(purpose => purpose === 'character_reference').length > 1)) ||
      new Set(assets.map((asset) => asset.id)).size !== assets.length
    ) {
      throw fail(
        'video_reference_order_invalid',
        'Use the scene image first and a distinct Look Sheet after it.',
      );
    }
    return {
      input: { ...input, references },
      assets,
      attributions: attribution ? [attribution] : [],
    };
  }

  validateModel(plan, model) {
    const limits = model.referenceConstraints;
    if (!limits) return;
    for (const asset of plan.assets) {
      const { width, height, sizeBytes, mimeType } = asset;
      if (
        (limits.mimeTypes && !limits.mimeTypes.includes(mimeType)) ||
        !Number.isFinite(width) ||
        !Number.isFinite(height) ||
        !Number.isFinite(sizeBytes) ||
        width < (limits.minimumWidth || 1) ||
        height < (limits.minimumHeight || 1) ||
        width > (limits.maximumWidth || Infinity) ||
        height > (limits.maximumHeight || Infinity) ||
        sizeBytes <= 0 ||
        sizeBytes > (limits.maximumBytes || Infinity) ||
        width / height < (limits.minimumAspectRatio || 0) ||
        width / height > (limits.maximumAspectRatio || Infinity)
      ) {
        throw fail(
          'video_reference_dimensions_invalid',
          "The reference image type, dimensions or size exceed this model's limits.",
        );
      }
    }
  }

  async resolve(plan, request, actor, model) {
    const resolved = [];
    const referenceTransports = [];
    for (const [index, asset] of plan.assets.entries()) {
      const reference = plan.input.references[index];
      let value;
      if (request.providerId === 'modelark'
        && !['owned_generation', 'authorized_character'].includes(asset.sourceKind)) {
        const result = await this.firstFrameTransport.resolve({
          sourceAsset: asset,
          ownerUserId: actor.userId,
          expectedContentHash: reference.contentHash,
        });
        value = result.value;
        referenceTransports.push({ assetId: asset.id, ...result.transport });
      } else if (['owned_generation', 'authorized_character'].includes(asset.sourceKind)) {
        const content = await this.contentLoader(asset);
        if (content.contentHash !== reference.contentHash) {
          throw fail('video_reference_content_invalid', 'The selected reference changed after validation.');
        }
        value = `data:${content.mimeType};base64,${content.bytes.toString('base64')}`;
      } else {
        value = await this.referenceResolver(asset.publicUrl, actor.username, {
          ownerUserId: actor.userId,
        });
      }
      if (!value)
        throw fail(
          'video_reference_unavailable',
          'The selected image is no longer available.',
        );
      resolved.push({ role: reference.role, url: value });
    }
    const ordered =
      request.inputMode === 'multimodal_reference' &&
      model.supportsOrderedImageReferences === true;
    return {
      referenceImage: ordered ? null : resolved[0].url,
      lastFrameImage: null,
      referenceImages: ordered ? resolved : [],
      characterAttributions: plan.attributions,
      referenceTransports,
      referenceTransport: referenceTransports[0] || null,
      providerReferenceRegistrations: [],
    };
  }
}

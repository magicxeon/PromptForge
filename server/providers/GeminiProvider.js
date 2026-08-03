import { BaseProvider } from './BaseProvider.js';
import { getResolvedReferenceImages } from './resolvedReferenceImages.js';

const GEMINI_PRO_IMAGE_MODEL = 'gemini-3-pro-image';

const REFERENCE_ROLE_LABELS = Object.freeze({
  template_baseline: 'POSE PROXY',
  character_reference: 'CHARACTER IDENTITY',
  outfit_front: 'OUTFIT PRODUCT',
  outfit_back: 'OUTFIT PRODUCT BACK VIEW',
  face_reference: 'FACE IDENTITY',
  style_reference: 'VISUAL STYLE',
  pose_reference: 'POSE REFERENCE'
});

const GEMINI_PRO_ROLE_PRIORITY = Object.freeze({
  face_reference: 0,
  character_reference: 1,
  outfit_front: 2,
  outfit_back: 3,
  template_baseline: 4,
  pose_reference: 5,
  environment_reference: 6,
  product_reference: 7,
  style_reference: 8
});

function referenceLabel(manifestEntry, index) {
  const roles = Array.isArray(manifestEntry?.roles) ? manifestEntry.roles : [];
  const labels = roles.map(role => REFERENCE_ROLE_LABELS[role]).filter(Boolean);
  return `IMAGE_${index} - ${labels.length ? labels.join(' + ') : 'REFERENCE IMAGE'}`;
}

function geminiProReferencePriority(manifestEntry) {
  const roles = Array.isArray(manifestEntry?.roles) ? manifestEntry.roles : [];
  return roles.reduce(
    (priority, role) => Math.min(priority, GEMINI_PRO_ROLE_PRIORITY[role] ?? 999),
    999
  );
}

function orderGeminiProReferences(referenceImages, referenceRoleManifest) {
  return referenceImages
    .map((referenceImage, originalIndex) => {
      const manifestEntry = Array.isArray(referenceRoleManifest)
        ? referenceRoleManifest.find(entry => Number(entry?.index) === originalIndex + 1)
        : null;
      return { referenceImage, originalIndex, manifestEntry };
    })
    .sort((a, b) =>
      geminiProReferencePriority(a.manifestEntry)
      - geminiProReferencePriority(b.manifestEntry)
      || a.originalIndex - b.originalIndex
    );
}

function remapPromptImageIndexes(prompt, orderedReferences) {
  const newIndexByOriginalIndex = new Map(
    orderedReferences.map((reference, newIndex) => [reference.originalIndex, newIndex])
  );
  return String(prompt || '').replace(/\bIMAGE_(\d+)\b/g, (token, rawIndex) => {
    const newIndex = newIndexByOriginalIndex.get(Number(rawIndex));
    return newIndex === undefined ? token : `IMAGE_${newIndex}`;
  });
}

function createGeminiProInput(prompt, referenceImages, referenceRoleManifest, normalizeImage) {
  const orderedReferences = orderGeminiProReferences(referenceImages, referenceRoleManifest);
  const input = [{
    type: 'text',
    text: [
      'REFERENCE AUTHORITY CONTRACT',
      'Each following image has exactly one declared authority role.',
      'Never infer identity, body, garment, pose, environment, or style from a different role.'
    ].join('\n')
  }];
  orderedReferences.forEach((reference, index) => {
    const image = normalizeImage(reference.referenceImage);
    const manifestEntry = Array.isArray(referenceRoleManifest)
      ? reference.manifestEntry
      : null;
    input.push({ type: 'text', text: referenceLabel(manifestEntry, index) });
    input.push({ type: 'image', mime_type: image.mimeType, data: image.data });
  });
  input.push({
    type: 'text',
    text: [
      'FINAL EXECUTION INSTRUCTION',
      remapPromptImageIndexes(prompt, orderedReferences),
      'Use every labeled image only for its assigned authority. Return only the requested final image.'
    ].join('\n')
  });
  return input;
}

export class GeminiProvider extends BaseProvider {
  /**
   * Standard image generation
   */
  async generateImage(prompt, options = {}) {
    const submodel = options.submodel || 'gemini-3.1-flash-image';
    const aspectRatio = options.aspectRatio || '1:1';

    // Detect if we should use legacy predict API (for older Imagen models) or new Interactions API
    const isLegacyImagen = submodel.includes('imagen');

    if (isLegacyImagen) {
      // Legacy Predict Endpoint
      const ratioMap = { '1:1': '1:1', '16:9': '16:9', '9:16': '9:16', '6:8': '3:4' };
      const imageRatio = ratioMap[aspectRatio] || '1:1';

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${submodel}:predict?key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt: prompt }],
          parameters: {
            numberOfImages: 1,
            outputMimeType: 'image/jpeg',
            aspectRatio: imageRatio
          }
        })
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error.message);
      }

      const base64Bytes = data.predictions[0].bytesBase64Encoded;
      return {
        base64: base64Bytes,
        mimeType: 'image/jpeg',
        usage: null
      };
    } else {
      // New Interactions API for Nano Banana
      const ratioMap = { '1:1': '1:1', '16:9': '16:9', '9:16': '9:16', '6:8': '3:4', '4:5': '4:5' };
      const imageRatio = ratioMap[aspectRatio] || '1:1';

      // Nano Banana 2 Lite only supports 1K resolution
      let imageSize = '1K';
      if (submodel !== 'gemini-3.1-flash-lite-image') {
        imageSize = options.imageSize || '1K'; // can be '1K', '2K', '4K', '0.5K'
      }

      let input = [{ type: 'text', text: prompt }];

      // The immutable processing plan owns reference order; Pro also receives adjacent semantic labels.
      const normalizeImage = (value) => {
        const match = typeof value === 'string' ? value.match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/is) : null;
        return match ? { mimeType: match[1], data: match[2] } : { mimeType: 'image/png', data: value };
      };

      const referenceImages = getResolvedReferenceImages(options);
      if (submodel === GEMINI_PRO_IMAGE_MODEL && referenceImages.length) {
        input = createGeminiProInput(
          prompt,
          referenceImages,
          options.referenceRoleManifest,
          normalizeImage
        );
      } else {
        for (const referenceImage of referenceImages) {
          const image = normalizeImage(referenceImage);
          input.push({
            type: 'image',
            mime_type: image.mimeType,
            data: image.data
          });
        }
      }

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/interactions?key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: submodel,
          input: input,
          response_format: {
            type: 'image',
            mime_type: 'image/jpeg',
            aspect_ratio: imageRatio,
            image_size: imageSize
          }
        })
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error.message);
      }

      // Find the image content in the steps response
      let base64Bytes = null;
      let latency = null;

      if (data.steps && Array.isArray(data.steps)) {
        for (const step of data.steps) {
          if (step.type === 'model_output' && step.content) {
            const imageBlocks = step.content.filter(block => block.type === 'image' && block.data);
            if (imageBlocks.length) {
              base64Bytes = submodel === GEMINI_PRO_IMAGE_MODEL
                ? imageBlocks.at(-1).data
                : imageBlocks[0].data;
              if (submodel !== GEMINI_PRO_IMAGE_MODEL) break;
            }
          }
        }
      }

      if (!base64Bytes) {
        throw new Error('Image data not found in Gemini API response steps');
      }

      return {
        base64: base64Bytes,
        mimeType: 'image/jpeg',
        usage: {
          latency_ms: latency || null
        }
      };
    }
  }

  /**
   * Gemini does not support native SSE streaming for image generation currently.
   * We implement a mock stream wrapper for uniform interface support.
   */
  async generateImageStream(prompt, options = {}, onEvent = () => { }) {
    const result = await this.generateImage(prompt, options);
    onEvent({
      event: 'image_generation.completed',
      data: {
        type: 'image_generation.completed',
        b64_json: result.base64,
        usage: result.usage
      }
    });
    return result;
  }
}

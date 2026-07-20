import { BaseProvider } from './BaseProvider.js';

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

      const input = [
        {
          type: 'text',
          text: prompt
        }
      ];

      // Character sheets come first so the prompt can treat them as the primary design reference.
      const normalizeImage = (value) => {
        const match = typeof value === 'string' ? value.match(/^data:(image\/[a-z0-9.+-]+);base64,(.+)$/is) : null;
        return match ? { mimeType: match[1], data: match[2] } : { mimeType: 'image/png', data: value };
      };

      if (options.resolvedCharacterReferenceImageA) {
        const image = normalizeImage(options.resolvedCharacterReferenceImageA);
        input.push({
          type: 'image',
          mime_type: image.mimeType,
          data: image.data
        });
      }
      if (options.resolvedCharacterReferenceImageB) {
        const image = normalizeImage(options.resolvedCharacterReferenceImageB);
        input.push({
          type: 'image',
          mime_type: image.mimeType,
          data: image.data
        });
      }

      if (options.resolvedOutfitReferenceImageFront) {
        const image = normalizeImage(options.resolvedOutfitReferenceImageFront);
        input.push({
          type: 'image',
          mime_type: image.mimeType,
          data: image.data
        });
      }
      if (options.resolvedOutfitReferenceImageBack) {
        const image = normalizeImage(options.resolvedOutfitReferenceImageBack);
        input.push({
          type: 'image',
          mime_type: image.mimeType,
          data: image.data
        });
      }

      // Append style/character references if provided (Slot A & Slot B) (Step 9)
      if (options.resolvedStyleReferenceImageA) {
        const image = normalizeImage(options.resolvedStyleReferenceImageA);
        input.push({
          type: 'image',
          mime_type: image.mimeType,
          data: image.data
        });
      }
      if (options.resolvedStyleReferenceImageB) {
        const image = normalizeImage(options.resolvedStyleReferenceImageB);
        input.push({
          type: 'image',
          mime_type: image.mimeType,
          data: image.data
        });
      }

      // Append face references if provided (Slot A & Slot B) (Step 9)
      if (options.resolvedFaceReferenceImageA) {
        const image = normalizeImage(options.resolvedFaceReferenceImageA);
        input.push({
          type: 'image',
          mime_type: image.mimeType,
          data: image.data
        });
      }
      if (options.resolvedFaceReferenceImageB) {
        const image = normalizeImage(options.resolvedFaceReferenceImageB);
        input.push({
          type: 'image',
          mime_type: image.mimeType,
          data: image.data
        });
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
            const imageBlock = step.content.find(block => block.type === 'image');
            if (imageBlock && imageBlock.data) {
              base64Bytes = imageBlock.data;
              break;
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

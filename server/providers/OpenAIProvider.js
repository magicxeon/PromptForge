import { BaseProvider } from './BaseProvider.js';

export class OpenAIProvider extends BaseProvider {
  /**
   * Upload binary image to OpenAI Files API with purpose "vision" (Step 9/OpenAI)
   * @param {string} base64Data 
   * @returns {Promise<string>} fileId
   */
  async uploadImageToOpenAI(base64Data) {
    try {
      const buffer = Buffer.from(base64Data, 'base64');
      const blob = new Blob([buffer], { type: 'image/png' });

      const formData = new FormData();
      formData.append('file', blob, 'reference.png');
      formData.append('purpose', 'vision');

      console.log(`[OpenAIProvider] Uploading reference image to Files API...`);
      const response = await fetch('https://api.openai.com/v1/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: formData
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error.message);
      }
      console.log(`[OpenAIProvider] Upload success. File ID: ${data.id}`);
      return data.id;
    } catch (err) {
      console.error(`[OpenAIProvider] Failed to upload reference file:`, err.message);
      throw new Error(`Failed to upload reference image to OpenAI: ${err.message}`);
    }
  }

  /**
   * Standard image generation
   */
  async generateImage(prompt, options = {}) {
    const model = options.submodel || 'gpt-image-1.5';
    const aspectRatio = options.aspectRatio || '1:1';

    if (!this.apiKey) {
      throw new Error('OpenAI API key is missing.');
    }

    if (typeof prompt !== 'string' || !prompt.trim()) {
      throw new Error('Prompt must be a non-empty string.');
    }

    const referenceImages = [
      options.resolvedFaceReferenceImageA,
      options.resolvedFaceReferenceImageB,
      options.resolvedStyleReferenceImageA,
      options.resolvedStyleReferenceImageB
    ].filter(Boolean);

    const hasReferenceImages = referenceImages.length > 0;

    if (hasReferenceImages && model === 'dall-e-3') {
      throw new Error(
        'dall-e-3 does not support image editing. Use a GPT Image model or dall-e-2.'
      );
    }

    const size = this.resolveOpenAIImageSize(model, aspectRatio);

    let response;

    if (hasReferenceImages) {
      response = await this.createOpenAIImageEdit({
        model,
        prompt,
        size,
        referenceImages,
        options
      });
    } else {
      response = await this.createOpenAIImageGeneration({
        model,
        prompt,
        size,
        options
      });
    }

    const data = await this.parseOpenAIResponse(response);

    const base64 = data?.data?.[0]?.b64_json;

    if (!base64) {
      throw new Error(
        'OpenAI returned no base64 image data.'
      );
    }

    return {
      base64,
      usage: data.usage || null,
      size: data.size || size,
      quality: data.quality || options.quality || null,
      outputFormat: data.output_format || options.outputFormat || 'png'
    };
  }


  /**
   * Text-to-image generation.
   */
  async createOpenAIImageGeneration({
    model,
    prompt,
    size,
    options
  }) {
    const payload = {
      model,
      prompt,
      n: 1,
      size
    };

    if (this.isGPTImageModel(model)) {
      payload.quality = options.quality || 'auto';
      payload.output_format = options.outputFormat || 'png';

      if (options.background) {
        payload.background = options.background;
      }

      if (options.moderation) {
        payload.moderation = options.moderation;
      }

      if (
        typeof options.outputCompression === 'number' &&
        ['jpeg', 'webp'].includes(payload.output_format)
      ) {
        payload.output_compression = options.outputCompression;
      }
    }

    if (model === 'dall-e-3') {
      payload.quality = options.quality || 'standard';
      payload.style = options.style || 'natural';
      payload.response_format = 'b64_json';
    }

    if (model === 'dall-e-2') {
      payload.response_format = 'b64_json';
    }

    return fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
  }


  /**
   * Image-to-image editing/reference image generation.
   */
  async createOpenAIImageEdit({
    model,
    prompt,
    size,
    referenceImages,
    options
  }) {
    const formData = new FormData();

    formData.append('model', model);
    formData.append('prompt', prompt);
    formData.append('n', '1');
    formData.append('size', size);

    for (let index = 0; index < referenceImages.length; index += 1) {
      const image = referenceImages[index];

      const {
        blob,
        extension
      } = this.base64ImageToBlob(image);

      formData.append(
        'image[]',
        blob,
        `reference-${index + 1}.${extension}`
      );
    }

    if (this.isGPTImageModel(model)) {
      formData.append(
        'quality',
        options.quality || 'auto'
      );

      formData.append(
        'output_format',
        options.outputFormat || 'png'
      );

      /*
       * Useful for identity preservation and face references.
       * Not supported by gpt-image-1-mini.
       */
      if (model !== 'gpt-image-1-mini') {
        formData.append(
          'input_fidelity',
          options.inputFidelity || 'high'
        );
      }

      if (options.background) {
        formData.append(
          'background',
          options.background
        );
      }

      if (options.moderation) {
        formData.append(
          'moderation',
          options.moderation
        );
      }

      if (
        typeof options.outputCompression === 'number' &&
        ['jpeg', 'webp'].includes(options.outputFormat)
      ) {
        formData.append(
          'output_compression',
          String(options.outputCompression)
        );
      }
    }

    /*
     * Optional inpainting mask.
     * Must be PNG with transparent areas indicating where to edit.
     */
    if (options.resolvedMaskImage) {
      const {
        blob
      } = this.base64ImageToBlob(
        options.resolvedMaskImage,
        'image/png'
      );

      formData.append(
        'mask',
        blob,
        'mask.png'
      );
    }

    if (model === 'dall-e-2') {
      formData.append('response_format', 'b64_json');
    }

    /*
     * Do not manually set Content-Type here.
     * fetch will add the multipart boundary automatically.
     */
    return fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`
      },
      body: formData
    });
  }


  /**
   * Resolve supported output dimensions by model.
   */
  resolveOpenAIImageSize(model, aspectRatio) {
    if (model === 'dall-e-2') {
      return '1024x1024';
    }

    if (model === 'dall-e-3') {
      const dalle3Sizes = {
        '1:1': '1024x1024',
        '16:9': '1792x1024',
        '9:16': '1024x1792',
        '6:8': '1024x1792'
      };

      return dalle3Sizes[aspectRatio] || '1024x1024';
    }

    /*
     * GPT Image 2 supports arbitrary sizes divisible by 16.
     */
    if (
      model === 'gpt-image-2' ||
      model.startsWith('gpt-image-2-')
    ) {
      const gptImage2Sizes = {
        '1:1': '1024x1024',
        '16:9': '1536x864',
        '9:16': '864x1536',
        '6:8': '768x1024',
        '3:4': '768x1024',
        '4:3': '1024x768'
      };

      return gptImage2Sizes[aspectRatio] || '1024x1024';
    }

    /*
     * gpt-image-1, gpt-image-1.5, gpt-image-1-mini,
     * and chatgpt-image-latest standard sizes.
     */
    const legacyGPTImageSizes = {
      '1:1': '1024x1024',
      '16:9': '1536x1024',
      '9:16': '1024x1536',
      '6:8': '1024x1536',
      '3:4': '1024x1536',
      '4:3': '1536x1024'
    };

    return legacyGPTImageSizes[aspectRatio] || '1024x1024';
  }


  isGPTImageModel(model) {
    return (
      model.startsWith('gpt-image-') ||
      model === 'chatgpt-image-latest'
    );
  }


  /**
   * Convert a Base64 string or Base64 data URL to a Blob.
   */
  base64ImageToBlob(input, fallbackMimeType = 'image/png') {
    if (typeof input !== 'string' || !input.trim()) {
      throw new Error('Invalid Base64 image input.');
    }

    const trimmedInput = input.trim();

    const dataUrlMatch = trimmedInput.match(
      /^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/s
    );

    let mimeType = fallbackMimeType;
    let base64Data = trimmedInput;

    if (dataUrlMatch) {
      mimeType = dataUrlMatch[1].replace(
        'image/jpg',
        'image/jpeg'
      );

      base64Data = dataUrlMatch[2];
    }

    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);

    for (let index = 0; index < binaryString.length; index += 1) {
      bytes[index] = binaryString.charCodeAt(index);
    }

    const extensionMap = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/webp': 'webp'
    };

    return {
      blob: new Blob([bytes], {
        type: mimeType
      }),
      extension: extensionMap[mimeType] || 'png'
    };
  }


  /**
   * Parse success and error responses consistently.
   */
  async parseOpenAIResponse(response) {
    const requestId = response.headers.get('x-request-id');

    let data;

    try {
      data = await response.json();
    } catch {
      throw new Error(
        `OpenAI returned a non-JSON response. ` +
        `HTTP ${response.status}` +
        (requestId ? `, request ID: ${requestId}` : '')
      );
    }

    if (!response.ok || data.error) {
      const message =
        data?.error?.message ||
        `OpenAI request failed with HTTP ${response.status}`;

      const error = new Error(
        requestId
          ? `${message} [request_id=${requestId}]`
          : message
      );

      error.status = response.status;
      error.requestId = requestId;
      error.code = data?.error?.code || null;
      error.type = data?.error?.type || null;

      throw error;
    }

    return data;
  }

  /**
   * Streaming image generation (SSE)
   */
  async generateImageStream(
    prompt,
    options = {},
    onEvent = () => { }
  ) {
    const model = options.submodel || 'gpt-image-1.5';
    const aspectRatio = options.aspectRatio || '1:1';

    if (!this.apiKey) {
      throw new Error('OpenAI API key is missing.');
    }

    if (typeof prompt !== 'string' || !prompt.trim()) {
      throw new Error('Prompt must be a non-empty string.');
    }

    const referenceImages = [
      options.resolvedFaceReferenceImageA,
      options.resolvedFaceReferenceImageB,
      options.resolvedStyleReferenceImageA,
      options.resolvedStyleReferenceImageB
    ].filter(Boolean);

    const hasReferenceImages = referenceImages.length > 0;

    /*
     * Image streaming is supported only by compatible GPT Image models.
     * DALL-E models must use the normal non-stream response.
     *
     * gpt-image-2 currently has conflicting documentation:
     * the Image API documents streaming generally, but its model page
     * currently lists Streaming as not supported. Fall back safely.
     */
    const supportsStreaming =
      this.supportsOpenAIImageStreaming(model);

    if (!supportsStreaming) {
      return this.generateImageWithSyntheticCompletionEvent(
        prompt,
        options,
        onEvent
      );
    }

    if (hasReferenceImages && model === 'dall-e-3') {
      throw new Error(
        'dall-e-3 does not support image editing. ' +
        'Use a GPT Image model or dall-e-2.'
      );
    }

    const size = this.resolveOpenAIImageSize(
      model,
      aspectRatio
    );

    const partialImages = this.normalizePartialImageCount(
      options.partialImages
    );

    let response;

    if (hasReferenceImages) {
      response = await this.createOpenAIStreamingImageEdit({
        model,
        prompt,
        size,
        partialImages,
        referenceImages,
        options
      });
    } else {
      response = await this.createOpenAIStreamingImageGeneration({
        model,
        prompt,
        size,
        partialImages,
        options
      });
    }

    return this.consumeOpenAIImageStream(
      response,
      onEvent
    );
  }

  async createOpenAIStreamingImageGeneration({
    model,
    prompt,
    size,
    partialImages,
    options
  }) {
    const outputFormat =
      options.outputFormat || 'png';

    const payload = {
      model,
      prompt,
      n: 1,
      size,
      stream: true,
      partial_images: partialImages,
      quality: options.quality || 'auto',
      output_format: outputFormat
    };

    if (options.background) {
      payload.background = options.background;
    }

    if (options.moderation) {
      payload.moderation = options.moderation;
    }

    if (
      typeof options.outputCompression === 'number' &&
      ['jpeg', 'webp'].includes(outputFormat)
    ) {
      payload.output_compression =
        options.outputCompression;
    }

    return fetch(
      'https://api.openai.com/v1/images/generations',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'text/event-stream'
        },
        body: JSON.stringify(payload),
        signal: options.signal
      }
    );
  }

  async createOpenAIStreamingImageEdit({
    model,
    prompt,
    size,
    partialImages,
    referenceImages,
    options
  }) {
    const formData = new FormData();

    const outputFormat =
      options.outputFormat || 'png';

    formData.append('model', model);
    formData.append('prompt', prompt);
    formData.append('n', '1');
    formData.append('size', size);
    formData.append('stream', 'true');

    formData.append(
      'partial_images',
      String(partialImages)
    );

    formData.append(
      'quality',
      options.quality || 'auto'
    );

    formData.append(
      'output_format',
      outputFormat
    );

    /*
     * Keep the array order stable because the prompt may refer to
     * "input image 1", "input image 2", and so on.
     */
    referenceImages.forEach((base64Image, index) => {
      const {
        blob,
        extension
      } = this.base64ImageToBlob(base64Image);

      formData.append(
        'image[]',
        blob,
        `reference-${index + 1}.${extension}`
      );
    });

    /*
     * Improves preservation of faces, logos, and input details.
     * Not supported by gpt-image-1-mini.
     */
    if (model !== 'gpt-image-1-mini') {
      formData.append(
        'input_fidelity',
        options.inputFidelity || 'high'
      );
    }

    if (options.background) {
      formData.append(
        'background',
        options.background
      );
    }

    if (options.moderation) {
      formData.append(
        'moderation',
        options.moderation
      );
    }

    if (
      typeof options.outputCompression === 'number' &&
      ['jpeg', 'webp'].includes(outputFormat)
    ) {
      formData.append(
        'output_compression',
        String(options.outputCompression)
      );
    }

    /*
     * Optional inpainting mask.
     * Transparent areas specify where editing is allowed.
     */
    if (options.resolvedMaskImage) {
      const {
        blob
      } = this.base64ImageToBlob(
        options.resolvedMaskImage,
        'image/png'
      );

      formData.append(
        'mask',
        blob,
        'mask.png'
      );
    }

    return fetch(
      'https://api.openai.com/v1/images/edits',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          Accept: 'text/event-stream'

          /*
           * Do not manually add Content-Type.
           * fetch must generate the multipart boundary.
           */
        },
        body: formData,
        signal: options.signal
      }
    );
  }

  async consumeOpenAIImageStream(
    response,
    onEvent = () => { }
  ) {
    const requestId =
      response.headers.get('x-request-id');

    if (!response.ok) {
      let errorData = null;

      try {
        errorData = await response.json();
      } catch {
        try {
          errorData = {
            error: {
              message: await response.text()
            }
          };
        } catch {
          errorData = null;
        }
      }

      const message =
        errorData?.error?.message ||
        `OpenAI image stream failed with HTTP ${response.status}`;

      const error = this.createOpenAIStreamError({
        apiError: errorData?.error,
        fallbackMessage: message,
        requestId,
        status: response.status
      });

      throw error;
    }

    if (!response.body) {
      throw new Error(
        'OpenAI returned no response stream.'
      );
    }

    const contentType =
      response.headers.get('content-type') || '';

    if (!contentType.includes('text/event-stream')) {
      throw new Error(
        `Expected text/event-stream but received ` +
        `"${contentType || 'unknown'}".`
      );
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');

    let buffer = '';
    let finalResult = null;
    let latestImageResult = null;
    let streamState = 'pending';

    const processBlock = (block) => {
      const parsedEvent =
        this.parseOpenAISSEBlock(block);

      if (!parsedEvent) {
        return;
      }

      const {
        event,
        data
      } = parsedEvent;

      /*
       * OpenAI sends type inside the JSON object.
       * Use it if the SSE "event:" field is absent.
       */
      const eventName =
        event || data?.type || 'message';

      if (
        eventName === 'image_generation.partial_image' ||
        eventName === 'image_edit.partial_image' ||
        data?.type === 'image_generation.partial_image' ||
        data?.type === 'image_edit.partial_image'
      ) {
        if (streamState === 'pending' && data.b64_json) {
          latestImageResult = {
            base64: data.b64_json,
            usage: data.usage || null,
            size: data.size || null,
            quality: data.quality || null,
            background: data.background || null,
            outputFormat: data.output_format || null,
            requestId
          };
        }

        onEvent({
          event: eventName,
          data: {
            ...data,
            preview: true
          }
        });

        return;
      }

      if (
        eventName === 'error' ||
        eventName === 'image_generation.failed' ||
        eventName === 'image_edit.failed' ||
        data?.type === 'error' ||
        data?.type === 'image_generation.failed' ||
        data?.type === 'image_edit.failed'
      ) {
        const apiError = data?.error || data;
        streamState = 'failed';
        latestImageResult = null;
        finalResult = null;

        throw this.createOpenAIStreamError({
          apiError,
          fallbackMessage: 'OpenAI image generation stream failed.',
          requestId
        });
      }

      if (
        eventName === 'image_generation.completed' ||
        eventName === 'image_edit.completed' ||
        data?.type === 'image_generation.completed' ||
        data?.type === 'image_edit.completed'
      ) {
        if (!data.b64_json) {
          throw new Error(
            'Completion event contained no b64_json.'
          );
        }

        finalResult = {
          base64: data.b64_json,
          usage: data.usage || null,
          size: data.size || null,
          quality: data.quality || null,
          background: data.background || null,
          outputFormat: data.output_format || null,
          requestId
        };
        streamState = 'completed';
      }

      onEvent({
        event: eventName,
        data
      });
    };

    try {
      while (true) {
        const {
          done,
          value
        } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, {
          stream: true
        });

        /*
         * Normalize CRLF and old-style CR line endings.
         */
        buffer = buffer
          .replace(/\r\n/g, '\n')
          .replace(/\r/g, '\n');

        let boundaryIndex;

        while (
          (boundaryIndex = buffer.indexOf('\n\n')) !== -1
        ) {
          const block = buffer.slice(
            0,
            boundaryIndex
          );

          buffer = buffer.slice(
            boundaryIndex + 2
          );

          if (block.trim()) {
            processBlock(block);
          }
        }
      }

      /*
       * Flush any remaining UTF-8 bytes.
       */
      buffer += decoder.decode();

      buffer = buffer
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n');

      if (buffer.trim()) {
        processBlock(buffer);
      }
    } catch (error) {
      /*
       * Preserve AbortError so the caller can distinguish
       * cancellation from an API or parsing error.
       */
      if (error?.name === 'AbortError') {
        throw error;
      }

      const wrappedError = new Error(
        `Failed while reading OpenAI image stream: ` +
        `${error.message}`
      );

      wrappedError.cause = error;
      wrappedError.provider = error.provider || 'openai';
      wrappedError.status = error.status || null;
      wrappedError.requestId = error.requestId || requestId;
      wrappedError.code = error.code || null;
      wrappedError.type = error.type || null;
      wrappedError.safetyViolations = error.safetyViolations || [];
      wrappedError.retryable = error.retryable === true;

      throw wrappedError;
    } finally {
      try {
        reader.releaseLock();
      } catch {
        // Reader may already be released or cancelled.
      }
    }

    if (
      streamState !== 'failed' &&
      !finalResult &&
      latestImageResult
    ) {
      finalResult = latestImageResult;
    }

    if (!finalResult) {
      throw new Error(
        requestId
          ? `Stream ended without image data ` +
          `[request_id=${requestId}]`
          : 'Stream ended without image data'
      );
    }

    return finalResult;
  }

  createOpenAIStreamError({
    apiError,
    fallbackMessage,
    requestId,
    status = null
  }) {
    const message = apiError?.message || fallbackMessage;
    const messageRequestId = message?.match(/\breq_[a-zA-Z0-9]+\b/)?.[0];
    const resolvedRequestId = requestId || messageRequestId || null;
    const violationsMatch = message?.match(/safety_violations=\[([^\]]*)\]/i);
    const safetyViolations = violationsMatch
      ? violationsMatch[1]
        .split(',')
        .map(value => value.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean)
      : [];
    const code = apiError?.code || null;
    const retryable =
      status === 429 ||
      (typeof status === 'number' && status >= 500) ||
      ['rate_limit_exceeded', 'server_error'].includes(code);
    const suffix =
      resolvedRequestId && !message?.includes(resolvedRequestId)
        ? ` [request_id=${resolvedRequestId}]`
        : '';
    const error = new Error(`${message}${suffix}`);

    error.provider = 'openai';
    error.status = status;
    error.requestId = resolvedRequestId;
    error.code = code;
    error.type = apiError?.type || null;
    error.safetyViolations = safetyViolations;
    error.retryable = code === 'moderation_blocked' ? false : retryable;

    return error;
  }

  parseOpenAISSEBlock(block) {
    if (typeof block !== 'string') {
      return null;
    }

    let eventName = null;
    const dataLines = [];

    for (const rawLine of block.split('\n')) {
      /*
       * A line beginning with ":" is an SSE comment.
       */
      if (rawLine.startsWith(':')) {
        continue;
      }

      if (rawLine.startsWith('event:')) {
        eventName = rawLine
          .slice('event:'.length)
          .trim();

        continue;
      }

      if (rawLine.startsWith('data:')) {
        let value = rawLine.slice(
          'data:'.length
        );

        /*
         * SSE permits one optional space after ":".
         */
        if (value.startsWith(' ')) {
          value = value.slice(1);
        }

        dataLines.push(value);
      }
    }

    if (dataLines.length === 0) {
      return null;
    }

    const dataString = dataLines.join('\n');

    if (
      !dataString ||
      dataString === '[DONE]'
    ) {
      return null;
    }

    let data;

    try {
      data = JSON.parse(dataString);
    } catch (error) {
      const parseError = new Error(
        `Invalid JSON in OpenAI SSE event: ` +
        `${dataString.slice(0, 300)}`
      );

      parseError.cause = error;

      throw parseError;
    }

    return {
      event: eventName,
      data
    };
  }

  normalizePartialImageCount(value) {
    if (value === undefined || value === null) {
      return 2;
    }

    const numericValue = Number(value);

    if (!Number.isInteger(numericValue)) {
      throw new Error(
        'partialImages must be an integer between 0 and 3.'
      );
    }

    if (
      numericValue < 0 ||
      numericValue > 3
    ) {
      throw new Error(
        'partialImages must be between 0 and 3.'
      );
    }

    return numericValue;
  }

  supportsOpenAIImageStreaming(model) {
    const streamingModels = new Set([
      'gpt-image-1',
      'gpt-image-1.5',
      'gpt-image-1-mini',
      'chatgpt-image-latest'
    ]);

    return streamingModels.has(model);
  }

  async generateImageWithSyntheticCompletionEvent(
    prompt,
    options,
    onEvent
  ) {
    const result = await this.generateImage(
      prompt,
      options
    );

    const completedData = {
      type: 'image_generation.completed',
      b64_json: result.base64,
      usage: result.usage || null,
      size: result.size || null,
      quality: result.quality || null,
      output_format:
        result.outputFormat || null
    };

    onEvent({
      event: 'image_generation.completed',
      data: completedData,
      synthetic: true
    });

    return {
      ...result,
      streamed: false
    };
  }

}

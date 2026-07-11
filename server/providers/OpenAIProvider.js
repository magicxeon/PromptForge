import { BaseProvider } from './BaseProvider.js';

export class OpenAIProvider extends BaseProvider {
  /**
   * Standard image generation
   */
  async generateImage(prompt, options = {}) {
    const submodel = options.submodel || 'gpt-image-1.5';
    const aspectRatio = options.aspectRatio || '1:1';

    // Map aspect ratio to sizes
    const sizeMap = { '1:1': '1024x1024', '16:9': '1792x1024', '9:16': '1024x1792', '6:8': '1024x1792' };
    let size = sizeMap[aspectRatio] || '1024x1024';
    if (submodel === 'dall-e-2') {
      size = '1024x1024';
    }

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: submodel,
        prompt: prompt,
        n: 1,
        size: size,
        response_format: 'b64_json'
      })
    });

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message);
    }

    const base64 = data.data[0].b64_json;
    return {
      base64: base64,
      usage: data.usage || null
    };
  }

  /**
   * Streaming image generation (SSE)
   */
  async generateImageStream(prompt, options = {}, onEvent = () => {}) {
    const submodel = options.submodel || 'gpt-image-1.5';
    const aspectRatio = options.aspectRatio || '1:1';

    // Check if the model supports streaming
    const isStreamSupported = submodel.startsWith('gpt-image');

    if (!isStreamSupported) {
      // Fallback for models like DALL-E that don't support native streaming
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

    const sizeMap = { '1:1': '1024x1024', '16:9': '1792x1024', '9:16': '1024x1792', '6:8': '1024x1792' };
    const size = sizeMap[aspectRatio] || '1024x1024';

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: submodel,
        prompt: prompt,
        n: 1,
        size: size,
        stream: true
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errMsg = errorData?.error?.message || `HTTP ${response.status}`;
      throw new Error(`OpenAI Stream Error: ${errMsg}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let finalResult = null;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let currentEvent = null;
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          if (trimmed.startsWith('event:')) {
            currentEvent = trimmed.slice(6).trim();
          } else if (trimmed.startsWith('data:')) {
            const dataStr = trimmed.slice(5).trim();
            if (dataStr) {
              try {
                const parsed = JSON.parse(dataStr);
                onEvent({ event: currentEvent, data: parsed });
                
                if (currentEvent === 'image_generation.completed' || parsed.type === 'image_generation.completed') {
                  finalResult = {
                    base64: parsed.b64_json,
                    usage: parsed.usage || null
                  };
                }
              } catch (e) {
                console.error('[OpenAI Stream] Failed to parse JSON:', dataStr, e);
              }
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    if (!finalResult) {
      throw new Error('Stream ended without completion event');
    }

    return finalResult;
  }
}

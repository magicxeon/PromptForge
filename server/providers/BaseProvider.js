export class BaseProvider {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  /**
   * Standard image generation
   * @param {string} prompt 
   * @param {object} options 
   * @returns {Promise<{base64: string, usage?: object}>}
   */
  async generateImage(prompt, options = {}) {
    throw new Error('generateImage method not implemented');
  }

  /**
   * Streaming image generation (if supported)
   * @param {string} prompt 
   * @param {object} options 
   * @param {function} onEvent - callback for event streaming ({ event, data })
   * @returns {Promise<{base64: string, usage?: object}>}
   */
  async generateImageStream(prompt, options = {}, onEvent = () => {}) {
    throw new Error('generateImageStream method not implemented by this provider');
  }
}

import { OpenAIProvider } from './OpenAIProvider.js';
import { GeminiProvider } from './GeminiProvider.js';

export class ProviderFactory {
  /**
   * Instantiate and return the appropriate provider class
   * @param {string} providerName 
   * @returns {BaseProvider}
   */
  static getProvider(providerName) {
    const name = providerName.toLowerCase();
    
    if (name === 'openai') {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey || apiKey === 'your_openai_api_key_here') {
        throw new Error('OpenAI API Key is not configured on the server.');
      }
      return new OpenAIProvider(apiKey);
    } else if (name === 'gemini') {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === 'your_gemini_api_key_here') {
        throw new Error('Gemini API Key is not configured on the server.');
      }
      return new GeminiProvider(apiKey);
    } else {
      throw new Error(`Unsupported provider: ${providerName}`);
    }
  }
}

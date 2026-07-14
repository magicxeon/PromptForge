import { GeminiProvider } from './GeminiProvider.js';
import { GrokImagineProvider } from './GrokImagineProvider.js';
import { OpenAIProvider } from './OpenAIProvider.js';

export const PROVIDER_ADAPTERS = Object.freeze({
  gemini: GeminiProvider,
  openai: OpenAIProvider,
  xai: GrokImagineProvider
});

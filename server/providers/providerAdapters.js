import { GeminiProvider } from './GeminiProvider.js';
import { GrokImagineProvider } from './GrokImagineProvider.js';
import { MetaMuseProvider } from './MetaMuseProvider.js';
import { ModelArkSeedreamProvider } from './ModelArkSeedreamProvider.js';
import { OpenAIProvider } from './OpenAIProvider.js';

export const PROVIDER_ADAPTERS = Object.freeze({
  gemini: GeminiProvider,
  openai: OpenAIProvider,
  xai: GrokImagineProvider,
  'meta-muse': MetaMuseProvider,
  'modelark-seedream': ModelArkSeedreamProvider
});

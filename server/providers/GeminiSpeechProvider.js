import { getProviderRegistry, getConfiguredSecret } from './ProviderRegistry.js';
import { speechError } from '../domain/generation/SpeechRequestCompiler.js';
import { createHash } from 'node:crypto';
export class GeminiSpeechProvider {
  constructor({ fetchImpl = fetch, apiKey = null } = {}) { this.fetch = fetchImpl; this.apiKey = apiKey; }
  connectionId() {
    const key = this.apiKey || getConfiguredSecret(process.env, getProviderRegistry().getProvider('gemini'));
    if (!key) throw speechError('speech_provider_unavailable', 503);
    return createHash('sha256').update(key).digest('hex');
  }
  async voiceRequest(method, id, body, maxBytes = 33554432) {
    if (id && !/^voice_[A-Za-z0-9_-]{1,200}$/.test(id)) throw speechError('speech_invalid_voice');
    const apiKey = this.apiKey || getConfiguredSecret(process.env, getProviderRegistry().getProvider('gemini'));
    if (!apiKey) throw speechError('speech_provider_unavailable', 503);
    try {
      const response = await this.fetch(`https://generativelanguage.googleapis.com/v1beta/voices${id ? `/${id}` : ''}`, {
        method, headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey }, signal: AbortSignal.timeout(180000),
        ...(body ? { body: JSON.stringify(body) } : {})
      });
      if (method === 'DELETE' && (response.ok || response.status === 404)) return { deleted: true };
      if (!response.ok) throw speechError(`speech_provider_http_${response.status}`, 502);
      let size = 0; const chunks = [];
      for await (const chunk of response.body) {
        size += chunk.length;
        if (size > Math.ceil(maxBytes * 1.5) + 1048576) throw speechError('speech_response_too_large', 502);
        chunks.push(chunk);
      }
      const voice = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (!/^voice_[A-Za-z0-9_-]{1,200}$/.test(voice.id || '') || (id && voice.id !== id) || voice.type !== 'prompted') throw speechError('speech_invalid_voice_response', 502);
      return voice;
    } catch (error) { throw error.code?.startsWith('speech_') ? error : speechError('speech_provider_outcome_unknown', 502); }
  }
  createVoice(snapshot, model, maxBytes) {
    return this.voiceRequest('POST', null, { store: true, voice: { type: 'prompted', model: model.id,
      display_name: snapshot.name, language_code: snapshot.language, prompted: { input: snapshot.description } } }, maxBytes);
  }
  getVoice(id, maxBytes) { return this.voiceRequest('GET', id, null, maxBytes); }
  deleteVoice(id) { return this.voiceRequest('DELETE', id); }
  voiceSample(voice, maxBytes) {
    const audio = voice.sample_audio;
    if (!audio || !['audio/wav', 'audio/x-wav'].includes(audio.mime_type) || typeof audio.data !== 'string'
      || !/^[A-Za-z0-9+/]+={0,2}$/.test(audio.data)) throw speechError('speech_invalid_output', 502);
    const bytes = Buffer.from(audio.data, 'base64');
    if (!bytes.length || bytes.length > maxBytes) throw speechError('speech_invalid_output', 502);
    return bytes;
  }
  async generate(snapshot, model, maxBytes = 33554432) {
    const apiKey = this.apiKey || getConfiguredSecret(process.env, getProviderRegistry().getProvider('gemini'));
    if (!apiKey) throw speechError('speech_provider_unavailable', 503);
    let response;
    try {
      response = await this.fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey }, signal: AbortSignal.timeout(180000),
        body: JSON.stringify({ model: model.id, input: [{ type: 'user_input', content: [{ type: 'text', text: snapshot.text,
          annotations: [{ type: 'speech_metadata', style: snapshot.style }] }] }], response_format: { type: 'audio', mime_type: 'audio/wav' },
          generation_config: { speech_config: [{ voice: snapshot.voiceId }], max_output_tokens: model.limits.outputTokens }, store: false })
      });
      if (!response.ok) throw speechError(`speech_provider_http_${response.status}`, 502);
      let size = 0; const chunks = [];
      for await (const chunk of response.body) { size += chunk.length; if (size > Math.ceil(maxBytes * 1.5) + 1048576) throw speechError('speech_response_too_large', 502); chunks.push(chunk); }
      const payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      const audio = (payload.steps || []).filter(step => step.type === 'model_output').flatMap(step => step.content || []).filter(item => item.type === 'audio').at(-1);
      if (!audio?.data || !['audio/wav', 'audio/x-wav'].includes(audio.mime_type) || !/^[A-Za-z0-9+/]*={0,2}$/.test(audio.data)) throw speechError('speech_invalid_output', 502);
      const bytes = Buffer.from(audio.data, 'base64');
      if (!bytes.length || bytes.length > maxBytes) throw speechError('speech_invalid_output', 502);
      return { bytes, usage: payload.usage || null, providerResponseId: typeof payload.id === 'string' ? payload.id.slice(0, 200) : null };
    } catch (error) { throw error.code?.startsWith('speech_') ? error : speechError('speech_provider_outcome_unknown', 502); }
  }
}

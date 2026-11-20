import { createHash } from 'node:crypto';
export const speechError = (code, statusCode = 400) => Object.assign(new Error('Speech request could not be completed.'), { code, statusCode });
export function compileSpeechRequest(snapshot, catalog, customVoice = null) {
  const model = catalog.models.find(item => item.id === snapshot?.modelId && item.enabled);
  const voice = snapshot?.voiceKind === 'custom'
    ? (customVoice && model?.capabilities.customVoiceSynthesis && customVoice.model.providerId === model.providerId ? customVoice : null)
    : catalog.voices.find(item => item.id === snapshot?.voiceId && item.modelIds.includes(model?.id));
  const policy = catalog.policy;
  const text = snapshot?.text;
  const delivery = snapshot?.delivery;
  const style = typeof delivery === 'string' ? delivery : Object.values(delivery || {}).filter(value => typeof value === 'string' && value.trim()).join(', ');
  if (!model || !voice || typeof text !== 'string' || !text.trim()
    || [...text].length > policy.maxTextLength || [...style].length > policy.maxStyleLength
    || !model.capabilities.languages.includes(snapshot.language || 'th')) throw speechError('speech_invalid_input');
  if (voice.languages && !voice.languages.includes(snapshot.language || 'th')) throw speechError('speech_invalid_voice_language');
  for (const tag of text.match(/<[^>]*>/g) || []) if (model.capabilities.inlineVocalEvents === false || !policy.inlineTags.includes(tag)) throw speechError('speech_unknown_tag');
  const normalized = JSON.parse(JSON.stringify({ ...snapshot, text, style, delivery: delivery || {}, language: snapshot.language || 'th',
    providerId: model.providerId, catalogVersion: catalog.catalogVersion, compilerVersion: 'speech-v1' }));
  if (model.adapterKey === 'seed-speech') {
    normalized.providerPrompt = [`Speak in ${normalized.language} with the voice of @Audio1.`, style, `Say exactly: ${JSON.stringify(text)}`].filter(Boolean).join('\n');
    if ([...normalized.providerPrompt].length > model.limits.promptCharacters) throw speechError('speech_invalid_input');
  }
  const stable = value => value && typeof value === 'object' && !Array.isArray(value)
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : Array.isArray(value) ? value.map(stable) : value;
  return { snapshot: normalized, model, requestHash: createHash('sha256').update(JSON.stringify(stable(normalized))).digest('hex') };
}

export function compileVoiceDesign(snapshot, catalog) {
  const model = catalog.models.find(item => item.id === snapshot?.modelId && item.enabled && item.capabilities.voiceDesign);
  const { description, name, language = 'th' } = snapshot || {};
  if (!model || !model.capabilities.languages.includes(language)
    || typeof description !== 'string' || !description.trim() || [...description].length > catalog.policy.maxDesignLength
    || typeof name !== 'string' || !name.trim() || [...name].length > catalog.policy.maxTitleLength) throw speechError('speech_invalid_input');
  const normalized = { name: name.trim(), description: description.trim(), language, modelId: model.id,
    providerId: model.providerId, catalogVersion: catalog.catalogVersion, compilerVersion: 'voice-design-v1' };
  return { snapshot: normalized, model, requestHash: createHash('sha256').update(JSON.stringify(normalized)).digest('hex') };
}

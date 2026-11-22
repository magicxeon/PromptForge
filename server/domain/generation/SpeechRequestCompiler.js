import { createHash } from 'node:crypto';
import dubbingGenres from '../../config/voice-studio/dubbing-genres.json' with {type:'json'};
import { inspectWav } from '../assets/AudioAssetService.js';
import { validSpeechWindows, timedSpeechDirection } from './speechWindows.js';
export const speechError = (code, statusCode = 400) => Object.assign(new Error('Speech request could not be completed.'), { code, statusCode });
export function speechAudioConfig(input = {}, model) {
  const controls = model?.capabilities.audioControls || {};
  if (!input || typeof input !== 'object' || Array.isArray(input) ||
      Object.keys(input).some(key => !Object.hasOwn(controls, key))) throw speechError('speech_invalid_audio_config');
  return Object.fromEntries(Object.entries(controls).map(([key, control]) => {
    const value = Object.hasOwn(input, key) ? input[key] : control.default;
    if (!Number.isSafeInteger(value) || value < control.min || value > control.max ||
        (value - control.min) % control.step !== 0) throw speechError('speech_invalid_audio_config');
    return [key, value];
  }));
}

export function scriptPerformancePrompt({language, text, delivery}) {
  return [
    `Record a clean, single-speaker dialogue take in ${language}. Match the vocal identity, accent and timbre of @Audio1 throughout the line.`,
    'Use natural phrasing, clear diction and breaths appropriate to the performance. Keep the recording free of music, sound effects and additional voices.',
    delivery.emotion && `Emotion: ${delivery.emotion}.`,
    delivery.intensity && `Emotional intensity: ${delivery.intensity}.`,
    delivery.method && `Speaking style: ${delivery.method}.`,
    delivery.pace && `Phrasing: ${delivery.pace}.`,
    delivery.direction && `Performance note (silent direction): ${JSON.stringify(delivery.direction)}`,
    'Speak only the following dialogue verbatim. Keep directions, labels and commentary out of the recording.',
    `Say exactly: ${JSON.stringify(text)}`,
  ].filter(Boolean).join('\n');
}

export function compileSpeechRequest(snapshot, catalog, customVoice = null) {
  const model = catalog.models.find(item => item.id === snapshot?.modelId && item.enabled);
  const voice = snapshot?.voiceKind === 'custom'
    ? (customVoice && model?.capabilities.customVoiceSynthesis && customVoice.model.providerId === model.providerId
      && (model.adapterKey !== 'seed-speech' || customVoice.snapshot.language === snapshot.language) ? customVoice : null)
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
  if (snapshot.audioConfig !== undefined || snapshot.documentKind === 'audio-script') {
    normalized.audioConfig = speechAudioConfig(snapshot.audioConfig, model);
  }
  if (model.adapterKey === 'seed-speech') {
    const target = normalized.targetDurationMs;
    if (target !== undefined && (!Number.isSafeInteger(target) || target <= 0)) throw speechError('speech_invalid_input');
    const windows = normalized.speechWindows;
    if (!validSpeechWindows(windows,target) || (normalized.boundaryTimingOnly && !target)) throw speechError('speech_invalid_input');
    const slot = target === undefined ? '' : `[0.0s:${target / 1000}s] `;
    normalized.providerPrompt = normalized.documentKind === 'audio-script' ? scriptPerformancePrompt(normalized) : [`Speak in ${normalized.language} with the voice of @Audio1.`, style,
      target !== undefined && `DURATION: ${target / 1000} seconds. ${windows ? 'Speak naturally' : 'Start promptly, speak naturally'}, and finish the entire line within this time window. Dialogue only.`,
      normalized.boundaryTimingOnly && windows ?
        `[${windows[0].startMs/1000}s:${windows.at(-1).endMs/1000}s] Start and finish speaking at these times. Allow natural pauses. Say exactly: ${JSON.stringify(text)}` :
        normalized.boundaryTimingOnly ?
          `Begin speaking immediately. Use natural conversational pacing. You may finish early. Say exactly: ${JSON.stringify(text)}` :
        windows ? timedSpeechDirection(text,normalized.language,windows) : `${slot}Say exactly: ${JSON.stringify(text)}`].filter(Boolean).join('\n');
    if ([...normalized.providerPrompt].length > model.limits.promptCharacters) throw speechError('speech_invalid_input');
  }
  const stable = value => value && typeof value === 'object' && !Array.isArray(value)
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : Array.isArray(value) ? value.map(stable) : value;
  return { snapshot: normalized, model, requestHash: createHash('sha256').update(JSON.stringify(stable(normalized))).digest('hex') };
}

export function compileVoiceDesign(snapshot, catalog) {
  const model = catalog.models.find(item => item.id === snapshot?.modelId && item.enabled && item.capabilities.voiceDesign);
  if (model?.adapterKey === 'seed-speech') return compileSeedDesign(snapshot, model, catalog);
  const { description, name, language = 'th' } = snapshot || {};
  if (!model || !model.capabilities.languages.includes(language)
    || typeof description !== 'string' || !description.trim() || [...description].length > catalog.policy.maxDesignLength
    || typeof name !== 'string' || !name.trim() || [...name].length > catalog.policy.maxTitleLength) throw speechError('speech_invalid_input');
  const normalized = { name: name.trim(), description: description.trim(), language, modelId: model.id,
    providerId: model.providerId, catalogVersion: catalog.catalogVersion, compilerVersion: 'voice-design-v1' };
  return { snapshot: normalized, model, requestHash: createHash('sha256').update(JSON.stringify(normalized)).digest('hex') };
}

function compileSeedDesign(input, model, catalog) {
  const { sourceType, language, voiceGender = 'unspecified' } = input;
  const clean = (value, max, required = true) => {
    if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw speechError('speech_invalid_input');
    return value.trim();
  };
  if (!model.capabilities.designSources.includes(sourceType) || !model.capabilities.languages.includes(language)
    || !['female', 'male', 'unspecified'].includes(voiceGender)) throw speechError('speech_invalid_input');
  const name = clean(input.name, catalog.policy.maxTitleLength);
  const description = clean(input.description ?? '', catalog.policy.maxDesignLength, sourceType === 'description');
  const sampleText = clean(input.sampleText, catalog.policy.maxTextLength);
  const genre = input.genre ?? '';
  if (typeof genre !== 'string' || (genre && !Object.hasOwn(dubbingGenres,genre))) throw speechError('speech_invalid_input');
  const reference = sourceType === 'reference';
  const retainOriginal = reference;
  if (input.retainOriginal !== undefined && input.retainOriginal !== retainOriginal) throw speechError('speech_invalid_input');
  if (!reference && input.referenceAudio != null) throw speechError('speech_invalid_input');
  let referenceHash;
  if (reference) {
    const limit = 44 + model.limits.referenceSeconds * 48000;
    const encoded = input.referenceAudio;
    if (typeof encoded !== 'string' || !encoded.length || encoded.length > Math.ceil(limit / 3) * 4
      || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) throw speechError('speech_invalid_reference');
    const bytes = Buffer.from(encoded, 'base64');
    if (bytes.length < 46 || bytes.toString('base64') !== encoded || bytes.length > limit || bytes.toString('ascii', 12, 16) !== 'fmt '
      || bytes.readUInt32LE(16) !== 16 || bytes.toString('ascii', 36, 40) !== 'data'
      || bytes.readUInt32LE(40) !== bytes.length - 44) throw speechError('speech_invalid_reference');
    try { inspectWav(bytes); } catch { throw speechError('speech_invalid_reference'); }
    referenceHash = createHash('sha256').update(bytes).digest('hex');
  }
  const providerPrompt = [
    reference ? `Speak in ${language} with the voice of @Audio1.` : `Speak in ${language}.`,
    voiceGender !== 'unspecified' && `Voice type: ${voiceGender}.`, description, `Say exactly: ${JSON.stringify(sampleText)}`,
  ].filter(Boolean).join('\n');
  if ([...providerPrompt].length > model.limits.promptCharacters) throw speechError('speech_invalid_input');
  const snapshot = { sourceType, name, description, language, voiceGender, sampleText, ...(genre && {genre}), referenceHash, retainOriginal,
    providerPrompt, modelId: model.id, providerId: model.providerId, catalogVersion: catalog.catalogVersion, compilerVersion: 'seed-design-v1' };
  return { snapshot, model, requestHash: createHash('sha256').update(JSON.stringify(snapshot)).digest('hex') };
}

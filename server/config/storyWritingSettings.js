import { readFileSync } from 'node:fs';
import { storyAuthoringConfiguration as authoring } from './cinematicStoryConfiguration.js';

const directionCatalog = JSON.parse(readFileSync(new URL('./cinematic/story-direction.v1.json', import.meta.url), 'utf8'));
export const storySpokenLanguage = settings => settings?.direction?.spokenLanguage || directionCatalog.defaults.spokenLanguage;
export const briefSuggestionChoices = {
  country: authoring.countryStyles.options.map(item => item.id),
  period: authoring.periods.options.map(item => item.id),
  genre: Object.keys(directionCatalog.genres),
  tone: authoring.choices.audienceFeelings.ids
};
export function directionSetup(direction) {
  if (!direction) return {};
  return { format:direction.format==='standalone'?'short-film':'mini-series', aspectRatio:direction.aspectRatio,
    storyCountryStyle:direction.country, storyPeriod:direction.period, genre:direction.genre, genres:[direction.genre],
    audienceFeeling:direction.tone, audienceFeelings:[direction.tone] };
}

export function chapterTargetSeconds(direction, chapterCount, fallback) {
  if (!direction) return fallback;
  return direction.format==='feature'
    ? Math.max(1,Math.round(direction.targetSeconds/Math.max(1,chapterCount||1))) : direction.targetSeconds;
}
export function validateStoryDirection(value) {
  const valid = value && authoring.countryStyles.options.some(item => item.id === value.country)
    && authoring.periods.options.some(item => item.id === value.period)
    && Object.hasOwn(directionCatalog.genres, value.genre) && authoring.choices.audienceFeelings.ids.includes(value.tone)
    && Object.hasOwn(directionCatalog.formats, value.format) && directionCatalog.ratios.includes(value.aspectRatio)
    && Object.hasOwn(directionCatalog.destinations, value.destination) && Number.isInteger(value.targetSeconds)
    && value.targetSeconds > 0 && value.targetSeconds <= directionCatalog.maxTargetSeconds
    && typeof value.spokenLanguage === 'string' && value.spokenLanguage.trim() && value.spokenLanguage.length <= 80;
  if (!valid) throw Object.assign(new Error('Review the project direction fields.'), {code:'cinematic_story_direction_invalid', statusCode:400});
  return Object.fromEntries(Object.keys(directionCatalog.defaults).map(key => [key, typeof value[key] === 'string' ? value[key].trim() : value[key]]));
}

const catalog = JSON.parse(readFileSync(new URL('./cinematic/story-writing.v1.json', import.meta.url), 'utf8'));
const models = new Set(catalog.models.map(model => model.id));
const skills = new Map(catalog.skills.map(skill => [skill.id, skill]));

export function storyWritingManifest() {
  return structuredClone({
    models: catalog.models, defaultModelId: catalog.defaultModelId, maxSkills: catalog.maxSkills,
    skills: catalog.skills.map(({ id, label, description }) => ({ id, label, description }))
  });
}

export function validateWritingSettings(input) {
  if (!input || (input.modelId !== null && !models.has(input.modelId)) || !Array.isArray(input.skillIds)
      || input.skillIds.length > catalog.maxSkills || new Set(input.skillIds).size !== input.skillIds.length
      || !input.skillIds.every(id => skills.has(id))) {
    throw Object.assign(new Error('Select a listed writing model and up to five distinct writing skills.'),
      { code: 'cinematic_writing_settings_invalid', statusCode: 400 });
  }
  return { modelId: input.modelId, skillIds: [...input.skillIds], ...(input.direction ? {direction:validateStoryDirection(input.direction)} : {}) };
}

export function resolveWritingPreferences(settings) {
  const { modelId, skillIds, direction } = validateWritingSettings(settings ?? { modelId: catalog.defaultModelId, skillIds: [] });
  const skillInstructions = skillIds.map(id => skills.get(id).instruction);
  if (direction) {
    const {country,period,genre,tone,format,targetSeconds,aspectRatio,spokenLanguage} = direction;
    skillInstructions.unshift(
      `Project direction: ${format}, ${targetSeconds}s per episode or standalone work (total for a feature), framed for ${aspectRatio}. Audience feeling: ${tone}. Spoken language: ${spokenLanguage}.`,
      `Write newly authored spoken lines in ${spokenLanguage} regardless of the setting. Preserve the story's location, era and cultural details.`,
      authoring.countryStyles.options.find(item => item.id === country).guidance,
      authoring.periods.options.find(item => item.id === period).guidance,
      directionCatalog.genres[genre].instruction
    );
  }
  return { modelId, skillInstructions };
}

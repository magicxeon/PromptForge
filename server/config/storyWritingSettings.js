import { readFileSync } from 'node:fs';
import { selectStorySkills, skillPromptText } from './cinematic/selectStorySkills.js';
import { storyAuthoringConfiguration as authoring } from './cinematicStoryConfiguration.js';

const directionCatalog = JSON.parse(readFileSync(new URL('./cinematic/story-direction.v1.json', import.meta.url), 'utf8'));
export const storySpokenLanguage = settings => settings?.direction?.spokenLanguage || directionCatalog.defaults.spokenLanguage;
export const storyVisualStyle = settings => directionCatalog.visualStyles[settings?.direction?.visualStyle || directionCatalog.defaults.visualStyle];
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
  if (value) value = {visualStyle:directionCatalog.defaults.visualStyle,...value};
  const valid = value && authoring.countryStyles.options.some(item => item.id === value.country)
    && authoring.periods.options.some(item => item.id === value.period)
    && Object.hasOwn(directionCatalog.genres, value.genre) && authoring.choices.audienceFeelings.ids.includes(value.tone)
    && Object.hasOwn(directionCatalog.formats, value.format) && directionCatalog.ratios.includes(value.aspectRatio)
    && Object.hasOwn(directionCatalog.visualStyles,value.visualStyle)
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
    models: catalog.models, defaultModelId: catalog.defaultModelId, taskSkills: catalog.taskSkills, recommendedSkillCount: catalog.recommendedSkillCount,
    skills: catalog.skills.map(({ id, label, description, instruction }) => ({ id, label, description, instruction }))
  });
}

export function validateWritingSettings(input) {
  const custom = input?.customSkills ?? [];
  const valid = Array.isArray(custom) && custom.every(skill => skill && /^custom-[a-z0-9-]{1,80}$/.test(skill.id)
    && typeof skill.name === 'string' && skill.name.trim() && skill.name.length <= 120
    && typeof skill.instruction === 'string' && skill.instruction.trim() && skill.instruction.length <= authoring.skillImport.instructionCharacters
    && (skill.context === undefined || (typeof skill.context === 'string' && skill.context.length <= authoring.skillImport.contextCharacters))
    && (skill.references === undefined || (Array.isArray(skill.references) && skill.references.length <= authoring.skillImport.maxReferences
      && skill.references.every(ref=>ref && typeof ref.name === 'string' && ref.name.length <= 200 && typeof ref.text === 'string' && ref.text.length <= authoring.skillImport.referenceCharacters)))
    && Array.isArray(skill.tasks) && skill.tasks.length && skill.tasks.every(task => Object.hasOwn(catalog.taskSkills, task))
    && Number.isSafeInteger(skill.version) && skill.version > 0);
  const ids = valid ? new Set(custom.map(skill => skill.id)) : new Set();
  if (!input || (input.modelId !== null && !models.has(input.modelId)) || !Array.isArray(input.skillIds)
      || !valid || ids.size !== custom.length
      || new Set(input.skillIds).size !== input.skillIds.length
      || !input.skillIds.every(id => skills.has(id) || ids.has(id))) {
    throw Object.assign(new Error('Select a listed writing model and distinct skills from the catalog.'),
      { code: 'cinematic_writing_settings_invalid', statusCode: 400 });
  }
  return { modelId: input.modelId, skillIds: [...input.skillIds],
    ...(custom.length ? { customSkills:custom.map(({id,name,instruction,tasks,version,context,references}) => ({id,name:name.trim(),instruction:instruction.trim(),tasks:[...new Set(tasks)],version,
      ...(context?.trim()?{context:context.trim()}:{}), ...(references?.length?{references:references.map(({name,text})=>({name,text}))}:{})})) } : {}),
    ...(input.direction ? {direction:validateStoryDirection(input.direction)} : {}) };
}

export function withStorySkillOverride(settings, ids) {
  if (ids === undefined) return settings;
  const enabled = new Set(settings?.skillIds || []);
  if (!Array.isArray(ids) || new Set(ids).size !== ids.length || ids.some(id => !enabled.has(id))) {
    throw Object.assign(new Error('Choose distinct enabled skills from this project.'), {code:'cinematic_writing_settings_invalid', statusCode:400});
  }
  return {...(settings ?? {modelId:null,skillIds:[]}),skillIdsOverride:[...ids]};
}

export function resolveWritingPreferences(settings, task = "full_story", source = "") {
  const { modelId, direction } = validateWritingSettings(settings ?? { modelId: catalog.defaultModelId, skillIds: [] });
  const selectedSkillIds = selectStorySkills(catalog, settings, task, source);
  const library = new Map([...skills, ...(settings?.customSkills ?? []).map(skill => [skill.id, skill])]);
  const skillInstructions = [...new Set(selectedSkillIds.map(id => skillPromptText(library.get(id),task,source,authoring.skillImport.promptCharacters)))];
  if (settings?.direction?.visualStyle) skillInstructions.unshift(storyVisualStyle(settings).instruction);
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
  return { modelId, skillInstructions, selectedSkillIds,
    selectedSkillVersions:Object.fromEntries(selectedSkillIds.map(id=>[id,library.get(id).version ?? catalog.selectionVersion])),
    selectionVersion: catalog.selectionVersion };
}

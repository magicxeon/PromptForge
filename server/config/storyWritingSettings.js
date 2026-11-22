import { readFileSync } from 'node:fs';

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
  return { modelId: input.modelId, skillIds: [...input.skillIds] };
}

export function resolveWritingPreferences(settings) {
  const { modelId, skillIds } = validateWritingSettings(settings ?? { modelId: catalog.defaultModelId, skillIds: [] });
  return { modelId, skillInstructions: skillIds.map(id => skills.get(id).instruction) };
}

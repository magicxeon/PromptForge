import { loadPromptRecipe } from '../../config/prompt-recipes/loadPromptRecipe.js';

const recipe = loadPromptRecipe('studio-natural-realism.v1.json');
const modes = new Set(['headshot', 'character-sheet', 'scene']);

export function studioRealismProfile(context = {}) {
  return context.generationSurface === 'studio' && modes.has(context.generationMode)
    ? { id: recipe.id, version: recipe.version, fingerprint: recipe.fingerprint }
    : null;
}

export function applyStudioNaturalRealism(prompt, context) {
  if (!studioRealismProfile(context)) return prompt;
  const directive = [recipe.instruction,
    context.generationMode === 'headshot' ? recipe.portrait : recipe.contextual].join(' ');
  return prompt.includes(directive) ? prompt : `${prompt}\n\n${directive}`;
}

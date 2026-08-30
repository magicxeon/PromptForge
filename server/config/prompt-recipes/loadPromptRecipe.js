import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CONFIG_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));

export function loadPromptRecipe(relativePath) {
  const resolved = path.resolve(CONFIG_DIRECTORY, relativePath);
  if (!resolved.startsWith(`${CONFIG_DIRECTORY}${path.sep}`)) {
    throw new Error('Prompt Recipe path must remain inside server/config/prompt-recipes.');
  }
  const raw = fs.readFileSync(resolved, 'utf8');
  const recipe = JSON.parse(raw);
  if (!recipe?.id || !Number.isInteger(recipe.version) || !Array.isArray(recipe.instructions)) {
    throw new Error(`Prompt Recipe is invalid: ${relativePath}`);
  }
  return {
    ...structuredClone(recipe),
    instruction: recipe.instructions.map(value => String(value || '').trim()).filter(Boolean).join(' '),
    fingerprint: crypto.createHash('sha256').update(raw).digest('hex').slice(0, 16)
  };
}

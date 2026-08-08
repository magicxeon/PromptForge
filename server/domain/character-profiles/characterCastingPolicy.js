import fs from 'fs';
import { fileURLToPath } from 'url';

const POLICY_FILE = fileURLToPath(new URL('../../config/character-casting-policy.json', import.meta.url));
const policy = Object.freeze(JSON.parse(fs.readFileSync(POLICY_FILE, 'utf8')));

export function getCharacterCastingPolicy() {
  return policy;
}

export function compileCharacterCastingDirective(source = {}) {
  const presentation = resolveCharacterPresentation(source);
  const uniformDirective = policy.uniformDirectives?.[presentation]
    || policy.uniformDirectives?.neutral
    || '';
  return [policy.layoutDirective, uniformDirective, policy.outputDirective]
    .filter(value => typeof value === 'string' && value.trim())
    .join(' ');
}

export function resolveCharacterPresentation(source = {}) {
  const evidence = collectStrings(source).join(' ').toLowerCase();
  if (/\b(female|woman|women|girl)\b/.test(evidence)) return 'female';
  if (/\b(male|man|men|boy)\b/.test(evidence)) return 'male';
  return 'neutral';
}

function collectStrings(value, seen = new Set()) {
  if (typeof value === 'string') return [value];
  if (!value || typeof value !== 'object' || seen.has(value)) return [];
  seen.add(value);
  return Object.values(value).flatMap(item => collectStrings(item, seen));
}

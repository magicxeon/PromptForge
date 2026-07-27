import fs from 'fs';
import { fileURLToPath } from 'url';

const POLICY_FILE = fileURLToPath(new URL('../../config/character-casting-policy.json', import.meta.url));
const policy = Object.freeze(JSON.parse(fs.readFileSync(POLICY_FILE, 'utf8')));

export function getCharacterCastingPolicy() {
  return policy;
}

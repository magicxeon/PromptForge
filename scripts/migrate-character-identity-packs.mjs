import { characterProfileVersionRepo } from '../server/repositories/character-profiles/CharacterProfileVersionRepository.js';

const result = await characterProfileVersionRepo.migrateIdentityPackDefaults();
console.log(JSON.stringify({
  migration: 'character-identity-pack-v1',
  ...result
}, null, 2));

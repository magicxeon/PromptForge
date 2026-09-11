import { trustedGeneratedSourceService } from '../generation/TrustedGeneratedSourceService.js';
import { characterLookService } from '../character-profiles/CharacterLookService.js';

const invalid = () => Object.assign(new Error('Select approved Cast sheets again.'), { code: 'cinematic_cast_references_invalid', statusCode: 409 });

export function normalizeCinematicCastReferences(value) {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > 6) throw invalid();
  const rows = value.map(row => {
    if (!row || !['generated_sheet', 'character_look'].includes(row.sourceType)) throw invalid();
    const keys = ['castAssignmentId', 'displayName', 'sourceType', 'contentHash', 'generationId',
      'characterProfileId', 'characterLookId', 'characterLookVersionId'];
    const result = Object.fromEntries(keys.filter(key => row[key] != null).map(key => {
      if (typeof row[key] !== 'string' || !row[key].trim() || row[key].length > 120 || /[\x00-\x1f]/.test(row[key])) throw invalid();
      return [key, row[key].trim()];
    }));
    if (!result.castAssignmentId || !result.displayName || !result.contentHash) throw invalid();
    if (result.sourceType === 'generated_sheet'
      ? !result.generationId || result.characterProfileId || result.characterLookId || result.characterLookVersionId
      : !result.characterProfileId || !result.characterLookId || !result.characterLookVersionId || result.generationId) throw invalid();
    return result;
  });
  if (new Set(rows.map(row => row.castAssignmentId)).size !== rows.length) throw invalid();
  return rows;
}

export async function resolveCinematicCastReferences(value, actor, {
  trustedSources = trustedGeneratedSourceService, lookService = characterLookService
} = {}) {
  const rows = normalizeCinematicCastReferences(value);
  const resolved = [];
  for (const row of rows) {
    const source = row.sourceType === 'generated_sheet'
      ? await trustedSources.describeOwnedImage(row.generationId, actor)
      : (await lookService.resolveApprovedSheetReference(row.characterProfileId, row.characterLookId, row.characterLookVersionId, actor)).asset;
    if (source.contentHash !== row.contentHash || !source.publicUrl) throw invalid();
    resolved.push({ ...row, referenceValue: source.publicUrl });
  }
  return resolved;
}

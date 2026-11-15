import { DNA_FIELDS, VERSION } from './schema.js';
export function canonicalDNA(dna) {
  return JSON.stringify({ version: VERSION, dna: Object.fromEntries([...DNA_FIELDS].sort((a, b) => a.id.localeCompare(b.id)).map(field => [field.id, Array.isArray(dna[field.id]) ? [...dna[field.id]].sort() : dna[field.id]])) });
}
export function hash(text) {
  let value = 2166136261;
  for (const char of text) { value ^= char.codePointAt(0); value = Math.imul(value, 16777619); }
  return (value >>> 0).toString(16).padStart(8, '0');
}
const categories = [
  { groups: ['geometry', 'proportions', 'ears'], weight: .20 }, { groups: ['eyes', 'placement'], weight: .20 },
  { groups: ['brows'], weight: .10 }, { groups: ['nose'], weight: .15 },
  { groups: ['jaw', 'chin', 'cheeks'], weight: .15 }, { groups: ['lips'], weight: .10 }, { groups: ['skin', 'marks'], weight: .10 }
];
export function compareDNA(left, right) {
  const differences = [], matches = []; let distance = 0;
  for (const category of categories) {
    const fields = DNA_FIELDS.filter(field => category.groups.includes(field.group));
    for (const field of fields) {
      const a = left[field.id], b = right[field.id];
      const difference = field.type === 'range' ? Math.abs(a - b) / 4
        : field.type === 'multi' ? (() => { const union = new Set([...a, ...b]); return union.size ? 1 - a.filter(value => b.includes(value)).length / union.size : 0; })()
          : a === b ? 0 : 1;
      distance += difference * category.weight / fields.length;
      (difference ? differences : matches).push({ field, left: a, right: b, distance: difference });
    }
  }
  return { score: Math.max(0, Math.min(100, (1 - distance) * 100)), exact: canonicalDNA(left) === canonicalDNA(right), differences: differences.sort((a, b) => b.distance - a.distance), matches };
}
export function closest(dna, records, excludedId, count = 3) {
  return records.filter(record => record.id !== excludedId).map(record => ({ record, ...compareDNA(dna, record.profile.facialDNA) }))
    .sort((a, b) => Number(b.exact) - Number(a.exact) || b.score - a.score || a.record.id.localeCompare(b.record.id)).slice(0, count);
}
export function datasetFingerprint(records) { return hash(JSON.stringify(records.map(record => [record.id, canonicalDNA(record.profile.facialDNA)]).sort((a, b) => a[0].localeCompare(b[0])))); }
export function similarityLabel(result, settings) { return result.exact ? 'DNA ตรงกันทุกค่า' : result.score >= settings.high ? 'คล้ายมาก' : result.score >= settings.moderate ? 'คล้ายปานกลาง' : 'ค่อนข้างแตกต่าง'; }

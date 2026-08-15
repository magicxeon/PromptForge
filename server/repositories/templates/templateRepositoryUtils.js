import { readJsonFile, mutateJsonFile } from '../json/jsonFileStore.js';

const EMPTY_RECORDS = [];

export async function readTemplateRecords(filePath) {
  const records = await readJsonFile(filePath, EMPTY_RECORDS);
  return Array.isArray(records) ? records : [];
}

export async function insertTemplateRecord(filePath, record) {
  return mutateJsonFile(filePath, EMPTY_RECORDS, records => {
    if (!Array.isArray(records)) throw new TypeError('Template repository data must be an array.');
    records.unshift(record);
    return structuredClone(record);
  });
}

export async function insertTemplateRecordIfAbsent(filePath, record, matchesExisting) {
  return mutateJsonFile(filePath, EMPTY_RECORDS, records => {
    if (!Array.isArray(records)) throw new TypeError('Template repository data must be an array.');
    const existing = records.find(item => matchesExisting(item));
    if (existing) return structuredClone(existing);
    records.unshift(record);
    return structuredClone(record);
  });
}

export async function updateTemplateRecord(filePath, id, updater) {
  return mutateJsonFile(filePath, EMPTY_RECORDS, records => {
    if (!Array.isArray(records)) throw new TypeError('Template repository data must be an array.');
    const index = records.findIndex(record => record.id === id);
    if (index < 0) return null;
    const next = updater(structuredClone(records[index]));
    records[index] = next;
    return structuredClone(next);
  });
}

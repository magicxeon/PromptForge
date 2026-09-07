import { resolveDataFile } from '../../config/paths.js';
import { readJsonFile, mutateJsonFile } from '../json/jsonFileStore.js';

export class TrustedGeneratedSourceRepository {
  constructor({ file = resolveDataFile('trustedGeneratedSources') } = {}) {
    this.file = file;
  }
  async findManyForOwner(ids, ownerUserId) {
    const wanted = new Set(ids);
    const rows = await readJsonFile(this.file, []);
    return rows.filter(
      (row) => row.ownerUserId === ownerUserId && wanted.has(row.id),
    );
  }
  async listForOwner(ownerUserId) {
    const rows = await readJsonFile(this.file, []);
    return rows.filter((row) => row.ownerUserId === ownerUserId);
  }
  async create(record) {
    return mutateJsonFile(this.file, [], (rows) => {
      if (!rows.some((row) => row.id === record.id)) rows.push(record);
    });
  }
  async reject(ids, ownerUserId, evidence) {
    const wanted = new Set(ids);
    return mutateJsonFile(this.file, [], (rows) => {
      for (const row of rows)
        if (row.ownerUserId === ownerUserId && wanted.has(row.id))
          row.rejection = evidence;
    });
  }
}
export const trustedGeneratedSourceRepository =
  new TrustedGeneratedSourceRepository();

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { PROMPT_REFINEMENT_AUDIT_DIR } from '../../config/paths.js';
import { writeJsonFileAtomic } from '../json/jsonFileStore.js';

export class PromptRefinementAuditRepository {
  constructor({
    directory = PROMPT_REFINEMENT_AUDIT_DIR,
    maxFiles = 500
  } = {}) {
    this.directory = directory;
    this.maxFiles = Math.max(10, Number(maxFiles) || 500);
  }

  async write(jobId, record, { maxFiles = this.maxFiles } = {}) {
    const safeJobId = normalizeJobId(jobId);
    if (!safeJobId || !record || typeof record !== 'object') return null;
    const filePath = path.resolve(this.directory, `${safeJobId}.json`);
    if (path.dirname(filePath) !== path.resolve(this.directory)) {
      throw new Error('Prompt refinement audit path escaped its owning directory.');
    }
    await writeJsonFileAtomic(filePath, {
      ...structuredClone(record),
      schemaVersion: 1,
      jobId: safeJobId
    });
    await this.prune(maxFiles).catch(() => {});
    return filePath;
  }

  async prune(maxFiles = this.maxFiles) {
    const entries = await fs.readdir(this.directory, { withFileTypes: true });
    const files = entries
      .filter(entry => entry.isFile() && entry.name.endsWith('.json'));
    const boundedMaxFiles = Math.max(10, Number(maxFiles) || this.maxFiles);
    if (files.length <= boundedMaxFiles) return;
    const ranked = await Promise.all(files.map(async entry => {
      const filePath = path.resolve(this.directory, entry.name);
      const stat = await fs.stat(filePath);
      return { filePath, modifiedAt: stat.mtimeMs };
    }));
    const obsolete = ranked
      .sort((left, right) => left.modifiedAt - right.modifiedAt)
      .slice(0, Math.max(0, ranked.length - boundedMaxFiles));
    await Promise.all(obsolete.map(entry => fs.unlink(entry.filePath).catch(() => {})));
  }
}

function normalizeJobId(value) {
  const jobId = String(value || '').trim();
  return /^[a-zA-Z0-9_-]{3,160}$/.test(jobId) ? jobId : null;
}

export const promptRefinementAuditRepository = new PromptRefinementAuditRepository();

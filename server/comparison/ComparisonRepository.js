import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ComparisonError extends Error {
  constructor(code, message, statusCode = 400) {
    super(message);
    this.name = 'ComparisonError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class ComparisonRepository {
  constructor({ comparisonsFile = path.join(__dirname, '../comparisons.json') } = {}) {
    this.comparisonsFile = comparisonsFile;
    this.mutationChain = Promise.resolve();
  }

  async init() {
    try {
      await fs.access(this.comparisonsFile);
    } catch {
      await this.writeData({ version: 1, sets: [] });
    }
  }

  async readData() {
    await this.init();
    const raw = await fs.readFile(this.comparisonsFile, 'utf8');
    const data = JSON.parse(raw);
    return { version: Number(data.version) || 1, sets: Array.isArray(data.sets) ? data.sets : [] };
  }

  async writeData(data) {
    const directory = path.dirname(this.comparisonsFile);
    await fs.mkdir(directory, { recursive: true });
    const temporaryFile = path.join(
      directory,
      `.${path.basename(this.comparisonsFile)}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`
    );
    await fs.writeFile(temporaryFile, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
    await fs.rename(temporaryFile, this.comparisonsFile);
  }

  mutate(operation) {
    const mutation = this.mutationChain.then(async () => {
      const data = await this.readData();
      const result = await operation(data);
      await this.writeData(data);
      return result;
    });
    this.mutationChain = mutation.catch(() => {});
    return mutation;
  }

  getSetOrThrow(data, setId) {
    const set = data.sets.find(item => item.id === setId);
    if (!set) throw new ComparisonError('comparison_not_found', 'Comparison Set not found.', 404);
    return set;
  }

  getRunOrThrow(set, runId) {
    const run = set.runs.find(item => item.id === runId);
    if (!run) throw new ComparisonError('comparison_run_not_found', 'Comparison Run not found.', 404);
    return run;
  }

  async list(username) {
    const data = await this.readData();
    return data.sets
      .filter(set => set.username === username)
      .map(set => ({
        id: set.id,
        name: set.name,
        description: set.description,
        winnerJobId: set.winnerJobId,
        collectionIds: set.collectionIds,
        createdAt: set.createdAt,
        updatedAt: set.updatedAt,
        runCount: set.runs.length,
        latestRun: set.runs[0] ? {
          id: set.runs[0].id,
          status: set.runs[0].status,
          estimatedTotalCredit: set.runs[0].estimatedTotalCredit,
          actualTotalCredit: set.runs[0].actualTotalCredit,
          createdAt: set.runs[0].createdAt,
          completedAt: set.runs[0].completedAt,
          slotCount: set.runs[0].slots.length
        } : null
      }));
  }

  async get(setId, username) {
    const data = await this.readData();
    const set = this.getSetOrThrow(data, setId);
    if (set.username !== username) throw new ComparisonError('comparison_forbidden', 'Comparison Set is not available.', 403);
    return structuredClone(set);
  }

  async createSetWithRun({ username, name, description, idempotencyKey, run }) {
    return this.mutate(async data => {
      const existing = data.sets.find(set =>
        set.username === username && set.runs.some(item => item.idempotencyKey === idempotencyKey)
      );
      if (existing) {
        return {
          created: false,
          set: structuredClone(existing),
          run: structuredClone(existing.runs.find(item => item.idempotencyKey === idempotencyKey))
        };
      }
      const timestamp = Date.now();
      const set = {
        id: `cmp_set_${timestamp}_${Math.random().toString(36).slice(2, 8)}`,
        username,
        name,
        description,
        collectionIds: [],
        winnerJobId: null,
        createdAt: timestamp,
        updatedAt: timestamp,
        runs: [{ ...run, id: `cmp_run_${timestamp}_${Math.random().toString(36).slice(2, 8)}` }]
      };
      data.sets.unshift(set);
      return { created: true, set: structuredClone(set), run: structuredClone(set.runs[0]) };
    });
  }

  async updateRun(setId, runId, updater) {
    return this.mutate(async data => {
      const set = this.getSetOrThrow(data, setId);
      const run = this.getRunOrThrow(set, runId);
      await updater(run, set);
      set.updatedAt = Date.now();
      return structuredClone(run);
    });
  }

  async updateSet(setId, username, payload) {
    return this.mutate(async data => {
      const set = this.getSetOrThrow(data, setId);
      if (set.username !== username) throw new ComparisonError('comparison_forbidden', 'Comparison Set is not available.', 403);
      if (payload.name !== undefined) set.name = normalizeText(payload.name, 'name', 100, true);
      if (payload.description !== undefined) set.description = normalizeText(payload.description, 'description', 1000);
      set.updatedAt = Date.now();
      return structuredClone(set);
    });
  }

  async setWinner(setId, username, jobId) {
    return this.mutate(async data => {
      const set = this.getSetOrThrow(data, setId);
      if (set.username !== username) throw new ComparisonError('comparison_forbidden', 'Comparison Set is not available.', 403);
      const completedJobIds = set.runs.flatMap(run => run.slots)
        .filter(slot => slot.status === 'completed')
        .map(slot => slot.jobId);
      if (jobId !== null && !completedJobIds.includes(jobId)) {
        throw new ComparisonError('invalid_winner', 'Winner must be a completed image in this Comparison Set.');
      }
      set.winnerJobId = jobId;
      set.updatedAt = Date.now();
      return { winnerJobId: jobId };
    });
  }

  async remove(setId, username) {
    return this.mutate(async data => {
      const set = this.getSetOrThrow(data, setId);
      if (set.username !== username) throw new ComparisonError('comparison_forbidden', 'Comparison Set is not available.', 403);
      data.sets = data.sets.filter(item => item.id !== setId);
      return { success: true };
    });
  }

  async removeHistoryJob(jobId) {
    return this.mutate(async data => {
      data.sets.forEach(set => {
        if (set.winnerJobId === jobId) set.winnerJobId = null;
        set.runs.forEach(run => {
          const slot = run.slots.find(item => item.jobId === jobId);
          if (slot) slot.result = null;
        });
      });
      return { success: true };
    });
  }
}

function normalizeText(value, field, maxLength, required = false) {
  if (typeof value !== 'string') throw new ComparisonError('invalid_field', `${field} must be a string.`);
  const normalized = value.trim();
  if (required && !normalized) throw new ComparisonError('invalid_field', `${field} is required.`);
  if (normalized.length > maxLength) throw new ComparisonError('invalid_field', `${field} is too long.`);
  return normalized;
}

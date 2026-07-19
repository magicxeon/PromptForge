import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { resolveDataFile } from '../config/paths.js';

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
  constructor({
    comparisonsFile = resolveDataFile('comparisons'),
    historyFile = resolveDataFile('history'),
    cursorSecret = process.env.COMPARISON_CURSOR_SECRET || 'local-comparison-cursor'
  } = {}) {
    this.comparisonsFile = comparisonsFile;
    this.historyFile = historyFile;
    this.cursorSecret = cursorSecret;
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
    try {
      await renameWithRetry(temporaryFile, this.comparisonsFile);
    } catch (error) {
      await fs.unlink(temporaryFile).catch(() => {});
      throw error;
    }
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
    const page = await this.listPage(username, { limit: 50 });
    return page.items;
  }

  async listPage(username, {
    cursor = null,
    limit = 24,
    search = '',
    status = 'all',
    dateRange = 'all'
  } = {}) {
    const data = await this.readData();
    const safeLimit = Math.min(50, Math.max(1, Number(limit) || 24));
    const normalizedSearch = String(search || '').trim().toLowerCase();
    const scope = JSON.stringify({ username, search: normalizedSearch, status, dateRange });
    const decodedCursor = cursor ? this.decodeCursor(cursor, scope) : null;
    const cutoff = getDateCutoff(dateRange);
    const history = await this.readHistory();
    const historyById = new Map(history.map(item => [item.id, item]));
    let sets = data.sets.filter(set => set.username === username);
    if (normalizedSearch) {
      sets = sets.filter(set => getComparisonSearchText(set).includes(normalizedSearch));
    }
    if (status !== 'all') sets = sets.filter(set => matchesComparisonStatus(set.runs[0]?.status, status));
    if (cutoff) sets = sets.filter(set => Number(set.updatedAt || 0) >= cutoff);
    sets.sort(compareSets);
    if (decodedCursor) sets = sets.filter(set => compareSets(set, decodedCursor) > 0);
    const pageSets = sets.slice(0, safeLimit);
    const hasMore = sets.length > safeLimit;
    const items = pageSets.map(set => {
      const latestRun = set.runs[0] || null;
      const completedSlots = latestRun?.slots?.filter(slot => slot.status === 'completed') || [];
      return {
        id: set.id,
        name: set.name,
        description: set.description,
        winnerJobId: set.winnerJobId,
        collectionIds: set.collectionIds,
        createdAt: set.createdAt,
        updatedAt: set.updatedAt,
        runCount: set.runs.length,
        status: latestRun?.status || 'draft',
        completedCount: completedSlots.length,
        slotCount: latestRun?.slots?.length || 0,
        providers: [...new Set(latestRun?.slots?.map(slot => slot.provider) || [])],
        models: [...new Set(latestRun?.slots?.map(slot => slot.model) || [])],
        previewImages: completedSlots.slice(0, 3).map(slot => {
          const historyItem = historyById.get(slot.jobId);
          return {
            jobId: slot.jobId,
            thumbnailUrl: historyItem?.thumbnailUrl || null,
            imageUrl: historyItem?.imageUrl || slot.result?.imageUrl || null,
            width: historyItem?.thumbnailWidth || historyItem?.width || null,
            height: historyItem?.thumbnailHeight || historyItem?.height || null
          };
        }),
        latestRun: latestRun ? {
          id: latestRun.id,
          status: latestRun.status,
          estimatedTotalCredit: latestRun.estimatedTotalCredit,
          actualTotalCredit: latestRun.actualTotalCredit,
          createdAt: latestRun.createdAt,
          completedAt: latestRun.completedAt,
          slotCount: latestRun.slots.length
        } : null
      };
    });
    const lastItem = pageSets.at(-1);
    return {
      items,
      nextCursor: hasMore && lastItem ? this.encodeCursor(lastItem, scope) : null,
      hasMore
    };
  }

  async readHistory() {
    try {
      const raw = await fs.readFile(this.historyFile, 'utf8');
      const history = JSON.parse(raw);
      return Array.isArray(history) ? history : [];
    } catch {
      return [];
    }
  }

  encodeCursor(set, scope) {
    const payload = Buffer.from(JSON.stringify({ updatedAt: set.updatedAt, id: set.id, scope })).toString('base64url');
    const signature = crypto.createHmac('sha256', this.cursorSecret).update(payload).digest('base64url');
    return `${payload}.${signature}`;
  }

  decodeCursor(cursor, scope) {
    try {
      const [payload, signature] = String(cursor).split('.');
      const expected = crypto.createHmac('sha256', this.cursorSecret).update(payload).digest('base64url');
      const actualBuffer = Buffer.from(signature || '');
      const expectedBuffer = Buffer.from(expected);
      if (actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) {
        throw new Error('Invalid signature');
      }
      const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
      if (decoded.scope !== scope || typeof decoded.id !== 'string') throw new Error('Invalid scope');
      return decoded;
    } catch {
      throw new ComparisonError('invalid_comparison_cursor', 'Comparison cursor is invalid for the current query.');
    }
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

async function renameWithRetry(source, destination, attempts = 8) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      await fs.rename(source, destination);
      return;
    } catch (error) {
      const canRetry = ['EBUSY', 'EPERM'].includes(error.code);
      if (!canRetry || attempt === attempts - 1) throw error;
      await delay(35 * (attempt + 1));
    }
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function compareSets(a, b) {
  const updatedDifference = Number(b.updatedAt || 0) - Number(a.updatedAt || 0);
  if (updatedDifference !== 0) return updatedDifference;
  return String(b.id || '').localeCompare(String(a.id || ''));
}

function getComparisonSearchText(set) {
  const slotValues = set.runs.flatMap(run => run.slots.flatMap(slot => [
    slot.provider,
    slot.model,
    slot.providerDisplayName?.en,
    slot.providerDisplayName?.th,
    slot.modelDisplayName?.en,
    slot.modelDisplayName?.th
  ]));
  return [set.name, set.description, ...slotValues].filter(Boolean).join(' ').toLowerCase();
}

function matchesComparisonStatus(runStatus, requested) {
  if (requested === 'completed') return runStatus === 'completed';
  if (requested === 'issues') return ['partially_completed', 'failed', 'cancelled'].includes(runStatus);
  if (requested === 'processing') return ['queued', 'processing', 'streaming'].includes(runStatus);
  return true;
}

function getDateCutoff(dateRange) {
  if (dateRange === '7d') return Date.now() - (7 * 24 * 60 * 60 * 1000);
  if (dateRange === '30d') return Date.now() - (30 * 24 * 60 * 60 * 1000);
  return null;
}

function normalizeText(value, field, maxLength, required = false) {
  if (typeof value !== 'string') throw new ComparisonError('invalid_field', `${field} must be a string.`);
  const normalized = value.trim();
  if (required && !normalized) throw new ComparisonError('invalid_field', `${field} is required.`);
  if (normalized.length > maxLength) throw new ComparisonError('invalid_field', `${field} is too long.`);
  return normalized;
}

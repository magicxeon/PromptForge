import { promises as fs } from 'fs';
import crypto from 'crypto';
import { resolveDataFile } from '../../config/paths.js';
import { readJsonFile, mutateJsonFile } from '../../repositories/json/jsonFileStore.js';

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
  }

  async init() {
    // No-op for compatibility: path resolver and shared store handle init on-demand
  }

  async readData() {
    const data = await readJsonFile(this.comparisonsFile, { version: 1, sets: [] });
    return { version: Number(data.version) || 1, sets: Array.isArray(data.sets) ? data.sets : [] };
  }

  mutate(operation) {
    return mutateJsonFile(this.comparisonsFile, { version: 1, sets: [] }, async (data) => {
      if (!data.version) data.version = 1;
      if (!Array.isArray(data.sets)) data.sets = [];
      return operation(data);
    });
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

  async list(owner) {
    const page = await this.listPage(owner, { limit: 50 });
    return page.items;
  }

  async listPage(owner, {
    cursor = null,
    limit = 24,
    search = '',
    status = 'all',
    dateRange = 'all'
  } = {}) {
    const data = await this.readData();
    const safeLimit = Math.min(50, Math.max(1, Number(limit) || 24));
    const normalizedSearch = String(search || '').trim().toLowerCase();
    const normalizedOwner = normalizeOwner(owner);
    const scope = JSON.stringify({ ownerUserId: normalizedOwner.userId, username: normalizedOwner.username, search: normalizedSearch, status, dateRange });
    const decodedCursor = cursor ? this.decodeCursor(cursor, scope) : null;
    const cutoff = getDateCutoff(dateRange);
    const history = await this.readHistory();
    const historyById = new Map(
      history
        .filter(item => isHistoryOwnedBy(item, normalizedOwner))
        .map(item => [item.id, item])
    );
    let sets = data.sets.filter(set => isOwnedBy(set, normalizedOwner));
    if (normalizedSearch) {
      sets = sets.filter(set => getComparisonSearchText(set).includes(normalizedSearch));
    }
    if (status !== 'all') {
      sets = sets.filter(set =>
        matchesComparisonStatus(getComparisonRunStatus(findNewestRun(set.runs)), status)
      );
    }
    if (cutoff) sets = sets.filter(set => Number(set.updatedAt || 0) >= cutoff);
    sets.sort(compareSets);
    if (decodedCursor) sets = sets.filter(set => compareSets(set, decodedCursor) > 0);
    const pageSets = sets.slice(0, safeLimit);
    const hasMore = sets.length > safeLimit;
    const items = pageSets.map(set => {
      const latestRun = findNewestRun(set.runs);
      const completedSlots = latestRun?.slots?.filter(slot =>
        ['completed', 'succeeded'].includes(String(slot.status || '').toLowerCase())
      ) || [];
      const aggregateStatus = getComparisonRunStatus(latestRun);
      return {
        id: set.id,
        name: set.name,
        description: set.description,
        winnerJobId: set.winnerJobId,
        collectionIds: set.collectionIds,
        createdAt: set.createdAt,
        updatedAt: set.updatedAt,
        runCount: set.runs.length,
        status: aggregateStatus,
        completedCount: completedSlots.length,
        slotCount: latestRun?.slots?.length || 0,
        providers: [...new Set(latestRun?.slots?.map(slot => slot.provider) || [])],
        models: [...new Set(latestRun?.slots?.map(slot => slot.model) || [])],
        previewImages: completedSlots.slice(0, 4).map(slot => {
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
          status: aggregateStatus,
          estimatedTotalCredit: latestRun.estimatedTotalCredit,
          actualTotalCredit: latestRun.actualTotalCredit,
          createdAt: latestRun.createdAt,
          completedAt: latestRun.completedAt,
          slotCount: latestRun.slots?.length || 0
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

  async get(setId, owner) {
    const data = await this.readData();
    const set = this.getSetOrThrow(data, setId);
    if (!isOwnedBy(set, normalizeOwner(owner))) throw new ComparisonError('comparison_forbidden', 'Comparison Set is not available.', 403);
    return structuredClone(set);
  }

  async createSetWithRun({ ownerUserId = null, username, name, description, idempotencyKey, run }) {
    return this.mutate(async data => {
      const existing = data.sets.find(set =>
        isOwnedBy(set, { userId: ownerUserId, username }) && set.runs.some(item => item.idempotencyKey === idempotencyKey)
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
        ownerUserId,
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

  async updateSet(setId, owner, payload) {
    return this.mutate(async data => {
      const set = this.getSetOrThrow(data, setId);
      if (!isOwnedBy(set, normalizeOwner(owner))) throw new ComparisonError('comparison_forbidden', 'Comparison Set is not available.', 403);
      if (payload.name !== undefined) set.name = normalizeText(payload.name, 'name', 120, true);
      if (payload.description !== undefined) set.description = normalizeText(payload.description, 'description', 1000);
      set.updatedAt = Date.now();
      return structuredClone(set);
    });
  }

  async setWinner(setId, owner, jobId) {
    return this.mutate(async data => {
      const set = this.getSetOrThrow(data, setId);
      if (!isOwnedBy(set, normalizeOwner(owner))) throw new ComparisonError('comparison_forbidden', 'Comparison Set is not available.', 403);
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

  async remove(setId, owner) {
    return this.mutate(async data => {
      const set = this.getSetOrThrow(data, setId);
      if (!isOwnedBy(set, normalizeOwner(owner))) throw new ComparisonError('comparison_forbidden', 'Comparison Set is not available.', 403);
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

function normalizeOwner(owner) {
  if (typeof owner === 'string') return { userId: null, username: owner };
  return {
    userId: owner?.userId || owner?.ownerUserId || null,
    username: owner?.username || owner?.ownerUsername || null
  };
}

function isOwnedBy(set, owner) {
  if (set.ownerUserId && owner.userId) return set.ownerUserId === owner.userId;
  return Boolean(set.username && owner.username && set.username === owner.username);
}

function isHistoryOwnedBy(item, owner) {
  if (item.ownerUserId && owner.userId) return item.ownerUserId === owner.userId;
  const username = item.ownerUsername || item.username || null;
  return Boolean(username && owner.username && username === owner.username);
}

function findNewestRun(runs) {
  if (!Array.isArray(runs)) return null;
  return runs.reduce((newest, candidate) => {
    if (!newest) return candidate;
    return Number(candidate.createdAt || 0) > Number(newest.createdAt || 0)
      ? candidate
      : newest;
  }, null);
}

function getComparisonRunStatus(run) {
  if (!run) return 'draft';
  const slots = Array.isArray(run.slots) ? run.slots : [];
  if (!slots.length) return String(run.status || 'draft').toLowerCase();
  const statuses = slots.map(slot => String(slot.status || '').toLowerCase());
  const terminalStatuses = new Set(['completed', 'succeeded', 'failed', 'cancelled']);
  const allTerminal = statuses.every(status => terminalStatuses.has(status));
  const completedCount = statuses.filter(status =>
    status === 'completed' || status === 'succeeded'
  ).length;

  if (allTerminal && completedCount === statuses.length) return 'completed';
  if (allTerminal && completedCount > 0) return 'partially_completed';
  if (allTerminal) return 'failed';
  if (statuses.some(status =>
    ['processing', 'streaming', 'generating', 'running'].includes(status)
  )) {
    return 'processing';
  }
  return 'queued';
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

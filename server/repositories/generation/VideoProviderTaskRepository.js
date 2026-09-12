import { resolveDataFile } from '../../config/paths.js';
import { mutateJsonFile, readJsonFile } from '../json/jsonFileStore.js';
import { createPrefixedId } from '../schemaVersioning.js';
import { createPage, normalizeListQuery } from '../repositoryContracts.js';
import { paginateRepositoryRecords } from '../RepositoryCursor.js';

const FALLBACK = { schemaVersion: 1, tasks: [] };
const TERMINAL = new Set(['completed', 'failed', 'cancelled', 'expired', 'reconciliation_required']);

export class VideoProviderTaskRepository {
  constructor({
    tasksFile = resolveDataFile('videoProviderTasks'),
    cursorSecret = process.env.VIDEO_TASK_CURSOR_SECRET || 'local-video-task-cursor'
  } = {}) {
    this.tasksFile = tasksFile;
    this.cursorSecret = cursorSecret;
  }

  createAccepted(input) {
    return mutateJsonFile(this.tasksFile, FALLBACK, data => {
      assertStore(data);
      const replay = data.tasks.find(task => task.ownerUserId === input.ownerUserId && task.idempotencyKey === input.idempotencyKey);
      if (replay) return structuredClone(replay);
      const now = new Date().toISOString();
      const task = {
        id: input.id || createPrefixedId('videotask'),
        schemaVersion: 1,
        status: 'accepted',
        pollCount: 0,
        providerTaskId: null,
        providerOperationId: null,
        outputAsset: null,
        providerUsage: null,
        providerError: null,
        supportReference: createPrefixedId('support'),
        createdAt: now,
        updatedAt: now,
        ...structuredClone(input)
      };
      data.tasks.unshift(task);
      return structuredClone(task);
    });
  }

  find(taskId) {
    return this.#read().then(data => {
      const task = data.tasks.find(item => item.id === taskId);
      return task ? structuredClone(task) : null;
    });
  }

  async findForActor(taskId, actorContext) {
    const task = await this.find(taskId);
    return task?.ownerUserId === actorContext?.userId ? task : null;
  }

  async findManyForActor(taskIds, actorContext) {
    if (!actorContext?.userId || !taskIds.length) return [];
    const ids = new Set(taskIds.slice(-128));
    const data = await this.#read();
    return data.tasks.filter(task => task.ownerUserId === actorContext?.userId && ids.has(task.id)).map(task => ({
      id: task.id, status: task.status, outputAsset: structuredClone(task.outputAsset), billingStatus: task.billingStatus
    }));
  }

  async findByIdempotencyKey(ownerUserId, idempotencyKey) {
    const data = await this.#read();
    const task = data.tasks.find(item => item.ownerUserId === ownerUserId && item.idempotencyKey === idempotencyKey);
    return task ? structuredClone(task) : null;
  }

  listRecoverable({ limit = 100 } = {}) {
    return this.#read().then(data => data.tasks
      .filter(task => shouldRecover(task))
      .slice(0, limit)
      .map(task => structuredClone(task)));
  }

  listForActor(actorContext, { limit = 6 } = {}) {
    const ownerUserId = String(actorContext?.userId || '');
    const boundedLimit = Math.min(24, Math.max(1, Number(limit) || 6));
    return this.#read().then(data => data.tasks
      .filter(task => task.ownerUserId === ownerUserId)
      .slice(0, boundedLimit)
      .map(task => structuredClone(task)));
  }

  listOperational({ search = '', status = '', limit = 50 } = {}) {
    const needle = String(search).trim().toLowerCase();
    return this.#read().then(data => data.tasks.filter(task => (
      (!status || task.status === status)
      && (!needle || [task.id, task.projectId, task.sceneId, task.shotId, task.attemptId, task.providerTaskId, task.supportReference]
        .filter(Boolean).some(value => String(value).toLowerCase().includes(needle)))
    )).slice(0, Math.min(100, Math.max(1, Number(limit) || 50))).map(task => structuredClone(task)));
  }

  async listOperationalPage(query = {}) {
    const normalizedQuery = normalizeListQuery(query, { defaultLimit: 25, maxLimit: 100 });
    const search = String(query.search || '').trim().toLowerCase();
    const status = String(query.status || '').trim();
    const data = await this.#read();
    const records = data.tasks.filter(task => (
      (!status || task.status === status)
      && (!search || [task.id, task.ownerUserId, task.ownerUsername, task.projectId, task.sceneId,
        task.shotId, task.attemptId, task.providerId, task.modelId, task.providerTaskId, task.supportReference]
        .filter(Boolean).some(value => String(value).toLowerCase().includes(search)))
    ));
    const page = paginateRepositoryRecords(
      records,
      normalizedQuery,
      JSON.stringify({ search, status, sort: normalizedQuery.sort }),
      this.cursorSecret
    );
    return createPage(page.items, page);
  }

  update(taskId, operation) {
    return mutateJsonFile(this.tasksFile, FALLBACK, async data => {
      assertStore(data);
      const index = data.tasks.findIndex(task => task.id === taskId);
      if (index < 0) throw Object.assign(new Error('Video provider task not found.'), { code: 'video_task_not_found', statusCode: 404 });
      const draft = structuredClone(data.tasks[index]);
      const result = await operation(draft);
      draft.updatedAt = new Date().toISOString();
      data.tasks[index] = draft;
      return structuredClone(result === undefined ? draft : result);
    });
  }

  async #read() {
    const data = await readJsonFile(this.tasksFile, FALLBACK);
    assertStore(data);
    return data;
  }
}

function shouldRecover(task) {
  if (!TERMINAL.has(task.status)) return true;
  return task.billingStatus === 'reserved'
    && ['completed', 'failed', 'cancelled', 'expired'].includes(task.status);
}

function assertStore(data) {
  if (!data || !Array.isArray(data.tasks)) throw new TypeError('Video provider task data must contain a tasks array.');
}

export const videoProviderTaskRepository = new VideoProviderTaskRepository();

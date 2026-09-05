import fs from 'node:fs';
import { resolveDataFile } from '../../config/paths.js';
import { mutateJsonFile, readJsonFile } from '../json/jsonFileStore.js';
import { RepositoryContractError } from '../repositoryContracts.js';

const MAX_HISTORY = 250;
const FALLBACK = Object.freeze({
  schemaVersion: 1,
  version: 0,
  updatedAt: null,
  providers: {},
  models: {},
  workflows: {},
  history: []
});

export class ProviderControlRepository {
  constructor({ stateFile = resolveDataFile('providerControlState') } = {}) {
    this.stateFile = stateFile;
  }

  async getState() {
    return normalizeState(await readJsonFile(this.stateFile, FALLBACK));
  }

  getStateSync() {
    try {
      return normalizeState(JSON.parse(fs.readFileSync(this.stateFile, 'utf8')));
    } catch (error) {
      if (error?.code === 'ENOENT') return structuredClone(FALLBACK);
      throw error;
    }
  }

  applyCommand(command) {
    return mutateJsonFile(this.stateFile, FALLBACK, data => {
      const state = normalizeMutableState(data);
      const replay = state.history.find(event => event.commandId === command.commandId);
      if (replay) {
        return { state: structuredClone(state), event: structuredClone(replay), replayed: true };
      }
      if (state.version !== command.expectedVersion) {
        const error = new RepositoryContractError(
          'provider_control_version_conflict',
          'Provider controls changed after this page was loaded.',
          409
        );
        error.details = { currentVersion: state.version };
        throw error;
      }

      const collection = collectionFor(state, command.targetType);
      const key = targetKey(command);
      const previous = collection[key] ? structuredClone(collection[key]) : null;
      const nextVersion = state.version + 1;
      const next = {
        enabled: command.enabled === true,
        reason: command.reason,
        updatedAt: command.createdAt,
        updatedByUserId: command.actorUserId,
        version: nextVersion
      };
      collection[key] = next;
      const event = {
        commandId: command.commandId,
        targetType: command.targetType,
        providerId: command.providerId,
        modelId: command.modelId || null,
        workflow: command.workflow || null,
        enabled: command.enabled === true,
        reason: command.reason,
        previous,
        version: nextVersion,
        actorUserId: command.actorUserId,
        createdAt: command.createdAt
      };
      state.version = nextVersion;
      state.updatedAt = command.createdAt;
      state.history.unshift(event);
      state.history = state.history.slice(0, MAX_HISTORY);
      return { state: structuredClone(state), event: structuredClone(event), replayed: false };
    });
  }
}

function normalizeState(value) {
  const state = structuredClone(value);
  assertState(state);
  return state;
}

function normalizeMutableState(value) {
  if (value?.schemaVersion === undefined && Object.keys(value || {}).length === 0) {
    Object.assign(value, structuredClone(FALLBACK));
  }
  assertState(value);
  return value;
}

function assertState(state) {
  if (!state || state.schemaVersion !== 1 || !Number.isInteger(state.version)
    || state.version < 0 || !isRecord(state.providers) || !isRecord(state.models)
    || !isRecord(state.workflows) || !Array.isArray(state.history)) {
    throw new TypeError('Provider control state is invalid.');
  }
}

function collectionFor(state, targetType) {
  if (targetType === 'provider') return state.providers;
  if (targetType === 'model') return state.models;
  if (targetType === 'workflow') return state.workflows;
  throw new RepositoryContractError('provider_control_target_invalid', 'Provider control target is invalid.');
}

function targetKey(command) {
  if (command.targetType === 'provider') return command.providerId;
  if (command.targetType === 'model') return `${command.providerId}/${command.modelId}`;
  return `${command.providerId}/${command.modelId}/${command.workflow}`;
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export const providerControlRepository = new ProviderControlRepository();

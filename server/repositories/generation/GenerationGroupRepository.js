import { resolveDataFile } from '../../config/paths.js';
import { readJsonFile, mutateJsonFile } from '../json/jsonFileStore.js';

const FALLBACK = [];

export class GenerationGroupRepository {
  constructor({ groupsFile = resolveDataFile('generationGroups') } = {}) {
    this.groupsFile = groupsFile;
  }

  async findById(id) {
    if (!id) return null;
    const groups = await readJsonFile(this.groupsFile, FALLBACK);
    return structuredClone(groups.find(group => group.id === id) || null);
  }

  async findByRequest(actorUserId, requestId) {
    if (!actorUserId || !requestId) return null;
    const groups = await readJsonFile(this.groupsFile, FALLBACK);
    return structuredClone(groups.find(group =>
      group.actorUserId === actorUserId && group.requestId === requestId
    ) || null);
  }

  async create(record) {
    return mutateJsonFile(this.groupsFile, FALLBACK, async groups => {
      if (!Array.isArray(groups)) throw new TypeError('Generation groups data must be an array.');
      const duplicate = groups.find(group =>
        group.actorUserId === record.actorUserId && group.requestId === record.requestId
      );
      if (duplicate) return structuredClone(duplicate);
      groups.unshift(structuredClone(record));
      return structuredClone(record);
    });
  }

  async update(id, patch) {
    return mutateJsonFile(this.groupsFile, FALLBACK, async groups => {
      if (!Array.isArray(groups)) throw new TypeError('Generation groups data must be an array.');
      const index = groups.findIndex(group => group.id === id);
      if (index < 0) return null;
      groups[index] = {
        ...groups[index],
        ...structuredClone(patch),
        updatedAt: new Date().toISOString()
      };
      return structuredClone(groups[index]);
    });
  }

  async recordChildStatus(id, childStatus) {
    return mutateJsonFile(this.groupsFile, FALLBACK, async groups => {
      if (!Array.isArray(groups)) throw new TypeError('Generation groups data must be an array.');
      const index = groups.findIndex(group => group.id === id);
      if (index < 0) return null;
      const group = groups[index];
      const children = Array.isArray(group.children)
        ? group.children.map(child => ({ ...child }))
        : (group.childJobIds || []).map((jobId, outputIndex) => ({
          jobId,
          outputIndex,
          status: 'queued',
          result: null,
          error: null
        }));
      const childIndex = children.findIndex(child => child.jobId === childStatus.jobId);
      if (childIndex >= 0) children[childIndex] = { ...children[childIndex], ...structuredClone(childStatus) };
      const aggregate = aggregateChildren(children, group.requestedOutputCount);
      const now = new Date().toISOString();
      groups[index] = {
        ...group,
        ...aggregate,
        children,
        completedAt: aggregate.terminal ? (group.completedAt || now) : null,
        updatedAt: now
      };
      delete groups[index].terminal;
      return structuredClone(groups[index]);
    });
  }
}

function aggregateChildren(children, requestedOutputCount) {
  const completedCount = children.filter(child => child.status === 'completed').length;
  const failedCount = children.filter(child => child.status === 'failed').length;
  const terminalCount = completedCount + failedCount;
  const terminal = terminalCount === requestedOutputCount;
  const status = terminal
    ? completedCount === requestedOutputCount
      ? 'completed'
      : completedCount > 0 ? 'partially_completed' : 'failed'
    : children.some(child => child.status === 'processing' || child.status === 'completed')
      ? 'running'
      : 'queued';
  return { status, completedCount, failedCount, terminal };
}

export const generationGroupRepository = new GenerationGroupRepository();

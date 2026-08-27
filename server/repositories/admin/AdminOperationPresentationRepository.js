import { resolveDataFile } from '../../config/paths.js';
import { mutateJsonFile, readJsonFile } from '../json/jsonFileStore.js';

const FALLBACK = { schemaVersion: 1, dismissals: [] };

export class AdminOperationPresentationRepository {
  constructor({ presentationFile = resolveDataFile('adminOperationPresentation') } = {}) {
    this.presentationFile = presentationFile;
  }

  async listDismissals() {
    const data = await readJsonFile(this.presentationFile, FALLBACK);
    assertStore(data);
    return data.dismissals.map(item => structuredClone(item));
  }

  async dismiss(input) {
    return mutateJsonFile(this.presentationFile, FALLBACK, data => {
      assertStore(data);
      const existing = data.dismissals.find(item => item.operationId === input.operationId && item.restoredAt == null);
      if (existing) return { dismissal: structuredClone(existing), duplicate: true };
      const dismissal = {
        id: `opdismiss_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
        operationId: input.operationId,
        mediaType: input.mediaType,
        reason: input.reason,
        dismissedByUserId: input.actorUserId,
        dismissedAt: new Date().toISOString(),
        restoredAt: null,
        restoredByUserId: null
      };
      data.dismissals.push(dismissal);
      return { dismissal: structuredClone(dismissal), duplicate: false };
    });
  }

  async restore(operationId, actorUserId) {
    return mutateJsonFile(this.presentationFile, FALLBACK, data => {
      assertStore(data);
      const dismissal = [...data.dismissals].reverse().find(item => item.operationId === operationId && item.restoredAt == null);
      if (!dismissal) return null;
      dismissal.restoredAt = new Date().toISOString();
      dismissal.restoredByUserId = actorUserId;
      return structuredClone(dismissal);
    });
  }
}

function assertStore(data) {
  if (!data || !Array.isArray(data.dismissals)) throw new TypeError('Admin operation presentation data must contain dismissals.');
}

export const adminOperationPresentationRepository = new AdminOperationPresentationRepository();

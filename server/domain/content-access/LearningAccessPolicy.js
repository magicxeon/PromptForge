import { getLearningPolicy } from '../../config/learningPolicy.js';
import { LearningError } from './catalogContract.js';

function isAdmin(actor) {
  return typeof actor?.userId === 'string' && actor.userId.trim().length > 0
    && actor.userId !== 'anonymous_user' && actor.role === 'admin'
    && (actor.accountStatus === undefined || actor.accountStatus === 'active')
    && !actor.originalRequesterUserId;
}

export class LearningAccessPolicy {
  constructor({ readPolicy = getLearningPolicy } = {}) {
    this.readPolicy = readPolicy;
  }

  getConfig(actor) {
    const policy = this.readPolicy();
    return { ...policy, enabled: policy.enabled === true && isAdmin(actor) };
  }

  assertCatalogAccess(actor) {
    if (typeof actor?.userId !== 'string' || !actor.userId.trim() || actor.userId === 'anonymous_user') {
      throw new LearningError('learning_actor_required', 'An authenticated actor is required.', 401);
    }
    if (!isAdmin(actor)) {
      throw new LearningError('learning_admin_required', 'Learning catalog requires active Admin access.', 403);
    }
    if (this.readPolicy().enabled !== true) {
      throw new LearningError('learning_disabled', 'Learning catalog is disabled.', 403);
    }
    return actor;
  }

  purchase(actor) {
    this.assertCatalogAccess(actor);
    throw new LearningError('learning_billing_unavailable', 'Learning billing is not available.', 503);
  }
}

export const learningAccessPolicy = new LearningAccessPolicy();

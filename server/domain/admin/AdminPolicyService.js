import { assertActorContext, RepositoryContractError } from '../../repositories/repositoryContracts.js';

const BACKOFFICE_ROLES = new Set(['admin', 'support']);

export class AdminPolicyService {
  assertCanAccessBackoffice(actorContext) {
    const actor = assertActorContext(actorContext);
    if (!BACKOFFICE_ROLES.has(actor.role)) {
      throw new RepositoryContractError('admin_access_forbidden', 'Admin or support access is required.', 403);
    }
    return actor;
  }

  assertCanAdjustCredits(actorContext) {
    const actor = this.assertCanAccessBackoffice(actorContext);
    if (actor.role !== 'admin') {
      throw new RepositoryContractError('credit_adjustment_forbidden', 'Only admin can adjust credits.', 403);
    }
    return actor;
  }

  assertCanModerateCharacter(actorContext) {
    const actor = this.assertCanAccessBackoffice(actorContext);
    if (actor.role !== 'admin') {
      throw new RepositoryContractError(
        'character_moderation_forbidden',
        'Only admin can moderate Character Profiles.',
        403
      );
    }
    return actor;
  }

  assertCanManageAttributeCatalog(actorContext) {
    const actor = this.assertCanAccessBackoffice(actorContext);
    if (actor.role !== 'admin') {
      throw new RepositoryContractError(
        'attribute_catalog_mutation_forbidden',
        'Only admin can change the Attribute Catalog.',
        403
      );
    }
    return actor;
  }

  assertCanDismissOperation(actorContext) {
    const actor = this.assertCanAccessBackoffice(actorContext);
    if (actor.role !== 'admin') {
      throw new RepositoryContractError('admin_operation_dismiss_forbidden', 'Only admin can dismiss failed operations.', 403);
    }
    return actor;
  }

  assertCanChangeUserStatus(actorContext) {
    const actor = this.assertCanAccessBackoffice(actorContext);
    if (actor.role !== 'admin') {
      throw new RepositoryContractError('admin_user_status_forbidden', 'Only admin can change user status.', 403);
    }
    return actor;
  }

  requireReason(reason, action = 'This action') {
    const normalized = String(reason || '').trim();
    if (normalized.length < 3) {
      throw new RepositoryContractError('admin_reason_required', `${action} requires a meaningful reason.`, 400);
    }
    return normalized;
  }
}

export const adminPolicyService = new AdminPolicyService();

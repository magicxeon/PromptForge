import { mockUserRepo } from '../../repositories/identity/MockUserRepository.js';
import { auditService } from '../audit/AuditService.js';
import { adminPolicyService } from '../admin/AdminPolicyService.js';

const STATUSES = new Set(['active', 'suspended', 'disabled']);

export class AdminIdentityService {
  constructor({ userRepository = mockUserRepo, policy = adminPolicyService, audit = auditService } = {}) {
    this.userRepository = userRepository;
    this.policy = policy;
    this.audit = audit;
  }

  async changeStatus(input, actorContext, request = null) {
    const actor = this.policy.assertCanChangeUserStatus(actorContext);
    const userId = String(input.userId || '').trim();
    if (userId === actor.userId) throw identityError('admin_self_status_change_forbidden', 'Staff cannot change their own account status.', 409);
    const status = String(input.status || '').trim();
    if (!STATUSES.has(status)) throw identityError('admin_user_status_invalid', 'User status is invalid.', 400);
    const reason = this.policy.requireReason(input.reason, 'Changing user status');
    const idempotencyKey = String(input.idempotencyKey || '').trim();
    if (idempotencyKey.length < 8) throw identityError('admin_idempotency_key_required', 'A durable idempotency key is required.', 400);
    const result = await this.userRepository.updateStatus(userId, {
      status, expectedStatus: String(input.expectedStatus || '').trim() || null, idempotencyKey
    });
    if (!result.duplicate) {
      await this.audit.record({
        action: `identity.${status === 'active' ? 'reactivate' : 'suspend'}`,
        targetType: 'user', targetId: userId, reason,
        beforeSnapshot: { status: result.previousStatus }, afterSnapshot: { status }
      }, actor, request);
    }
    return { user: sanitizeUser(result.user), duplicate: result.duplicate, sessionHandling: 'mock_actor_refresh_required' };
  }
}

function sanitizeUser(user) {
  return { id: user.id, username: user.username, displayName: user.displayName, role: user.role, status: user.status, updatedAt: user.updatedAt || null };
}
function identityError(code, message, statusCode) { return Object.assign(new Error(message), { code, statusCode }); }
export const adminIdentityService = new AdminIdentityService();

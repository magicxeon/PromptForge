import { creditAccountRepo } from '../../repositories/credits/CreditAccountRepository.js';
import { adminPolicyService } from '../admin/AdminPolicyService.js';
import { auditService } from '../audit/AuditService.js';

export class CreditAdjustmentService {
  constructor({ accountRepository = creditAccountRepo, policy = adminPolicyService, audit = auditService } = {}) {
    this.accountRepository = accountRepository;
    this.policy = policy;
    this.audit = audit;
  }

  async adjust({ userId, deltaCredits, reason, idempotencyKey = null }, actorContext, request = null) {
    const actor = this.policy.assertCanAdjustCredits(actorContext);
    const normalizedReason = this.policy.requireReason(reason, 'Credit adjustment');
    const before = await this.accountRepository.getAccountByUserId(userId);
    const result = await this.accountRepository.adjustCredits({
      userId,
      deltaCredits,
      reason: normalizedReason,
      idempotencyKey,
      actorContext: actor
    });
    if (!result.duplicate) {
      await this.audit.record({
        action: 'credit.adjust',
        targetType: 'credit_account',
        targetId: userId,
        reason: normalizedReason,
        beforeSnapshot: before ? { availableCredits: before.availableCredits, reservedCredits: before.reservedCredits } : null,
        afterSnapshot: { availableCredits: result.account.availableCredits, reservedCredits: result.account.reservedCredits },
        requestId: request?.requestId || null
      }, actor, request);
    }
    return result;
  }
}

export const creditAdjustmentService = new CreditAdjustmentService();

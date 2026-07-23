import { creditAccountRepo } from '../../repositories/credits/CreditAccountRepository.js';
import { creditLedgerRepo } from '../../repositories/credits/CreditLedgerRepository.js';
import { mockUserRepo } from '../../repositories/identity/MockUserRepository.js';
import { CreditDomainError, createCreditError, CREDIT_ERROR_CODES } from './creditErrors.js';

export { CreditDomainError as CreditError };

export class CreditManager {
  constructor({
    accountRepo = creditAccountRepo,
    ledgerRepo = creditLedgerRepo,
    userRepo = mockUserRepo
  } = {}) {
    this.accountRepo = accountRepo;
    this.ledgerRepo = ledgerRepo;
    this.userRepo = userRepo;
  }

  async resolveUserId(usernameOrId) {
    if (!usernameOrId) return 'usr_demo';
    const user = await this.userRepo.findById(usernameOrId) || await this.userRepo.findByUsername(usernameOrId);
    return user ? user.id : usernameOrId;
  }

  async getUserInfo(usernameOrId) {
    try {
      const userId = await this.resolveUserId(usernameOrId);
      const account = await this.accountRepo.getAccountByUserId(userId);
      return {
        credits: account ? account.availableCredits : 0,
        reservedCredits: account ? account.reservedCredits : 0,
        role: 'user'
      };
    } catch {
      return { credits: 0, reservedCredits: 0, role: 'user' };
    }
  }

  async assertBalance(usernameOrId, amount) {
    const info = await this.getUserInfo(usernameOrId);
    if (info.credits < amount) {
      throw createCreditError(
        CREDIT_ERROR_CODES.INSUFFICIENT,
        `Insufficient credits. This operation requires ${amount} credit(s).`,
        402,
        { requiredCredits: amount, availableCredits: info.credits }
      );
    }
    return info;
  }

  async deduct(usernameOrId, amount = 1, metadata = {}) {
    const userId = await this.resolveUserId(usernameOrId);
    const res = await this.accountRepo.reserveCredits({
      userId,
      amountCredits: Math.abs(amount),
      requestId: metadata.requestId || `deduct_${Date.now()}`,
      jobId: metadata.jobId || null,
      metadata
    });

    const capRes = await this.accountRepo.captureReservation({
      userId,
      reservationId: res.reservation.reservationId,
      jobId: metadata.jobId || null,
      metadata
    });

    return capRes.account.availableCredits;
  }

  async refund(usernameOrId, amount = 1, metadata = {}) {
    const userId = await this.resolveUserId(usernameOrId);
    const res = await this.accountRepo.grantCredits({
      userId,
      amountCredits: Math.abs(amount),
      reason: metadata.reason || 'generation_refund',
      actorContext: { userId, isMockActor: true }
    });
    return res.account.availableCredits;
  }

  async refundLostJob(usernameOrId, jobId, metadata = {}) {
    const userId = await this.resolveUserId(usernameOrId);
    const netCosts = await this.ledgerRepo.getNetJobCosts([jobId]);
    const netCost = netCosts.get(jobId) || 0;

    if (netCost <= 0) {
      const account = await this.accountRepo.getAccountByUserId(userId);
      return { refunded: false, credits: account ? account.availableCredits : 0 };
    }

    const res = await this.accountRepo.grantCredits({
      userId,
      amountCredits: netCost,
      reason: 'lost_job_refund',
      actorContext: { userId, isMockActor: true }
    });

    return { refunded: true, amount: netCost, credits: res.account.availableCredits };
  }

  async recharge(usernameOrId, amount = 10) {
    const userId = await this.resolveUserId(usernameOrId);
    const res = await this.accountRepo.grantCredits({
      userId,
      amountCredits: amount,
      reason: 'recharge',
      actorContext: { userId }
    });
    return { credits: res.account.availableCredits, role: 'user' };
  }

  async getNetJobCosts(jobIds) {
    return this.ledgerRepo.getNetJobCosts(jobIds);
  }
}

export const creditManager = new CreditManager();

import { creditAccountRepo } from '../../repositories/credits/CreditAccountRepository.js';
import { creditLedgerRepo } from '../../repositories/credits/CreditLedgerRepository.js';
import { creditAdjustmentService } from './CreditAdjustmentService.js';
import { creditReservationService } from './CreditReservationService.js';

export class CreditApplicationService {
  constructor({
    reservationService = creditReservationService,
    adjustmentService = creditAdjustmentService,
    accountRepository = creditAccountRepo,
    ledgerRepository = creditLedgerRepo
  } = {}) {
    this.reservationService = reservationService;
    this.adjustmentService = adjustmentService;
    this.accountRepository = accountRepository;
    this.ledgerRepository = ledgerRepository;
  }

  get pricingPolicyService() {
    return this.reservationService.pricingPolicyService;
  }

  estimate(options) {
    return this.reservationService.estimate(options);
  }

  estimateVideo(options) {
    return this.reservationService.estimateVideo(options);
  }

  validateAndReserveForRequest(input) {
    return this.reservationService.validateAndReserveForRequest(input);
  }

  reservePlan(input) {
    return this.reservationService.reservePlan(input);
  }

  reserveGenerationGroup(input) {
    return this.reservationService.reserveGenerationGroup(input);
  }

  captureForJob(input) {
    return this.reservationService.captureForJob(input);
  }

  refundForJob(input) {
    return this.reservationService.refundForJob(input);
  }

  reconcileStartupOrphanReservations() {
    return this.reservationService.reconcileStartupOrphanReservations();
  }

  async getAccount(userId) {
    return (await this.accountRepository.getAccountByUserId(userId)) || {
      userId,
      availableCredits: 0,
      reservedCredits: 0,
      status: 'active'
    };
  }

  listLedger(userId, query = {}) {
    return this.ledgerRepository.findByUserId(userId, query);
  }

  grantMockCredits({ userId, amountCredits, idempotencyKey, actorContext }) {
    return this.accountRepository.grantCredits({
      userId,
      amountCredits,
      idempotencyKey,
      reason: 'mock_grant',
      actorContext
    });
  }

  rechargeLegacy({ userId, actorContext }) {
    return this.accountRepository.grantCredits({
      userId,
      amountCredits: 10,
      reason: 'recharge',
      actorContext
    });
  }

  adjust(input, actorContext, request = null) {
    return this.adjustmentService.adjust(input, actorContext, request);
  }
}

export const creditApplicationService = new CreditApplicationService();

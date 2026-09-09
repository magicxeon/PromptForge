import { creditAccountRepo } from '../../repositories/credits/CreditAccountRepository.js';
import { creditLedgerRepo } from '../../repositories/credits/CreditLedgerRepository.js';
import { creditAdjustmentService } from './CreditAdjustmentService.js';
import { creditReservationService } from './CreditReservationService.js';
import { calculateTextEnhancementPrice } from './TextEnhancementPricing.js';

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

  async quoteTextEnhancement(inputs) {
    return calculateTextEnhancementPrice(await this.pricingPolicyService.loadPolicy(), inputs);
  }

  reserveTextEnhancement({ userId, operationId, quote }) {
    return this.accountRepository.reserveCredits({
      userId, amountCredits: quote.totalCredits, estimateId: operationId,
      requestId: operationId, jobId: null, pricingSnapshot: structuredClone(quote),
      metadata: { kind: 'look_sheet_enhancement', operationId, expiresAt: quote.expiresAt,
        idempotencyKey: `reserve:${userId}:${operationId}` }
    });
  }

  async findTextEnhancementReservation(userId, operationId) {
    const data = await this.accountRepository.readRaw();
    return data.reservations.find(item => item.userId === userId
      && item.metadata?.kind === 'look_sheet_enhancement' && item.metadata.operationId === operationId) || null;
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

  reconcileStartupOrphanReservations(options) {
    return this.reservationService.reconcileStartupOrphanReservations(options);
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

  getFinanceLedger() {
    return this.accountRepository.readFinanceLedger();
  }

  async getOperationalSummary({ search = '', status = '', limit = 50 } = {}) {
    const data = await this.accountRepository.readRaw();
    const needle = String(search).trim().toLowerCase();
    const boundedLimit = Math.min(100, Math.max(1, Number(limit) || 50));
    const reservations = (data.reservations || []).filter(record =>
      (!status || record.status === status)
      && (!needle || [record.reservationId, record.userId, record.username, record.jobId, record.groupId]
        .filter(Boolean).some(value => String(value).toLowerCase().includes(needle)))
    ).slice(0, boundedLimit).map(record => ({
      reservationId: record.reservationId,
      userId: record.userId,
      username: record.username || null,
      status: record.status,
      amountCredits: Number(record.amountCredits || 0),
      jobId: record.jobId || null,
      groupId: record.groupId || null,
      expiresAt: record.expiresAt || null,
      createdAt: record.createdAt || null,
      updatedAt: record.updatedAt || null
    }));
    const counts = (data.reservations || []).reduce((result, record) => {
      const key = record.status || 'unknown';
      result[key] = (result[key] || 0) + 1;
      return result;
    }, {});
    return { generatedAt: new Date().toISOString(), counts, reservations, mutationAvailable: false };
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

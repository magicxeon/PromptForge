import { resolveDataFile } from '../../config/paths.js';
import { readJsonFile, mutateJsonFile } from '../json/jsonFileStore.js';
import { assertActorContext, RepositoryContractError } from '../repositoryContracts.js';
import { mockUserRepo } from '../identity/MockUserRepository.js';
import { createCreditError, CREDIT_ERROR_CODES } from '../../domain/credits/creditErrors.js';

const DB_FALLBACK = {
  schemaVersion: 2,
  accounts: [],
  estimates: [],
  reservations: [],
  ledgerEntries: []
};

export class CreditAccountRepository {
  constructor({
    databaseFile = resolveDataFile('database'),
    userRepository = mockUserRepo
  } = {}) {
    this.databaseFile = databaseFile;
    this.userRepository = userRepository;
  }

  async migrateLegacyDataIfNeeded(data) {
    if (!data || typeof data !== 'object') return DB_FALLBACK;
    const now = new Date().toISOString();
    data.schemaVersion = 2;
    data.accounts = Array.isArray(data.accounts) ? data.accounts : [];
    data.estimates = Array.isArray(data.estimates) ? data.estimates : [];
    data.reservations = Array.isArray(data.reservations) ? data.reservations : [];
    data.ledgerEntries = Array.isArray(data.ledgerEntries) ? data.ledgerEntries : [];

    // Migrate users map to accounts array
    if (data.users && typeof data.users === 'object') {
      for (const [username, legacyUser] of Object.entries(data.users)) {
        if (!legacyUser || typeof legacyUser !== 'object') continue;
        const userObj = await this.userRepository.findByUsername(username);
        const userId = userObj ? userObj.id : (legacyUser.userId || `usr_${username}`);

        const existingAcc = data.accounts.find(a => a.userId === userId || a.username === username);
        if (!existingAcc) {
          const available = Number(legacyUser.credits || 0);
          data.accounts.push({
            schemaVersion: 2,
            userId,
            username,
            availableCredits: available,
            reservedCredits: Number(legacyUser.reservedCredits || 0),
            status: 'active',
            lifetimeGrantedCredits: available + Number(legacyUser.lifetimePurchasedCredits || 0),
            lifetimeCapturedCredits: Number(legacyUser.lifetimeSpentCredits || 0),
            createdAt: legacyUser.createdAt || now,
            updatedAt: legacyUser.updatedAt || now
          });
        }
      }
    }

    // Migrate legacy creditLedger array
    if (Array.isArray(data.creditLedger)) {
      for (const entry of data.creditLedger) {
        if (!entry || typeof entry !== 'object') continue;
        const entryId = entry.id || `clg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        if (data.ledgerEntries.some(l => l.ledgerEntryId === entryId || l.id === entryId)) continue;

        let opType = entry.operationType || entry.type || 'adjustment';
        if (opType === 'generation_charge') opType = 'capture_legacy';
        else if (opType === 'generation_refund' || opType === 'lost_job_refund') opType = 'refund_legacy';
        else if (opType === 'recharge') opType = 'grant_legacy';

        const legacyUser = await this.userRepository.findById(entry.userId)
          || await this.userRepository.findByUsername(entry.username || 'user_demo');
        data.ledgerEntries.push({
          schemaVersion: 2,
          ledgerEntryId: entryId,
          userId: legacyUser?.id || entry.userId || `usr_${entry.username || 'demo'}`,
          username: legacyUser?.username || entry.username || 'user_demo',
          operationType: opType,
          amountCredits: Math.abs(Number(entry.amountCredits || entry.amount || 0)),
          balanceAfter: Number(entry.balanceAfter || 0),
          relatedJobId: entry.relatedJobId || entry.jobId || null,
          relatedTemplateId: entry.relatedTemplateId || null,
          providerId: entry.providerId || null,
          modelId: entry.modelId || null,
          pricingPolicyVersion: entry.pricingPolicyVersion || 'legacy',
          reasonCode: entry.reason || 'legacy_migration',
          idempotencyKey: entry.requestId ? `legacy:${entry.requestId}` : null,
          createdAt: typeof entry.createdAt === 'number' ? new Date(entry.createdAt).toISOString() : (entry.createdAt || now),
          metadata: entry.metadata || {}
        });
      }
    }

    return data;
  }

  async readRaw() {
    const raw = await readJsonFile(this.databaseFile, DB_FALLBACK);
    return mutateJsonFile(this.databaseFile, DB_FALLBACK, async data => {
      return this.migrateLegacyDataIfNeeded(data);
    });
  }

  async getAccountByUserId(userId) {
    if (!userId) return null;
    const data = await this.readRaw();
    const account = (data.accounts || []).find(a => a.userId === userId || a.username === userId);
    if (!account) {
      const user = await this.userRepository.findById(userId) || await this.userRepository.findByUsername(userId);
      if (!user) return null;
      return {
        schemaVersion: 2,
        userId: user.id,
        username: user.username,
        availableCredits: 0,
        reservedCredits: 0,
        status: 'active',
        lifetimeGrantedCredits: 0,
        lifetimeCapturedCredits: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }
    return structuredClone(account);
  }

  async findByUserId(userId) {
    return this.getAccountByUserId(userId);
  }

  async findByActor(actorContext) {
    const actor = assertActorContext(actorContext);
    return this.getAccountByUserId(actor.userId);
  }

  async saveEstimate(estimate) {
    if (!estimate?.estimateId || !estimate?.userId) {
      throw createCreditError(CREDIT_ERROR_CODES.ESTIMATE_NOT_FOUND, 'A complete estimate is required.', 400);
    }

    return mutateJsonFile(this.databaseFile, DB_FALLBACK, async data => {
      await this.migrateLegacyDataIfNeeded(data);
      const existingIndex = data.estimates.findIndex(item => item.estimateId === estimate.estimateId);
      if (existingIndex >= 0) data.estimates[existingIndex] = structuredClone(estimate);
      else data.estimates.push(structuredClone(estimate));
      return structuredClone(estimate);
    });
  }

  async getEstimateById(estimateId) {
    if (!estimateId) return null;
    const data = await this.readRaw();
    const estimate = (data.estimates || []).find(item => item.estimateId === estimateId);
    return estimate ? structuredClone(estimate) : null;
  }

  async reserveCredits({ userId, amountCredits, estimateId, requestId, jobId = null, pricingSnapshot = {}, relatedTemplateId = null, metadata = {} }) {
    const amount = Number(amountCredits);
    if (!Number.isInteger(amount) || amount <= 0) {
      throw createCreditError(CREDIT_ERROR_CODES.INSUFFICIENT, 'Reservation amount must be a positive integer.', 400);
    }

    if (!userId || !requestId) {
      throw createCreditError(CREDIT_ERROR_CODES.RESERVATION_CONFLICT, 'User and request IDs are required for a reservation.', 400);
    }
    const idempotencyKey = metadata.idempotencyKey || `reserve:${userId}:${requestId}`;
    const now = new Date().toISOString();

    return mutateJsonFile(this.databaseFile, DB_FALLBACK, async data => {
      await this.migrateLegacyDataIfNeeded(data);

      // Check idempotency
      const existingLedger = (data.ledgerEntries || []).find(l => l.idempotencyKey === idempotencyKey);
      if (existingLedger) {
        const reservation = (data.reservations || []).find(r => r.reservationId === existingLedger.reservationId);
        const account = (data.accounts || []).find(a => a.userId === userId);
        if (!reservation || reservation.userId !== userId || reservation.amountCredits !== amount || (reservation.estimateId || null) !== (estimateId || null)) {
          throw createCreditError(CREDIT_ERROR_CODES.ESTIMATE_STALE, 'Reservation idempotency key conflicts with a different request.', 409);
        }
        return { account: structuredClone(account), reservation: structuredClone(reservation), ledgerEntry: structuredClone(existingLedger) };
      }

      let account = (data.accounts || []).find(a => a.userId === userId);
      if (!account) {
        const userObj = await this.userRepository.findById(userId);
        account = {
          schemaVersion: 2,
          userId,
          username: userObj ? userObj.username : userId,
          availableCredits: 0,
          reservedCredits: 0,
          status: 'active',
          lifetimeGrantedCredits: 0,
          lifetimeCapturedCredits: 0,
          createdAt: now,
          updatedAt: now
        };
        data.accounts.push(account);
      }

      if (account.status !== 'active') {
        throw createCreditError(CREDIT_ERROR_CODES.INSUFFICIENT, 'Credit account is not active.', 403);
      }

      if (account.availableCredits < amount) {
        throw createCreditError(CREDIT_ERROR_CODES.INSUFFICIENT, 'Insufficient credits for reservation.', 402, {
          requiredCredits: amount,
          availableCredits: account.availableCredits
        });
      }

      // Balance mutation
      account.availableCredits -= amount;
      account.reservedCredits += amount;
      account.updatedAt = now;

      const reservationId = `rsv_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const reservation = {
        schemaVersion: 1,
        reservationId,
        estimateId: estimateId || null,
        userId,
        requestId: requestId || null,
        jobId: jobId || null,
        amountCredits: amount,
        status: 'reserved',
        pricingSnapshot,
        relatedTemplateId,
        createdAt: now,
        updatedAt: now,
        expiresAt: metadata.expiresAt || new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        capturedAt: null,
        refundedAt: null,
        terminalReason: null
      };
      data.reservations.push(reservation);

      const ledgerEntry = {
        schemaVersion: 2,
        ledgerEntryId: `clg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        userId,
        operationType: 'reserve',
        amountCredits: amount,
        availableDelta: -amount,
        reservedDelta: amount,
        availableAfter: account.availableCredits,
        reservedAfter: account.reservedCredits,
        reservationId,
        estimateId: estimateId || null,
        relatedJobId: jobId || null,
        relatedTemplateId,
        providerId: pricingSnapshot.providerId || metadata.providerId || null,
        modelId: pricingSnapshot.modelId || metadata.modelId || null,
        pricingPolicyVersion: pricingSnapshot.pricingPolicyVersion || 'mock-2026-07-18-v1',
        idempotencyKey,
        reasonCode: 'generation_reserved',
        actorUserId: userId,
        createdAt: now,
        metadata
      };
      data.ledgerEntries.push(ledgerEntry);

      return {
        account: structuredClone(account),
        reservation: structuredClone(reservation),
        ledgerEntry: structuredClone(ledgerEntry)
      };
    });
  }

  async captureReservation({ userId, reservationId, jobId = null, idempotencyKey = null, metadata = {} }) {
    const key = idempotencyKey || `capture:${reservationId || jobId}`;
    const now = new Date().toISOString();

    return mutateJsonFile(this.databaseFile, DB_FALLBACK, async data => {
      await this.migrateLegacyDataIfNeeded(data);

      const existingLedger = (data.ledgerEntries || []).find(l => l.idempotencyKey === key);
      if (existingLedger) {
        const account = (data.accounts || []).find(a => a.userId === userId);
        const reservation = (data.reservations || []).find(r => r.reservationId === (reservationId || existingLedger.reservationId));
        return { account: structuredClone(account), reservation: structuredClone(reservation), ledgerEntry: structuredClone(existingLedger) };
      }

      const reservation = (data.reservations || []).find(r =>
        (reservationId && r.reservationId === reservationId) || (jobId && r.jobId === jobId)
      );

      if (!reservation) {
        throw createCreditError(CREDIT_ERROR_CODES.RESERVATION_NOT_FOUND, 'Reservation not found for capture.', 404);
      }

      if (reservation.userId !== userId) {
        throw createCreditError(CREDIT_ERROR_CODES.RESERVATION_NOT_FOUND, 'Reservation does not belong to this user.', 403);
      }

      if (reservation.status === 'captured') {
        const account = (data.accounts || []).find(a => a.userId === reservation.userId);
        return { account: structuredClone(account), reservation: structuredClone(reservation), duplicate: true };
      }

      if (reservation.status !== 'reserved') {
        throw createCreditError(CREDIT_ERROR_CODES.OPERATION_ALREADY_SETTLED, `Reservation is in terminal state '${reservation.status}'.`, 400);
      }

      const account = (data.accounts || []).find(a => a.userId === reservation.userId);
      if (!account) {
        throw createCreditError(CREDIT_ERROR_CODES.ACCOUNT_NOT_FOUND, 'Credit account not found.', 404);
      }

      const amount = reservation.amountCredits;
      if (account.reservedCredits < amount) {
        throw createCreditError(CREDIT_ERROR_CODES.OPERATION_ALREADY_SETTLED, 'Reserved credit balance is inconsistent.', 409);
      }
      account.reservedCredits -= amount;
      account.lifetimeCapturedCredits = (account.lifetimeCapturedCredits || 0) + amount;
      account.updatedAt = now;

      reservation.status = 'captured';
      reservation.capturedAt = now;
      reservation.updatedAt = now;
      if (jobId) reservation.jobId = jobId;

      const ledgerEntry = {
        schemaVersion: 2,
        ledgerEntryId: `clg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        userId: reservation.userId,
        operationType: 'capture',
        amountCredits: amount,
        availableDelta: 0,
        reservedDelta: -amount,
        availableAfter: account.availableCredits,
        reservedAfter: account.reservedCredits,
        reservationId: reservation.reservationId,
        estimateId: reservation.estimateId,
        relatedJobId: jobId || reservation.jobId,
        relatedTemplateId: reservation.relatedTemplateId,
        providerId: reservation.pricingSnapshot?.providerId || null,
        modelId: reservation.pricingSnapshot?.modelId || null,
        pricingPolicyVersion: reservation.pricingSnapshot?.pricingPolicyVersion || 'mock-2026-07-18-v1',
        idempotencyKey: key,
        reasonCode: 'generation_captured',
        actorUserId: userId,
        createdAt: now,
        metadata
      };
      data.ledgerEntries.push(ledgerEntry);

      return {
        account: structuredClone(account),
        reservation: structuredClone(reservation),
        ledgerEntry: structuredClone(ledgerEntry)
      };
    });
  }

  async refundReservation({ userId, reservationId, jobId = null, reasonCode = 'technical_failure', idempotencyKey = null, metadata = {} }) {
    const key = idempotencyKey || `refund:${reservationId || jobId}:${reasonCode}`;
    const now = new Date().toISOString();

    return mutateJsonFile(this.databaseFile, DB_FALLBACK, async data => {
      await this.migrateLegacyDataIfNeeded(data);

      const existingLedger = (data.ledgerEntries || []).find(l => l.idempotencyKey === key);
      if (existingLedger) {
        const account = (data.accounts || []).find(a => a.userId === userId);
        const reservation = (data.reservations || []).find(r => r.reservationId === (reservationId || existingLedger.reservationId));
        return { account: structuredClone(account), reservation: structuredClone(reservation), ledgerEntry: structuredClone(existingLedger) };
      }

      const reservation = (data.reservations || []).find(r =>
        (reservationId && r.reservationId === reservationId) || (jobId && r.jobId === jobId)
      );

      if (!reservation) {
        throw createCreditError(CREDIT_ERROR_CODES.RESERVATION_NOT_FOUND, 'Reservation not found for refund.', 404);
      }

      if (reservation.userId !== userId) {
        throw createCreditError(CREDIT_ERROR_CODES.RESERVATION_NOT_FOUND, 'Reservation does not belong to this user.', 403);
      }

      if (reservation.status === 'refunded') {
        const account = (data.accounts || []).find(a => a.userId === reservation.userId);
        return { account: structuredClone(account), reservation: structuredClone(reservation), duplicate: true };
      }

      if (reservation.status !== 'reserved') {
        throw createCreditError(CREDIT_ERROR_CODES.OPERATION_ALREADY_SETTLED, `Reservation is in terminal state '${reservation.status}' and cannot be refunded.`, 400);
      }

      const account = (data.accounts || []).find(a => a.userId === reservation.userId);
      if (!account) {
        throw createCreditError(CREDIT_ERROR_CODES.ACCOUNT_NOT_FOUND, 'Credit account not found.', 404);
      }

      const amount = reservation.amountCredits;
      if (account.reservedCredits < amount) {
        throw createCreditError(CREDIT_ERROR_CODES.OPERATION_ALREADY_SETTLED, 'Reserved credit balance is inconsistent.', 409);
      }
      account.reservedCredits -= amount;
      account.availableCredits += amount;
      account.updatedAt = now;

      reservation.status = 'refunded';
      reservation.refundedAt = now;
      reservation.terminalReason = reasonCode;
      reservation.updatedAt = now;
      if (jobId) reservation.jobId = jobId;

      const ledgerEntry = {
        schemaVersion: 2,
        ledgerEntryId: `clg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        userId: reservation.userId,
        operationType: 'refund',
        amountCredits: amount,
        availableDelta: amount,
        reservedDelta: -amount,
        availableAfter: account.availableCredits,
        reservedAfter: account.reservedCredits,
        reservationId: reservation.reservationId,
        estimateId: reservation.estimateId,
        relatedJobId: jobId || reservation.jobId,
        relatedTemplateId: reservation.relatedTemplateId,
        providerId: reservation.pricingSnapshot?.providerId || null,
        modelId: reservation.pricingSnapshot?.modelId || null,
        pricingPolicyVersion: reservation.pricingSnapshot?.pricingPolicyVersion || 'mock-2026-07-18-v1',
        idempotencyKey: key,
        reasonCode,
        actorUserId: userId,
        createdAt: now,
        metadata
      };
      data.ledgerEntries.push(ledgerEntry);

      return {
        account: structuredClone(account),
        reservation: structuredClone(reservation),
        ledgerEntry: structuredClone(ledgerEntry)
      };
    });
  }

  async grantCredits({ userId, amountCredits, idempotencyKey = null, reason = 'mock_grant', actorContext = null }) {
    const amount = Number(amountCredits);
    if (!Number.isInteger(amount) || amount <= 0) {
      throw createCreditError(CREDIT_ERROR_CODES.INSUFFICIENT, 'Grant amount must be a positive integer.', 400);
    }

    if (!actorContext?.isMockActor && !['admin', 'support'].includes(actorContext?.role)) {
      throw createCreditError(CREDIT_ERROR_CODES.MOCK_GRANT_FORBIDDEN, 'Credit grants require an authorized mock, support, or admin actor.', 403);
    }

    const key = idempotencyKey || `grant:${userId}:${Date.now()}`;
    const now = new Date().toISOString();

    return mutateJsonFile(this.databaseFile, DB_FALLBACK, async data => {
      await this.migrateLegacyDataIfNeeded(data);

      const existingLedger = (data.ledgerEntries || []).find(l => l.idempotencyKey === key);
      if (existingLedger) {
        const account = (data.accounts || []).find(a => a.userId === userId);
        return { account: structuredClone(account), ledgerEntry: structuredClone(existingLedger) };
      }

      let account = (data.accounts || []).find(a => a.userId === userId);
      if (!account) {
        const userObj = await this.userRepository.findById(userId);
        account = {
          schemaVersion: 2,
          userId,
          username: userObj ? userObj.username : userId,
          availableCredits: 0,
          reservedCredits: 0,
          status: 'active',
          lifetimeGrantedCredits: 0,
          lifetimeCapturedCredits: 0,
          createdAt: now,
          updatedAt: now
        };
        data.accounts.push(account);
      }

      account.availableCredits += amount;
      account.lifetimeGrantedCredits = (account.lifetimeGrantedCredits || 0) + amount;
      account.updatedAt = now;

      const ledgerEntry = {
        schemaVersion: 2,
        ledgerEntryId: `clg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        userId,
        operationType: 'grant',
        amountCredits: amount,
        availableDelta: amount,
        reservedDelta: 0,
        availableAfter: account.availableCredits,
        reservedAfter: account.reservedCredits,
        idempotencyKey: key,
        reasonCode: reason,
        actorUserId: actorContext?.userId || userId,
        createdAt: now,
        metadata: {}
      };
      data.ledgerEntries.push(ledgerEntry);

      return {
        account: structuredClone(account),
        ledgerEntry: structuredClone(ledgerEntry)
      };
    });
  }

  async adjustCredits({ userId, deltaCredits, reason, idempotencyKey = null, actorContext }) {
    const actor = assertActorContext(actorContext);
    const delta = Number(deltaCredits);
    if (!Number.isInteger(delta) || delta === 0) {
      throw createCreditError(CREDIT_ERROR_CODES.ADJUSTMENT_INVALID, 'Credit adjustment must be a non-zero integer.', 400);
    }
    if (actor.role !== 'admin') {
      throw createCreditError(CREDIT_ERROR_CODES.ADJUSTMENT_FORBIDDEN, 'Manual credit adjustments require an admin actor.', 403);
    }
    const reasonCode = String(reason || '').trim();
    if (reasonCode.length < 3) {
      throw createCreditError(CREDIT_ERROR_CODES.ADJUSTMENT_INVALID, 'A meaningful adjustment reason is required.', 400);
    }

    const key = idempotencyKey || `admin-adjust:${actor.userId}:${userId}:${Date.now()}`;
    const now = new Date().toISOString();
    return mutateJsonFile(this.databaseFile, DB_FALLBACK, async data => {
      await this.migrateLegacyDataIfNeeded(data);
      const existingLedger = (data.ledgerEntries || []).find(entry => entry.idempotencyKey === key);
      if (existingLedger) {
        const account = (data.accounts || []).find(entry => entry.userId === userId);
        return { account: structuredClone(account), ledgerEntry: structuredClone(existingLedger), duplicate: true };
      }

      let account = (data.accounts || []).find(entry => entry.userId === userId);
      if (!account) {
        const user = await this.userRepository.findById(userId);
        if (!user) throw createCreditError(CREDIT_ERROR_CODES.ACCOUNT_NOT_FOUND, 'Credit account user was not found.', 404);
        account = {
          schemaVersion: 2,
          userId: user.id,
          username: user.username,
          availableCredits: 0,
          reservedCredits: 0,
          status: 'active',
          lifetimeGrantedCredits: 0,
          lifetimeCapturedCredits: 0,
          createdAt: now,
          updatedAt: now
        };
        data.accounts.push(account);
      }

      if (account.status !== 'active') {
        throw createCreditError(CREDIT_ERROR_CODES.INSUFFICIENT, 'Credit account is not active.', 403);
      }
      if (delta < 0 && account.availableCredits < Math.abs(delta)) {
        throw createCreditError(CREDIT_ERROR_CODES.INSUFFICIENT, 'Credit adjustment would make the available balance negative.', 409);
      }

      account.availableCredits += delta;
      if (delta > 0) account.lifetimeGrantedCredits = (account.lifetimeGrantedCredits || 0) + delta;
      account.updatedAt = now;
      const ledgerEntry = {
        schemaVersion: 2,
        ledgerEntryId: `clg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        userId: account.userId,
        operationType: 'manual_adjustment',
        amountCredits: Math.abs(delta),
        availableDelta: delta,
        reservedDelta: 0,
        availableAfter: account.availableCredits,
        reservedAfter: account.reservedCredits,
        idempotencyKey: key,
        reasonCode,
        actorUserId: actor.userId,
        createdAt: now,
        metadata: { adjustmentDirection: delta > 0 ? 'credit' : 'debit' }
      };
      data.ledgerEntries.push(ledgerEntry);
      return { account: structuredClone(account), ledgerEntry: structuredClone(ledgerEntry), duplicate: false };
    });
  }

  // Deprecated backward compatibility adapter method
  async updateBalance(userId, deltaCredits, operationType, metadata = {}, actorContext) {
    const amount = Number(deltaCredits);
    if (operationType === 'generation_charge' || amount < 0) {
      const absAmount = Math.abs(amount);
      const res = await this.reserveCredits({
        userId,
        amountCredits: absAmount,
        metadata: { ...metadata, requestId: metadata.requestId || `legacy_${Date.now()}` }
      });
      await this.captureReservation({
        userId,
        reservationId: res.reservation.reservationId,
        metadata
      });
      return this.getAccountByUserId(userId);
    }

    if (operationType === 'recharge' || operationType === 'generation_refund' || operationType === 'lost_job_refund') {
      await this.grantCredits({
        userId,
        amountCredits: Math.abs(amount),
        reason: operationType,
        actorContext
      });
      return this.getAccountByUserId(userId);
    }

    return this.getAccountByUserId(userId);
  }
}

export const creditAccountRepo = new CreditAccountRepository();

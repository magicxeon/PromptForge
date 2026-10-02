import { createHash, randomUUID } from 'node:crypto';
import { promptEnhancementRepository } from '../../repositories/generation/PromptEnhancementRepository.js';
import { creditApplicationService } from '../credits/CreditApplicationService.js';

const error = (code, message, statusCode = 409, details = {}) => Object.assign(new Error(message), { code, statusCode, details });
export const writingFingerprint = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

// Generation owns durable execution receipts; Credits remains the only money owner.
export class CinematicWritingOperationService {
  constructor({ repository = promptEnhancementRepository, credits = creditApplicationService } = {}) {
    this.repository = repository;
    this.credits = credits;
  }

  async quote({ userId, projectId, operation, request, source, model, maxOutputTokens }) {
    const quote = await this.credits.quoteWriting({ operation, model, maxOutputTokens,
      inputBytes: Buffer.byteLength(JSON.stringify({ request, source }), 'utf8') });
    const record = { id: `cw_${randomUUID()}`, kind: 'cinematic_text', userId, projectId, operation,
      requestFingerprint: writingFingerprint(request), fingerprint: writingFingerprint({ request, source }),
      status: 'quoted', quote, createdAt: new Date().toISOString(),
      artifactExpiresAt: new Date(Date.now() + 7 * 86400000).toISOString() };
    await this.repository.insert(record);
    return this.publicRecord(record);
  }

  async execute({ userId, projectId, operation, id, request, loadSource, run }) {
    const record = id ? await this.repository.get(id, userId) : null;
    if (!record || record.kind !== 'cinematic_text' || record.projectId !== projectId || record.operation !== operation
      || record.requestFingerprint !== writingFingerprint(request)) {
      throw error('cinematic_writing_quote_required', 'Confirm a current writing Credit quote before requesting AI.', 409);
    }
    if (record.status === 'succeeded' || record.status === 'delivered') {
      const settled = record.status === 'delivered' ? await this.settle(record) : record;
      return this.result(settled);
    }
    if (record.status !== 'quoted') throw error('cinematic_writing_processing',
      'This writing operation has already been accepted. Check its status instead of submitting another AI request.', 409,
      { operationId: record.id, status: record.status });
    const source = await loadSource();
    const { record: claimed, claimed: accepted } = await this.repository.claim(id, userId, writingFingerprint({ request, source }));
    if (!accepted) throw error('cinematic_writing_processing', 'This writing operation is already processing.', 409, { operationId: id });
    let operationRecord = claimed;
    try {
      const reserved = await this.credits.reserveWriting({ userId, operationId: id, quote: claimed.quote });
      operationRecord = await this.repository.update(id, userId, { status: 'dispatching', reservationId: reserved.reservation.reservationId });
    } catch (cause) {
      await this.fail(operationRecord, cause.code || 'cinematic_writing_reservation_failed');
      throw cause;
    }
    let result;
    try {
      const assertSource = async () => {
        const currentSource = await loadSource();
        if (writingFingerprint({ request, source: currentSource }) !== claimed.fingerprint) {
          throw error('cinematic_writing_source_changed', 'Writing context changed. Review a new Credit quote before generating.', 409);
        }
      };
      await assertSource();
      result = await run({ beforeDispatch: assertSource });
      if (!result || typeof result !== 'object' || Array.isArray(result)) {
        throw error('cinematic_writing_invalid_result', 'Writing returned no usable result.', 502);
      }
    } catch (cause) {
      await this.fail(operationRecord, cause.code || 'cinematic_writing_failed');
      throw cause;
    }
    if (result.status === 'blocked' && result.provenance == null) {
      await this.fail(operationRecord, 'cinematic_writing_preflight_blocked');
      return { ...result, billingStatus: 'free', chargedCredits: 0, writingOperationId: id };
    }
    // Never refund a usable result just because receipt/capture persistence failed.
    try {
      operationRecord = await this.repository.update(id, userId, { status: 'delivered', result,
        usage: result?.provenance?.usage || result?.proposal?.provenance?.usage
          || result?.chapterOutline?.provenance?.usage || null });
    } catch {
      throw error('cinematic_writing_reconciliation_required', 'The writing result needs recovery. Do not generate again.', 503, { operationId: id });
    }
    return this.result(await this.settle(operationRecord));
  }

  async settle(record) {
    try {
      await this.credits.captureForJob({ userId: record.userId, reservationId: record.reservationId,
        metadata: { kind: 'cinematic_text', operationId: record.id, operation: record.operation,
          usage: record.usage || null, costBasis: record.quote.costBasis,
          estimatedProviderCostUsd: record.quote.providerCostUsd } });
      return await this.repository.update(record.id, record.userId, { status: 'succeeded' });
    } catch { return record; }
  }

  async fail(record, errorCode) {
    const reservation = await this.credits.findWritingReservation(record.userId, record.id);
    const pending = await this.repository.update(record.id, record.userId, { status: 'refund_pending', errorCode,
      reservationId: reservation?.reservationId || record.reservationId || null });
    try {
      if (pending.reservationId) await this.credits.refundForJob({ userId: record.userId, reservationId: pending.reservationId,
        reasonCode: 'cinematic_writing_failed', metadata: { kind: 'cinematic_text', operationId: record.id } });
      return await this.repository.update(record.id, record.userId, { status: 'failed' });
    } catch { return pending; }
  }

  async recover() {
    for (const record of await this.repository.listUnsettled('cinematic_text')) {
      if (record.status === 'delivered') await this.settle(record);
      else if (record.status === 'refund_pending' || record.status === 'accepted') await this.fail(record, record.errorCode || 'cinematic_writing_interrupted');
      else if (record.status === 'dispatching') await this.repository.update(record.id, record.userId,
        { status: 'reconciliation_required', errorCode: 'cinematic_writing_interrupted_after_dispatch' });
    }
  }

  async read(id, userId, projectId) {
    let record = await this.repository.get(id, userId);
    if (!record || record.kind !== 'cinematic_text' || record.projectId !== projectId) {
      throw error('cinematic_writing_not_found', 'Writing operation not found.', 404);
    }
    if (record.status === 'delivered') record = await this.settle(record);
    if (record.status === 'refund_pending') record = await this.fail(record, record.errorCode);
    return this.publicRecord(record);
  }

  result(record) {
    if (Date.parse(record.artifactExpiresAt) <= Date.now() || !record.result) {
      throw error('cinematic_writing_result_expired', 'The writing recovery result has expired.', 410);
    }
    return { ...record.result, billingStatus: record.status === 'succeeded' ? 'paid' : 'settlement_pending',
      writingOperationId: record.id, chargedCredits: record.status === 'succeeded' ? record.quote.totalCredits : 0 };
  }

  publicRecord(record) {
    return { id: record.id, operation: record.operation, status: record.status,
      billingStatus: 'paid', credits: record.quote.totalCredits, expiresAt: record.quote.expiresAt,
      artifactExpiresAt: record.artifactExpiresAt, errorCode: record.errorCode || null,
      ...(['succeeded', 'delivered'].includes(record.status) && Date.parse(record.artifactExpiresAt) > Date.now() && record.result
        ? { result: this.result(record) } : {}) };
  }
}
export const cinematicWritingOperationService = new CinematicWritingOperationService();

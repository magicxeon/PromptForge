import { randomUUID } from 'node:crypto';
import { promptEnhancementRepository } from '../../repositories/generation/PromptEnhancementRepository.js';
import { creditApplicationService } from '../credits/CreditApplicationService.js';
import { promptRefinementService } from './PromptRefinementService.js';
import { prepareEnhancementInput, validateEnhancementResult, hashEnhancement, enhancementRecipeVersion } from './lookSheetEnhancementPrompt.js';

const failure = (code, statusCode = 409) => Object.assign(new Error('Look Sheet enhancement is unavailable or changed.'), { code, statusCode });
export class LookSheetEnhancementService {
  constructor({ repository = promptEnhancementRepository, credits = creditApplicationService, refiner = promptRefinementService } = {}) {
    this.repository = repository; this.credits = credits; this.refiner = refiner;
  }
  async quote({ userId, snapshot, originalPrompt }) {
    const prepared = prepareEnhancementInput(snapshot, originalPrompt);
    const policy = this.refiner.getLookSheetPolicy();
    const quote = await this.credits.quoteTextEnhancement({ ...policy, inputTokenBudget: prepared.inputTokenBudget });
    const record = { id: `enh_${randomUUID()}`, userId, fingerprint: prepared.sourceFingerprint,
      status: 'quoted', quote, snapshot, originalPrompt, recipeVersion: enhancementRecipeVersion,
      policy: { provider: policy.provider, model: policy.model, maxOutputTokens: policy.maxOutputTokens, reasoningEffort: policy.reasoningEffort },
      createdAt: new Date().toISOString(), artifactExpiresAt: new Date(Date.now() + 30 * 86400000).toISOString() };
    await this.repository.insert(record);
    return this.publicRecord(record);
  }
  async execute({ userId, id, snapshot, originalPrompt }) {
    const prepared = prepareEnhancementInput(snapshot, originalPrompt);
    const { record, claimed } = await this.repository.claim(id, userId, prepared.sourceFingerprint);
    if (!claimed) return this.publicRecord(record);
    let operation = record;
    try {
      const reserved = await this.credits.reserveTextEnhancement({ userId, operationId: id, quote: record.quote });
      operation = await this.repository.update(id, userId, { status: 'dispatching', reservationId: reserved.reservation.reservationId });
      const result = await this.refiner.enhanceLookSheet(prepared.input, record.policy);
      const prompt = validateEnhancementResult(result, prepared, originalPrompt);
      operation = await this.repository.update(id, userId, { status: 'delivered', prompt,
        usage: safeUsage(result.usage), responseId: typeof result.responseId === 'string' ? result.responseId.slice(0, 200) : null });
    } catch (error) {
      // Capture failures are handled below, never converted into an automatic refund.
      return this.fail(operation, error.code || 'enhancement_failed');
    }
    return this.settle(operation);
  }
  async settle(record) {
    try {
      await this.credits.captureForJob({ userId: record.userId, reservationId: record.reservationId,
        metadata: { kind: 'look_sheet_enhancement', operationId: record.id, ...costEvidence(record) } });
      return this.publicRecord(await this.repository.update(record.id, record.userId, { status: 'succeeded' }));
    } catch {
      return this.publicRecord(record); // Durable delivered state can be reconciled without another AI call.
    }
  }
  async fail(record, errorCode) {
    const reservation = await this.credits.findTextEnhancementReservation(record.userId, record.id);
    record = await this.repository.update(record.id, record.userId, { status: 'refund_pending', errorCode,
      reservationId: reservation?.reservationId || record.reservationId || null });
    try {
      if (record.reservationId) await this.credits.refundForJob({ userId: record.userId,
        reservationId: record.reservationId, reasonCode: 'enhancement_failed',
        metadata: { kind: 'look_sheet_enhancement', operationId: record.id, providerCostStatus: 'unknown' } });
      return this.publicRecord(await this.repository.update(record.id, record.userId, { status: 'failed', prompt: null }));
    } catch { return this.publicRecord(record); }
  }
  async recover() {
    for (const record of await this.repository.listUnsettled()) {
      if (record.status === 'delivered') await this.settle(record);
      else await this.fail(record, record.errorCode || 'enhancement_interrupted');
    }
  }
  async read(id, userId) {
    const record = await this.repository.get(id, userId);
    if (!record) throw failure('enhancement_not_found', 404);
    if (record.status === 'delivered') return this.settle(record);
    if (record.status === 'refund_pending') return this.fail(record, record.errorCode || 'enhancement_failed');
    return this.publicRecord(record);
  }
  async resolve(id, userId, snapshot, originalPrompt) {
    const record = await this.repository.get(id, userId);
    if (!record || record.status !== 'succeeded' || !record.prompt || Date.parse(record.artifactExpiresAt) <= Date.now()
      || record.fingerprint !== prepareEnhancementInput(snapshot, originalPrompt).sourceFingerprint) throw failure('enhancement_stale');
    return { prompt: record.prompt, id: record.id, recipeVersion: record.recipeVersion,
      fingerprint: hashEnhancement({ source: snapshot.fingerprint, artifact: record.id, prompt: record.prompt }) };
  }
  publicRecord(record) {
    const expired = Date.parse(record.artifactExpiresAt) <= Date.now();
    return { id: record.id, status: expired && record.status === 'succeeded' ? 'expired' : record.status,
      credits: record.quote.totalCredits, expiresAt: record.quote.expiresAt, artifactExpiresAt: record.artifactExpiresAt,
      errorCode: record.errorCode || null,
      originalPrompt: record.status === 'succeeded' && !expired ? record.originalPrompt || null : null,
      prompt: record.status === 'succeeded' && !expired ? record.prompt || null : null };
  }
}
function safeUsage(usage) {
  if (!usage || ![usage.input_tokens, usage.output_tokens].every(value => Number.isSafeInteger(value) && value >= 0)) return null;
  return { inputTokens: usage.input_tokens, outputTokens: usage.output_tokens };
}
function costEvidence(record) {
  const rate = record.quote.providerRate;
  return { usage: record.usage || null, providerResponseId: record.responseId || null,
    providerRateVersion: rate.version, estimatedCostUsd: record.quote.providerCostUsd,
    providerCostStatus: record.usage ? 'uncached_rate_upper_cost' : 'unknown',
    providerCostUsd: record.usage ? (record.usage.inputTokens * rate.inputUsdPerMillion
      + record.usage.outputTokens * rate.outputUsdPerMillion) / 1e6 : null };
}
export const lookSheetEnhancementService = new LookSheetEnhancementService();

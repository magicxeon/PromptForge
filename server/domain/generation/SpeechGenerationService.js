import { randomUUID } from 'node:crypto';
import { SpeechOperationRepository } from '../../repositories/generation/SpeechOperationRepository.js';
import { loadSpeechCatalog, assertSpeechAvailable } from './SpeechCatalog.js';
import { compileSpeechRequest, compileVoiceDesign, speechError } from './SpeechRequestCompiler.js';
import { creditApplicationService } from '../credits/CreditApplicationService.js';
import { queueManager } from './QueueManager.js';
import { GeminiSpeechProvider } from '../../providers/GeminiSpeechProvider.js';
import { SeedSpeechProvider } from '../../providers/SeedSpeechProvider.js';
import { AudioAssetService } from '../assets/AudioAssetService.js';
export class SpeechGenerationService {
  constructor({ repository = new SpeechOperationRepository(), credits = creditApplicationService, queue = queueManager,
    provider = new GeminiSpeechProvider(), seedProvider = new SeedSpeechProvider(), assets = new AudioAssetService(), catalog = loadSpeechCatalog, available = assertSpeechAvailable } = {}) {
    Object.assign(this, { repository, credits, queue, provider, seedProvider, assets, loadCatalog: catalog, available });
  }
  catalog() { return this.loadCatalog(); }
  publicCatalog() {
    const catalog = this.catalog();
    return { ...catalog, models: catalog.models.map(model => {
      try {
        this.available(model);
        return { ...model, available: model.enabled };
      } catch (error) {
        return { ...model, available:false, unavailableReason:error.code || 'speech_provider_unavailable' };
      }
    }) };
  }
  actor(actor) { if (!actor?.userId) throw speechError('actor_required', 401); }
  publicRecord(record) {
    const { id, status, snapshot, outputAssetId = null, outputUrl = null, durationMs = null, errorCode = null, createdAt } = record;
    return { id, status, snapshot, outputAssetId, outputUrl, durationMs, errorCode, createdAt, ...(record.timing ? {timing:record.timing} : {}),
      operation: record.operation || 'speech', expiresAt: record.voiceExpiresAt || null, deletedAt: record.voiceDeletedAt || null };
  }
  connectionId() { return this.provider.connectionId(); }
  async prepare(actor, snapshot, operation) {
    if (operation === 'voice_design') return compileVoiceDesign(snapshot, this.catalog());
    let customVoice;
    if (snapshot?.voiceKind === 'custom') {
      customVoice = await this.repository.get(snapshot.customVoiceOperationId, actor.userId);
      if (!customVoice || customVoice.operation !== 'voice_design' || customVoice.status !== 'succeeded'
        || customVoice.voiceDeletedAt || customVoice.voiceDeletePending || customVoice.providerConnectionId !== this.connectionId()
        || (customVoice.voiceExpiresAt && Date.parse(customVoice.voiceExpiresAt) <= Date.now())) throw speechError('speech_custom_voice_unavailable', 409);
    }
    return { ...compileSpeechRequest(snapshot, this.catalog(), customVoice), ...(customVoice ? { resolvedVoiceId: customVoice.providerVoiceId } : {}) };
  }
  async quote({ actorContext, snapshot, operation = 'speech' }) {
    this.actor(actorContext);
    const prepared = await this.prepare(actorContext, snapshot, operation); this.available(prepared.model);
    const quote = await this.credits.quoteSpeech({ operation, modelId: prepared.model.id, ...prepared.model.limits });
    const record = { id: `speech_${randomUUID()}`, operation, ownerUserId: actorContext.userId, status: 'quoted', ...prepared, quote, createdAt: new Date().toISOString() };
    await this.repository.mutate(records => {
      if (records.filter(item => item.ownerUserId === actorContext.userId).length >= this.catalog().policy.maxTakes) throw speechError('speech_operation_quota', 409);
      records.push(record);
    });
    return { id: record.id, totalCredits: quote.totalCredits, expiresAt: quote.expiresAt, costBasis: quote.costBasis };
  }
  async generate({ actorContext, snapshot, quoteId, requestId, operation = 'speech' }) {
    this.actor(actorContext);
    await this.assets.assertCapacity?.(this.catalog().policy.maxAudioBytes);
    if (typeof requestId !== 'string' || !/^[\w-]{8,128}$/.test(requestId)) throw speechError('speech_invalid_request_id');
    const prepared = await this.prepare(actorContext, snapshot, operation); this.available(prepared.model);
    const claimed = await this.repository.mutate(records => {
      const duplicate = records.find(item => item.ownerUserId === actorContext.userId && item.requestId === requestId);
      if (duplicate) { if (duplicate.requestHash !== prepared.requestHash || (duplicate.operation || 'speech') !== operation) throw speechError('speech_request_conflict', 409); return { record: structuredClone(duplicate), claim: false }; }
      const record = records.find(item => item.id === quoteId && item.ownerUserId === actorContext.userId);
      if (!record || (record.operation || 'speech') !== operation || record.status !== 'quoted' || record.requestHash !== prepared.requestHash || Date.parse(record.quote.expiresAt) <= Date.now()) throw speechError('speech_quote_stale', 409);
      if (snapshot?.voiceKind === 'custom') {
        const voice = records.find(item => item.id === snapshot.customVoiceOperationId && item.ownerUserId === actorContext.userId);
        if (!voice || voice.voiceDeletePending || voice.voiceDeletedAt || voice.status !== 'succeeded') throw speechError('speech_custom_voice_unavailable', 409);
      }
      if (operation === 'voice_design') {
        const designs = records.filter(item => item.operation === 'voice_design' && !item.voiceDeletedAt && !['quoted','failed'].includes(item.status));
        if (designs.length >= this.catalog().policy.maxProjectVoices) throw speechError('speech_voice_project_limit', 409);
      }
      const active = records.filter(item => item.ownerUserId === actorContext.userId && ['admitting', 'queued', 'dispatching', 'delivered', 'reconciliation_required'].includes(item.status));
      if (active.length >= this.catalog().policy.maxConcurrentPerActor) throw speechError('speech_actor_busy', 409);
      Object.assign(record, { status: 'admitting', requestId,
        ...(operation === 'voice_design' || prepared.resolvedVoiceId ? { providerConnectionId: this.connectionId() } : {}) }); return { record: structuredClone(record), claim: true };
    });
    if (!claimed.claim) return this.publicRecord(claimed.record);
    const record = claimed.record;
    try {
      const reserved = await this.credits.reserveSpeech({ userId: actorContext.userId, operationId: record.id, quote: record.quote });
      record.reservationId = reserved.reservation.reservationId;
      await this.repository.update(record.id, actorContext.userId, { status: 'queued', reservationId: record.reservationId });
      this.queue.enqueueOperation({ id: record.id, provider: record.model.providerId, model: record.model.id, ownerUserId: actorContext.userId,
        reservationId: record.reservationId, execute: () => this.execute(record, actorContext) });
      return this.publicRecord({ ...record, status: 'queued' });
    } catch (error) {
      await this.repository.update(record.id, actorContext.userId, { status: record.reservationId ? 'reconciliation_required' : 'failed', errorCode: 'speech_admission_failed' });
      throw error;
    }
  }
  async execute(record, actorContext) {
    let dispatched = false;
    try {
      this.available(record.model);
      if (record.providerConnectionId && record.providerConnectionId !== this.connectionId()) throw speechError('speech_provider_connection_changed', 409);
      await this.repository.update(record.id, actorContext.userId, { status: 'dispatching' });
      dispatched = true;
      if (record.operation === 'voice_design') {
        const voice = await this.provider.createVoice(record.snapshot, record.model, this.catalog().policy.maxAudioBytes);
        // Persist remote identity and usage BEFORE parsing/writing the sample. Recovery only GETs this identity.
        record = await this.repository.update(record.id, actorContext.userId, { providerVoiceId: voice.id, usage: voice.usage || null,
          providerResponseId: voice.id, voiceExpiresAt: voice.expire_time || null });
        return await this.finishDesign(record, actorContext, voice);
      }
      const adapter = record.model.adapterKey === 'seed-speech' ? this.seedProvider : this.provider;
      const result = await adapter.generate({ ...record.snapshot, voiceId: record.resolvedVoiceId || record.snapshot.voiceId },
        record.model, this.catalog().policy.maxAudioBytes, record.id.replace(/^speech_/, ''));
      const output = await this.assets.register({ bytes: result.bytes, actorContext, jobId: record.id });
      record = await this.repository.update(record.id, actorContext.userId, { ...output, status: 'delivered', usage: result.usage,
        ...(result.timing ? {timing:result.timing} : {}), providerResponseId: result.providerResponseId });
      return await this.settle(record);
    } catch (error) {
      const rejectedStatus = /^speech_provider_http_(\d{3})$/.exec(error.code || '');
      const definitiveRejection = rejectedStatus && [400,401,403,404,413,422,429].includes(Number(rejectedStatus[1]));
      const status = dispatched && !definitiveRejection ? 'reconciliation_required' : 'failed';
      if (status === 'failed' && record.reservationId) {
        try { await this.credits.refundForJob({ userId: actorContext.userId, reservationId: record.reservationId, jobId: record.id, reasonCode: 'speech_not_accepted' }); }
        catch { return this.publicRecord(await this.repository.update(record.id, actorContext.userId, {status:'reconciliation_required',errorCode:'speech_refund_pending'})); }
      }
      console.warn('[Speech]', JSON.stringify({ operationId: record.id, code: String(error.code || 'speech_failed').slice(0, 100), status }));
      return this.publicRecord(await this.repository.update(record.id, actorContext.userId, { status, errorCode: error.code?.startsWith('speech_') ? error.code : 'speech_failed' }));
    }
  }
  async finishDesign(record, actor, voice) {
    const bytes = this.provider.voiceSample(voice, this.catalog().policy.maxAudioBytes);
    const output = await this.assets.register({ bytes, actorContext: actor, jobId: record.id });
    const delivered = await this.repository.update(record.id, actor.userId, { ...output, status: 'delivered', errorCode: null });
    return this.settle(delivered);
  }
  async deleteDesignedVoice({ actorContext, id }) {
    this.actor(actorContext);
    let record = await this.repository.get(id, actorContext.userId);
    if (!record || record.operation !== 'voice_design') throw speechError('speech_not_found', 404);
    if (record.voiceDeletedAt) return { deleted: true };
    if (record.status !== 'succeeded' || record.providerConnectionId !== this.connectionId()) throw speechError('speech_custom_voice_unavailable', 409);
    await this.repository.mutate(records => {
      if (records.some(item => item.snapshot?.customVoiceOperationId === id && ['admitting','queued','dispatching','delivered','reconciliation_required'].includes(item.status))) throw speechError('speech_voice_in_use', 409);
      const current = records.find(item => item.id === id && item.ownerUserId === actorContext.userId);
      current.voiceDeletePending = true;
    });
    await this.provider.deleteVoice(record.providerVoiceId);
    if (record.outputAssetId) await this.assets.remove({ actorContext, assetId: record.outputAssetId });
    await this.repository.update(id, actorContext.userId, { voiceDeletedAt: new Date().toISOString(), voiceDeletePending: false });
    return { deleted: true };
  }
  async settle(record) {
    try {
      await this.credits.captureSpeech({ userId: record.ownerUserId, reservationId: record.reservationId, operationId: record.id,
        providerResponseId: record.providerResponseId, usage: record.usage });
      return this.publicRecord(await this.repository.update(record.id, record.ownerUserId, { status: 'succeeded', errorCode: null }));
    } catch (error) {
      const errorCode = ['speech_usage_reconciliation_required', 'speech_usage_exceeds_consent'].includes(error.code)
        ? error.code : 'speech_settlement_pending';
      // The provider already delivered the audio. Retain that state and identity:
      // status reads retry only idempotent settlement, never generation.
      if (record.errorCode !== errorCode) {
        console.warn('[Speech]', JSON.stringify({ operationId: record.id, code: errorCode, status: 'delivered' }));
        return this.publicRecord(await this.repository.update(record.id, record.ownerUserId, { errorCode }));
      }
      return this.publicRecord(record);
    }
  }
  async read({ actorContext, id }) {
    this.actor(actorContext); const record = await this.repository.get(id, actorContext.userId);
    if (!record) throw speechError('speech_not_found', 404);
    if (record.operation === 'voice_design' && record.providerVoiceId && record.status === 'reconciliation_required' && !record.outputAssetId) {
      if (record.providerConnectionId !== this.connectionId()) return this.publicRecord(record);
      try { return await this.finishDesign(record, actorContext, await this.provider.getVoice(record.providerVoiceId, this.catalog().policy.maxAudioBytes)); }
      catch { return this.publicRecord(record); }
    }
    if (record.status === 'delivered') return this.settle(record);
    // A restarted process cannot safely redispatch an accepted request without provider evidence.
    if (['admitting', 'queued', 'dispatching'].includes(record.status) && !this.queue.jobs.has(record.id)) {
      return this.publicRecord(await this.repository.update(id, actorContext.userId, { status: 'reconciliation_required', errorCode: 'speech_interrupted' }));
    }
    return this.publicRecord(record);
  }
}
export const speechGenerationService = new SpeechGenerationService();

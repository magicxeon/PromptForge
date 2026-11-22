import { randomUUID } from 'node:crypto';
import { isUnmetered, UNMETERED, workspaceCreditDecision } from '../credits/WorkspaceCreditPolicy.js';
import { SpeechOperationRepository } from '../../repositories/generation/SpeechOperationRepository.js';
import { loadSpeechCatalog, assertSpeechAvailable } from './SpeechCatalog.js';
import { compileSpeechRequest, compileVoiceDesign, speechError } from './SpeechRequestCompiler.js';
import { creditApplicationService } from '../credits/CreditApplicationService.js';
import { queueManager } from './QueueManager.js';
import { GeminiSpeechProvider } from '../../providers/GeminiSpeechProvider.js';
import { SeedSpeechProvider } from '../../providers/SeedSpeechProvider.js';
import { assertOperatorTextAccess } from './SceneTranscriptionService.js';
import { getAuthRuntime } from '../../config/authPolicy.js';
import { AudioAssetService, alignCueSpeech, normalizeSeedWav, trimSilentCueTail } from '../assets/AudioAssetService.js';
const speechProcessId = randomUUID();
export class SpeechGenerationService {
  constructor({ repository = new SpeechOperationRepository(), credits = creditApplicationService, queue = queueManager,
    provider = new GeminiSpeechProvider(), seedProvider = new SeedSpeechProvider(), assets = new AudioAssetService(), catalog = loadSpeechCatalog, available = assertSpeechAvailable, runtime = getAuthRuntime } = {}) {
    Object.assign(this, { repository, credits, queue, provider, seedProvider, assets, loadCatalog: catalog, available, runtime });
  }
  catalog() { return this.loadCatalog(); }
  activeDescriptionSuggestions = new Set();
  async suggestVoiceDescription(actor, body) {
    assertOperatorTextAccess(actor, this.runtime());
    const { models, policy } = this.catalog();
    const model = models.find(m => m.enabled && m.adapterKey === 'seed-speech' && m.capabilities.voiceDesign);
    if (!model) throw speechError('speech_provider_unavailable', 503);
    const { name = '', role = '', genre = '', language, voiceGender, locale } = body;
    if (!model.capabilities.languages.includes(language) || !['female','male','unspecified'].includes(voiceGender) ||
        !['en','th'].includes(locale) || [[name,policy.maxTitleLength],[role,policy.maxDesignLength],[genre,160]].some(
          ([value,max]) => typeof value !== 'string' || value.length > max)) throw speechError('voice_invalid_input');
    if (this.activeDescriptionSuggestions.has(actor.userId)) throw speechError('speech_actor_busy', 409);
    this.activeDescriptionSuggestions.add(actor.userId);
    try {
      return await this.seedProvider.suggestDescription({name, role, genre, language, voiceGender, locale}, model, policy);
    } finally {
      this.activeDescriptionSuggestions.delete(actor.userId);
    }
  }
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
      ...(record.rhythmReview && {rhythmReview:record.rhythmReview}),
      operation: record.operation || 'speech', expiresAt: record.voiceExpiresAt || null, deletedAt: record.voiceDeletedAt || null };
  }
  connectionId() { return this.provider.connectionId(); }
  async prepare(actor, snapshot, operation) {
    if (operation === 'voice_design') return compileVoiceDesign(snapshot, this.catalog());
    let customVoice;
    if (snapshot?.voiceKind === 'custom') {
      customVoice = await this.repository.get(snapshot.customVoiceOperationId, actor.userId);
      if (!customVoice || customVoice.operation !== 'voice_design' || customVoice.status !== 'succeeded'
        || customVoice.voiceDeletedAt || customVoice.voiceDeletePending
        || (customVoice.model.adapterKey !== 'seed-speech' && customVoice.providerConnectionId !== this.connectionId())
        || (customVoice.voiceExpiresAt && Date.parse(customVoice.voiceExpiresAt) <= Date.now())) throw speechError('speech_custom_voice_unavailable', 409);
    }
    return { ...compileSpeechRequest(snapshot, this.catalog(), customVoice),
      ...(customVoice?.model.adapterKey === 'seed-speech' ? { referenceAssetId: customVoice.sourceAssetId || customVoice.outputAssetId }
        : customVoice ? { resolvedVoiceId: customVoice.providerVoiceId } : {}) };
  }
  async quote({ actorContext, snapshot, operation = 'speech' }) {
    this.actor(actorContext);
    const prepared = await this.prepare(actorContext, snapshot, operation); this.available(prepared.model);
    // Seed produces a sample using its ordinary TTS endpoint and duration rate. Google's remote voice design has a separate pricing policy.
    const pricingOperation = prepared.model.adapterKey === 'seed-speech' ? 'speech' : operation;
    const quote = await this.credits.quoteSpeech({ operation: pricingOperation, modelId: prepared.model.id, ...prepared.model.limits });
    const record = { id: `speech_${randomUUID()}`, operation, ownerUserId: actorContext.userId, status: 'quoted', ...prepared, quote, createdAt: new Date().toISOString() };
    const quoted = await this.repository.mutate(records => {
      if (snapshot.documentKind === 'audio-script' && operation === 'speech') {
        for (let i = records.length - 1; i >= 0; i--) {
          const candidate = records[i];
          if (candidate.ownerUserId !== actorContext.userId || candidate.operation !== 'speech' ||
              candidate.status !== 'quoted' || candidate.snapshot?.documentKind !== 'audio-script' ||
              candidate.requestId || candidate.reservationId) continue;
          if (Date.parse(candidate.quote.expiresAt) <= Date.now()) records.splice(i, 1);
        }
        const live = records.find(item => item.ownerUserId === actorContext.userId && item.status === 'quoted' &&
          item.operation === 'speech' && item.requestHash === record.requestHash && Date.parse(item.quote.expiresAt) > Date.now());
        if (live) return live;
      }
      if (records.filter(item => item.ownerUserId === actorContext.userId).length >= this.catalog().policy.maxTakes) throw speechError('speech_operation_quota', 409);
      records.push(record);
      return record;
    });
    return { id: quoted.id, totalCredits: quoted.quote.totalCredits, expiresAt: quoted.quote.expiresAt, costBasis: quoted.quote.costBasis };
  }
  async generate({ actorContext, snapshot, quoteId, requestId, operation = 'speech' }) {
    this.actor(actorContext);
    await this.assets.assertCapacity?.(this.catalog().policy.maxAudioBytes);
    if (typeof requestId !== 'string' || !/^[\w-]{8,128}$/.test(requestId)) throw speechError('speech_invalid_request_id');
    const prepared = await this.prepare(actorContext, snapshot, operation); this.available(prepared.model);
    const claimed = await this.repository.mutate(records => {
      const duplicate = records.find(item => item.ownerUserId === actorContext.userId && item.requestId === requestId);
      if (duplicate) { if (duplicate.requestHash !== prepared.requestHash || (duplicate.operation || 'speech') !== operation) throw speechError('speech_request_conflict', 409); return { record: structuredClone(duplicate), claim: false }; }
      let record;
      if (workspaceCreditDecision(actorContext, operation).creditsDisabled) {
        // A locally generated operation id lets the client recover a lost POST response without a quote.
        if (quoteId !== 'speech_' + requestId || !/^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(requestId)
          || records.some(item => item.id === quoteId)) throw speechError('speech_request_conflict', 409);
        if (records.filter(item => item.ownerUserId === actorContext.userId).length >= this.catalog().policy.maxTakes) throw speechError('speech_operation_quota', 409);
        record = { ...prepared, id: quoteId, operation, billingMode:UNMETERED, ownerUserId: actorContext.userId, createdAt:new Date().toISOString() };
      } else {
        record = records.find(item => item.id === quoteId && item.ownerUserId === actorContext.userId);
        if (!record || (record.operation || 'speech') !== operation || record.status !== 'quoted' || record.requestHash !== prepared.requestHash || Date.parse(record.quote.expiresAt) <= Date.now()) throw speechError('speech_quote_stale', 409);
      }
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
      if (isUnmetered(record)) records.push(record);
      Object.assign(record, { status: 'admitting', requestId,
        ...(record.snapshot.sourceType || isUnmetered(record) ? { admissionProcessId: speechProcessId } : {}),
        ...(prepared.model.adapterKey !== 'seed-speech' && (operation === 'voice_design' || prepared.resolvedVoiceId)
          ? { providerConnectionId: this.connectionId() } : {}) }); return { record: structuredClone(record), claim: true };
    });
    if (!claimed.claim) return this.publicRecord(claimed.record);
    const record = claimed.record;
    try {
      if (!isUnmetered(record)) {
        const reserved = await this.credits.reserveSpeech({ userId: actorContext.userId, operationId: record.id, quote: record.quote });
        record.reservationId = reserved.reservation.reservationId;
      }
      if (record.operation === 'voice_design' && record.snapshot.retainOriginal) {
        await this.repository.update(record.id, actorContext.userId, { reservationId: record.reservationId });
        const asset = await this.assets.register({ bytes: Buffer.from(snapshot.referenceAudio, 'base64'),
          actorContext, jobId: record.id + '-reference' });
        record.sourceAssetId = asset.outputAssetId;
        await this.repository.update(record.id, actorContext.userId, {sourceAssetId: record.sourceAssetId});
      }
      await this.repository.update(record.id, actorContext.userId, { status: 'queued', reservationId: record.reservationId });
      this.queue.enqueueOperation({ id: record.id, provider: record.model.providerId, model: record.model.id, ownerUserId: actorContext.userId,
        reservationId: record.reservationId, billingMode:record.billingMode, execute: () => this.execute(record, actorContext) });
      return this.publicRecord({ ...record, status: 'queued' });
    } catch (error) {
      if (record.snapshot.sourceType && (record.reservationId || record.sourceAssetId)) {
        await this.releaseRejectedDesign(record, actorContext, 'speech_admission_failed');
      } else {
        await this.repository.update(record.id, actorContext.userId, { status: record.reservationId ? 'reconciliation_required' : 'failed', errorCode: 'speech_admission_failed' });
      }
      throw error;
    }
  }
  async releaseRejectedDesign(record, actorContext, rejectionCode, refundReason = 'speech_not_accepted', responseEvidence = {}) {
    // A known unusable response may incur upstream cost even though the customer received no sample.
    await this.repository.update(record.id, actorContext.userId, { status: 'reconciliation_required',
      errorCode: 'speech_design_cleanup_pending', rejectionCode, refundReason, reservationId: record.reservationId, sourceAssetId: record.sourceAssetId, ...responseEvidence });
    try {
      if (record.reservationId) await this.credits.refundForJob({ userId: actorContext.userId, reservationId: record.reservationId,
        jobId: record.id, reasonCode: refundReason });
      if (record.sourceAssetId) await this.assets.remove({ actorContext, assetId: record.sourceAssetId });
    } catch { return this.publicRecord(await this.repository.get(record.id, actorContext.userId)); }
    return this.publicRecord(await this.repository.update(record.id, actorContext.userId, { status: 'failed', errorCode: rejectionCode }));
  }
  async execute(record, actorContext) {
    let dispatched = false;
    try {
      this.available(record.model);
      const referenceId = record.referenceAssetId || record.sourceAssetId;
      const referenceBytes = referenceId ? await this.assets.referenceClip(actorContext, referenceId,
        record.model.limits.referenceSeconds, this.catalog().policy.maxAudioBytes) : undefined;
      if (record.providerConnectionId && record.providerConnectionId !== this.connectionId()) throw speechError('speech_provider_connection_changed', 409);
      if (record.operation === 'voice_design' && record.model.designDirectorModel && this.seedProvider.prepareDesign) {
        const snapshot = await this.seedProvider.prepareDesign(record.snapshot, record.model);
        record = await this.repository.update(record.id, actorContext.userId, { snapshot });
      }
      if (record.operation === 'speech' && record.snapshot.documentKind === 'audio-script') {
        const snapshot = await this.seedProvider.prepareScript(record.snapshot, record.model, this.catalog().policy.stylePresets);
        if (snapshot !== record.snapshot) record = await this.repository.update(record.id, actorContext.userId, {snapshot});
      }
      await this.repository.update(record.id, actorContext.userId, { status: 'dispatching' });
      dispatched = true;
      if (record.operation === 'voice_design' && record.model.adapterKey !== 'seed-speech') {
        const voice = await this.provider.createVoice(record.snapshot, record.model, this.catalog().policy.maxAudioBytes);
        // Persist remote identity and usage BEFORE parsing/writing the sample. Recovery only GETs this identity.
        record = await this.repository.update(record.id, actorContext.userId, { providerVoiceId: voice.id, usage: voice.usage || null,
          providerResponseId: voice.id, voiceExpiresAt: voice.expire_time || null });
        return await this.finishDesign(record, actorContext, voice);
      }
      const adapter = record.model.adapterKey === 'seed-speech' ? this.seedProvider : this.provider;
      const result = await adapter.generate({ ...record.snapshot, voiceId: record.resolvedVoiceId || record.snapshot.voiceId },
        record.model, this.catalog().policy.maxAudioBytes, record.id.replace(/^speech_/, ''), referenceBytes);
      let bytes = result.bytes;
      let timing = result.timing;
      let rhythmReview;
      if (record.model.adapterKey === 'seed-speech') {
        try { bytes = await normalizeSeedWav(bytes, this.catalog().policy.maxAudioBytes); }
        catch (error) {
          if (error.code !== 'speech_invalid_wav' || record.operation !== 'voice_design') throw error;
          return await this.releaseRejectedDesign(record, actorContext, error.code, 'speech_unusable_preview',
            { providerResponseId: result.providerResponseId, usage: result.usage });
        }
        const target = record.snapshot.targetDurationMs;
        if (record.operation === 'speech' && target !== undefined) {
          if (record.snapshot.speechWindows) {
            const aligned = await alignCueSpeech(bytes, record.snapshot.speechWindows, this.catalog().policy.maxAudioBytes, undefined, record.snapshot.boundaryTimingOnly);
            bytes = aligned.bytes;
            rhythmReview = aligned.review;
            if (rhythmReview.shiftMs && timing) timing = timing
              .map(t=>({...t,startMs:Math.max(0,t.startMs+rhythmReview.shiftMs),endMs:t.endMs+rhythmReview.shiftMs}))
              .filter(t=>t.endMs>t.startMs);
          }
          const trimmed = trimSilentCueTail(bytes, target);
          if (trimmed !== bytes && timing) timing = timing.filter(part => part.startMs < target)
            .map(part => ({ ...part, endMs: Math.min(part.endMs, target) }));
          bytes = trimmed;
        }
      }
      const output = await this.assets.register({ bytes, actorContext, jobId: record.id });
      record = await this.repository.update(record.id, actorContext.userId, { ...output, status: 'delivered', usage: result.usage,
        ...(rhythmReview && {rhythmReview}),
        ...(timing ? {timing} : {}), providerResponseId: result.providerResponseId });
      return await this.settle(record);
    } catch (error) {
      const rejectedStatus = /^speech_provider_http_(\d{3})$/.exec(error.code || '');
      const definitiveRejection = rejectedStatus && [400,401,403,404,413,422,429].includes(Number(rejectedStatus[1]));
      const status = dispatched && !definitiveRejection ? 'reconciliation_required' : 'failed';
      if (status === 'failed' && (record.reservationId || record.sourceAssetId)) {
        if (record.snapshot.sourceType) return this.releaseRejectedDesign(record, actorContext, error.code?.startsWith('speech_') ? error.code : 'speech_failed');
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
  async deleteDesignedVoice({ actorContext, id, beforeDelete }) {
    this.actor(actorContext);
    let record = await this.repository.get(id, actorContext.userId);
    if (!record || record.operation !== 'voice_design') throw speechError('speech_not_found', 404);
    if (record.voiceDeletedAt) return { deleted: true };
    const seed = record.model.adapterKey === 'seed-speech';
    if (record.status !== 'succeeded' || (!seed && record.providerConnectionId !== this.connectionId())) throw speechError('speech_custom_voice_unavailable', 409);
    await this.repository.mutate(records => {
      if (records.some(item => item.snapshot?.customVoiceOperationId === id && ['admitting','queued','dispatching','delivered','reconciliation_required'].includes(item.status))) throw speechError('speech_voice_in_use', 409);
      const current = records.find(item => item.id === id && item.ownerUserId === actorContext.userId);
      current.voiceDeletePending = true;
    });
    await beforeDelete?.();
    if (!seed) await this.provider.deleteVoice(record.providerVoiceId);
    if (record.sourceAssetId) await this.assets.remove({ actorContext, assetId: record.sourceAssetId });
    if (record.outputAssetId) await this.assets.remove({ actorContext, assetId: record.outputAssetId });
    await this.repository.update(id, actorContext.userId, { voiceDeletedAt: new Date().toISOString(), voiceDeletePending: false });
    return { deleted: true };
  }
  async settle(record) {
    if (isUnmetered(record))
      return this.publicRecord(await this.repository.update(record.id, record.ownerUserId, { status: 'succeeded', errorCode: null }));
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
    if (record.operation === 'voice_design' && record.model?.adapterKey === 'seed-speech'
      && record.status === 'reconciliation_required' && record.errorCode === 'speech_invalid_wav'
      && record.reservationId && !record.outputAssetId && !record.outputUrl && !record.durationMs && !record.providerVoiceId) {
      return this.releaseRejectedDesign(record, actorContext, record.errorCode, 'speech_unusable_preview');
    }
    if (record.status === 'reconciliation_required' && record.errorCode === 'speech_design_cleanup_pending') {
      return this.releaseRejectedDesign(record, actorContext, record.rejectionCode, record.refundReason);
    }
    if (record.operation === 'voice_design' && record.providerVoiceId && record.status === 'reconciliation_required' && !record.outputAssetId) {
      if (record.providerConnectionId !== this.connectionId()) return this.publicRecord(record);
      try { return await this.finishDesign(record, actorContext, await this.provider.getVoice(record.providerVoiceId, this.catalog().policy.maxAudioBytes)); }
      catch { return this.publicRecord(record); }
    }
    if (record.status === 'delivered') return this.settle(record);
    if ((record.snapshot?.sourceType || isUnmetered(record)) && ['admitting', 'queued'].includes(record.status) && !this.queue.jobs.has(id)) {
      // A status check can arrive between reservation, private asset registration and enqueue.
      if (record.admissionProcessId === speechProcessId) return this.publicRecord(record);
      // With this single-process queue gone, the durable pre-dispatch marker proves no upstream request began.
      const reservationId = isUnmetered(record) ? null :
        record.reservationId || (await this.credits.findSpeechReservation(actorContext.userId, id))?.reservationId;
      const sourceAssetId = record.sourceAssetId || (record.snapshot.retainOriginal ? await this.assets.findReferenceId(actorContext, id) : null);
      return this.releaseRejectedDesign({ ...record, reservationId, sourceAssetId }, actorContext, 'speech_interrupted');
    }
    // A restarted process cannot safely redispatch an accepted request without provider evidence.
    if (['admitting', 'queued', 'dispatching'].includes(record.status) && !this.queue.jobs.has(record.id)) {
      return this.publicRecord(await this.repository.update(id, actorContext.userId, { status: 'reconciliation_required', errorCode: 'speech_interrupted' }));
    }
    return this.publicRecord(record);
  }
}
export const speechGenerationService = new SpeechGenerationService();

import { voiceError } from '../../repositories/voice-studio/VoiceStudioRepository.js';

// Internal Voice Studio use cases. Provider lifecycle stays behind Generation.
export class CustomVoiceService {
  constructor({ repository, generation }) { this.repo = repository; this.generation = generation; }
  actor(actor) { if (!actor?.userId) throw voiceError('actor_required', 401); return actor.userId; }
  state(record) {
    if (record.deletingAt) return 'delete_pending';
    if (record.expiresAt && Date.parse(record.expiresAt) <= Date.now()) return 'expired';
    return record.archivedAt ? 'archived' : 'ready';
  }
  view(record) { return { ...record, lifecycleState: this.state(record) }; }
  async project(actor, operation) {
    if (operation.operation !== 'voice_design' || operation.status !== 'succeeded' || operation.deletedAt) return operation;
    const s = operation.snapshot;
    const record = await this.repo.insert('customVoices', this.actor(actor), {
      id: operation.id, operationId: operation.id, name: s.name, displayDescription: s.description,
      designPrompt: s.description, modelId: s.modelId, providerId: s.providerId, language: s.language,
      previewAssetId: operation.outputAssetId, audioUrl: operation.outputUrl, durationMs: operation.durationMs,
      savedAt: null, archivedAt: null, expiresAt: operation.expiresAt || null
    });
    return { ...operation, customVoice: record.deletedAt ? null : this.view(record) };
  }
  async list(actor, query = {}) {
    const userId = this.actor(actor);
    const catalog = this.generation.speechCatalog();
    const operations = (await this.generation.listSpeechOperations(actor)).filter(op => op.operation === 'voice_design' && op.status !== 'quoted');
    for (const op of operations.filter(op => op.status === 'succeeded' && !op.deletedAt)) {
      try { await this.repo.get('customVoices', op.id, userId, { includeDeleted: true }); }
      catch (error) { if (error.code !== 'voice_record_not_found') throw error; await this.project(actor, op); }
    }
    let records = await this.repo.list('customVoices', userId);
    const search = String(query.search || '').toLowerCase().slice(0, 200);
    records = records.filter(r => (query.archived === 'true' || !r.archivedAt)
      && (!query.saved || (query.saved === 'true' ? !!r.savedAt : !r.savedAt))
      && (!search || `${r.name} ${r.displayDescription}`.toLowerCase().includes(search)));
    records.sort((a,b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
    const limit = Math.max(1, Math.min(catalog.policy.maxPageSize, Number(query.limit) || catalog.policy.pageSize));
    const start = query.cursor ? records.findIndex(r => r.id === query.cursor) + 1 : 0;
    const items = records.slice(start, start + limit).map(record => this.view(record));
    return { items, nextCursor: start + limit < records.length ? items.at(-1).id : null,
      operations: operations.filter(op => ['admitting','queued','dispatching','delivered','reconciliation_required'].includes(op.status)) };
  }
  async resolve(actor, id, { selection = false } = {}) {
    const record = await this.repo.get('customVoices', id, this.actor(actor));
    const state = this.state(record);
    if (!record.savedAt || !['ready','archived'].includes(state) || (selection && state !== 'ready')) throw voiceError('voice_custom_unavailable', 409);
    return record;
  }
  quote(actor, body) { this.actor(actor); return this.generation.quoteVoiceDesign({ actorContext: actor, snapshot: body }); }
  async create(actor, body) {
    const catalog = this.generation.speechCatalog();
    const records = await this.repo.list('customVoices', this.actor(actor));
    const operations = (await this.generation.listSpeechOperations(actor)).filter(op => op.operation === 'voice_design' && !op.deletedAt && !['quoted','failed'].includes(op.status));
    if (!operations.some(op => op.id === body.quoteId)) {
      const saved = new Set(records.filter(r => r.savedAt).map(r => r.id));
      if (operations.length >= catalog.policy.maxCustomVoices || operations.filter(op => !saved.has(op.id)).length >= catalog.policy.maxDesignCandidates) throw voiceError('voice_custom_limit', 409);
    }
    return this.project(actor, await this.generation.createVoiceDesign({ actorContext: actor, snapshot: body, quoteId: body.quoteId, requestId: body.requestId }));
  }
  async update(actor, id, body, save = false) {
    const userId = this.actor(actor), catalog = this.generation.speechCatalog();
    const previous = await this.repo.get('customVoices', id, userId);
    if (previous.deletingAt) throw voiceError('voice_custom_unavailable', 409);
    if (!save && !Number.isInteger(body.expectedRevision)) throw voiceError('voice_revision_required');
    if (save && this.state(previous) !== 'ready') throw voiceError('voice_custom_unavailable', 409);
    const record = await this.repo.update('customVoices', id, userId, save ? undefined : body.expectedRevision, r => {
      if (save) { r.savedAt ||= new Date().toISOString(); return; }
      for (const [key, max] of [['name',catalog.policy.maxTitleLength],['displayDescription',catalog.policy.maxDesignLength]]) {
        if (body[key] === undefined) continue;
        if (typeof body[key] !== 'string' || !body[key].trim() || [...body[key]].length > max) throw voiceError('voice_invalid_input');
        r[key] = body[key].trim();
      }
      if (body.archived !== undefined) {
        if (typeof body.archived !== 'boolean') throw voiceError('voice_invalid_input');
        r.archivedAt = body.archived ? (r.archivedAt || new Date().toISOString()) : null;
      }
    });
    return this.view(record);
  }
  async remove(actor, id) {
    const userId = this.actor(actor);
    const record = await this.repo.get('customVoices', id, userId, { includeDeleted: true });
    if (record.deletedAt) return { deleted: true };
    // Archived presets still bind the voice and must be reassigned before deletion.
    if ((await this.repo.list('characters', userId)).some(c => c.voiceKind === 'custom' && c.voiceId === id)) throw voiceError('voice_custom_in_use', 409);
    await this.repo.update('customVoices', id, userId, undefined, r => { r.deletingAt ||= new Date().toISOString(); });
    await this.generation.deleteVoiceDesign({ actorContext: actor, id: record.operationId });
    await this.repo.update('customVoices', id, userId, undefined, r => { r.deletedAt = new Date().toISOString(); });
    return { deleted: true };
  }
}

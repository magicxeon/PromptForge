import { randomUUID } from 'node:crypto';
import { VoiceStudioRepository, voiceError } from '../../repositories/voice-studio/VoiceStudioRepository.js';
import { CustomVoiceService } from './CustomVoiceService.js';
import { validSpeechWindows } from '../generation/speechWindows.js';

const owner = actor => { if (!actor?.userId) throw voiceError('actor_required', 401); return actor.userId; };
const string = (v, max, allowEmpty = false) => {
  if (typeof v !== 'string' || [...v].length > max || (!allowEmpty && !v.trim())) throw voiceError('voice_invalid_input');
  return v;
};
const actorCommands = new Map();
export class VoiceStudioApplicationService {
  constructor({ repository = new VoiceStudioRepository(), generation, audioAssets } = {}) {
    this.repo = repository; this.generation = generation; this.audioAssets = audioAssets;
    this.customVoices = new CustomVoiceService({ repository, generation });
    // Serialize commands that validate references across document/Take files.
    for (const method of ['createDocument', 'character', 'updateDocument', 'updateTake', 'deleteTake', 'withDubTakePins', 'generate', 'createCustomVoice', 'listCustomVoices', 'updateCustomVoice', 'deleteCustomVoice']) {
      const execute = this[method].bind(this);
      this[method] = (actor,...args) => {
        const key = owner(actor), previous = actorCommands.get(key) || Promise.resolve();
        const current = previous.catch(()=>{}).then(()=>execute(actor,...args));
        actorCommands.set(key,current);
        current.finally(()=>{ if (actorCommands.get(key) === current) actorCommands.delete(key); }).catch(()=>{});
        return current;
      };
    }
  }
  async catalog(actor) { owner(actor); return this.generation.speechCatalog(); }
  listCustomVoices(actor, query) { return this.customVoices.list(actor, query); }
  suggestVoiceDescription(actor, body) { return this.generation.suggestVoiceDescription(actor, body); }
  quoteCustomVoice(actor, body) { return this.customVoices.quote(actor, body); }
  createCustomVoice(actor, body) { return this.customVoices.create(actor, body); }
  updateCustomVoice(actor, id, body, save = false) { return this.customVoices.update(actor, id, body, save); }
  deleteCustomVoice(actor, id, options) { return this.customVoices.remove(actor, id, options); }
  async list(kind, actor, query = {}) {
    const {policy} = await this.catalog(actor);
    let records = await this.repo.list(kind, owner(actor));
    const search = String(query.search || '').toLowerCase().slice(0, 200);
    if (query.archived !== 'true' && kind !== 'takes') records = records.filter(r => !r.archivedAt);
    if (kind === 'takes') {
      records = records.filter(r => !r.deletingAt && (!['true', 'saved'].includes(query.saved) || r.savedAt)
        && ['documentId','characterPresetId','modelId'].every(k => !query[k] || (r[k] || r.inputSnapshot[k]) === query[k])
        && (!query.tag || r.tags.includes(query.tag)));
    }
    records = records.filter(r => !search || [r.title,r.name,r.displayTitle,...(r.tags || [])].filter(Boolean).join(' ').toLowerCase().includes(search));
    records.sort(query.sort === 'name' ? (a,b) => String(a.displayTitle || a.title || a.name).localeCompare(String(b.displayTitle || b.title || b.name)) : (a,b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
    const limit = Math.max(1, Math.min(policy.maxPageSize || 50, Number(query.limit) || policy.pageSize || 20));
    const index = query.cursor ? records.findIndex(r => r.id === query.cursor) + 1 : 0;
    const items = records.slice(index, index + limit);
    return { items, nextCursor: index + limit < records.length ? items.at(-1).id : null };
  }
  async createDocument(actor, body) {
    const catalog = await this.catalog(actor);
    if ((await this.repo.list('documents',owner(actor))).length >= (catalog.policy.maxDocuments || 500)) throw voiceError('voice_document_limit',409);
    const modelId = body.modelId || catalog.defaultModelId;
    if (!catalog.models.some(m => m.id === modelId)) throw voiceError('voice_model_unavailable');
    return this.repo.insert('documents', owner(actor), { title: string(body.title || 'Untitled', catalog.policy.maxTitleLength || 120), modelId, language: string(body.language || 'th',30), archivedAt: null,
      rows: [{ id: randomUUID(), enabled: true, characterPresetId: '', text: '', delivery: {}, selectedTakeId: null }] });
  }
  async getDocument(actor, id) {
    const document = await this.repo.get('documents', id, owner(actor));
    const operations = await this.generation.listSpeechOperations?.(actor) || [];
    for (const op of operations.filter(op => op.snapshot?.documentId === id && op.status === 'succeeded')) {
      try { await this.repo.get('takes',op.id,owner(actor),{includeDeleted:true}); }
      catch (error) { if (error.code !== 'voice_record_not_found') throw error; await this.project(actor,op); }
    }
    return {...document,rows:document.rows.map(row => {
      const active = operations.find(op => op.snapshot?.documentId === id && op.snapshot?.rowId === row.id
        && ['admitting','queued','dispatching','delivered','reconciliation_required'].includes(op.status));
      return {...row,...(active ? {activeOperationId:active.id} : {})};
    })};
  }
  async updateDocument(actor, id, body) {
    const catalog = await this.catalog(actor);
    const policy = catalog.policy;
    if (!Number.isInteger(body.expectedRevision)) throw voiceError('voice_revision_required');
    const previous = await this.getDocument(actor, id);
    const rows = body.rows ?? previous.rows;
    if (!Array.isArray(rows) || rows.length > (policy.maxRows || 100) || new Set(rows.map(r => r.id)).size !== rows.length) throw voiceError('voice_invalid_rows');
    const characters = await this.repo.list('characters', owner(actor));
    for (const row of rows) {
      string(row.id, 100); string(row.text, policy.maxTextLength || 2000, true);
      if (typeof row.enabled !== 'boolean') throw voiceError('voice_invalid_rows');
      if (row.targetDurationMs !== undefined && (!Number.isSafeInteger(row.targetDurationMs) || row.targetDurationMs <= 0)) throw voiceError('voice_invalid_rows');
      if (!validSpeechWindows(row.speechWindows,row.targetDurationMs)) throw voiceError('voice_invalid_rows');
      if (row.boundaryTimingOnly !== undefined && (typeof row.boundaryTimingOnly !== 'boolean' ||
          (row.boundaryTimingOnly && !row.speechWindows?.length))) throw voiceError('voice_invalid_rows');
      if (row.characterPresetId && !characters.some(c => c.id === row.characterPresetId)) throw voiceError('voice_character_not_found');
      if (!row.delivery || typeof row.delivery !== 'object' || Array.isArray(row.delivery)) throw voiceError('voice_invalid_delivery');
      for (const [k,v] of Object.entries(row.delivery)) { if (!['emotion','intensity','pace','method','direction'].includes(k)) throw voiceError('voice_invalid_delivery'); string(v, policy.maxStyleLength || 400, true); }
      if (row.selectedTakeId) {
        const take = await this.repo.get('takes', row.selectedTakeId, owner(actor));
        if (take.rowId !== row.id || take.documentId !== id || take.deletingAt) throw voiceError('voice_invalid_take');
      }
    }
    const operations = await this.generation.listSpeechOperations?.(actor) || [];
    if (operations.some(op => op.snapshot?.documentId === id && ['admitting','queued','dispatching','delivered','reconciliation_required'].includes(op.status)
      && !rows.some(r => r.id === op.snapshot.rowId))) throw voiceError('voice_row_has_active_job', 409);
    return this.repo.update('documents', id, owner(actor), body.expectedRevision, record => {
      record.title = string(body.title ?? record.title, policy.maxTitleLength || 120);
      record.modelId = string(body.modelId ?? record.modelId, 160);
      record.language = string(body.language ?? record.language, 30);
      record.rows = rows.map(r => ({ id: r.id, enabled: r.enabled, characterPresetId: r.characterPresetId || '', text: r.text, delivery: structuredClone(r.delivery),
        ...(r.targetDurationMs !== undefined && { targetDurationMs: r.targetDurationMs }),
        ...(r.boundaryTimingOnly && {boundaryTimingOnly:true}),
        ...(r.speechWindows && {speechWindows:structuredClone(r.speechWindows)}), selectedTakeId: r.selectedTakeId || null }));
    });
  }
  archive(kind, actor, id, archived = true) {
    return this.repo.update(kind,id,owner(actor),undefined,r => {
      if (!archived && r.voiceRetiredAt) throw voiceError('voice_custom_unavailable',409);
      r.archivedAt = archived ? new Date().toISOString() : null;
    });
  }
  async character(actor, body, id) {
    const catalog = await this.catalog(actor);
    const previous = id ? await this.repo.get('characters',id,owner(actor)) : {};
    if (id && !Number.isInteger(body.expectedRevision)) throw voiceError('voice_revision_required');
    if (!id && (await this.repo.list('characters',owner(actor))).length >= (catalog.policy.maxCharacters || 500)) throw voiceError('voice_character_limit',409);
    const voiceId = body.voiceId ?? previous.voiceId;
    const voiceKind = body.voiceKind ?? previous.voiceKind ?? 'prebuilt';
    if (!['prebuilt','custom'].includes(voiceKind)) throw voiceError('voice_unavailable');
    if (voiceKind === 'custom') await this.customVoices.resolve(actor, voiceId, { selection: previous.voiceKind !== 'custom' || previous.voiceId !== voiceId });
    else if (!catalog.voices.some(v => v.id === voiceId)) throw voiceError('voice_unavailable');
    const values = { name: string(body.name ?? previous.name, catalog.policy.maxTitleLength || 120), color: string(body.color || previous.color || '#8b5cf6', 30), voiceId, voiceKind, schemaVersion: 2 };
    return id ? this.repo.update('characters',id,owner(actor),body.expectedRevision,r => {
      if (r.voiceRetiredAt && (voiceId !== r.voiceId || voiceKind !== r.voiceKind)) delete r.voiceRetiredAt;
      Object.assign(r, values);
    }) : this.repo.insert('characters',owner(actor),{...values,archivedAt:null});
  }
  async snapshot(actor, id, rowId, revision) {
    const document = await this.getDocument(actor,id);
    if (document.revision !== revision) throw voiceError('voice_revision_conflict',409);
    const row = document.rows.find(r => r.id === rowId);
    if (!row || !row.enabled || !row.text.trim()) throw voiceError('voice_invalid_row');
    const character = await this.repo.get('characters',row.characterPresetId,owner(actor));
    if (character.archivedAt) throw voiceError('voice_character_archived');
    const custom = character.voiceKind === 'custom' ? await this.customVoices.resolve(actor, character.voiceId) : null;
    return { documentId:id,rowId,text:row.text,delivery:row.delivery,voiceId:character.voiceId,modelId:document.modelId,language:document.language,
      ...(row.targetDurationMs !== undefined && { targetDurationMs: row.targetDurationMs }),
      ...(row.speechWindows && {speechWindows:row.speechWindows}),
      ...(row.boundaryTimingOnly && {boundaryTimingOnly:true}),
      ...(custom ? { voiceKind: 'custom', customVoiceOperationId: custom.operationId, customVoiceRevision: custom.revision } : {}),
      characterName:character.name,characterPresetId:character.id,documentRevision:document.revision,characterRevision:character.revision };
  }
  async quote(actor,id,rowId,body) { return this.generation.quoteSpeech({actorContext:actor,snapshot:await this.snapshot(actor,id,rowId,body.expectedRevision)}); }
  async generate(actor,id,rowId,body) {
    const catalog = await this.catalog(actor);
    if ((await this.repo.list('takes',owner(actor))).length >= (catalog.policy.maxTakes || 5000)) throw voiceError('voice_take_limit',409);
    const operation = await this.generation.generateSpeech({actorContext:actor,snapshot:await this.snapshot(actor,id,rowId,body.expectedRevision),quoteId:body.quoteId,requestId:string(body.requestId,160)});
    return this.project(actor,operation);
  }
  async readGeneration(actor,id) { return this.project(actor,await this.generation.readSpeech({actorContext:actor,id})); }
  async project(actor,op) {
    if (op.operation === 'voice_design') return this.customVoices.project(actor, op);
    if (op.status !== 'succeeded') return op;
    const s = op.snapshot;
    const take = await this.repo.insert('takes',owner(actor),{id:op.id,documentId:s.documentId,rowId:s.rowId,jobId:op.id,outputAssetId:op.outputAssetId,
      inputSnapshot:s,audioUrl:op.outputUrl,durationMs:op.durationMs,...(op.timing ? {timing:op.timing} : {}),
      ...(op.rhythmReview && {rhythmReview:op.rhythmReview}),
      displayTitle:s.text.slice(0,80),tags:[],savedAt:null,metadataRevision:1});
    return {...op,jobId:op.id,take:take.deletedAt || take.deletingAt ? null : take};
  }
  async takes(actor,id,rowId) { await this.getDocument(actor,id); return {items:(await this.repo.list('takes',owner(actor))).filter(t => t.documentId === id && t.rowId === rowId && !t.deletingAt)}; }
  async getDubCharacter(actor,id,language) {
    const character = await this.repo.get('characters',id,owner(actor));
    if (character.archivedAt) throw voiceError('voice_record_not_found',404);
    if (language && character.voiceKind === 'custom') {
      const preset = await this.customVoices.resolve(actor, character.voiceId, { selection: true });
      if (preset.modelId === 'dola-seed-audio' && preset.language !== language) throw voiceError('voice_language_mismatch', 400);
    }
    return {id:character.id,name:character.name};
  }
  async getSeedDubCasting(actor, id, language) {
    const character = await this.repo.get('characters', id, owner(actor));
    if (character.archivedAt || character.voiceKind !== 'custom') throw voiceError('dub_voice_required', 422);
    const voice = await this.customVoices.resolve(actor, character.voiceId, {selection:true});
    if (voice.modelId !== 'dola-seed-audio' || voice.language !== language) throw voiceError('dub_voice_required', 422);
    return { characterRevision: character.revision, voiceId: voice.id, voiceRevision: voice.revision };
  }
  async getDubTake(actor,id) {
    const take = await this.repo.get('takes',id,owner(actor));
    if (take.deletingAt || take.deletedAt) throw voiceError('voice_record_not_found',404);
    return take;
  }
  async getSavedTake(actor,id) {
    const take = await this.getDubTake(actor,id);
    if (!take.savedAt) throw voiceError('voice_record_not_found',404);
    return take;
  }
  async measureDubTake(actor,id) {
    const take = await this.getDubTake(actor,id);
    const {policy} = await this.catalog(actor);
    return this.audioAssets.measureDubAudio(actor,take.outputAssetId,policy.maxAudioBytes);
  }
  async withDubTakePins(actor, projectId, takeIds, commit) {
    const userId = owner(actor);
    // Persist both reference sets before committing the project. If the process
    // stops between files, every referenced take stays protected until the next save.
    const previous = await this.repo.setDubPins(userId, projectId, takeIds, true);
    let result;
    try { result = await commit(); }
    catch (error) {
      await this.repo.setDubPins(userId, projectId, previous);
      throw error;
    }
    await this.repo.setDubPins(userId, projectId, takeIds);
    return result;
  }
  async select(actor,id,rowId,body) {
    const document = await this.getDocument(actor,id);
    const row = document.rows.find(r => r.id === rowId); if (!row) throw voiceError('voice_record_not_found',404);
    row.selectedTakeId = body.takeId;
    return this.updateDocument(actor,id,{...document,expectedRevision:body.expectedRevision,rows:document.rows});
  }
  async updateTake(actor,id,body,save = false) {
    const {policy} = await this.catalog(actor);
    const take = await this.repo.get('takes',id,owner(actor));
    if (take.deletingAt) throw voiceError('voice_take_deleting',409);
    if (!save && !Number.isInteger(body.expectedRevision)) throw voiceError('voice_revision_required');
    return this.repo.update('takes',id,owner(actor),save ? undefined : body.expectedRevision, r => {
      if (save) r.savedAt ||= new Date().toISOString();
      else {
        if (body.displayTitle !== undefined) r.displayTitle = string(body.displayTitle,policy.maxTitleLength || 120);
        if (body.tags !== undefined) { if (!Array.isArray(body.tags) || body.tags.length > (policy.maxTags || 10)) throw voiceError('voice_invalid_tags'); r.tags = [...new Set(body.tags.map(t => string(t,policy.maxTagLength || 40)))]; }
      }
      r.metadataRevision = r.revision + 1;
    });
  }
  async deleteTake(actor,id) {
    const take = await this.repo.get('takes',id,owner(actor),{includeDeleted:true});
    if (take.deletedAt) return {deleted:true};
    const documents = await this.repo.list('documents',owner(actor));
    if (documents.some(d => d.rows.some(r => r.selectedTakeId === id))) throw voiceError('voice_take_in_use',409);
    await this.repo.update('takes',id,owner(actor),undefined,r => {
      if (r.dubProjectIds?.length) throw voiceError('voice_take_in_use',409);
      r.deletingAt ||= new Date().toISOString();
    });
    await this.audioAssets.remove({actorContext:actor,assetId:take.outputAssetId});
    await this.repo.update('takes',id,owner(actor),undefined,r => { r.deletedAt = new Date().toISOString(); });
    return {deleted:true};
  }
}

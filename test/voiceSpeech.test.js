import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile, readFile, readdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { compileSpeechRequest } from '../server/domain/generation/SpeechRequestCompiler.js';
import { loadSpeechCatalog } from '../server/domain/generation/SpeechCatalog.js';
import { inspectWav, AudioAssetService } from '../server/domain/assets/AudioAssetService.js';
import { quoteSpeechPrice, settleSpeechPrice } from '../server/domain/credits/SpeechPricing.js';
import { GeminiSpeechProvider } from '../server/providers/GeminiSpeechProvider.js';
import { SpeechGenerationService } from '../server/domain/generation/SpeechGenerationService.js';
import { SpeechOperationRepository } from '../server/repositories/generation/SpeechOperationRepository.js';
import { CreditApplicationService } from '../server/domain/credits/CreditApplicationService.js';
import { CreditAccountRepository } from '../server/repositories/credits/CreditAccountRepository.js';

const snapshot = { documentId: 'doc', rowId: 'row', modelId: 'gemini-3.8-flash-tts', voiceId: 'Kore', text: 'สวัสดี\n<gasp> จริงหรือ', delivery: { emotion: 'happy' }, language: 'th' };
const actorContext = { userId: 'actor', username: 'actor' };
test('concurrent sample registration keeps only the deduplicated asset bytes',async t=>{
  const directory=await mkdtemp(path.join(os.tmpdir(),'voice-audio-race-'));t.after(()=>rm(directory,{recursive:true,force:true}));
  let stored;
  const repository={findBySourceJobIdForOwner:async()=>null,create:async input=>{stored ||= {...input,id:'asset'};return stored;}};
  const assets=new AudioAssetService({repository,outputsDirectory:directory});
  const inputs={bytes:wav(),actorContext,jobId:'same-design'};
  const [a,b]=await Promise.all([assets.register(inputs),assets.register(inputs)]);
  assert.equal(a.outputAssetId,b.outputAssetId);
  assert.equal((await readdir(path.join(directory,'voice-studio'))).length,1);
});
function wav() {
  const b = Buffer.alloc(48); b.write('RIFF'); b.writeUInt32LE(40, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(24000, 24); b.writeUInt32LE(48000, 28);
  b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(4, 40); return b;
}
test('speech compilation preserves exact transcript, separates style, rejects unsupported tags and voice', () => {
  const catalog = loadSpeechCatalog(), result = compileSpeechRequest(snapshot, catalog);
  assert.equal(result.snapshot.text, snapshot.text); assert.equal(result.snapshot.style, 'happy');
  assert.equal(result.requestHash, compileSpeechRequest({ ...snapshot }, catalog).requestHash);
  assert.throws(() => compileSpeechRequest({ ...snapshot, voiceId: 'notconfigured' }, catalog));
  assert.throws(() => compileSpeechRequest({ ...snapshot, text: '<script>x</script>' }, catalog));
  assert.throws(() => compileSpeechRequest({ ...snapshot, text: 'x'.repeat(2001) }, catalog));
});

test('voice design adapter retains identity and usage, bounded private sample and idempotent remote deletion',async()=>{
  const requests=[];
  const provider=new GeminiSpeechProvider({apiKey:'test-key',fetchImpl:async(url,req)=>{
    requests.push({url,req});
    return req.method==='DELETE' ? new Response('',{status:404}) : new Response(JSON.stringify({id:'voice_test',type:'prompted',usage:{total_input_tokens:10,total_output_tokens:20},sample_audio:{mime_type:'audio/wav',data:wav().toString('base64')}}));
  }});
  const voice=await provider.createVoice({name:'Narrator',description:'Warm voice',language:'th'},loadSpeechCatalog().models[0],1024);
  assert.deepEqual(provider.voiceSample(voice,1024),wav());
  const body=JSON.parse(requests[0].req.body);
  assert.equal(body.voice.type,'prompted');assert.equal(body.voice.prompted.input,'Warm voice');assert.equal(body.store,true);
  assert.equal(voice.usage.total_output_tokens,20);
  assert.deepEqual(await provider.deleteVoice('voice_test'),{deleted:true});
  await assert.rejects(provider.getVoice('../other'),{code:'speech_invalid_voice'});
});

test('voice design pricing requires qualified usage modalities and locked model-rate mapping',async()=>{
  const policy=JSON.parse(await readFile(new URL('../server/config/credit-pricing-policy.json',import.meta.url),'utf8'));
  const q=quoteSpeechPrice(policy,{modelId:snapshot.modelId,inputTokens:8192,outputTokens:16384,operation:'voice_design'},Date.parse('2026-11-15'));
  const usage={total_input_tokens:100,total_output_tokens:250,input_tokens_by_modality:[{modality:'text',tokens:100}],output_tokens_by_modality:[{modality:'audio',tokens:250}]};
  assert.ok(settleSpeechPrice(q,usage).amountCredits<=q.totalCredits);
  assert.match(q.pricingEvidence.mapping,/inferred/);
  assert.equal(settleSpeechPrice(q,{...usage,total_thought_tokens:5}).usageEvidence.unpricedThoughtTokens,5);
  assert.throws(()=>settleSpeechPrice(q,{...usage,output_tokens_by_modality:undefined}));
  assert.throws(()=>settleSpeechPrice(q,{...usage,output_tokens_by_modality:[{modality:'text',tokens:250}]}));
});

// Sanitized counters from the delivered production-shaped response; no prompt or identity.
const designUsage = {
  total_tokens: 757, total_input_tokens: 287, initial_input_tokens: 287,
  input_tokens_by_modality: [{ modality: 'text', tokens: 137 }],
  total_output_tokens: 470, output_tokens_by_modality: [{ modality: 'audio', tokens: 470 }],
  total_thought_tokens: 979, total_cached_tokens: 0, total_tool_use_tokens: 0,
};
test('design usage prices evidenced modalities, retains unpriced counters and enforces frozen limits', async () => {
  const policy = JSON.parse(await readFile(new URL('../server/config/credit-pricing-policy.json', import.meta.url), 'utf8'));
  const quote = quoteSpeechPrice(policy, { modelId: snapshot.modelId, inputTokens: 8192, outputTokens: 16384, operation: 'voice_design' }, Date.parse('2026-11-15'));
  const before = structuredClone(designUsage);
  const result = settleSpeechPrice(quote, designUsage);
  assert.equal(result.inputTokens, 137);
  assert.equal(result.outputTokens, 470);
  assert.equal(result.providerCostUsd, (137 * quote.providerRate.inputUsdPerMillion + 470 * quote.providerRate.outputUsdPerMillion) / 1e6);
  assert.equal(result.usageEvidence.costCoverage, 'priced_modality_subtotal');
  assert.equal(result.usageEvidence.unpricedInputTokens, 150);
  assert.equal(result.usageEvidence.unpricedThoughtTokens, 979);
  assert.deepEqual(designUsage, before);
  for (const patch of [
    { total_thought_tokens: -1 }, { total_tokens: '757' }, { initial_input_tokens: NaN },
    { total_input_tokens: 8193 }, { total_input_tokens: 136 }, { total_output_tokens: 16385 },
    { total_cached_tokens: 1 }, { total_tool_use_tokens: 1 },
    { input_tokens_by_modality: [] }, { input_tokens_by_modality: [{ modality: 'audio', tokens: 137 }] },
    { output_tokens_by_modality: [{ modality: 'audio', tokens: 469 }] },
    { input_tokens_by_modality: [null] }, { total_thought_tokens: Number.MAX_SAFE_INTEGER + 1 },
  ]) assert.throws(() => settleSpeechPrice(quote, { ...designUsage, ...patch }), { code: 'speech_usage_reconciliation_required' });
  assert.throws(() => settleSpeechPrice({ ...quote, totalCredits: 0 }, designUsage), { code: 'speech_usage_exceeds_consent' });
});

test('checking delivered design recovers settlement once without provider calls and keeps failures actionable', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'design-settlement-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const databaseFile = path.join(directory, 'credits.json');
  await writeFile(databaseFile, JSON.stringify({ schemaVersion: 2, accounts: [{ userId: 'actor', username: 'actor', availableCredits: 1000, reservedCredits: 0, status: 'active' }], estimates: [], reservations: [], ledgerEntries: [] }));
  const accounts = new CreditAccountRepository({ databaseFile, userRepository: { findById: async () => null, findByUsername: async () => null } });
  const credits = new CreditApplicationService({ accountRepository: accounts });
  const policy = JSON.parse(await readFile(new URL('../server/config/credit-pricing-policy.json', import.meta.url), 'utf8'));
  const quote = quoteSpeechPrice(policy, { modelId: snapshot.modelId, inputTokens: 8192, outputTokens: 16384, operation: 'voice_design' }, Date.parse('2026-11-15'));
  const id = 'delivered-design';
  const reserved = await credits.reserveSpeech({ userId: 'actor', operationId: id, quote });
  const repository = new SpeechOperationRepository({ filename: path.join(directory, 'operations.json') });
  await repository.mutate(records => records.push({ id, operation: 'voice_design', ownerUserId: 'actor', status: 'delivered', snapshot: {},
    providerVoiceId: 'voice_existing', providerResponseId: 'voice_existing', outputAssetId: 'asset-existing', outputUrl: '/api/assets/asset-existing/content',
    reservationId: reserved.reservation.reservationId, quote, usage: null }));
  let providerCalls = 0;
  const provider = new Proxy({}, { get: () => () => { providerCalls++; throw new Error('Provider must not be called'); } });
  const service = new SpeechGenerationService({ repository, credits, provider });
  await assert.rejects(service.read({ actorContext: { userId: 'other' }, id }), { code: 'speech_not_found' });
  const failed = await service.read({ actorContext, id });
  assert.equal(failed.status, 'delivered');
  assert.equal(failed.errorCode, 'speech_usage_reconciliation_required');
  assert.equal((await accounts.readRaw()).ledgerEntries.filter(e => e.operationType === 'capture').length, 0);
  await repository.update(id, 'actor', { usage: designUsage });
  const outage = new SpeechGenerationService({ repository, provider, credits: { captureSpeech: async () => { throw new Error('private database details'); } } });
  assert.equal((await outage.read({ actorContext, id })).errorCode, 'speech_settlement_pending');
  const [recovered, replay] = await Promise.all([service.read({ actorContext, id }), service.read({ actorContext, id })]);
  assert.equal(recovered.status, 'succeeded');
  assert.equal(replay.status, 'succeeded');
  assert.equal(recovered.errorCode, null);
  assert.equal(recovered.outputAssetId, 'asset-existing');
  assert.equal(recovered.providerVoiceId, undefined);
  const stored = await repository.get(id, 'actor');
  assert.equal(stored.providerVoiceId, 'voice_existing');
  assert.deepEqual(stored.usage, designUsage);
  await service.read({ actorContext, id });
  const data = await accounts.readRaw();
  assert.equal(data.ledgerEntries.filter(e => e.operationType === 'capture').length, 1);
  assert.equal(data.accounts[0].reservedCredits, 0);
  assert.equal(providerCalls, 0);
});

test('design failure after creation recovers the same private identity; custom synthesis and delete respect ownership',async t=>{
  const directory=await mkdtemp(path.join(os.tmpdir(),'voice-design-'));t.after(()=>rm(directory,{recursive:true,force:true}));
  const repository=new SpeechOperationRepository({filename:path.join(directory,'operations.json')});
  const queue={jobs:new Map(),enqueueOperation(op){this.jobs.set(op.id,op);}};
  let creates=0,gets=0,registers=0,deleted=0,dispatchedVoice;
  const sample={id:'voice_designed',type:'prompted',usage:{total_input_tokens:10,total_output_tokens:20}};
  const service=new SpeechGenerationService({repository,queue,available:()=>{},
    credits:{quoteSpeech:async()=>({totalCredits:5,expiresAt:new Date(Date.now()+60000).toISOString()}),reserveSpeech:async()=>({reservation:{reservationId:'reservation'}}),captureSpeech:async()=>{}},
    provider:{connectionId:()=> 'project-test',createVoice:async()=>{creates++;return sample;},getVoice:async()=>{gets++;return sample;},voiceSample:()=>wav(),deleteVoice:async()=>{deleted++;},generate:async(s)=>{dispatchedVoice=s.voiceId;return {bytes:wav(),usage:{}};}},
    assets:{register:async()=>{if (++registers===1) throw new Error('Disk unavailable');return {outputAssetId:'asset',outputUrl:'/outputs/a.wav',durationMs:1};},remove:async()=>{}}});
  const design={name:'Actor voice',description:'Warm natural Thai narrator',language:'th',modelId:snapshot.modelId};
  const q=await service.quote({actorContext,snapshot:design,operation:'voice_design'});
  const input={actorContext,snapshot:design,operation:'voice_design',quoteId:q.id,requestId:'design_request'};
  const accepted=await service.generate(input);
  await service.generate(input);assert.equal(queue.jobs.size,1);
  const failed=await queue.jobs.get(accepted.id).execute();assert.equal(failed.status,'reconciliation_required');
  const ready=await service.read({actorContext,id:accepted.id});assert.equal(ready.status,'succeeded');
  assert.equal(creates,1);assert.equal(gets,1);assert.equal(ready.providerVoiceId,undefined);
  assert.equal(JSON.stringify(ready).includes('voice_designed'),false);
  const speech={...snapshot,voiceKind:'custom',voiceId:q.id,customVoiceOperationId:q.id};
  await assert.rejects(service.quote({actorContext:{userId:'other'},snapshot:speech}),{code:'speech_custom_voice_unavailable'});
  const sq=await service.quote({actorContext,snapshot:speech});
  const spoken=await service.generate({actorContext,snapshot:speech,quoteId:sq.id,requestId:'speech_custom'});
  await assert.rejects(service.deleteDesignedVoice({actorContext,id:q.id}),{code:'speech_voice_in_use'});
  await queue.jobs.get(spoken.id).execute();assert.equal(dispatchedVoice,'voice_designed');
  await service.deleteDesignedVoice({actorContext,id:q.id});await service.deleteDesignedVoice({actorContext,id:q.id});assert.equal(deleted,1);
  await assert.rejects(service.quote({actorContext,snapshot:speech}),{code:'speech_custom_voice_unavailable'});
});
test('WAV validation rejects malformed sizes/format and reads PCM metadata', () => {
  assert.equal(inspectWav(wav()).sampleRateHz, 24000);
  assert.throws(() => inspectWav(Buffer.alloc(44)));
  const bad = wav(); bad.writeUInt32LE(48000, 24); assert.throws(() => inspectWav(bad));
  assert.throws(() => inspectWav(wav().subarray(0, 46)));
});
test('pricing changes on effective date, snapshots rates and rejects invalid budgets', () => {
  const base = { profitMarkupPercentByMedia: { text: 30, image: 30, video: 30 }, pricingFxThbPerUsd: 35,
    operatingSafetyBufferRate: .15, creditsPerThbAssumption: 10, creditRoundingIncrement: 5,
    policyVersion: 'test', speechGeneration: { rates: [
      { modelId: snapshot.modelId, effectiveAt: '2026-11-01', until: '2027-01-01', inputUsdPerMillion: .5, outputUsdPerMillion: 9 },
      { modelId: snapshot.modelId, effectiveAt: '2027-01-01', until: '2027-04-01', inputUsdPerMillion: 1, outputUsdPerMillion: 18 }] } };
  const input = { modelId: snapshot.modelId, inputTokens: 8192, outputTokens: 16384 };
  const before = quoteSpeechPrice(base, input, Date.parse('2026-11-15')), after = quoteSpeechPrice(base, input, Date.parse('2027-01-01'));
  assert.equal(after.providerCostUsd, before.providerCostUsd * 2);
  assert.equal(before.billingMode, 'actual_usage_capped');
  const actual = settleSpeechPrice(before, { total_input_tokens: 100, total_output_tokens: 250 });
  assert.ok(actual.amountCredits < before.totalCredits);
  base.pricingFxThbPerUsd = 999;
  assert.deepEqual(settleSpeechPrice(before, { total_input_tokens: 100, total_output_tokens: 250 }), actual);
  assert.throws(() => settleSpeechPrice(before, null));
  assert.throws(() => settleSpeechPrice(before, { input_tokens: -1, output_tokens: 250 }));
  assert.throws(() => settleSpeechPrice(before, { input_tokens: 100, output_tokens: 999999 }));
  assert.throws(() => quoteSpeechPrice(base, { ...input, inputTokens: NaN }));
});
test('adapter sends style metadata, saves unary WAV without header wrapping and rejects malformed response', async () => {
  let payload;
  const provider = new GeminiSpeechProvider({ apiKey: 'test-key', fetchImpl: async (_url, request) => {
    payload = JSON.parse(request.body);
    return new Response(JSON.stringify({ steps: [{ type: 'model_output', content: [{ type: 'audio', mime_type: 'audio/wav', data: wav().toString('base64') }] }] }));
  } });
  const prepared = compileSpeechRequest(snapshot, loadSpeechCatalog());
  const result = await provider.generate(prepared.snapshot, prepared.model);
  assert.deepEqual(result.bytes, wav()); assert.equal(payload.input[0].content[0].text, snapshot.text);
  assert.equal(payload.input[0].content[0].annotations[0].style, 'happy'); assert.equal(payload.store, false);
});
test('durable speech duplicate admission dispatches once; private reads and changed-input replay reject', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'speech-test-'));
  try {
    let calls = 0, captures = 0; const queue = { jobs: new Map(), enqueueOperation(operation) { this.jobs.set(operation.id, operation); } };
    const service = new SpeechGenerationService({ repository: new SpeechOperationRepository({ filename: path.join(directory, 'operations.json') }), queue,
      credits: { quoteSpeech: async () => ({ totalCredits: 5, expiresAt: new Date(Date.now() + 60000).toISOString() }),
        reserveSpeech: async () => ({ reservation: { reservationId: 'reservation' } }), captureSpeech: async () => { captures++; } },
      available: () => {}, provider: { generate: async () => { calls++; return { bytes: wav(), usage: null }; } },
      assets: { register: async () => ({ outputAssetId: 'asset', outputUrl: '/outputs/voice-studio/test.wav', durationMs: 1 }) } });
    const quote = await service.quote({ actorContext, snapshot });
    const input = { actorContext, snapshot, quoteId: quote.id, requestId: 'request_123' };
    const result = await service.generate(input); assert.equal(result.status, 'queued');
    assert.equal((await service.generate(input)).id, result.id);
    assert.equal(queue.jobs.size, 1); await queue.jobs.get(result.id).execute(); assert.equal(calls, 1); assert.equal(captures, 1);
    assert.equal((await service.read({ actorContext, id: result.id })).status, 'succeeded');
    await assert.rejects(service.read({ actorContext: { userId: 'other' }, id: result.id }), { code: 'speech_not_found' });
    await assert.rejects(service.generate({ ...input, snapshot: { ...snapshot, text: 'changed' } }), { code: 'speech_request_conflict' });
  } finally { await rm(directory, { recursive: true, force: true }); }
});
test('unknown provider outcome stays reconciliable and never triggers automatic refund/redispatch', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'speech-unknown-'));
  try {
    let refund = 0; const repo = new SpeechOperationRepository({ filename: path.join(directory, 'operations.json') });
    const record = { id: 'speech_id', ownerUserId: 'actor', status: 'queued', snapshot, model: loadSpeechCatalog().models[0], reservationId: 'reserved' };
    await repo.mutate(records => records.push(record));
    const service = new SpeechGenerationService({ repository: repo, available: () => {}, provider: { generate: async () => { throw new Error('private details'); } },
      credits: { refundForJob: async () => { refund++; } } });
    const result = await service.execute(record, actorContext);
    assert.equal(result.status, 'reconciliation_required'); assert.equal(result.errorCode, 'speech_failed'); assert.equal(refund, 0);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('speech actual capture releases unused reservation once and rejects another owner', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'speech-credits-'));
  t.after(()=>rm(directory,{recursive:true,force:true}));
  const databaseFile=path.join(directory,'credits.json');
  await writeFile(databaseFile,JSON.stringify({schemaVersion:2,accounts:[{userId:'actor',username:'actor',availableCredits:1000,reservedCredits:0,status:'active'}],estimates:[],reservations:[],ledgerEntries:[]}));
  const repository=new CreditAccountRepository({databaseFile,userRepository:{findById:async()=>null,findByUsername:async()=>null}});
  const credits=new CreditApplicationService({accountRepository:repository});
  const policy={profitMarkupPercentByMedia:{text:30,image:30,video:30},pricingFxThbPerUsd:35,operatingSafetyBufferRate:.15,creditsPerThbAssumption:10,creditRoundingIncrement:5,
    policyVersion:'test',speechGeneration:{rates:[{modelId:snapshot.modelId,effectiveAt:'2026-11-01',until:'2027-01-01',inputUsdPerMillion:.5,outputUsdPerMillion:9}]}};
  const quote=quoteSpeechPrice(policy,{modelId:snapshot.modelId,inputTokens:8192,outputTokens:16384},Date.parse('2026-11-15'));
  const reserved=await credits.reserveSpeech({userId:'actor',operationId:'speech-test',quote});
  const input={userId:'actor',operationId:'speech-test',reservationId:reserved.reservation.reservationId,usage:{total_input_tokens:100,total_output_tokens:250},providerResponseId:'provider-id'};
  await assert.rejects(credits.captureSpeech({...input,userId:'other'}));
  await assert.rejects(credits.captureSpeech({...input,usage:null}));
  const first=await credits.captureSpeech(input), replay=await credits.captureSpeech(input);
  const actual=settleSpeechPrice(quote,input.usage).amountCredits;
  assert.equal(first.account.availableCredits,1000-actual);
  assert.equal(first.account.reservedCredits,0);
  assert.equal(replay.account.availableCredits,first.account.availableCredits);
  assert.equal((await repository.readRaw()).ledgerEntries.filter(e=>e.operationType==='capture').length,1);
});

test('definitive provider rejection releases reservation and terminates failure',async t=>{
  const directory=await mkdtemp(path.join(os.tmpdir(),'speech-reject-'));t.after(()=>rm(directory,{recursive:true,force:true}));
  const repo=new SpeechOperationRepository({filename:path.join(directory,'operations.json')});
  const record={id:'rejected',ownerUserId:'actor',snapshot,model:loadSpeechCatalog().models[0],reservationId:'reserved'};
  await repo.mutate(records=>records.push(record));let refunded=0;
  const service=new SpeechGenerationService({repository:repo,available:()=>{},provider:{generate:async()=>{throw Object.assign(new Error('Rejected'),{code:'speech_provider_http_429'});}},credits:{refundForJob:async()=>{refunded++;}}});
  const result=await service.execute(record,actorContext);
  assert.equal(result.status,'failed');assert.equal(refunded,1);
  service.credits.refundForJob=async()=>{throw new Error('storage unavailable');};
  const pending=await service.execute(record,actorContext);
  assert.equal(pending.status,'reconciliation_required');assert.equal(pending.errorCode,'speech_refund_pending');
});

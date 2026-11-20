import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { VoiceStudioRepository } from '../server/repositories/voice-studio/VoiceStudioRepository.js';
import { VoiceStudioApplicationService } from '../server/domain/voice-studio/VoiceStudioApplicationService.js';
import { SpeechGenerationService } from '../server/domain/generation/SpeechGenerationService.js';
import { SpeechOperationRepository } from '../server/repositories/generation/SpeechOperationRepository.js';
import { loadSpeechCatalog } from '../server/domain/generation/SpeechCatalog.js';

async function fixture(t) {
  const dir = await mkdtemp(path.join(tmpdir(),'voice-studio-'));
  t.after(()=>rm(dir,{recursive:true,force:true}));
  const repository = new VoiceStudioRepository({files:Object.fromEntries(['documents','characters','takes','customVoices'].map(k=>[k,path.join(dir,`${k}.json`)]))});
  const catalog = {defaultModelId:'tts',models:[{id:'tts'}],voices:[{id:'Kore'}],policy:{maxRows:100,maxTextLength:2000,maxStyleLength:400,pageSize:20,maxPageSize:50,maxTitleLength:120,maxDesignLength:1000}};
  const calls = [];
  const service = new VoiceStudioApplicationService({repository,generation:{speechCatalog:()=>catalog,listSpeechOperations:()=>[],quoteSpeech:input=>input},audioAssets:{remove:input=>calls.push(input)}});
  return {service,repository,calls};
}
const actor = {userId:'a',username:'actor-a'};
test('dubbing can assign only an active character owned by the project actor',async t=>{
  const {service,repository}=await fixture(t);
  const character=await repository.insert('characters',actor.userId,{name:'Narrator'});
  assert.deepEqual(await service.getDubCharacter(actor,character.id),{id:character.id,name:'Narrator'});
  await assert.rejects(service.getDubCharacter({userId:'other'},character.id),{code:'voice_record_not_found'});
  await repository.update('characters',character.id,actor.userId,character.revision,row=>{row.archivedAt='archived';});
  await assert.rejects(service.getDubCharacter(actor,character.id),{code:'voice_record_not_found'});
});
test('application design to saved voice to two dialogue rows reuses identity without generation on listen/save',async t=>{
  const dir=await mkdtemp(path.join(tmpdir(),'voice-integration-'));t.after(()=>rm(dir,{recursive:true,force:true}));
  const repository=new VoiceStudioRepository({files:Object.fromEntries(['documents','characters','takes','customVoices'].map(k=>[k,path.join(dir,`${k}.json`)]))});
  const operations=new SpeechOperationRepository({filename:path.join(dir,'operations.json')});
  const queue={jobs:new Map(),enqueueOperation(op){this.jobs.set(op.id,op);}};
  let designs=0,syntheses=0;
  const speech=new SpeechGenerationService({repository:operations,queue,available:()=>{},
    credits:{quoteSpeech:async()=>({totalCredits:5,expiresAt:new Date(Date.now()+60000).toISOString()}),reserveSpeech:async()=>({reservation:{reservationId:'test-reservation'}}),captureSpeech:async()=>{}},
    assets:{register:async({jobId})=>({outputAssetId:`asset-${jobId}`,outputUrl:`/outputs/voice-studio/${jobId}.wav`,durationMs:1000})},
    provider:{connectionId:()=> 'test-project',createVoice:async()=>{designs++;return {id:'voice_reusable',type:'prompted',usage:{}};},voiceSample:()=>Buffer.alloc(1),
      generate:async(s)=>{assert.equal(s.voiceId,'voice_reusable');syntheses++;return {bytes:Buffer.alloc(1),usage:{}};}}});
  const generation={speechCatalog:()=>loadSpeechCatalog(),quoteVoiceDesign:input=>speech.quote({...input,operation:'voice_design'}),createVoiceDesign:input=>speech.generate({...input,operation:'voice_design'}),
    quoteSpeech:input=>speech.quote(input),generateSpeech:input=>speech.generate(input),readSpeech:input=>speech.read(input),
    listSpeechOperations:async(a)=>(await operations.read()).filter(op=>op.ownerUserId===a.userId).map(op=>speech.publicRecord(op))};
  const s=new VoiceStudioApplicationService({repository,generation});
  const input={name:'Thai narrator',description:'Clear warm Thai voice',language:'th',modelId:loadSpeechCatalog().defaultModelId};
  const quote=await s.quoteCustomVoice(actor,input);
  const queued=await s.createCustomVoice(actor,{...input,quoteId:quote.id,requestId:'design-integration'});
  await queue.jobs.get(queued.id).execute();
  const result=await s.readGeneration(actor,queued.id);
  assert.equal(result.take,undefined);assert.equal(result.customVoice.name,input.name);
  await s.updateCustomVoice(actor,queued.id,{},true);await s.updateCustomVoice(actor,queued.id,{},true);
  assert.equal((await s.listCustomVoices(actor,{saved:'true'})).items.length,1);
  const character=await s.character(actor,{name:'Narrator',voiceKind:'custom',voiceId:queued.id});
  const initial=await s.createDocument(actor,{});
  const doc=await s.updateDocument(actor,initial.id,{expectedRevision:initial.revision,rows:[
    {...initial.rows[0],characterPresetId:character.id,text:'สวัสดีครับ'},
    {...initial.rows[0],id:'second-row',characterPresetId:character.id,text:'พบกันใหม่ครับ'}]});
  for (const row of doc.rows) {
    const q=await s.quote(actor,doc.id,row.id,{expectedRevision:doc.revision});
    const op=await s.generate(actor,doc.id,row.id,{expectedRevision:doc.revision,quoteId:q.id,requestId:`request-${row.id}`});
    await queue.jobs.get(op.id).execute();
    const ready=await s.readGeneration(actor,op.id);assert.equal(ready.take.inputSnapshot.voiceId,queued.id);
  }
  assert.equal(designs,1);assert.equal(syntheses,2);assert.equal((await s.list('takes',actor)).items.length,2);
  assert.equal(JSON.stringify(await s.listCustomVoices(actor)).includes('voice_reusable'),false);
});
test('documents and presets persist and reject cross actor reads and stale writes',async t=>{
  const {service:s} = await fixture(t);
  const c = await s.character(actor,{name:'Actor',voiceId:'Kore'});
  const d = await s.createDocument(actor,{});
  const changed = await s.updateDocument(actor,d.id,{expectedRevision:d.revision,rows:[{...d.rows[0],characterPresetId:c.id,text:'สวัสดี\n<gasp> จริงหรือ',delivery:{emotion:'surprised'}}]});
  assert.equal(changed.rows[0].text,'สวัสดี\n<gasp> จริงหรือ');
  await assert.rejects(s.getDocument({userId:'b'},d.id),{code:'voice_record_not_found'});
  await assert.rejects(s.updateDocument(actor,d.id,{expectedRevision:1}),{code:'voice_revision_conflict'});
  const q = await s.quote(actor,d.id,d.rows[0].id,{expectedRevision:changed.revision});
  assert.equal(q.snapshot.voiceId,'Kore'); assert.equal(q.snapshot.documentRevision,2);
});

test('custom voice save is idempotent, binds only owned saved voices and preserves old prebuilt presets', async t => {
  const {service:s,repository:r} = await fixture(t);
  const op = {id:'custom-design',operation:'voice_design',status:'succeeded',snapshot:{name:'Warm narrator',description:'Warm clear voice',modelId:'tts',providerId:'gemini',language:'th'},outputAssetId:'sample',outputUrl:'/outputs/sample.wav',durationMs:1000};
  await s.project(actor,op);
  assert.equal((await r.list('takes','a')).length,0);
  await assert.rejects(s.character(actor,{name:'Hero',voiceKind:'custom',voiceId:op.id}),{code:'voice_custom_unavailable'});
  await s.updateCustomVoice(actor,op.id,{},true);
  const first = await s.updateCustomVoice(actor,op.id,{},true);
  assert.equal((await r.list('customVoices','a')).length,1);
  const c = await s.character(actor,{name:'Hero',voiceKind:'custom',voiceId:op.id});
  assert.equal(c.schemaVersion,2);
  await assert.rejects(s.character({userId:'b'},{name:'Stolen',voiceKind:'custom',voiceId:op.id}),{code:'voice_record_not_found'});
  await assert.rejects(s.deleteCustomVoice(actor,op.id),{code:'voice_custom_in_use'});
  const renamed = await s.updateCustomVoice(actor,op.id,{expectedRevision:first.revision,name:'Another title'});
  assert.equal(renamed.designPrompt,op.snapshot.description);
  s.generation.listSpeechOperations=()=>[op];
  let inserts=0; const insert=r.insert.bind(r); r.insert=(...args)=>{inserts++;return insert(...args);};
  assert.equal((await s.listCustomVoices(actor,{saved:'true',search:'Another'})).items.length,1);
  assert.equal((await s.listCustomVoices(actor,{saved:'false'})).items.length,0);
  assert.equal(inserts,0,'listing existing projections must not rewrite each voice');
  assert.equal((await s.character(actor,{name:'Old voice',voiceId:'Kore'})).voiceKind,'prebuilt');
});

test('custom deletion retry preserves tombstone and never recreates deleted candidate',async t=>{
  const {service:s,repository:r} = await fixture(t);
  const op={id:'deleting-design',operation:'voice_design',status:'succeeded',snapshot:{name:'Voice',description:'Soft',modelId:'tts',language:'th'},outputAssetId:'asset'};
  await s.project(actor,op);
  let calls=0;
  s.generation.deleteVoiceDesign=async()=>{if (++calls===1) throw new Error('Temporary provider error');return {deleted:true};};
  await assert.rejects(s.deleteCustomVoice(actor,op.id));
  await assert.rejects(s.updateCustomVoice(actor,op.id,{},true),{code:'voice_custom_unavailable'});
  await s.deleteCustomVoice(actor,op.id); await s.deleteCustomVoice(actor,op.id);
  await s.project(actor,op);
  assert.equal(calls,2); assert.equal((await r.list('customVoices','a')).length,0);
});
test('generation replay creates one Take; save/rename preserve audio snapshot',async t=>{
  const {service:s} = await fixture(t);
  const d=await s.createDocument(actor,{});
  const op={id:'operation',status:'succeeded',snapshot:{documentId:d.id,rowId:d.rows[0].id,text:'Original',modelId:'tts'},outputAssetId:'asset',outputUrl:'/outputs/voice-studio/asset.wav',durationMs:1000};
  await s.project(actor,op); await s.project(actor,op);
  assert.equal((await s.takes(actor,d.id,d.rows[0].id)).items.length,1);
  assert.equal((await s.getDubTake(actor,op.id)).id,op.id);
  await assert.rejects(s.getSavedTake(actor,op.id),{code:'voice_record_not_found'});
  await assert.rejects(s.getDubTake({userId:'different-owner'},op.id),{code:'voice_record_not_found'});
  const saved=await s.updateTake(actor,op.id,{},true);
  assert.equal((await s.getSavedTake(actor,op.id)).id,op.id);
  const renamed=await s.updateTake(actor,op.id,{expectedRevision:saved.metadataRevision,displayTitle:'Title',tags:['episode1']});
  assert.equal(renamed.inputSnapshot.text,'Original');
  assert.equal((await s.list('takes',actor,{tag:'episode1',saved:'true'})).items.length,1);
});
test('selected Take deletion is blocked and failed generation creates no playable item',async t=>{
  const {service:s,calls} = await fixture(t);
  const d=await s.createDocument(actor,{});
  await s.project(actor,{id:'failed',status:'failed'});
  assert.equal((await s.list('takes',actor)).items.length,0);
  await s.project(actor,{id:'take',status:'succeeded',snapshot:{documentId:d.id,rowId:d.rows[0].id,text:'Test'},outputAssetId:'asset',outputUrl:'/outputs/a.wav',durationMs:1000});
  const selected=await s.select(actor,d.id,d.rows[0].id,{takeId:'take',expectedRevision:1});
  await assert.rejects(s.deleteTake(actor,'take'),{code:'voice_take_in_use'});
  assert.equal(calls.length,0);
  await s.select(actor,d.id,d.rows[0].id,{takeId:null,expectedRevision:selected.revision});
  await s.deleteTake(actor,'take');
  await assert.rejects(s.getDubTake(actor,'take'),{code:'voice_record_not_found'});
  assert.deepEqual(await s.deleteTake(actor,'take'),{deleted:true});
  assert.equal(calls.length,1);
  assert.equal((await s.list('takes',actor)).items.length,0);
});

test('Dub project pins serialize against delete, survive reload and roll back a failed project write',async t=>{
  const {service:s,repository,calls} = await fixture(t);
  for (const id of ['first','second']) {
    await s.project(actor,{id,status:'succeeded',snapshot:{documentId:'doc',rowId:'row',text:'test'},outputAssetId:id,outputUrl:'/outputs/'+id+'.wav',durationMs:1000});
  }
  let start, finish;
  const entered=new Promise(resolve=>{start=resolve;});
  const hold=new Promise(resolve=>{finish=resolve;});
  const save=s.withDubTakePins(actor,'project',['first'],async()=>{start();await hold;});
  await entered;
  const deletion=assert.rejects(s.deleteTake(actor,'first'),{code:'voice_take_in_use'});
  finish(); await save; await deletion;
  const recovered=new VoiceStudioApplicationService({repository,audioAssets:s.audioAssets});
  await assert.rejects(recovered.deleteTake(actor,'first'),{code:'voice_take_in_use'});
  await assert.rejects(recovered.withDubTakePins(actor,'project',['second'],async()=>{throw Error('stale');}),/stale/);
  await assert.rejects(recovered.deleteTake(actor,'first'),{code:'voice_take_in_use'});
  assert.equal(calls.length,0);
  await recovered.deleteTake(actor,'second');
  await assert.rejects(recovered.withDubTakePins(actor,'project',['second'],async()=>assert.fail()),{code:'voice_record_not_found'});
  await recovered.withDubTakePins(actor,'another-project',['first'],async()=>{});
  await recovered.withDubTakePins(actor,'project',[],async()=>{});
  await assert.rejects(recovered.deleteTake(actor,'first'),{code:'voice_take_in_use'});
  await recovered.withDubTakePins(actor,'another-project',[],async()=>{});
  await recovered.deleteTake(actor,'first');
  assert.equal(calls.length,2);
});

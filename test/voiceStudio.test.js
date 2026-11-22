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
import { SeedSpeechProvider } from '../server/providers/SeedSpeechProvider.js';

test('suggesting a voice profile uses only the text director, validates inputs and isolates pending work', async () => {
  const admin = {userId:'operator',role:'admin',authMode:'development_bypass'};
  const body = {language:'th', voiceGender:'female', locale:'en', role:'A young physician',genre:'period'};
  const calls = [];
  let complete;
  const seedProvider = new SeedSpeechProvider({director:{voiceDirection:request=>{
    calls.push(request);
    return new Promise(resolve=>{complete=resolve;});
  }},fetchImpl:()=>assert.fail('Unexpected speech request')});
  const service = new SpeechGenerationService({seedProvider,runtime:()=>({enabled:true,actorId:'operator',role:'admin',liveGeneration:true})});
  await assert.rejects(service.suggestVoiceDescription({...admin,userId:'other'},body),{code:'dub_scene_access_denied'});
  await assert.rejects(service.suggestVoiceDescription(admin,{...body,role:'x'.repeat(1001)}),{code:'voice_invalid_input'});
  const pending=service.suggestVoiceDescription(admin,body);
  assert.equal(calls[0].input.role,body.role);
  assert.equal(calls[0].input.locale,'en');
  assert.equal(calls[0].input.language,'th');
  assert.deepEqual(calls[0].schema.required,['description','sampleText']);
  await assert.rejects(service.suggestVoiceDescription(admin,body),{code:'speech_actor_busy'});
  const suggestion={description:'Soft voice with precise Thai diction.',sampleText:'ท่านนั่งลงก่อน ข้าขอดูแผลสักครู่'};
  complete(suggestion);
  assert.deepEqual(await pending,suggestion);
  const second=service.suggestVoiceDescription(admin,{language:'en',voiceGender:'unspecified',locale:'en'});
  complete({description:'x'.repeat(851),sampleText:'Hello.'});
  await assert.rejects(second,{code:'speech_direction_invalid'});
  const incomplete=service.suggestVoiceDescription(admin,body);
  complete({description:'Quiet.'});
  await assert.rejects(incomplete,{code:'speech_direction_invalid'});
  assert.equal(calls.length,3);
});

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
test('audio script lists filter owned documents before pagination and keep existing documents readable', async t => {
  const {service} = await fixture(t);
  service.generation.speechCatalog = loadSpeechCatalog;
  const create = title => service.createDocument(actor, {kind:'audio-script', title, language:'th'});
  const one = await create('A');
  const legacy = await service.createDocument(actor, {title:'B'});
  const two = await create('C');
  await service.createDocument({userId:'other'}, {kind:'audio-script', title:'D', language:'en'});
  const query = {kind:'audio-script', sort:'name', limit:1};
  const page = await service.list('documents', actor, query);
  assert.deepEqual(page.items.map(d => d.id), [one.id]);
  assert.equal(page.nextCursor, one.id);
  const next = await service.list('documents', actor, {...query, cursor:page.nextCursor});
  assert.deepEqual(next.items.map(d => d.id), [two.id]);
  assert.equal(next.nextCursor, null);
  assert.equal((await service.getDocument(actor, legacy.id)).kind, undefined);
  assert.equal(one.modelId, 'dola-seed-audio');
  assert.equal(one.rows[0].pauseAfterMs, 0);
  assert.equal(one.rows[0].selectedTakeCurrent, false);
  await assert.rejects(service.createDocument(actor,{kind:'audio-script',language:'unsupported'}),{code:'voice_model_unavailable'});
  await assert.rejects(service.createDocument(actor,{kind:'wrong'}),{code:'voice_invalid_document_kind'});
  await assert.rejects(service.archive('documents',actor,one.id,true,one.revision+1),{code:'voice_revision_conflict'});
  await service.archive('documents',actor,one.id,true,one.revision);
  assert.deepEqual((await service.list('documents',actor,query)).items.map(d=>d.id), [two.id]);
});

test('audio script edits retain takes, require explicit reacceptance and recover an active row by ID', async t => {
  const {service, repository} = await fixture(t);
  service.generation.speechCatalog = loadSpeechCatalog;
  const createPreset = async name => {
    const preset = await repository.insert('customVoices', actor.userId, {name, modelId:'dola-seed-audio', language:'th',
      operationId:`saved-${name}`, savedAt:new Date().toISOString()});
    return service.character(actor,{name,voiceKind:'custom',voiceId:preset.id});
  };
  const narrator = await createPreset('Narrator');
  const hero = await createPreset('Hero');
  const guest = await createPreset('Guest');
  let doc = await service.createDocument(actor,{kind:'audio-script',title:'Encounter',language:'th'});
  const row = doc.rows[0];
  const save = async rows => { doc = await service.updateDocument(actor, doc.id, {expectedRevision:doc.revision, rows}); };
  await save([narrator,hero,guest].map((speaker,i) => ({...row,id:speaker.id,characterPresetId:speaker.id,
    text:['The door opens.', 'Who goes there?', 'You?'][i],delivery:{emotion:i === 2 ? 'surprised' : 'neutral'},
    pauseAfterMs:i*150,audioConfig:{speech_rate:-10,loudness_rate:20,pitch_rate:2}})));
  const originalInput = await service.snapshot(actor,doc.id,guest.id,doc.revision);
  const take = await repository.insert('takes',actor.userId,{documentId:doc.id,rowId:guest.id,inputSnapshot:originalInput});
  const select = async () => { doc = await service.select(actor,doc.id,guest.id,{expectedRevision:doc.revision,takeId:take.id}); };
  doc = await service.select(actor,doc.id,guest.id,{expectedRevision:doc.revision,takeId:take.id,matchingInputOnly:true});
  const guestRow = () => doc.rows.find(r => r.id === guest.id);
  assert.equal(guestRow().selectedTakeCurrent,true);
  assert.equal(guestRow().acceptedInputKey, undefined);
  await save([guestRow(),...doc.rows.slice(0,2)].map(r=>({...r,pauseAfterMs:1000})));
  assert.equal(guestRow().selectedTakeCurrent,true);
  const quote = await service.quote(actor,doc.id,guest.id,{expectedRevision:doc.revision});
  assert.equal(quote.snapshot.voiceId,guest.voiceId);
  assert.equal(quote.snapshot.customVoiceOperationId,'saved-Guest');
  assert.equal(quote.snapshot.documentKind,'audio-script');
  assert.deepEqual(quote.snapshot.audioConfig, guestRow().audioConfig);
  assert.equal(quote.snapshot.pauseAfterMs, undefined);
  for (const edit of [
    {text:'Really?'}, {delivery:{emotion:'calm'}}, {audioConfig:{pitch_rate:-3}}, {characterPresetId:hero.id},
  ]) {
    const oldRevision=doc.revision;
    await save(doc.rows.map(r=>r.id===guest.id ? {...r,...edit,selectedTakeCurrent:true} : r));
    assert.equal(guestRow().selectedTakeId,take.id);
    assert.equal(guestRow().selectedTakeCurrent,false);
    await assert.rejects(service.select(actor,doc.id,guest.id,{takeId:take.id,expectedRevision:oldRevision}),{code:'voice_revision_conflict'});
    await select();
    assert.equal(guestRow().selectedTakeCurrent,true);
  }
  service.generation.listSpeechOperations = () => [{id:'pending-hero',status:'queued',snapshot:{documentId:doc.id,rowId:hero.id}}];
  doc = await service.getDocument(actor,doc.id);
  assert.deepEqual(doc.rows.map(r=>r.id),[guest.id,narrator.id,hero.id]);
  assert.equal(doc.rows[2].activeOperationId,'pending-hero');
  assert.equal(guestRow().selectedTakeCurrent,true);
  await assert.rejects(save(doc.rows.slice(0,2)),{code:'voice_row_has_active_job'});
  await assert.rejects(save(doc.rows.map(r=>({...r,pauseAfterMs:10001}))),{code:'voice_invalid_pause'});
  await assert.rejects(save(doc.rows.map(r=>({...r,audioConfig:{pitch_rate:-13}}))),{code:'speech_invalid_audio_config'});
  await assert.rejects(service.select(actor,doc.id,narrator.id,{expectedRevision:doc.revision,takeId:take.id}),{code:'voice_invalid_take'});
  await service.character(actor,{expectedRevision:hero.revision,voiceId:narrator.voiceId},hero.id);
  assert.equal((await service.getDocument(actor,doc.id)).rows[0].selectedTakeCurrent,false);
  await assert.rejects(service.select(actor,doc.id,guest.id,{expectedRevision:doc.revision,takeId:take.id,matchingInputOnly:true}),{code:'voice_take_stale'});
  await select();
  assert.equal(guestRow().selectedTakeCurrent,true);
  const revision = doc.revision;
  const generate = () => service.generate(actor,doc.id,guest.id,{expectedRevision:revision});
  for (const [change,code] of [[{archivedAt:'archived'},'voice_custom_unavailable'],
    [{archivedAt:null,language:'en'},'dub_voice_required'],[{language:'th',modelId:'gemini-3.8-flash-tts'},'dub_voice_required']]) {
    await repository.update('customVoices',narrator.voiceId,actor.userId,undefined,r=>Object.assign(r,change));
    await assert.rejects(generate(),{code});
  }
  await repository.update('characters',hero.id,actor.userId,undefined,r=>Object.assign(r,{voiceId:'Kore',voiceKind:'prebuilt'}));
  await assert.rejects(generate(),{code:'dub_voice_required'});
});
test('row take numbers survive deletion, retries and reload, with newest first', async t => {
  const {repository} = await fixture(t);
  const add = (id, rowId='line', owner=actor.userId) =>
    repository.insert('takes', owner, {id, documentId:'th', rowId});
  await add('one');
  assert.equal((await add('unrelated','another-line')).takeNumber,1);
  assert.equal((await add('other-owner','line','other')).takeNumber,1);
  await add('two');
  await add('three');
  await repository.update('takes','three',actor.userId,undefined,take=>{take.deletedAt='deleted';});
  assert.equal((await add('four')).takeNumber,4);
  assert.equal((await add('two')).takeNumber,2);
  const reopened = new VoiceStudioRepository({files:repository.files});
  const takes = await reopened.rowTakes(actor.userId,'th','line');
  assert.deepEqual(takes.map(take=>[take.id,take.takeNumber]),[['four',4],['two',2],['one',1]]);
});
test('new Seed casting assignments respect the saved language', async t => {
  const {service, repository} = await fixture(t);
  const preset = await repository.insert('customVoices', actor.userId, {
    savedAt: new Date().toISOString(), language: 'th', modelId: 'dola-seed-audio'
  });
  const character = await repository.insert('characters', actor.userId, {name:'Guest', voiceKind:'custom', voiceId:preset.id});
  assert.equal((await service.getDubCharacter(actor, character.id, 'th')).id, character.id);
  await assert.rejects(service.getDubCharacter(actor, character.id, 'en'), { code:'voice_language_mismatch' });
});
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
  const speechWindows=[{startMs:200,endMs:850},{startMs:1200,endMs:2300}];
  const changed = await s.updateDocument(actor,d.id,{expectedRevision:d.revision,rows:[{...d.rows[0],characterPresetId:c.id,targetDurationMs:2400,speechWindows,text:'สวัสดี\n<gasp> จริงหรือ',delivery:{emotion:'surprised'}}]});
  assert.equal(changed.rows[0].text,'สวัสดี\n<gasp> จริงหรือ');
  await assert.rejects(s.getDocument({userId:'b'},d.id),{code:'voice_record_not_found'});
  await assert.rejects(s.updateDocument(actor,d.id,{expectedRevision:1}),{code:'voice_revision_conflict'});
  const q = await s.quote(actor,d.id,d.rows[0].id,{expectedRevision:changed.revision});
  assert.equal(q.snapshot.voiceId,'Kore'); assert.equal(q.snapshot.documentRevision,2);
  assert.equal(q.snapshot.targetDurationMs,2400);
  assert.deepEqual(q.snapshot.speechWindows,speechWindows);
});

test('custom voice save is idempotent, binds only owned saved voices and preserves old prebuilt presets', async t => {
  const {service:s,repository:r} = await fixture(t);
  const op = {id:'custom-design',operation:'voice_design',status:'succeeded',snapshot:{name:'Warm narrator',description:'Warm clear voice',modelId:'tts',providerId:'gemini',language:'th'},outputAssetId:'sample',outputUrl:'/outputs/sample.wav',durationMs:1000};
  await s.project(actor,op);
  assert.equal((await r.list('takes','a')).length,0);
  await assert.rejects(s.character(actor,{name:'Hero',voiceKind:'custom',voiceId:op.id}),{code:'voice_custom_unavailable'});
  await s.updateCustomVoice(actor,op.id,{},true);
  const first = await s.updateCustomVoice(actor,op.id,{},true);
  const cleanup = t.mock.fn();
  s.generation.deleteVoiceDesign = cleanup;
  await assert.rejects(s.deleteCustomVoice(actor,op.id,{onlyIfUnsaved:true}),{code:'voice_revision_conflict'});
  assert.equal(cleanup.mock.callCount(),0);
  assert.equal((await r.list('customVoices','a')).length,1);
  const c = await s.character(actor,{name:'Hero',voiceKind:'custom',voiceId:op.id});
  assert.equal(c.schemaVersion,2);
  await assert.rejects(s.character({userId:'b'},{name:'Stolen',voiceKind:'custom',voiceId:op.id}),{code:'voice_record_not_found'});
  await assert.rejects(s.deleteCustomVoice(actor,op.id),{code:'voice_custom_in_use'});
  await assert.rejects(s.deleteCustomVoice(actor,op.id,{retireLinkedCharacters:true}),{code:'voice_custom_in_use'});
  const renamed = await s.updateCustomVoice(actor,op.id,{expectedRevision:first.revision,name:'Another title'});
  assert.equal(renamed.designPrompt,op.snapshot.description);
  s.generation.listSpeechOperations=()=>[op];
  let inserts=0; const insert=r.insert.bind(r); r.insert=(...args)=>{inserts++;return insert(...args);};
  assert.equal((await s.listCustomVoices(actor,{saved:'true',search:'Another'})).items.length,1);
  assert.equal((await s.listCustomVoices(actor,{saved:'false'})).items.length,0);
  assert.equal(inserts,0,'listing existing projections must not rewrite each voice');
  assert.equal((await s.character(actor,{name:'Old voice',voiceId:'Kore'})).voiceKind,'prebuilt');
});

test('Seed candidate expiry removes only unsaved designs belonging to the listing actor', async t => {
  const { service, repository } = await fixture(t);
  service.generation.speechCatalog = loadSpeechCatalog;
  const old = new Date(Date.now() - 48 * 3600000).toISOString();
  const saved = { id:'seed-saved', operation:'voice_design', status:'succeeded', createdAt:new Date().toISOString(),
    snapshot:{name:'Private narrator', description:'Warm', sourceType:'reference', retainOriginal:true, language:'th', modelId:'dola-seed-audio'} };
  await service.project(actor, saved);
  await service.updateCustomVoice(actor, saved.id, {}, true);
  await repository.update('customVoices', saved.id, actor.userId, undefined, item => { item.candidateExpiresAt = old; });
  await service.project(actor, {...saved, id:'seed-expired', createdAt:old});
  await service.project({userId:'other'}, {...saved, id:'other-expired', createdAt:old});
  const deleted = [];
  service.generation.deleteVoiceDesign = async ({actorContext, id}) => deleted.push([actorContext.userId, id]);
  await assert.rejects(service.updateCustomVoice(actor, 'seed-expired', {}, true), {code:'voice_custom_unavailable'});
  const list = await service.listCustomVoices(actor, {saved:'true'});
  assert.deepEqual(list.items.map(v => v.id), [saved.id]);
  assert.deepEqual(deleted, [[actor.userId, 'seed-expired']]);
  assert.equal((await repository.list('customVoices', 'other')).length, 1);
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

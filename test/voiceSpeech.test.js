import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile, readFile, readdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { compileSpeechRequest, compileVoiceDesign } from '../server/domain/generation/SpeechRequestCompiler.js';
import { loadSpeechCatalog } from '../server/domain/generation/SpeechCatalog.js';
import { inspectWav, normalizeSeedWav, trimSilentCueTail, alignCueSpeech, AudioAssetService } from '../server/domain/assets/AudioAssetService.js';
import { quoteSpeechPrice, settleSpeechPrice } from '../server/domain/credits/SpeechPricing.js';
import { GeminiSpeechProvider } from '../server/providers/GeminiSpeechProvider.js';
import { SeedSpeechProvider } from '../server/providers/SeedSpeechProvider.js';
import { directSeedAudition } from '../server/domain/generation/SeedAuditionDirection.js';

test('a rejected Luna request still prepares the original Thai audition for Seed', async () => {
  const model = loadSpeechCatalog().models.find(m => m.id === 'dola-seed-audio');
  const input = {name:'เสี่ยวเหมย', language:'th', voiceGender:'female', sourceType:'description',
    description:'A soft, warm voice.', sampleText:'คุณชายผู้นั้น... เหตุใดข้าจึงเฝ้าคิดถึงแต่ท่านนะ'};
  const snapshot = await directSeedAudition(input, model, {voiceDirection: async () => {
    throw Object.assign(new Error('Access denied'), {isProviderError:true, status:403});
  }}, async () => ({voiceProfile:input.description, scene:'Inside an inn.', actingDirection:'Speak softly.', durationSeconds:5}));
  assert.equal(snapshot.directionSource, 'gemini');
  assert.ok(snapshot.providerPrompt.endsWith('Professional Thai dubbing.'));
  assert.ok(snapshot.providerPrompt.includes(JSON.stringify(input.sampleText)));
  assert.ok(snapshot.providerPrompt.includes(input.description));
  assert.doesNotMatch(snapshot.providerPrompt.replace(JSON.stringify(input.sampleText), ''), /\p{Script=Thai}/u);
  const unavailable = {voiceDirection: async () => {
    throw Object.assign(new Error(), {isProviderError:true});
  }};
  const style = 'Professional Thai romantic-drama dubbing.';
  const {snapshot: compiled} = compileVoiceDesign({...input, modelId:model.id, genre:'romance'}, loadSpeechCatalog());
  const fromGenre = await directSeedAudition(compiled,model,{voiceDirection:async()=>({
    voiceProfile:'A clear warm voice.',scene:'Inside an inn.',actingDirection:'Speak softly.',durationSeconds:5
  })});
  assert.equal(compiled.description,input.description);
  assert.ok(fromGenre.voiceProfile.endsWith(style));
  assert.ok(fromGenre.providerPrompt.endsWith(style));
  const thaiInput = {...input, description:'เสียงนุ่ม ' + style};
  const translated = await directSeedAudition(thaiInput, model, unavailable, async request => {
    assert.equal(request.input.description, thaiInput.description);
    assert.equal(request.input.sampleText, thaiInput.sampleText);
    assert.equal(request.model, 'gemini-3.5-flash-lite');
    return {voiceProfile:'A soft voice.', scene:'Inside an inn.', actingDirection:'Speak softly.', durationSeconds:5};
  });
  assert.equal(translated.directionSource, 'gemini');
  assert.equal(translated.voiceProfile, 'A soft voice.\n' + style);
  assert.ok(translated.providerPrompt.includes(translated.voiceProfile + '\n\nSCENE:'));
  assert.ok(translated.providerPrompt.endsWith('\n' + style));
  const directed = await directSeedAudition(thaiInput, model, {voiceDirection: async () => ({
    voiceProfile:'A warm voice. ' + style, scene:'A private chamber.', actingDirection:'Speak softly.', durationSeconds:5
  })});
  assert.ok(directed.providerPrompt.endsWith('\n' + style));
  assert.equal(directed.voiceProfile, 'A warm voice. ' + style);
  assert.ok(translated.providerPrompt.includes(JSON.stringify(input.sampleText)));
  assert.doesNotMatch(translated.providerPrompt.replace(JSON.stringify(input.sampleText), ''), /\p{Script=Thai}/u);
  await assert.rejects(directSeedAudition(thaiInput, model, unavailable, async () => { throw new Error('Unavailable'); }),
    {code:'speech_direction_unavailable'});
});
import { SpeechGenerationService } from '../server/domain/generation/SpeechGenerationService.js';
import { SpeechOperationRepository } from '../server/repositories/generation/SpeechOperationRepository.js';
import { AssetRepository } from '../server/repositories/assets/AssetRepository.js';
import { VoiceStudioApplicationService } from '../server/domain/voice-studio/VoiceStudioApplicationService.js';
import { VoiceStudioRepository } from '../server/repositories/voice-studio/VoiceStudioRepository.js';
import { CreditApplicationService } from '../server/domain/credits/CreditApplicationService.js';
import { CreditReservationService } from '../server/domain/credits/CreditReservationService.js';
import { CreditAccountRepository } from '../server/repositories/credits/CreditAccountRepository.js';

const snapshot = { documentId: 'doc', rowId: 'row', modelId: 'gemini-3.8-flash-tts', voiceId: 'Kore', text: 'สวัสดี\n<gasp> จริงหรือ', delivery: { emotion: 'happy' }, language: 'th' };
const actorContext = { userId: 'actor', username: 'actor' };
test('Seed Audio directs the chosen speaker in the requested language and prices original duration', async () => {
  const catalog = loadSpeechCatalog();
  const seedModel = catalog.models.find(m=>m.id==='dola-seed-audio');
  const speaker1 = catalog.voices.find(v=>v.languages?.includes('th'));
  const speaker2 = catalog.voices.find(v=>v.languages?.includes('zh'));
  const first = {...snapshot, text:'สวัสดี', targetDurationMs:2400, modelId:seedModel.id, voiceId:speaker1.id, delivery:{emotion:'sad',intensity:'subtle'}};
  const second = {...first,text:'你好',language:'zh',voiceId:speaker2.id,delivery:{emotion:'happy',pace:'fast'}};
  const requests = [];
  const provider = new SeedSpeechProvider({apiKey:'synthetic',fetchImpl:async(url,options)=>{
    requests.push(options);
    return Response.json({audio:wav().toString('base64'),duration:4,original_duration:7.5,
      subtitle:{sentences:[{start_time:0,end_time:300,text:'line'}]}});
  }});
  for (const s of [first,second]) {
    const compiled = compileSpeechRequest(s,catalog);
    const result = await provider.generate(compiled.snapshot,seedModel,1024,'fixture');
    assert.deepEqual(result.bytes,wav());
    const request = JSON.parse(requests.at(-1).body);
    assert.equal(requests.at(-1).redirect,'error','credentialed requests must refuse all redirects');
    assert.deepEqual(request.references,[{speaker:s.voiceId}]);
    assert.ok(request.text_prompt.includes('@Audio1') && request.text_prompt.includes(s.text) && request.text_prompt.includes(s.delivery.emotion));
    assert.match(request.text_prompt, /\[0\.0s:2\.4s\]/);
    assert.equal(request.model,'seed-audio-1.0-multilingual');
    assert.equal(request.audio_config.format,'wav');
    assert.equal(result.usage.original_duration,7.5);
    assert.equal(result.timing[0].endMs,300);
  }
  assert.throws(()=>compileSpeechRequest({...first,voiceId:speaker2.id},catalog),{code:'speech_invalid_voice_language'});
  assert.throws(()=>compileSpeechRequest({...first,text:'<gasp>'},catalog),{code:'speech_unknown_tag'});
  const policy=JSON.parse(await readFile(new URL('../server/config/credit-pricing-policy.json',import.meta.url),'utf8'));
  const q=quoteSpeechPrice(policy,{modelId:seedModel.id,...seedModel.limits},Date.parse('2026-11-20'));
  assert.equal(q.providerId,seedModel.providerId);
  assert.equal(q.providerCostUsd,.3);
  const settled=settleSpeechPrice(q,{duration:4,original_duration:7.5});
  assert.equal(settled.providerCostUsd,7.5*.0025);
  assert.ok(settled.amountCredits<=q.totalCredits);
  for (const usage of [{duration:4},{original_duration:-1},{original_duration:121}])
    assert.throws(()=>settleSpeechPrice(q,usage),{code:'speech_usage_reconciliation_required'});
  assert.throws(()=>quoteSpeechPrice(policy,{modelId:seedModel.id,...seedModel.limits,operation:'voice_design'},Date.parse('2026-11-20')));
});
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
test('timed takes remove only digital silence beyond the slot and retain metadata', () => {
  const bytes = Buffer.concat([wav().subarray(0,44),Buffer.alloc(2400 * 2),Buffer.from('note\x04\x00\x00\x00tail', 'binary')]);
  bytes.writeUInt32LE(bytes.length - 8, 4); bytes.writeUInt32LE(4800, 40);
  bytes.writeInt16LE(-1300, 44);
  const trimmed = trimSilentCueTail(bytes, 50);
  assert.equal(inspectWav(trimmed).durationMs, 50);
  assert.equal(trimmed.readInt16LE(44), -1300);
  assert.equal(trimmed.subarray(-4).toString(), 'tail');
  bytes.writeInt16LE(1,44 + 1200 * 2);
  assert.equal(trimSilentCueTail(bytes,50), bytes);
});

test('Seed directs approved wording into source speech windows and rejects invalid timing', () => {
  const catalog = loadSpeechCatalog(), modelId='dola-seed-audio';
  const voiceId = catalog.voices.find(v=>v.languages?.includes('th')).id;
  const text = 'คุณชาย… อย่าไปเจ้าค่ะ';
  const base = {...snapshot,text,modelId,voiceId,targetDurationMs:1800};
  const windows = [{startMs:200,endMs:600},{startMs:1000,endMs:1700}];
  const {providerPrompt} = compileSpeechRequest({...base,speechWindows:windows},catalog).snapshot;
  const relaxed=compileSpeechRequest({...base,speechWindows:windows,boundaryTimingOnly:true},catalog).snapshot;
  assert.ok(relaxed.providerPrompt.includes('[0.2s:1.7s]'));
  assert.ok(relaxed.providerPrompt.includes(JSON.stringify(text)));
  assert.ok(!relaxed.providerPrompt.includes('[1s:1.7s]'));
  const free=compileSpeechRequest({...base,boundaryTimingOnly:true},catalog).snapshot;
  assert.match(free.providerPrompt,/DURATION: 1\.8 seconds/);
  assert.match(free.providerPrompt,/Begin speaking immediately.*finish early/);
  assert.ok(!free.providerPrompt.includes('s:'));
  assert.ok(free.providerPrompt.includes(JSON.stringify(text)));
  assert.match(providerPrompt,/\[0.2s:0.6s\]/);
  assert.match(providerPrompt,/\[1s:1.7s\]/);
  assert.equal([...providerPrompt.matchAll(/Say exactly: (".*")/g)].map(m=>JSON.parse(m[1])).join(''),text);
  for (const invalid of [[],[windows[1],windows[0]],[{startMs:0,endMs:1801}],[{startMs:1,endMs:1}]])
    assert.throws(()=>compileSpeechRequest({...base,speechWindows:invalid},catalog),{code:'speech_invalid_input'});
});

test('onset alignment does not double delay, preserves metadata and flags missing pauses or late endings', async () => {
  const windows=[{startMs:300,endMs:600},{startMs:900,endMs:1200}];
  function sample(lead,extra=0) {
    const pcm=Buffer.alloc((lead+900+extra)*48);
    pcm.fill(0x50,lead*48,(lead+300)*48);
    pcm.fill(0x50,(lead+600)*48);
    const result = Buffer.concat([wav().subarray(0,44),pcm,Buffer.from('note\x04\x00\x00\x00meta','binary')]);
    result.writeUInt32LE(result.length-8,4); result.writeUInt32LE(pcm.length,40);
    return result;
  }
  for (const lead of [0,300,500]) {
    const spans=()=>[{startMs:lead,endMs:lead+300},{startMs:lead+600,endMs:lead+900}];
    const output=await alignCueSpeech(sample(lead),windows,256000,spans);
    assert.equal(output.review.status,'matched');
    assert.equal(output.review.shiftMs,300-lead);
    assert.deepEqual(output.bytes,sample(300));
  }
  const combined = await alignCueSpeech(sample(300,300),windows,256000,()=>[{startMs:300,endMs:1500}]);
  assert.deepEqual(combined.review.reasons,['ending','pause']);
  const relaxed=async endMs=>(await alignCueSpeech(sample(300,300),windows,256000,()=>[{startMs:300,endMs}],true)).review;
  assert.equal((await relaxed(1200)).status,'matched');
  assert.deepEqual((await relaxed(1500)).reasons,['ending']);
  const addedPause = await alignCueSpeech(sample(300),[{startMs:300,endMs:1200}],256000,
    ()=>[{startMs:300,endMs:600},{startMs:900,endMs:1200}]);
  assert.deepEqual(addedPause.review.reasons,['pause']);
  const faint=sample(500);
  faint.writeInt16LE(1,44);
  const safe=await alignCueSpeech(faint,windows,256000,()=>[{startMs:500,endMs:800},{startMs:1100,endMs:1400}]);
  assert.equal(safe.bytes,faint);
  assert.ok(safe.review.reasons.includes('onset'));
  const silent=await alignCueSpeech(wav(),windows,256000);
  assert.deepEqual(silent.review.reasons,['unmeasurable']);
});
test('Seed design quotes freeze the source, sample text and voice type; confirmed drafts reuse owned audio for dubbing', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'seed-presets-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const repository = new SpeechOperationRepository({ filename: path.join(root, 'operations.json') });
  const queue = { jobs: new Map(), enqueueOperation(job) { this.jobs.set(job.id, job); } };
  const samples = new Map(), calls = [], captures = [];
  const service = new SpeechGenerationService({ repository, queue, available() {},
    credits: {
      async quoteSpeech(input) {
        assert.equal(input.operation, 'speech'); assert.equal(input.originalSeconds, 120);
        return { totalCredits: 5, expiresAt: new Date(Date.now() + 60000).toISOString() };
      },
      async reserveSpeech({operationId}) {
        const record = await repository.get(operationId, actorContext.userId);
        if (record.snapshot.sourceType) assert.equal((await service.read({actorContext,id:operationId})).status,'admitting');
        return { reservation: { reservationId: 'reserved' } };
      },
      async captureSpeech(input) { captures.push(input); },
    },
    seedProvider: new SeedSpeechProvider({ apiKey: 'fixture', director: {voiceDirection: async ({input, model}) => {
      assert.equal(model, 'gpt-6-luna');
      return {voiceProfile: input.description || 'Follow the reference.', scene: 'A greeting.', actingDirection: 'Warmly.', durationSeconds: 5};
    }}, fetchImpl: async (_url, input) => {
      calls.push(JSON.parse(input.body)); return Response.json({ audio: wav().toString('base64'), original_duration: 1 });
    } }),
    assets: {
      async register({bytes, jobId}) { samples.set(jobId, bytes); return { outputAssetId: jobId, outputUrl: '/test.wav', durationMs: 1 }; },
      async referenceClip(actor, assetId) { assert.equal(actor.userId, actorContext.userId); return samples.get(assetId); },
      async remove({assetId}) { samples.delete(assetId); },
    },
  });
  const design = { modelId: 'dola-seed-audio', name: 'Narrator', description: 'A warm, calm voice.', sampleText: 'Welcome.',
    language: 'en', voiceGender: 'female', sourceType: 'description' };
  const perform = async (payload, operation) => {
    const input = { actorContext, snapshot: payload, operation };
    const q = await service.quote(input);
    assert.equal(calls.length, captures.length, 'quoting does not send audio');
    const request = { ...input, quoteId: q.id, requestId: 'test_' + q.id };
    await assert.rejects(service.generate({ ...request, snapshot: { ...payload, [operation === 'voice_design' ? 'sampleText' : 'text']: 'Different.' } }),
      { code: 'speech_quote_stale' });
    await service.generate(request); await service.generate(request);
    const done = await queue.jobs.get(q.id).execute();
    assert.equal(done.status, 'succeeded'); assert.equal(captures.at(-1).usage.original_duration, 1);
    return q.id;
  };
  await assert.rejects(service.quote({ actorContext, operation:'voice_design', snapshot: { ...design, sourceType:'reference', referenceAudio:'YWJj' } }),
    { code:'speech_invalid_reference' });
  const designed = await perform(design, 'voice_design');
  assert.equal(calls[0].references, undefined); assert.match(calls[0].text_prompt, /A warm, calm voice/);
  assert.ok(calls[0].text_prompt.includes('[0.3s:4.7s] Narrator: "Welcome."'));
  const ref = wav().toString('base64');
  const uploaded = await perform({ ...design, description: '', sourceType: 'reference', referenceAudio: ref }, 'voice_design');
  assert.deepEqual(calls[1].references, [{ audio_data: ref }]); assert.match(calls[1].text_prompt, /@Audio1/);
  assert.ok(!(await readFile(repository.file(), 'utf8')).includes(ref));
  const line = { ...snapshot, text:'The next scene.', voiceKind:'custom', voiceId:designed, modelId:design.modelId,
    language:design.language, customVoiceOperationId:designed };
  await assert.rejects(service.quote({actorContext: { userId:'other' }, snapshot:line}), {code:'speech_custom_voice_unavailable'});
  const timedId = await perform({...line,targetDurationMs:2000,speechWindows:[{startMs:300,endMs:1750}]}, 'speech');
  const timedOp = await service.read({actorContext,id:timedId});
  assert.deepEqual(timedOp.rhythmReview.reasons,['unmeasurable']);
  assert.match(calls[2].text_prompt,/\[0.3s:1.75s\]/);
  assert.deepEqual(calls[2].references, [{ audio_data: ref }]); assert.match(calls[2].text_prompt, /The next scene/);
  assert.equal(calls.length, 3); assert.equal(captures.length, 3);
  assert.equal(samples.has(uploaded + '-reference'), true);
  const original = wav(); original.writeInt16LE(2222, 44);
  const retained = await perform({ ...design, sourceType: 'reference', referenceAudio: original.toString('base64'), retainOriginal: true }, 'voice_design');
  await perform({ ...line, voiceId:retained, customVoiceOperationId:retained }, 'speech');
  assert.deepEqual(calls.at(-1).references, [{ audio_data: original.toString('base64') }]);
  await service.deleteDesignedVoice({ actorContext, id: retained });
  assert.equal(samples.has(retained + '-reference'), false); assert.equal(samples.has(retained), false);
  await service.deleteDesignedVoice({ actorContext, id: uploaded });
  assert.equal(samples.has(uploaded), false); assert.equal(samples.has(uploaded + '-reference'), false);
});
test('private Seed reference reads keep normalized WAV bounded and reject deleted or foreign assets', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'seed-reference-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const repository = new AssetRepository({ assetsFile:path.join(root, 'assets.json') });
  const assets = new AudioAssetService({ repository, outputsDirectory:root });
  const audio = Buffer.concat([wav(), Buffer.alloc(96000)]);
  audio.writeUInt32LE(audio.length - 8, 4); audio.writeUInt32LE(audio.length - 44, 40);
  const { outputAssetId } = await assets.register({ actorContext, bytes:audio, jobId:'design' });
  const clip = await assets.referenceClip(actorContext, outputAssetId, 1, 200000);
  assert.equal(inspectWav(clip).durationMs, 1000);
  await assert.rejects(assets.referenceClip({userId:'other'}, outputAssetId, 1, 200000), {code:'speech_invalid_reference'});
  await assets.remove({ actorContext, assetId:outputAssetId });
  await assert.rejects(assets.referenceClip(actorContext, outputAssetId, 1, 200000), {code:'speech_invalid_reference'});
});

test('confirmed Seed delete retires previous dubbing assignments after active jobs finish and preserves Takes', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'seed-retire-'));
  t.after(() => rm(root, { recursive:true, force:true }));
  const files = Object.fromEntries(['documents','characters','takes','customVoices'].map(key => [key,path.join(root,key+'.json')]));
  const repository = new VoiceStudioRepository({files});
  const operations = new SpeechOperationRepository({filename:path.join(root,'operations.json')});
  const assets = new AudioAssetService({repository:new AssetRepository({assetsFile:path.join(root,'assets.json')}), outputsDirectory:root});
  const speech = new SpeechGenerationService({repository:operations, assets});
  const voice = new VoiceStudioApplicationService({repository, generation:{speechCatalog:loadSpeechCatalog, deleteVoiceDesign:args=>speech.deleteDesignedVoice(args)}});
  const register = jobId => assets.register({actorContext, jobId, bytes:wav()});
  const original = await register('original'), preview = await register('preview'), take = await register('take');
  const model = loadSpeechCatalog().models.find(m => m.adapterKey === 'seed-speech');
  const design = { id:'voice-test', ownerUserId:actorContext.userId, createdAt:new Date().toISOString(), operation:'voice_design', status:'succeeded',
    model, sourceAssetId:original.outputAssetId, ...preview, snapshot:{ name:'Narrator', modelId:model.id, language:'th', sourceType:'reference' } };
  await operations.mutate(items => items.push(design,{id:'active', ownerUserId:actorContext.userId, status:'queued',snapshot:{customVoiceOperationId:design.id}}));
  await voice.project(actorContext, speech.publicRecord(design));
  await voice.updateCustomVoice(actorContext, design.id, {}, true);
  const character = await voice.character(actorContext,{name:'Narrator', voiceId:design.id, voiceKind:'custom'});
  const doc = await voice.createDocument(actorContext,{language:'th', modelId:model.id});
  const assigned = await voice.updateDocument(actorContext,doc.id,{expectedRevision:doc.revision,rows:[{...doc.rows[0],characterPresetId:character.id}]});
  await voice.updateDocument(actorContext,doc.id,{expectedRevision:assigned.revision,rows:[{...assigned.rows[0],characterPresetId:''}]});
  const other = await repository.insert('characters','another',{name:'Unrelated', voiceKind:'custom', voiceId:design.id});
  const request = { retireLinkedCharacters:true };
  await assert.rejects(voice.deleteCustomVoice({userId:'another'},design.id,request), {code:'voice_record_not_found'});
  await assert.rejects(voice.deleteCustomVoice(actorContext,design.id), {code:'voice_custom_in_use'});
  await assert.rejects(voice.deleteCustomVoice(actorContext,design.id,request), {code:'speech_voice_in_use'});
  assert.equal((await voice.customVoices.resolve(actorContext,design.id)).id, design.id);
  assert.equal((await voice.getDubCharacter(actorContext,character.id)).id, character.id);
  assert.deepEqual(await assets.referenceClip(actorContext,original.outputAssetId,30,1024),wav());
  await operations.update('active',actorContext.userId,{status:'succeeded'});
  await voice.deleteCustomVoice(actorContext,design.id,request);
  assert.deepEqual(await voice.deleteCustomVoice(actorContext,design.id,request), {deleted:true});
  await assert.rejects(voice.getDubCharacter(actorContext,character.id), {code:'voice_record_not_found'});
  await assert.rejects(voice.archive('characters',actorContext,character.id,false), {code:'voice_custom_unavailable'});
  assert.equal((await repository.get('characters',other.id,'another')).archivedAt, undefined);
  for (const asset of [original,preview]) await assert.rejects(readFile(path.join(root,asset.outputUrl.replace('/outputs/',''))), {code:'ENOENT'});
  assert.deepEqual(await readFile(path.join(root,take.outputUrl.replace('/outputs/',''))),wav());
});
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

test('rejected Seed creation resumes private reference cleanup without generating again', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'seed-rejected-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const repository = new SpeechOperationRepository({ filename: path.join(directory, 'operations.json') });
  const model = loadSpeechCatalog().models.find(item => item.adapterKey === 'seed-speech');
  const record = { id: 'seed-rejected', operation: 'voice_design', ownerUserId: 'actor', model, reservationId: 'r',
    snapshot: { sourceType: 'reference' }, sourceAssetId: 'original' };
  await repository.mutate(records => records.push(record));
  let calls = 0, removals = 0;
  const service = new SpeechGenerationService({ repository, available: () => {}, credits: { refundForJob: async () => {} },
    assets: { referenceClip: async () => wav(), remove: async () => { if (++removals === 1) throw new Error('Disk unavailable'); } },
    seedProvider: { generate: async () => { calls++; throw Object.assign(new Error(), { code: 'speech_provider_http_400' }); } } });
  assert.equal((await service.execute(record, actorContext)).errorCode, 'speech_design_cleanup_pending');
  assert.equal((await service.read({ actorContext, id:record.id })).errorCode, 'speech_provider_http_400');
  assert.equal((await service.read({ actorContext, id:record.id })).status, 'failed');
  assert.equal(removals, 2);
  assert.equal(calls, 1);
});

test('Seed converts a complete 48 kHz WAV to the library format without changing its duration', async () => {
  const original = Buffer.concat([wav().subarray(0, 44), Buffer.alloc(9600, 7)]);
  original.writeUInt32LE(original.length - 8, 4); original.writeUInt32LE(9600, 40);
  original.writeUInt32LE(48000, 24); original.writeUInt32LE(96000, 28);
  const converted = await normalizeSeedWav(original, 16384);
  assert.deepEqual(inspectWav(converted), {channels:1, sampleRateHz:24000, durationMs:100});
  assert.ok(converted.subarray(44).some(value => value !== 0));
  await assert.rejects(normalizeSeedWav(original.subarray(0, 50), 16384), {code:'speech_invalid_wav'});
});

test('unusable Seed previews release one hold after dispatch or on legacy status reads', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'seed-wav-recovery-'));
  t.after(() => rm(directory, { recursive:true, force:true }));
  const repository = new SpeechOperationRepository({filename:path.join(directory,'ops.json')});
  const databaseFile = path.join(directory,'credits.json');
  await writeFile(databaseFile, JSON.stringify({schemaVersion:2, accounts:[{userId:'actor',availableCredits:100,reservedCredits:0,status:'active'}], estimates:[],reservations:[],ledgerEntries:[]}));
  const accounts = new CreditAccountRepository({databaseFile,userRepository:{findById:async()=>null,findByUsername:async()=>null}});
  const credits = new CreditApplicationService({accountRepository:accounts,reservationService:new CreditReservationService({accountRepo:accounts})});
  let calls = 0;
  const service = new SpeechGenerationService({repository, credits, available() {},
    seedProvider:{generate:async () => { calls++; return {bytes:wav().subarray(0,44),usage:{original_duration:1},providerResponseId:'fixture'}; }}});
  const model = loadSpeechCatalog().models.find(m => m.adapterKey === 'seed-speech');
  for (const id of ['legacy','fresh','unknown','has-output','ordinary']) {
    const {reservation} = await credits.reserveSpeech({userId:'actor',operationId:id,quote:{totalCredits:5,expiresAt:new Date(Date.now()+60000).toISOString()}});
    const record = {id, ownerUserId:'actor',operation:id==='ordinary'?'speech':'voice_design',snapshot:{sourceType:'description'},model,
      reservationId:reservation.reservationId,status:'reconciliation_required',errorCode:id==='unknown'?'speech_provider_outcome_unknown':'speech_invalid_wav',
      outputAssetId:id==='has-output'?'asset':null};
    await repository.mutate(rows => rows.push(record));
    await assert.rejects(service.read({actorContext:{userId:'other'},id}),{code:'speech_not_found'});
    if (id === 'fresh') {
      assert.equal((await service.execute(record, actorContext)).status, 'failed');
      assert.equal((await repository.get(id,'actor')).providerResponseId, 'fixture');
    }
    const results = await Promise.all([service.read({actorContext,id}),service.read({actorContext,id})]);
    assert.ok(results.every(x=>x.status === (['legacy','fresh'].includes(id)?'failed':'reconciliation_required')));
  }
  const ledger = await accounts.readRaw();
  assert.equal(ledger.ledgerEntries.filter(e=>e.reasonCode==='speech_unusable_preview').length, 2);
  assert.equal(ledger.accounts[0].reservedCredits, 15);
  assert.equal(ledger.accounts[0].availableCredits, 85);
  assert.equal(calls, 1);
});

test('restart recovers private input and reservation by owner and job only before Seed dispatch', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(),'seed-interrupt-'));
  t.after(() => rm(root, {recursive:true, force:true}));
  const repository = new SpeechOperationRepository({filename:path.join(root,'ops.json')});
  const assets = new AudioAssetService({repository:new AssetRepository({assetsFile:path.join(root,'assets.json')}),outputsDirectory:root});
  const databaseFile = path.join(root, 'credits.json');
  await writeFile(databaseFile,JSON.stringify({schemaVersion:2,accounts:[{userId:actorContext.userId,username:'actor',availableCredits:1000,reservedCredits:0,status:'active'}],estimates:[],reservations:[],ledgerEntries:[]}));
  const accounts = new CreditAccountRepository({databaseFile,userRepository:{findById:async()=>null,findByUsername:async()=>null}});
  const credits = new CreditApplicationService({accountRepository:accounts,reservationService:new CreditReservationService({accountRepo:accounts})});
  const service = new SpeechGenerationService({repository,assets,credits,queue:{jobs:new Map()}});
  const quote = {totalCredits:5,expiresAt:new Date(Date.now()+60000).toISOString()};
  for (const status of ['admitting','queued','dispatching']) {
    const id = 'seed-' + status;
    const original = await assets.register({actorContext,bytes:wav(),jobId:id+'-reference'});
    await credits.reserveSpeech({userId:actorContext.userId,operationId:id,quote});
    await repository.mutate(records => records.push({id,status,ownerUserId:actorContext.userId,
      operation:'voice_design',admissionProcessId:'previous',snapshot:{sourceType:'reference',retainOriginal:true}}));
    await assert.rejects(service.read({actorContext:{userId:'other'},id}),{code:'speech_not_found'});
    const op = await service.read({actorContext,id});
    assert.equal(op.status, status === 'dispatching' ? 'reconciliation_required' : 'failed');
    const filename = path.join(root,original.outputUrl.replace('/outputs/',''));
    if (status === 'dispatching') assert.deepEqual(await readFile(filename),wav());
    else {
      await assert.rejects(readFile(filename),{code:'ENOENT'});
      assert.equal((await service.read({actorContext,id})).status,'failed');
    }
  }
  const account = (await accounts.readRaw()).accounts[0];
  assert.equal(account.availableCredits,995);
  assert.equal(account.reservedCredits,5);
});

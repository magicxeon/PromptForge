import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createWebNextCreditPolicy } from '../server/middleware/webNextCreditPolicy.js';
import { webNextCreditsDisabled, withWebNextCreditPolicy, workspaceCreditDecision } from '../server/domain/credits/WorkspaceCreditPolicy.js';
import { SpeechGenerationService } from '../server/domain/generation/SpeechGenerationService.js';
import { SpeechOperationRepository } from '../server/repositories/generation/SpeechOperationRepository.js';

function admission({ token, enabled = false, peer = '127.0.0.1', url = '/api/voice-studio/custom-voices', actor = Object.freeze({ userId:'test' }) }) {
  let status = 0;
  const headers = token ? {'x-mpf-web-next-proxy':token} : {};
  const request = { method:url === '/api/web-next/config' ? 'GET' : 'POST', path:url, actorContext:actor, headers, socket:{remoteAddress:peer}, body:{webNextCreditsEnabled:false} };
  const response = {status(value) { status = value; return this; }, json() {}};
  createWebNextCreditPolicy({getKey:() => 'private-test-key', creditsEnabled:enabled})(request,response,() => {status=200;});
  assert.equal(headers['x-mpf-web-next-proxy'], undefined);
  return {status, free:webNextCreditsDisabled(actor)};
}

test('the centralized credit policy covers supported workflows and retains billing for other surfaces', () => {
  const actor = withWebNextCreditPolicy({userId:'test'}, false);
  const context = {generationSurface:'playground',generationMode:'playground'};
  for (const workflow of ['image','comparison']) {
    assert.equal(workspaceCreditDecision(actor,workflow,{context}).creditsDisabled,true);
    assert.equal(workspaceCreditDecision(actor,workflow,{context,templateExecution:{}}).creditsDisabled,false);
    assert.equal(workspaceCreditDecision(actor,workflow,{context,internalGroupContext:{}}).creditsDisabled,false);
    assert.equal(workspaceCreditDecision(actor,workflow,{context:{...context,generationSurface:'cinematic'}}).creditsDisabled,false);
  }
  const video = {capability:'playground_video',commercialOperation:'playground_video'};
  assert.equal(workspaceCreditDecision(actor,'video',video).creditsDisabled,true);
  assert.equal(workspaceCreditDecision(actor,'video',{...video,capability:'cinematic'}).creditsDisabled,false);
  for (const workflow of ['speech','voice_design']) assert.equal(workspaceCreditDecision(actor,workflow).creditsDisabled,true);
  assert.equal(workspaceCreditDecision(actor,'unknown').creditsDisabled,false);
  withWebNextCreditPolicy(actor,true);
  assert.equal(workspaceCreditDecision(actor,'video',video).creditsDisabled,false);
});

test('only the authenticated workspace proxy selects the configured billing mode on its admitted endpoints', () => {
  assert.deepEqual(admission({token:'private-test-key'}), {status:200,free:true});
  assert.deepEqual(admission({token:'private-test-key',enabled:true}), {status:200,free:false});
  assert.deepEqual(admission({token:'private-test-key',peer:'192.0.2.1'}), {status:403,free:false});
  assert.deepEqual(admission({token:'private-test-key',actor:{}}), {status:403,free:false});
  assert.deepEqual(admission({token:'wrong'}), {status:403,free:false});
  assert.deepEqual(admission({url:'/api/web-next/config'}), {status:403,free:false});
  assert.deepEqual(admission({actor:{userId:'test',webNextCreditsEnabled:false}}), {status:200,free:false});
  assert.deepEqual(admission({token:'private-test-key',url:'/api/credits/estimate'}), {status:409,free:false});
  assert.deepEqual(admission({token:'private-test-key',url:'/api/admin/credits'}), {status:200,free:false});
});

test('only Story authoring POST endpoints and supported operations can be unmetered', () => {
  const paths = ['writing/quotes','chapter-outline/proposals','full-story/chapters','full-story/proposals','chapter-proposals','scene-proposals','scenes/s1/shot-proposals'];
  for (const name of paths) {
    const url = '/api/cinematic/projects/p1/' + name;
    assert.deepEqual(admission({url,token:'private-test-key'}),{status:200,free:true});
    assert.deepEqual(admission({url,token:'wrong'}),{status:403,free:false});
    assert.deepEqual(admission({url}),{status:200,free:false});
    assert.deepEqual(admission({url,token:'private-test-key',enabled:true}),{status:200,free:false});
  }
  for (const suffix of ['scene-proposals/proposal1/apply','writing/quotes/extra','scenes/s1/storyboard']) {
    assert.equal(admission({url:'/api/cinematic/projects/p1/'+suffix,token:'private-test-key'}).free,false);
  }
  const actor = withWebNextCreditPolicy({userId:'test'},false);
  for (const operation of ['chapter_outline','chapters','scenes','shots','characters','wardrobe','story_plan','scene_direction','brief','full_story','unknown']) {
    assert.equal(workspaceCreditDecision(actor,'cinematic_writing',{commercialOperation:operation}).creditsDisabled,
      ['chapter_outline','chapters','scenes','shots'].includes(operation), operation);
  }
  const scope = {commercialOperation:'characters',writingScope:'whole_story'};
  assert.equal(workspaceCreditDecision(actor,'cinematic_writing',scope).creditsDisabled,true);
  assert.equal(workspaceCreditDecision({userId:'test'},'cinematic_writing',scope).creditsDisabled,false);
  assert.equal(workspaceCreditDecision(actor,'cinematic_writing',{...scope,commercialOperation:'full_story'}).creditsDisabled,false);
});

test('web-next speech at zero balance uses no Credits calls and retains original mode on replay and status reads', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(),'web-next-credits-'));
  t.after(() => rm(directory,{force:true,recursive:true}));
  const repository = new SpeechOperationRepository({filename:path.join(directory,'speech.json')});
  const actor = withWebNextCreditPolicy(Object.freeze({userId:'zero-balance'}), false);
  const metered = {userId:'zero-balance'};
  const jobs = new Map();
  let calls = 0;
  const service = new SpeechGenerationService({repository,
    credits:new Proxy({}, {get(_,key) { throw new Error('Unexpected Credits call: ' + String(key)); }}),
    available() {}, queue:{jobs,enqueueOperation(job){assert.equal(job.reservationId,undefined); jobs.set(job.id,job);}},
    provider:{generate(){calls++; return {bytes:Buffer.alloc(0)};}},
    assets:{register:async()=>({outputAssetId:'fixture',outputUrl:'/fixture',durationMs:1000})}
  });
  const requestId = randomUUID(), quoteId = 'speech_'+requestId;
  const snapshot = {documentId:'d',rowId:'r',modelId:'gemini-3.8-flash-tts',voiceId:'Kore',language:'th',text:'สวัสดี',delivery:{}};
  const request = {actorContext:actor,snapshot,quoteId,requestId};
  await assert.rejects(service.generate({...request,actorContext:metered}),{code:'speech_quote_stale'});
  await Promise.all([service.generate(request), service.generate(request)]);
  assert.equal(jobs.size,1);
  const work = jobs.get(quoteId);
  assert.equal((await work.execute()).status,'succeeded');
  assert.equal((await service.generate({...request,actorContext:metered})).status,'succeeded');
  assert.equal((await service.read({actorContext:metered,id:quoteId})).status,'succeeded');
  assert.equal(calls,1);
  assert.equal((await repository.get(quoteId,actor.userId)).billingMode,'unmetered');
  await assert.rejects(service.generate({...request,snapshot:{...snapshot,text:'different'}}),{code:'speech_request_conflict'});
});

test('unmetered Seed audition and pre-dispatch cleanup preserve the private reference lifecycle', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(),'web-next-seed-'));
  t.after(() => rm(directory,{force:true,recursive:true}));
  const repository = new SpeechOperationRepository({filename:path.join(directory,'operations.json')});
  const actor = withWebNextCreditPolicy({userId:'zero'},false);
  const wav = Buffer.alloc(48);
  wav.write('RIFF'); wav.writeUInt32LE(40,4); wav.write('WAVEfmt ',8); wav.writeUInt32LE(16,16);
  wav.writeUInt16LE(1,20); wav.writeUInt16LE(1,22); wav.writeUInt32LE(24000,24); wav.writeUInt32LE(48000,28);
  wav.writeUInt16LE(2,32); wav.writeUInt16LE(16,34); wav.write('data',36); wav.writeUInt32LE(4,40);
  const jobs = new Map(), removed = [];
  const requestId = randomUUID(), quoteId = 'speech_'+requestId;
  const snapshot = {sourceType:'reference', modelId:'dola-seed-audio',language:'th',name:'Demo',sampleText:'ทดสอบ',
    voiceGender:'unspecified',retainOriginal:true,referenceAudio:wav.toString('base64')};
  const service = new SpeechGenerationService({repository, available(){}, queue:{jobs,enqueueOperation(job){jobs.set(job.id,job);}},
    credits:new Proxy({}, {get(){assert.fail('unexpected wallet access');}}),
    assets:{register:async({jobId})=>({outputAssetId:jobId, outputUrl:'/test', durationMs:1}),
      referenceClip:async()=>wav, remove:async({assetId})=>removed.push(assetId)},
    seedProvider:{generate:async()=>({bytes:wav,providerResponseId:'fixture'})}
  });
  await service.generate({actorContext:actor,operation:'voice_design',requestId,quoteId,snapshot});
  assert.equal((await jobs.get(quoteId).execute()).status,'succeeded');
  const next = randomUUID(), id = 'speech_'+next;
  await service.generate({actorContext:actor,operation:'voice_design',requestId:next,quoteId:id,snapshot});
  jobs.delete(id);
  await repository.update(id,actor.userId,{admissionProcessId:'previous-process'});
  assert.equal((await service.read({actorContext:{userId:actor.userId},id})).errorCode,'speech_interrupted');
  assert.deepEqual(removed,[id+'-reference']);
});

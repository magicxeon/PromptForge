import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { promises as fs, createReadStream } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import { DubProjectRepository } from '../server/repositories/dub-sub/DubProjectRepository.js';
import { DubProjectService } from '../server/domain/dub-sub/DubProjectService.js';
import { registerDubSubRoutes } from '../server/app/routes/dubSubRoutes.js';
import { DubLanguageService } from '../server/domain/dub-sub/DubLanguageService.js';
import { prepareMedia } from '../server/domain/dub-sub/DubMediaService.js';
import { renderExport, renderPreview } from '../server/domain/dub-sub/DubExportService.js';
import { tracksFor } from '../server/domain/dub-sub/projectFields.js';

async function compareFrame(t,root,video,png) {
  const frame=path.join(root,'check.png');
  await fs.writeFile(frame,png);
  const {stdout}=await promisify(execFile)('ffmpeg',['-nostdin','-v','error','-ss','0.5','-i',video,'-i',frame,
    '-filter_complex','[0:v]format=yuv420p[a];[1:v]format=yuv420p[b];[a][b]ssim=stats_file=-','-frames:v','1','-f','null','-']);
  const score=Number(stdout.match(/All:([\d.]+)/)?.[1]);
  assert.ok(score>=0.95,'Subtitle frame SSIM '+score);
  t.diagnostic('same-time preview vs encoded video SSIM '+score);
}

test('private local video, peaks, revision, subtitle export and byte ranges', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(),'dub-test-'));
  t.after(() => fs.rm(root,{recursive:true,force:true}));
  const filename = path.join(root,'fixture.mp4');
  await promisify(execFile)('ffmpeg',['-nostdin','-v','error','-f','lavfi','-i','color=s=160x96:d=1',
    '-f','lavfi','-i','sine=frequency=400:duration=1','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac',filename]);
  const actor = {userId:'one'}, other = {userId:'two'};
  const service = new DubProjectService({repo:new DubProjectRepository(root),voiceStudio:{
    withDubTakePins:async(actor,id,takes,commit)=>commit()
  }});
  const project = await service.create(actor,{name:'บทพากย์',targetLanguages:['th','zh']});
  await assert.rejects(service.get(other,project.id),{code:'dub_project_missing'});
  await assert.rejects(service.create(actor,{name:'clip',targetLanguages:['th','zh','en']}),{code:'dub_invalid_input'});
  const uploaded = await service.upload(actor,project.id,createReadStream(filename));
  assert.equal(uploaded.width,160);
  const peaks = JSON.parse(await fs.readFile((await service.file(actor,project.id,'peaks')).path));
  assert.ok(peaks.peaks.some(v => v > 0));
  await assert.rejects(service.update(actor,project.id,{revision:1,name:'stale'}),{code:'dub_revision_conflict'});
  const edited = await service.update(actor,project.id,{revision:uploaded.revision,cues:[
    {id:'cue',startMs:50,endMs:900,text:'你好',translations:{th:'สวัสดี'}}]});
  const input = {revision:edited.revision,language:'th',format:'srt'};
  const record = await service.perform(actor,project.id,'exports',input);
  assert.equal((await service.perform(actor,project.id,'exports',input)).id,record.id);
  const output = await service.file(actor,project.id,'export',record.id);
  assert.match(await fs.readFile(output.path,'utf8'),/00:00:00,050 --> 00:00:00,900\nสวัสดี/);
  await assert.rejects(service.file(other,project.id,'export',record.id),{code:'dub_project_missing'});
  const mp4 = await service.perform(actor,project.id,'exports',{...input,format:'mp4'});
  const rendered = (await service.file(actor,project.id,'export',mp4.id)).path;
  const probe = await promisify(execFile)('ffprobe',['-v','error','-show_entries','stream=codec_name','-of','csv=p=0',rendered]);
  assert.match(probe.stdout,/mov_text/);
  const both = { ...input, language:'th', languages:['source','th'], format:'mp4' };
  const bilingual = await service.perform(actor,project.id,'exports',both);
  const streams = await promisify(execFile)('ffprobe',['-v','error','-show_entries','stream=codec_name','-of','csv=p=0',
    (await service.file(actor,project.id,'export',bilingual.id)).path]);
  assert.equal(streams.stdout.match(/mov_text/g)?.length,2);
  const burned = await service.perform(actor,project.id,'exports',{...both,burnIn:true});
  assert.ok((await fs.stat((await service.file(actor,project.id,'export',burned.id)).path)).size > 0);
  const frame = await service.review(actor,project.id,'preview',{...both,timeMs:500});
  assert.equal(frame.toString('hex',0,8),'89504e470d0a1a0a');
  await compareFrame(t,root,(await service.file(actor,project.id,'export',burned.id)).path,frame);
  await assert.rejects(service.perform(actor,project.id,'transcribe',input),{code:'dub_confirm_replace'});
  await assert.rejects(service.perform(actor,project.id,'exports',{...input,format:'wav'}),{code:'dub_take_missing'});
  assert.equal((await service.get(actor,project.id)).operations.at(-1).status,'failed');
  const app = express();
  app.use((req,res,next) => {req.actorContext = req.headers['x-owner'] === 'two' ? other : actor;
    req.reauthorizeIdentity = async() => req.actorContext; next();});
  registerDubSubRoutes(app,{projects:service});
  const server = await new Promise(resolve => { const s = app.listen(0,'127.0.0.1',()=>resolve(s)); });
  t.after(() => {server.closeAllConnections();return new Promise(resolve=>server.close(resolve));});
  const url = 'http://127.0.0.1:'+server.address().port+uploaded.mediaUrl;
  const response = await fetch(url,{headers:{Range:'bytes=0-15'}});
  assert.equal(response.status,206); assert.equal((await response.arrayBuffer()).byteLength,16);
  assert.equal((await fetch(url,{headers:{Range:'bytes=99999999999-'}})).status,416);
  assert.equal((await fetch(url,{headers:{'x-owner':'two'}})).status,404);
  const voice = path.join(root,'private.wav');
  await promisify(execFile)('ffmpeg',['-nostdin','-v','error','-f','lavfi','-i','sine=frequency=600:duration=0.5',voice]);
  service.voiceStudio = {...service.voiceStudio,getDubTake:async (owner,id) => {
    assert.equal(owner,actor); assert.equal(id,'take1'); return {id,audioUrl:'/outputs/private.wav',durationMs:500};
  }};
  service.assets = {openOwnedOutput:async ({actor:owner,outputUrl}) => {
    assert.equal(owner,actor); assert.equal(outputUrl,'/outputs/private.wav');
    return {handle:await fs.open(voice),reauthorize:async()=>actor};
  }};
  const dubbed = await service.update(actor,project.id,{revision:edited.revision,cues:[
    {...edited.cues[0],takes:{th:{id:'take1',audioUrl:'untrusted',durationMs:1}}}]});
  assert.deepEqual(dubbed.cues[0].takes.th,{id:'take1',audioUrl:'/outputs/private.wav',durationMs:500});
  const wav = await service.perform(actor,project.id,'exports',{format:'wav',language:'th',revision:dubbed.revision,sourceGain:0.15});
  const mixed = (await service.file(actor,project.id,'export',wav.id)).path;
  const duration = await promisify(execFile)('ffprobe',['-v','error','-show_entries','format=duration','-of','csv=p=0',mixed]);
  assert.ok(Math.abs(Number(duration.stdout)-1) < 0.02);
  const locked = await service.update(actor,project.id,{revision:dubbed.revision,tracks:{...dubbed.tracks,th:{...dubbed.tracks.th,locked:true}}});
  await assert.rejects(service.update(actor,project.id,{revision:locked.revision,cues:[]}),{code:'dub_track_locked'});
  const archived = await service.update(actor,project.id,{revision:locked.revision,archived:true});
  assert.equal(archived.archived,true); assert.equal((await service.list(actor,{})).items.length,0);
  assert.equal((await service.list(actor,{archived:'true'})).items.length,1);
  let checked=false;
  service.voiceStudio.getDubCharacter=async(owner,id)=>{checked=true;assert.equal(owner,actor);assert.equal(id,'char-1');};
  const grouped = await service.update(actor,project.id,{revision:archived.revision,characterMappings:{th:{actor:'char-1'}},
    mixer:{th:{actor:{gain:0.25,mute:false,solo:true}}}});
  assert.equal(checked,true);assert.equal(grouped.characterMappings.th.actor,'char-1');assert.equal(grouped.mixer.th.actor.gain,0.25);
  await assert.rejects(service.update(actor,project.id,{revision:grouped.revision,mixer:JSON.parse('{"th":{"__proto__":{}}}')}),
    {code:'dub_invalid_input'});
  const asr = new DubLanguageService({postProcessing:{endpoint:'http://fixture',fetchWithRetry:async ()=>
    Response.json({success:true,fallbackUsed:true,words:[{word:'fake',start:0,end:1}]})}});
  const stored = await service.repo.get(actor,project.id);
  await assert.rejects(asr.transcribe(stored,service.repo.directory(actor,project.id)),{code:'dub_asr_unavailable'});
});

test('portrait bilingual subtitle render preserves geometry and matches final-frame preview',async t=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'dub-portrait-'));
  t.after(()=>fs.rm(root,{recursive:true,force:true}));
  const original=path.join(root,'portrait.mp4'),inputDir=path.join(root,'private');
  await promisify(execFile)('ffmpeg',['-nostdin','-v','error','-f','lavfi','-i','color=s=320x568:d=1','-c:v','libx264',original]);
  const media=await prepareMedia(createReadStream(original),inputDir);
  const project={media,sourceLanguage:'zh',targetLanguages:['th'],durationMs:1000,tracks:tracksFor({},['th']),
    cues:[{startMs:0,endMs:1000,text:'你好世界',translations:{th:'ฟังเสียงนี้'}}]};
  const source=path.join(inputDir,'media'),dir=await fs.mkdtemp(path.join(root,'export')),output=path.join(root,'burned.mp4');
  const languages=['source','th'];
  await renderExport({project,language:'th',captionLanguages:languages,format:'mp4',burnIn:true,includeDubbing:false,sourceGain:1,dubGain:1,source,dir,output});
  const png=await renderPreview(project,languages,500,source,await fs.mkdtemp(path.join(root,'preview')));
  assert.equal(png.readUInt32BE(16),320);assert.equal(png.readUInt32BE(20),568);
  const pngPath=path.join(root,'portrait-caption.png');
  await fs.writeFile(pngPath,png);
  const pixels=(await promisify(execFile)('ffmpeg',['-nostdin','-v','error','-i',pngPath,'-f','rawvideo','-pix_fmt','gray','-'],
    {encoding:'buffer'})).stdout;
  for (const anchor of [project.tracks.source.y,project.tracks.th.y]) {
    const row=Math.round(568*anchor/100),visible=pixels.subarray((row-35)*320,(row+2)*320);
    assert.ok(visible.filter(value=>value>140).length>10,'Visible subtitle at anchor '+anchor);
  }
  const {stdout}=await promisify(execFile)('ffprobe',['-v','error','-show_entries','stream=width,height,duration','-of','json',output]);
  assert.deepEqual(JSON.parse(stdout).streams[0],{width:320,height:568,duration:'1.000000'});
  await compareFrame(t,root,output,png);
});

test('translation retains edited language and calls the configured adapter once per batch',async()=>{
  const p = {sourceLanguage:'zh',cues:[{id:'first',text:'甲',translations:{th:'เดิม'}},{id:'second',text:'乙',translations:{en:'Existing'}}]};
  let calls=0;
  const service = new DubLanguageService({translateUrl:'http://fixture.local',fetchImpl:async(url,init)=>{
    calls++; assert.equal(url.pathname,'/translate'); assert.deepEqual(JSON.parse(init.body).q,['乙']);
    return Response.json({translatedText:['สอง']});
  }});
  const result=await service.translate(p,'th',false);
  assert.equal(calls,1); assert.deepEqual(result.map(c=>c.translations),[{th:'เดิม'},{en:'Existing',th:'สอง'}]);
  assert.equal(p.cues[1].translations.th,undefined);
  const selected=await service.translate(p,'th',true,['second']);
  assert.equal(selected[0].translations.th,'เดิม');assert.equal(selected[1].translations.th,'สอง');
});

test('library import reserves bounded work before either lookup and releases on failure',async t=>{
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'dub-source-'));
  t.after(()=>fs.rm(root,{recursive:true,force:true}));
  let release;
  const hold = new Promise(resolve=>{release=resolve;});
  let calls=0;
  async function unavailable(){calls++;await hold;throw new Error('missing');}
  const service=new DubProjectService({repo:new DubProjectRepository(root),
    videoGeneration:{getStoredTaskSummaries:unavailable},assets:{openOwnedOutput:unavailable}});
  const create=(i)=>service.create({userId:'actor'},{name:'video',...(i%2 ? {sourceJobId:'id'} : {sourceUrl:'/outputs/existing.mp4'})});
  const requests=[0,1,2,3].map(i=>assert.rejects(create(i),/missing/));
  await assert.rejects(create(4),{code:'dub_upload_busy'}); assert.equal(calls,4);
  release();await Promise.all(requests);
  await assert.rejects(create(5),/missing/); assert.equal(calls,5);
});

test('each HTTP waiter reauthorizes its own session before receiving shared transcript or preview bytes',async t=>{
  for (const kind of ['transcribe','preview']) {
    let finish, signalJoined;
    const joined = new Promise(resolve=>{ signalJoined=resolve; });
    const work = new Promise(resolve=>{ finish=resolve; });
    let callers=0;
    const wait = async()=>{ if (++callers===2) signalJoined(); return work; };
    const app = express();
    app.use(express.json());
    let expired=false;
    app.use((req,res,next)=>{
      req.actorContext={userId:'shared-actor'};
      req.reauthorizeIdentity=async()=> expired && req.headers['x-session']==='revoked' ? null : req.actorContext;
      next();
    });
    registerDubSubRoutes(app,{projects:{perform:wait,review:wait}});
    const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
    t.after(()=>{server.closeAllConnections();return new Promise(resolve=>server.close(resolve));});
    const url='http://127.0.0.1:'+server.address().port+'/api/dub-sub/projects/id/'+kind;
    const request=id=>fetch(url,{method:'POST',headers:{'Content-Type':'application/json','x-session':id},body:'{}'});
    const good=request('active'), bad=request('revoked');
    await joined; expired=true; finish(kind==='preview'?Buffer.from('secret pixels'):{text:'secret dialogue'});
    assert.equal((await good).status,200);
    const denied=await bad; assert.equal(denied.status,401); assert.doesNotMatch(await denied.text(),/secret/);
  }
});

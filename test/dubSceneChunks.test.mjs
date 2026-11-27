import test from "node:test";
import assert from "node:assert/strict";
import {promises as fs} from "node:fs";
import {execFile} from "node:child_process";
import {promisify} from "node:util";
import os from "node:os";
import path from "node:path";
import {DubLanguageService} from "../server/domain/dub-sub/DubLanguageService.js";
import {planSceneChunks, mergeSceneParts} from "../server/domain/dub-sub/sceneSpeechChunks.js";
import {sceneTranscriptionPolicy} from "../server/domain/generation/SceneTranscriptionService.js";

test("continuous speech is bounded and padded; adjacent matching cues merge once", () => {
  const planned = planSceneChunks([{startMs:0,endMs:90000}], 90000, sceneTranscriptionPolicy.chunking);
  assert.deepEqual(planned, [
    {startMs:0,endMs:44500}, {startMs:43500,endMs:88500}, {startMs:87500,endMs:90000},
  ]);
  const first = {text:"Hello",speaker:"A",startMs:43700,endMs:44200};
  const copy = {...first,startMs:43760};
  const repeat = {...first,startMs:45000,endMs:45400};
  assert.deepEqual(mergeSceneParts([{...planned[0],cues:[first]}, {...planned[1],cues:[copy,repeat]}]), [first,repeat]);
});

test("boundary reconciliation retains full translations, repeated words and concurrent different speakers", () => {
  const cue = (text,startMs,endMs,speaker="A") => ({text,startMs,endMs,speaker,translation:text});
  const merge = (first,second) => mergeSceneParts([
    {startMs:0,endMs:5000,cues:first},{startMs:4000,endMs:10000,cues:second},
  ]);
  const phrase = cue("Good morning, my friend!",4200,5600);
  assert.deepEqual(merge([cue("GOOD MORNING",4250,4950)],[phrase]),[phrase]);
  const before = cue("Please come home!",3500,4700);
  assert.deepEqual(merge([before],[cue("come home.",4030,4660)]),[before]);
  const once = cue("Hello!",4010,4290), again = cue("Hello!",4270,4600);
  const otherSpeaker = cue("hello",4040,4300,"B");
  assert.deepEqual(merge([once,again],[otherSpeaker,cue("HELLO.",4300,4580)]),[once,otherSpeaker,again]);
  const later = cue("Hello?",4580,4900);
  assert.deepEqual(merge([again],[later]),[again,later]);
  const different = cue("Good morning everyone",4250,4960);
  assert.deepEqual(merge([different],[phrase]),[phrase,different]);
});

test("quiet spoken islands skip long silence, checkpoint good parts and retry only missing audio", async t => {
  const ffmpeg = process.env.FFMPEG_PATH || "ffmpeg";
  const {stdout:filters} = await promisify(execFile)(ffmpeg,["-hide_banner","-filters"],{windowsHide:true});
  if (!filters.includes(" flite ")) return t.skip("Spoken fixture requires the FFmpeg flite source");
  const directory = await fs.mkdtemp(path.join(os.tmpdir(),"scene-speech-"));
  t.after(() => fs.rm(directory,{recursive:true,force:true}));
  const source = path.join(directory,"scene.mkv");
  await promisify(execFile)(ffmpeg, ["-nostdin","-v","error","-f","lavfi","-i",
    "flite=text='Hello there my good friend.':voice=slt,aresample=16000,volume=0.025,asplit=3[a][b][c];" +
    "[a]adelay=2000[d];[b]adelay=28000[e];[c]adelay=55000[f];[d][e][f]amix=3:normalize=0,apad=whole_dur=60",
    "-c:a","pcm_s16le",source]);
  const project = {durationMs:60000, sourceLanguage:"en", targetLanguages:["th"], storyContext:"At school",
    languageStyle:"informal", speakerProfiles:{teacher:{name:"Teacher",style:"calm"}}, cues:[]};
  const cachedParts = {};
  const calls = [];
  let fail = true, active = 0, maxActive = 0, total;
  const service = new DubLanguageService({sceneGeneration:{transcribe:async (index,audio,context) => {
    calls.push(index);
    active++;
    maxActive = Math.max(maxActive,active);
    try {
      assert.ok(context.durationMs < 5000);
      assert.equal(audio.length,44 + context.durationMs * 32);
      assert.deepEqual(context.knownSpeakers,[{speaker:"teacher",name:"Teacher",style:"calm"}]);
      assert.equal(context.storyContext,"At school");
      await new Promise(resolve => setTimeout(resolve,index ? 3 : 15));
      return {language:"en",cues:[{startMs:100,endMs:fail && index === 1 ? 60000 : 500,
        original:"Hello",translation:"Hi",speaker:"Speaker 1",delivery:{emotion:"calm",pace:"slow",intensity:"subtle",direction:""}}]};
    } finally {active--;}
  }}});
  const run = () => service.transcribeScene(project, source, "th", async index => index, {
    cachedParts, onPlan:n => {total=n;}, onPart:(index,part) => {cachedParts[index]=part;},
  });
  await assert.rejects(run(),{code:"dub_scene_invalid_response",reason:"cue_outside_timeline"});
  assert.equal(total,3);
  assert.deepEqual(calls,[0,1]);
  assert.deepEqual(Object.keys(cachedParts),["0"]);
  fail = false;
  const result = await run();
  assert.deepEqual(calls,[0,1,1,2]);
  assert.equal(maxActive,2);
  assert.equal(result.cues.length,3);
  for (const [index, start] of [2000,28000,55000].entries()) {
    assert.ok(Math.abs(result.cues[index].startMs - start) < 800);
    assert.equal(result.cues[index].speaker,"");
  }
  // Part 1 is rejected first. Part 0 finishes later but cannot be checkpointed.
  fail = true;
  calls.length = 0;
  await assert.rejects(service.transcribeScene(project,source,"th",async index => index, {
    onPart:() => {throw new Error("receipt unavailable");},
  }), {code:"dub_scene_outcome_unknown"});
  assert.deepEqual(calls,[0,1]);
});

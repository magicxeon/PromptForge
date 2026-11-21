import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { detectSpeechIntervals } from "../server/domain/assets/speechIntervals.js";
import { sourceRhythms } from "../server/domain/dub-sub/sourceRhythm.js";
import { DubProjectRepository } from "../server/repositories/dub-sub/DubProjectRepository.js";

test("silence and a steady musical tone are not usable spoken windows",async()=>{
  const pcm = Buffer.alloc(32000);
  assert.deepEqual(await detectSpeechIntervals(pcm),[]);
  for (let i=0;i<16000;i++) pcm.writeInt16LE(Math.round(6000*Math.sin(i*2*Math.PI*440/16000)),2*i);
  assert.deepEqual(await detectSpeechIntervals(pcm),[]);
  const chord = Buffer.alloc(3 * 32000);
  for (let i=0;i<48000;i++) {
    if (i>=16000 && i<24000) continue;
    const phase = i * 2 * Math.PI * 220 / 16000;
    chord.writeInt16LE(Math.round(4000*(Math.sin(phase)+Math.sin(2*phase)+Math.sin(3*phase))),2*i);
  }
  assert.deepEqual(await detectSpeechIntervals(chord),[]);
});

test("a locally synthesized spoken phrase, pause and second phrase project to cue-relative times",async t=>{
  const ffmpeg = process.env.FFMPEG_PATH || "ffmpeg";
  if (!execFileSync(ffmpeg,["-hide_banner","-filters"],{encoding:"utf8",windowsHide:true}).includes(" flite ")) {
    t.skip("Spoken audio fixture needs the optional FFmpeg flite source");
    return;
  }
  const root = await fs.mkdtemp(path.join(os.tmpdir(),"dub-rhythm-"));
  t.after(()=>fs.rm(root,{recursive:true,force:true}));
  const repo = new DubProjectRepository(root);
  const actor = {userId:"rhythm-fixture"};
  const project = {id:randomUUID(), media:{hasAudio:true,folder:"source"}};
  const dir = path.join(repo.directory(actor,project.id),"source");
  await fs.mkdir(dir,{recursive:true});
  const phrase = execFileSync(ffmpeg,["-nostdin","-v","error","-f","lavfi","-i","flite=text=Young master:voice=slt",
    "-ac","1","-ar","16000","-f","s16le","pipe:1"],{windowsHide:true});
  const pcm = Buffer.concat([Buffer.alloc(12800),phrase,Buffer.alloc(16000),phrase,Buffer.alloc(16000)]);
  execFileSync(ffmpeg,["-nostdin","-v","error","-f","s16le","-ar","16000","-ac","1","-i","pipe:0",
    "-c:a","pcm_s16le","-f","matroska",path.join(dir,"media")],{input:pcm,windowsHide:true});
  project.durationMs = Math.floor(pcm.length/32);
  const whole = {id:"whole",startMs:0,endMs:project.durationMs};
  const offset = {id:"offset",startMs:300,endMs:project.durationMs};
  let verifications = 0;
  const map = await sourceRhythms({repo},actor,project,[whole,offset],()=>{verifications++;});
  const spans = map.get("whole");
  assert.equal(verifications,1);
  assert.equal(spans.length,2);
  assert.ok(spans[0].startMs >= 400 && spans[0].startMs < 1000);
  assert.ok(spans[1].startMs-spans[0].endMs >= 480);
  assert.ok(spans[1].endMs <= project.durationMs-490);
  assert.deepEqual(map.get("offset"),spans.map(s=>({startMs:s.startMs-300,endMs:s.endMs-300})));
  assert.deepEqual(await sourceRhythms({repo},actor,project,[whole]),new Map([["whole",spans]]));
  await assert.rejects(sourceRhythms({repo},actor,project,[whole],()=>{throw new Error("expired");}),/expired/);
  await assert.rejects(sourceRhythms({repo},{userId:"other"},project,[whole]));
});

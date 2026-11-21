import assert from "node:assert/strict";
import test from "node:test";
import {fitTakeOffset} from "../server/domain/dub-sub/fitTakeOffset.js";

const spans = pairs => pairs.map(([startMs,endMs])=>({startMs,endMs}));
function fit({goal=[[102,1982]], measured=[[320,1970]], offsetMs=0, peer, otherTake, duration=2080, startMs=1058, windowMs=2080,acceptRhythmMismatch=false}={}) {
  const cue = {id:"one",startMs,endMs:startMs+windowMs,offsetMs,takes:otherTake ? {en:otherTake} : {}};
  const project = {durationMs:6000,cues:[cue,...(peer?[peer]:[])]};
  const take = {id:"fixture",durationMs:duration,inputSnapshot:{speechWindows:spans(goal)}};
  const actor = {userId:"owner"};
  return fitTakeOffset(project,cue,"th",take,{measureDubTake:async (user,id)=>{
    assert.equal(user,actor); assert.equal(id,take.id); return spans(measured);
  }},actor,acceptRhythmMismatch);
}

test("offset solver preserves an approved manual placement and corrects the same original at zero",async()=>{
  assert.equal((await fit({offsetMs:-125})).offsetMs,-125);
  const result=await fit();
  assert.equal(result.errorCode,null);
  assert.ok(Math.abs(320+result.offsetMs-102)<=120);
  assert.ok(Math.abs(1970+result.offsetMs-1982)<=180);
});

test("all significant pauses must agree with the same offset",async()=>{
  const sample={goal:[[122,1802],[2322,3562],[3992,4772]],measured:[[300,2040],[2410,3680],[4200,4830]],duration:4900,windowMs:4920};
  assert.equal((await fit(sample)).errorCode,null);
  assert.equal((await fit({...sample,offsetMs:-160})).offsetMs,-160);
  assert.equal((await fit({...sample,measured:[[300,2040],[2410,3100],[3500,4830]]})).errorCode,"dub_take_rhythm_pause");
  assert.equal((await fit({...sample,measured:[[300,4830]]})).errorCode,"dub_take_rhythm_pause");
});

test("protects preceding/following audio, project start, a second selected language and unmeasurable speech",async()=>{
  const peer={id:"peer",startMs:0,endMs:1000,takes:{th:{durationMs:1040}}};
  assert.ok((await fit({peer})).errorCode);
  const following={id:"peer",startMs:3110,endMs:3700,offsetMs:-240,takes:{th:{durationMs:590}}};
  assert.ok((await fit({peer:following})).errorCode);
  assert.ok((await fit({startMs:0})).errorCode);
  assert.equal((await fit({otherTake:{id:"english"}})).errorCode,"dub_take_shared_offset");
  assert.equal((await fit({measured:[]})).errorCode,"dub_take_rhythm_unmeasurable");
});

test("approved text can use a measurable performance with a different pause at a safe position", async () => {
  const sample={goal:[[100,700],[1200,1900]],measured:[[100,1900]],acceptRhythmMismatch:true};
  const fitted=await fit(sample);
  assert.equal(fitted.errorCode,null);
  assert.equal(fitted.offsetMs,0);
  assert.equal((await fit({...sample,measured:[]})).errorCode,"dub_take_rhythm_unmeasurable");
  const peer={id:"following",startMs:2500,endMs:3200};
  assert.ok((await fit({...sample,peer})).errorCode);
});

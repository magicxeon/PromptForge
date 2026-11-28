import assert from 'node:assert/strict';
import test from 'node:test';
import { CinematicFullStoryService } from '../server/domain/generation/CinematicFullStoryService.js';
import { resolveWritingPreferences } from '../server/config/storyWritingSettings.js';
import storyDirection from '../server/config/cinematic/story-direction.v1.json' with {type:'json'};

test('skill context matches source material and supplies relevant reference paragraphs', () => {
  const skill={id:'custom-inn',name:'Inn',instruction:'Use established set geometry.',version:1,tasks:['shots'],
    context:'โรงเตี๊ยม, tavern',references:[{name:'references/table.md',text:'Tavern table is oak.'},{name:'references/garden.md',text:'Garden has grass.'}]};
  const settings={modelId:null,skillIds:[skill.id],customSkills:[skill]};
  assert.deepEqual(resolveWritingPreferences(settings,'shots',{scene:{title:'station'}}).selectedSkillIds,[]);
  assert.deepEqual(resolveWritingPreferences(settings,'shots',{scene:{title:'โรงเตี๊ยม'}}).selectedSkillIds,[skill.id]);
  const result=resolveWritingPreferences(settings,'shots',{scene:{title:'Tavern table'}});
  assert.equal(result.skillInstructions.join(' '),'Use established set geometry.\n\nTavern table is oak.');
});

test('project skills retain revisions and reach only enabled, applicable writing tasks', () => {
  const custom={id:'custom-wardrobe',name:'Wardrobe continuity',instruction:'Match the embroidered collar.',version:2,tasks:['looksheet']};
  const settings={modelId:null,skillIds:[custom.id,'dialogue'],customSkills:[custom]};
  const sheet=resolveWritingPreferences(settings,'looksheet');
  assert.deepEqual(sheet.selectedSkillVersions,{[custom.id]:2});
  assert.deepEqual(sheet.skillInstructions,[custom.instruction]);
  assert.deepEqual(resolveWritingPreferences(settings,'full_story').selectedSkillIds,['dialogue']);
  assert.deepEqual(resolveWritingPreferences({...settings,skillIds:[]},'looksheet').skillInstructions,[]);
  assert.throws(()=>resolveWritingPreferences({...settings,customSkills:[]},'looksheet'));
});

test('refinement patches direction only and can return the original draft verbatim', async () => {
  const draft = ['[REFERENCE MAPPING]','Reference 1 — location.','Shot 1','[ACTION TIMELINE]',
    '0–3s — Hold still. [2s] Listen.','[1s] Host: “Welcome.”','[CONTINUITY]','Keep the door closed.'].join('\n');
  const source = 'The host listens at a closed door.';
  const skill = {id:'custom-blocking',name:'Blocking',instruction:'Maintain consistent entrances.',tasks:['shots'],version:3};
  const settings = {modelId:'gpt-6-luna',skillIds:[skill.id],customSkills:[skill],direction:storyDirection.defaults};
  const context = {scope:'sequence',selectedTiming:[{startMs:0,endMs:3000}]};
  let edits = [];
  const service = new CinematicFullStoryService({
    policyLoader:()=>({enabled:true,provider:'openai',model:'fixture'}),availabilityPolicy:{assertAvailable(){}},
    providerFactory:()=>({refineStoryPrompt:async request=>{
      assert.equal(request.source,source);
      assert.equal(request.model,settings.modelId);
      assert.deepEqual(request.context.selectedTiming,context.selectedTiming);
      assert.ok(request.context.editorialInstructions.includes(skill.instruction));
      assert.deepEqual(request.lines.filter(line=>line.editable).map(line=>line.id),[4,7]);
      return {edits,reviewNotes:[]};
    }})
  });
  const review = () => service.refineStoryPrompt(draft,source,settings,context);
  const initial = await review();
  assert.equal(initial.text,draft);
  assert.deepEqual(initial.provenance.selectedSkillVersions,{[skill.id]:3});
  edits = [{id:4,text:'0–3s — Hold the close-up. [2s] Listen.'}];
  assert.equal((await review()).text,draft.replace('Hold still','Hold the close-up'));
  for (const invalid of [[{id:5,text:'New dialogue'}],[{id:1,text:'New reference'}],[{id:2,text:'Shot 2'}],
    [{id:4,text:'0–4s — Hold still. [2s] Listen.'}],[{id:4,text:'0–3s — Hold still. [1s] Listen.'}],
    [{id:7,text:'See Reference 3.'}], [{id:7,text:'Hold.\nShot 4'}]]) {
    edits = invalid;
    await assert.rejects(review(),{code:'cinematic_prompt_refinement_invalid'});
  }
});

test('the shot writer receives directing skills by approved events and destination independently of the writing skill quota', async () => {
  let context;
  const service = new CinematicFullStoryService({
    policyLoader:()=>({enabled:true,provider:'openai',model:'fixture'}),
    availabilityPolicy:{assertAvailable(){}},
    providerFactory:()=>({generateCinematicSceneShots:async request=>{
      context=request.context;
      return {shots:[{title:'Opening',shotDocument:'OPENING\nAt the door.'}]};
    }})
  });
  for (const [events,destination,fight,timed] of [
    [undefined,'seedance',false,false],[['dialogue'],'seedance',false,false],
    [['fight','dialogue'],'flow',true,false],[['fight'],'seedance',true,true]
  ]) {
    const direction={...storyDirection.defaults,visualStyle:'korean',destination};
    await service.proposeShots({scene:{synopsis:'An encounter',lighting:'Practical window',audioIntent:'Quiet',sceneEvents:events},
      writingSettings:{modelId:null,skillIds:[],direction}});
    assert.equal(context.scene.lighting,'Practical window');
    assert.equal(context.scene.audioIntent,'Quiet');
    assert.equal(context.directing.setup.visualStyle,'korean');
    const ids=context.directing.skills.map(rule=>rule.id);
    assert.ok(ids.includes('professional-motion'));
    assert.equal(ids.includes('martial-arts-coverage'),fight);
    assert.equal(ids.includes('seedance-fight-timing'),timed);
  }
});

test('a Thai setting keeps English directions while only the dialogue follows the project language', async () => {
  const translations = {'ตลาดน้ำ':'floating\n market','มะลิ':'Mali','เจอกันพรุ่งนี้':'See you tomorrow.'};
  const service = new CinematicFullStoryService({
    policyLoader:()=>({enabled:true,provider:'openai',model:'fixture'}),
    availabilityPolicy:{assertAvailable(){}},
    providerFactory:()=>({translateStoryPrompt:async ({slots,spokenLanguage})=>{
      if (spokenLanguage === 'Thai') assert.ok(slots.every(slot => slot.role !== 'dialogue'));
      return {translations:slots.map(({id,source})=>({id,text:translations[source] || source})).reverse()};
    }})
  });
  const source = '[REFERENCE MAPPING]\nReference 1 — ตลาดน้ำ: set geometry, materials and light direction.\n\n'
    + '[SCENE]\nตลาดน้ำ\n\n[ACTION TIMELINE]\n[1.5s] มะลิ: “เจอกันพรุ่งนี้”';
  for (const spokenLanguage of ['Thai','English']) {
    const settings={modelId:null,skillIds:[],direction:{...storyDirection.defaults,country:'thailand',spokenLanguage}};
    const {text}=await service.translateStoryPrompt(source,[],settings);
    assert.equal(text,'[REFERENCE MAPPING]\nReference 1 — floating market: set geometry, materials and light direction.\n\n'
      + '[SCENE]\nfloating market\n\n[ACTION TIMELINE]\n[1.5s] Mali: “'+
      (spokenLanguage==='Thai'?'เจอกันพรุ่งนี้':'See you tomorrow.')+'”');
    await assert.rejects(service.translateStoryPrompt('[CAMERA]\nเคลื่อนกล้องช้า ๆ',[],settings),
      {code:'cinematic_prompt_translation_invalid'});
  }
});

test('quoted dialogue echoed in art direction is translated as a cue reference and only spoken once', async () => {
  const cue = 'ขอโทษค่ะ';
  const source = `[REFERENCE MAPPING]\nReference 1 — ซอย: set geometry, materials and light direction.\n\n[ACTION TIMELINE]\n[4s] วิ: “${cue}”\n\n[LIGHTING]\nค้างแสงเดิมขณะวิพูด “${cue}”`;
  let echoThaiInDirection = false;
  const service = new CinematicFullStoryService({
    policyLoader:()=>({enabled:true,provider:'openai',model:'fixture'}),
    availabilityPolicy:{assertAvailable() {}},
    providerFactory:()=>({translateStoryPrompt:async ({slots})=>({
      translations:slots.map(({id,section,source})=>{
        assert.ok(!source.includes(cue));
        const text = section === 'REFERENCE MAPPING' ? 'Lane' :
          section === 'ACTION TIMELINE' ? 'Wi' :
          (assert.match(source,/the scripted line/), echoThaiInDirection ? 'แสงเดิม' : 'Hold the light while Wi delivers the scripted line.');
        return {id,text};
      })
    })})
  });
  const settings = {modelId:null,skillIds:[],direction:{...storyDirection.defaults,spokenLanguage:'Thai'}};
  const {text}=await service.translateStoryPrompt(source,[{text:cue}],settings);
  assert.match(text,/Reference 1 — Lane: set geometry/);
  assert.ok(text.includes(`[4s] Wi: “${cue}”`));
  assert.equal(text.split(cue).length,2);
  echoThaiInDirection = true;
  await assert.rejects(service.translateStoryPrompt(source,[{text:cue}],settings), {
    code:'cinematic_prompt_translation_invalid',
    details:{reason:'unexpected_script',slotId:2,section:'LIGHTING',role:'direction'}
  });
});

test('the selected project writer receives the selected skill instructions and is recorded in provenance', async () => {
  const calls = [];
  const service = new CinematicFullStoryService({
    policyLoader: () => ({ enabled: true, provider: 'openai', model: 'previous-default', reasoningEffort: 'none' }),
    availabilityPolicy: { assertAvailable() {} },
    providerFactory: () => ({ generateCinematicFullStory: async input => {
      calls.push(input);
      return { fullStory: 'The draft.' };
    } })
  });
  for (const modelId of ['gpt-6.2-astra', 'gpt-6.2-sol', 'gpt-6-luna']) {
    const writingSettings = { modelId, skillIds: ['story-structure'] };
    const result = await service.propose({ storyBrief: 'An innkeeper finds a letter.', writingSettings });
    const submitted = calls.at(-1);
    assert.equal(submitted.model, modelId);
    assert.equal(submitted.reasoningEffort, modelId === 'gpt-6-luna' ? 'none' : 'low');
    assert.deepEqual(submitted.context.editorialInstructions, resolveWritingPreferences(writingSettings).skillInstructions);
    assert.equal(result.provenance.model, modelId);
  }
  await service.propose({ storyBrief: 'Another story.' });
  assert.equal(calls.at(-1).model, 'previous-default');
  assert.equal(calls.at(-1).context.editorialInstructions, undefined);
});

test('Full Story AI normalizes revision and Chapter proposals through the configured text provider', async () => {
  const calls = [];
  const provider = {
    generateCinematicFullStory: async input => {
      calls.push(['story', input]);
      return {
        fullStory: 'A complete story with a resolved ending.',
        characters: [{
          existingCharacterId: null, displayName: 'Mina', storyRole: 'Lead', storyImportance: 'protagonist',
          objective: 'Save the shop.', motivation: 'Family duty.', pressure: 'The storm.', personalityTraits: ['patient'],
          emotionalBaseline: 'Reserved', dialogueStyle: 'Concise', performanceDirection: 'Underplay emotion.'
        }],
        warnings: ['Review timing.'], responseId: 'story-response'
      };
    },
    generateCinematicChapters: async input => {
      calls.push(['chapters', input]);
      return { chapters: [
        { title: 'Arrival', story: 'The protagonists meet.' },
        { title: 'Storm', story: 'The storm tests them.' },
        { title: 'Promise', story: 'They make a promise.' }
      ], warnings: [], responseId: 'chapter-response' };
    },
    generateCinematicChapterScenes: async input => {
      calls.push(['scenes', input]);
      return { scenes: [{
        title: 'Flower shop in the rain', synopsis: 'Lalin sees the fallen flowerpot.', purpose: 'dramatic',
        objective: 'Force the first encounter.', location: 'Flower shop pavement', time: 'Night', weather: 'Heavy rain',
        environment: 'Warm shop light against wet blue asphalt.', entryState: 'Lalin closes the shop.',
        exitState: 'Kin notices the danger.', emotionalStart: 'Focused', emotionalEnd: 'Alarmed',
        transitionIntent: 'Continue at the curb.', targetDurationSeconds: 30, dialogueTargetPercent: 0,
        characterIds: ['lalin']
      }], warnings: [], responseId: 'scene-response' };
    },
    generateCinematicSceneShots: async input => {
      calls.push(['shots', input]);
      return { shots: [{ title: 'Reach down', purpose: 'Begin the encounter', durationMs: 4000,
        shotDocument: 'SHOT DURATION\n4 seconds\n\nPERFORMANCE AND TIMELINE\n[0.0-4.0 sec]\nLalin reaches down.',
        characterIds: ['lalin'] }], warnings: [], responseId: 'shot-response' };
    },
    generateCinematicSceneEnvironment: async input => {
      calls.push(['environment', input]);
      return { environmentPrompt: 'An empty rain-soaked flower-shop pavement with warm practical light and wet blue asphalt.',
        warnings: [], responseId: 'environment-response' };
    }
  };
  const service = new CinematicFullStoryService({
    policyLoader: () => ({ enabled: true, requestedEnabled: true, provider: 'openai', model: 'story-model', reasoningEffort: 'low', maxOutputTokens: 4000, timeoutMs: 1000, longFormTimeoutMs: 120000, apiKey: 'test' }),
    providerFactory: () => provider,
    availabilityPolicy: { assertAvailable() {} }
  });

  const story = await service.propose({ storyBrief: 'A short synopsis.', revisionInstruction: 'Keep the ending.' });
  const chapters = await service.proposeChapters({ fullStory: story.fullStory, format: 'mini-series', targetDurationSeconds: 60, maxChapters: 3 });
  const scenes = await service.proposeScenes({ chapterTitle: 'Arrival', chapterStory: chapters.chapters[0].story,
    projectTitle: 'Rain Letters', targetDurationSeconds: 60, characters: [{ id: 'lalin', name: 'Lalin', role: 'Lead', dossier: 'A florist.' }] });
  const shots = await service.proposeShots({ projectTitle: 'Rain Letters', chapterTitle: 'Arrival', chapterStory: chapters.chapters[0].story,
    sceneImage:{mimeType:'image/jpeg', data:'cGhvdG8='},
    scene: { id: 'scene-1', title: 'Flower shop', synopsis: 'Lalin reaches down.', durationMs: 8000, castAssignmentIds: ['lalin'] },
    characters: [{ id: 'lalin', name: 'Lalin', role: 'Lead', dossier: 'A florist.' }] });
  const environment = await service.proposeSceneEnvironment({ projectTitle: 'Rain Letters', aspectRatio: '9:16',
    storyBrief: 'Two strangers meet in the rain.', chapterTitle: 'Arrival', chapterStory: chapters.chapters[0].story,
    scene: { id: 'scene-1', title: 'Flower shop', synopsis: 'Lalin reaches toward a fallen pot.', location: 'Pavement',
      time: 'Night', weather: 'Heavy rain', shots: [{ title: 'Reach down', durationMs: 4000, shotDocument: 'A fallen pot at the curb.' }] } });

  assert.equal(story.fullStory, 'A complete story with a resolved ending.');
  assert.equal(story.provenance.responseId, 'story-response');
  assert.equal(story.characters[0].displayName, 'Mina');
  assert.equal(chapters.chapters.length, 3);
  assert.equal(calls[0][1].context.revisionInstruction, 'Keep the ending.');
  assert.equal(calls[0][1].timeoutMs, 120000);
  assert.equal(calls[1][1].context.maxChapters, 3);
  assert.equal(calls[1][1].context.expectedChapterCount, 3);
  assert.equal(calls[1][1].timeoutMs, 120000);
  assert.equal(scenes.scenes.length, 1);
  assert.equal(calls[2][1].context.chapter.title, 'Arrival');
  assert.equal(calls[2][1].context.characters[0].id, 'lalin');
  assert.equal(calls[2][1].timeoutMs, 120000);
  assert.equal(shots.shots.length, 1);
  assert.deepEqual(calls[3][1].sceneImage,{mimeType:'image/jpeg',data:'cGhvdG8='});
  assert.doesNotMatch(JSON.stringify(calls[3][1].context), /cGhvdG8=/);
  assert.equal(calls[3][1].context.scene.title, 'Flower shop');
  assert.equal(calls[3][1].context.characters[0].id, 'lalin');
  assert.equal(calls[3][1].timeoutMs, 120000);
  assert.match(environment.environmentPrompt, /empty rain-soaked flower-shop/i);
  assert.equal(environment.provenance.responseId, 'environment-response');
  assert.equal(calls[4][1].context.scene.shotContext.length, 1);
  assert.equal(calls[4][1].context.outputContract.people, 'none');
  assert.equal(calls[4][1].maxOutputTokens, 2500);
  assert.equal(calls[4][1].timeoutMs, 1000);
});

test('Full Story AI requires an instruction only when revising an existing story', async () => {
  const service = new CinematicFullStoryService({
    policyLoader: () => ({ enabled: true, requestedEnabled: true, provider: 'openai', model: 'story-model', reasoningEffort: 'low', maxOutputTokens: 8000, timeoutMs: 1000, apiKey: 'test' }),
    providerFactory: () => ({ generateCinematicFullStory: async () => ({ fullStory: 'Generated.', characters: [], warnings: [] }) }),
    availabilityPolicy: { assertAvailable() {} }
  });

  await assert.rejects(
    service.propose({ storyBrief: 'Brief.', currentFullStory: 'Existing story.', revisionInstruction: '   ' }),
    { code: 'cinematic_full_story_revision_instruction_required' }
  );
  assert.equal((await service.propose({ storyBrief: 'Brief.', currentFullStory: '' })).fullStory, 'Generated.');
  assert.equal((await service.propose({ revisionInstruction: 'A traveller returns to the family inn.' })).fullStory, 'Generated.');
  await assert.rejects(service.propose({ revisionInstruction: ' ' }), {code:'cinematic_full_story_source_required'});
});

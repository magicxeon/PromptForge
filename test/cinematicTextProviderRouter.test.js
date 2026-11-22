import assert from 'node:assert/strict';
import test from 'node:test';
import { OpenAITextProvider } from '../server/providers/OpenAITextProvider.js';
import { GeminiCinematicTextProvider } from '../server/providers/GeminiCinematicTextProvider.js';
import {
  CinematicTextProviderRouter,
  isEligibleFallbackFailure
} from '../server/domain/generation/CinematicTextProviderRouter.js';
import { ProviderAvailabilityPolicyService } from '../server/domain/admin-configuration/ProviderAvailabilityPolicyService.js';

function policy(overrides = {}) {
  return {
    provider: 'openai', model: 'gpt-5.6-terra', reasoningEffort: 'low', apiKey: 'openai-key',
    fallback: {
      enabled: true, provider: 'gemini', model: 'gemini-3.8-flash',
      reasoningEffort: 'low', apiKey: 'gemini-key'
    },
    ...overrides
  };
}

test('Shot writer supplies verified image as image input on primary and fallback', async () => {
  const requests=[];
  const router=new CinematicTextProviderRouter(policy(),{
    primaryProviderFactory:key=>new OpenAITextProvider(key,{fetchImpl:async (_,options)=>{
      requests.push(JSON.parse(options.body));
      return {ok:false,status:429,json:async()=>({error:{message:'private-image-echo'}})};
    }}),
    fallbackProviderFactory:key=>new GeminiCinematicTextProvider(key,{fetchImpl:async (_,options)=>{
      requests.push(JSON.parse(options.body));
      return {ok:true,json:async()=>({output_text:'{"shots":[]}'})};
    }})
  });
  const sceneImage={mimeType:'image/jpeg',data:Buffer.from('fixture').toString('base64')};
  const args={context:{scene:{location:'Inn'}},model:'gpt-5.6-terra',maxOutputTokens:500,timeoutMs:1000};
  await router.generateCinematicSceneShots({...args,sceneImage});
  assert.deepEqual(requests[0].input[0].content,[
    {type:'input_text',text:JSON.stringify(args.context)},
    {type:'input_image',image_url:'data:image/jpeg;base64,'+sceneImage.data}]);
  assert.deepEqual(requests[1].input,[{type:'text',text:JSON.stringify(args.context)},
    {type:'image',mime_type:'image/jpeg',data:sceneImage.data}]);
  await router.generateCinematicSceneShots(args);
  assert.equal(requests[2].input, JSON.stringify(args.context));
  assert.ok(requests.every(request=>request.store===false));
});

test('Cinematic text router keeps Terra when the primary request succeeds', async () => {
  let fallbackCalls = 0;
  const router = new CinematicTextProviderRouter(policy(), {
    primaryProviderFactory: () => ({ generateCinematicStoryPlan: async () => ({ objective: 'Ready' }) }),
    fallbackProviderFactory: () => ({
      generateCinematicStoryPlan: async () => { fallbackCalls += 1; return { objective: 'Fallback' }; }
    })
  });

  const result = await router.generateCinematicStoryPlan({ model: 'gpt-5.6-terra' });
  assert.equal(result.executionProvider, 'openai');
  assert.equal(result.executionModel, 'gpt-5.6-terra');
  assert.equal(result.fallbackUsed, false);
  assert.equal(fallbackCalls, 0);
});

test('Cinematic text router falls back on quota and remains sticky for the operation', async () => {
  let primaryCalls = 0;
  let fallbackCalls = 0;
  const router = new CinematicTextProviderRouter(policy(), {
    primaryProviderFactory: () => ({
      generateCinematicStoryPlan: async () => {
        primaryCalls += 1;
        const error = new Error('Quota exhausted.');
        error.code = 'cinematic_story_plan_provider_error';
        error.status = 429;
        throw error;
      }
    }),
    fallbackProviderFactory: () => ({
      generateCinematicStoryPlan: async args => {
        fallbackCalls += 1;
        assert.equal(args.model, 'gemini-3.8-flash');
        return { objective: `Fallback ${fallbackCalls}` };
      }
    })
  });

  const first = await router.generateCinematicStoryPlan({ model: 'gpt-5.6-terra' });
  const repair = await router.generateCinematicStoryPlan({ model: 'gpt-5.6-terra' });
  assert.equal(primaryCalls, 1);
  assert.equal(fallbackCalls, 2);
  assert.equal(first.fallbackReason, 'primary_rate_or_quota_exhausted');
  assert.equal(repair.executionProvider, 'gemini');
  assert.equal(repair.fallbackUsed, true);
});

test('Cinematic text router does not mask invalid request or auth failures', async () => {
  let fallbackCalls = 0;
  const router = new CinematicTextProviderRouter(policy(), {
    primaryProviderFactory: () => ({
      generateCinematicSceneDirection: async () => {
        const error = new Error('Invalid request.');
        error.code = 'cinematic_scene_direction_provider_error';
        error.status = 400;
        throw error;
      }
    }),
    fallbackProviderFactory: () => ({
      generateCinematicSceneDirection: async () => { fallbackCalls += 1; return {}; }
    })
  });

  await assert.rejects(
    router.generateCinematicSceneDirection({ model: 'gpt-5.6-terra' }),
    error => error.status === 400
  );
  assert.equal(fallbackCalls, 0);
  assert.equal(isEligibleFallbackFailure({ status: 401, code: 'provider_error' }), false);
  assert.equal(isEligibleFallbackFailure({ code: 'cinematic_story_plan_invalid_response' }), false);
  assert.equal(isEligibleFallbackFailure({ code: 'cinematic_story_plan_timeout' }), true);
});

test('Cinematic text router recognizes an explicit exhausted-quota provider code', () => {
  assert.equal(isEligibleFallbackFailure({
    status: 400,
    code: 'cinematic_story_plan_provider_error',
    providerCode: 'insufficient_quota'
  }), true);
});

test('Cinematic text router skips a runtime-disabled primary and uses only an enabled fallback', async () => {
  let primaryCalls = 0;
  let fallbackCalls = 0;
  const availabilityPolicy = new ProviderAvailabilityPolicyService({
    initialState: {
      schemaVersion: 1, version: 1, updatedAt: null, models: {}, workflows: {}, history: [],
      providers: { openai: { enabled: false, reason: 'Primary maintenance' } }
    }
  });
  const router = new CinematicTextProviderRouter(policy(), {
    availabilityPolicy,
    primaryProviderFactory: () => ({
      generateCinematicStoryPlan: async () => { primaryCalls += 1; return {}; }
    }),
    fallbackProviderFactory: () => ({
      generateCinematicStoryPlan: async () => { fallbackCalls += 1; return { objective: 'Fallback' }; }
    })
  });

  const result = await router.generateCinematicStoryPlan({ model: 'gpt-5.6-terra' });
  assert.equal(primaryCalls, 0);
  assert.equal(fallbackCalls, 1);
  assert.equal(result.executionProvider, 'gemini');
  assert.equal(result.fallbackReason, 'primary_disabled_by_admin');
});

test('Cinematic text router falls back once for Scene-to-Shot transport failure', async () => {
  let primaryCalls = 0;
  let fallbackCalls = 0;
  const router = new CinematicTextProviderRouter(policy(), {
    primaryProviderFactory: () => ({
      generateCinematicSceneShots: async () => {
        primaryCalls += 1;
        throw Object.assign(new Error('Provider connection unavailable.'), {
          code: 'cinematic_scene_shots_transport_error', statusCode: 503
        });
      }
    }),
    fallbackProviderFactory: () => ({
      generateCinematicSceneShots: async args => {
        fallbackCalls += 1;
        assert.equal(args.model, 'gemini-3.8-flash');
        return { shots: [{ title: 'Opening' }], warnings: [], responseId: 'gemini-shot-response' };
      }
    })
  });

  const result = await router.generateCinematicSceneShots({ model: 'gpt-5.6-terra' });
  assert.equal(primaryCalls, 1);
  assert.equal(fallbackCalls, 1);
  assert.equal(result.executionProvider, 'gemini');
  assert.equal(result.executionModel, 'gemini-3.8-flash');
  assert.equal(result.fallbackUsed, true);
  assert.equal(result.fallbackReason, 'primary_transport_failure');
});

test('Cinematic text router exposes bounded dual-transport failure metadata', async () => {
  const router = new CinematicTextProviderRouter(policy(), {
    primaryProviderFactory: () => ({
      generateCinematicSceneShots: async () => {
        throw Object.assign(new Error('Primary unavailable.'), {
          code: 'cinematic_scene_shots_transport_error', statusCode: 503
        });
      }
    }),
    fallbackProviderFactory: () => ({
      generateCinematicSceneShots: async () => {
        throw Object.assign(new Error('Fallback unavailable.'), {
          code: 'cinematic_scene_shots_transport_error', statusCode: 503,
          details: { reason: 'ECONNRESET' }
        });
      }
    })
  });

  await assert.rejects(
    router.generateCinematicSceneShots({ model: 'gpt-5.6-terra' }),
    error => {
      assert.deepEqual(error.details, {
        reason: 'ECONNRESET',
        fallbackAttempted: true,
        primaryFailureCode: 'cinematic_scene_shots_transport_error',
        fallbackFailureCode: 'cinematic_scene_shots_transport_error'
      });
      assert.doesNotMatch(JSON.stringify(error.details), /Primary unavailable|Fallback unavailable/);
      return true;
    }
  );
});

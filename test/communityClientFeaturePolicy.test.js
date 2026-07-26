import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(
  new URL('../client/community/communityFeaturePolicy.js', import.meta.url),
  'utf8'
);

test('client Community policy follows server flags for navigation and feature controls', async () => {
  const events = [];
  const context = createContext({
    schemaVersion: 1,
    community: {
      enabled: true,
      shareEnabled: false,
      exploreEnabled: false,
      engagementEnabled: false,
      creatorProfilesEnabled: true,
      galleryEnabled: false,
      moderationEnabled: true,
      privateBeta: false
    },
    development: { mockActorSwitcherEnabled: true },
    routing: { automaticSimpleModeEnabled: false }
  }, events);
  vm.runInNewContext(source, context);

  assert.equal(
    context.window.ModelPromptForgeCommunityFeatures.isRouteEnabled('/community'),
    true,
    'Unknown startup state preserves the current route until server flags load.'
  );
  await context.window.ModelPromptForgeCommunityFeatures.initialize();
  assert.equal(context.window.ModelPromptForgeCommunityFeatures.isEnabled('community.enabled'), true);
  assert.equal(context.window.ModelPromptForgeCommunityFeatures.isEnabled('community.shareEnabled'), false);
  assert.equal(context.window.ModelPromptForgeCommunityFeatures.isRouteEnabled('/creators/alice'), true);
  assert.equal(events.at(-1).type, 'modelpromptforge:communityfeatureschange');
});

test('client Community policy fails closed when feature discovery is unavailable', async () => {
  const context = createContext(null, [], new Error('feature API unavailable'));
  vm.runInNewContext(source, context);
  await context.window.ModelPromptForgeCommunityFeatures.initialize();

  assert.equal(context.window.ModelPromptForgeCommunityFeatures.isEnabled('community.enabled'), false);
  assert.equal(context.window.ModelPromptForgeCommunityFeatures.isRouteEnabled('/community'), false);
  assert.equal(context.window.ModelPromptForgeCommunityFeatures.isRouteEnabled('/studio'), true);
});

function createContext(featurePayload, events, apiError = null) {
  const domListeners = new Map();
  class TestCustomEvent {
    constructor(type, init = {}) {
      this.type = type;
      this.detail = init.detail;
    }
  }
  const window = {
    ModelPromptForgeApiClient: {
      async apiJson() {
        if (apiError) throw apiError;
        return structuredClone(featurePayload);
      }
    },
    dispatchEvent(event) {
      events.push(event);
    }
  };
  return vm.createContext({
    window,
    document: {
      addEventListener(type, handler) {
        domListeners.set(type, handler);
      }
    },
    CustomEvent: TestCustomEvent,
    structuredClone,
    Object,
    Number,
    String,
    Error,
    Promise
  });
}

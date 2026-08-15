import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const sourceUrl = new URL('../client/shell/navigationContext.js', import.meta.url);

function loadContextModule({ pathname = '/creators/mint/gallery', actorId = 'usr_demo' } = {}) {
  const listeners = new Map();
  const calls = [];
  const window = {
    location: { origin: 'http://localhost:6500' },
    scrollY: 240,
    history: { replaceState() {} },
    ModelPromptForgeActorContext: {
      getActiveMockUserId: () => actorId
    },
    ModelPromptForgeNavigationRegistry: {
      isAllowedRoute: value => value.startsWith('/'),
      isAccessibleRoute: () => true,
      getModuleForPath: () => ({ id: 'community' })
    },
    ModelPromptForgeRouter: {
      current: () => ({
        pathname,
        search: '?tab=gallery',
        state: { viewState: { activeTab: 'gallery' } }
      }),
      navigate: (...args) => {
        calls.push(args);
        return true;
      }
    },
    addEventListener(type, handler) {
      listeners.set(type, handler);
    }
  };
  const context = {
    window,
    document: { title: 'Mint Studio' },
    location: { href: `http://localhost:6500${pathname}` },
    URL,
    console
  };
  vm.createContext(context);
  return readFile(sourceUrl, 'utf8').then(source => {
    vm.runInContext(source, context);
    return { api: window.ModelPromptForgeNavigationContext, calls, window };
  });
}

test('navigation context preserves a small actor-scoped return route', async () => {
  const { api } = await loadContextModule({});
  const value = api.create({ sourceViewId: 'creator-gallery' });
  assert.equal(value.version, 1);
  assert.equal(value.actorId, 'usr_demo');
  assert.equal(value.sourceRoute, '/creators/mint/gallery?tab=gallery');
  assert.equal(value.sourceScrollY, 240);
  assert.equal(value.sourceState.activeTab, 'gallery');
  assert.equal(api.isValid(value), true);
});

test('contextual back replaces detail with source route', async () => {
  const { api, calls, window } = await loadContextModule({});
  const navigationContext = api.create();
  window.ModelPromptForgeRouter.current = () => ({
    pathname: '/community/post-1',
    state: { navigationContext }
  });
  assert.equal(api.back({ canonicalParent: '/community' }), true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], '/creators/mint/gallery?tab=gallery');
  assert.equal(calls[0][1].replace, true);
});

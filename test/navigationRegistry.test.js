import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const configUrl = new URL('../client/shell/navigation.config.json', import.meta.url);

async function loadRegistry() {
  const config = JSON.parse(await readFile(configUrl, 'utf8'));
  globalThis.location = { origin: 'http://localhost:6500' };
  globalThis.window = {
    ModelPromptForgeNavigationConfig: {
      getConfig: () => config
    },
    ModelPromptForgeCommunityFeatures: {
      isRouteEnabled: () => true
    }
  };
  await import(`../client/shell/navigationRegistry.js?test=${Date.now()}-${Math.random()}`);
  return globalThis.window.ModelPromptForgeNavigationRegistry;
}

test('navigation registry exposes only implemented modules and allowlisted routes', async () => {
  try {
    const registry = await loadRegistry();
    assert.deepEqual(registry.listVisible().map(module => module.id), [
      'home',
      'studio',
      'easy-create',
      'character-builder',
      'scene-builder',
      'playground',
      'comparisons',
      'my-images',
      'my-characters'
    ]);
    assert.equal(registry.isAllowedRoute('/comparisons/cmp_set_123'), true);
    assert.equal(registry.isAllowedRoute('/projects'), false);
    assert.equal(registry.getModuleForPath('/comparisons/cmp_set_123').id, 'comparisons');
    assert.equal(registry.getModuleForPath('/create/characters').workflowIntent.mode, 'character-sheet');
  } finally {
    delete globalThis.window;
    delete globalThis.location;
  }
});

test('navigation registry can hide a feature-flagged module', async () => {
  try {
    const registry = await loadRegistry();
    const modules = registry.listVisible({
      featureFlags: { aiComparison: false }
    });
    assert.equal(modules.some(module => module.id === 'comparisons'), false);
    assert.equal(modules.some(module => module.id === 'easy-create'), true);
  } finally {
    delete globalThis.window;
    delete globalThis.location;
  }
});

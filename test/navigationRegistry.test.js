import assert from 'node:assert/strict';
import test from 'node:test';

test('navigation registry exposes only implemented modules and allowlisted routes', async () => {
  globalThis.window = {};
  try {
    await import(`../client/shell/navigationRegistry.js?test=${Date.now()}`);
    const registry = globalThis.window.ModelPromptForgeNavigationRegistry;
    assert.deepEqual(registry.listVisible().map(module => module.id), ['studio', 'history', 'comparisons']);
    assert.equal(registry.isAllowedRoute('/comparisons/cmp_set_123'), true);
    assert.equal(registry.isAllowedRoute('/projects'), false);
    assert.equal(registry.getModuleForPath('/comparisons/cmp_set_123').id, 'comparisons');
  } finally {
    delete globalThis.window;
  }
});

test('navigation registry can hide a feature-flagged module', async () => {
  globalThis.window = {};
  try {
    await import(`../client/shell/navigationRegistry.js?test=${Date.now()}-flags`);
    const modules = globalThis.window.ModelPromptForgeNavigationRegistry.listVisible({
      featureFlags: { aiComparison: false }
    });
    assert.deepEqual(modules.map(module => module.id), ['studio', 'history']);
  } finally {
    delete globalThis.window;
  }
});

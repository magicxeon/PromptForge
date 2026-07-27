import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const configUrl = new URL('../client/shell/navigation.config.json', import.meta.url);

test('navigation config has unique enabled routes and one canonical Home item', async () => {
  const config = JSON.parse(await readFile(configUrl, 'utf8'));
  assert.equal(config.version, 1);
  assert.equal(config.homeRoute, '/community');
  assert.ok(Array.isArray(config.groups));
  assert.ok(Array.isArray(config.items));

  const ids = config.items.map(item => item.id);
  assert.equal(new Set(ids).size, ids.length, 'Navigation item IDs must be unique.');

  const enabled = config.items.filter(item => item.enabled !== false);
  const enabledRoutes = enabled.map(item => item.route);
  assert.equal(
    new Set(enabledRoutes).size,
    enabledRoutes.length,
    'Enabled navigation routes must be unique.'
  );

  const homeItems = enabled.filter(item => item.route === '/community');
  assert.equal(homeItems.length, 1);
  assert.equal(homeItems[0].id, 'home');
  const studio = enabled.find(item => item.id === 'studio');
  assert.ok(studio);
  assert.equal(studio.route, '/studio');
  assert.deepEqual(
    enabled.filter(item => item.parentId === 'studio').map(item => item.id),
    ['easy-create', 'character-builder', 'scene-builder']
  );
  assert.equal(
    enabled.some(item => item.id === 'community'),
    false,
    'Home and Community must not appear as duplicate navigation items.'
  );
});

test('unimplemented Fashion Studio remains configurable but hidden', async () => {
  const config = JSON.parse(await readFile(configUrl, 'utf8'));
  const fashion = config.items.find(item => item.id === 'fashion-studio');
  assert.ok(fashion);
  assert.equal(fashion.enabled, false);
  assert.equal(fashion.featured, true);
  assert.equal(fashion.workflowIntent?.workflowId, 'fashion');
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerGenerationRoutes } from '../server/app/routes/generationRoutes.js';

test('document preview requires an actor and cannot reveal Template or general prompts', async () => {
  const routes = new Map();
  let calls = 0;
  registerGenerationRoutes({ get() {}, post: (path, handler) => routes.set(path, handler) }, {
    generationApplicationService: { preview: async () => { calls++; return { compiledPrompt: 'authorized document' }; } }
  });
  const invoke = async (body, actorContext = { userId: 'owner', role: 'user' }) => {
    const response = { statusCode: 200, set() {}, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; return this; } };
    await routes.get('/api/generation/look-sheet-preview')({ body, actorContext }, response);
    return response;
  };
  const input = { lookSheetDefinition: { schemaVersion: 1 }, generationMode: 'character-sheet' };
  assert.equal((await invoke(input, null)).statusCode, 401);
  assert.equal((await invoke({})).statusCode, 400);
  assert.equal((await invoke({ ...input, templateUseSessionId: 'private-template' })).statusCode, 400);
  assert.equal((await invoke({ ...input, sceneTemplateSnapshot: {} })).statusCode, 400);
  assert.equal((await invoke({ ...input, sceneBuilder: { templateDraft: {} } })).statusCode, 400);
  assert.equal(calls, 0);
  assert.equal((await invoke(input)).body.compiledPrompt, 'authorized document');
  assert.equal(calls, 1);
});

import { beforeEach, expect, it, vi } from 'vitest';
import { createGeneratedShareDraft } from './shareApi';

const mocks = vi.hoisted(() => ({ response: {} as Record<string, unknown> }));
vi.mock('../../../lib/api/apiClient', () => ({
  apiRequest: async (_path: string, options: { schema: { parse: (value: unknown) => unknown } }) =>
    options.schema.parse(mocks.response)
}));

beforeEach(() => {
  mocks.response = { id: 'draft', sourceGenerationId: 'job', templateEligible: true };
});

it('uses private for an omitted draft policy and does not invent remix capability', async () => {
  const draft = await createGeneratedShareDraft('job');
  expect(draft.promptVisibility).toBe('private');
  expect(draft.allowedTemplatePromptVisibilities).toEqual(['full']);
});

it('retains explicit draft policy and server supplied Template capabilities', async () => {
  mocks.response.promptVisibility = 'full';
  mocks.response.allowedTemplatePromptVisibilities = ['full', 'remix_only'];
  const draft = await createGeneratedShareDraft('job');
  expect(draft.promptVisibility).toBe('full');
  expect(draft.allowedTemplatePromptVisibilities).toEqual(['full', 'remix_only']);
});

it('retains an empty Template policy list for ineligible or derived sources', async () => {
  mocks.response.allowedTemplatePromptVisibilities = [];
  expect((await createGeneratedShareDraft('job')).allowedTemplatePromptVisibilities).toEqual([]);
});

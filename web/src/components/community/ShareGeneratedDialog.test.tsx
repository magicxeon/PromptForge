import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ShareGeneratedDialog } from './ShareGeneratedDialog';
import { MemoryRouter } from 'react-router-dom';
import { ApiError } from '../../lib/api/apiError';

const apiMocks = vi.hoisted(() => ({
  createGeneratedShareDraft: vi.fn(),
  getGenerationShareStatus: vi.fn(),
  getCommunityPost: vi.fn(),
  publishGeneratedShare: vi.fn(),
  showToast: vi.fn()
}));

vi.mock('../../features/community/api/shareApi', () => ({
  createGeneratedShareDraft: apiMocks.createGeneratedShareDraft,
  getGenerationShareStatus: apiMocks.getGenerationShareStatus,
  publishGeneratedShare: apiMocks.publishGeneratedShare
}));

vi.mock('../../features/community/api/communityApi', () => ({
  getCommunityPost: apiMocks.getCommunityPost
}));

vi.mock('../ui/toastStore', () => ({ showToast: apiMocks.showToast }));
vi.mock('../../lib/auth/ActorProvider', () => ({ useActor: () => ({ actor: { userId: 'alice' } }) }));
vi.mock('../../lib/auth/actorStore', () => ({ getActiveActorId: () => 'alice' }));

vi.mock('../templates/SharedTemplateEditDialog', () => ({
  SharedTemplateEditDialog: ({
    autoEstimateReadiness,
    open
  }: {
    autoEstimateReadiness?: boolean;
    open?: boolean;
  }) => open ? (
    <div
      role="dialog"
      aria-label="Edit shared template"
      data-auto-estimate={String(Boolean(autoEstimateReadiness))}
    />
  ) : null
}));

const testI18n = i18next.createInstance();
const inputPolicy = { policyId: 'character-outfit-v1', supported: true, characterAvailable: true,
  outfitBackAvailable: true, characterEnabled: true, outfitBackEnabled: true, removedFields: [] };

describe('ShareGeneratedDialog', () => {
  beforeAll(async () => {
    await testI18n.use(initReactI18next).init({
      lng: 'en',
      resources: {
        en: {
          'react-ui': {
            'ui.action.cancel': 'Cancel',
            'ui.action.close': 'Close',
            'ui.action.publish': 'Publish',
            'ui.share.publishImageAction': 'Publish',
            'ui.share.publishTemplateAction': 'Publish',
            'ui.share.viewPost': 'View post',
            'ui.share.viewTemplate': 'View Template',
            'ui.action.share': 'Share',
            'ui.character.private': 'Private',
            'ui.character.public': 'Public',
            'ui.share.description': 'Review sharing settings.',
            'ui.share.full': 'Full prompt',
            'ui.share.postDescription': 'Description',
            'ui.share.postTitle': 'Post title',
            'ui.share.postVisibility': 'Post visibility',
            'ui.share.promptVisibility': 'Prompt visibility',
            'ui.share.publishTemplate': 'Publish as reusable template',
            'ui.share.publishTemplateHelp': 'Prepare this reusable workflow.',
            'ui.share.templatePromptPolicyRequired': 'Choose a compatible prompt visibility before publishing this Template.',
            'ui.share.remixOnly': 'Remix only',
            'ui.share.required': 'Required',
            'ui.share.templateCredits': 'Template access credits',
            'ui.share.templateInputs': 'Template inputs',
            'ui.share.includedAutomatically': 'Included automatically: {{inputs}}',
            'ui.share.title': 'Share to Community',
            'ui.share.alreadyShared': 'Shared',
            'ui.share.retryStatus': 'Retry share status',
            'ui.templateInputs.title': 'Template replacements',
            'ui.templateInputs.outfitFront': 'Outfit front',
            'ui.templateInputs.outfitBack': 'Outfit back',
            'ui.templateInputs.character': 'Character',
            'ui.templateInputs.optional': 'Optional',
            'ui.templateInputs.required': 'Required',
            'ui.share.unlisted': 'Unlisted',
            'ui.toast.postPublished': 'Post published',
            'ui.toast.templateSetupSaved': 'Template setup saved',
            'ui.toast.templateSetupSavedDescription': 'Continue setup.'
          }
        }
      },
      interpolation: { escapeValue: false }
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.getGenerationShareStatus.mockResolvedValue({ shared: false });
  });

  it('opens reusable Template setup immediately after publishing the owner draft', async () => {
    apiMocks.createGeneratedShareDraft.mockResolvedValue({
      id: 'draft_1',
      sourceGenerationId: 'job_1',
      templateEligible: true,
      templateInputPolicy: inputPolicy,
      mandatoryTemplateInputIds: [],
      suggestedTemplateInputSchema: { schemaVersion: 1, inputs: [] }
    });
    apiMocks.publishGeneratedShare.mockResolvedValue({
      id: 'post_1',
      postType: 'template',
      templateId: 'tmpl_1',
      templateVersionId: 'tmplv_1'
    });
    apiMocks.getCommunityPost.mockResolvedValue({
      id: 'post_1',
      postType: 'template',
      templateId: 'tmpl_1',
      templateVersionId: 'tmplv_1'
    });

    renderDialog();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Share' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Share' }));
    await screen.findByRole('dialog', { name: 'Share to Community' });
    fireEvent.change(await screen.findByPlaceholderText('Post title'), {
      target: { value: 'Reusable look' }
    });
    const templateToggle = screen.getByRole('checkbox', {
      name: /Publish as reusable template/
    });
    expect(templateToggle).not.toBeChecked();
    expect(screen.getByLabelText('Prompt visibility')).toHaveValue('private');
    fireEvent.click(templateToggle);
    expect(screen.getByLabelText('Prompt visibility')).toHaveValue('private');
    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('Choose a compatible prompt visibility');
    fireEvent.submit(screen.getByPlaceholderText('Post title').closest('form')!);
    expect(apiMocks.publishGeneratedShare).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Prompt visibility'), { target: { value: 'full' } });
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));

    const management = await screen.findByRole('dialog', { name: 'Edit shared template' });
    expect(management).toHaveAttribute('data-auto-estimate', 'true');
    expect(apiMocks.publishGeneratedShare).toHaveBeenCalledWith(
      'draft_1',
      expect.objectContaining({ publishAsTemplate: true, promptVisibility: 'full' })
    );
    expect(apiMocks.getCommunityPost).toHaveBeenCalledWith('post_1');
  });

  it('keeps ordinary image sharing on the existing completion path', async () => {
    apiMocks.createGeneratedShareDraft.mockResolvedValue({
      id: 'draft_image',
      sourceGenerationId: 'job_1',
      templateEligible: false,
      mandatoryTemplateInputIds: []
    });
    apiMocks.publishGeneratedShare.mockResolvedValue({
      id: 'post_image',
      postType: 'image'
    });

    renderDialog();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Share' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Share' }));
    await screen.findByRole('dialog', { name: 'Share to Community' });
    expect(screen.queryByRole('checkbox', {
      name: /Publish as reusable template/
    })).not.toBeInTheDocument();
    fireEvent.change(await screen.findByPlaceholderText('Post title'), {
      target: { value: 'Single image' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Share to Community' })).not.toBeInTheDocument();
    });
    expect(screen.queryByRole('dialog', { name: 'Edit shared template' })).not.toBeInTheDocument();
    expect(apiMocks.getCommunityPost).not.toHaveBeenCalled();
    expect(apiMocks.publishGeneratedShare).toHaveBeenCalledWith('draft_image', expect.objectContaining({
      promptVisibility: 'private', visibility: 'public', publishAsTemplate: false
    }));
    expect(apiMocks.showToast).toHaveBeenCalledWith({
      tone: 'success',
      title: 'Post published'
    });
  });

  it('keeps mandatory Template inputs read-only and outside creator selections', async () => {
    apiMocks.createGeneratedShareDraft.mockResolvedValue({
      id: 'draft_mandatory',
      sourceGenerationId: 'job_1',
      templateEligible: true,
      templateInputPolicy: inputPolicy,
      mandatoryTemplateInputIds: ['outfit_front_reference'],
      suggestedTemplateInputSchema: {
        schemaVersion: 1,
        inputs: [
          {
            id: 'outfit_front_reference',
            label: 'Outfit Front',
            sourceFieldName: 'outfit_front_reference'
          },
          {
            id: 'expression',
            label: 'Expression',
            sourceFieldName: 'Expression'
          }
        ]
      }
    });
    apiMocks.publishGeneratedShare.mockResolvedValue({
      id: 'post_mandatory',
      postType: 'template',
      templateId: 'tmpl_1',
      templateVersionId: 'tmplv_1'
    });
    apiMocks.getCommunityPost.mockResolvedValue({
      id: 'post_mandatory',
      postType: 'template',
      templateId: 'tmpl_1',
      templateVersionId: 'tmplv_1'
    });

    renderDialog();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Share' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Share' }));
    await screen.findByRole('dialog', { name: 'Share to Community' });
    fireEvent.change(screen.getByPlaceholderText('Post title'), {
      target: { value: 'Mandatory look' }
    });
    fireEvent.click(screen.getByRole('checkbox', {
      name: /Publish as reusable template/
    }));

    expect(screen.getByText('Outfit front')).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /Outfit front/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: 'Expression' })).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /Face|Pose|Environment/ })).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Character Optional' })).toBeChecked();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Character Optional' }));
    fireEvent.change(screen.getByLabelText('Prompt visibility'), { target: { value: 'full' } });
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    await waitFor(() => expect(apiMocks.publishGeneratedShare).toHaveBeenCalledWith('draft_mandatory',
      expect.objectContaining({ templateInputOptions: { characterEnabled: false, outfitBackEnabled: true } })));
  });

  it('uses server Template policy capabilities and preserves privacy when Template intent is cancelled', async () => {
    apiMocks.createGeneratedShareDraft.mockResolvedValue({ id: 'guided', templateEligible: true,
      templateInputPolicy: inputPolicy, promptVisibility: 'private',
      allowedTemplatePromptVisibilities: ['full', 'remix_only'] });
    renderDialog();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Share' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Share' }));
    await screen.findByPlaceholderText('Post title');
    const toggle = screen.getByRole('checkbox', { name: /Publish as reusable template/ });
    const prompt = screen.getByLabelText('Prompt visibility');
    fireEvent.click(toggle);
    fireEvent.change(prompt, { target: { value: 'remix_only' } });
    expect(screen.getByRole('button', { name: 'Publish' })).toBeEnabled();
    fireEvent.change(prompt, { target: { value: 'partial' } });
    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();
    fireEvent.change(prompt, { target: { value: 'private' } });
    fireEvent.click(toggle);
    expect(prompt).toHaveValue('private');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publish' })).toBeEnabled();
  });

  it('does not offer unsupported Remix Only for a manual Template source', async () => {
    apiMocks.createGeneratedShareDraft.mockResolvedValue({ id: 'manual', templateEligible: true,
      templateInputPolicy: inputPolicy, allowedTemplatePromptVisibilities: ['full'] });
    renderDialog();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Share' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Share' }));
    await screen.findByPlaceholderText('Post title');
    expect(screen.queryByRole('option', { name: 'Remix only' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Prompt visibility')).toHaveValue('private');
  });
});

it('hides Template and prompt controls for derived images, shares privately then disables sharing', async () => {
  apiMocks.getGenerationShareStatus.mockResolvedValue({ shared: false });
  apiMocks.createGeneratedShareDraft.mockResolvedValue({ id: 'derived', templateEligible: false,
    templateIneligibleReason: 'template_derived_generation', promptVisibility: 'private' });
  apiMocks.publishGeneratedShare.mockResolvedValue({ id: 'image', postType: 'image' });
  const client = renderDialog();
  const preview = ['community-template-previews', 'alice', ['root']];
  const otherActor = ['community-template-previews', 'bob', ['root']];
  client.setQueryData(preview, { items: [] });
  client.setQueryData(otherActor, { items: [] });
  await waitFor(() => expect(screen.getByRole('button', { name: 'Share' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Share' }));
  fireEvent.change(await screen.findByPlaceholderText('Post title'), { target: { value: 'My creation' } });
  expect(screen.queryByText('Prompt visibility')).not.toBeInTheDocument();
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Post visibility')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Shared' })).toBeDisabled());
  expect(apiMocks.publishGeneratedShare).toHaveBeenLastCalledWith('derived', expect.objectContaining({
    publishAsTemplate: false, promptVisibility: 'private', templateInputOptions: undefined
  }));
  expect(client.getQueryState(preview)?.isInvalidated).toBe(true);
  expect(client.getQueryState(otherActor)?.isInvalidated).toBe(false);
});

it('disables already-shared results on load without creating a draft', async () => {
  vi.clearAllMocks();
  apiMocks.getGenerationShareStatus.mockResolvedValue({ shared: true });
  renderDialog();
  expect(await screen.findByRole('button', { name: 'Shared' })).toBeDisabled();
  expect(apiMocks.createGeneratedShareDraft).not.toHaveBeenCalled();
});

it('recovers status-read errors with an explicit retry', async () => {
  vi.clearAllMocks();
  apiMocks.getGenerationShareStatus.mockResolvedValue({ shared: false }).mockRejectedValueOnce(new Error('offline'));
  renderDialog();
  fireEvent.click(await screen.findByRole('button', { name: 'Retry share status' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Share' })).toBeEnabled());
  expect(apiMocks.createGeneratedShareDraft).not.toHaveBeenCalled();
});

it('disables after a stale draft gets an already-shared conflict', async () => {
  apiMocks.getGenerationShareStatus.mockResolvedValueOnce({ shared: false }).mockResolvedValue({ shared: true,
    post: { id: 'existing', postType: 'image', visibility: 'public', status: 'published' } });
  apiMocks.createGeneratedShareDraft.mockResolvedValue({ id: 'stale', templateEligible: false });
  apiMocks.publishGeneratedShare.mockRejectedValue(new ApiError({ status: 409,
    code: 'community_generation_already_shared', message: 'Already shared' }));
  const client = renderDialog();
  const preview = ['community-template-previews', 'alice', ['root']];
  client.setQueryData(preview, { items: [] });
  await waitFor(() => expect(screen.getByRole('button', { name: 'Share' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Share' }));
  fireEvent.change(await screen.findByPlaceholderText('Post title'), { target: { value: 'Duplicate' } });
  fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Shared' })).toBeDisabled());
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(client.getQueryState(preview)?.isInvalidated).toBe(false);
  expect(screen.getByRole('link', { name: 'View post' })).toHaveAttribute('href', '/posts/existing');
});

it('retains a saved Template destination when loading its management dialog fails', async () => {
  vi.clearAllMocks();
  apiMocks.getGenerationShareStatus.mockResolvedValue({ shared: false });
  apiMocks.createGeneratedShareDraft.mockResolvedValue({ id: 'draft', templateEligible: true, templateInputPolicy: inputPolicy });
  apiMocks.publishGeneratedShare.mockResolvedValue({ id: 'saved-template', postType: 'template' });
  apiMocks.getCommunityPost.mockRejectedValue(new Error('offline'));
  renderDialog();
  await waitFor(() => expect(screen.getByRole('button', { name: 'Share' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Share' }));
  fireEvent.change(await screen.findByPlaceholderText('Post title'), { target: { value: 'My Template' } });
  fireEvent.click(screen.getByRole('checkbox', { name: /Publish as reusable template/ }));
  fireEvent.change(screen.getByLabelText('Prompt visibility'), { target: { value: 'full' } });
  fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
  expect(await screen.findByRole('link', { name: 'View Template' })).toHaveAttribute('href', '/explore/templates/saved-template');
  expect(screen.getByRole('button', { name: 'Shared' })).toBeDisabled();
  expect(apiMocks.publishGeneratedShare).toHaveBeenCalledTimes(1);
  expect(apiMocks.showToast).not.toHaveBeenCalledWith(expect.objectContaining({ title: 'ui.toast.publishFailed' }));
});

function renderDialog() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  render(
    <I18nextProvider i18n={testI18n}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter><ShareGeneratedDialog jobId="job_1" /></MemoryRouter>
      </QueryClientProvider>
    </I18nextProvider>
  );
  return queryClient;
}

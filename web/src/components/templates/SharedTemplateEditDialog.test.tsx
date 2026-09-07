import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { communityPostSchema } from '../../features/community/schemas/communitySchemas';
import { SharedTemplateEditDialog } from './SharedTemplateEditDialog';
import '../../styles/media-viewer.css';
import '../../styles/template-management.css';

const apiMocks = vi.hoisted(() => ({
  estimateTemplatePoseProxy: vi.fn(),
  getTemplatePoseProxy: vi.fn(),
  prepareTemplatePoseProxy: vi.fn(),
  retireCommunityPost: vi.fn(),
  reviewTemplatePoseProxy: vi.fn(),
  updateCommunityPostPresentation: vi.fn(),
  navigate: vi.fn(),
  getTemplateInputPolicy: vi.fn()
}));

vi.mock('react-router-dom', async importOriginal => ({
  ...await importOriginal<typeof import('react-router-dom')>(),
  useNavigate: () => apiMocks.navigate
}));

vi.mock('../../lib/auth/ActorProvider', () => ({
  useActor: () => ({ actor: { userId: 'usr_owner' } })
}));

vi.mock('../../features/templates/templatePoseProxyApi', () => ({
  estimateTemplatePoseProxy: apiMocks.estimateTemplatePoseProxy,
  getTemplatePoseProxy: apiMocks.getTemplatePoseProxy,
  prepareTemplatePoseProxy: apiMocks.prepareTemplatePoseProxy,
  reviewTemplatePoseProxy: apiMocks.reviewTemplatePoseProxy
}));

vi.mock('../../features/templates/templateInputPolicyApi', () => ({
  getTemplateInputPolicy: apiMocks.getTemplateInputPolicy
}));

vi.mock('../../features/community/api/communityApi', () => ({
  retireCommunityPost: apiMocks.retireCommunityPost,
  updateCommunityPostPresentation: apiMocks.updateCommunityPostPresentation
}));

const testI18n = i18next.createInstance();

const post = communityPostSchema.parse({
  id: 'post_template_draft',
  postType: 'template',
  status: 'draft',
  creator: { displayName: 'Owner' },
  title: 'Editorial Walk',
  description: 'Original description',
  visibility: 'unlisted',
  customTags: ['editorial', 'walk'],
  promptVisibility: 'remix_only',
  templateId: 'tmpl_1',
  templateVersionId: 'tmplv_1',
  templatePricing: { accessCredits: 8, currency: 'credits' },
  engagementSummary: {}
});

describe('SharedTemplateEditDialog', () => {
  beforeAll(async () => {
    await testI18n.use(initReactI18next).init({
      lng: 'en',
      resources: {
        en: {
          'react-ui': {
            'ui.templateManagement.title': 'Edit shared template',
            'ui.templateInputs.character': 'Character',
            'ui.templateInputs.outfitBack': 'Outfit back',
            'ui.templateInputs.outfitFront': 'Outfit front',
            'ui.templateInputs.optional': 'Optional',
            'ui.templateInputs.retry': 'Reload settings',
            'ui.templateManagement.description': 'Manage listing and setup.',
            'ui.templateManagement.versionNoticeTitle': 'Versioned workflow',
            'ui.templateManagement.versionNotice': 'Version {version}',
            'ui.templateManagement.sharingStatusLabel': 'Sharing status',
            'ui.templateManagement.sharingStatus.setup_required': 'Setup required',
            'ui.templateManagement.sharingStatusDescription.setup_required': 'Finish preparation before sharing.',
            'ui.templateManagement.fashionReadinessTitle': 'Fashion readiness',
            'ui.templateManagement.checkingPoseProxy': 'Checking readiness',
            'ui.templateManagement.checkingPoseProxyDescription': 'Loading readiness.',
            'ui.templateManagement.poseProxyState.not_prepared': 'Not ready',
            'ui.templateManagement.poseProxyStatus.not_prepared': 'Preparation is required.',
            'ui.templateManagement.preparePoseProxy': 'Calculate preparation cost',
            'ui.templateManagement.templateTitle': 'Template title',
            'ui.templateManagement.templateDescription': 'Description',
            'ui.templateManagement.customTags': 'Tags',
            'ui.templateManagement.customTagsPlaceholder': 'tag, tag',
            'ui.templateManagement.customTagsHelp': 'Comma separated.',
            'ui.templateManagement.visibility': 'Post visibility',
            'ui.templateManagement.promptVisibility': 'Prompt visibility',
            'ui.templateManagement.promptVisibilityHelp': 'Choose what people can inspect.',
            'ui.templateManagement.accessCredits': 'Template access credits',
            'ui.templateManagement.accessCreditsHelp': 'Charged for each output.',
            'ui.templateManagement.retire': 'Retire template',
            'ui.templateManagement.retireTitle': 'Retire?',
            'ui.templateManagement.retireDescription': 'Retire this template.',
            'ui.templateManagement.retireConfirm': 'Retire Template',
            'ui.templateManagement.save': 'Save changes',
            'ui.action.cancel': 'Cancel',
            'ui.action.close': 'Close',
            'ui.character.public': 'Public',
            'ui.character.private': 'Private',
            'ui.share.unlisted': 'Unlisted',
            'ui.share.full': 'Full prompt',
            'ui.share.remixOnly': 'Remix only'
          }
        }
      },
      interpolation: { escapeValue: false }
    });
  });

  beforeEach(() => {
    apiMocks.getTemplateInputPolicy.mockResolvedValue({ templateId: 'tmpl_1', templateVersionId: 'tmplv_1',
      policyId: 'character-outfit-v1', supported: true, characterAvailable: true, outfitBackAvailable: true,
      characterEnabled: false, outfitBackEnabled: true, removedFields: [] });
    vi.clearAllMocks();
    apiMocks.getTemplatePoseProxy.mockResolvedValue({
      status: 'not_prepared',
      fashionCompatible: false,
      templateVersionId: 'tmplv_1',
      poseVariantId: 'default',
      proxyId: null,
      qaDecision: 'pending',
      qaReasonCodes: [],
      operationId: null,
      correlationId: null
    });
    apiMocks.updateCommunityPostPresentation.mockResolvedValue(post);
  });

  it('preserves existing owner controls while exposing setup, prompt and credit settings', async () => {
    renderDialog();

    expect(screen.getByRole('dialog', { name: 'Edit shared template' })).toBeVisible();
    expect(screen.getByText('Setup required')).toBeVisible();
    expect(screen.getByLabelText('Template title')).toHaveValue('Editorial Walk');
    expect(screen.getByLabelText('Description')).toHaveValue('Original description');
    expect(screen.getByLabelText('Tags')).toHaveValue('editorial, walk');
    expect(screen.getByLabelText('Post visibility')).toHaveValue('unlisted');
    expect(screen.getByLabelText('Prompt visibility')).toHaveValue('remix_only');
    expect(screen.getByLabelText('Template access credits')).toHaveValue(8);
    expect(screen.getByRole('button', { name: 'Retire template' })).toBeVisible();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Calculate preparation cost' })).toBeVisible();
    });
  });

  it('stacks owner setup above an open Generation viewer', () => {
    const viewer = document.createElement('div');
    viewer.className = 'generation-viewer';
    document.body.appendChild(viewer);
    renderDialog();

    const management = screen.getByRole('dialog', { name: 'Edit shared template' });
    expect(Number(getComputedStyle(management).zIndex)).toBeGreaterThan(
      Number(getComputedStyle(viewer).zIndex)
    );

    viewer.remove();
  });

  it('saves listing settings and constrained input choices against the loaded version', async () => {
    const client = renderDialog();
    const preview = ['community-template-previews', 'usr_owner', ['root']];
    const otherActor = ['community-template-previews', 'other', ['root']];
    client.setQueryData(preview, { items: [] });
    client.setQueryData(otherActor, { items: [] });
    await screen.findByRole('checkbox', { name: 'Character Optional' });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Character Optional' }));

    fireEvent.change(screen.getByLabelText('Prompt visibility'), {
      target: { value: 'full' }
    });
    fireEvent.change(screen.getByLabelText('Template access credits'), {
      target: { value: '12' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(apiMocks.updateCommunityPostPresentation).toHaveBeenCalledWith(
        'post_template_draft',
        {
          title: 'Editorial Walk',
          description: 'Original description',
          customTags: ['editorial', 'walk'],
          visibility: 'unlisted',
          promptVisibility: 'full',
          templateAccessCredits: 12,
          templateInputOptions: { characterEnabled: true, outfitBackEnabled: true },
          expectedTemplateVersionId: 'tmplv_1'
        }
      );
    });
    expect(apiMocks.navigate).toHaveBeenCalledWith('/posts/post_template_draft');
    expect(client.getQueryState(preview)?.isInvalidated).toBe(true);
    expect(client.getQueryState(otherActor)?.isInvalidated).toBe(false);
  });

  it.each(['retire', 'approve'] as const)('invalidates actor previews after %s succeeds', async action => {
    apiMocks.retireCommunityPost.mockResolvedValue({});
    apiMocks.reviewTemplatePoseProxy.mockResolvedValue({});
    if (action === 'approve') apiMocks.getTemplatePoseProxy.mockResolvedValue({
      status: 'review_required', proxyId: 'proxy', qaDecision: 'pending'
    });
    const client = renderDialog();
    const preview = ['community-template-previews', 'usr_owner', ['root']];
    const otherActor = ['community-template-previews', 'other', ['root']];
    client.setQueryData(preview, { items: [] });
    client.setQueryData(otherActor, { items: [] });
    if (action === 'retire') {
      fireEvent.click(screen.getByRole('button', { name: 'Retire template' }));
      fireEvent.click(await screen.findByRole('button', { name: 'Retire Template' }));
    } else {
      fireEvent.click(await screen.findByRole('button', { name: 'ui.templateManagement.approvePoseProxy' }));
    }
    await waitFor(() => expect(client.getQueryState(preview)?.isInvalidated).toBe(true));
    expect(client.getQueryState(otherActor)?.isInvalidated).toBe(false);
    expect(action === 'retire' ? apiMocks.retireCommunityPost : apiMocks.reviewTemplatePoseProxy).toHaveBeenCalledOnce();
    expect(apiMocks.prepareTemplatePoseProxy).not.toHaveBeenCalled();
  });

  it('blocks saving when owner policy fails and permits retry without preparation', async () => {
    apiMocks.getTemplateInputPolicy.mockRejectedValueOnce(new Error('Forbidden'));
    renderDialog();
    const retry = await screen.findByRole('button', { name: 'Reload settings' });
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
    fireEvent.click(retry);
    await screen.findByRole('checkbox', { name: 'Character Optional' });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save changes' })).toBeEnabled());
    expect(apiMocks.prepareTemplatePoseProxy).not.toHaveBeenCalled();
  });
});

function renderDialog() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  render(
    <I18nextProvider i18n={testI18n}>
      <QueryClientProvider client={queryClient}>
        <SharedTemplateEditDialog post={post} open hideTrigger />
      </QueryClientProvider>
    </I18nextProvider>
  );
  return queryClient;
}

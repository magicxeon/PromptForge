import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ShareGeneratedDialog } from './ShareGeneratedDialog';

const apiMocks = vi.hoisted(() => ({
  createGeneratedShareDraft: vi.fn(),
  getCommunityPost: vi.fn(),
  publishGeneratedShare: vi.fn(),
  showToast: vi.fn()
}));

vi.mock('../../features/community/api/shareApi', () => ({
  createGeneratedShareDraft: apiMocks.createGeneratedShareDraft,
  publishGeneratedShare: apiMocks.publishGeneratedShare
}));

vi.mock('../../features/community/api/communityApi', () => ({
  getCommunityPost: apiMocks.getCommunityPost
}));

vi.mock('../ui/toastStore', () => ({ showToast: apiMocks.showToast }));

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
            'ui.share.remixOnly': 'Remix only',
            'ui.share.required': 'Required',
            'ui.share.templateCredits': 'Template access credits',
            'ui.share.templateInputs': 'Template inputs',
            'ui.share.title': 'Share to Community',
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
  });

  it('opens reusable Template setup immediately after publishing the owner draft', async () => {
    apiMocks.createGeneratedShareDraft.mockResolvedValue({
      id: 'draft_1',
      sourceGenerationId: 'job_1',
      templateEligible: true,
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
    fireEvent.click(screen.getByRole('button', { name: 'Share' }));
    await screen.findByRole('dialog', { name: 'Share to Community' });
    fireEvent.change(await screen.findByPlaceholderText('Post title'), {
      target: { value: 'Reusable look' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));

    const management = await screen.findByRole('dialog', { name: 'Edit shared template' });
    expect(management).toHaveAttribute('data-auto-estimate', 'true');
    expect(apiMocks.publishGeneratedShare).toHaveBeenCalledWith(
      'draft_1',
      expect.objectContaining({ publishAsTemplate: true })
    );
    expect(apiMocks.getCommunityPost).toHaveBeenCalledWith('post_1');
  });

  it('keeps ordinary image sharing on the existing completion path', async () => {
    apiMocks.createGeneratedShareDraft.mockResolvedValue({
      id: 'draft_image',
      sourceGenerationId: 'job_1',
      templateEligible: false
    });
    apiMocks.publishGeneratedShare.mockResolvedValue({
      id: 'post_image',
      postType: 'image'
    });

    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Share' }));
    await screen.findByRole('dialog', { name: 'Share to Community' });
    fireEvent.change(await screen.findByPlaceholderText('Post title'), {
      target: { value: 'Single image' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Share to Community' })).not.toBeInTheDocument();
    });
    expect(screen.queryByRole('dialog', { name: 'Edit shared template' })).not.toBeInTheDocument();
    expect(apiMocks.getCommunityPost).not.toHaveBeenCalled();
    expect(apiMocks.showToast).toHaveBeenCalledWith({
      tone: 'success',
      title: 'Post published'
    });
  });
});

function renderDialog() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  render(
    <I18nextProvider i18n={testI18n}>
      <QueryClientProvider client={queryClient}>
        <ShareGeneratedDialog jobId="job_1" />
      </QueryClientProvider>
    </I18nextProvider>
  );
}

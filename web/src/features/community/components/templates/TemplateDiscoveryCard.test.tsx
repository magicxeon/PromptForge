import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { communityPostSchema } from '../../schemas/communitySchemas';
import { TemplateDiscoveryCard } from './TemplateDiscoveryCard';

const testI18n = i18next.createInstance();

describe('TemplateDiscoveryCard', () => {
  beforeAll(async () => {
    await testI18n.use(initReactI18next).init({
      lng: 'en',
      resources: {
        en: {
          community: {
            'community.creator.untitled': 'Untitled',
            'community.detail.model': 'Model',
            'community.detail.aspectRatio': 'Aspect ratio',
            'community.detail.imageSize': 'Size',
            'community.detail.generationDuration': 'Generation time',
            'community.templates.viewDetails': 'View details',
            'community.templates.unavailable': 'View only'
          },
          'react-ui': { 'ui.action.useTemplate': 'Use template' }
        }
      },
      interpolation: { escapeValue: false }
    });
  });

  it('uses only public template metadata and delegates the use action', () => {
    const onUse = vi.fn();
    const post = communityPostSchema.parse({
      id: 'template_1',
      postType: 'template',
      status: 'published',
      creator: { displayName: 'Mint Studio' },
      title: 'Window portrait recipe',
      thumbnailUrl: '/template.jpg',
      providerModelDisplay: 'Muse Image',
      generationMetadata: { aspectRatio: '3:4', width: 960, height: 1280, generationDuration: 18.7 },
      templateAvailability: true,
      templatePricing: { accessCredits: 2, currency: 'credits' },
      engagementSummary: {}
    });

    render(
      <I18nextProvider i18n={testI18n}>
        <MemoryRouter>
          <TemplateDiscoveryCard post={post} using={false} onUse={onUse} />
        </MemoryRouter>
      </I18nextProvider>
    );

    expect(screen.getByRole('link', { name: 'Window portrait recipe' }))
      .toHaveAttribute('href', '/posts/template_1');
    expect(screen.getByText('Muse Image')).toBeVisible();
    expect(screen.getByText('960 x 1280')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Use template' }));
    expect(onUse).toHaveBeenCalledOnce();
  });

  it('shows a read-only state when the public snapshot is unavailable', () => {
    const post = communityPostSchema.parse({
      id: 'template_2',
      postType: 'template',
      status: 'published',
      creator: { displayName: 'Mint Studio' },
      title: 'Unavailable recipe',
      thumbnailUrl: '/template.jpg',
      templateAvailability: false,
      engagementSummary: {}
    });

    render(
      <I18nextProvider i18n={testI18n}>
        <MemoryRouter>
          <TemplateDiscoveryCard post={post} using={false} onUse={() => undefined} />
        </MemoryRouter>
      </I18nextProvider>
    );

    expect(screen.getByText('View only')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Use template' })).not.toBeInTheDocument();
  });
});

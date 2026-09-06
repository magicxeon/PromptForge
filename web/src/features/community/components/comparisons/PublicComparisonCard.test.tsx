import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { beforeAll, describe, expect, it } from 'vitest';
import { communityPostSchema } from '../../schemas/communitySchemas';
import { PublicComparisonCard } from './PublicComparisonCard';

const testI18n = i18next.createInstance();

describe('PublicComparisonCard', () => {
  beforeAll(async () => {
    await testI18n.use(initReactI18next).init({
      lng: 'en',
      resources: {
        en: {
          community: {
            'community.creator.untitled': 'Untitled',
            'community.detail.metadataUnavailable': 'Not available',
            'community.detail.aspectRatio': 'Aspect ratio',
            'community.detail.imageSize': 'Size',
            'community.home.works': 'Views',
            'community.comparisons.publicLabel': 'Public Comparison',
            'community.comparisons.resultCount': '{{count}} results',
            'community.comparisons.open': 'Open Comparison',
            'community.comparisons.noResults': 'No public results',
            'community.comparisons.failedResult': 'Generation failed',
            'community.comparisons.missingResult': 'Result unavailable'
          }
        }
      },
      interpolation: { escapeValue: false }
    });
  });

  it('keeps public slot order and provider-model association including failures', () => {
    const post = communityPostSchema.parse({
      id: 'comparison_1',
      postType: 'comparison',
      creator: { displayName: 'Mint Studio' },
      title: 'Portrait model check',
      promptPreview: 'A public prompt preview',
      comparisonSnapshot: {
        slots: [
          { slotId: 'slot_1', position: 1, providerDisplayName: 'Provider A', modelDisplayName: 'Model A', imageUrl: '/a.jpg', status: 'completed' },
          { slotId: 'slot_2', position: 2, providerDisplayName: 'Provider B', modelDisplayName: 'Model B', status: 'failed' },
          { slotId: 'slot_3', position: 3, providerDisplayName: 'Provider C', modelDisplayName: 'A very long model name that remains attached to slot three', imageUrl: '/c.jpg', status: 'completed' }
        ]
      },
      engagementSummary: {}
    });

    const { container } = render(
      <I18nextProvider i18n={testI18n}>
        <MemoryRouter>
          <PublicComparisonCard post={post} />
        </MemoryRouter>
      </I18nextProvider>
    );

    const labels = Array.from(container.querySelectorAll('.public-comparison-slot strong')).map(node => node.textContent);
    expect(labels).toEqual(['Model A', 'Model B', 'A very long model name that remains attached to slot three']);
    expect(screen.getByText('Generation failed')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Open Comparison' })).toHaveAttribute('href', '/posts/comparison_1');
    expect(screen.queryByText(/winner/i)).not.toBeInTheDocument();
  });

  it('renders an explicit empty result state without a synthetic winner', () => {
    const post = communityPostSchema.parse({
      id: 'comparison_2',
      postType: 'comparison',
      creator: { displayName: 'Mint Studio' },
      title: 'Empty snapshot',
      comparisonSnapshot: { slots: [] },
      engagementSummary: {}
    });

    render(
      <I18nextProvider i18n={testI18n}>
        <MemoryRouter><PublicComparisonCard post={post} /></MemoryRouter>
      </I18nextProvider>
    );
    expect(screen.getByText('No public results')).toBeVisible();
  });
});

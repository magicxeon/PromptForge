import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { featuredImageRatio, MediaCard } from './MediaCard';
import { communityPostSchema } from '../../features/community/schemas/communitySchemas';

vi.mock('../../lib/auth/ActorProvider', () => ({
  useActor: () => ({ actor: { userId: 'usr_test' } })
}));

const testI18n = i18next.createInstance();

describe('MediaCard', () => {
  it('uses valid dimensions then aspect ratio with bounded, finite fallback geometry', () => {
    expect(featuredImageRatio({ width: 900, height: 1200, aspectRatio: '16:9' })).toBe(0.75);
    expect(featuredImageRatio({ aspectRatio: '16:9' })).toBeCloseTo(16 / 9);
    expect(featuredImageRatio({ width: 100, height: 100 })).toBe(1);
    expect(featuredImageRatio({ aspectRatio: '50:1' })).toBe(2);
    expect(featuredImageRatio({ aspectRatio: '1:50' })).toBe(0.625);
    expect(featuredImageRatio({ aspectRatio: '1:0' })).toBe(0.75);
    expect(featuredImageRatio({ width: -1, height: 100 })).toBe(0.75);
    expect(featuredImageRatio({})).toBe(0.75);
  });

  it('uses uncropped originals for every image card even when a caller requests cover', () => {
    const post = communityPostSchema.parse({ id: 'image', postType: 'image', status: 'published', visibility: 'public', creator: {}, engagementSummary: {}, title: 'Whole image', imageUrl: '/full.jpg', thumbnailUrl: '/cropped.jpg', presentationUrls: { templateCard: '/focused.jpg' } });
    const card = (previewFit?: 'cover' | 'contain') => <I18nextProvider i18n={testI18n}><MemoryRouter><MediaCard post={post} previewFit={previewFit} /></MemoryRouter></I18nextProvider>;
    const { container, rerender } = render(card('cover'));
    expect(container.querySelector('article')).toHaveClass('community-media-card--adaptive-image');
    expect(container.querySelector('img')).toHaveAttribute('src', '/full.jpg');
    expect(container.querySelector('img')).toHaveClass('object-contain');
    rerender(card());
    expect(container.querySelector('article')).toHaveClass('community-media-card--adaptive-image');
    expect(container.querySelector('img')).toHaveAttribute('src', '/full.jpg');
  });
  beforeAll(async () => {
    await testI18n.use(initReactI18next).init({
      lng: 'en',
      resources: {
        en: {
          community: {
            'community.creator.untitled': 'Untitled',
            'community.status.setupRequired': 'Setup required'
          }
        }
      },
      interpolation: { escapeValue: false }
    });
  });

  it('links the full card to the public post detail route', () => {
    const post = communityPostSchema.parse({
      id: 'post_1',
      postType: 'image',
      creator: { displayName: 'Mint Studio' },
      title: 'Fashion portrait',
      thumbnailUrl: '/api/scene-templates/shared/post_1/thumbnail',
      engagementSummary: { likeCount: 4 }
    });

    render(
      <I18nextProvider i18n={testI18n}>
        <MemoryRouter>
          <MediaCard post={post} />
        </MemoryRouter>
      </I18nextProvider>
    );

    expect(screen.getByRole('link', { name: 'Fashion portrait' }))
      .toHaveAttribute('href', '/posts/post_1');
    expect(screen.getByText('Mint Studio')).toBeInTheDocument();
  });

  it('labels an owner Template draft as setup required without losing its management action', () => {
    const post = communityPostSchema.parse({
      id: 'post_template_draft',
      postType: 'template',
      status: 'draft',
      creator: { displayName: 'Mint Studio' },
      title: 'Editorial Template',
      thumbnailUrl: '/api/scene-templates/shared/post_template_draft/thumbnail',
      engagementSummary: {}
    });

    render(
      <I18nextProvider i18n={testI18n}>
        <MemoryRouter>
          <MediaCard post={post} ownerAction={<button>Continue setup</button>} />
        </MemoryRouter>
      </I18nextProvider>
    );

    expect(screen.getByText('Setup required')).toBeVisible();
    expect(screen.getByText('Setup required').closest('article')).not.toHaveClass('community-media-card--adaptive-image');
    expect(screen.getByRole('button', { name: 'Continue setup' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Editorial Template' }))
      .toHaveAttribute('href', '/posts/post_template_draft');
  });
});

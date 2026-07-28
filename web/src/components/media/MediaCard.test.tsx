import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { beforeAll, describe, expect, it } from 'vitest';
import { MediaCard } from './MediaCard';
import { communityPostSchema } from '../../features/community/schemas/communitySchemas';

const testI18n = i18next.createInstance();

describe('MediaCard', () => {
  beforeAll(async () => {
    await testI18n.use(initReactI18next).init({
      lng: 'en',
      resources: {
        en: {
          community: {
            'community.creator.untitled': 'Untitled'
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
      .toHaveAttribute('href', '/community/post_1');
    expect(screen.getByText('Mint Studio')).toBeInTheDocument();
  });
});

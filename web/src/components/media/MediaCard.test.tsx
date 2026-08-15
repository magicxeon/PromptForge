import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { MediaCard } from './MediaCard';
import { communityPostSchema } from '../../features/community/schemas/communitySchemas';

vi.mock('../../lib/auth/ActorProvider', () => ({
  useActor: () => ({ actor: { userId: 'usr_test' } })
}));

const testI18n = i18next.createInstance();

describe('MediaCard', () => {
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
    expect(screen.getByRole('button', { name: 'Continue setup' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Editorial Template' }))
      .toHaveAttribute('href', '/posts/post_template_draft');
  });
});

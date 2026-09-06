import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { beforeAll, describe, expect, it } from 'vitest';
import { communityPostSchema } from '../schemas/communitySchemas';
import { CommunityHero } from './CommunityHero';
import { isEligibleCommunityHeroPost } from './communityHeroSelector';

const testI18n = i18next.createInstance();

describe('CommunityHero', () => {
  beforeAll(async () => {
    await testI18n.use(initReactI18next).init({
      lng: 'en',
      resources: {
        en: {
          community: {
            'community.home.eyebrow': 'Creative Community',
            'community.home.title': 'Create and discover AI images',
            'community.home.description': 'Start a new image and explore public work.',
            'community.home.featuredMedia': 'Featured Community work',
            'community.home.openPlayground': 'Open Playground',
            'community.home.exploreTemplates': 'Explore templates'
          }
        }
      },
      interpolation: { escapeValue: false }
    });
  });

  it('uses one public visual result without presenting loaded-page totals', () => {
    const post = communityPostSchema.parse({
      id: 'post_1',
      postType: 'image',
      status: 'published',
      visibility: 'public',
      creator: { displayName: 'Mint Studio' },
      title: 'Featured portrait',
      imageUrl: '/featured.jpg',
      engagementSummary: {}
    });

    render(
      <I18nextProvider i18n={testI18n}>
        <MemoryRouter><CommunityHero post={post} /></MemoryRouter>
      </I18nextProvider>
    );

    expect(screen.getByRole('heading', { name: 'Momelo' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Open Playground' })).toHaveAttribute('href', '/create/playground');
    expect(screen.queryByText('Works')).not.toBeInTheDocument();
  });

  it('keeps an explicit media area when no eligible post exists', () => {
    const { container } = render(
      <I18nextProvider i18n={testI18n}>
        <MemoryRouter><CommunityHero post={null} /></MemoryRouter>
      </I18nextProvider>
    );
    expect(container.querySelectorAll('.community-hero-art__card')).toHaveLength(3);
    expect(container.querySelector('a[href="#community-feed"]')).toBeInTheDocument();
    expect(container.querySelector('.community-hero-art__backdrop')).toHaveAttribute('src', expect.stringContaining('/assets/'));
  });

  it('rejects private and retired media from hero selection', () => {
    const privatePost = communityPostSchema.parse({
      id: 'private_1',
      postType: 'image',
      visibility: 'private',
      creator: { displayName: 'Private creator' },
      imageUrl: '/private.jpg',
      engagementSummary: {}
    });
    const retiredPost = communityPostSchema.parse({
      id: 'retired_1',
      postType: 'image',
      visibility: 'public',
      status: 'owner_unpublished',
      creator: { displayName: 'Former creator' },
      imageUrl: '/retired.jpg',
      engagementSummary: {}
    });
    expect(isEligibleCommunityHeroPost(privatePost)).toBe(false);
    expect(isEligibleCommunityHeroPost(retiredPost)).toBe(false);
  });
});

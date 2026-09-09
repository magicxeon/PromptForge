import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { communityPostSchema } from '../schemas/communitySchemas';
import { CommunityHomeRoute } from './CommunityHomeRoute';
import { getProviderCatalog } from '../../generation/api/generationApi';

const state = vi.hoisted(() => ({ discovery: null as Record<string, unknown> | null }));

vi.mock('../../generation/api/generationApi', () => ({ getProviderCatalog: vi.fn() }));

vi.mock('../hooks/useCommunityDiscoveryPosts', () => ({
  useCommunityDiscoveryPosts: () => state.discovery,
  formatDiscoveryCategory: (value: string) => value
}));

vi.mock('../../../lib/permissions/FeaturePolicyProvider', () => ({
  useFeaturePolicy: () => ({ isEnabled: () => true })
}));

vi.mock('../../../components/media/MediaCard', () => ({
  MediaCard: ({ post }: { post: { id: string; title: string } }) => (
    <article data-testid={`post-${post.id}`}>{post.title}</article>
  )
}));

vi.mock('../../../components/media/MediaStage', () => ({
  MediaStage: ({ post }: { post: { id: string } }) => <img src={`/${post.id}.jpg`} alt="" />
}));

const testI18n = i18next.createInstance();
const posts = Array.from({ length: 6 }, (_, index) => communityPostSchema.parse({
  id: `post_${index + 1}`,
  postType: 'image',
  status: 'published',
  visibility: 'public',
  creator: { displayName: 'Creator' },
  title: `Post ${index + 1}`,
  imageUrl: `/post-${index + 1}.jpg`,
  engagementSummary: {}
}));

describe('CommunityHomeRoute', () => {
  beforeAll(async () => {
    await testI18n.use(initReactI18next).init({
      lng: 'en',
      resources: { en: { community: {
        'community.home.eyebrow': 'Creative Community',
        'community.home.title': 'Create and discover AI images',
        'community.home.description': 'Start and discover.',
        'community.home.featuredMedia': 'Featured media',
        'community.home.openPlayground': 'Open Playground',
        'community.home.exploreTemplates': 'Explore templates',
        'community.home.paths.eyebrow': 'Choose a starting point',
        'community.home.paths.title': 'Start here',
        'community.home.paths.playground.title': 'Create freely',
        'community.home.paths.playground.description': 'Open Playground.',
        'community.home.paths.templates.title': 'Use a template',
        'community.home.paths.templates.description': 'Browse templates.',
        'community.home.paths.characters.title': 'Find a Character',
        'community.home.paths.characters.description': 'Browse Characters.',
        'community.home.paths.comparisons.title': 'Compare models',
        'community.home.paths.comparisons.description': 'Open Comparisons.',
        'community.home.featuredEyebrow': 'Featured',
        'community.home.featuredTitle': 'Featured work',
        'community.home.featuredPrevious': 'Previous',
        'community.home.featuredNext': 'Next',
        'community.home.featuredSeeAll': 'See all public work',
        'community.home.discoveryEyebrow': 'Discover',
        'community.home.searchResult': 'Results for {{query}}',
        'community.home.clearSearch': 'Clear search',
        'community.home.periodLabel': 'Period',
        'community.home.feedSeeMore': 'See more Community work',
        'community.home.tutorialEyebrow': 'Guides',
        'community.home.tutorialTitle': 'Learn',
        'community.home.tutorial.start.title': 'Start',
        'community.home.tutorial.start.description': 'Start guide.',
        'community.home.tutorial.share.title': 'Share',
        'community.home.tutorial.share.description': 'Share guide.',
        'community.discovery.sample': 'Preview',
        'community.feed.title': 'Community images',
        'community.feed.searchLabel': 'Search Community',
        'community.feed.searchPlaceholder': 'Search',
        'community.feed.typeLabel': 'Post type',
        'community.feed.categoryLabel': 'Category',
        'community.feed.categoryAll': 'All categories',
        'community.feed.latest': 'Latest',
        'community.feed.week': 'Week',
        'community.feed.month': 'Month',
        'community.feed.year': 'Year',
        'community.feed.type.all': 'All',
        'community.feed.type.image': 'Images',
        'community.feed.type.video': 'Videos',
        'community.feed.type.template': 'Templates',
        'community.feed.type.comparison': 'Comparisons',
        'community.feed.type.collection': 'Collections',
        'community.feed.loadMore': 'Load more',
        'community.feed.loadingMore': 'Loading more',
        'community.feed.loadMoreError': 'Could not load more',
        'community.feed.retryMore': 'Retry',
        'community.feed.loading': 'Loading',
        'community.feed.error': 'Error',
        'community.feed.retry': 'Retry',
        'community.feed.empty': 'Empty'
      } } },
      interpolation: { escapeValue: false }
    });
  });

  beforeEach(() => {
    state.discovery = createDiscoveryState({ posts, search: '' });
    vi.mocked(getProviderCatalog).mockReset();
    vi.mocked(getProviderCatalog).mockResolvedValue({ defaultProvider: '', providers: [] });
  });

  it('keeps hero and featured posts discoverable in the continuing feed', () => {
    renderPage('/');
    expect(screen.getByRole('heading', { name: 'Momelo' })).toBeVisible();
    expect(screen.getByLabelText(posts[0]!.title)).toBeVisible();
    const feed = document.querySelector('.community-feed-grid')!;
    expect(document.querySelectorAll('.community-featured article')).toHaveLength(4);
    expect(feed).toHaveClass('media-card-list');
    for (const post of posts) expect(feed.querySelector(`[data-testid="post-${post.id}"]`)).not.toBeNull();
    expect(screen.getByTestId('post-post_6')).toBeVisible();
  });

  it('suppresses editorial content while search results are active', () => {
    state.discovery = createDiscoveryState({ posts, search: 'portrait' });
    state.discovery.actor = { userId: 'actor_1' };
    state.discovery.actorId = 'actor_1';
    renderPage('/?search=portrait');
    expect(screen.queryByRole('heading', { name: 'Momelo' })).not.toBeInTheDocument();
    expect(document.querySelector('.community-providers')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Start here' })).not.toBeInTheDocument();
    expect(screen.getAllByTestId(/^post-/)).toHaveLength(6);
    expect(getProviderCatalog).not.toHaveBeenCalled();
  });

  it('reads the existing image catalog with explicit Playground context', async () => {
    state.discovery!.actor = { userId: 'actor_1' };
    state.discovery!.actorId = 'actor_1';
    renderPage('/');
    await waitFor(() => expect(getProviderCatalog).toHaveBeenCalledWith({
      generationSurface: 'playground', generationMode: 'playground'
    }));
    await waitFor(() => expect(document.querySelector('.community-providers')).toHaveAttribute('aria-busy', 'false'));
    expect(screen.getByTestId('post-post_6')).toBeVisible();
  });

  it('preserves active query filters when opening the dedicated Template Gallery', () => {
    renderPage('/?category=portrait&period=month&sort=trending');
    fireEvent.change(screen.getByLabelText('Post type'), { target: { value: 'template' } });
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/explore/templates?category=portrait&period=month&sort=trending'
    );
  });

  it('does not remove a video from the feed for decorative hero use', () => {
    const video = communityPostSchema.parse({
      ...posts[0], id: 'video_1', postType: 'video', title: 'Shared video', videoUrl: '/video.mp4'
    });
    state.discovery = createDiscoveryState({ posts: [video, posts[1]!], search: '' });
    renderPage('/');
    expect(screen.getByTestId('post-video_1')).toBeVisible();
    expect(screen.getByLabelText(posts[1]!.title)).toBeVisible();
  });

  it('links Featured to the existing feed and reuses canonical pagination for See more', () => {
    const discoveryState = createDiscoveryState({ posts, search: '' });
    discoveryState.query.hasNextPage = true;
    state.discovery = discoveryState;
    renderPage('/');
    expect(screen.getByRole('link', { name: 'See all public work' })).toHaveAttribute('href', '#community-feed');
    fireEvent.click(screen.getByRole('button', { name: 'See more Community work' }));
    expect(discoveryState.query.fetchNextPage).toHaveBeenCalledOnce();
  });
});

function createDiscoveryState({ posts: items, search }: { posts: typeof posts; search: string }) {
  return {
    filters: { postType: 'all', officialTag: '', search, sort: 'latest', period: 'week' },
    periodValue: 'latest',
    searchDraft: search,
    setSearchDraft: vi.fn(),
    setParam: vi.fn(),
    setPeriod: vi.fn(),
    submitSearch: vi.fn(),
    clearSearch: vi.fn(),
    resetFilters: vi.fn(),
    posts: items,
    categories: [],
    query: {
      isLoading: false,
      isError: false,
      isFetchNextPageError: false,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: vi.fn(),
      refetch: vi.fn(),
      error: null
    }
  };
}

function renderPage(initialEntry: string) {
  return render(
    <I18nextProvider i18n={testI18n}>
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <CommunityHomeRoute />
        <LocationProbe />
      </MemoryRouter>
      </QueryClientProvider>
    </I18nextProvider>
  );
}

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.search}`}</output>;
}

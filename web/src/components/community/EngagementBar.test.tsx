import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, expect, it, vi } from 'vitest';
import { EngagementBar } from './EngagementBar';
import { getCommunityEngagement, recordCommunityView, setCommunityReaction } from '../../features/community/api/communityApi';
import { communityPostSchema, engagementResponseSchema } from '../../features/community/schemas/communitySchemas';
import { queryKeys } from '../../lib/api/queryKeys';

const actor = vi.hoisted(() => ({ id: 'actor-a' as string | null }));
vi.mock('../../lib/auth/ActorProvider', () => ({ useActor: () => ({ actor: actor.id ? { userId: actor.id } : null }) }));
vi.mock('../../lib/auth/actorStore', () => ({ getActiveActorId: () => actor.id }));
vi.mock('../../features/community/api/communityApi', () => ({ getCommunityEngagement: vi.fn(), setCommunityReaction: vi.fn(), recordCommunityView: vi.fn() }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

const post = communityPostSchema.parse({ id: 'post-one', postType: 'image', title: 'Public work', creator: {}, engagementSummary: { viewCount: 9 } });
let snapshot = engagementResponseSchema.parse({ postId: post.id, summary: { viewCount: 9 }, viewerState: { liked: false, saved: false }, voteSummary: { bySlot: [], leaderSlotIds: [] } });

beforeEach(() => {
  vi.clearAllMocks();
  actor.id = 'actor-a';
  snapshot = { ...snapshot, summary: { ...snapshot.summary, likeCount: 0, saveCount: 0 }, viewerState: { liked: false, saved: false } };
  vi.mocked(getCommunityEngagement).mockImplementation(async () => structuredClone(snapshot));
  vi.mocked(setCommunityReaction).mockImplementation(async (_id, type, active) => {
    snapshot = { ...snapshot, summary: { ...snapshot.summary, [type === 'like' ? 'likeCount' : 'saveCount']: active ? 1 : 0 },
      viewerState: { ...snapshot.viewerState, [type === 'like' ? 'liked' : 'saved']: active } };
    return { changed: true, active, summary: snapshot.summary };
  });
});

function setup(variant: 'detail' | 'compact' = 'compact') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 30_000 }, mutations: { retry: false } } });
  const content = () => <QueryClientProvider client={client}><EngagementBar post={post} variant={variant} /></QueryClientProvider>;
  return { ...render(content()), client, content };
}
async function readyLike() {
  const button = screen.getByRole('button', { name: /community.detail.like/ });
  await waitFor(() => expect(button).toBeEnabled());
  return button;
}

it('renders true zero likes, views and no unrelated commands in compact mode', async () => {
  const view = setup();
  expect(await readyLike()).toHaveTextContent('0');
  expect(screen.getByTitle('community.engagement.views')).toHaveTextContent('9');
  expect(screen.queryByRole('button', { name: /community.detail.save|community.detail.share/ })).not.toBeInTheDocument();
  expect(view.container.querySelector('a button')).toBeNull();
  expect(recordCommunityView).not.toHaveBeenCalled();
});

it('preserves default Like, Save and Share and uses the same API for saving', async () => {
  const clipboard = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: clipboard } });
  setup('detail');
  await readyLike();
  fireEvent.click(screen.getByRole('button', { name: /community.detail.save/ }));
  await waitFor(() => expect(setCommunityReaction).toHaveBeenCalledWith(post.id, 'save', true));
  await waitFor(() => expect(screen.getByRole('button', { name: /community.detail.save/ })).toHaveAttribute('aria-pressed', 'true'));
  fireEvent.click(screen.getByRole('button', { name: 'community.detail.share' }));
  expect(clipboard).toHaveBeenCalledWith(window.location.href);
});

it('toggles like and unlike using server-confirmed counts and shared query state', async () => {
  const view = setup();
  const invalidation = vi.spyOn(view.client, 'invalidateQueries');
  fireEvent.click(await readyLike());
  await waitFor(() => expect(screen.getByRole('button', { name: 'community.engagement.unlike: 1' })).toBeEnabled());
  expect(view.client.getQueryData(queryKeys.engagement(post.id, 'actor-a'))).toMatchObject({ viewerState: { liked: true } });
  expect(invalidation).toHaveBeenCalledWith({ queryKey: ['character-works', 'actor-a'] });
  expect(invalidation).toHaveBeenCalledWith({ queryKey: queryKeys.communityPost(post.id, 'actor-a'), exact: true });
  fireEvent.click(screen.getByRole('button', { name: 'community.engagement.unlike: 1' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'community.detail.like: 0' })).toBeEnabled());
  expect(setCommunityReaction).toHaveBeenLastCalledWith(post.id, 'like', false);
  expect(recordCommunityView).not.toHaveBeenCalled();
});

it('waits for viewer state before allowing reactions', async () => {
  vi.mocked(getCommunityEngagement).mockReturnValue(new Promise(() => {}));
  setup();
  const button = screen.getByRole('button', { name: 'community.detail.like: 0' });
  expect(button).toBeDisabled();
  fireEvent.click(button);
  expect(setCommunityReaction).not.toHaveBeenCalled();
});

it('guards rapid duplicate clicks and leaves the count unchanged while submitting', async () => {
  let complete!: () => void;
  vi.mocked(setCommunityReaction).mockReturnValue(new Promise(resolve => { complete = () => resolve({ changed: false, active: false, summary: snapshot.summary }); }));
  setup();
  const button = await readyLike();
  fireEvent.click(button);
  fireEvent.click(button);
  await waitFor(() => expect(setCommunityReaction).toHaveBeenCalledOnce());
  expect(button).toBeDisabled();
  expect(button).toHaveAttribute('aria-busy', 'true');
  expect(button).toHaveTextContent('0');
  await act(async () => complete());
});

it('recovers from read failures without enabling a guessed toggle', async () => {
  vi.mocked(getCommunityEngagement).mockRejectedValueOnce(new Error('permission details must stay private'));
  setup();
  expect(await screen.findByRole('status')).toHaveTextContent('community.engagement.unavailable');
  expect(screen.queryByText('permission details must stay private')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'community.detail.like: 0' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'community.feed.retry' }));
  await readyLike();
  expect(getCommunityEngagement).toHaveBeenCalledTimes(2);
});

it('shows mutation failure, preserves count and allows an explicit retry', async () => {
  vi.mocked(setCommunityReaction).mockRejectedValueOnce(new Error('server unavailable'));
  setup();
  fireEvent.click(await readyLike());
  expect(await screen.findByRole('alert')).toHaveTextContent('community.engagement.actionFailed');
  expect(screen.getByRole('button', { name: 'community.detail.like: 0' })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: 'community.detail.like: 0' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'community.engagement.unlike: 1' })).toBeEnabled());
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

it('does not read viewer state or submit a reaction without an actor', () => {
  actor.id = null;
  setup();
  expect(screen.getByRole('button', { name: 'community.detail.like: 0' })).toBeDisabled();
  expect(getCommunityEngagement).not.toHaveBeenCalled();
  expect(setCommunityReaction).not.toHaveBeenCalled();
});

it('does not restore cleared actor data when an old reaction completes', async () => {
  let complete!: () => void;
  vi.mocked(setCommunityReaction).mockReturnValue(new Promise(resolve => { complete = () => resolve({ changed: true, active: true, summary: { ...snapshot.summary, likeCount: 1 } }); }));
  const view = setup();
  fireEvent.click(await readyLike());
  await waitFor(() => expect(setCommunityReaction).toHaveBeenCalledOnce());
  actor.id = 'actor-b';
  view.client.clear();
  view.rerender(view.content());
  await readyLike();
  await act(async () => complete());
  expect(view.client.getQueryData(queryKeys.engagement(post.id, 'actor-a'))).toBeUndefined();
  expect(view.client.getQueryData(queryKeys.engagement(post.id, 'actor-b'))).toMatchObject({ viewerState: { liked: false } });
  expect(screen.getByRole('button', { name: 'community.detail.like: 0' })).toHaveAttribute('aria-pressed', 'false');
});

it('cancels dispatch if actor changes before the API request starts', async () => {
  setup();
  const button = await readyLike();
  fireEvent.click(button);
  actor.id = 'actor-b';
  await waitFor(() => expect(screen.getByRole('alert')).toBeVisible());
  expect(setCommunityReaction).not.toHaveBeenCalled();
});

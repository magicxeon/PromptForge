import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import { characterSummarySchema } from '../schemas/profileSchemas';
import { communityPostSchema } from '../../community/schemas/communitySchemas';
import { CharacterSpotlight } from './CharacterSpotlight';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../../../components/media/MediaStage', () => ({ MediaStage: ({ fit, source }: { fit: string; source: string }) => <img src="/work.jpg" alt="" data-testid="moment-media" data-fit={fit} data-source={source} /> }));
vi.mock('../../../components/community/EngagementBar', () => ({ EngagementBar: ({ post, variant }: { post: { id: string }; variant: string }) => <button data-testid="post-reaction" data-post-id={post.id} data-variant={variant}>Like</button> }));
const character = characterSummarySchema.parse({ id: 'identity', displayName: 'Mali', ownerUsername: 'user_alice' });
const post = communityPostSchema.parse({ id: 'work', title: 'Public creation', postType: 'image', imageUrl: '/work.jpg', creator: { displayName: 'Work author' }, engagementSummary: {} });

it('keeps the featured heading inside the character grid beside the portrait', () => {
  render(<MemoryRouter><CharacterSpotlight character={character} works={[]} loading={false} error={null} onRetry={vi.fn()} /></MemoryRouter>);
  const heading = screen.getByText('character-profiles.gallery.featuredEyebrow');
  const card = screen.getByRole('article');
  expect(heading.parentElement).toBe(card);
  expect(card.firstElementChild).toBe(heading);
  expect(heading.nextElementSibling).toHaveClass('character-discovery-card__media');
  expect(heading.nextElementSibling).toHaveAttribute('href', '/characters/identity');
  expect(screen.getByRole('region', { name: 'character-profiles.gallery.momentsTitle' }).closest('article')).toBeNull();
});

it('links public moments to original works and credits their author', () => {
  render(<MemoryRouter><CharacterSpotlight character={character} works={[post]} loading={false} error={null} onRetry={vi.fn()} /></MemoryRouter>);
  screen.getAllByRole('link', { name: 'Public creation' }).forEach(link => expect(link).toHaveAttribute('href', '/posts/work'));
  expect(screen.getByTestId('post-reaction')).toHaveAttribute('data-post-id', 'work');
  expect(screen.getByTestId('post-reaction')).toHaveAttribute('data-variant', 'compact');
  expect(screen.getByTestId('post-reaction').closest('a')).toBeNull();
  expect(screen.getByText(/Work author/)).toBeVisible();
  expect(screen.getByRole('link', { name: '@user_alice' })).toHaveAttribute('href', '/profiles/user-alice');
  expect(screen.getByTestId('moment-media')).toHaveAttribute('data-fit', 'cover');
  expect(screen.getByTestId('moment-media')).toHaveAttribute('data-source', 'original');
});
it('keeps profile actions when public work loading fails and offers local retry', () => {
  const retry = vi.fn();
  render(<MemoryRouter><CharacterSpotlight character={character} works={[]} loading={false} error={new Error('Server failure')} onRetry={retry} /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'community:community.feed.retry' }));
  expect(retry).toHaveBeenCalledOnce();
  expect(screen.getByRole('alert')).toHaveTextContent('character-profiles.gallery.momentsError');
  expect(screen.getByRole('heading', { name: 'Mali' })).toBeVisible();
});
it('uses a bounded empty state rather than fabricated official looks', () => {
  render(<MemoryRouter><CharacterSpotlight character={character} works={[]} loading={false} error={null} onRetry={vi.fn()} /></MemoryRouter>);
  expect(screen.getByText('character-profiles.gallery.momentsEmpty')).toBeVisible();
});

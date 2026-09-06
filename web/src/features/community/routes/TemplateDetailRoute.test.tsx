import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { communityPostSchema } from '../schemas/communitySchemas';
import { TemplateDetailRoute } from './TemplateDetailRoute';

const mocks = vi.hoisted(() => ({ query: vi.fn(), mutate: vi.fn(), refetch: vi.fn(), next: vi.fn(), pending: false }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../hooks/useTemplateDetail', () => ({ useTemplateDetail: mocks.query }));
vi.mock('../hooks/useCommunityTemplateHandoff', () => ({ useCommunityTemplateHandoff: () => ({ mutate: mocks.mutate, isPending: mocks.pending }) }));
vi.mock('../../../components/media/MediaStage', () => ({ MediaStage: ({ post, fit, source }: { post: { title: string }; fit: string; source: string }) => <img alt={post.title} data-fit={fit} data-source={source} /> }));
const template = communityPostSchema.parse({ id: 'original', postType: 'template', title: 'Original recipe', creator: { displayName: 'Author' }, templateAvailability: true, engagementSummary: {} });
const image = communityPostSchema.parse({ id: 'variation', postType: 'image', title: 'Different outfit', creator: { displayName: 'Remixer' }, engagementSummary: { likeCount: 5 } });
const result = (override = {}) => ({ data: { pages: [{ template, items: [image], hasMore: true, nextCursor: 'next' }] }, isLoading: false, isError: false, hasNextPage: true, isFetchingNextPage: false, fetchNextPage: mocks.next, refetch: mocks.refetch, ...override });
const mount = () => render(<MemoryRouter initialEntries={['/explore/templates/original']}><Routes><Route path="/explore/templates/:postId" element={<TemplateDetailRoute />} /></Routes></MemoryRouter>);
beforeEach(() => { vi.clearAllMocks(); mocks.pending = false; mocks.query.mockReturnValue(result()); });

it('supports direct entry, original image inspection and original-template handoff', () => {
  mount();
  expect(mocks.query).toHaveBeenCalledWith('original', 'likes');
  expect(screen.getByRole('img', { name: 'Original recipe' })).toHaveAttribute('data-fit', 'contain');
  expect(screen.getByRole('img', { name: 'Original recipe' })).toHaveAttribute('data-source', 'original');
  expect(screen.getByRole('link', { name: 'community.templateDetail.viewOriginal' })).toHaveAttribute('href', '/posts/original');
  expect(screen.getByRole('link', { name: 'Different outfit' })).toHaveAttribute('href', '/posts/variation');
  fireEvent.click(screen.getByRole('button', { name: 'ui.action.useTemplate' }));
  expect(mocks.mutate).toHaveBeenCalledWith('original');
});
it('changes sort through URL and loads the next page explicitly', () => {
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'community.templateDetail.latest' }));
  expect(mocks.query).toHaveBeenLastCalledWith('original', 'latest');
  fireEvent.click(screen.getByRole('button', { name: 'community.feed.loadMore' }));
  expect(mocks.next).toHaveBeenCalledOnce();
});
it('keeps source and actions on an empty family without unrelated content', () => {
  mocks.query.mockReturnValue(result({ data: { pages: [{ template, items: [] }] }, hasNextPage: false }));
  mount();
  expect(screen.getByText('community.templateDetail.empty')).toBeVisible();
  expect(screen.getByRole('heading', { name: 'Original recipe' })).toBeVisible();
  expect(screen.queryByRole('link', { name: 'Different outfit' })).toBeNull();
});
it('handles loading, unavailable source and retry without a dead generate action', () => {
  mocks.query.mockReturnValue(result({ data: undefined, isLoading: true }));
  const view = mount();
  expect(screen.getByText('community.templateDetail.loading')).toBeVisible();
  view.unmount();
  mocks.query.mockReturnValue(result({ data: { pages: [{ template: null, items: [] }] } }));
  const unavailable = mount();
  expect(screen.getByText('community.templateDetail.unavailable')).toBeVisible();
  expect(screen.queryByRole('button', { name: 'ui.action.useTemplate' })).toBeNull();
  unavailable.unmount();
  mocks.query.mockReturnValue(result({ data: undefined, isError: true }));
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'community.feed.retry' }));
  expect(mocks.refetch).toHaveBeenCalledOnce();
});
it('disables an in-progress use action and preserves existing results on pagination failure', () => {
  mocks.pending = true;
  mocks.query.mockReturnValue(result({ isError: true }));
  mount();
  expect(screen.getByRole('button', { name: 'ui.action.useTemplate' })).toBeDisabled();
  expect(screen.getByRole('link', { name: 'Different outfit' })).toBeVisible();
});

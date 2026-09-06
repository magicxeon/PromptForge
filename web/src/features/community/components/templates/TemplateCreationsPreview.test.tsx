import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { communityPostSchema } from '../../schemas/communitySchemas';
import type { TemplateDetailQuery } from '../../hooks/useTemplateDetail';
import { TemplateCreationsPreview } from './TemplateCreationsPreview';

const mocks = vi.hoisted(() => ({ mutate: vi.fn(), refetch: vi.fn() }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../../hooks/useCommunityTemplateHandoff', () => ({ useCommunityTemplateHandoff: () => ({ mutate: mocks.mutate }) }));
vi.mock('../../../../components/media/MediaStage', () => ({ MediaStage: () => <img alt="preview" /> }));
const template = communityPostSchema.parse({ id: 'original', postType: 'template', title: 'Original', creator: { displayName: 'Author' }, templateAvailability: true, engagementSummary: {} });
const item = communityPostSchema.parse({ id: 'variation', postType: 'image', title: 'Variation', creator: { displayName: 'Remixer' }, engagementSummary: { likeCount: 7 } });
const result = (override = {}) => ({ data: { pages: [{ template, items: [item] }] }, isLoading: false, isError: false, refetch: mocks.refetch, ...override }) as unknown as TemplateDetailQuery;
beforeEach(() => vi.clearAllMocks());

it('links See all to original detail and images to existing posts, reusing only the original template', () => {
  render(<MemoryRouter><TemplateCreationsPreview query={result()} postId="variation" isTemplate={false} /></MemoryRouter>);
  expect(screen.getByRole('link', { name: 'community.templateDetail.seeAll' })).toHaveAttribute('href', '/explore/templates/original');
  expect(screen.getByRole('link', { name: 'Variation' })).toHaveAttribute('href', '/posts/variation');
  expect(screen.getByText('7')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'ui.action.useTemplate' }));
  expect(mocks.mutate).toHaveBeenCalledWith('original');
});
it('does not add a second use action to an original template post', () => {
  render(<MemoryRouter><TemplateCreationsPreview query={result()} postId="original" isTemplate /></MemoryRouter>);
  expect(screen.queryByRole('button', { name: 'ui.action.useTemplate' })).toBeNull();
});
it('renders nothing for an ordinary image with no verified relationship', () => {
  const { container } = render(<MemoryRouter><TemplateCreationsPreview query={result({ data: { pages: [{ template: null, items: [] }] } })} postId="ordinary" isTemplate={false} /></MemoryRouter>);
  expect(container).toBeEmptyDOMElement();
});
it('keeps failure recovery local and displays a truthful empty family', () => {
  const view = render(<MemoryRouter><TemplateCreationsPreview query={result({ data: undefined, isError: true })} postId="original" isTemplate /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'community.feed.retry' }));
  expect(mocks.refetch).toHaveBeenCalledOnce();
  view.unmount();
  render(<MemoryRouter><TemplateCreationsPreview query={result({ data: { pages: [{ template, items: [] }] } })} postId="original" isTemplate /></MemoryRouter>);
  expect(screen.getByText('community.templateDetail.empty')).toBeVisible();
});

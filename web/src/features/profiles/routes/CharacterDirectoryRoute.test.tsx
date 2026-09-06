import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { CharacterDirectoryRoute } from './CharacterDirectoryRoute';
import { getCharacterWorks, listCharacters } from '../api/profileApi';
import { characterSummarySchema } from '../schemas/profileSchemas';

const state = vi.hoisted(() => ({ actor: { userId: 'actor-one' } }));
vi.mock('../../../lib/auth/ActorProvider', () => ({ useActor: () => ({ actor: state.actor }) }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../api/profileApi', () => ({ listCharacters: vi.fn(), getCharacterWorks: vi.fn(), requestCharacterHandoff: vi.fn() }));
const first = characterSummarySchema.parse({ id: 'first', displayName: 'Mali', displayImageUrl: '/first.jpg' });
const second = characterSummarySchema.parse({ id: 'second', displayName: 'Nara', displayImageUrl: '/second.jpg' });

beforeEach(() => {
  vi.clearAllMocks();
  state.actor = { userId: 'actor-one' };
  vi.mocked(listCharacters).mockResolvedValue({ items: [first], hasMore: false });
  vi.mocked(getCharacterWorks).mockResolvedValue({ items: [], hasMore: false });
});

function LocationProbe() {
  const location = useLocation();
  return <><output data-testid="location">{location.search}</output><output data-testid="return-state">{JSON.stringify(location.state)}</output></>;
}
function renderDirectory(entry = '/explore/characters') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const content = <QueryClientProvider client={client}><MemoryRouter initialEntries={[entry]}>
    <CharacterDirectoryRoute /><LocationProbe />
  </MemoryRouter></QueryClientProvider>;
  return { ...render(content), client, content };
}

it('loads moments only for the featured public identity and retains the Studio CTA', async () => {
  renderDirectory();
  await waitFor(() => expect(getCharacterWorks).toHaveBeenCalledWith('first'));
  expect(getCharacterWorks).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('link', { name: 'character-profiles.gallery.openStudio' })).toHaveAttribute('href', '/create/studio/character');
});

it('keeps filter URL semantics and switches works when the featured identity changes', async () => {
  vi.mocked(listCharacters).mockImplementation(async filters => ({ items: filters.intendedUse ? [second] : [first], hasMore: false }));
  renderDirectory('/explore/characters?creator=alice');
  await waitFor(() => expect(getCharacterWorks).toHaveBeenCalledWith('first'));
  fireEvent.click(screen.getByRole('button', { name: 'character-profiles.uses.fashion' }));
  await waitFor(() => expect(getCharacterWorks).toHaveBeenCalledWith('second'));
  expect(screen.getByTestId('location')).toHaveTextContent('creator=alice&intendedUse=fashion');
  fireEvent.click(screen.getByRole('button', { name: 'character-profiles.gallery.clearFilters' }));
  expect(screen.getByTestId('location')).toHaveTextContent('');
});

it('uses the existing cursor only when Load more is clicked', async () => {
  vi.mocked(listCharacters).mockImplementation(async (_filters, cursor) => cursor
    ? { items: [second], hasMore: false } : { items: [first], nextCursor: 'cursor-2', hasMore: true });
  renderDirectory();
  fireEvent.click(await screen.findByRole('button', { name: 'community:community.feed.loadMore' }));
  await waitFor(() => expect(listCharacters).toHaveBeenCalledWith({}, 'cursor-2'));
  expect(await screen.findByRole('heading', { name: 'Nara' })).toBeVisible();
  expect(getCharacterWorks).toHaveBeenCalledTimes(1);
});

it('keeps an empty directory actionable without fetching fictional work', async () => {
  vi.mocked(listCharacters).mockResolvedValue({ items: [], hasMore: false });
  renderDirectory('/explore/characters?creator=missing');
  expect(await screen.findByText('character-profiles.community.empty')).toBeVisible();
  expect(getCharacterWorks).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'character-profiles.gallery.clearFilters' })).toBeEnabled();
});

it('isolates queries when the active actor changes', async () => {
  const view = renderDirectory();
  await waitFor(() => expect(getCharacterWorks).toHaveBeenCalledTimes(1));
  state.actor = { userId: 'actor-two' };
  view.rerender(<QueryClientProvider client={view.client}><MemoryRouter><CharacterDirectoryRoute /></MemoryRouter></QueryClientProvider>);
  await waitFor(() => expect(listCharacters).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(getCharacterWorks).toHaveBeenCalledTimes(2));
});

it('shows directory loading while keeping the Studio entry available', async () => {
  vi.mocked(listCharacters).mockReturnValue(new Promise(() => {}));
  renderDirectory();
  expect(await within(screen.getByRole('main')).findByRole('status')).toHaveTextContent('character-profiles.states.loading');
  expect(screen.getByRole('link', { name: 'character-profiles.gallery.create' })).toBeVisible();
  expect(getCharacterWorks).not.toHaveBeenCalled();
});

it('preserves directory error recovery without fabricating a featured identity', async () => {
  vi.mocked(listCharacters).mockRejectedValueOnce(new Error('Directory unavailable'));
  renderDirectory();
  expect(await screen.findByText('Directory unavailable')).toBeVisible();
  expect(getCharacterWorks).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'community:community.feed.retry' }));
  await waitFor(() => expect(getCharacterWorks).toHaveBeenCalledWith('first'));
  expect(screen.queryByText('Directory unavailable')).not.toBeInTheDocument();
});

it('passes the filtered catalog location to Profile for return navigation', async () => {
  renderDirectory('/explore/characters?creator=alice&intendedUse=fashion#character-catalog');
  fireEvent.click((await screen.findAllByRole('link', { name: 'Mali' }))[0]!);
  expect(screen.getByTestId('return-state')).toHaveTextContent('/explore/characters?creator=alice&intendedUse=fashion#character-catalog');
});

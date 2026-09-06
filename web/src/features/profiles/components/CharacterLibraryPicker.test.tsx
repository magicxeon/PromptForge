import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, expect, it, vi } from 'vitest';
import { CharacterLibraryPicker } from './CharacterLibraryPicker';
import { characterSummarySchema } from '../schemas/profileSchemas';
import { readCharacterPickerRecents } from '../characterPickerRecents';
const mocks = vi.hoisted(() => ({ owned: vi.fn(), public: vi.fn(), detail: vi.fn() }));
vi.mock('../../../lib/auth/ActorProvider', () => ({ useActor: () => ({ actor: { userId: 'alice' } }) }));
vi.mock('../../../lib/auth/actorStore', () => ({ getActiveActorId: () => 'alice' }));
vi.mock('../api/profileApi', () => ({ listOwnedCharacters: mocks.owned, listCharacters: mocks.public, getCharacter: mocks.detail }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
const character = characterSummarySchema.parse({ id: 'nara', displayName: 'Nara' });
beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); mocks.owned.mockResolvedValue({ items: [character], hasMore: false }); mocks.public.mockResolvedValue({ items: [], hasMore: false }); mocks.detail.mockResolvedValue(character); });
function mount(onSelect = vi.fn().mockResolvedValue(undefined)) {
  const close = vi.fn();
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><CharacterLibraryPicker open onOpenChange={close} current={null} onSelect={onSelect} unavailableReason={() => undefined} /></QueryClientProvider>);
  return { close, onSelect };
}
it('searches via paginated API and applies only after confirmation; remembers successful choice', async () => {
  const { onSelect, close } = mount();
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Nara' } });
  await waitFor(() => expect(mocks.owned).toHaveBeenLastCalledWith(null, { q: 'Nara', limit: '24' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Nara' }));
  expect(onSelect).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'ui.characterPicker.use' }));
  await waitFor(() => expect(close).toHaveBeenCalledWith(false));
  expect(readCharacterPickerRecents('alice')).toEqual(['nara']);
});
it('keeps selection modal open and does not remember failed handoff', async () => {
  const { close } = mount(vi.fn().mockRejectedValue(new Error('denied')));
  fireEvent.click(await screen.findByRole('button', { name: 'Nara' }));
  fireEvent.click(screen.getByRole('button', { name: 'ui.characterPicker.use' }));
  expect(await screen.findByRole('alert')).toBeInTheDocument();
  expect(close).not.toHaveBeenCalled(); expect(readCharacterPickerRecents('alice')).toEqual([]);
});

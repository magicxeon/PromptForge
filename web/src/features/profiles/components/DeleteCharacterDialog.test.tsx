import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DeleteCharacterDialog } from './DeleteCharacterDialog';

const mocks = vi.hoisted(() => ({ remove: vi.fn(), navigate: vi.fn() }));
vi.mock('../api/profileApi', () => ({ deleteCharacter: mocks.remove }));
vi.mock('react-router-dom', () => ({ useNavigate: () => mocks.navigate }));
vi.mock('../../../lib/auth/ActorProvider', () => ({ useActor: () => ({ actor: { userId: 'owner' } }) }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
function setup() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const view = render(<QueryClientProvider client={client}><DeleteCharacterDialog characterId="c1" displayName="Mina" /></QueryClientProvider>);
  fireEvent.click(screen.getByRole('button', { name: 'character-profiles.delete.action' }));
  return { ...view, client };
}
beforeEach(() => vi.resetAllMocks());
describe('Delete Character', () => {
  it('requires exact DELETE and cancel never calls the API', () => {
    setup();
    const button = screen.getByRole('button', { name: 'character-profiles.delete.confirm' });
    expect(button).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'delete' } });
    expect(button).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'DELETE' } });
    expect(button).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'character-profiles.delete.cancel' }));
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it('blocks duplicate requests, invalidates owning queries and returns to My Characters', async () => {
    let resolve!: () => void;
    mocks.remove.mockReturnValue(new Promise<void>(done => { resolve = done; }));
    const { client } = setup();
    const invalidation = vi.spyOn(client, 'invalidateQueries');
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'DELETE' } });
    const form = screen.getByRole('textbox').closest('form')!;
    fireEvent.submit(form); fireEvent.submit(form);
    await waitFor(() => expect(mocks.remove).toHaveBeenCalledTimes(1));
    expect(mocks.remove).toHaveBeenCalledWith('c1', 'DELETE');
    await act(async () => resolve());
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith('/me/characters', { replace: true }));
    expect(invalidation).toHaveBeenCalledOnce();
  });
  it('keeps confirmation and allows retry after failure', async () => {
    mocks.remove.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce({ status: 'deleted' });
    setup();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'DELETE' } });
    fireEvent.click(screen.getByRole('button', { name: 'character-profiles.delete.confirm' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('character-profiles.delete.failed');
    expect(screen.getByRole('textbox')).toHaveValue('DELETE');
    fireEvent.click(screen.getByRole('button', { name: 'character-profiles.delete.confirm' }));
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledOnce());
  });
  it('does not navigate after unmount (including actor/Character switch)', async () => {
    let resolve!: () => void;
    mocks.remove.mockReturnValue(new Promise<void>(done => { resolve = done; }));
    const view = setup();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'DELETE' } });
    fireEvent.submit(screen.getByRole('textbox').closest('form')!);
    await waitFor(() => expect(mocks.remove).toHaveBeenCalledOnce());
    view.unmount();
    await act(async () => resolve());
    expect(mocks.navigate).not.toHaveBeenCalled();
  });
});

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { characterSummarySchema } from '../schemas/profileSchemas';
import { CharacterCreateAction } from './CharacterCreateAction';

const state = vi.hoisted(() => ({ pending: false, error: null as Error | null, mutate: vi.fn() }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string, options?: { name?: string }) => key === 'character-profiles.gallery.createWithName' ? `Create with ${options?.name}` : key }) }));
vi.mock('../useCharacterHandoff', () => ({ useCharacterHandoff: () => ({ isPending: state.pending, isError: Boolean(state.error), error: state.error, mutate: state.mutate }) }));
const character = characterSummarySchema.parse({ id: 'identity', displayName: 'Mali', handoffAvailable: true, destinationCapabilities: ['scene_builder'] });
beforeEach(() => { state.pending = false; state.error = null; state.mutate.mockClear(); });

it('opens a keyboard-accessible menu with only authorized destinations', async () => {
  render(<CharacterCreateAction character={character} />);
  fireEvent.keyDown(screen.getByRole('button'), { key: 'ArrowDown' });
  const item = await screen.findByRole('menuitem', { name: 'character-profiles.actions.useScene' });
  expect(screen.queryByRole('menuitem', { name: 'character-profiles.actions.useFashion' })).not.toBeInTheDocument();
  expect(state.mutate).not.toHaveBeenCalled();
  fireEvent.click(item);
  expect(state.mutate).toHaveBeenCalledWith('scene_builder');
});
it('hides the action for view-only Characters', () => {
  render(<CharacterCreateAction character={{ ...character, handoffAvailable: false }} />);
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});
it('disables the trigger and shows progress while preparing', () => {
  state.pending = true;
  render(<CharacterCreateAction character={character} />);
  expect(screen.getByRole('button')).toBeDisabled();
  expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
});
it('shows server rejection without hiding the retry menu', () => {
  state.error = new Error('Reuse no longer permitted');
  render(<CharacterCreateAction character={character} />);
  expect(screen.getByRole('alert')).toHaveTextContent('Reuse no longer permitted');
  expect(screen.getByRole('button')).toBeEnabled();
});

it('names the Featured Character only when requested and preserves the compact default', () => {
  const view = render(<CharacterCreateAction character={character} showName />);
  expect(screen.getByRole('button')).toHaveTextContent('Create with Mali');
  view.rerender(<CharacterCreateAction character={character} />);
  expect(screen.getByRole('button')).toHaveTextContent('character-profiles.gallery.createWith');
  expect(screen.getByRole('button')).not.toHaveTextContent('Mali');
});

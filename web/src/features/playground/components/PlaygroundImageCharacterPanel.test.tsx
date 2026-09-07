import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import {
  PlaygroundImageCharacterPanel,
  type PlaygroundImageCharacterSelection
} from './PlaygroundImageCharacterPanel';

const mocks = vi.hoisted(() => ({ handoff: vi.fn(), lookOpen: vi.fn() }));
vi.mock('../../../lib/auth/ActorProvider', () => ({
  useActor: () => ({ actor: { userId: 'usr_owner' } })
}));
vi.mock('../../../lib/auth/actorStore', () => ({
  getActiveActorId: () => 'usr_owner'
}));
vi.mock('../../profiles/api/profileApi', () => ({
  requestCharacterHandoff: mocks.handoff
}));
vi.mock('../../profiles/components/CharacterLibraryPicker', () => ({
  CharacterLibraryPicker: (props: { onSelect: (item: Record<string, unknown>) => Promise<void> }) => (
    <button onClick={() => void props.onSelect({
      id: 'char_1', displayName: 'Lina', characterProfileVersionId: 'ver_1',
      handoffAvailable: true, destinationCapabilities: ['playground_image']
    })}>Pick Lina</button>
  )
}));
vi.mock('../../profiles/components/CharacterLookDialog', () => ({
  CharacterLookDialog: (props: { open: boolean }) => {
    mocks.lookOpen(props.open);
    return props.open ? <div>Look workflow</div> : null;
  }
}));
vi.mock('../../../components/media/DisplayMediaImage', () => ({
  DisplayMediaImage: () => <div>Character artwork</div>
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key })
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.handoff.mockResolvedValue({
    handoffVersion: 1,
    destination: 'playground_image',
    characterProfileId: 'char_1',
    characterProfileVersionId: 'ver_1',
    characterReferenceAssetId: 'asset_1',
    characterReferenceUrl: '/api/community/character-profiles/char_1/image',
    displayName: 'Lina',
    personalitySummarySnapshot: '',
    intendedUsesSnapshot: [],
    characterType: 'reusable_model',
    outfitBehavior: 'replaceable',
    characterProfileContext: {
      purpose: 'character_usage',
      characterProfileId: 'char_1',
      characterProfileVersionId: 'ver_1'
    }
  });
});

function mount(selection: PlaygroundImageCharacterSelection | null, onChange = vi.fn()) {
  return render(<QueryClientProvider client={new QueryClient()}>
    <PlaygroundImageCharacterPanel selection={selection} onChange={onChange} />
  </QueryClientProvider>);
}

it('requests an authorized Playground image handoff before selecting a Character', async () => {
  const changed = vi.fn();
  mount(null, changed);
  fireEvent.click(screen.getByRole('button', { name: 'Pick Lina' }));
  await waitFor(() => expect(mocks.handoff).toHaveBeenCalledWith('char_1', 'playground_image'));
  expect(changed).toHaveBeenCalledWith(expect.objectContaining({
    handoff: expect.objectContaining({ characterProfileVersionId: 'ver_1' })
  }));
});

it('opens the existing Look Sheet workflow only for an owned Character', () => {
  const selection = {
    character: {
      id: 'char_1', displayName: 'Lina', characterProfileVersionId: 'ver_1',
      isOwner: true, handoffAvailable: true, destinationCapabilities: ['playground_image']
    },
    handoff: {
      destination: 'playground_image', characterProfileId: 'char_1',
      characterProfileVersionId: 'ver_1', characterReferenceUrl: '/character'
    }
  } as unknown as PlaygroundImageCharacterSelection;
  mount(selection);
  fireEvent.click(screen.getByRole('button', { name: 'playground.imageCharacter.createLookSheet' }));
  expect(screen.getByText('Look workflow')).toBeInTheDocument();
});

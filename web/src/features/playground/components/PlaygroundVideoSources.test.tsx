import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PlaygroundVideoSources } from './PlaygroundVideoSources';
import { characterSummarySchema } from '../../profiles/schemas/profileSchemas';
import type { VideoReferenceSelection } from './videoReferenceSelection';

const mocks = vi.hoisted(() => ({
  looks: vi.fn(),
  upload: vi.fn(),
  busy: vi.fn(),
  pick: vi.fn(),
  actorId: 'alice',
}));
vi.mock('../../../lib/auth/ActorProvider', () => ({
  useActor: () => ({ actor: { userId: mocks.actorId } }),
}));
vi.mock('../../../lib/auth/actorStore', () => ({
  getActiveActorId: () => mocks.actorId,
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('../../profiles/api/profileApi', () => ({
  listCharacterLooks: mocks.looks,
}));
vi.mock('../../generation/api/generationApi', () => ({
  uploadGenerationReference: mocks.upload,
}));
vi.mock('../../../components/media/AuthenticatedMediaImage', () => ({
  AuthenticatedMediaImage: ({ src, alt }: { src: string; alt: string }) => (
    <img src={src} alt={alt} />
  ),
}));
vi.mock('../../../components/media/DisplayMediaImage', () => ({
  DisplayMediaImage: ({
    sources,
    alt,
  }: {
    sources: { src: string }[];
    alt: string;
  }) => <img src={sources[0]?.src} alt={alt} />,
}));
vi.mock('../../profiles/components/CharacterLibraryPicker', () => ({
  CharacterLibraryPicker: (props: {
    open: boolean;
    onSelect: (item: unknown) => Promise<void>;
  }) => {
    mocks.pick(props);
    return props.open ? <div data-testid="shared-picker" /> : null;
  },
}));
const character = characterSummarySchema.parse({
  id: 'char',
  displayName: 'Nara',
  characterProfileVersionId: 'cv',
  handoffAvailable: true,
  displayImageUrl: '/community/cover.png',
});
const look = {
  id: 'look',
  name: 'Approved look',
  sourceCharacterProfileVersionId: 'cv',
  lifecycleStatus: 'approved',
  approvedVersionId: 'lv',
  versions: [
    { id: 'lv', status: 'approved', approvedSheetAsset: { assetId: 'sheet' } },
  ],
};
const empty: VideoReferenceSelection = {
  operation: 'character_to_video',
  referenceImageUrl: null,
  character: null,
  lookSheet: null,
};
function Host() {
  const [value, setValue] = useState(empty);
  return (
    <PlaygroundVideoSources
      value={value}
      onChange={(patch) => setValue((current) => ({ ...current, ...patch }))}
      onBusy={mocks.busy}
    />
  );
}
function mount() {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <Host />
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.actorId = 'alice';
  mocks.looks.mockResolvedValue({ items: [look] });
  mocks.upload.mockResolvedValue({
    imageUrl: '/outputs/upload.png',
    referenceId: 'upload-id',
  });
});
async function choose() {
  fireEvent.click(
    screen.getByRole('button', { name: 'playground.video.chooseCharacter' }),
  );
  expect(screen.getByTestId('shared-picker')).toBeVisible();
  await act(async () => mocks.pick.mock.calls.at(-1)?.[0].onSelect(character));
}

describe('Playground video sources', () => {
  it('uses the shared picker, Community display image and approved sheet as separate previews', async () => {
    mount();
    await choose();
    expect(screen.getByAltText('Nara')).toHaveAttribute(
      'src',
      '/community/cover.png',
    );
    expect(
      screen.getByAltText('playground.video.references.look'),
    ).toHaveAttribute(
      'src',
      '/api/character-profiles/char/looks/look/versions/lv/media/sheet',
    );
    expect(mocks.looks).toHaveBeenCalledWith('char', 'cv');
  });
  it('replaces the sheet with an upload without changing Character data', async () => {
    mount();
    await choose();
    fireEvent.change(
      screen.getByLabelText(
        'playground.reference.browse playground.video.references.look',
      ),
      {
        target: {
          files: [new File(['original'], 'look.png', { type: 'image/png' })],
        },
      },
    );
    await waitFor(() => expect(mocks.upload).toHaveBeenCalled());
    await waitFor(() =>
      expect(
        screen.getByAltText('playground.video.references.look'),
      ).toHaveAttribute('src', '/outputs/upload.png'),
    );
    expect(screen.getByAltText('Nara')).toHaveAttribute(
      'src',
      '/community/cover.png',
    );
    expect(mocks.upload.mock.calls[0]?.[0]).toBe(
      'data:image/png;base64,b3JpZ2luYWw=',
    );
  });
  it('shows no-sheet and upload errors and allows retry', async () => {
    mocks.looks.mockResolvedValue({ items: [] });
    mount();
    await choose();
    expect(
      await screen.findByText('playground.video.references.noApprovedLook'),
    ).toBeVisible();
    const field = screen.getByLabelText(
      'playground.reference.browse playground.video.references.look',
    );
    fireEvent.change(field, {
      target: { files: [new File(['bad'], 'bad.txt', { type: 'text/plain' })] },
    });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'playground.video.references.invalidUpload',
    );
    mocks.upload.mockRejectedValueOnce(new Error('network'));
    fireEvent.change(field, {
      target: {
        files: [new File(['image'], 'look.png', { type: 'image/png' })],
      },
    });
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'playground.video.references.uploadFailed',
      ),
    );
    expect(mocks.busy).toHaveBeenLastCalledWith(false);
  });
  it('discards a late upload after actor changes', async () => {
    let finish!: (value: unknown) => void;
    mocks.upload.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    mount();
    fireEvent.change(
      screen.getByLabelText(
        'playground.reference.browse playground.video.references.look',
      ),
      {
        target: {
          files: [new File(['image'], 'look.png', { type: 'image/png' })],
        },
      },
    );
    await waitFor(() => expect(mocks.upload).toHaveBeenCalled());
    mocks.actorId = 'bob';
    await act(async () =>
      finish({ imageUrl: '/outputs/alice-only.png', referenceId: 'alice' }),
    );
    expect(
      screen.queryByAltText('playground.video.references.look'),
    ).not.toBeInTheDocument();
  });
});

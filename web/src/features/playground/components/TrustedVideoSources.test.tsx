import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { TrustedVideoSources } from './TrustedVideoSources';
import { buildVideoReferenceSelection } from './videoReferenceSelection';
import { videoModelCapabilitySchema } from '../../generation/schemas/videoGenerationSchemas';

const mocks = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock('../api/trustedVideoSources', () => ({
  listTrustedVideoSources: mocks.list,
}));
vi.mock('../../../lib/auth/ActorProvider', () => ({
  useActor: () => ({ actor: { userId: 'actor' } }),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('../../../components/media/AuthenticatedMediaImage', () => ({
  AuthenticatedMediaImage: (p: { src: string; alt: string }) => <img {...p} />,
}));
const image = {
  id: 'generated',
  previewUrl: '/outputs/original.png',
  modelId: 'seedream',
  generationMode: 'text_to_image',
  generatedAt: '2026-09-01',
  expiresAt: null,
  category: 'look-sheet' as const,
  eligible: true,
  reason: null,
  policyVersion: 'policy',
};
const model = videoModelCapabilitySchema.parse({
  providerId: 'modelark',
  modelId: 'seedance',
  displayName: 'Seedance',
  operations: ['text_to_video'],
  inputModes: ['text_to_video', 'image_to_video', 'multimodal_reference'],
  referenceImageLimit: 9,
  supportsOrderedImageReferences: true,
  qualificationStatus: 'internal_testing',
  paidRoutingEnabled: false,
  playgroundReferencePolicy: {
    kind: 'trusted_generated_only',
    version: 'policy',
  },
});
beforeEach(() => {
  vi.clearAllMocks();
  mocks.list.mockResolvedValue({
    items: [
      image,
      {
        ...image,
        id: 'expired',
        modelId: 'expired-model',
        eligible: false,
        reason: 'expired',
        expiresAt: '2000-01-01',
      },
    ],
    hasMore: false,
  });
});
const mount = (onChange = vi.fn()) =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <TrustedVideoSources
        withLook
        frame={null}
        look={null}
        onChange={onChange}
      />
    </QueryClientProvider>,
  );

it('has only generated-source selection, hides ineligible rows and selects original evidence', async () => {
  const changed = vi.fn();
  const { container } = mount(changed);
  expect(container.querySelector('input[type=file]')).toBeNull();
  expect(
    screen.queryByText('playground.video.chooseCharacter'),
  ).not.toBeInTheDocument();
  fireEvent.click(
    screen.getAllByRole('button', {
      name: 'playground.video.trusted.choose',
    })[0]!,
  );
  const available = (await screen.findByAltText('seedream')).closest('button');
  expect(available).not.toBeNull();
  expect(screen.queryByText('expired-model')).not.toBeInTheDocument();
  fireEvent.click(available!);
  expect(changed).toHaveBeenCalledWith({ trustedFrame: image });
  await waitFor(() =>
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
  );
});

it('displays API errors and supports retry without enabling an upload escape', async () => {
  mocks.list.mockRejectedValueOnce(new Error('unavailable'));
  mount();
  fireEvent.click(
    screen.getAllByRole('button', {
      name: 'playground.video.trusted.choose',
    })[1]!,
  );
  expect(await screen.findByRole('alert')).toBeVisible();
  fireEvent.click(
    screen.getByRole('button', { name: 'playground.video.references.retry' }),
  );
  const available = (await screen.findByAltText('seedream')).closest('button');
  expect(available).toBeEnabled();
});

it('ignores saved upload/Character sources on restricted models and never submits local URLs', () => {
  const state = {
    operation: 'image_to_video' as const,
    referenceImageUrl: '/outputs/upload.png',
    character: null,
    lookSheet: { url: '/outputs/upload-look.png', name: 'upload' },
  };
  expect(buildVideoReferenceSelection(state, model).ready).toBe(false);
  expect(
    buildVideoReferenceSelection({ ...state, trustedFrame: image }, model)
      .references,
  ).toEqual([
    { generationId: image.id, role: 'first_frame', purpose: 'opening_frame' },
  ]);
  const selected = {
    ...state,
    operation: 'character_to_video' as const,
    trustedFrame: image,
    trustedLook: { ...image, id: 'look' },
  };
  expect(
    buildVideoReferenceSelection(selected, model).references.map(
      (row) => row.role,
    ),
  ).toEqual(['reference_image', 'reference_image']);
  expect(
    buildVideoReferenceSelection(
      { ...selected, trustedLook: { ...image, id: 'look', expiresAt: '2000-01-01' } },
      model,
    ).ready,
  ).toBe(true);
  expect(
    buildVideoReferenceSelection({ ...selected, trustedLook: image }, model)
      .reason,
  ).toBe('playground.video.trusted.duplicate');
  expect(
    buildVideoReferenceSelection(
      { ...selected, operation: 'text_to_video' },
      model,
    ).references,
  ).toEqual([]);
  expect(
    buildVideoReferenceSelection(state, {
      ...model,
      playgroundReferencePolicy: undefined,
    }).references[0]?.referenceImageUrl,
  ).toBe('/outputs/upload.png');
});

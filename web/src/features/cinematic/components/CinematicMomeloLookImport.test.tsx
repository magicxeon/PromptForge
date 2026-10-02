import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CinematicMomeloLookImport } from './CinematicMomeloLookImport';

const api = vi.hoisted(() => ({ list: vi.fn(), import: vi.fn(), upload: vi.fn(), actor: 'actor' }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../../../lib/auth/actorStore', () => ({ getActiveActorId: () => api.actor }));
vi.mock('../../../lib/permissions/FeaturePolicyProvider', () => ({ useFeaturePolicy: () => ({ policy: { generation: { lookSheetDocumentEnabled: true } } }) }));
vi.mock('../../../components/media/AuthenticatedMediaImage', () => ({ AuthenticatedMediaImage: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} /> }));
vi.mock('../../generation/api/trustedVideoSources', () => ({ listTrustedVideoSources: (...args: unknown[]) => api.list(...args) }));
vi.mock('../../generation/api/generationApi', () => ({ uploadGenerationReference: (...args: unknown[]) => api.upload(...args) }));
vi.mock('../../profiles/api/profileApi', () => ({ importMomeloCharacterLook: (...args: unknown[]) => api.import(...args) }));
function mount(upload = false) {
  const onImported = vi.fn(), onClose = vi.fn();
  render(<MemoryRouter><QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <CinematicMomeloLookImport actorId="actor" characterId="profile" versionId="identity" name="Lalin" upload={upload} onImported={onImported} onClose={onClose} />
  </QueryClientProvider></MemoryRouter>);
  return { onImported, onClose };
}
async function select() {
  fireEvent.click(await screen.findByRole('button', { name: 'sheet Fixture' }));
  fireEvent.click(screen.getByRole('checkbox'));
}
describe('Authorized Momelo Look source importer', () => {
  beforeEach(() => {
    vi.clearAllMocks(); api.actor = 'actor';
    api.list.mockResolvedValue({ items: [{ id: 'sheet', modelId: 'Fixture', previewUrl: '/fixture.png', eligible: true }], hasMore: false });
    api.import.mockResolvedValue({ id: 'look', approvedVersionId: null, lifecycleStatus: 'draft' });
    api.upload.mockResolvedValue({ referenceId: 'uploaded-original' });
  });
  it('requires explicit identity confirmation and imports for review without generating or approving', async () => {
    const { onImported } = mount();
    expect(screen.getByRole('button', { name: 'cinematic.momeloLook.review' })).toBeDisabled();
    expect(screen.getByRole('link', { name: 'cinematic.momeloLook.playground' })).toHaveAttribute('href', '/create/playground?media=image&imageMode=look-sheet');
    await select();
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.momeloLook.review' }));
    await waitFor(() => expect(api.import).toHaveBeenCalledWith('profile', { characterProfileVersionId: 'identity', generationResultId: 'sheet', name: 'Lalin', identityAndViewsConfirmed: true, uploadedAssetId: undefined }));
    expect(api.list).toHaveBeenCalledWith(null, 'look-sheet');
    expect(api.upload).not.toHaveBeenCalled();
    await waitFor(() => expect(onImported).toHaveBeenCalledWith(expect.objectContaining({ approvedVersionId: null })));
  });
  it('uploads through the reference owner and passes the verified asset id to Profile review', async () => {
    mount(true); await select();
    fireEvent.change(screen.getByLabelText('cinematic.momeloLook.originalFile'), { target: { files: [new File(['fixture'], 'original.png', { type: 'image/png' })] } });
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.momeloLook.review' }));
    await waitFor(() => expect(api.import).toHaveBeenCalledWith('profile', expect.objectContaining({ uploadedAssetId: 'uploaded-original' })));
    expect(api.upload).toHaveBeenCalledWith(expect.stringMatching(/^data:image\/png;base64,/), 'outfit_front', 'character-look-sheet');
  });
  it('retains inputs on origin rejection and makes no import after actor switching', async () => {
    api.import.mockRejectedValue(new Error('Origin mismatch'));
    const { onImported } = mount(); await select();
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.momeloLook.review' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Origin mismatch');
    expect(onImported).not.toHaveBeenCalled();
    api.actor = 'other';
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.momeloLook.review' }));
    expect(api.import).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('cinematic.momeloLook.name')).toHaveValue('Lalin');
  });
});

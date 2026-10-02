import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CinematicCharacterLooks } from './CinematicCharacterLooks';
import type { CinematicCastAssignment, CinematicProject } from '../schemas/cinematicSchemas';

const api = vi.hoisted(() => ({ list: vi.fn(), bind: vi.fn(), get: vi.fn(), impact: vi.fn(), remove: vi.fn(), actor: 'actor-1' }));
vi.mock('../../profiles/api/profileApi', () => ({ listCharacterLooks: (...args: unknown[]) => api.list(...args) }));
vi.mock('../api/cinematicApi', () => ({ upsertCinematicWardrobeLook: (...args: unknown[]) => api.bind(...args), getCinematicProject: (...args: unknown[]) => api.get(...args),
  getCinematicLookRemovalImpact: (...args: unknown[]) => api.impact(...args), removeCinematicWardrobeLook: (...args: unknown[]) => api.remove(...args) }));
vi.mock('./CinematicMomeloLookImport', () => ({ CinematicMomeloLookImport: ({ upload, onClose }: { upload: boolean; onClose: () => void }) => <div role="dialog">{upload ? 'verified-upload' : 'momelo-library'}<button onClick={onClose}>Close import</button></div> }));
vi.mock('../../../lib/auth/actorStore', () => ({ getActiveActorId: () => api.actor }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../../../components/media/AuthenticatedMediaImage', () => ({ AuthenticatedMediaImage: ({ src }: { src?: string }) => <img src={src} alt="" /> }));
vi.mock('../../profiles/components/CharacterLookDialog', () => ({ CharacterLookDialog: ({ initialMode, initialUploadKind, onSaved }: { initialMode: string; initialUploadKind: string; onSaved: (look: unknown) => void }) => <div role="dialog">{initialMode}:{initialUploadKind}<button onClick={() => onSaved({ id: 'draft', approvedVersionId: null })}>Save draft fixture</button></div> }));

const character = { id: 'cast-1', displayName: 'Lalin', characterProfileId: 'profile-1', characterProfileVersionId: 'identity-1', identityReady: true, looks: [] } as unknown as CinematicCastAssignment;
const root = { id: 'root', version: 4, castAssignments: [character] } as unknown as CinematicProject;
const approved = { id: 'look-1', name: 'Work clothes', approvedVersionId: 'look-v1', lifecycleStatus: 'approved', sourceCharacterProfileVersionId: 'identity-1', versions: [] };
function mount(person = character, project = root, onProjectChanged = vi.fn()) {
  return { onProjectChanged, ...render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <CinematicCharacterLooks actorId="actor-1" project={project} storyProject={root} character={person} disabled={false} onChooseCharacter={vi.fn()} onProjectChanged={onProjectChanged} />
  </QueryClientProvider>) };
}
async function expand() { fireEvent.click(screen.getByText('cinematic.lookReferences.title')); await screen.findByText('cinematic.lookReferences.upload'); }

describe('Character Look preparation', () => {
  beforeEach(() => { vi.clearAllMocks(); api.actor = 'actor-1'; api.list.mockResolvedValue({ items: [approved] }); api.bind.mockResolvedValue({ ...root, version: 5 });
    api.impact.mockResolvedValue({ projectId: 'root', projectVersion: 4, fingerprint: 'impact', items: [{ projectId: 'root', title: 'Story', sceneIds: ['scene'], shotIds: ['shot'] }] });
    api.remove.mockResolvedValue({ ...root, version: 5 }); });
  it('cancels Look unlink without mutation then removes only the reviewed binding', async () => {
    const { onProjectChanged } = mount({ ...character, looks: [{ id: 'binding', mode: 'character_look', name: 'Wardrobe', locked: true, characterLookId: 'look-1', characterLookVersionId: 'look-v1' }] });
    await expand();
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.momeloLook.removeFor' }));
    const modal = await screen.findByRole('alertdialog');
    await waitFor(() => expect(within(modal).getByRole('button', { name: 'cinematic.momeloLook.removeTitle' })).toBeEnabled());
    fireEvent.click(within(modal).getByRole('button', { name: 'ui.action.cancel' }));
    expect(api.remove).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.momeloLook.removeFor' }));
    const confirmation = await screen.findByRole('alertdialog');
    await waitFor(() => expect(within(confirmation).getByRole('button', { name: 'cinematic.momeloLook.removeTitle' })).toBeEnabled());
    let finish!: (value: CinematicProject) => void;
    api.remove.mockReturnValueOnce(new Promise<CinematicProject>(resolve => { finish = resolve; }));
    fireEvent.click(within(confirmation).getByRole('button', { name: 'cinematic.momeloLook.removeTitle' }));
    await waitFor(() => expect(within(confirmation).getByRole('button', { name: 'ui.action.cancel' })).toBeDisabled());
    expect(within(confirmation).getByRole('status')).toHaveTextContent('cinematic.characters.loading');
    finish({ ...root, version: 5 });
    await waitFor(() => expect(api.remove).toHaveBeenCalledWith('root', 'cast-1', 'binding', { expectedVersion: 4, impactFingerprint: 'impact' }));
    await waitFor(() => expect(onProjectChanged).toHaveBeenCalledWith(expect.objectContaining({ version: 5 })));
    expect(api.bind).not.toHaveBeenCalled();
  });
  it('keeps unlink confirmation disabled when impact cannot be checked', async () => {
    api.impact.mockRejectedValue(new Error('Unavailable impact'));
    mount({ ...character, looks: [{ id: 'binding', mode: 'uploaded', name: 'Wardrobe', locked: false }] }); await expand();
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.momeloLook.removeFor' }));
    const modal = await screen.findByRole('alertdialog');
    await waitFor(() => expect(within(modal).getByRole('alert')).toBeVisible());
    expect(within(modal).getByRole('button', { name: 'cinematic.momeloLook.removeTitle' })).toBeDisabled();
    expect(api.remove).not.toHaveBeenCalled();
  });
  it('reuses the complete-sheet upload and generated Look dialog without dispatching generation', async () => {
    mount(); await expand();
    const tools = within(screen.getByRole('group', { name: 'cinematic.lookReferences.title' }));
    expect(tools.getByRole('button', { name: 'cinematic.lookReferences.upload' })).toBeEnabled();
    expect(tools.getByRole('button', { name: 'cinematic.lookReferences.generate' })).toBeEnabled();
    expect(tools.getByRole('button', { name: 'cinematic.lookReferences.refresh' })).toBeInTheDocument();
    expect(screen.getAllByText('cinematic.lookReferences.empty')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.lookReferences.upload' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('verified-upload');
    fireEvent.click(screen.getByText('Close import'));
    expect(api.bind).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.lookReferences.generate' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('ai:sheet');
  });
  it('keeps refresh in the Look tools through loading and a recoverable list error', async () => {
    let fail!: (reason: Error) => void;
    api.list.mockReturnValueOnce(new Promise((_resolve, reject) => { fail = reject; }));
    mount(); await expand();
    expect(screen.getByRole('status')).toHaveTextContent('cinematic.characters.loading');
    expect(screen.getByRole('button', { name: 'cinematic.lookReferences.refresh' })).toBeDisabled();
    fail(new Error('Unavailable'));
    expect(await screen.findByRole('alert')).toHaveTextContent('cinematic.lookReferences.loadFailed');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.lookReferences.refresh' }));
    expect(await screen.findByText('Work clothes')).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(api.list).toHaveBeenCalledTimes(2);
  });
  it('pins an approved Look version on the story root then reloads the Chapter projection', async () => {
    const child = { ...root, id: 'chapter', version: 7 };
    api.get.mockResolvedValue({ ...child, version: 8 });
    const { onProjectChanged } = mount(character, child); await expand();
    fireEvent.click(await screen.findByRole('button', { name: 'cinematic.lookReferences.reuse' }));
    await waitFor(() => expect(api.bind).toHaveBeenCalledWith('root', 'cast-1', 'cinelook_look-1_look-v1', expect.objectContaining({ expectedVersion: 4, characterLookId: 'look-1', characterLookVersionId: 'look-v1' })));
    await waitFor(() => expect(onProjectChanged).toHaveBeenCalledWith({ ...child, version: 8 }));
  });
  it('does not invent a Profile for a dossier-only Character', async () => {
    mount({ ...character, characterProfileId: null, characterProfileVersionId: null });
    fireEvent.click(screen.getByText('cinematic.lookReferences.title'));
    expect(await screen.findByRole('button', { name: 'cinematic.characters.chooseFromLibrary' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'cinematic.lookReferences.upload' })).not.toBeInTheDocument();
    expect(api.list).not.toHaveBeenCalled();
  });
  it('keeps a failed binding available for retry and does not change the project', async () => {
    api.bind.mockRejectedValue(new Error('Version conflict'));
    const { onProjectChanged } = mount(); await expand();
    fireEvent.click(await screen.findByRole('button', { name: 'cinematic.lookReferences.reuse' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Version conflict');
    expect(onProjectChanged).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'cinematic.lookReferences.reuse' })).toBeEnabled();
  });
  it('keeps draft review enabled beside legacy null-version bindings', async () => {
    api.list.mockResolvedValue({ items: [{ ...approved, approvedVersionId: null, lifecycleStatus: 'draft' }] });
    mount({ ...character, looks: [{ id: 'legacy', mode: 'uploaded', name: 'Legacy wardrobe', locked: false }] }); await expand();
    expect(await screen.findByRole('button', { name: 'cinematic.lookReferences.review' })).toBeEnabled();
  });
  it('does not offer a Look prepared for a different identity version', async () => {
    api.list.mockResolvedValue({ items: [{ ...approved, sourceCharacterProfileVersionId: 'other-identity' }] });
    mount(); await expand();
    expect(await screen.findByText('cinematic.lookReferences.identityMismatch')).toBeVisible();
    expect(screen.getByRole('button', { name: 'cinematic.lookReferences.reuse' })).toBeDisabled();
    expect(api.bind).not.toHaveBeenCalled();
  });
});

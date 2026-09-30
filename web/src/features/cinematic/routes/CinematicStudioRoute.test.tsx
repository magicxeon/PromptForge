import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryKeys } from '../../../lib/api/queryKeys';
import { createCinematicSetupDraft } from '../state/cinematicDraftStorage';
import { CinematicStudioRoute } from './CinematicStudioRoute';
import type { CinematicProject, CinematicSetupDraft } from '../schemas/cinematicSchemas';

const api = vi.hoisted(() => ({ get: vi.fn(), list: vi.fn(), save: vi.fn(), actor: 'writer' }));
vi.mock('../../../lib/auth/ActorProvider', () => ({ useActor: () => ({ actor: { userId: 'writer' } }) }));
vi.mock('../../../lib/auth/actorStore', () => ({ getActiveActorId: () => api.actor }));
vi.mock('../../../lib/permissions/FeaturePolicyProvider', () => ({ useFeaturePolicy: () => ({ isEnabled: () => true, isLoading: false }) }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../api/cinematicApi', () => ({ getCinematicProject: (...args: unknown[]) => api.get(...args),
  listCinematicProjects: () => api.list(), updateCinematicSetup: (...args: unknown[]) => api.save(...args),
  getCinematicAuthoringManifest: async () => ({ rewamp: { enabled: true, workflow: { projectCreation: {}, authoring: {} } } }) }));
vi.mock('../components/CinematicProjectLibrary', () => ({ CinematicProjectLibrary: ({ projects }: { projects: { projectId: string; title: string }[] }) =>
  <div>{projects.map(project => <Link key={project.projectId} to={`/create/cinematic/${project.projectId}/setup`}>{project.title}</Link>)}</div> }));
vi.mock('../components/CinematicNewProjectComposer', () => ({ CinematicNewProjectComposer: ({ draft, onUpdate, onSave, saveState }: {
  draft: CinematicSetupDraft; onUpdate: (key: string, value: string) => void; onSave: () => void; saveState: string;
}) => <div><input aria-label="Project name" value={draft.projectName} onChange={event => onUpdate('projectName', event.target.value)} />
  <input aria-label="Brief" value={draft.storyBrief} onChange={event => onUpdate('storyBrief', event.target.value)} />
  <span data-testid="import-source">{draft.storyBriefImport?.fileName}:{String(draft.storyBriefImport?.edited)}</span>
  <button onClick={onSave}>Save</button><span role="status">{saveState}</span><Link to="/create/cinematic">Library</Link></div> }));
vi.mock('../components/CinematicStageContent', () => ({ CinematicStageContent: () => null,
  CinematicProduceRuntime: ({ shotId, previewAttemptId, onSelectionChange }: { shotId: string; previewAttemptId?: string; onSelectionChange: (scene: string, shot: string, take?: string) => void }) =>
    <div><span>Render {shotId}:{previewAttemptId}</span><button onClick={() => onSelectionChange('scene', 'shot-2', 'take-2')}>Choose second Take</button></div> }));
vi.mock('../components/CinematicDialogs', () => ({ StoryEnhanceDialog: () => null }));
vi.mock('../components/SeriesWorkspaceControls', () => ({ SeriesWorkspaceControls: () => null }));
vi.mock('../components/CinematicFullStoryWriter', () => ({ CinematicFullStoryWriter: () => null }));
vi.mock('../components/CinematicChapterWriter', () => ({ CinematicChapterWriter: () => null }));
vi.mock('../components/CinematicSceneOverview', () => ({ CinematicSceneOverview: () => null }));
vi.mock('../components/CinematicShotWriter', () => ({ CinematicShotWriter: ({ shotId, onOpenVideo, onOpenFinal }: { shotId: string; onOpenVideo: () => void; onOpenFinal: () => void }) =>
  <div><span>Writer {shotId}</span><button onClick={onOpenVideo}>Render video</button><button onClick={onOpenFinal}>Final</button></div> }));
vi.mock('../components/CinematicChapterFinal', () => ({ CinematicChapterFinal: ({ onOpenShot }: { onOpenShot: (id: string) => void }) => <button onClick={() => onOpenShot('shot-2')}>Review missing Shot</button> }));
vi.mock('../components/SceneEnvironmentControl', () => ({ SceneEnvironmentControl: () => null }));
vi.mock('../components/StoryboardShotDialog', () => ({ StoryboardShotDialog: () => null }));

function fixture(imported = false) {
  const draft = createCinematicSetupDraft();
  let project = { id: 'root', version: 1, title: 'Old name', setup: { ...draft, title: 'Old name' },
    aspectRatio: draft.aspectRatio, activeStage: 'setup', updatedAt: draft.updatedAt, scenes: [], castAssignments: [], fullStoryVersions: [] } as unknown as CinematicProject;
  if (imported) Object.assign(project.setup, { storyBrief: 'Imported idea.', storyBriefImport: { fileName: 'idea.md', edited: false } });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 20_000 } } });
  client.setQueryData(queryKeys.cinematicProjects('other'), { items: [{ projectId: 'foreign', title: 'Other actor' }] });
  client.setQueryData(['cinematic-series', 'writer', 'root'], { title: 'Old name' });
  api.get.mockImplementation(async () => project);
  api.list.mockImplementation(async () => ({ items: [{ projectId: project.id, title: project.title }] }));
  api.save.mockImplementation(async (_id: string, value: CinematicSetupDraft) => {
    project = { ...project, title: value.projectName, setup: { ...project.setup, ...value, title: value.projectName }, version: project.version + 1 };
    return project;
  });
  render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/create/cinematic']}><Routes>
    <Route path="/create/cinematic" element={<CinematicStudioRoute />} />
    <Route path="/create/cinematic/:projectId/:stage" element={<CinematicStudioRoute />} />
  </Routes></MemoryRouter></QueryClientProvider>);
  return client;
}

describe('Cinematic Setup name cache', () => {
  beforeEach(() => { localStorage.clear(); api.actor = 'writer'; api.get.mockReset(); api.list.mockReset(); api.save.mockReset(); });
  it('returns to the selected Render Shot/Take and links Final to the exact Shot', async () => {
    const draft = createCinematicSetupDraft();
    api.get.mockResolvedValue({ id: 'root', version: 1, title: 'Story', updatedAt: draft.updatedAt, aspectRatio: draft.aspectRatio, setup: { ...draft, title: 'Story' }, activeStage: 'setup',
      scenes: [{ id: 'scene', shots: [{ id: 'shot-1' }, { id: 'shot-2' }] }], castAssignments: [], fullStoryVersions: [], generationAttempts: [] });
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter initialEntries={['/create/cinematic/root/shot/shot-1?render=video']}><Routes>
      <Route path="/create/cinematic/:projectId/shot/:shotId" element={<CinematicStudioRoute />} />
      <Route path="/create/cinematic/:projectId/:stage" element={<CinematicStudioRoute />} />
    </Routes></MemoryRouter></QueryClientProvider>);
    fireEvent.click(await screen.findByRole('button', { name: 'Choose second Take' }));
    expect(await screen.findByText('Render shot-2:take-2')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.shotWorkspace.backToShot' }));
    expect(await screen.findByText('Writer shot-2')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Render video' }));
    expect(await screen.findByText('Render shot-2:take-2')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.shotWorkspace.backToShot' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Final' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Review missing Shot' }));
    expect(await screen.findByText('Writer shot-2')).toBeVisible();
    expect(api.save).not.toHaveBeenCalled();
  });
  it('loads imported brief metadata, saves edits and restores the source on re-entry', async () => {
    fixture(true);
    fireEvent.click(await screen.findByRole('link', { name: 'Old name' }));
    expect(await screen.findByTestId('import-source')).toHaveTextContent('idea.md:false');
    fireEvent.change(screen.getByRole('textbox', { name: 'Brief' }), { target: { value: 'Edited idea.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(api.save).toHaveBeenCalledWith('root', expect.objectContaining({
      storyBrief: 'Edited idea.', storyBriefImport: { fileName: 'idea.md', edited: true }
    }), expect.any(Number)));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('saved'));
    fireEvent.click(screen.getByRole('link', { name: 'Library' }));
    fireEvent.click(await screen.findByRole('link', { name: 'Old name' }));
    expect(await screen.findByTestId('import-source')).toHaveTextContent('idea.md:true');
    expect(screen.getByRole('textbox', { name: 'Brief' })).toHaveValue('Edited idea.');
  });
  it.each(['explicit', 'autosave'])('refreshes a fresh library after %s Save without invalidating another actor', async mode => {
    const client = fixture();
    fireEvent.click(await screen.findByRole('link', { name: 'Old name' }));
    fireEvent.change(await screen.findByRole('textbox', { name: 'Project name' }), { target: { value: 'New name' } });
    if (mode === 'explicit') fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('saved'));
    expect(client.getQueryState(queryKeys.cinematicProjects('writer'))?.isInvalidated).toBe(true);
    expect(client.getQueryState(['cinematic-series', 'writer', 'root'])?.isInvalidated).toBe(true);
    expect(client.getQueryState(queryKeys.cinematicProjects('other'))?.isInvalidated).toBe(false);
    fireEvent.click(screen.getByRole('link', { name: 'Library' }));
    expect(await screen.findByRole('link', { name: 'New name' })).toBeVisible();
    expect(api.list).toHaveBeenCalledTimes(2);
  });
  it('does not invalidate the saved library on a failed save', async () => {
    const client = fixture(); api.save.mockRejectedValue(new Error('Save failed'));
    fireEvent.click(await screen.findByRole('link', { name: 'Old name' }));
    fireEvent.change(await screen.findByRole('textbox', { name: 'Project name' }), { target: { value: 'Unsaved name' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('failed'));
    expect(client.getQueryState(queryKeys.cinematicProjects('writer'))?.isInvalidated).toBe(false);
    fireEvent.click(screen.getByRole('link', { name: 'Library' }));
    expect(await screen.findByRole('link', { name: 'Old name' })).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Unsaved name' })).not.toBeInTheDocument();
  });
});

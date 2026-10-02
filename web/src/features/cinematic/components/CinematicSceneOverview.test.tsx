import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CinematicProject } from '../schemas/cinematicSchemas';
import { CinematicSceneOverview } from './CinematicSceneOverview';

const api = vi.hoisted(() => ({
  propose: vi.fn(), apply: vi.fn(), discard: vi.fn(), manual: vi.fn(), update: vi.fn(),
  proposeShots: vi.fn(), applyShots: vi.fn(), discardShots: vi.fn(), manualShot: vi.fn(), reorder: vi.fn()
}));
vi.mock('../api/cinematicSeriesApi', () => ({
  reorderCinematicScenes: (...args: unknown[]) => api.reorder(...args),
  proposeCinematicScenes: (...args: unknown[]) => api.propose(...args),
  applyCinematicSceneProposal: (...args: unknown[]) => api.apply(...args),
  discardCinematicSceneProposal: (...args: unknown[]) => api.discard(...args),
  createCinematicManualScene: (...args: unknown[]) => api.manual(...args),
  updateCinematicSceneOutline: (...args: unknown[]) => api.update(...args),
  proposeCinematicShots: (...args: unknown[]) => api.proposeShots(...args),
  applyCinematicShotProposal: (...args: unknown[]) => api.applyShots(...args),
  discardCinematicShotProposal: (...args: unknown[]) => api.discardShots(...args),
  createCinematicManualShot: (...args: unknown[]) => api.manualShot(...args)
}));
vi.mock('../../../lib/auth/actorStore', () => ({ getActiveActorId: () => 'actor-1' }));
vi.mock('../../../components/media/AuthenticatedMediaImage', () => ({ AuthenticatedMediaImage: ({ src }: { src?: string }) => <img src={src} alt="" /> }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string, values?: Record<string, unknown>) => values ? `${key}:${Object.values(values).join('|')}` : key }) }));

const scene = {
  id: 'scene-1', version: 1, orderKey: 1, beatId: '', title: 'Flower shop', purpose: 'dramatic', synopsis: 'The pot falls.',
  storyChange: 'The pot falls.', objective: '', location: 'Flower shop', time: 'Night', weather: 'Rain', environmentPrompt: '',
  entryState: '', exitState: '', emotionalStart: '', emotionalEnd: '', transitionIntent: '', castAssignmentIds: [], wardrobeLookIds: [],
  blocking: '', lighting: '', performance: '', audioIntent: '', continuityNotes: [], shots: [], shotOrder: [], durationMs: 30000,
  dialogueTargetPercent: 0, planningStatus: 'ready'
};
const project = {
  id: 'chapter-1', projectId: 'chapter-1', version: 5, chapterTitle: 'Arrival', title: 'Rain Letters', activeChapterVersionId: 'chapter-rev-1',
  sceneProposals: [], shotProposals: [], scenes: [scene]
} as unknown as CinematicProject;

describe('CinematicSceneOverview', () => {
  it.each(['scenes', 'shots'] as const)('confirms existing %s only, with cancel and Escape dispatching nothing', async (scope) => {
    const value = { ...project, scenes: [{ ...scene, shots: [{ id: 'shot-1', title: 'Existing shot', orderKey: 1, durationMs: 4000 }] }] } as unknown as CinematicProject;
    const request = scope === 'scenes' ? api.propose : api.proposeShots;
    request.mockImplementation(() => new Promise(() => {}));
    render(<CinematicSceneOverview actorId="actor-1" project={value} online onBackToChapter={vi.fn()} onOpenShot={vi.fn()} onProjectChanged={vi.fn()} />);
    const trigger = screen.getByRole('button', { name: scope === 'scenes' ? 'cinematic.scenes.regenerate' : 'cinematic.scenes.regenerateShots' });
    fireEvent.click(trigger);
    expect(screen.getByRole('alertdialog')).toHaveTextContent(`cinematic.regeneration.${scope}Description`);
    expect(request).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'ui.action.cancel' }));
    expect(request).not.toHaveBeenCalled();
    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(request).not.toHaveBeenCalled();
    fireEvent.click(trigger);
    const confirm = screen.getByRole('button', { name: 'cinematic.regeneration.confirm' });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(request).toHaveBeenCalledOnce();
    expect(scope === 'scenes' ? api.proposeShots : api.propose).not.toHaveBeenCalled();
  });

  it.each(['actor', 'version', 'scene'] as const)('invalidates open consent on a changed %s', (change) => {
    const second = { ...scene, id: 'scene-2', orderKey: 2, title: 'Second scene' };
    const props = { actorId: 'actor-1', project: { ...project, scenes: [scene, second] } as unknown as CinematicProject, online: true, onBackToChapter: vi.fn(), onOpenShot: vi.fn(), onProjectChanged: vi.fn() };
    const view = render(<CinematicSceneOverview {...props} />);
    const select = screen.getByRole('button', { name: /Second scene/ });
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.scenes.regenerate' }));
    expect(screen.getByRole('alertdialog')).toBeVisible();
    if (change === 'scene') fireEvent.click(select);
    else view.rerender(<CinematicSceneOverview {...props} actorId={change === 'actor' ? 'actor-2' : props.actorId} project={change === 'version' ? { ...props.project, version: 6 } : props.project} />);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(api.propose).not.toHaveBeenCalled();
    expect(api.proposeShots).not.toHaveBeenCalled();
  });
  beforeEach(() => { localStorage.clear(); for (const mock of Object.values(api)) mock.mockReset(); });
  afterEach(() => vi.restoreAllMocks());

  it('confirms first-time Scene bulk generation with unbilled Credits before dispatch', () => {
    api.propose.mockImplementation(() => new Promise(() => {}));
    render(<CinematicSceneOverview actorId="actor-1" project={{ ...project, scenes: [] }} online onBackToChapter={vi.fn()} onOpenShot={vi.fn()} onProjectChanged={vi.fn()} />);
    fireEvent.click(screen.getAllByRole('button', { name: 'cinematic.scenes.generate' })[0]!);
    expect(screen.getByRole('alertdialog')).toHaveTextContent('cinematic.bulk.unbilled');
    expect(api.propose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.regeneration.confirm' }));
    expect(api.propose).toHaveBeenCalledWith('chapter-1', 5);
  });

  it.each(['scene', 'shot'] as const)('keeps manual %s creation outside regeneration confirmation', (scope) => {
    const request = scope === 'scene' ? api.manual : api.manualShot;
    request.mockImplementation(() => new Promise(() => {}));
    render(<CinematicSceneOverview actorId="actor-1" project={project} online onBackToChapter={vi.fn()} onOpenShot={vi.fn()} onProjectChanged={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: scope === 'scene' ? 'cinematic.scenes.add' : 'cinematic.scenes.addShot' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(request).toHaveBeenCalledOnce();
    expect(api.propose).not.toHaveBeenCalled();
    expect(api.proposeShots).not.toHaveBeenCalled();
  });

  it('keeps quota-failed Scene text on cancelled local selection and requires consent before creating another Scene', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Quota'); });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const second = { ...scene, id: 'scene-2', orderKey: 2, title: 'Inside the shop' };
    render(<CinematicSceneOverview actorId="actor-1" project={{ ...project, scenes: [scene, second] } as unknown as CinematicProject}
      online onBackToChapter={vi.fn()} onOpenShot={vi.fn()} onProjectChanged={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('cinematic.scenes.synopsis'), { target: { value: 'Keep my scene' } });
    fireEvent.click(screen.getByRole('button', { name: /Inside the shop/ }));
    expect(confirm).toHaveBeenCalledWith('cinematic.recovery.leaveConfirm');
    expect(screen.getByLabelText('cinematic.scenes.synopsis')).toHaveValue('Keep my scene');
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.scenes.add' }));
    expect(api.manual).not.toHaveBeenCalled();
    expect(confirm).toHaveBeenCalledTimes(2);
    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: /Inside the shop/ }));
    expect(screen.getByLabelText('cinematic.scenes.title')).toHaveValue('Inside the shop');
  });

  it('recovers the exact Scene after navigation and keeps restored text on server updates', () => {
    const second = { ...scene, id: 'scene-2', orderKey: 2, title: 'Inside the shop' };
    const value = { ...project, scenes: [scene, second] } as unknown as CinematicProject;
    const props = { actorId: 'actor-1', project: value, online: true, onBackToChapter: vi.fn(), onOpenShot: vi.fn(), onProjectChanged: vi.fn() };
    const view = render(<CinematicSceneOverview {...props} />);
    fireEvent.change(screen.getByLabelText('cinematic.scenes.synopsis'), { target: { value: 'Unfinished scene' } });
    fireEvent.click(screen.getByRole('button', { name: /Inside the shop/ }));
    expect(screen.queryByRole('button', { name: 'cinematic.recovery.restore' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /01 Flower shop/ }));
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.recovery.restore' }));
    view.rerender(<CinematicSceneOverview {...props} project={{ ...value, version: 6, scenes: [{ ...value.scenes[0]!, version: 2, synopsis: 'Server changed' }, value.scenes[1]!] }} />);
    expect(screen.getByLabelText('cinematic.scenes.synopsis')).toHaveValue('Unfinished scene');
    expect(api.update).not.toHaveBeenCalled();
  });

  it('reorders saved Scenes through the versioned command without generating anything', async () => {
    const second = { ...scene, id: 'scene-2', orderKey: 2, title: 'Inside the shop' };
    const value = { ...project, scenes: [scene, second] } as unknown as CinematicProject;
    api.reorder.mockResolvedValue({ project: { ...value, version: 6, scenes: [second, scene] }, scene: null });
    const changed = vi.fn();
    render(<CinematicSceneOverview actorId="actor-1" project={value} online onBackToChapter={vi.fn()} onOpenShot={vi.fn()} onProjectChanged={changed} />);
    expect(screen.getByRole('button', { name: 'cinematic.order.earlier Flower shop' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.order.later Flower shop' }));
    await waitFor(() => expect(api.reorder).toHaveBeenCalledWith('chapter-1', 5, ['scene-2', 'scene-1']));
    expect(changed).toHaveBeenCalledOnce();
    expect(api.propose).not.toHaveBeenCalled();
  });

  it('shows accepted counts and distinguishes unplanned Shots', () => {
    render(<CinematicSceneOverview actorId="actor-1" project={project} online onBackToChapter={vi.fn()} onOpenShot={vi.fn()} onProjectChanged={vi.fn()} />);
    expect(document.body).toHaveTextContent('cinematic.scenes.shotsNotPlanned');
    expect(screen.getByLabelText('cinematic.scenes.title')).toHaveValue('Flower shop');
  });

  it('restores the requested Scene and blocks Environment changes until Scene prose is saved', () => {
    const second = { ...scene, id: 'scene-2', orderKey: 2, title: 'Inside the shop' };
    const renderEnvironment = vi.fn((selected: CinematicProject['scenes'][number], disabled: boolean) => <button disabled={disabled}>{selected.id} environment</button>);
    render(<CinematicSceneOverview actorId="actor-1" project={{ ...project, scenes: [scene, second] } as unknown as CinematicProject} online initialSceneId="scene-2" renderEnvironment={renderEnvironment} onBackToChapter={vi.fn()} onOpenShot={vi.fn()} onProjectChanged={vi.fn()} />);
    expect(screen.getByLabelText('cinematic.scenes.title')).toHaveValue('Inside the shop');
    expect(screen.getByRole('button', { name: 'scene-2 environment' })).toBeEnabled();
    fireEvent.change(screen.getByLabelText('cinematic.scenes.title'), { target: { value: 'Changed location' } });
    expect(screen.getByRole('button', { name: 'scene-2 environment' })).toBeDisabled();
    expect(screen.getByText('cinematic.visuals.saveSceneFirst')).toBeVisible();
  });

  it('blocks applying a Scene proposal while the current Scene has unsaved Look selections', async () => {
    const current = { ...scene, id: 'scene-2', orderKey: 2, castAssignmentIds: ['cast-1'], wardrobeLookIds: [] };
    const value = { ...project, scenes: [scene, current], castAssignments: [{ id: 'cast-1', displayName: 'Lalin', identityReady: true,
      characterProfileId: 'profile', looks: [{ id: 'look-1', name: 'Work', mode: 'character_look', locked: true, characterLookId: 'look', characterLookVersionId: 'version' }] }],
      sceneProposals: [{ id: 'proposal', status: 'pending_review', sourceChapterRevisionId: project.activeChapterVersionId, scenes: [] }] } as unknown as CinematicProject;
    render(<CinematicSceneOverview actorId="actor-1" project={value} online initialSceneId="scene-2" onBackToChapter={vi.fn()} onOpenShot={vi.fn()} onProjectChanged={vi.fn()} />);
    fireEvent.change(screen.getByRole('combobox', { name: 'cinematic.lookReferences.lookFor:Lalin' }), { target: { value: 'look-1' } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'cinematic.scenes.apply' })).toBeDisabled());
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.scenes.apply' }));
    expect(api.apply).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.lookReferences.discard' }));
    expect(screen.getByRole('button', { name: 'cinematic.scenes.apply' })).toBeEnabled();
  });

  it('saves the selected Scene through the versioned Scene contract', async () => {
    const saved = { ...project, version: 6, scenes: [{ ...scene, version: 2, title: 'Rainy flower shop' }] } as unknown as CinematicProject;
    api.update.mockResolvedValue({ project: saved, scene: saved.scenes[0] });
    const onProjectChanged = vi.fn();
    render(<CinematicSceneOverview actorId="actor-1" project={project} online onBackToChapter={vi.fn()} onOpenShot={vi.fn()} onProjectChanged={onProjectChanged} />);
    fireEvent.change(screen.getByLabelText('cinematic.scenes.title'), { target: { value: 'Rainy flower shop' } });
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.scenes.save' }));
    await waitFor(() => expect(api.update).toHaveBeenCalledWith('chapter-1', 'scene-1', expect.objectContaining({
      expectedVersion: 5, expectedSceneVersion: 1, title: 'Rainy flower shop'
    })));
    expect(onProjectChanged).toHaveBeenCalledWith(saved);
  });

  it('keeps a stale Scene proposal visible but blocks applying it', () => {
    const staleProposal = {
      id: 'proposal-1', providerProposalId: 'provider-1', status: 'pending_review', sourceChapterRevisionId: 'chapter-rev-old',
      baseProjectVersion: 4, warnings: [], provenance: null, createdAt: '2026-09-21T00:00:00.000Z', appliedAt: null,
      discardedAt: null, scenes: [{ title: 'Old proposal', synopsis: 'Outdated source.', purpose: 'dramatic', objective: '',
        location: 'Station', time: 'Night', weather: '', environment: '', entryState: '', exitState: '', emotionalStart: '',
        emotionalEnd: '', transitionIntent: '', targetDurationSeconds: 20, dialogueTargetPercent: 0, characterIds: [] }]
    };
    const staleProject = { ...project, sceneProposals: [staleProposal] } as unknown as CinematicProject;
    render(<CinematicSceneOverview actorId="actor-1" project={staleProject} online onBackToChapter={vi.fn()} onOpenShot={vi.fn()} onProjectChanged={vi.fn()} />);
    expect(screen.getByText('cinematic.scenes.proposalStale')).toBeVisible();
    expect(screen.getByRole('button', { name: 'cinematic.scenes.apply' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'cinematic.scenes.discard' })).toBeEnabled();
  });

  it('creates a reviewable Shot proposal without opening media generation', async () => {
    const shotProposal = {
      id: 'shot-proposal-1', providerProposalId: 'provider-shot-1', status: 'pending_review', sceneId: 'scene-1',
      sourceSceneVersion: 1, sourceChapterRevisionId: 'chapter-rev-1', baseProjectVersion: 5,
      shots: [{ title: 'Reach down', purpose: 'Begin the encounter', durationMs: 4000, shotDocument: 'SHOT DURATION\n4 seconds', characterIds: [] }],
      warnings: [], provenance: null, createdAt: '2026-09-21T00:00:00.000Z', appliedAt: null, discardedAt: null
    };
    api.proposeShots.mockResolvedValue({ project: { ...project, version: 6, shotProposals: [shotProposal] }, proposal: shotProposal });
    render(<CinematicSceneOverview actorId="actor-1" project={project} online onBackToChapter={vi.fn()} onOpenShot={vi.fn()} onProjectChanged={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.scenes.generateShots' }));
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.regeneration.confirm' }));
    await waitFor(() => expect(api.proposeShots).toHaveBeenCalledWith('chapter-1', 'scene-1', 5));
    expect(screen.getByText('Reach down')).toBeVisible();
    expect(screen.getByText('cinematic.scenes.shotImpactNew')).toBeVisible();
  });
});

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CinematicProject } from '../schemas/cinematicSchemas';
import { CinematicChapterWriter } from './CinematicChapterWriter';

const api = vi.hoisted(() => ({
  workspace: vi.fn(), update: vi.fn(), mutate: vi.fn(), proposeScenes: vi.fn(), applyScenes: vi.fn(),
  discardScenes: vi.fn(), manualScene: vi.fn(), proposeChapters: vi.fn(), applyChapter: vi.fn(), discardChapter: vi.fn(), getProject: vi.fn(), reorder: vi.fn()
}));

vi.mock('../api/cinematicApi', () => ({ getCinematicProject: (...args: unknown[]) => api.getProject(...args) }));

vi.mock('../api/cinematicSeriesApi', () => ({
  reorderCinematicChapters: (...args: unknown[]) => api.reorder(...args),
  getCinematicSeriesWorkspace: (...args: unknown[]) => api.workspace(...args),
  updateCinematicChapter: (...args: unknown[]) => api.update(...args),
  mutateCinematicSeries: (...args: unknown[]) => api.mutate(...args),
  proposeCinematicScenes: (...args: unknown[]) => api.proposeScenes(...args),
  applyCinematicSceneProposal: (...args: unknown[]) => api.applyScenes(...args),
  discardCinematicSceneProposal: (...args: unknown[]) => api.discardScenes(...args),
  createCinematicManualScene: (...args: unknown[]) => api.manualScene(...args),
  proposeCinematicChapters: (...args: unknown[]) => api.proposeChapters(...args),
  applyCinematicChapterProposal: (...args: unknown[]) => api.applyChapter(...args),
  discardCinematicChapterProposal: (...args: unknown[]) => api.discardChapter(...args)
}));

vi.mock('../../../lib/auth/actorStore', () => ({ getActiveActorId: () => 'actor-1' }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, values?: Record<string, unknown>) => values ? `${key}:${Object.values(values).join('|')}` : key })
}));

const project = {
  id: 'chapter-1', version: 4, title: 'Rain Letters', chapterTitle: 'Arrival', chapterStory: 'The train arrives.',
  activeChapterVersionId: 'chapter-rev-1', sceneProposals: [], scenes: [],
  setup: { storyBrief: 'Whole-project brief.' },
  seriesMembership: { seriesId: 'series-1', seasonId: 'season-1', chapterNumber: 1 }
} as unknown as CinematicProject;

const workspace = {
  productionProject: { id: 'series-1', productionProjectId: 'series-1', version: 2, title: 'Rain Letters', format: 'mini-series', seasonsEnabled: true, chapterCount: 1 },
  series: { id: 'series-1', ownerUserId: 'actor-1', title: 'Rain Letters', version: 2, seasons: [{ id: 'season-1', number: 1, title: '' }], createdAt: '2026-09-20T00:00:00.000Z', updatedAt: '2026-09-20T00:00:00.000Z' },
  chapters: [{ projectId: 'chapter-1', ownerUserId: 'actor-1', title: 'Arrival', activeStage: 'cast', durationSeconds: 60, status: 'draft', updatedAt: '2026-09-20T00:00:00.000Z', seriesMembership: project.seriesMembership, productionProjectId: 'series-1', chapterId: 'chapter-1', productionUnitId: 'chapter-1', seasonId: 'season-1', order: 1, storyBrief: 'The train arrives.', sceneCount: 0, shotCount: 0, scenePlanningStatus: 'not_started' }]
};

function renderWriter(inputProject = project) {
  const props = { actorId: 'actor-1', project: inputProject, online: true, onBackToFullStory: vi.fn(), onOpenSetup: vi.fn(), onNavigateChapter: vi.fn(), onOpenScenes: vi.fn(), onProjectChanged: vi.fn() };
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><CinematicChapterWriter {...props} /></QueryClientProvider>);
  return props;
}

describe('CinematicChapterWriter', () => {
  it('forwards all-Chapter regeneration to the quoted API once and blocks duplicates', async () => {
    api.proposeChapters.mockImplementation(() => new Promise(() => {}));
    renderWriter({ ...project, confirmedFullStoryVersionId: 'confirmed-story' });
    const trigger = screen.getByRole('button', { name: 'cinematic.chapterWriter.regenerateAll' });
    fireEvent.click(trigger);
    expect(screen.getAllByText('cinematic.writingBilling.reviewPrice')[0]).toBeVisible();
    expect(trigger).toBeDisabled();
    fireEvent.click(trigger);
    expect(api.proposeChapters).toHaveBeenCalledOnce();
    expect(api.proposeChapters).toHaveBeenCalledWith('chapter-1', expect.objectContaining({ scope: 'all', expectedVersion: 4 }));
  });

  it('forwards the current instruction without a second unpriced confirmation', () => {
    api.proposeChapters.mockImplementation(() => new Promise(() => {}));
    renderWriter({ ...project, confirmedFullStoryVersionId: 'confirmed-story' });
    const instruction = screen.getByRole('textbox', { name: 'cinematic.chapterWriter.instruction' });
    fireEvent.change(instruction, { target: { value: 'New direction' } });
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.chapterWriter.regenerateAll' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(api.proposeChapters).toHaveBeenCalledWith('chapter-1', expect.objectContaining({ instruction: 'New direction', scope: 'all' }));
  });
  beforeEach(() => {
    localStorage.clear();
    for (const mock of Object.values(api)) mock.mockReset();
    api.workspace.mockResolvedValue(workspace);
  });

  it('recovers Chapter prose and retains an unsaved assistant instruction after saving prose', async () => {
    renderWriter();
    fireEvent.change(screen.getByRole('textbox', { name: 'cinematic.chapterWriter.story' }), { target: { value: 'Chapter recovery' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'cinematic.chapterWriter.instruction' }), { target: { value: 'Keep the ending quiet' } });
    cleanup();
    renderWriter();
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.recovery.restore' }));
    expect(screen.getByRole('textbox', { name: 'cinematic.chapterWriter.story' })).toHaveValue('Chapter recovery');
    const saved = { ...project, chapterStory: 'Chapter recovery', activeChapterVersionId: 'chapter-rev-2', version: 5 };
    api.update.mockResolvedValue({ project: saved, workspace });
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.chapterWriter.save' }));
    await waitFor(() => expect(api.update).toHaveBeenCalledOnce());
    await waitFor(() => expect(screen.getByRole('button', { name: 'cinematic.chapterWriter.save' })).not.toHaveAttribute('aria-busy', 'true'));
    cleanup();
    renderWriter(saved);
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.recovery.restore' }));
    expect(screen.getByRole('textbox', { name: 'cinematic.chapterWriter.instruction' })).toHaveValue('Keep the ending quiet');
    expect(api.update).toHaveBeenCalledOnce();
  });

  it('moves only sibling Chapters and keeps the selected Chapter stable', async () => {
    const chapters = [workspace.chapters[0], { ...workspace.chapters[0], projectId: 'chapter-2', title: 'Promise', order: 2 }];
    api.workspace.mockResolvedValue({ ...workspace, chapters });
    api.reorder.mockResolvedValue({ project: { ...project, version: 5 }, workspace: { ...workspace, chapters: [...chapters].reverse() } });
    const props = renderWriter();
    expect(await screen.findByRole('button', { name: 'cinematic.order.earlier Arrival' })).toBeDisabled();
    await waitFor(() => expect(screen.getByRole('button', { name: 'cinematic.order.later Arrival' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.order.later Arrival' }));
    await waitFor(() => expect(api.reorder).toHaveBeenCalledWith('chapter-1', expect.objectContaining({ chapterIds: ['chapter-2', 'chapter-1'], seasonId: 'season-1' })));
    expect(props.onNavigateChapter).not.toHaveBeenCalled();
    expect(api.proposeChapters).not.toHaveBeenCalled();
  });

  it('offers Chapter-only continuity for blank instructions and manual revision for entered text', async () => {
    api.proposeChapters.mockRejectedValue(new Error('Fixture stop after dispatch'));
    renderWriter({ ...project, confirmedFullStoryVersionId: 'confirmed-story' });
    const revise = await screen.findByRole('button', { name: 'cinematic.continuity.improve' });
    const instruction = screen.getByRole('textbox', { name: 'cinematic.chapterWriter.instruction' });
    expect(revise).toBeEnabled();
    fireEvent.change(instruction, { target: { value: ' \n\t ' } });
    expect(revise).toBeEnabled();
    fireEvent.click(revise);
    await waitFor(() => expect(api.proposeChapters).toHaveBeenCalledWith('chapter-1', expect.objectContaining({ scope: 'selected', intent: 'continuity' })));
    await screen.findByText('Fixture stop after dispatch');
    expect(api.proposeScenes).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'cinematic.chapterWriter.regenerateAll' })).toBeEnabled();
    fireEvent.change(instruction, { target: { value: 'Make the reunion more restrained.' } });
    expect(revise).toBeEnabled();
    fireEvent.click(revise);
    await waitFor(() => expect(api.proposeChapters).toHaveBeenCalledWith('chapter-1', expect.objectContaining({ scope: 'selected', instruction: 'Make the reunion more restrained.' })));
    await screen.findByText('Fixture stop after dispatch');
  });

  it('shows the configured count, not the existing Chapter count, and protects unsaved edits', async () => {
    const props = renderWriter({ ...project, setup: { ...project.setup, chapterCount: 8 } });
    expect(await screen.findByText('cinematic.chapterPlan.target:8')).toBeVisible();
    const edit = screen.getByRole('button', { name: 'cinematic.chapterPlan.editSetup' });
    fireEvent.click(edit);
    expect(props.onOpenSetup).toHaveBeenCalledWith('chapter-1');
    expect(api.proposeChapters).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole('textbox', { name: 'cinematic.chapterWriter.story' }), { target: { value: 'Unsaved story.' } });
    expect(edit).toBeDisabled();
  });

  it('reads the root story target and opens root Setup from a child Chapter', async () => {
    api.getProject.mockResolvedValue({ ...project, id: 'story-root', setup: { ...project.setup, chapterCount: 12 } });
    const props = renderWriter({ ...project, chapterOrigin: { projectId: 'story-root' } } as CinematicProject);
    expect(await screen.findByText('cinematic.chapterPlan.target:12')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.chapterPlan.editSetup' }));
    expect(props.onOpenSetup).toHaveBeenCalledWith('story-root');
    expect(api.proposeChapters).not.toHaveBeenCalled();
  });

  it('saves Chapter prose through the Chapter contract without editing Project Brief', async () => {
    const savedProject = { ...project, version: 5, chapterStory: 'The train leaves.' };
    api.update.mockResolvedValue({ project: savedProject, workspace: { ...workspace, chapters: [{ ...workspace.chapters[0], storyBrief: 'The train leaves.' }] } });
    const props = renderWriter();
    await screen.findByRole('button', { name: 'cinematic.chapterWriter.addChapter' });
    fireEvent.change(screen.getByRole('textbox', { name: 'cinematic.chapterWriter.story' }), { target: { value: 'The train leaves.' } });
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.chapterWriter.save' }));
    await waitFor(() => expect(api.update).toHaveBeenCalledWith('chapter-1', 4, 'Arrival', 'The train leaves.'));
    expect(props.onProjectChanged).toHaveBeenCalledWith(savedProject);
    expect(project.setup.storyBrief).toBe('Whole-project brief.');
  });

  it('adds a blank manual Chapter through the existing Series command', async () => {
    const chapter2 = { ...project, id: 'chapter-2', version: 1, chapterTitle: 'cinematic.chapterWriter.defaultTitle:2', chapterStory: '' };
    api.mutate.mockResolvedValue({ project: chapter2, workspace: { ...workspace, chapters: [...workspace.chapters, { ...workspace.chapters[0], projectId: 'chapter-2', order: 2 }] } });
    const props = renderWriter();
    const add = await screen.findByRole('button', { name: 'cinematic.chapterWriter.addChapter' });
    fireEvent.click(add);
    await waitFor(() => expect(api.mutate).toHaveBeenCalledWith('chapter-1', 4, 'series-1', 2, expect.objectContaining({ kind: 'chapter', storyBrief: '', copyCast: true })));
    expect(props.onNavigateChapter).toHaveBeenCalledWith('chapter-2');
  });

  it('generates a reviewable Scene-only proposal before opening Scene Overview', async () => {
    const proposal = {
      id: 'scene-proposal-1', providerProposalId: 'provider-1', status: 'pending_review',
      sourceChapterRevisionId: 'chapter-rev-1', baseProjectVersion: 4, warnings: [], provenance: null,
      createdAt: '2026-09-21T00:00:00.000Z', appliedAt: null, discardedAt: null,
      scenes: [{ title: 'Station', synopsis: 'The train arrives.', purpose: 'dramatic', objective: '', location: 'Station',
        time: 'Night', weather: 'Rain', environment: '', entryState: '', exitState: '', emotionalStart: '', emotionalEnd: '',
        transitionIntent: '', targetDurationSeconds: 30, dialogueTargetPercent: 0, characterIds: [] }]
    };
    api.proposeScenes.mockResolvedValue({ project: { ...project, version: 5, sceneProposals: [proposal] }, proposal });
    const props = renderWriter();
    fireEvent.click(await screen.findByRole('button', { name: 'cinematic.chapterWriter.generateScenes' }));
    await waitFor(() => expect(api.proposeScenes).toHaveBeenCalledWith('chapter-1', 4));
    expect(await screen.findByText('Station')).toBeVisible();
    expect(props.onOpenScenes).not.toHaveBeenCalled();
  });

  it('restores a pending Chapter proposal and does not generate another', async () => {
    const pending = {
      id: 'chapter-proposal-pending', providerProposalId: 'provider-1', scope: 'all', status: 'pending_review',
      sourceFullStoryRevisionId: 'full-story-1', targetProjectId: 'chapter-1', instruction: '', baseChapterVersions: [],
      chapters: [{ projectId: 'chapter-1', order: 1, seasonNumber: 1, chapterNumber: 1, title: 'Arrival', story: 'A train arrives.' }],
      warnings: [], provenance: null, createdAt: '2026-09-21T00:00:00.000Z', appliedAt: null, discardedAt: null
    };
    const pendingProject = { ...project, confirmedFullStoryVersionId: 'full-story-1', chapterProposals: [pending] } as unknown as CinematicProject;
    renderWriter(pendingProject);
    const review = await screen.findByRole('button', { name: 'cinematic.chapterWriter.reviewPendingProposal' });
    fireEvent.click(review);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(await screen.findByText('A train arrives.')).toBeVisible();
    expect(api.proposeChapters).not.toHaveBeenCalled();
  });
});

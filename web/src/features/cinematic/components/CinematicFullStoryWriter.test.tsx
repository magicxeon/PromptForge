import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../lib/api/apiError';
import type { CinematicProject } from '../schemas/cinematicSchemas';
import { CinematicFullStoryWriter } from './CinematicFullStoryWriter';
import { CinematicSharedCharactersPanel } from './CinematicSharedCharactersPanel';

const api = vi.hoisted(() => ({
  propose: vi.fn(), save: vi.fn(), confirm: vi.fn(), chapters: vi.fn(), apply: vi.fn(), discard: vi.fn(), workspace: vi.fn(), chapterCharacters: vi.fn(), voice: vi.fn()
}));
vi.mock('../../../components/media/AuthenticatedMediaImage', () => ({ AuthenticatedMediaImage: ({ src }: { src?: string }) => <img src={src} alt="" /> }));

vi.mock('../api/cinematicApi', () => ({
  proposeCinematicFullStory: (...args: unknown[]) => api.propose(...args),
  saveCinematicFullStoryRevision: (...args: unknown[]) => api.save(...args),
  confirmCinematicFullStoryRevision: (...args: unknown[]) => api.confirm(...args),
  generateCinematicFullStoryChapters: (...args: unknown[]) => api.chapters(...args)
}));

vi.mock('../api/cinematicSeriesApi', () => ({
  getCinematicSeriesWorkspace: (...args: unknown[]) => api.workspace(...args),
  applyCinematicChapterProposal: (...args: unknown[]) => api.apply(...args),
  discardCinematicChapterProposal: (...args: unknown[]) => api.discard(...args),
  setCinematicChapterCharacters: (...args: unknown[]) => api.chapterCharacters(...args),
  updateCinematicSharedVoice: (...args: unknown[]) => api.voice(...args)
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) => values ? `${key}:${Object.values(values).join('|')}` : key,
    i18n: { language: 'en', resolvedLanguage: 'en' }
  })
}));

const baseProject = {
  id: 'project-1', version: 1, title: 'Rain Letters',
  setup: { storyBrief: 'A florist meets a stranger in the rain.', format: 'mini-series', durationSeconds: 60 },
  fullStoryVersions: [], activeFullStoryVersionId: null, confirmedFullStoryVersionId: null
} as unknown as CinematicProject;

function renderWriter(project = baseProject) {
  const props = { actorId: 'actor-1', project, online: true, onBackToBrief: vi.fn(), onOpenChapters: vi.fn(), onOpenCharacters: vi.fn(), onProjectChanged: vi.fn() };
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><CinematicFullStoryWriter {...props} /></QueryClientProvider>);
  return props;
}

function renderCast(project = baseProject) {
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><CinematicSharedCharactersPanel actorId="actor-1" project={project} storyProjectId={project.id} online onProjectChanged={vi.fn()} /></QueryClientProvider>);
}

describe('CinematicFullStoryWriter', () => {
  beforeEach(() => {
    localStorage.clear();
    for (const mock of Object.values(api)) mock.mockReset();
    api.workspace.mockResolvedValue({ series: null, productionProject: null, chapters: [] });
  });
  it('keeps Assistant, History and Build Chapters while Character management navigates out', () => {
    const revision = { id: 'full-1', version: 1, content: 'Confirmed story', createdAt: '2026-09-26T00:00:00Z' };
    const props = renderWriter({ ...baseProject, fullStoryVersions: [revision], activeFullStoryVersionId: revision.id, confirmedFullStoryVersionId: revision.id } as unknown as CinematicProject);
    const instruction = screen.getByRole('textbox', { name: 'cinematic.fullStory.instruction' });
    fireEvent.change(instruction, { target: { value: 'Keep this instruction' } });
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.shotWorkspace.manageCast' }));
    expect(props.onOpenCharacters).toHaveBeenCalledOnce();
    expect(instruction).toHaveValue('Keep this instruction');
    expect(screen.queryByRole('tab', { name: 'cinematic.chapterWriter.characters' })).not.toBeInTheDocument();
    expect(screen.queryByText('cinematic.characters.title')).not.toBeInTheDocument();
    expect(screen.getByText('cinematic.fullStory.history')).toBeVisible();
    expect(screen.getByText('cinematic.fullStory.generateChaptersTitle')).toBeVisible();
    expect(screen.getByRole('textbox', { name: 'cinematic.fullStory.documentTitle' }).tagName).toBe('TEXTAREA');
    expect(api.propose).not.toHaveBeenCalled();
  });

  it('recovers Full Story text after a failed save and never overwrites a changed server revision automatically', async () => {
    api.save.mockRejectedValue(new Error('Save unavailable'));
    renderWriter();
    fireEvent.change(screen.getByRole('textbox', { name: 'cinematic.fullStory.documentTitle' }), { target: { value: 'Recover this story' } });
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.fullStory.saveRevision' }));
    await screen.findByText('Save unavailable');
    cleanup();
    const revision = { id: 'changed', version: 2, content: 'Server story', createdAt: '2026-09-27T00:00:00Z' };
    renderWriter({ ...baseProject, activeFullStoryVersionId: revision.id, fullStoryVersions: [revision] } as unknown as CinematicProject);
    expect(screen.getByRole('textbox', { name: 'cinematic.fullStory.documentTitle' })).toHaveValue('Server story');
    expect(screen.getByRole('button', { name: 'cinematic.recovery.restore' })).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox', { name: 'cinematic.recovery.acknowledge' }));
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.recovery.restore' }));
    expect(screen.getByRole('textbox', { name: 'cinematic.fullStory.documentTitle' })).toHaveValue('Recover this story');
    expect(api.save).toHaveBeenCalledOnce();
  });

  it('collapses Characters without losing an unfinished form and Add expands it again', async () => {
    renderCast();
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.characters.add' }));
    const name = screen.getByRole('textbox', { name: 'cinematic.characters.name' });
    fireEvent.change(name, { target: { value: 'Mina' } });
    const collapse = screen.getByRole('button', { name: 'cinematic.characters.collapse' });
    expect(collapse).toHaveAttribute('aria-expanded', 'true');
    expect(document.getElementById(collapse.getAttribute('aria-controls')!)).toContainElement(name);
    fireEvent.click(collapse);
    expect(name).not.toBeVisible();
    const expand = screen.getByRole('button', { name: 'cinematic.characters.expand' });
    expect(expand).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(expand);
    expect(name).toBeVisible();
    expect(name).toHaveValue('Mina');
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.characters.add' }));
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.characters.collapse' }));
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.characters.add' }));
    expect(screen.getByRole('textbox', { name: 'cinematic.characters.name' })).toHaveValue('Mina');
    expect(api.propose).not.toHaveBeenCalled();
  });

  it('shows the saved Chapter target and returns to Setup without generating', async () => {
    const revision = { id: 'full-1', version: 1, content: 'A long confirmed story.', status: 'confirmed', source: 'manual', createdAt: '2026-09-26T00:00:00Z' };
    const props = renderWriter({ ...baseProject, setup: { ...baseProject.setup, chapterCount: 8 },
      fullStoryVersions: [revision], activeFullStoryVersionId: revision.id, confirmedFullStoryVersionId: revision.id } as unknown as CinematicProject);
    expect(screen.getByText('cinematic.chapterPlan.target:8')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.chapterPlan.editSetup' }));
    expect(props.onBackToBrief).toHaveBeenCalledOnce();
    expect(api.chapters).not.toHaveBeenCalled();
  });

  it('requires outline review before generating prose and preserves Manual and Characters', async () => {
    const revision = { id: 'full-1', version: 1, content: 'A confirmed story.', status: 'confirmed', source: 'manual', createdAt: '2026-09-26T00:00:00Z' };
    renderWriter({ ...baseProject, setup: { ...baseProject.setup, seasonEnabled: false, seasonCount: 1, chapterCount: 1, chaptersPerSeason: [1] },
      fullStoryVersions: [revision], activeFullStoryVersionId: revision.id, confirmedFullStoryVersionId: revision.id,
      chapterOutline: { id: 'plan', status: 'proposed', sourceRevisionId: revision.id, settings: { format: 'mini-series', durationSeconds: 60, seasonEnabled: false, seasonCount: 1 },
        chapters: [{ title: 'Arrival', synopsis: 'A return home.', seasonNumber: 1 }], rationale: 'One turn.', warnings: [] }
    } as unknown as CinematicProject);
    await waitFor(() => expect(api.workspace).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: 'cinematic.fullStory.generateChapters' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'cinematic.chapterOutline.approve' })).toBeEnabled();
    fireEvent.change(screen.getByRole('textbox', { name: 'cinematic.chapterOutline.chapterTitle' }), { target: { value: 'Changed plan' } });
    expect(screen.getByRole('textbox', { name: 'cinematic.fullStory.documentTitle' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.chapterOutline.reset' }));
    expect(screen.getByRole('textbox', { name: 'cinematic.fullStory.documentTitle' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.fullStory.chapterModeManual' }));
    expect(screen.getByRole('button', { name: 'cinematic.fullStory.buildManually' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'cinematic.shotWorkspace.manageCast' })).toBeEnabled();
    expect(api.chapters).not.toHaveBeenCalled();
  });

  it('generates a Full Story draft without exposing Chapters before confirmation', async () => {
    api.propose.mockResolvedValue({
      proposalId: 'proposal-1', fullStory: 'The complete generated story.', warnings: [],
      characters: [],
      provenance: { provider: 'test', model: 'story', responseId: null }, billingStatus: 'qualification_no_charge'
    });
    renderWriter();
    expect(screen.queryByRole('button', { name: 'cinematic.fullStory.generateChapters' })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'cinematic.fullStory.instruction' })).not.toBeInTheDocument();
    expect(screen.getByText('cinematic.fullStory.assistantDescriptionInitial')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.fullStory.generateWithAi' }));
    await waitFor(() => expect(api.propose).toHaveBeenCalledWith('project-1', 1, ''));
    expect(screen.getByRole('textbox', { name: 'cinematic.fullStory.documentTitle' })).toHaveValue('The complete generated story.');
    expect(screen.getByRole('button', { name: 'cinematic.fullStory.saveRevision' })).toBeEnabled();
  });

  it('preserves imported Full Story while Character actions belong to the separate workspace', () => {
    const revision = { id: 'import-1', version: 1, content: '# My story\nMina returns home.', createdAt: '2026-09-25T00:00:00Z' };
    const props = renderWriter({ ...baseProject, fullStoryVersions: [revision], activeFullStoryVersionId: revision.id } as unknown as CinematicProject);
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.shotWorkspace.manageCast' }));
    expect(props.onOpenCharacters).toHaveBeenCalledOnce();
    expect(screen.getByRole('textbox', { name: 'cinematic.fullStory.documentTitle' })).toHaveValue(revision.content);
    expect(api.propose).not.toHaveBeenCalled();
  });

  it('keeps Full Story Character text separate from the Chapter selection control', async () => {
    const project = {
      ...baseProject,
      castAssignments: [{
        id: 'cast-1', active: true, sourceType: 'dossier', displayName: 'หญิงเล็ก (เล็ก)',
        storyRole: 'นางเอกสาวโรงงานผู้มุ่งมั่นสร้างชีวิตใหม่', identityReady: false
      }]
    } as unknown as CinematicProject;

    renderCast(project);

    expect(await screen.findByText('หญิงเล็ก (เล็ก)')).toHaveAttribute('title', 'หญิงเล็ก (เล็ก)');
    expect(screen.getByText('นางเอกสาวโรงงานผู้มุ่งมั่นสร้างชีวิตใหม่')).toHaveAttribute(
      'title',
      'นางเอกสาวโรงงานผู้มุ่งมั่นสร้างชีวิตใหม่'
    );
    expect(document.querySelector('.cinematic-shared-characters__selection')).not.toBeInTheDocument();
  });

  it('reveals Chapter generation only for the confirmed active revision', async () => {
    const revision = {
      id: 'revision-1', version: 1, parentRevisionId: null, content: 'Confirmed story.', source: 'manual',
      revisionInstruction: '', status: 'confirmed', provenance: null, createdAt: '2026-09-20T00:00:00.000Z'
    } as const;
    const project = {
      ...baseProject, version: 3, fullStoryVersions: [revision],
      activeFullStoryVersionId: revision.id, confirmedFullStoryVersionId: revision.id
    } as unknown as CinematicProject;
    api.chapters.mockResolvedValue({
      project: { ...project, version: 4 },
      proposal: {
        id: 'proposal-1', providerProposalId: 'provider-1', scope: 'all', status: 'pending_review',
        sourceFullStoryRevisionId: 'revision-1', targetProjectId: 'project-1', instruction: '', baseChapterVersions: [],
        chapters: [{ projectId: 'project-1', order: 1, title: 'Arrival', story: 'Chapter prose.' }], warnings: [],
        provenance: null, createdAt: '2026-09-20T00:00:00.000Z', appliedAt: null, discardedAt: null
      },
      workspace: { chapters: [] }
    });
    api.apply.mockResolvedValue({
      project: { ...project, version: 5 },
      proposal: { id: 'proposal-1' },
      workspace: { chapters: [{ projectId: 'project-1', order: 1, title: 'Arrival', storyBrief: 'Chapter prose.' }] }
    });
    const props = renderWriter(project);
    expect(screen.getByRole('textbox', { name: 'cinematic.fullStory.instruction' })).toBeVisible();
    expect(screen.getByText('cinematic.fullStory.assistantDescriptionRevision')).toBeVisible();
    expect(screen.getByRole('button', { name: 'cinematic.fullStory.reviseWithAi' })).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox', { name: 'cinematic.fullStory.instruction' }), {
      target: { value: 'Make the reconciliation more restrained.' }
    });
    expect(screen.getByRole('button', { name: 'cinematic.fullStory.reviseWithAi' })).toBeEnabled();
    await waitFor(() => expect(screen.getByRole('button', { name: 'cinematic.fullStory.generateChapters' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.fullStory.generateChapters' }));
    expect(api.chapters).toHaveBeenCalledOnce();
    await waitFor(() => expect(api.chapters).toHaveBeenCalledWith('project-1', 3));
    expect(props.onProjectChanged).toHaveBeenCalled();
    expect(props.onOpenChapters).not.toHaveBeenCalled();
    expect(screen.getByText('Arrival')).toBeVisible();
    expect(screen.getByText('Chapter prose.')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.fullStory.applyProposal' }));
    await waitFor(() => expect(props.onOpenChapters).toHaveBeenCalledOnce());
  });

  it('restores existing Chapters and prevents duplicate generation after re-entry', async () => {
    const revision = {
      id: 'revision-1', version: 1, parentRevisionId: null, content: 'Confirmed story.', source: 'manual',
      revisionInstruction: '', status: 'confirmed', provenance: null, createdAt: '2026-09-20T00:00:00.000Z'
    } as const;
    const project = {
      ...baseProject, version: 3, fullStoryVersions: [revision],
      activeFullStoryVersionId: revision.id, confirmedFullStoryVersionId: revision.id
    } as unknown as CinematicProject;
    api.workspace.mockResolvedValue({
      series: null, productionProject: null,
      chapters: [{ projectId: 'project-1', order: 1, title: 'Existing Chapter', storyBrief: 'Persisted chapter prose.' }]
    });
    renderWriter(project);
    expect(await screen.findByText('Existing Chapter')).toBeVisible();
    const chapterResult = screen.getByText('Existing Chapter').closest('.cinematic-full-story__chapter-result');
    const storyDocument = screen.getByRole('region', { name: 'cinematic.fullStory.documentTitle' });
    expect(chapterResult?.parentElement).toBe(storyDocument);
    expect(chapterResult?.previousElementSibling).toBe(screen.getByRole('button', { name: 'cinematic.fullStory.confirmStory' }).closest('footer'));
    const rail = document.querySelector('.cinematic-full-story__side-rail') as HTMLElement;
    expect(within(rail).getByText('cinematic.fullStory.assistantTitle')).toBeVisible();
    expect(within(rail).getByText('cinematic.fullStory.generateChaptersTitle')).toBeVisible();
    expect(within(rail).queryByText('Existing Chapter')).not.toBeInTheDocument();
    expect(document.querySelector('.cinematic-full-story__history')?.parentElement).toBe(screen.getByTestId('cinematic-full-story'));
    expect(screen.queryByRole('button', { name: 'cinematic.fullStory.generateChapters' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'cinematic.fullStory.continueChapters' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'cinematic.fullStory.chapterModeManual' })).not.toBeInTheDocument();
    expect(api.chapters).not.toHaveBeenCalled();
  });

  it('keeps each Character identity, actions and independent Look/Voice disclosures together', async () => {
    const characters = ['Lalin', 'Niran'].map((displayName, index) => ({
      id: `cast-${index}`, active: true, sourceType: 'dossier', displayName,
      storyRole: 'Supporting role', dialogueStyle: '', identityReady: false
    }));
    renderCast({ ...baseProject, castAssignments: characters } as unknown as CinematicProject);
    const lalin = within(screen.getByRole('listitem', { name: 'Lalin' }));
    const niran = within(screen.getByRole('listitem', { name: 'Niran' }));
    for (const [item, name] of [[lalin, 'Lalin'], [niran, 'Niran']] as const) {
      expect(item.getByRole('button', { name: `cinematic.characters.changeFor:${name}` })).toBeEnabled();
      expect(item.getByRole('button', { name: `cinematic.characters.removeFor:${name}` })).toBeEnabled();
      expect(item.getByText('cinematic.lookReferences.title').closest('details')).not.toHaveAttribute('open');
      expect(item.getByText('cinematic.shotWorkspace.voice').closest('details')).not.toHaveAttribute('open');
    }
    fireEvent.click(lalin.getByText('cinematic.lookReferences.title'));
    expect(await lalin.findByRole('button', { name: 'cinematic.characters.chooseFromLibrary' })).toBeVisible();
    expect(lalin.getAllByText('cinematic.lookReferences.empty')).toHaveLength(1);
    expect(niran.queryByRole('button', { name: 'cinematic.characters.chooseFromLibrary' })).not.toBeInTheDocument();
    fireEvent.click(lalin.getByText('cinematic.shotWorkspace.voice'));
    expect(lalin.getByRole('textbox', { name: 'cinematic.shotWorkspace.voiceFor:Lalin' })).toBeVisible();
    expect(niran.getByRole('textbox')).not.toBeVisible();
    expect(niran.getByText('cinematic.shotWorkspace.voice').closest('details')).not.toHaveAttribute('open');
  });

  it('preserves Chapter Character selection and Voice save through the shared item', async () => {
    const person = { id: 'cast-1', active: true, sourceType: 'dossier', displayName: 'Lalin', storyRole: 'Lead', dialogueStyle: '', identityReady: false };
    const project = { ...baseProject, chapterCharacterIds: [], castAssignments: [person] } as unknown as CinematicProject;
    const onProjectChanged = vi.fn();
    api.chapterCharacters.mockResolvedValue({ project });
    api.voice.mockResolvedValue({ project, storyProject: project });
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <CinematicSharedCharactersPanel actorId="actor-1" project={project} storyProjectId={project.id} chapterMode online onProjectChanged={onProjectChanged} />
    </QueryClientProvider>);
    const personItem = within(screen.getByRole('listitem', { name: 'Lalin' }));
    fireEvent.click(personItem.getByRole('button', { name: 'Lalin Lead', pressed: false }));
    await waitFor(() => expect(api.chapterCharacters).toHaveBeenCalledWith('project-1', 1, ['cast-1']));
    fireEvent.click(personItem.getByText('cinematic.shotWorkspace.voice'));
    fireEvent.change(personItem.getByRole('textbox'), { target: { value: 'Quiet and measured' } });
    await waitFor(() => expect(personItem.getByRole('button', { name: 'cinematic.characters.save' })).toBeEnabled());
    fireEvent.click(personItem.getByRole('button', { name: 'cinematic.characters.save' }));
    await waitFor(() => expect(api.voice).toHaveBeenCalledWith('project-1', 'cast-1', {
      expectedProjectVersion: 1, expectedStoryProjectVersion: 1, dialogueStyle: 'Quiet and measured'
    }));
    expect(onProjectChanged).toHaveBeenCalledWith(project);
  });

  it('keeps the writer open when a Chapter proposal fails', async () => {
    const revision = {
      id: 'revision-1', version: 1, parentRevisionId: null, content: 'Confirmed story.', source: 'manual',
      revisionInstruction: '', status: 'confirmed', provenance: null, createdAt: '2026-09-20T00:00:00.000Z'
    } as const;
    const project = {
      ...baseProject, version: 3, fullStoryVersions: [revision],
      activeFullStoryVersionId: revision.id, confirmedFullStoryVersionId: revision.id
    } as unknown as CinematicProject;
    api.chapters.mockRejectedValue(new ApiError({
      status: 409,
      code: 'cinematic_chapters_already_exist',
      message: 'Existing Chapters or production work must be reviewed before regeneration.'
    }));
    const props = renderWriter(project);
    await waitFor(() => expect(screen.getByRole('button', { name: 'cinematic.fullStory.generateChapters' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.fullStory.generateChapters' }));
    expect(api.chapters).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.getByText('Existing Chapters or production work must be reviewed before regeneration.')).toBeVisible());
    expect(props.onOpenChapters).not.toHaveBeenCalled();
  });

  it('opens manual Chapter authoring without requesting AI generation', () => {
    const revision = {
      id: 'revision-1', version: 1, parentRevisionId: null, content: 'Confirmed story.', source: 'manual',
      revisionInstruction: '', status: 'confirmed', provenance: null, createdAt: '2026-09-20T00:00:00.000Z'
    } as const;
    const project = {
      ...baseProject, version: 3, fullStoryVersions: [revision],
      activeFullStoryVersionId: revision.id, confirmedFullStoryVersionId: revision.id
    } as unknown as CinematicProject;
    const props = renderWriter(project);
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.fullStory.chapterModeManual' }));
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.fullStory.buildManually' }));
    expect(props.onOpenChapters).toHaveBeenCalledOnce();
    expect(api.chapters).not.toHaveBeenCalled();
  });
});

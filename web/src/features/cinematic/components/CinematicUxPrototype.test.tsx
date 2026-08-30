import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import {
  castDirectionFromRole, cinematicCastPortraitUrl, CinematicStageContent,
  hasUsableApprovedStoryPlan, needsStoryPlanRecovery
} from './CinematicStageContent';
import { CinematicStageRail } from './CinematicStageRail';
import { characterCandidateMediaUrl, formatFacetLabel, overlapsAgeBucket } from './CinematicDialogs';
import type {
  CinematicProject, CinematicSceneDirectionProposal, CinematicStoryPlanProposal
} from '../schemas/cinematicSchemas';

const cinematicApiMocks = vi.hoisted(() => ({
  generateCinematicStoryPlan: vi.fn(),
  generateCinematicSceneDirection: vi.fn(),
  saveCinematicStoryPlan: vi.fn(),
  getCinematicStoryboardGenerationContext: vi.fn(),
  approveCinematicStoryboardSource: vi.fn()
}));

vi.mock('../api/cinematicApi', async importOriginal => ({
  ...await importOriginal<typeof import('../api/cinematicApi')>(),
  ...cinematicApiMocks
}));

vi.mock('../../../components/media/AuthenticatedMediaImage', () => ({
  AuthenticatedMediaImage: ({ src, alt = '' }: { src: string; alt?: string }) => <img src={src} alt={alt} />
}));

vi.mock('../../generation/hooks/useGenerationJob', () => ({
  useGenerationJob: (jobId: string | null) => ({
    data: jobId ? { status: 'completed', result: { imageUrl: `/outputs/${jobId}.jpg` } } : undefined
  })
}));

vi.mock('../../../components/generation/GenerationExperience', () => ({
  GenerationExperience: (props: {
    surface: string;
    generationMode: string;
    prompt: string;
    onPromptChange: (value: string) => void;
    fixedAspectRatio?: string | null;
    persistenceScope?: string;
    resumeJobId?: string | null;
    renderResultActions?: (job: { id: string; status: string }) => ReactNode;
  }) => <section
    data-testid="storyboard-generation-experience"
    data-surface={props.surface}
    data-mode={props.generationMode}
    data-aspect-ratio={props.fixedAspectRatio}
    data-persistence-scope={props.persistenceScope}
    data-resume-job-id={props.resumeJobId || ''}
  ><textarea aria-label="storyboard generation prompt" value={props.prompt} onChange={event => props.onPromptChange(event.target.value)} />{props.renderResultActions?.({ id: 'job_storyboard_test', status: 'completed' })}</section>
}));

const testI18n = i18next.createInstance();

describe('Cinematic UX prototype', () => {
  beforeAll(async () => {
    await testI18n.use(initReactI18next).init({
      lng: 'en',
      resources: { en: { cinematic: {} } },
      keySeparator: false,
      returnNull: false,
      interpolation: { escapeValue: false }
    });
  });

  beforeEach(() => {
    cinematicApiMocks.generateCinematicStoryPlan.mockReset();
    cinematicApiMocks.generateCinematicSceneDirection.mockReset();
    cinematicApiMocks.saveCinematicStoryPlan.mockReset();
    cinematicApiMocks.getCinematicStoryboardGenerationContext.mockReset();
    cinematicApiMocks.approveCinematicStoryboardSource.mockReset();
    cinematicApiMocks.getCinematicStoryboardGenerationContext.mockResolvedValue({
      schemaVersion: 1,
      projectId: 'cineproj_legacy_story', projectVersion: 4,
      sceneId: 'scene_legacy', shotId: 'shot_legacy', shotVersion: 1,
      characterProfileContext: null,
      references: { outfit_front: null, outfit_back: null, style_reference: null },
      cast: [], looks: [], continuitySource: null,
      generationEligible: true, blockingReason: null
    });
  });

  it('filters Character age ranges and formats server identity facets', () => {
    expect(overlapsAgeBucket({ minimum: 21, maximum: 23 }, '20-29')).toBe(true);
    expect(overlapsAgeBucket({ minimum: 21, maximum: 23 }, '30-39')).toBe(false);
    expect(overlapsAgeBucket(null, '20-29')).toBe(false);
    expect(formatFacetLabel('east-asian')).toBe('East Asian');
    expect(characterCandidateMediaUrl({
      thumbnailUrl: '/thumb.webp',
      faceThumbnailUrl: '/face.webp',
      displayImageUrl: '/display.webp',
      imageUrl: '/image.webp'
    })).toBe('/face.webp');
    expect(characterCandidateMediaUrl({ displayImageUrl: '/display.webp' }))
      .toBe('/display.webp');
  });

  it('uses the current Character Profile featured image for Cast presentation', () => {
    expect(cinematicCastPortraitUrl({
      characterProfileId: 'char/profile 1',
      portraitUrl: '/identity-pack-face.webp'
    })).toBe('/api/community/character-profiles/char%2Fprofile%201/featured-image');
  });

  it('seeds the Cast dossier from an AI-recommended story role', () => {
    expect(castDirectionFromRole({
      id: 'role_lead', label: 'Lead', importance: 'required', storyFunction: 'Makes the choice', relationshipHint: '',
      objective: 'Walk toward the warm exit', emotionalArc: 'Uncertain to hopeful',
      personalityTraits: ['restrained', 'decisive'], performanceDirection: 'Use breath and gaze, not dialogue.'
    })).toEqual({
      objective: 'Walk toward the warm exit', emotionalBaseline: 'Uncertain to hopeful',
      personalityTraits: ['restrained', 'decisive'], performanceDirection: 'Use breath and gaze, not dialogue.'
    });
  });

  it('lets the prototype owner inspect every production stage', () => {
    const onStageChange = vi.fn();
    render(
      <I18nextProvider i18n={testI18n}>
        <CinematicStageRail activeStage="setup" onStageChange={onStageChange} />
      </I18nextProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /6\. cinematic\.stages\.finish/i }));
    expect(onStageChange).toHaveBeenCalledWith('finish');
  });

  it('uses one responsive stage list and exposes a compact stage disclosure', () => {
    render(
      <I18nextProvider i18n={testI18n}>
        <CinematicStageRail activeStage="story-plan" onStageChange={vi.fn()} />
      </I18nextProvider>
    );
    const trigger = screen.getByRole('button', { name: /cinematic\.stages\.mobileSummary/ });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(document.querySelectorAll('#cinematic-stage-list')).toHaveLength(1);
  });

  it.each(['cast', 'story-plan', 'storyboard', 'produce', 'finish'] as const)(
    'renders the %s presentation without enabling paid operations',
    stage => {
      const { unmount } = render(
        <I18nextProvider i18n={testI18n}>
          <CinematicStageContent
            activeStage={stage}
            onPrevious={vi.fn()}
            onNext={vi.fn()}
          />
        </I18nextProvider>
      );

      expect(screen.getByTestId(`cinematic-stage-${stage}`)).toBeVisible();
      screen.queryAllByTestId('cinematic-operation-dock').forEach(dock => {
        expect(within(dock).getByTestId('cinematic-operation-submit')).toBeDisabled();
      });
      unmount();
    }
  );

  it('opens the filtered Character picker without enabling a paid operation', () => {
    render(<I18nextProvider i18n={testI18n}><CinematicStageContent activeStage="cast" onPrevious={vi.fn()} onNext={vi.fn()} /></I18nextProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.cast.addCharacter' }));
    expect(screen.getByRole('dialog', { name: 'cinematic.picker.title' })).toBeVisible();
    expect(screen.getByLabelText('cinematic.picker.gender')).toBeVisible();
    expect(screen.getByLabelText('cinematic.picker.ethnicity')).toBeVisible();
  });

  it('keeps wardrobe upload inside the selected Character dossier', () => {
    render(<I18nextProvider i18n={testI18n}><CinematicStageContent activeStage="cast" mode="simple" onPrevious={vi.fn()} onNext={vi.fn()} /></I18nextProvider>);
    fireEvent.click(screen.getByRole('tab', { name: 'cinematic.cast.tab.wardrobe' }));
    const uploadHint = screen.getByText('cinematic.cast.uploadForCharacter');
    expect(uploadHint.closest('.cinematic-character-dossier')).not.toBeNull();
    expect(screen.queryByText('cinematic.cast.pressure')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Noah Lin/i }));
    expect(screen.getByText('Noah Lin', { selector: '.cinematic-dossier-header h3' })).toBeVisible();
  });

  it('never shows fixture Characters inside a committed empty Project', () => {
    const project = {
      id: 'cineproj_empty', projectId: 'cineproj_empty', castAssignments: []
    } as unknown as CinematicProject;
    render(<I18nextProvider i18n={testI18n}><CinematicStageContent activeStage="cast" project={project} onPrevious={vi.fn()} onNext={vi.fn()} /></I18nextProvider>);
    expect(screen.queryByText('Mira Chen')).not.toBeInTheDocument();
    expect(screen.queryByText('Noah Lin')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'cinematic.cast.addCharacter' })).toHaveLength(1);
  });

  it('reveals advanced Character direction without changing the Cast workflow', () => {
    render(<I18nextProvider i18n={testI18n}><CinematicStageContent activeStage="cast" mode="advanced" onPrevious={vi.fn()} onNext={vi.fn()} /></I18nextProvider>);
    expect(screen.getByText('cinematic.cast.motivation')).toBeVisible();
    expect(screen.getByText('cinematic.cast.pressure')).toBeVisible();
    expect(screen.queryByText('cinematic.cast.relationship')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'cinematic.cast.tab.continuity' }));
    expect(screen.getByText('cinematic.cast.allowSceneChanges')).toBeVisible();
  });

  it('keeps the Cast control level in the stage heading without a second layout row', () => {
    render(<I18nextProvider i18n={testI18n}><CinematicStageContent activeStage="cast" mode="simple" onPrevious={vi.fn()} onNext={vi.fn()} /></I18nextProvider>);
    const heading = screen.getByRole('heading', { name: 'cinematic.stage.cast.title' }).closest('.cinematic-stage-heading');
    expect(heading).not.toBeNull();
    expect(within(heading as HTMLElement).getByRole('group', { name: 'cinematic.mode.control' })).toBeVisible();
    expect(document.querySelector('.cinematic-mode-row--cast')).not.toBeInTheDocument();
  });

  it('renders Setup role readiness and separates Direction, Wardrobe, and Continuity for a committed Project', () => {
    const project = castProjectFixture();
    render(<I18nextProvider i18n={testI18n}><CinematicStageContent activeStage="cast" project={project} onPrevious={vi.fn()} onNext={vi.fn()} /></I18nextProvider>);

    expect(screen.getByRole('heading', { name: 'cinematic.cast.recommendedRoles' })).toBeVisible();
    const castSummary = screen.getByLabelText('cinematic.cast.castSummary');
    expect(within(castSummary).getByText('1')).toBeVisible();
    expect(within(castSummary).getByText('2')).toBeVisible();
    expect(within(castSummary).getByText('cinematic.cast.charactersInProject')).toBeVisible();
    expect(within(castSummary).getByText('cinematic.cast.plannedRoles')).toBeVisible();
    expect(screen.getAllByText('Second Character')).toHaveLength(2);
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    expect(screen.getByRole('tab', { name: 'cinematic.cast.tab.direction' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByText('cinematic.cast.uploadForCharacter')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'cinematic.cast.tab.wardrobe' }));
    expect(screen.getByText('cinematic.cast.uploadForCharacter')).toBeVisible();
    expect(screen.queryByTestId('cinematic-operation-dock')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'cinematic.cast.continueToStoryPlan' })).toBeDisabled();
  });

  it('exposes explicit story analysis when AI Wardrobe opens from a committed Cast Assignment', () => {
    const project = castProjectFixture();
    render(<I18nextProvider i18n={testI18n}><CinematicStageContent activeStage="cast" project={project} onPrevious={vi.fn()} onNext={vi.fn()} /></I18nextProvider>);

    fireEvent.click(screen.getByRole('tab', { name: 'cinematic.cast.tab.wardrobe' }));
    fireEvent.click(screen.getByRole('button', { name: /cinematic\.cast\.aiWardrobe / }));

    expect(screen.getByRole('dialog', { name: 'cinematic.lookDraft.title' })).toBeVisible();
    expect(screen.getByText('cinematic.lookDraft.analysisTitle')).toBeVisible();
    expect(screen.getByRole('button', { name: 'cinematic.lookDraft.generateSuggestion' })).toBeVisible();
  });

  it('does not describe an assigned Character as ready while identity preparation is incomplete', () => {
    const project = castProjectFixture();
    project.castAssignments[0]!.identityReady = false;
    render(<I18nextProvider i18n={testI18n}><CinematicStageContent activeStage="cast" project={project} onPrevious={vi.fn()} onNext={vi.fn()} /></I18nextProvider>);

    expect(screen.getAllByText('cinematic.cast.needsPreparation').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole('button', { name: /Alice/i })).toHaveClass('is-needs-preparation');
    expect(screen.getByRole('button', { name: 'cinematic.cast.continueToStoryPlan' })).toBeDisabled();
  });

  it('counts a selected Character as assigned while reporting identity preparation separately', () => {
    const project = castProjectFixture();
    project.setup.storyRoleSlots = [project.setup.storyRoleSlots[0]!];
    project.castAssignments[0]!.identityReady = false;
    render(<I18nextProvider i18n={testI18n}><CinematicStageContent activeStage="cast" project={project} onPrevious={vi.fn()} onNext={vi.fn()} /></I18nextProvider>);

    const progress = document.querySelector('.cinematic-role-readiness__progress');
    expect(progress?.querySelector('strong')).toHaveTextContent('1 cinematic.cast.of 1 cinematic.cast.requiredAssigned');
    expect(within(progress as HTMLElement).getByText('cinematic.cast.rolesNeedPreparation')).toBeVisible();
    expect(screen.getByRole('button', { name: 'cinematic.cast.continueToStoryPlan' })).toBeDisabled();
  });

  it('removes only the selected Project Cast Assignment after confirmation', async () => {
    const project = castProjectFixture();
    const onRemoveCastCharacter = vi.fn().mockResolvedValue({
      ...project,
      version: project.version + 1,
      castAssignments: []
    });
    render(
      <I18nextProvider i18n={testI18n}>
        <CinematicStageContent
          activeStage="cast"
          project={project}
          onPrevious={vi.fn()}
          onNext={vi.fn()}
          onRemoveCastCharacter={onRemoveCastCharacter}
        />
      </I18nextProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'cinematic.cast.removeAssignment' }));
    expect(screen.getByRole('alertdialog', { name: 'cinematic.cast.removeTitle' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.cast.removeConfirm' }));

    await waitFor(() => expect(onRemoveCastCharacter).toHaveBeenCalledWith('cast_alice'));
  });

  it('opens Scene Director from a story beat', () => {
    render(<I18nextProvider i18n={testI18n}><CinematicStageContent activeStage="story-plan" onPrevious={vi.fn()} onNext={vi.fn()} /></I18nextProvider>);
    fireEvent.click(screen.getByRole('button', { name: /cinematic\.story\.arrival.*cinematic\.storyboard\.shots/ }));
    const directorDialog = screen.getByRole('dialog', { name: 'cinematic.director.title' });
    expect(directorDialog).toBeVisible();
    expect(directorDialog).toHaveClass('cinematic-authoring-dialog');
    const duration = screen.getByRole('spinbutton', { name: 'cinematic.director.shotDuration' });
    expect(duration).toHaveValue(6);
    fireEvent.change(duration, { target: { value: '4.5' } });
    expect(duration).toHaveValue(4.5);
    fireEvent.click(screen.getByText('cinematic.director.advanced'));
    expect(screen.getByText('cinematic.director.continuity')).toBeVisible();
  });

  it('removes the prototype Credit amount from Story Plan and keeps approval distinct from draft save', () => {
    render(<I18nextProvider i18n={testI18n}><CinematicStageContent activeStage="story-plan" onPrevious={vi.fn()} onNext={vi.fn()} /></I18nextProvider>);
    expect(screen.getByText('cinematic.story.qualificationNotice')).toBeVisible();
    expect(screen.queryByText(/5 cinematic\.cost\.credits/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'cinematic.story.saveDraft' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'cinematic.story.approvePlan' })).toBeDisabled();
  });

  it('projects a legacy orphan Scene into a reviewable Beat without mutating the Project', () => {
    const project = legacyStoryPlanFixture();
    const original = structuredClone(project);
    expect(needsStoryPlanRecovery(project, project.storyPlanVersions[0])).toBe(true);
    expect(hasUsableApprovedStoryPlan(project)).toBe(false);

    render(<I18nextProvider i18n={testI18n}><CinematicStageContent activeStage="story-plan" project={project} onPrevious={vi.fn()} onNext={vi.fn()} /></I18nextProvider>);

    expect(screen.getByText('cinematic.story.legacyRecoveryTitle')).toBeVisible();
    expect(screen.getAllByText('20.0s')).toHaveLength(2);
    expect(screen.getAllByText('cinematic.story.durationRequired')).toHaveLength(4);
    expect(screen.getByRole('button', { name: 'cinematic.actions.next' })).toBeDisabled();
    fireEvent.click(screen.getAllByRole('button', { name: 'cinematic.story.openBeat' })[0]!);
    const beatDialog = screen.getByRole('dialog', { name: 'cinematic.beatDialog.title' });
    expect(beatDialog).toBeVisible();
    expect(beatDialog).toHaveClass('cinematic-authoring-dialog');
    expect(project).toEqual(original);
  });

  it('adds missing Scene structure from Beat details and extends the existing Scene Director Shot list', () => {
    const project = legacyStoryPlanFixture();
    render(<I18nextProvider i18n={testI18n}><CinematicStageContent activeStage="story-plan" project={project} onPrevious={vi.fn()} onNext={vi.fn()} /></I18nextProvider>);

    fireEvent.click(screen.getAllByRole('button', { name: 'cinematic.story.openBeat' })[1]!);
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.beatDialog.addScene' }));
    expect(screen.getByRole('button', { name: /cinematic\.story\.newSceneTitle/ })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: /cinematic\.story\.newSceneTitle/ }));
    expect(screen.getByRole('dialog', { name: 'cinematic.director.title' })).toBeVisible();
    expect(screen.getAllByRole('spinbutton')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.director.addShot' }));
    expect(screen.getAllByRole('spinbutton')).toHaveLength(2);
  });

  it('recognizes a structurally complete approved Plan and confirms before replacing approval', () => {
    const project = completeStoryPlanFixture();
    expect(needsStoryPlanRecovery(project, project.storyPlanVersions[0])).toBe(false);
    expect(hasUsableApprovedStoryPlan(project)).toBe(true);
    render(<I18nextProvider i18n={testI18n}><CinematicStageContent activeStage="story-plan" project={project} onPrevious={vi.fn()} onNext={vi.fn()} /></I18nextProvider>);
    expect(screen.getByText('cinematic.story.currentPlanReadyTitle')).toBeVisible();
    expect(screen.getByRole('button', { name: 'cinematic.actions.next' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.story.approvePlan' }));
    expect(screen.getByRole('alertdialog', { name: 'cinematic.story.approveTitle' })).toBeVisible();
  });

  it('blocks Storyboard and explains when a newer working Story Plan draft needs approval', () => {
    const project = completeStoryPlanFixture();
    project.storyPlanVersions.push({
      ...structuredClone(project.storyPlanVersions[0]!),
      id: 'cineplan_working_draft', version: 2, status: 'draft',
      parentVersionId: project.storyPlanVersions[0]!.id
    });

    render(<I18nextProvider i18n={testI18n}><CinematicStageContent activeStage="story-plan" project={project} onPrevious={vi.fn()} onNext={vi.fn()} /></I18nextProvider>);

    expect(screen.getByText('cinematic.story.currentDraftNeedsApprovalTitle')).toBeVisible();
    expect(screen.getByText('cinematic.story.currentDraftNeedsApprovalDescription')).toBeVisible();
    expect(screen.getByRole('button', { name: 'cinematic.actions.next' })).toBeDisabled();
  });

  it('persists an applied Story Plan proposal before exposing its generated Scene IDs', async () => {
    const project = completeStoryPlanFixture();
    const proposal = storyPlanProposalFixture(project);
    const savedProject = projectWithSavedProposal(project, proposal);
    const onProjectChanged = vi.fn();
    cinematicApiMocks.generateCinematicStoryPlan.mockResolvedValue(proposal);
    cinematicApiMocks.saveCinematicStoryPlan.mockResolvedValue(savedProject);

    render(<I18nextProvider i18n={testI18n}><CinematicStageContent activeStage="story-plan" project={project} onProjectChanged={onProjectChanged} onPrevious={vi.fn()} onNext={vi.fn()} /></I18nextProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.story.generate' }));
    expect(await screen.findByRole('dialog', { name: 'cinematic.story.proposalTitle' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.story.applyProposal' }));

    await waitFor(() => expect(cinematicApiMocks.saveCinematicStoryPlan).toHaveBeenCalledWith(
      project.id,
      expect.objectContaining({
        contractVersion: 'story-plan-v2', expectedVersion: project.version,
        approved: false, source: 'generated',
        scenes: expect.arrayContaining([expect.objectContaining({ id: 'scene_generated' })])
      })
    ));
    expect(onProjectChanged).toHaveBeenCalledWith(savedProject);
    expect(screen.queryByRole('dialog', { name: 'cinematic.story.proposalTitle' })).not.toBeInTheDocument();
  });

  it('opens the Story Plan proposal dialog in a loading state before AI generation completes', async () => {
    const project = completeStoryPlanFixture();
    const proposal = storyPlanProposalFixture(project);
    let resolveProposal: (value: CinematicStoryPlanProposal) => void = () => undefined;
    cinematicApiMocks.generateCinematicStoryPlan.mockReturnValue(new Promise<CinematicStoryPlanProposal>(resolve => {
      resolveProposal = resolve;
    }));

    render(<I18nextProvider i18n={testI18n}><CinematicStageContent activeStage="story-plan" project={project} onProjectChanged={vi.fn()} onPrevious={vi.fn()} onNext={vi.fn()} /></I18nextProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.story.generate' }));

    const dialog = screen.getByRole('dialog', { name: 'cinematic.story.proposalTitle' });
    expect(dialog).toBeVisible();
    expect(dialog).toHaveAttribute('aria-busy', 'true');
    expect(within(dialog).getByRole('status')).toHaveTextContent('cinematic.story.generating');
    expect(screen.queryByRole('button', { name: 'cinematic.story.applyProposal' })).not.toBeInTheDocument();

    resolveProposal(proposal);

    await waitFor(() => expect(dialog).toHaveAttribute('aria-busy', 'false'));
    expect(within(dialog).getByRole('button', { name: 'cinematic.story.applyProposal' })).toBeEnabled();
  });

  it('keeps the Story Plan proposal dialog open when AI generation fails', async () => {
    const project = completeStoryPlanFixture();
    cinematicApiMocks.generateCinematicStoryPlan.mockRejectedValue(new Error('provider unavailable'));

    render(<I18nextProvider i18n={testI18n}><CinematicStageContent activeStage="story-plan" project={project} onProjectChanged={vi.fn()} onPrevious={vi.fn()} onNext={vi.fn()} /></I18nextProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.story.generate' }));

    const dialog = screen.getByRole('dialog', { name: 'cinematic.story.proposalTitle' });
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('provider unavailable');
    expect(dialog).toBeVisible();
    const footer = dialog.querySelector('.cinematic-dialog__footer');
    expect(footer).not.toBeNull();
    expect(within(footer as HTMLElement).getByRole('button', { name: 'cinematic.actions.close' })).toBeEnabled();
  });

  it('keeps the Story Plan proposal open when persistence fails', async () => {
    const project = completeStoryPlanFixture();
    const proposal = storyPlanProposalFixture(project);
    cinematicApiMocks.generateCinematicStoryPlan.mockResolvedValue(proposal);
    cinematicApiMocks.saveCinematicStoryPlan.mockRejectedValue(new Error('version conflict'));

    render(<I18nextProvider i18n={testI18n}><CinematicStageContent activeStage="story-plan" project={project} onProjectChanged={vi.fn()} onPrevious={vi.fn()} onNext={vi.fn()} /></I18nextProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.story.generate' }));
    await screen.findByRole('dialog', { name: 'cinematic.story.proposalTitle' });
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.story.applyProposal' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('version conflict');
    expect(screen.getByRole('dialog', { name: 'cinematic.story.proposalTitle' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'cinematic.story.applyProposal' })).toBeEnabled();
  });

  it('persists an applied Scene Direction proposal through the Story Plan save contract', async () => {
    const project = completeStoryPlanFixture();
    const sceneProposal = sceneDirectionProposalFixture(project);
    const savedProject = projectWithSavedSceneProposal(project, sceneProposal);
    cinematicApiMocks.generateCinematicSceneDirection.mockResolvedValue(sceneProposal);
    cinematicApiMocks.saveCinematicStoryPlan.mockResolvedValue(savedProject);

    render(<I18nextProvider i18n={testI18n}><CinematicStageContent activeStage="story-plan" project={project} onProjectChanged={vi.fn()} onPrevious={vi.fn()} onNext={vi.fn()} /></I18nextProvider>);
    fireEvent.click(screen.getByRole('button', { name: /Scene 1.*cinematic\.storyboard\.shots/ }));
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.director.generate' }));
    expect(await screen.findByRole('dialog', { name: 'cinematic.director.proposalTitle' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.story.applyProposal' }));

    await waitFor(() => expect(cinematicApiMocks.saveCinematicStoryPlan).toHaveBeenCalledWith(
      project.id,
      expect.objectContaining({
        approved: false,
        scenes: expect.arrayContaining([expect.objectContaining({
          id: project.scenes[0]!.id,
          title: 'Generated Scene Direction'
        })])
      })
    ));
  });

  it('opens a Shot dialog and keeps Storyboard prompt editing resettable', () => {
    const project = completeStoryPlanFixture();
    const shot = project.scenes[0]!.shots[0]!;
    renderStoryboardWithQuery(project);
    fireEvent.click(screen.getByRole('button', { name: `cinematic.storyboard.editShot ${shot.id}` }));
    const prompt = screen.getByRole('textbox', { name: 'storyboard generation prompt' });
    fireEvent.change(prompt, { target: { value: 'changed prompt' } });
    expect(prompt).toHaveValue('changed prompt');
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.storyboard.reset' }));
    expect(prompt).not.toHaveValue('changed prompt');
  });

  it('routes Storyboard image work through the shared scoped Generation experience', () => {
    const project = completeStoryPlanFixture();
    const shot = project.scenes[0]!.shots[0]!;
    renderStoryboardWithQuery(project);
    fireEvent.click(screen.getByRole('button', { name: `cinematic.storyboard.editShot ${shot.id}` }));
    const generation = screen.getByTestId('storyboard-generation-experience');
    expect(generation.closest('.cinematic-storyboard-shot-dialog__generation')).not.toBeNull();
    expect(generation).toHaveAttribute('data-surface', 'cinematic');
    expect(generation).toHaveAttribute('data-mode', 'scene');
    expect(generation).toHaveAttribute('data-aspect-ratio', project.aspectRatio);
    expect(generation).toHaveAttribute('data-persistence-scope', `${project.id}:${shot.id}`);
    const approval = screen.getByRole('button', { name: 'cinematic.storyboard.approveGeneratedSource' });
    expect(approval).toHaveClass('cinematic-storyboard-approval-callout__action');
    expect(screen.getByText('cinematic.storyboard.approvalDescription')).toBeVisible();
  });

  it('compiles a saved Shot prompt with current Scene emotion instead of bypassing Storyboard authority', () => {
    const project = completeStoryPlanFixture();
    const shot = project.scenes[0]!.shots[0]!;
    shot.prompt = 'Keep the phone at chest level.';
    project.scenes[0]!.emotionalStart = 'Tense and watchful';
    project.scenes[0]!.emotionalEnd = 'Apprehensive';
    renderStoryboardWithQuery(project);

    fireEvent.click(screen.getByRole('button', { name: `cinematic.storyboard.editShot ${shot.id}` }));
    const prompt = screen.getByRole('textbox', { name: 'storyboard generation prompt' });
    const value = (prompt as HTMLTextAreaElement).value;
    expect(value).toContain('STORYBOARD STILL CONTRACT');
    expect(value).toContain('Selected Shot emotional target: Apprehensive');
    expect(value).toContain('Keep the phone at chest level.');
  });

  it('keeps the video engine in Produce and estimates only the eligible set', () => {
    render(<I18nextProvider i18n={testI18n}><CinematicStageContent activeStage="produce" onPrevious={vi.fn()} onNext={vi.fn()} /></I18nextProvider>);
    const dock = screen.getByTestId('cinematic-operation-dock');
    expect(within(dock).queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveValue('cinematic.produce.promptFixture');
    expect(dock.closest('.cinematic-sticky-generation-panel')).not.toBeNull();
    expect(within(dock).getAllByRole('combobox')).toHaveLength(4);
    fireEvent.click(within(dock).getByRole('button', { name: 'cinematic.generation.eligibleSet' }));
    expect(within(dock).getByText(/126 cinematic\.cost\.credits/)).toBeVisible();
    expect(within(dock).getByText('cinematic.generation.eligibleSummary')).toBeVisible();
    expect(screen.getByRole('region', { name: 'cinematic.results.videoLabel' })).toBeVisible();
  });

  it('shows reconciled Scene and Shot durations in a left-to-right sequence board', () => {
    const { container } = render(<I18nextProvider i18n={testI18n}><CinematicStageContent activeStage="storyboard" onPrevious={vi.fn()} onNext={vi.fn()} /></I18nextProvider>);
    const board = screen.getByRole('region', { name: 'cinematic.storyboard.boardLabel' });
    expect(within(board).getByText(/12\.5s/)).toBeVisible();
    expect(within(board).getAllByText('3.5s')).toHaveLength(2);
    expect(within(board).getByText('2.5s')).toBeVisible();
    expect([...container.querySelectorAll('[data-shot-id]')].map(item => item.getAttribute('data-shot-id'))).toEqual(['01A', '01B', '01C', '01D']);
    expect(screen.getByRole('button', { name: 'cinematic.storyboard.generateSet' })).toBeDisabled();
  });

  it('enables Generate all for a persisted Project with pending Storyboard Shots', () => {
    const project = completeStoryPlanFixture();
    renderStoryboardWithQuery(project);
    expect(screen.getByRole('button', { name: 'cinematic.storyboard.generateSet' })).toBeEnabled();
  });

  it('restores a completed batch preview and resumes that Job inside the Shot dialog', () => {
    const project = completeStoryPlanFixture();
    const shot = project.scenes[0]!.shots[0]!;
    project.generationAttempts = [{
      id: 'attempt_batch', operation: 'cinematic_storyboard_still',
      sceneId: project.scenes[0]!.id, shotId: shot.id,
      generationJobId: 'job_batch_preview', status: 'completed', reviewDecision: 'pending'
    }];
    renderStoryboardWithQuery(project);
    expect(document.querySelector(`img[src="/outputs/job_batch_preview.jpg"]`)).not.toBeNull();
    expect(screen.getByText('cinematic.storyboard.status.review')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: `cinematic.storyboard.editShot ${shot.id}` }));
    expect(screen.getByTestId('storyboard-generation-experience'))
      .toHaveAttribute('data-resume-job-id', 'job_batch_preview');
  });
});

function renderStoryboardWithQuery(project: CinematicProject) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}><I18nextProvider i18n={testI18n}>
    <CinematicStageContent activeStage="storyboard" project={project} onPrevious={vi.fn()} onNext={vi.fn()} />
  </I18nextProvider></QueryClientProvider>);
}

function castProjectFixture() {
  return {
    id: 'cineproj_cast',
    projectId: 'cineproj_cast',
    version: 2,
    aspectRatio: '9:16',
    setup: {
      castPlanningMode: 'ai-recommended',
      storyRoleSlots: [
        { id: 'role_lead', label: 'Lead', importance: 'required', storyFunction: 'Drives the final decision', relationshipHint: '' },
        { id: 'role_second', label: 'Second Character', importance: 'required', storyFunction: 'Forces the Lead to decide', relationshipHint: '' }
      ]
    },
    castAssignments: [{
      id: 'cast_alice', characterProfileId: 'char_alice', characterProfileVersionId: 'charver_alice',
      displayName: 'Alice', portraitUrl: null, storyRole: 'Lead', storyRoleSlotId: 'role_lead',
      storyImportance: 'protagonist', objective: 'Reach the platform', motivation: '', pressure: '',
      personalityTraits: ['patient'], emotionalBaseline: 'guarded', dialogueStyle: '',
      performanceDirection: 'Measured approach', identityReady: true, apparentAgeRange: null,
      looks: [], active: true, updatedAt: new Date(0).toISOString()
    }],
    scenes: []
  } as unknown as CinematicProject;
}

function legacyStoryPlanFixture() {
  const project = {
    ...castProjectFixture(),
    id: 'cineproj_legacy_story', projectId: 'cineproj_legacy_story', version: 4,
    durationTargetMs: 20_000, activeStorySourceVersionId: 'story_source_1',
    setup: {
      ...castProjectFixture().setup,
      storyBrief: 'A woman chooses to leave the platform.',
      storyRoleSlots: [{ id: 'role_lead', label: 'Lead', importance: 'required', storyFunction: 'Makes the choice', relationshipHint: '' }]
    },
    storyPlanVersions: [{
      id: 'cineplan_legacy', version: 1, parentVersionId: null, storySourceVersionId: 'story_source_1',
      objective: 'Choose a new direction', logline: 'A final train approaches.', emotionalArc: '',
      beats: ['Arrival', 'Recognition', 'Choice', 'Reveal', 'Resolution'].map((title, index) => ({
        id: title.toLowerCase(), orderKey: index + 1, type: 'development', title,
        purpose: '', storyChange: '', emotionalStart: '', emotionalEnd: '', targetDurationMs: 0, sceneIds: []
      })),
      sceneIds: ['scene_legacy'], estimatedDurationMs: 20_000, estimatedShotCount: 1,
      warnings: [], source: 'manual', status: 'approved', contractVersion: 'legacy', createdAt: new Date(0).toISOString()
    }],
    activeStoryPlanVersionId: 'cineplan_legacy',
    scenes: [{
      id: 'scene_legacy', version: 1, orderKey: 1, beatId: '', title: 'Scene 1', purpose: '', storyChange: '',
      location: '', time: '', emotionalStart: '', emotionalEnd: '', transitionIntent: 'cut',
      castAssignmentIds: ['cast_alice'], wardrobeLookIds: [], blocking: '', lighting: '', performance: '',
      audioIntent: '', continuityNotes: [], durationMs: 20_000, shotOrder: ['shot_legacy'],
      shots: [{
        id: 'shot_legacy', version: 1, orderKey: 1, title: 'Shot 1', purpose: '', durationMs: 20_000,
        framing: 'medium shot', cameraAngle: 'eye level', cameraMovement: 'locked camera', lensIntent: '',
        blocking: '', performance: '', gaze: '', lighting: '', environment: '', audioIntent: '', prompt: '',
        castAssignmentIds: ['cast_alice'], wardrobeLookIds: [], continuityNotes: [], storyboardStatus: 'draft'
      }]
    }]
  } as unknown as CinematicProject;
  return project;
}

function completeStoryPlanFixture() {
  const project = legacyStoryPlanFixture();
  const beat = {
    ...project.storyPlanVersions[0]!.beats[0]!,
    purpose: 'Force the final choice', storyChange: 'Waiting becomes forward motion',
    targetDurationMs: 20_000, sceneIds: ['scene_legacy']
  };
  project.storyPlanVersions[0] = {
    ...project.storyPlanVersions[0]!, contractVersion: 'story-plan-v2', beats: [beat]
  };
  project.scenes[0] = {
    ...project.scenes[0]!, beatId: beat.id, purpose: 'Show the decision',
    storyChange: 'She walks toward the exit',
    shots: [{ ...project.scenes[0]!.shots[0]!, purpose: 'Reveal the choice through movement' }]
  };
  return project;
}

function storyPlanProposalFixture(project: CinematicProject): CinematicStoryPlanProposal {
  const beat = {
    ...project.storyPlanVersions[0]!.beats[0]!,
    id: 'beat_generated', title: 'Generated Beat', sceneIds: ['scene_generated'],
    purpose: 'Build the choice', storyChange: 'Waiting becomes action', targetDurationMs: 20_000
  };
  const shot = {
    ...project.scenes[0]!.shots[0]!,
    id: 'shot_generated', title: 'Generated Shot', purpose: 'Reveal the choice'
  };
  const scene = {
    ...project.scenes[0]!,
    id: 'scene_generated', beatId: beat.id, title: 'Generated Scene',
    purpose: 'Show the choice', storyChange: 'She leaves the platform',
    shots: [shot], shotOrder: [shot.id]
  };
  return {
    proposalId: 'proposal_generated', operation: 'cinematic_story_plan_generate',
    expectedProjectVersion: project.version,
    storySourceVersionId: project.activeStorySourceVersionId!,
    plan: {
      objective: 'Choose hope', logline: 'A final train forces a choice.',
      emotionalArc: 'Uncertain to hopeful', beats: [beat], scenes: [scene],
      warnings: [], source: 'generated', approved: false
    },
    provenance: {
      provider: 'openai', model: 'test-model', responseId: 'response_plan',
      recipeId: 'cinematic-story-plan-generate', recipeVersion: 1, recipeFingerprint: 'recipe-plan'
    },
    billingStatus: 'qualification_no_charge'
  };
}

function projectWithSavedProposal(
  project: CinematicProject,
  proposal: CinematicStoryPlanProposal
): CinematicProject {
  const saved = structuredClone(project);
  saved.version += 1;
  saved.scenes = structuredClone(proposal.plan.scenes);
  saved.storyPlanVersions.push({
    ...saved.storyPlanVersions[0]!,
    id: 'cineplan_generated_draft', version: saved.storyPlanVersions.length + 1,
    beats: structuredClone(proposal.plan.beats), sceneIds: proposal.plan.scenes.map(scene => scene.id),
    source: 'generated', status: 'draft', contractVersion: 'story-plan-v2'
  });
  return saved;
}

function sceneDirectionProposalFixture(project: CinematicProject): CinematicSceneDirectionProposal {
  const scene = {
    ...project.scenes[0]!, title: 'Generated Scene Direction',
    purpose: 'Refine the final choice', storyChange: 'She commits to leaving'
  };
  return {
    proposalId: 'proposal_scene', operation: 'cinematic_scene_direction_generate',
    expectedProjectVersion: project.version,
    storySourceVersionId: project.activeStorySourceVersionId!,
    sceneId: scene.id, scene, warnings: [],
    provenance: {
      provider: 'openai', model: 'test-model', responseId: 'response_scene',
      recipeId: 'cinematic-scene-direction-generate', recipeVersion: 1, recipeFingerprint: 'recipe-scene'
    },
    billingStatus: 'qualification_no_charge'
  };
}

function projectWithSavedSceneProposal(
  project: CinematicProject,
  proposal: CinematicSceneDirectionProposal
): CinematicProject {
  const saved = structuredClone(project);
  saved.version += 1;
  saved.scenes = [structuredClone(proposal.scene)];
  saved.storyPlanVersions.push({
    ...saved.storyPlanVersions[0]!,
    id: 'cineplan_scene_draft', version: saved.storyPlanVersions.length + 1,
    sceneIds: [proposal.scene.id], source: 'generated', status: 'draft',
    contractVersion: 'story-plan-v2'
  });
  return saved;
}

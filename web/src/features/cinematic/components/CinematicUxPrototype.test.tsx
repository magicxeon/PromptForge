import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { useState, type ReactNode } from 'react';
import {
  castDirectionFromRole, cinematicCastPortraitUrl, CinematicStageContent,
  currentSceneCastAssignments, hasUsableApprovedStoryPlan, needsStoryPlanRecovery
} from './CinematicStageContent';
import { CinematicStageRail } from './CinematicStageRail';
import {
  characterCandidateMediaUrl,
  formatFacetLabel,
  overlapsAgeBucket,
  SceneDirectionProposalDialog,
  SceneDirectorDialog
} from './CinematicDialogs';
import type {
  CinematicProject, CinematicSceneDirectionProposal, CinematicStoryPlanProposal
} from '../schemas/cinematicSchemas';
import { ApiError } from '../../../lib/api/apiError';

const cinematicApiMocks = vi.hoisted(() => ({
  generateCinematicStoryPlan: vi.fn(),
  generateCinematicSceneDirection: vi.fn(),
  saveCinematicStoryPlan: vi.fn(),
  getCinematicStoryboardGenerationContext: vi.fn(),
  approveCinematicStoryboardSource: vi.fn(),
  upsertCinematicWardrobeLook: vi.fn(),
  getCinematicProject: vi.fn()
}));
const profileApiMocks = vi.hoisted(() => ({
  listOwnedCharacters: vi.fn(),
  listCharacters: vi.fn(),
  listCharacterLooks: vi.fn(),
  retireCharacterLook: vi.fn()
}));

vi.mock('../api/cinematicApi', async importOriginal => ({
  ...await importOriginal<typeof import('../api/cinematicApi')>(),
  ...cinematicApiMocks
}));

vi.mock('../../profiles/api/profileApi', async importOriginal => ({
  ...await importOriginal<typeof import('../../profiles/api/profileApi')>(),
  ...profileApiMocks
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
    onPromptChange?: (value: string) => void;
    fixedAspectRatio?: string | null;
    enginePresentation?: string;
    persistenceScope?: string;
    resumeJobId?: string | null;
    readOnlyPromptSupplement?: ReactNode;
    renderResultActions?: (job: { id: string; status: string }) => ReactNode;
  }) => <section
    data-testid="storyboard-generation-experience"
    data-surface={props.surface}
    data-mode={props.generationMode}
    data-aspect-ratio={props.fixedAspectRatio}
    data-engine-presentation={props.enginePresentation || 'default'}
    data-persistence-scope={props.persistenceScope}
    data-resume-job-id={props.resumeJobId || ''}
  ><textarea aria-label="storyboard generation prompt" value={props.prompt} readOnly={!props.onPromptChange} onChange={event => props.onPromptChange?.(event.target.value)} />{props.readOnlyPromptSupplement}{props.renderResultActions?.({ id: 'job_storyboard_test', status: 'completed' })}</section>
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
    cinematicApiMocks.upsertCinematicWardrobeLook.mockReset();
    cinematicApiMocks.getCinematicProject.mockReset();
    profileApiMocks.listOwnedCharacters.mockReset();
    profileApiMocks.listCharacters.mockReset();
    profileApiMocks.listCharacterLooks.mockReset();
    profileApiMocks.retireCharacterLook.mockReset();
    profileApiMocks.listOwnedCharacters.mockResolvedValue({ items: [], nextCursor: null, hasMore: false });
    profileApiMocks.listCharacters.mockResolvedValue({ items: [], nextCursor: null, hasMore: false });
    profileApiMocks.listCharacterLooks.mockResolvedValue({ items: [] });
    cinematicApiMocks.getCinematicStoryboardGenerationContext.mockResolvedValue({
      schemaVersion: 1,
      projectId: 'cineproj_legacy_story', projectVersion: 4,
      sceneId: 'scene_legacy', shotId: 'shot_legacy', shotVersion: 1,
      characterProfileContext: null,
      references: { outfit_front: null, outfit_back: null, style_reference: null },
      cast: [], looks: [], continuitySource: null,
      keyframeContract: {
        sourceFingerprint: 'keyframe_fixture',
        providerIndependentPrompt: 'STORYBOARD KEYFRAME CONTRACT cinematic-storyboard-keyframe-v1\n\nKEYFRAME MOMENT:\nA restrained opening frame.'
      },
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
    const dossierHeader = document.querySelector('.cinematic-dossier-header') as HTMLElement;
    expect(within(dossierHeader).getByText('cinematic.cast.selectedFromProjectCast')).toBeVisible();
    expect(dossierHeader.querySelector('.cinematic-cast-card__portrait')).not.toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    expect(screen.getByRole('tab', { name: 'cinematic.cast.tab.direction' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByText('cinematic.cast.uploadForCharacter')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'cinematic.cast.tab.wardrobe' }));
    expect(screen.queryByRole('button', { name: 'cinematic.cast.addLook' })).not.toBeInTheDocument();
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

  it('separates existing Looks from the two new-Look source commands without changing their dialog modes', () => {
    const project = castProjectFixture();
    render(<I18nextProvider i18n={testI18n}><CinematicStageContent activeStage="cast" project={project} onPrevious={vi.fn()} onNext={vi.fn()} /></I18nextProvider>);

    fireEvent.click(screen.getByRole('tab', { name: 'cinematic.cast.tab.wardrobe' }));
    expect(screen.getByLabelText('cinematic.cast.currentLooks')).toBeVisible();
    const sourceGroup = screen.getByRole('group', { name: /cinematic\.cast\.startNewLook/ });
    const lookPreparation = screen.getByLabelText('cinematic.cast.currentLooks');
    const boundLook = screen.getByLabelText('cinematic.cast.lookUsedInFilm');
    expect(sourceGroup.compareDocumentPosition(lookPreparation) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(lookPreparation.compareDocumentPosition(boundLook) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const upload = within(sourceGroup).getByRole('button', { name: /cinematic\.cast\.uploadWardrobe/ });
    const ai = within(sourceGroup).getByRole('button', { name: /cinematic\.cast\.aiWardrobe/ });
    expect(upload.closest('.cinematic-look-card')).toBeNull();
    expect(ai.closest('.cinematic-look-card')).toBeNull();

    fireEvent.click(upload);
    expect(screen.getByRole('radio', { name: 'cinematic.lookDraft.uploadWardrobe' })).toHaveAttribute('aria-checked', 'true');
    const lookDialog = screen.getByRole('dialog', { name: 'cinematic.lookDraft.title' });
    const cancelAction = within(lookDialog)
      .getAllByRole('button', { name: 'cinematic.actions.cancel' })
      .find((button) => button.textContent === 'cinematic.actions.cancel');
    expect(cancelAction).toBeDefined();
    fireEvent.click(cancelAction!);
    fireEvent.click(ai);
    expect(screen.getByRole('radio', { name: 'cinematic.lookDraft.aiSuggestion' })).toHaveAttribute('aria-checked', 'true');
  });

  it('removes only a confirmed unapproved Look preparation and keeps approved Looks protected', async () => {
    const project = castProjectFixture();
    const draftLook = {
      id: 'charlook_wrong', characterProfileId: project.castAssignments[0]!.characterProfileId,
      sourceCharacterProfileVersionId: project.castAssignments[0]!.characterProfileVersionId,
      name: 'Incorrect Look', description: '', tags: [], official: true, visibility: 'private',
      lifecycleStatus: 'draft', activeVersionId: 'charlookver_wrong', approvedVersionId: null,
      versions: [], createdAt: '2026-08-31T00:00:00.000Z', updatedAt: '2026-08-31T00:00:00.000Z',
      retiredAt: null
    };
    const approvedLook = {
      ...draftLook, id: 'charlook_approved', name: 'Approved Look', lifecycleStatus: 'approved',
      activeVersionId: 'charlookver_approved', approvedVersionId: 'charlookver_approved'
    };
    profileApiMocks.listCharacterLooks.mockResolvedValue({ items: [draftLook, approvedLook] });
    profileApiMocks.retireCharacterLook.mockResolvedValue({
      ...draftLook, lifecycleStatus: 'retired', retiredAt: '2026-08-31T01:00:00.000Z'
    });
    render(<I18nextProvider i18n={testI18n}><CinematicStageContent activeStage="cast" project={project} onPrevious={vi.fn()} onNext={vi.fn()} /></I18nextProvider>);

    fireEvent.click(screen.getByRole('tab', { name: 'cinematic.cast.tab.wardrobe' }));
    expect(await screen.findByText('Incorrect Look')).toBeVisible();
    expect(screen.getByText('Approved Look')).toBeVisible();
    expect(screen.getAllByRole('button', { name: 'cinematic.cast.removeLookPreparation' })).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'cinematic.cast.removeLookPreparation' }));
    expect(screen.getByRole('alertdialog', { name: 'cinematic.cast.removeLookTitle' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'ui.action.cancel' }));
    expect(screen.getByText('Incorrect Look')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'cinematic.cast.removeLookPreparation' }));
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.cast.removeLookConfirm' }));
    await waitFor(() => expect(screen.queryByText('Incorrect Look')).not.toBeInTheDocument());
    expect(screen.getByText('Approved Look')).toBeVisible();
    expect(profileApiMocks.retireCharacterLook).toHaveBeenCalledWith(
      project.castAssignments[0]!.characterProfileId,
      'charlook_wrong'
    );
  });

  it('refreshes a stale Cinematic Project and retries only the approved Look binding', async () => {
    const project = castProjectFixture();
    const approvedLook = approvedCharacterLookFixture(project);
    const latest = structuredClone(project);
    latest.version += 1;
    const saved = structuredClone(latest);
    saved.version += 1;
    saved.castAssignments[0]!.looks.push({
      id: `cinelook_${approvedLook.id}`, name: approvedLook.name, mode: 'character_look',
      characterLookId: approvedLook.id, characterLookVersionId: approvedLook.approvedVersionId,
      coverage: 'multi_view', locked: true, assetIds: ['ast_sheet']
    });
    profileApiMocks.listCharacterLooks.mockResolvedValue({ items: [approvedLook] });
    cinematicApiMocks.upsertCinematicWardrobeLook
      .mockRejectedValueOnce(new ApiError({
        status: 409, code: 'cinematic_version_conflict',
        message: 'The Project changed in another session.'
      }))
      .mockResolvedValueOnce(saved);
    cinematicApiMocks.getCinematicProject.mockResolvedValue(latest);
    const onProjectChanged = vi.fn();
    render(<I18nextProvider i18n={testI18n}><CinematicStageContent activeStage="cast" project={project} onProjectChanged={onProjectChanged} onPrevious={vi.fn()} onNext={vi.fn()} /></I18nextProvider>);

    fireEvent.click(screen.getByRole('tab', { name: 'cinematic.cast.tab.wardrobe' }));
    expect(await screen.findByText(approvedLook.name)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.cast.useLook' }));

    await waitFor(() => expect(cinematicApiMocks.upsertCinematicWardrobeLook).toHaveBeenCalledTimes(2));
    expect(cinematicApiMocks.getCinematicProject).toHaveBeenCalledWith(project.id);
    expect(cinematicApiMocks.upsertCinematicWardrobeLook.mock.calls[0]?.[3]).toEqual(expect.objectContaining({ expectedVersion: project.version }));
    expect(cinematicApiMocks.upsertCinematicWardrobeLook.mock.calls[1]?.[3]).toEqual(expect.objectContaining({ expectedVersion: latest.version }));
    expect(onProjectChanged).toHaveBeenLastCalledWith(saved);
  });

  it('keeps an approved Look reusable and exposes bind-only retry after a film bind failure', async () => {
    const project = castProjectFixture();
    const approvedLook = approvedCharacterLookFixture(project);
    profileApiMocks.listCharacterLooks.mockResolvedValue({ items: [approvedLook] });
    cinematicApiMocks.upsertCinematicWardrobeLook.mockRejectedValue(new Error('Storage is temporarily busy.'));
    render(<I18nextProvider i18n={testI18n}><CinematicStageContent activeStage="cast" project={project} onPrevious={vi.fn()} onNext={vi.fn()} /></I18nextProvider>);

    fireEvent.click(screen.getByRole('tab', { name: 'cinematic.cast.tab.wardrobe' }));
    expect(await screen.findByText(approvedLook.name)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.cast.useLook' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('cinematic.cast.lookApprovedBindFailed');
    expect(screen.getByRole('button', { name: 'cinematic.cast.retryUseLook' })).toBeEnabled();
    expect(profileApiMocks.retireCharacterLook).not.toHaveBeenCalled();
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

  it('requires an approved multi-view Look before a required role can continue', () => {
    const project = castProjectFixture();
    project.setup.storyRoleSlots = [project.setup.storyRoleSlots[0]!];
    render(<I18nextProvider i18n={testI18n}><CinematicStageContent activeStage="cast" project={project} onPrevious={vi.fn()} onNext={vi.fn()} /></I18nextProvider>);

    expect(screen.getAllByText('cinematic.cast.lookPreparationRequired').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'cinematic.cast.continueToStoryPlan' })).toBeDisabled();
  });

  it('enables Story Plan only after the required Character has a locked approved Look binding', () => {
    const project = castProjectFixture();
    project.setup.storyRoleSlots = [project.setup.storyRoleSlots[0]!];
    project.castAssignments[0]!.looks = [{
      id: 'cinelook_station', name: 'Station Look', mode: 'character_look',
      characterLookId: 'charlook_station', characterLookVersionId: 'charlookver_station_1',
      coverage: 'multi_view', locked: true, assetIds: ['ast_front', 'ast_side', 'ast_back']
    }];
    render(<I18nextProvider i18n={testI18n}><CinematicStageContent activeStage="cast" project={project} onPrevious={vi.fn()} onNext={vi.fn()} /></I18nextProvider>);

    expect(screen.getAllByText('cinematic.cast.requiredCastReady').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'cinematic.cast.continueToStoryPlan' })).toBeEnabled();
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

  it('keeps referenced Cast removal unavailable and exposes Character replacement', () => {
    const project = castProjectFixture();
    project.setup.storyRoleSlots = [project.setup.storyRoleSlots[0]!];
    project.scenes = [{
      id: 'scene_cast_usage', version: 1, orderKey: 1, beatId: '', title: 'Platform', purpose: '', storyChange: '',
      location: '', time: '', emotionalStart: '', emotionalEnd: '', transitionIntent: 'cut',
      castAssignmentIds: ['cast_alice'], wardrobeLookIds: [], blocking: '', lighting: '', performance: '',
      audioIntent: '', continuityNotes: [], durationMs: 2_000, shotOrder: ['shot_cast_usage'],
      shots: [{
        id: 'shot_cast_usage', version: 1, orderKey: 1, title: 'Wait', purpose: '', durationMs: 2_000,
        framing: '', cameraAngle: '', cameraMovement: '', lensIntent: '', blocking: '', performance: '', gaze: '',
        lighting: '', environment: '', audioIntent: '', prompt: '', castAssignmentIds: ['cast_alice'],
        wardrobeLookIds: [], continuityNotes: [], storyboardStatus: 'approved'
      }]
    }];
    render(<I18nextProvider i18n={testI18n}><CinematicStageContent activeStage="cast" project={project} onPrevious={vi.fn()} onNext={vi.fn()} /></I18nextProvider>);

    expect(screen.getByRole('button', { name: 'cinematic.cast.removeAssignment' })).toBeDisabled();
    expect(screen.getByText('cinematic.cast.assignmentInUse')).toBeVisible();
    expect(screen.getAllByRole('button', { name: 'cinematic.cast.changeCharacter' }).length).toBeGreaterThanOrEqual(1);
  });

  it('reuses the existing Assignment ID when replacing a Character', async () => {
    const project = castProjectFixture();
    project.setup.storyRoleSlots = [project.setup.storyRoleSlots[0]!];
    profileApiMocks.listOwnedCharacters.mockResolvedValue({
      items: [{
        id: 'char_nara', displayName: 'Nara', personalitySummary: 'Observant',
        characterProfileVersionId: 'charver_nara', handoffAvailable: true
      }],
      nextCursor: null,
      hasMore: false
    });
    const onAddCastCharacter = vi.fn().mockResolvedValue(project);
    render(<I18nextProvider i18n={testI18n}><CinematicStageContent
      activeStage="cast" project={project} onPrevious={vi.fn()} onNext={vi.fn()}
      onAddCastCharacter={onAddCastCharacter}
    /></I18nextProvider>);

    fireEvent.click(screen.getAllByRole('button', { name: 'cinematic.cast.changeCharacter' })[0]!);
    fireEvent.click(await screen.findByRole('option', { name: /Nara/ }));
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.picker.use' }));

    await waitFor(() => expect(onAddCastCharacter).toHaveBeenCalledWith(expect.objectContaining({
      assignmentId: 'cast_alice',
      characterProfileId: 'char_nara',
      characterProfileVersionId: 'charver_nara',
      storyRole: 'Lead',
      storyRoleSlotId: 'role_lead'
    })));
  });

  it('opens Scene Director from a story beat', () => {
    render(<I18nextProvider i18n={testI18n}><CinematicStageContent activeStage="story-plan" onPrevious={vi.fn()} onNext={vi.fn()} /></I18nextProvider>);
    fireEvent.click(screen.getByRole('button', { name: /cinematic\.story\.arrival.*cinematic\.storyboard\.shots/ }));
    const directorDialog = screen.getByRole('dialog', { name: 'cinematic.director.title' });
    expect(directorDialog).toBeVisible();
    expect(directorDialog).toHaveClass('cinematic-authoring-dialog');
    expect(screen.getByRole('button', { name: 'cinematic.mode.simple' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText('cinematic.director.continuity')).not.toBeInTheDocument();
    expect(screen.queryByText('cinematic.director.coverageRole')).not.toBeInTheDocument();
    const duration = screen.getByRole('spinbutton', { name: 'cinematic.director.shotDuration' });
    expect(duration).toHaveValue(6);
    fireEvent.change(duration, { target: { value: '4.5' } });
    expect(duration).toHaveValue(4.5);
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.mode.advanced' }));
    expect(screen.getByText('cinematic.director.continuity')).toBeVisible();
    fireEvent.click(screen.getByText('cinematic.director.shotAdvanced'));
    expect(screen.getByText('cinematic.director.coverageRole')).toBeVisible();
  });

  it('preserves Advanced Scene authority while switching through Simple mode', () => {
    const scene = structuredClone(completeStoryPlanFixture().scenes[0]!);
    function ControlledDirector() {
      const [mode, setMode] = useState<'simple' | 'advanced'>('advanced');
      return <SceneDirectorDialog open onOpenChange={vi.fn()} scene={scene} defaultMode={mode} onModeChange={setMode} onSave={vi.fn()} />;
    }
    render(<I18nextProvider i18n={testI18n}><ControlledDirector /></I18nextProvider>);
    const lighting = screen.getByRole('textbox', { name: 'cinematic.director.lighting' });
    fireEvent.change(lighting, { target: { value: 'Rainy blue hour with one warm counter practical.' } });

    fireEvent.click(screen.getByRole('button', { name: 'cinematic.mode.simple' }));
    expect(screen.queryByRole('textbox', { name: 'cinematic.director.lighting' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.mode.advanced' }));
    expect(screen.getByRole('textbox', { name: 'cinematic.director.lighting' })).toHaveValue('Rainy blue hour with one warm counter practical.');
  });

  it('submits only visible Simple edits and leaves hidden completion to the server contract', () => {
    const scene = structuredClone(completeStoryPlanFixture().scenes[0]!);
    Object.assign(scene, {
      location: 'Family cafe', time: 'Rainy blue hour', emotionalEnd: 'quiet resolve',
      purpose: '', entryState: '', emotionalStart: '', blocking: '', transitionIntent: ''
    });
    Object.assign(scene.shots[0]!, {
      purpose: '', performanceCue: '', continuityEntry: '', continuityExit: '', transitionToNext: ''
    });
    const onSave = vi.fn();

    render(<I18nextProvider i18n={testI18n}><SceneDirectorDialog open onOpenChange={vi.fn()} scene={scene} defaultMode="simple" onSave={onSave} /></I18nextProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.director.save' }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      purpose: '', entryState: '', emotionalStart: '', transitionIntent: '',
      castAssignmentIds: ['cast_alice']
    }));
    expect(onSave.mock.calls[0]?.[0].shots[0]).toEqual(expect.objectContaining({
      purpose: '', performanceCue: '', continuityEntry: '', continuityExit: '',
      castAssignmentIds: ['cast_alice']
    }));
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

  it('projects one current Scene Cast card when a legacy role points to the same Character', () => {
    const project = completeStoryPlanFixture();
    const current = project.castAssignments[0]!;
    project.castAssignments.unshift({
      ...structuredClone(current),
      id: 'cast_obsolete_role',
      storyRole: 'Young Woman',
      storyRoleSlotId: 'role_obsolete'
    });

    expect(currentSceneCastAssignments(project).map(assignment => assignment.id)).toEqual([current.id]);
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
        contractVersion: 'story-plan-v3', expectedVersion: project.version,
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
    expect(within(dialog).getByText('cinematic.story.workflowStage.source_preflight')).toBeVisible();
    expect(within(dialog).getByText('cinematic.story.workflowStage.plan_generation')).toBeVisible();
    expect(within(dialog).getByText('cinematic.story.workflowStage.director_review')).toBeVisible();
    expect(within(dialog).getByText('cinematic.story.workflowStage.visual_validation')).toBeVisible();
    expect(within(dialog).getByText('cinematic.story.workflowStage.visual_repair')).toBeVisible();
    expect(within(dialog).getByText('cinematic.story.workflowStage.storyboard_readiness')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'cinematic.story.applyProposal' })).not.toBeInTheDocument();

    resolveProposal(proposal);

    await waitFor(() => expect(dialog).toHaveAttribute('aria-busy', 'false'));
    expect(within(dialog).getByRole('button', { name: 'cinematic.story.applyProposal' })).toBeEnabled();
  });

  it('resolves a blocked Story source before dispatching a corrected Story Plan request', async () => {
    const project = completeStoryPlanFixture();
    const proposal = storyPlanProposalFixture(project);
    const blocked: CinematicStoryPlanProposal = {
      ...proposal,
      status: 'blocked',
      plan: null,
      filmReadiness: null,
      scriptPreview: [],
      provenance: null,
      workflow: {
        contractVersion: 'cinematic-story-plan-workflow-v1', status: 'blocked',
        stages: [
          { id: 'source_preflight', status: 'blocked', issueCount: 1, repairCount: 0 },
          { id: 'plan_generation', status: 'queued', issueCount: 0, repairCount: 0 },
          { id: 'director_review', status: 'queued', issueCount: 0, repairCount: 0 },
          { id: 'visual_validation', status: 'queued', issueCount: 0, repairCount: 0 },
          { id: 'visual_repair', status: 'queued', issueCount: 0, repairCount: 0 },
          { id: 'storyboard_readiness', status: 'queued', issueCount: 0, repairCount: 0 }
        ],
        repairRoundCount: 0, initialFindings: [], repairs: [], repairRounds: [], remainingFindings: []
      },
      preflight: {
        status: 'blocked', sourceResolution: null,
        resolvedStoryBrief: project.setup.storyBrief, resolvedCreativeDirection: project.setup.creativeDirection,
        storyLocations: ['station'], directionLocations: ['cafe'],
        diagnostics: [{
          code: 'story_source_location_conflict', severity: 'blocking', fieldPath: 'setup.storyBrief',
          comparedPath: 'setup.creativeDirection', summary: 'Station and cafe conflict.',
          recoveryAction: 'Choose the authoritative source.', autoFixAvailable: true,
          requiresConfirmation: true, resolved: false
        }]
      }
    };
    cinematicApiMocks.generateCinematicStoryPlan
      .mockResolvedValueOnce(blocked)
      .mockResolvedValueOnce(proposal);

    render(<I18nextProvider i18n={testI18n}><CinematicStageContent activeStage="story-plan" project={project} onProjectChanged={vi.fn()} onPrevious={vi.fn()} onNext={vi.fn()} /></I18nextProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.story.generate' }));
    const dialog = await screen.findByRole('dialog', { name: 'cinematic.story.proposalTitle' });
    expect(within(dialog).getByText('Station and cafe conflict.')).toBeVisible();
    fireEvent.click(within(dialog).getByRole('button', { name: 'cinematic.story.useStoryBrief' }));

    await waitFor(() => expect(cinematicApiMocks.generateCinematicStoryPlan).toHaveBeenLastCalledWith(
      project.id,
      { mode: 'generate', sourceResolution: 'story_brief' }
    ));
    expect(await within(dialog).findByRole('button', { name: 'cinematic.story.applyProposal' })).toBeEnabled();
  });

  it('exposes one unified Story Plan AI operation and always dispatches the complete generate workflow', async () => {
    const project = completeStoryPlanFixture();
    cinematicApiMocks.generateCinematicStoryPlan.mockResolvedValue(storyPlanProposalFixture(project));
    render(<I18nextProvider i18n={testI18n}><CinematicStageContent activeStage="story-plan" project={project} onProjectChanged={vi.fn()} onPrevious={vi.fn()} onNext={vi.fn()} /></I18nextProvider>);

    expect(screen.queryByRole('button', { name: 'cinematic.story.reviewWithDirector' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.story.generate' }));

    await waitFor(() => expect(cinematicApiMocks.generateCinematicStoryPlan).toHaveBeenCalledWith(
      project.id,
      { mode: 'generate', sourceResolution: null }
    ));
  });

  it('shows bounded visual repairs with before and after evidence in the unified proposal', async () => {
    const project = completeStoryPlanFixture();
    const proposal = storyPlanProposalFixture(project);
    cinematicApiMocks.generateCinematicStoryPlan.mockResolvedValue(proposal);
    render(<I18nextProvider i18n={testI18n}><CinematicStageContent activeStage="story-plan" project={project} onProjectChanged={vi.fn()} onPrevious={vi.fn()} onNext={vi.fn()} /></I18nextProvider>);

    fireEvent.click(screen.getByRole('button', { name: 'cinematic.story.generate' }));
    const dialog = await screen.findByRole('dialog', { name: 'cinematic.story.proposalTitle' });
    expect(within(dialog).getByText('cinematic.story.workflowRepairs')).toBeVisible();
    const repair = within(dialog).getByText('shot.subjectAction');
    fireEvent.click(repair);
    expect(within(dialog).getByText('She waits and breathes.')).toBeVisible();
    expect(within(dialog).getByText('Her hand tightens around the sign.')).toBeVisible();
    expect(within(dialog).getByText('The primary action cannot be read reliably from one still image.')).toBeVisible();
  });

  it('keeps a generated Story Plan reviewable when the visual repair stage times out', async () => {
    const project = completeStoryPlanFixture();
    const proposal = storyPlanProposalFixture(project);
    proposal.workflow!.status = 'ready_with_warnings';
    proposal.workflow!.repairs = [];
    proposal.workflow!.remainingFindings = structuredClone(proposal.workflow!.initialFindings);
    proposal.workflow!.stages.find(stage => stage.id === 'visual_repair')!.status = 'stopped';
    proposal.workflow!.repairRounds = [{
      round: 1, status: 'provider_timeout', findingCountBefore: 1, findingCountAfter: 1,
      repairableCountBefore: 1, repairableCountAfter: 1, acceptedChangeCount: 0,
      provenance: null,
      failure: {
        code: 'cinematic_story_plan_repair_timeout',
        message: 'Visual repair exceeded its time budget.',
        retryable: true, stage: 'visual_repair', timeoutMs: 90_000
      }
    }];
    cinematicApiMocks.generateCinematicStoryPlan.mockResolvedValue(proposal);
    render(<I18nextProvider i18n={testI18n}><CinematicStageContent activeStage="story-plan" project={project} onProjectChanged={vi.fn()} onPrevious={vi.fn()} onNext={vi.fn()} /></I18nextProvider>);

    fireEvent.click(screen.getByRole('button', { name: 'cinematic.story.generate' }));

    const dialog = await screen.findByRole('dialog', { name: 'cinematic.story.proposalTitle' });
    expect(within(dialog).getByText('cinematic.story.repairTimedOut')).toBeVisible();
    expect(within(dialog).getByRole('button', { name: 'cinematic.story.applyProposal' })).toBeEnabled();
    expect(within(dialog).getByText('cinematic.story.remainingVisualIssues')).toBeVisible();
  });

  it('prevents applying a generated Plan while the unified workflow has a blocking finding', async () => {
    const project = completeStoryPlanFixture();
    const proposal = storyPlanProposalFixture(project);
    proposal.workflow!.status = 'blocked';
    proposal.workflow!.remainingFindings = [{
      ...proposal.workflow!.initialFindings[0]!, severity: 'blocking', repairable: false,
      code: 'character_identity_not_ready', summary: 'Character identity is not ready.'
    }];
    proposal.filmReadiness = {
      status: 'not_ready', dimensions: { production: 'not_ready' }, findings: [{
        code: 'character_identity_not_ready', dimension: 'production', severity: 'blocking',
        summary: 'Character identity is not ready.', recommendation: 'Complete Cast preparation.',
        sceneId: 'scene_generated', shotId: 'shot_generated'
      }]
    };
    cinematicApiMocks.generateCinematicStoryPlan.mockResolvedValue(proposal);
    render(<I18nextProvider i18n={testI18n}><CinematicStageContent activeStage="story-plan" project={project} onProjectChanged={vi.fn()} onPrevious={vi.fn()} onNext={vi.fn()} /></I18nextProvider>);

    fireEvent.click(screen.getByRole('button', { name: 'cinematic.story.generate' }));

    expect(await screen.findByRole('button', { name: 'cinematic.story.applyProposal' })).toBeDisabled();
    expect(screen.getAllByText('Character identity is not ready.').length).toBeGreaterThan(0);
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
        aiFieldKeys: [`scene:${project.scenes[0]!.id}.title`],
        scenes: expect.arrayContaining([expect.objectContaining({
          id: project.scenes[0]!.id,
          title: 'Generated Scene Direction'
        })])
      })
    ));
  });

  it('opens Scene proposal loading state before the AI request resolves', async () => {
    const project = completeStoryPlanFixture();
    let resolveProposal!: (proposal: CinematicSceneDirectionProposal) => void;
    cinematicApiMocks.generateCinematicSceneDirection.mockReturnValue(new Promise(resolve => {
      resolveProposal = resolve;
    }));
    render(<I18nextProvider i18n={testI18n}><CinematicStageContent activeStage="story-plan" project={project} onPrevious={vi.fn()} onNext={vi.fn()} /></I18nextProvider>);
    fireEvent.click(screen.getByRole('button', { name: /Scene 1.*cinematic\.storyboard\.shots/ }));
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.director.generate' }));
    const dialog = await screen.findByRole('dialog', { name: 'cinematic.director.proposalTitle' });
    expect(within(dialog).getByText('cinematic.director.proposalGenerating')).toBeVisible();
    expect(cinematicApiMocks.generateCinematicSceneDirection).toHaveBeenCalledWith(
      project.id,
      project.scenes[0]!.id,
      expect.objectContaining({ sceneDraft: expect.objectContaining({ id: project.scenes[0]!.id }) })
    );
    resolveProposal(sceneDirectionProposalFixture(project));
    expect(await within(dialog).findByText('cinematic.director.proposalFields')).toBeVisible();
  });

  it('selects every proposed Scene field by default and renders structured cues as review text', () => {
    const project = completeStoryPlanFixture();
    const base = sceneDirectionProposalFixture(project);
    const proposal: CinematicSceneDirectionProposal = {
      ...base,
      fieldProposals: [{
        fieldKey: 'shot:scene-1:shot-1.estimatedActionDurationMs',
        manifestPath: 'shot.estimatedActionDurationMs',
        group: 'timing', visibility: 'advanced',
        localizationKey: 'cinematic.director.estimatedActionDuration',
        currentValue: 0, proposedValue: 7000, outcome: 'proposed', recommended: false
      }, {
        fieldKey: 'shot:scene-1:shot-1.dialogueCues',
        manifestPath: 'shot.dialogueCues',
        group: 'audio', visibility: 'advanced',
        localizationKey: 'cinematic.director.dialogue',
        currentValue: [],
        proposedValue: [{
          speakerCastAssignmentId: 'cast_nara', offscreenVoiceRole: '',
          text: 'Tomorrow, we open.', delivery: 'quietly', startOffsetMs: 1000,
          estimatedDurationMs: 2000, speakerVisible: true
        }],
        outcome: 'proposed', recommended: false
      }, {
        fieldKey: 'shot:scene-1:shot-1.audioCues',
        manifestPath: 'shot.audioCues',
        group: 'audio', visibility: 'advanced',
        localizationKey: 'cinematic.director.audio',
        currentValue: [],
        proposedValue: [{
          kind: 'ambience', source: 'rain', description: 'Rain against windows',
          startOffsetMs: 0, durationMs: 7000
        }],
        outcome: 'proposed', recommended: false
      }],
      mergeSummary: { requested: 3, proposed: 3, recommended: 0, locked: 0, unchanged: 0 }
    };
    const onApply = vi.fn();

    render(<I18nextProvider i18n={testI18n}><SceneDirectionProposalDialog
      open
      onOpenChange={vi.fn()}
      proposal={proposal}
      onApply={onApply}
    /></I18nextProvider>);

    const dialog = screen.getByRole('dialog', { name: 'cinematic.director.proposalTitle' });
    const selectAll = within(dialog).getByRole('checkbox', { name: /cinematic\.director\.proposalSelectAll/ });
    expect(selectAll).toBeChecked();
    expect(within(dialog).getAllByRole('checkbox')).toHaveLength(4);
    within(dialog).getAllByRole('checkbox').forEach(checkbox => expect(checkbox).toBeChecked());
    expect(dialog).toHaveTextContent('7s');
    expect(dialog).toHaveTextContent('"Tomorrow, we open."');
    expect(dialog).toHaveTextContent('Rain against windows');
    expect(dialog).not.toHaveTextContent('[object Object]');

    fireEvent.click(selectAll);
    expect(within(dialog).getByRole('button', { name: 'cinematic.story.applyProposal' })).toBeDisabled();
    fireEvent.click(selectAll);
    fireEvent.click(within(dialog).getByRole('button', { name: 'cinematic.story.applyProposal' }));
    expect(onApply).toHaveBeenCalledWith(proposal, proposal.fieldProposals!.map(field => field.fieldKey));
  });

  it('opens a Shot dialog and keeps additional direction editing resettable', () => {
    const project = completeStoryPlanFixture();
    const shot = project.scenes[0]!.shots[0]!;
    renderStoryboardWithQuery(project);
    fireEvent.click(screen.getByRole('button', { name: `cinematic.storyboard.editShot ${shot.id}` }));
    const direction = screen.getByRole('textbox', { name: /cinematic\.storyboard\.shotDirection/ });
    fireEvent.change(direction, { target: { value: 'changed direction' } });
    expect(direction).toHaveValue('changed direction');
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.storyboard.reset' }));
    expect(direction).not.toHaveValue('changed direction');
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
    expect(generation).toHaveAttribute('data-engine-presentation', 'compact');
    expect(generation).toHaveAttribute('data-persistence-scope', `${project.id}:${shot.id}`);
    const approval = screen.getByRole('button', { name: 'cinematic.storyboard.approveGeneratedSource' });
    expect(approval).toHaveClass('cinematic-storyboard-approval-callout__action');
    expect(screen.getByText('cinematic.storyboard.approvalDescription')).toBeVisible();
  });

  it('uses the server-compiled keyframe prompt instead of rebuilding Storyboard authority in React', async () => {
    const project = completeStoryPlanFixture();
    const shot = project.scenes[0]!.shots[0]!;
    shot.prompt = 'Keep the phone at chest level.';
    project.scenes[0]!.emotionalStart = 'Tense and watchful';
    project.scenes[0]!.emotionalEnd = 'Apprehensive';
    cinematicApiMocks.getCinematicStoryboardGenerationContext.mockResolvedValue({
      schemaVersion: 1,
      projectId: project.id, projectVersion: project.version,
      sceneId: project.scenes[0]!.id, shotId: shot.id, shotVersion: shot.version,
      characterProfileContext: null,
      references: { outfit_front: null, outfit_back: null, style_reference: null },
      cast: [], looks: [], continuitySource: null,
      keyframeContract: {
        sourceFingerprint: 'keyframe_server_compiled',
        providerIndependentPrompt: 'STORYBOARD KEYFRAME CONTRACT cinematic-storyboard-keyframe-v1\n\nVISIBLE PERFORMANCE:\nVisible emotional target: Apprehensive.\n\nAUTHOR DIRECTION:\nKeep the phone at chest level.'
      },
      generationEligible: true, blockingReason: null
    });
    renderStoryboardWithQuery(project);

    fireEvent.click(screen.getByRole('button', { name: `cinematic.storyboard.editShot ${shot.id}` }));
    await waitFor(() => expect((screen.getByRole('textbox', {
      name: 'storyboard generation prompt'
    }) as HTMLTextAreaElement).value).toContain('STORYBOARD KEYFRAME CONTRACT'));
    const prompt = screen.getByRole('textbox', { name: 'storyboard generation prompt' });
    const value = (prompt as HTMLTextAreaElement).value;
    expect(value).toContain('STORYBOARD KEYFRAME CONTRACT');
    expect(value).toContain('Visible emotional target: Apprehensive');
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

function approvedCharacterLookFixture(project: CinematicProject) {
  const assignment = project.castAssignments[0]!;
  return {
    id: 'charlook_approved', characterProfileId: assignment.characterProfileId,
    sourceCharacterProfileVersionId: assignment.characterProfileVersionId,
    name: 'Approved presentation Look', description: '', tags: [], official: true,
    visibility: 'private', lifecycleStatus: 'approved',
    activeVersionId: 'charlookver_approved', approvedVersionId: 'charlookver_approved',
    versions: [{
      id: 'charlookver_approved', versionNumber: 1, sourceMode: 'ai_suggestion',
      garmentAuthorities: {}, canonicalFaceAssetId: 'ast_face', status: 'approved',
      approvedViewAssets: { front: {}, side: {}, back: {} },
      approvedSheetAsset: { assetId: 'ast_sheet', contentHash: null },
      reviewMediaUrl: '/api/character-profiles/char_alice/looks/charlook_approved/versions/charlookver_approved/media/sheet',
      createdAt: '2026-08-31T00:00:00.000Z', updatedAt: '2026-08-31T00:00:00.000Z',
      approvedAt: '2026-08-31T00:00:00.000Z'
    }],
    createdAt: '2026-08-31T00:00:00.000Z', updatedAt: '2026-08-31T00:00:00.000Z',
    retiredAt: null
  };
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
    cause: 'The final train approaches', consequence: 'She walks toward the exit',
    targetDurationMs: 20_000, sceneIds: ['scene_legacy']
  };
  project.storyPlanVersions[0] = {
    ...project.storyPlanVersions[0]!, contractVersion: 'story-plan-v3', directorOperation: 'generate',
    filmReadiness: { status: 'ready', dimensions: {}, findings: [] }, beats: [beat]
  };
  project.scenes[0] = {
    ...project.scenes[0]!, beatId: beat.id, purpose: 'Show the decision',
    storyChange: 'She walks toward the exit', entryState: 'She faces the tracks',
    exitState: 'She moves toward the exit', objective: 'Choose a direction', pressure: 'The train is arriving',
    shots: [{
      ...project.scenes[0]!.shots[0]!, purpose: 'Reveal the choice through movement',
      visibleMoment: 'She lowers the phone and turns right', subjectAction: 'She pockets the phone',
      emotionalTarget: 'quiet resolve', performanceCue: 'One exhale',
      continuityEntry: 'Phone in right hand', continuityExit: 'Phone in right pocket', transitionToNext: 'end'
    }]
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
    mode: 'generate', status: 'proposal',
    expectedProjectVersion: project.version,
    storySourceVersionId: project.activeStorySourceVersionId!,
    plan: {
      objective: 'Choose hope', logline: 'A final train forces a choice.',
      emotionalArc: 'Uncertain to hopeful', beats: [beat], scenes: [scene],
      warnings: [], source: 'generated', approved: false
    },
    filmReadiness: { status: 'ready', dimensions: {}, findings: [] }, scriptPreview: [], provenance: {
      provider: 'openai', model: 'test-model', responseId: 'response_plan',
      recipeId: 'cinematic-story-plan-generate', recipeVersion: 1, recipeFingerprint: 'recipe-plan'
    },
    workflow: {
      contractVersion: 'cinematic-story-plan-workflow-v1', status: 'ready',
      stages: [
        { id: 'source_preflight', status: 'completed', issueCount: 0, repairCount: 0 },
        { id: 'plan_generation', status: 'completed', issueCount: 0, repairCount: 0 },
        { id: 'director_review', status: 'completed', issueCount: 0, repairCount: 0 },
        { id: 'visual_validation', status: 'completed', issueCount: 1, repairCount: 0 },
        { id: 'visual_repair', status: 'completed', issueCount: 1, repairCount: 1 },
        { id: 'storyboard_readiness', status: 'completed', issueCount: 0, repairCount: 0 }
      ],
      repairRoundCount: 1,
      initialFindings: [{
        code: 'non_visual_action', severity: 'warning', repairable: true,
        sceneId: scene.id, sceneTitle: scene.title, shotId: shot.id, shotTitle: shot.title,
        fieldPaths: ['shot.subjectAction'],
        summary: 'The primary action cannot be read reliably from one still image.',
        recommendation: 'Use one visible gesture.'
      }],
      repairs: [{
        round: 1, sceneIndex: 0, shotIndex: 0, sceneTitle: scene.title, shotTitle: shot.title,
        fieldPath: 'shot.subjectAction', before: 'She waits and breathes.',
        after: 'Her hand tightens around the sign.', reasonCodes: ['non_visual_action']
      }],
      repairRounds: [{
        round: 1, status: 'accepted', findingCountBefore: 1, findingCountAfter: 0,
        repairableCountBefore: 1, repairableCountAfter: 0, acceptedChangeCount: 1,
        provenance: {
          provider: 'openai', model: 'test-model', responseId: 'response_repair',
          recipeId: 'cinematic-story-plan-generate', recipeVersion: 1, recipeFingerprint: 'recipe-plan'
        }
      }],
      remainingFindings: []
    },
    billingStatus: 'qualification_no_charge'
  };
}

function projectWithSavedProposal(
  project: CinematicProject,
  proposal: CinematicStoryPlanProposal
): CinematicProject {
  if (!proposal.plan) throw new Error('Expected a Story Plan proposal with a plan.');
  const saved = structuredClone(project);
  saved.version += 1;
  saved.scenes = structuredClone(proposal.plan.scenes);
  saved.storyPlanVersions.push({
    ...saved.storyPlanVersions[0]!,
    id: 'cineplan_generated_draft', version: saved.storyPlanVersions.length + 1,
    beats: structuredClone(proposal.plan.beats), sceneIds: proposal.plan.scenes.map(scene => scene.id),
    source: 'generated', status: 'draft', contractVersion: 'story-plan-v3'
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
    sceneId: scene.id, scene,
    fieldProposals: [{
      fieldKey: `scene:${scene.id}.title`, manifestPath: 'scene.title', group: 'scene',
      visibility: 'simple', localizationKey: 'cinematic.director.sceneTitle',
      currentValue: project.scenes[0]!.title, proposedValue: scene.title,
      outcome: 'proposed', recommended: true
    }],
    mergeSummary: { requested: 1, proposed: 1, recommended: 1, locked: 0, unchanged: 0 },
    warnings: [],
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

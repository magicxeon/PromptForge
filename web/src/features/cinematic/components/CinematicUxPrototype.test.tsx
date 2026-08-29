import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { castDirectionFromRole, cinematicCastPortraitUrl, CinematicStageContent } from './CinematicStageContent';
import { CinematicStageRail } from './CinematicStageRail';
import { characterCandidateMediaUrl, formatFacetLabel, overlapsAgeBucket } from './CinematicDialogs';
import type { CinematicProject } from '../schemas/cinematicSchemas';

vi.mock('../../../components/media/AuthenticatedMediaImage', () => ({
  AuthenticatedMediaImage: ({ src, alt = '' }: { src: string; alt?: string }) => <img src={src} alt={alt} />
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
    fireEvent.click(screen.getAllByRole('button', { name: 'cinematic.story.expand' })[0]!);
    expect(screen.getByRole('dialog', { name: 'cinematic.director.title' })).toBeVisible();
    expect(screen.getByText('cinematic.director.continuity')).toBeVisible();
  });

  it('keeps Storyboard prompt editing local and resettable', () => {
    render(<I18nextProvider i18n={testI18n}><CinematicStageContent activeStage="storyboard" onPrevious={vi.fn()} onNext={vi.fn()} /></I18nextProvider>);
    const prompt = screen.getByRole('textbox');
    fireEvent.change(prompt, { target: { value: 'changed prompt' } });
    expect(prompt).toHaveValue('changed prompt');
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.storyboard.reset' }));
    expect(prompt).toHaveValue('cinematic.storyboard.promptFixture');
  });

  it('keeps Storyboard prompt and media centered while generation controls remain in the right panel', () => {
    render(<I18nextProvider i18n={testI18n}><CinematicStageContent activeStage="storyboard" onPrevious={vi.fn()} onNext={vi.fn()} /></I18nextProvider>);
    const dock = screen.getByTestId('cinematic-operation-dock');
    expect(within(dock).queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeVisible();
    expect(dock.closest('.cinematic-sticky-generation-panel')).not.toBeNull();
    expect(within(dock).getAllByRole('combobox')).toHaveLength(4);
    fireEvent.click(within(dock).getByRole('button', { name: 'cinematic.generation.eligibleSet' }));
    expect(within(dock).getByText(/32 cinematic\.cost\.credits/)).toBeVisible();
    expect(within(dock).getByTestId('cinematic-operation-submit')).toHaveTextContent('cinematic.storyboard.generateSet');
    const result = screen.getByRole('region', { name: 'cinematic.results.imageLabel' });
    expect(result.querySelector('.generation-result__momelo-mark')).not.toBeNull();
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

  it('shows reconciled Scene and Shot durations and supports explicit sequence movement', () => {
    const { container } = render(<I18nextProvider i18n={testI18n}><CinematicStageContent activeStage="storyboard" onPrevious={vi.fn()} onNext={vi.fn()} /></I18nextProvider>);
    const board = screen.getByRole('region', { name: 'cinematic.storyboard.boardLabel' });
    expect(within(board).getByText(/12\.5s/)).toBeVisible();
    expect(within(board).getAllByText('3.5s')).toHaveLength(2);
    expect(within(board).getByText('2.5s')).toBeVisible();
    expect([...container.querySelectorAll('[data-shot-id]')].map(item => item.getAttribute('data-shot-id'))).toEqual(['01A', '01B', '01C', '01D']);
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.storyboard.moveLater 01A' }));
    expect([...container.querySelectorAll('[data-shot-id]')].map(item => item.getAttribute('data-shot-id'))).toEqual(['01B', '01A', '01C', '01D']);
  });
});

function castProjectFixture() {
  return {
    id: 'cineproj_cast',
    projectId: 'cineproj_cast',
    version: 2,
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

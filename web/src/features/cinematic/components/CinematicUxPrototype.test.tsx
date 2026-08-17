import { fireEvent, render, screen, within } from '@testing-library/react';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { CinematicStageContent } from './CinematicStageContent';
import { CinematicStageRail } from './CinematicStageRail';
import { formatFacetLabel, overlapsAgeBucket } from './CinematicDialogs';
import type { CinematicProject } from '../schemas/cinematicSchemas';

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
    expect(screen.getAllByRole('button', { name: 'cinematic.cast.addCharacter' })).toHaveLength(2);
  });

  it('reveals advanced Character direction without changing the Cast workflow', () => {
    render(<I18nextProvider i18n={testI18n}><CinematicStageContent activeStage="cast" mode="advanced" onPrevious={vi.fn()} onNext={vi.fn()} /></I18nextProvider>);
    expect(screen.getByText('cinematic.cast.pressure')).toBeVisible();
    expect(screen.getByText('cinematic.cast.relationship')).toBeVisible();
    expect(screen.getByText('cinematic.cast.allowSceneChanges')).toBeVisible();
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

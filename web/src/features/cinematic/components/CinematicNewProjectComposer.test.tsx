import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { createCinematicSetupDraft } from '../state/cinematicDraftStorage';
import type { CinematicStoryAuthoring } from '../schemas/cinematicSchemas';
import { CinematicNewProjectComposer } from './CinematicNewProjectComposer';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) => values
      ? `${key}:${Object.values(values).join('|')}`
      : key
  })
}));

vi.mock('../../../components/ui/ThemeSelect', () => ({
  ThemeSelect: ({ ariaLabel, value, options, onValueChange, disabled }: {
    ariaLabel: string;
    value: string;
    options: Array<{ value: string; label: string }>;
    onValueChange: (value: string) => void;
    disabled?: boolean;
  }) => (
    <select aria-label={ariaLabel} value={value} disabled={disabled} onChange={event => onValueChange(event.target.value)}>
      {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  )
}));

const storyAuthoring: CinematicStoryAuthoring = {
  schemaVersion: 1,
  version: 4,
  limits: { storyBrief: 600, creativeDirection: 800 },
  choices: {
    genres: { maxSelections: 3, default: 'drama', ids: ['drama', 'romance', 'comedy', 'thriller'] },
    audienceFeelings: { maxSelections: 3, default: 'moved', ids: ['moved', 'hopeful'] },
    pacingTraits: { maxSelections: 2, default: 'balanced', ids: ['balanced', 'slow'] }
  },
  countryStyles: {
    default: 'none',
    options: [{ id: 'none', flag: null, guidance: 'No preset.' }]
  },
  periods: {
    default: 'contemporary',
    options: [{ id: 'contemporary', guidance: 'Contemporary.' }]
  }
};

function renderComposer(overrides: Partial<Parameters<typeof CinematicNewProjectComposer>[0]> = {}) {
  const props: Parameters<typeof CinematicNewProjectComposer>[0] = {
    draft: createCinematicSetupDraft(new Date('2026-09-20T00:00:00.000Z')),
    storyAuthoring,
    creationPolicy: {
      formats: ['short-film', 'mini-series'],
      defaultFormat: 'short-film',
      aspectRatios: ['9:16', '16:9', '1:1'],
      defaultAspectRatio: '9:16',
      chapterDurationsSeconds: [20, 30, 45, 60, 90, 120]
    },
    saveState: 'saved',
    saveError: null,
    pending: false,
    online: true,
    onUpdate: vi.fn(),
    onCreateDraft: vi.fn(),
    onPrepareStory: vi.fn(),
    ...overrides
  };
  render(<MemoryRouter><CinematicNewProjectComposer {...props} /></MemoryRouter>);
  return props;
}

describe('CinematicNewProjectComposer', () => {
  it('keeps manual Project Video Direction separate from story direction with a configured bound', () => {
    const props = renderComposer({ maximumVideoDirectionCharacters: 900 });
    const field = screen.getByLabelText('cinematic.videoDirection.title');
    expect(field).toHaveAttribute('maxlength', '900');
    fireEvent.change(field, { target: { value: 'No music. Rain ambience only.' } });
    expect(props.onUpdate).toHaveBeenCalledWith('videoDirection', 'No music. Rain ambience only.');
    expect(props.onPrepareStory).not.toHaveBeenCalled();
  });
  it('collapses an imported brief and opens the existing editor without losing content or sibling actions', () => {
    const draft = { ...createCinematicSetupDraft(), storyBrief: 'A saved imported idea.',
      storyBriefImport: { fileName: 'my-story.md', edited: true } };
    const props = renderComposer({ draft });
    expect(screen.getByText('my-story.md')).toBeVisible();
    expect(screen.getByText('cinematic.storyImport.sourceEdited')).toBeVisible();
    expect(screen.queryByRole('textbox', { name: /cinematic.newProject.storyIdea/ })).not.toBeInTheDocument();
    const edit = screen.getByRole('button', { name: 'cinematic.storyImport.editBrief' });
    expect(edit).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(edit);
    const field = screen.getByRole('textbox', { name: /cinematic.newProject.storyIdea/ });
    expect(field).toHaveValue(draft.storyBrief);
    fireEvent.change(field, { target: { value: 'Edited idea' } });
    expect(props.onUpdate).toHaveBeenCalledWith('storyBrief', 'Edited idea');
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.storyImport.hideBrief' }));
    expect(field).not.toBeVisible();
    expect(screen.getByRole('button', { name: 'cinematic.newProject.createDraft' })).toBeEnabled();
  });

  it('opens imported Full Story in the writer instead of copying long prose into the brief', () => {
    const onContinueFullStory = vi.fn();
    renderComposer({ variant: 'edit', importedFullStory: { importFileName: 'novel.txt', importEdited: true }, onContinueFullStory });
    expect(screen.getByText('novel.txt')).toBeVisible();
    expect(screen.queryByRole('textbox', { name: /cinematic.newProject.storyIdea/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.storyImport.editFullStory' }));
    expect(onContinueFullStory).toHaveBeenCalledOnce();
  });

  it('keeps imported content visible but disables Full Story navigation while offline', () => {
    renderComposer({ importedFullStory: { importFileName: 'novel.md' }, online: false, onContinueFullStory: vi.fn() });
    expect(screen.getByText('novel.md')).toBeVisible();
    expect(screen.getByRole('button', { name: 'cinematic.storyImport.editFullStory' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'cinematic.storyImport.editBrief' })).toBeEnabled();
  });

  it('keeps the shortest manual path available without a story brief', () => {
    const props = renderComposer();
    expect(screen.getByRole('heading', { name: 'cinematic.newProject.title' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'cinematic.newProject.back' })).toHaveAttribute('href', '/create/cinematic');
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.newProject.createDraft' }));
    expect(props.onCreateDraft).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'cinematic.newProject.prepareStory' })).toBeDisabled();
  });

  it('reuses the same composer for an existing Project Brief before Full Story', () => {
    const onSave = vi.fn();
    const onContinueFullStory = vi.fn();
    renderComposer({ variant: 'edit', onSave, onContinueFullStory });
    expect(screen.queryByRole('button', { name: 'cinematic.newProject.createDraft' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.newProject.saveBrief' }));
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.newProject.continueFullStory' }));
    expect(onSave).toHaveBeenCalledOnce();
    expect(onContinueFullStory).toHaveBeenCalledOnce();
  });

  it('updates format and orientation and enables explicit story preparation', () => {
    const draft = { ...createCinematicSetupDraft(), storyBrief: 'A florist meets a stranger during a storm.' };
    const props = renderComposer({ draft });
    expect(screen.getByRole('radio', { name: 'cinematic.newProject.format.mini-series' })).toBeChecked();
    fireEvent.click(screen.getByRole('radio', { name: 'cinematic.newProject.format.short-film' }));
    fireEvent.click(screen.getByRole('radio', { name: 'cinematic.newProject.orientation.16:9' }));
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.newProject.prepareStory' }));
    expect(props.onUpdate).toHaveBeenCalledWith('format', 'short-film');
    expect(props.onUpdate).toHaveBeenCalledWith('aspectRatio', '16:9');
    expect(props.onPrepareStory).toHaveBeenCalledOnce();
  });

  it('keeps format and orientation groups distinct and disables all choices while pending', () => {
    renderComposer({ pending: true });
    const format = screen.getByRole('group', { name: 'cinematic.newProject.format' });
    const orientation = screen.getByRole('group', { name: 'cinematic.newProject.orientation' });
    const formats = within(format).getAllByRole('radio');
    const ratios = within(orientation).getAllByRole('radio');
    expect(formats).toHaveLength(2);
    expect(ratios).toHaveLength(3);
    expect(formats[0]?.getAttribute('name')).not.toBe(ratios[0]?.getAttribute('name'));
    [...formats, ...ratios].forEach(input => expect(input).toBeDisabled());
    expect(screen.getByRole('button', { name: 'cinematic.newProject.createDraft' })).toBeDisabled();
  });

  it('adds ordered Genres without replacing the Primary and offers a two-minute Chapter', () => {
    const props = renderComposer();
    const genres = within(screen.getByTestId('cinematic-new-project-genres'));
    fireEvent.click(genres.getByText('cinematic.intent.options'));
    fireEvent.click(genres.getByRole('checkbox', { name: 'cinematic.genre.romance' }));
    expect(props.onUpdate).toHaveBeenCalledWith('genres', ['drama', 'romance']);

    fireEvent.click(screen.getByText('cinematic.newProject.settings'));
    const duration = screen.getByRole('combobox', { name: 'cinematic.newProject.durationPerChapter' });
    expect(within(duration).getByRole('option', { name: 'cinematic.newProject.durationMinutes:2' })).toHaveValue('120');
  });

  it('edits planned Seasons and Chapter counts without creating Chapter records', () => {
    const draft = { ...createCinematicSetupDraft(), seasonEnabled: true, seasonCount: 2, chapterCount: 3, chaptersPerSeason: [1, 2] };
    const props = renderComposer({ draft });
    fireEvent.click(screen.getByText('cinematic.newProject.settings'));
    expect(screen.getByRole('checkbox', { name: 'cinematic.newProject.useSeasons' })).toBeChecked();
    const seasonTwo = screen.getByRole('spinbutton', { name: 'cinematic.newProject.seasonChapters:2' });
    fireEvent.change(seasonTwo, { target: { value: '3' } });
    expect(props.onUpdate).toHaveBeenCalledWith('chaptersPerSeason', [1, 3]);
    expect(props.onUpdate).toHaveBeenCalledWith('chapterCount', 4);
  });

  it('groups core and optional choices in collapsible rounded sections without clearing values', () => {
    renderComposer();
    const essentials = screen.getByText('cinematic.newProject.quickSettings').closest('details');
    const settings = screen.getByText('cinematic.newProject.settings').closest('details');
    expect(essentials).toHaveAttribute('open');
    expect(settings).not.toHaveAttribute('open');
    expect(essentials).toHaveTextContent('cinematic.newProject.format.mini-series');
    expect(essentials).toHaveTextContent('9:16');

    fireEvent.click(within(essentials as HTMLElement).getByText('cinematic.newProject.quickSettings'));
    expect(essentials).not.toHaveAttribute('open');
  });

  it('retains writing offline while preventing server actions', () => {
    renderComposer({ online: false, saveState: 'offline' });
    expect(screen.getByRole('status')).toHaveTextContent('cinematic.save.offline');
    expect(screen.getByText('cinematic.newProject.offlineTitle')).toBeVisible();
    expect(screen.getByRole('button', { name: 'cinematic.newProject.createDraft' })).toBeDisabled();
  });
});

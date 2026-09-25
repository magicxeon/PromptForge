import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CinematicProject, CinematicSetupDraft } from '../schemas/cinematicSchemas';
import { CinematicStoryWriter } from './CinematicStoryWriter';

const getWorkspace = vi.fn();
const mutateSeries = vi.fn();

vi.mock('../api/cinematicSeriesApi', () => ({
  getCinematicSeriesWorkspace: (...args: unknown[]) => getWorkspace(...args),
  mutateCinematicSeries: (...args: unknown[]) => mutateSeries(...args)
}));

vi.mock('../../../lib/auth/actorStore', () => ({ getActiveActorId: () => 'owner' }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) => values
      ? `${key}:${Object.values(values).join('|')}`
      : key
  })
}));

const project = {
  id: 'chapter-1',
  version: 3,
  title: 'Rain Stories',
  seriesMembership: { seriesId: 'series-1', seasonId: 'season-1', chapterNumber: 1 }
} as unknown as CinematicProject;

const draft = {
  projectName: 'First rain',
  storyBrief: 'Lalin closes the flower shop as the storm begins.',
  storyRoleSlots: [{ id: 'lalin', label: 'Lalin', importance: 'required', storyFunction: 'Lead florist', relationshipHint: '' }]
} as CinematicSetupDraft;

const workspace = {
  productionProject: {
    id: 'series-1', productionProjectId: 'series-1', version: 1,
    title: 'Rain Stories', format: 'mini-series', seasonsEnabled: true, chapterCount: 2
  },
  series: {
    id: 'series-1', ownerUserId: 'owner', title: 'Rain Stories', version: 2,
    seasons: [{ id: 'season-1', number: 1, title: '' }],
    createdAt: '2026-09-20T00:00:00.000Z', updatedAt: '2026-09-20T00:00:00.000Z'
  },
  chapters: [
    {
      projectId: 'chapter-1', ownerUserId: 'owner', title: 'First rain', activeStage: 'cast', durationSeconds: 60,
      status: 'draft', updatedAt: '2026-09-20T00:00:00.000Z', productionProjectId: 'series-1',
      chapterId: 'chapter-1', productionUnitId: 'chapter-1', seasonId: 'season-1', order: 1,
      storyBrief: 'Lalin closes the flower shop as the storm begins.',
      seriesMembership: { seriesId: 'series-1', seasonId: 'season-1', chapterNumber: 1 }
    },
    {
      projectId: 'chapter-2', ownerUserId: 'owner', title: 'A promise', activeStage: 'cast', durationSeconds: 60,
      status: 'draft', updatedAt: '2026-09-20T00:00:00.000Z', productionProjectId: 'series-1',
      chapterId: 'chapter-2', productionUnitId: 'chapter-2', seasonId: 'season-1', order: 2,
      storyBrief: 'Kin returns with an umbrella.',
      seriesMembership: { seriesId: 'series-1', seasonId: 'season-1', chapterNumber: 2 }
    }
  ]
};

function renderWriter(overrides: Partial<Parameters<typeof CinematicStoryWriter>[0]> = {}) {
  const props: Parameters<typeof CinematicStoryWriter>[0] = {
    actorId: 'owner',
    project,
    draft,
    saveState: 'saved',
    saveError: null,
    storyBriefLimit: 600,
    online: true,
    onUpdate: vi.fn(),
    onSave: vi.fn(async () => undefined),
    onEnhance: vi.fn(),
    onPrepareNavigation: vi.fn(async () => project),
    onNavigateChapter: vi.fn(),
    onOpenStage: vi.fn(),
    onBusyChange: vi.fn(),
    ...overrides
  };
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter><CinematicStoryWriter {...props} /></MemoryRouter>
    </QueryClientProvider>
  );
  return props;
}

describe('CinematicStoryWriter', () => {
  beforeEach(() => {
    getWorkspace.mockReset();
    mutateSeries.mockReset();
    getWorkspace.mockResolvedValue(workspace);
  });

  it('edits the selected Chapter in one broad writing surface', async () => {
    const props = renderWriter();
    expect(await screen.findByRole('heading', { name: 'Rain Stories' })).toBeVisible();
    fireEvent.change(screen.getByRole('textbox', { name: 'cinematic.storyWriter.chapterTitle' }), { target: { value: 'Storm warning' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'cinematic.storyWriter.prose' }), { target: { value: 'The rain arrives.' } });
    expect(props.onUpdate).toHaveBeenCalledWith('projectName', 'Storm warning');
    expect(props.onUpdate).toHaveBeenCalledWith('storyBrief', 'The rain arrives.');
  });

  it('saves before switching Chapters and provides an ordered read-only Full Story', async () => {
    const props = renderWriter();
    await screen.findByText('A promise');
    fireEvent.click(screen.getByRole('button', { name: /A promise/ }));
    await waitFor(() => expect(props.onPrepareNavigation).toHaveBeenCalledOnce());
    expect(props.onNavigateChapter).toHaveBeenCalledWith('chapter-2');

    fireEvent.click(screen.getByRole('tab', { name: 'cinematic.storyWriter.fullStory' }));
    expect(screen.getByText('Lalin closes the flower shop as the storm begins.')).toBeVisible();
    expect(screen.getByText('Kin returns with an umbrella.')).toBeVisible();
  });

  it('adds an empty Chapter through the existing Series command', async () => {
    const props = renderWriter();
    mutateSeries.mockResolvedValue({
      project: { ...project, id: 'chapter-3', version: 1 },
      workspace: { ...workspace, chapters: [...workspace.chapters] }
    });
    fireEvent.click(await screen.findByRole('button', { name: 'cinematic.storyWriter.addChapter' }));
    await waitFor(() => expect(mutateSeries).toHaveBeenCalledOnce());
    expect(mutateSeries.mock.calls[0]?.[4]).toEqual(expect.objectContaining({
      kind: 'chapter', seasonId: 'season-1', storyBrief: '', copyCast: true
    }));
    expect(props.onNavigateChapter).toHaveBeenCalledWith('chapter-3');
  });

  it('keeps Chapter navigation prominent and Character notes progressively disclosed', async () => {
    renderWriter();
    const chapterSection = (await screen.findByText('cinematic.storyWriter.chapterCount:2')).closest('details');
    const characterSection = screen.getByText('cinematic.storyWriter.characterCountLabel:1').closest('details');
    expect(chapterSection).toHaveAttribute('open');
    expect(characterSection).not.toHaveAttribute('open');

    fireEvent.click(within(characterSection as HTMLElement).getByText('cinematic.storyWriter.characters'));
    expect(characterSection).toHaveAttribute('open');
    expect(characterSection).toHaveTextContent('Lalin');

    fireEvent.click(within(chapterSection as HTMLElement).getByText('cinematic.storyWriter.chapters'));
    expect(chapterSection).not.toHaveAttribute('open');
  });
});

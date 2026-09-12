import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CinematicProject } from '../schemas/cinematicSchemas';
import type { CinematicSeriesWorkspace } from '../schemas/cinematicSeriesSchemas';
import { SeriesWorkspaceControls } from './SeriesWorkspaceControls';

const api = vi.hoisted(() => ({ getCinematicSeriesWorkspace: vi.fn(), mutateCinematicSeries: vi.fn(), actor: 'alice' }));
vi.mock('../api/cinematicSeriesApi', () => api);
vi.mock('../../../lib/auth/actorStore', () => ({ getActiveActorId: () => api.actor }));
const i18n = i18next.createInstance();
const project = { id: 'p1', version: 4, title: 'Letter One', seriesMembership: { seriesId: 'series', seasonId: 's1', chapterNumber: 1 } } as CinematicProject;
const workspace = { series: { id: 'series', ownerUserId: 'alice', title: 'Station Stories', version: 3, createdAt: '2026-09-12T00:00:00.000Z', updatedAt: '2026-09-12T00:00:00.000Z',
  seasons: [{ id: 's1', number: 1, title: '' }, { id: 's2', number: 2, title: 'Winter' }] },
  chapters: [{ projectId: 'p1', title: 'Letter One', activeStage: 'setup', seriesMembership: project.seriesMembership },
    { projectId: 'p2', title: 'Letter Two', activeStage: 'produce', seriesMembership: { seriesId: 'series', seasonId: 's1', chapterNumber: 2 } }] } as CinematicSeriesWorkspace;

function harness(value = project) {
  const props = { actorId: 'alice', project: value, isSetup: true, onPrepare: vi.fn().mockResolvedValue(value),
    onProjectChanged: vi.fn(), onNavigate: vi.fn(), onBusyChange: vi.fn() };
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}><I18nextProvider i18n={i18n}><SeriesWorkspaceControls {...props} /></I18nextProvider></QueryClientProvider>);
  return props;
}
async function manage() { fireEvent.click(await screen.findByRole('button', { name: 'cinematic.series.manage' })); return screen.findByRole('dialog'); }

describe('Series workspace controls', () => {
  beforeAll(async () => { HTMLElement.prototype.scrollIntoView = vi.fn(); await i18n.use(initReactI18next).init({ lng: 'en', keySeparator: false, interpolation: { prefix: '{', suffix: '}' }, resources: { en: { cinematic: {
    'cinematic.series.seasonNumber': 'Season {number}', 'cinematic.series.chapterNumber': 'Chapter {number}'
  } } } }); });
  beforeEach(() => { vi.clearAllMocks(); api.actor = 'alice'; api.getCinematicSeriesWorkspace.mockResolvedValue(workspace); api.mutateCinematicSeries.mockResolvedValue({ project: null, workspace }); });

  it('creates a Series only after Setup flush, uses the flushed version and prevents duplicate submission', async () => {
    api.getCinematicSeriesWorkspace.mockResolvedValue({ series: null, chapters: [] });
    const props = harness({ ...project, seriesMembership: undefined });
    expect(api.getCinematicSeriesWorkspace).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.series.create' }));
    const dialog = await screen.findByRole('dialog');
    let finish!: (value: CinematicProject) => void;
    props.onPrepare.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    api.mutateCinematicSeries.mockResolvedValue({ project: { ...project, version: 9 }, workspace });
    const button = within(dialog).getByRole('button', { name: 'cinematic.series.create' });
    fireEvent.click(button); fireEvent.click(button);
    expect(props.onPrepare).toHaveBeenCalledTimes(1);
    expect(button).toBeDisabled();
    expect(api.mutateCinematicSeries).not.toHaveBeenCalled();
    await act(async () => { finish({ ...project, version: 8 }); });
    await waitFor(() => expect(api.mutateCinematicSeries).toHaveBeenCalledWith('p1', 8, undefined, undefined, { kind: 'create', title: 'Letter One' }));
    expect(props.onProjectChanged).toHaveBeenCalledWith(expect.objectContaining({ version: 9 }));
  });

  it('switches to a Chapter saved stage only after successful preparation', async () => {
    const props = harness();
    const control = await screen.findByRole('combobox', { name: 'cinematic.series.chapter' });
    fireEvent.keyDown(control, { key: 'Enter' });
    fireEvent.click(await screen.findByRole('option', { name: 'Chapter 2: Letter Two' }));
    await waitFor(() => expect(props.onNavigate).toHaveBeenCalledWith('p2', 'produce'));
    expect(props.onPrepare).toHaveBeenCalledTimes(1);
    expect(api.mutateCinematicSeries).not.toHaveBeenCalled();
  });

  it('keeps a failed Chapter form and source Chapter without submitting when save is unavailable', async () => {
    const props = harness(); props.onPrepare.mockRejectedValue(new Error('Offline; save first'));
    const dialog = await manage();
    fireEvent.change(within(dialog).getByLabelText('cinematic.series.chapterTitle'), { target: { value: 'Second chapter' } });
    fireEvent.change(within(dialog).getByLabelText('cinematic.setup.storyBrief'), { target: { value: 'A letter is delivered.' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'cinematic.series.addChapter' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Offline; save first');
    expect(within(dialog).getByLabelText('cinematic.series.chapterTitle')).toHaveValue('Second chapter');
    expect(api.mutateCinematicSeries).not.toHaveBeenCalled();
    expect(props.onNavigate).not.toHaveBeenCalled();
    props.onPrepare.mockResolvedValue(project);
    api.mutateCinematicSeries.mockResolvedValue({ project: { ...project, id: 'p3', activeStage: 'setup' }, workspace });
    fireEvent.click(within(dialog).getByRole('button', { name: 'cinematic.series.addChapter' }));
    await waitFor(() => expect(props.onNavigate).toHaveBeenCalledWith('p3', 'setup'));
    expect(api.mutateCinematicSeries).toHaveBeenCalledWith('p1', 4, 'series', 3, expect.objectContaining({ kind: 'chapter', copyCast: true, storyBrief: 'A letter is delivered.' }));
  });

  it('selects an empty Season without navigating and uses it when adding a Chapter', async () => {
    const props = harness();
    fireEvent.keyDown(await screen.findByRole('combobox', { name: 'cinematic.series.season' }), { key: 'Enter' });
    fireEvent.click(await screen.findByRole('option', { name: 'Season 2: Winter' }));
    expect(screen.getByRole('combobox', { name: 'cinematic.series.chapter' })).toBeDisabled();
    expect(props.onNavigate).not.toHaveBeenCalled();
    const dialog = await manage();
    expect(within(dialog).getByRole('combobox', { name: 'cinematic.series.season' })).toHaveTextContent('Season 2: Winter');
  });

  it('does not submit under another actor after an async Setup flush', async () => {
    const props = harness(); props.onPrepare.mockImplementation(async () => { api.actor = 'bob'; return project; });
    const dialog = await manage();
    fireEvent.click(within(dialog).getByRole('button', { name: 'cinematic.series.tab.season' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'cinematic.series.addSeason' }));
    await waitFor(() => expect(props.onBusyChange).toHaveBeenLastCalledWith(false));
    expect(api.mutateCinematicSeries).not.toHaveBeenCalled();
    expect(props.onNavigate).not.toHaveBeenCalled();
  });
});

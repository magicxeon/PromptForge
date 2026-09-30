import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import { ApiError } from '../../../lib/api/apiError';
import type { CinematicProject, CinematicShot } from '../schemas/cinematicSchemas';
import { CinematicChapterFinal } from './CinematicChapterFinal';

const api = vi.hoisted(() => ({ request: vi.fn(), actor: 'actor-1' }));
vi.mock('../../../lib/api/apiClient', () => ({ apiRequest: (...args: unknown[]) => api.request(...args) }));
vi.mock('../../../lib/auth/actorStore', () => ({ getActiveActorId: () => api.actor }));
vi.mock('../../../components/media/VideoMediaPlayer', () => ({ VideoMediaPlayer: ({ videoUrl, title }: { videoUrl: string; title: string }) => <video aria-label={title} data-src={videoUrl} /> }));

// Parent integration can reuse these English strings in the Cinematic catalog.
const labels = {
  'cinematic.chapterFinal.title': 'Chapter Final',
  'cinematic.chapterFinal.openTimeline': 'Edit timeline',
  'cinematic.chapterFinal.empty': 'No Shots in this Chapter.',
  'cinematic.chapterFinal.emptyScene': 'No Shots in this Scene.',
  'cinematic.chapterFinal.checking': 'Checking selected clips',
  'cinematic.chapterFinal.checkUnavailable': 'Selected clip check unavailable. Retry or review the Shots.',
  'cinematic.chapterFinal.bundleTooLarge': 'Selected clips exceed the ZIP limit. Review individual clips in Render.',
  'cinematic.chapterFinal.projectChanged': 'The Chapter changed. Return to Scenes to refresh it.',
  'cinematic.chapterFinal.summary': '{ready} of {total} selected clips ready',
  'cinematic.chapterFinal.preview': 'Selected clip: {title}',
  'cinematic.chapterFinal.noPreview': 'No selected clip available to preview.',
  'cinematic.chapterFinal.selectedTake': 'Selected Take: {id}',
  'cinematic.chapterFinal.usableRange': 'Usable range: {start}s to {end}s',
  'cinematic.chapterFinal.openShot': 'Open Shot: {title}',
  'cinematic.chapterFinal.reason.ready': 'Selected clip ready',
  'cinematic.chapterFinal.reason.no_selection': 'No Take selected',
  'cinematic.chapterFinal.reason.not_ready': 'Selected Take is not approved',
  'cinematic.chapterFinal.reason.source_changed': 'Selected Take source or direction changed. Review this Shot.',
  'cinematic.chapterFinal.reason.source_unavailable': 'Selected clip media is unavailable',
  'cinematic.chapterFinal.reason.checking': 'Checking selected Take',
  'cinematic.chapterFinal.reason.checkUnavailable': 'Selected Take could not be checked',
  'cinematic.chapterFinal.reason.projectChanged': 'Chapter revision changed. Refresh before downloading.',
  'cinematic.shotWriter.backToScenes': 'Back to Scenes',
  'cinematic.produce.openShot': 'Open Shot',
  'cinematic.series.retry': 'Retry',
  'cinematic.bundle.open': 'Download selected clips',
  'cinematic.bundle.description': 'Selected Takes in Scene and Shot order.',
  'cinematic.bundle.preparing': 'Preparing download',
  'cinematic.bundle.summary': '{count} clips / {size} MB',
  'cinematic.bundle.missing': '{count} Shots have no usable selected Take.',
  'cinematic.bundle.shot': 'Scene {scene} / Shot {shot}',
  'cinematic.bundle.allowPartial': 'Download the available selected clips only',
  'cinematic.bundle.download': 'Download ZIP',
  'cinematic.actions.cancel': 'Cancel',
  'cinematic.actions.close': 'Close'
};

function shot(id: string, orderKey: number, approvedVideoAttemptId: string | null = `take-${id}`) {
  return { id, title: `Shot ${id}`, orderKey, approvedVideoAttemptId, durationMs: 4000 } as CinematicShot;
}

function take(shotId: string, overrides: Record<string, unknown> = {}) {
  return { id: `take-${shotId}`, shotId, operation: 'cinematic_draft_clip', status: 'approved',
    outputAsset: { id: `asset-${shotId}`, publicUrl: `/outputs/${shotId}.mp4` },
    usableRange: { trimInMs: 500, trimOutMs: 4000 }, ...overrides };
}

function project() {
  return { id: 'chapter-1', version: 4, title: 'Project', chapterTitle: 'Arrival',
    scenes: [
      { id: 'scene-2', title: 'Second Scene', orderKey: 2, shots: [shot('C', 1, null)], shotOrder: ['C'] },
      { id: 'scene-1', title: 'First Scene', orderKey: 1, shots: [shot('A', 1), shot('B', 2)], shotOrder: ['B', 'A'] }
    ], generationAttempts: [take('A'), take('B'), take('A', { id: 'unselected-newer', outputAsset: { id: 'other', publicUrl: '/outputs/not-selected.mp4' } })]
  } as unknown as CinematicProject;
}

function bundle(projectId = 'chapter-1', projectVersion = 4) {
  return { projectId, projectVersion, sizeBytes: 20,
    clips: ['B', 'A'].map(id => ({ name: `${id}.mp4`, sizeBytes: 10, assetId: `asset-${id}`, shotId: id, attemptId: `take-${id}` })),
    missing: [{ sceneNumber: 2, shotNumber: 1, sceneId: 'scene-2', shotId: 'C', reason: 'no_selection' }] };
}

type Props = ComponentProps<typeof CinematicChapterFinal>;
const clients: QueryClient[] = [];
async function renderFinal(overrides: Partial<Props> = {}) {
  const i18n = i18next.createInstance();
  await i18n.use(initReactI18next).init({ lng: 'en', keySeparator: false, interpolation: { prefix: '{', suffix: '}', escapeValue: false }, resources: { en: { cinematic: labels } } });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  clients.push(client);
  const props: Props = { project: project(), actorId: 'actor-1', onOpenShot: vi.fn(), onBackToScenes: vi.fn(), ...overrides };
  const tree = (value: Props) => <QueryClientProvider client={client}><I18nextProvider i18n={i18n}><CinematicChapterFinal {...value} /></I18nextProvider></QueryClientProvider>;
  const result = render(tree(props));
  return { ...result, props, client, update: (changes: Partial<Props>) => result.rerender(tree({ ...props, ...changes })) };
}

beforeEach(() => {
  onlineManager.setOnline(true);
  api.actor = 'actor-1';
  api.request.mockReset();
  api.request.mockImplementation(async (_path, options) => options.schema.parse(bundle()));
});
afterEach(() => { clients.splice(0).forEach(client => client.clear()); onlineManager.setOnline(true); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('CinematicChapterFinal', () => {
  it('sorts every Scene and honors complete Shot order, previewing only selected Takes without writes', async () => {
    const value = project(), before = JSON.stringify(value);
    const { props } = await renderFinal({ project: value });
    await screen.findByText('2 of 3 selected clips ready');
    expect(screen.getAllByRole('button', { name: /^Open Shot:/ }).map(button => button.getAttribute('aria-label')))
      .toEqual(['Open Shot: Shot B', 'Open Shot: Shot A', 'Open Shot: Shot C']);
    expect(screen.getByLabelText('Selected clip: Shot B', { selector: 'video' })).toHaveAttribute('data-src', '/outputs/B.mp4');
    fireEvent.click(screen.getByRole('button', { name: /Scene 1 \/ Shot 2 Shot A/ }));
    expect(screen.getByLabelText('Selected clip: Shot A', { selector: 'video' })).toHaveAttribute('data-src', '/outputs/A.mp4');
    expect(screen.getByText('Usable range: 0.5s to 4s')).toBeVisible();
    expect(document.querySelector('[data-src="/outputs/not-selected.mp4"]')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Open Shot: Shot A' }));
    expect(props.onOpenShot).toHaveBeenCalledWith('A');
    fireEvent.click(screen.getByRole('button', { name: /Scene 2 \/ Shot 1 Shot C/ }));
    expect(document.querySelector('video')).toBeNull();
    expect(screen.getByText('No selected clip available to preview.')).toBeVisible();
    expect(JSON.stringify(value)).toBe(before);
    expect(api.request).toHaveBeenCalledWith('/api/cinematic/projects/chapter-1/clip-bundle', expect.objectContaining({ signal: expect.any(AbortSignal) }));
    expect(api.request.mock.calls.every(([, options]) => !options.method)).toBe(true);
  });

  it('appends remaining Shots by orderKey without losing pinned order when shotOrder is incomplete or duplicated', async () => {
    const value = project();
    value.scenes[1]!.shotOrder = ['B', 'B'];
    const { update } = await renderFinal({ project: value });
    expect(screen.getAllByRole('button', { name: /^Open Shot:/ }).map(button => button.getAttribute('aria-label')))
      .toEqual(['Open Shot: Shot B', 'Open Shot: Shot A', 'Open Shot: Shot C']);
    const changed = structuredClone(value);
    changed.scenes[1]!.shotOrder = ['B'];
    update({ project: changed });
    expect(screen.getAllByRole('button', { name: /^Open Shot:/ })).toHaveLength(3);
  });

  it.each([
    ['source_changed', 'Selected Take source or direction changed. Review this Shot.'],
    ['packet_changed', 'Selected Take source or direction changed. Review this Shot.']
  ])('shows existing %s evidence but retains the selected historical preview', async (status, message) => {
    const value = project();
    value.generationAttempts[1] = take('B', { downstreamSourceStatus: status });
    const manifest = bundle();
    manifest.clips = manifest.clips.filter(clip => clip.shotId !== 'B');
    manifest.missing.push({ sceneNumber: 1, shotNumber: 1, sceneId: 'scene-1', shotId: 'B', reason: 'source_changed' });
    api.request.mockImplementation(async (_path, options) => options.schema.parse(manifest));
    await renderFinal({ project: value });
    await screen.findByText('1 of 3 selected clips ready');
    expect(screen.getAllByText(message)).toHaveLength(2);
    expect(screen.getByLabelText('Selected clip: Shot B', { selector: 'video' })).toHaveAttribute('data-src', '/outputs/B.mp4');
  });

  it('does not treat an unselected or wrong-Shot Take as a replacement for missing selection', async () => {
    const value = project();
    value.generationAttempts = [take('A', { id: 'take-B' }), take('B', { id: 'newer-B' })];
    const manifest = bundle();
    manifest.clips = [];
    manifest.missing.push(...['B', 'A'].map((id, index) => ({ sceneNumber: 1, shotNumber: index + 1, sceneId: 'scene-1', shotId: id, reason: 'no_selection' })));
    api.request.mockImplementation(async (_path, options) => options.schema.parse(manifest));
    await renderFinal({ project: value });
    await screen.findByText('0 of 3 selected clips ready');
    expect(screen.getAllByText('No Take selected')).toHaveLength(4);
    expect(document.querySelector('video')).toBeNull();
  });

  it('uses canonical source-unavailable reasons and reports unknown omissions without inventing a stale reason', async () => {
    const manifest = bundle();
    manifest.clips = [];
    manifest.missing.push({ sceneNumber: 1, shotNumber: 1, sceneId: 'scene-1', shotId: 'B', reason: 'source_unavailable' });
    api.request.mockImplementation(async (_path, options) => options.schema.parse(manifest));
    await renderFinal();
    await screen.findByText('0 of 3 selected clips ready');
    expect(screen.getAllByText('Selected clip media is unavailable')).toHaveLength(2);
    expect(screen.getByText('Selected Take could not be checked')).toBeVisible();
  });

  it('does not mark a completed but unapproved Take ready or select it implicitly', async () => {
    const value = project();
    value.generationAttempts[1] = take('B', { status: 'completed' });
    const manifest = bundle();
    manifest.clips = manifest.clips.filter(clip => clip.shotId !== 'B');
    manifest.missing.push({ sceneNumber: 1, shotNumber: 1, sceneId: 'scene-1', shotId: 'B', reason: 'not_ready' });
    api.request.mockImplementation(async (_path, options) => options.schema.parse(manifest));
    await renderFinal({ project: value });
    await screen.findByText('1 of 3 selected clips ready');
    expect(screen.getAllByText('Selected Take is not approved')).toHaveLength(2);
    expect(value.scenes[1]!.shots[1]!.approvedVideoAttemptId).toBe('take-B');
    expect(api.request.mock.calls.every(([, options]) => !options.method)).toBe(true);
  });

  it('changes only the preview with keyboard controls and retains focus on the chosen row', async () => {
    const user = userEvent.setup();
    const { props } = await renderFinal();
    await screen.findByText('2 of 3 selected clips ready');
    const row = screen.getByRole('button', { name: /Scene 1 \/ Shot 2 Shot A/ });
    row.focus();
    await user.keyboard('{Enter}');
    expect(row).toHaveFocus();
    expect(row).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Selected clip: Shot A', { selector: 'video' })).toHaveAttribute('data-src', '/outputs/A.mp4');
    await user.tab();
    expect(screen.getByRole('button', { name: 'Open Shot: Shot A' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(props.onOpenShot).toHaveBeenCalledWith('A');
  });

  it('keeps the active Shot across project refresh and stops showing readiness for a different revision', async () => {
    const { update } = await renderFinal();
    await screen.findByText('2 of 3 selected clips ready');
    fireEvent.click(screen.getByRole('button', { name: /Scene 1 \/ Shot 2 Shot A/ }));
    api.request.mockImplementation(async (_path, options) => options.schema.parse(bundle('chapter-1', 6)));
    update({ project: { ...project(), version: 5 } });
    await screen.findByText('The Chapter changed. Return to Scenes to refresh it.');
    expect(screen.getByRole('heading', { name: 'Selected clip: Shot A' })).toBeVisible();
    expect(document.querySelector('video')).toBeNull();
    expect(screen.queryByText('2 of 3 selected clips ready')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Download selected clips' })).not.toBeInTheDocument();
  });

  it('shows pending and sanitized failed checks with Retry, never a false ready state', async () => {
    let reject!: (error: Error) => void;
    api.request.mockImplementationOnce(() => new Promise((_resolve, fail) => { reject = fail; }));
    await renderFinal();
    expect(screen.getByText('Checking selected clips')).toBeVisible();
    expect(screen.queryByText('2 of 3 selected clips ready')).not.toBeInTheDocument();
    await act(async () => reject(new Error('private internal storage path')));
    await screen.findByText('Selected clip check unavailable. Retry or review the Shots.');
    expect(screen.queryByText('private internal storage path')).not.toBeInTheDocument();
    expect(screen.queryByText('Checking selected clips')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await screen.findByText('2 of 3 selected clips ready');
  });

  it('never previews a different Take or asset than the canonical manifest for a ready row', async () => {
    const manifest = bundle();
    manifest.clips[0]!.attemptId = 'unselected-newer';
    api.request.mockImplementation(async (_path, options) => options.schema.parse(manifest));
    const { update } = await renderFinal();
    await screen.findByText('1 of 3 selected clips ready');
    expect(document.querySelector('video')).toBeNull();
    expect(screen.getAllByText('Chapter revision changed. Refresh before downloading.')).toHaveLength(2);
    manifest.clips[0]!.attemptId = 'take-B';
    manifest.clips[0]!.assetId = 'different-asset';
    manifest.projectVersion = 5;
    update({ project: { ...project(), version: 5 } });
    await screen.findByText('1 of 3 selected clips ready');
    expect(document.querySelector('video')).toBeNull();
  });

  it('validates manifest responses and reports ZIP capacity separately from missing selection', async () => {
    api.request.mockImplementationOnce(async (_path, options) => options.schema.parse({ clips: [] }));
    await renderFinal();
    await screen.findByText('Selected clip check unavailable. Retry or review the Shots.');
    api.request.mockRejectedValueOnce(new ApiError({ status: 413, code: 'cinematic_clip_bundle_too_large', message: 'internal' }));
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await screen.findByText('Selected clips exceed the ZIP limit. Review individual clips in Render.');
    expect(screen.getByRole('button', { name: /Scene 2 \/ Shot 1 Shot C/ })).toHaveTextContent('Selected Take could not be checked');
  });

  it('does not spin indefinitely when the manifest query is paused offline', async () => {
    onlineManager.setOnline(false);
    await renderFinal();
    expect(screen.getByText('Selected clip check unavailable. Retry or review the Shots.')).toBeVisible();
    expect(screen.queryByText('Checking selected clips')).not.toBeInTheDocument();
    expect(screen.queryByText('Checking selected Take')).not.toBeInTheDocument();
    expect(api.request).not.toHaveBeenCalled();
    await act(async () => onlineManager.setOnline(true));
    await screen.findByText('2 of 3 selected clips ready');
  });

  it('makes no manifest request for an empty Chapter and keeps the timeline opt-in', async () => {
    const value = project(); value.scenes = [];
    const onBackToScenes = vi.fn(), onOpenTimeline = vi.fn();
    const { update } = await renderFinal({ project: value, onBackToScenes });
    expect(screen.getByText('No Shots in this Chapter.')).toBeVisible();
    expect(api.request).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Edit timeline' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Download selected clips' })).not.toBeInTheDocument();
    update({ project: value, onOpenTimeline });
    fireEvent.click(screen.getByRole('button', { name: 'Edit timeline' }));
    fireEvent.click(screen.getByRole('button', { name: 'Back to Scenes' }));
    expect(onOpenTimeline).toHaveBeenCalledOnce(); expect(onBackToScenes).toHaveBeenCalledOnce();
  });

  it('isolates actor/project queries and ignores a late result from the previous actor', async () => {
    let resolve!: (value: unknown) => void;
    api.request.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    const { update, client } = await renderFinal();
    api.actor = 'actor-2';
    const next = { ...project(), id: 'chapter-2', chapterTitle: 'Other Chapter', generationAttempts: [take('B', { outputAsset: { id: 'asset-B', publicUrl: '/outputs/other-owner.mp4' } })] };
    api.request.mockImplementation(async (_path, options) => options.schema.parse(bundle('chapter-2')));
    update({ actorId: 'actor-2', project: next });
    await screen.findByText('Other Chapter');
    await act(async () => resolve(bundle()));
    expect(screen.getByLabelText('Selected clip: Shot B', { selector: 'video' })).toHaveAttribute('data-src', '/outputs/other-owner.mp4');
    expect(client.getQueryData(['cinematic-clip-bundle', 'actor-2', 'chapter-2', 4])).toBeDefined();
    expect(screen.queryByText('Arrival')).not.toBeInTheDocument();
    update({ actorId: 'actor-1' });
    expect(document.querySelector('video')).toBeNull();
    expect(screen.queryByText('Arrival')).not.toBeInTheDocument();
  });

  it('reuses the real bundle dialog, requires explicit partial consent and restores keyboard focus', async () => {
    const user = userEvent.setup();
    api.request.mockImplementation(async (_path, options) => options.schema.parse(options.method === 'POST' ? new Blob(['zip'], { type: 'application/zip' }) : bundle()));
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:fixture') });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await renderFinal();
    await screen.findByText('2 of 3 selected clips ready');
    const trigger = screen.getByRole('button', { name: 'Download selected clips' });
    trigger.focus();
    await user.keyboard('{Enter}');
    const dialog = await screen.findByRole('dialog');
    await within(dialog).findByText('1 Shots have no usable selected Take.');
    const download = within(dialog).getByRole('button', { name: 'Download ZIP' });
    expect(download).toBeDisabled();
    await user.click(within(dialog).getByRole('checkbox', { name: 'Download the available selected clips only' }));
    await waitFor(() => expect(download).toBeEnabled());
    await user.click(download);
    await waitFor(() => expect(api.request).toHaveBeenCalledWith('/api/cinematic/projects/chapter-1/clip-bundle', expect.objectContaining({ method: 'POST', body: { expectedVersion: 4, allowPartial: true } })));
    await waitFor(() => expect(trigger).toHaveFocus());
    await user.keyboard('{Enter}');
    const reopened = await screen.findByRole('dialog');
    await user.keyboard('{Escape}');
    await waitFor(() => expect(reopened).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });
});

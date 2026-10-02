import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CinematicProject } from '../schemas/cinematicSchemas';
import { CinematicShotWriter } from './CinematicShotWriter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const api = vi.hoisted(() => ({ update: vi.fn(), prepare: vi.fn(), propose: vi.fn() }));
vi.mock('../../../components/media/AuthenticatedMediaImage', () => ({ AuthenticatedMediaImage: ({ src }: { src?: string }) => <img src={src} alt="" /> }));
vi.mock('../../../components/media/GenerationImageViewer', () => ({ GenerationImageViewer: () => <div role="dialog">Full image viewer</div> }));
vi.mock('../api/cinematicSeriesApi', () => ({ updateCinematicShotDocument: (...args: unknown[]) => api.update(...args),
  prepareCinematicShotWriter: (...args: unknown[]) => api.prepare(...args), proposeCinematicShots: (...args: unknown[]) => api.propose(...args) }));
vi.mock('../../../lib/auth/actorStore', () => ({ getActiveActorId: () => 'actor-1' }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string, values?: Record<string, unknown>) => values ? `${key}:${Object.values(values).join('|')}` : key }) }));

const shot = {
  id: 'shot-1', version: 1, orderKey: 1, title: 'Reach down', purpose: 'Begin the encounter', durationMs: 4000,
  shotDocument: 'SHOT DURATION\n4 seconds', shotDocumentVersion: 1, source: 'ai_proposal', shotPlanningStatus: 'ready',
  framing: '', cameraAngle: '', cameraMovement: '', lensIntent: '', blocking: '', performance: '', gaze: '', lighting: '',
  environment: '', audioIntent: '', prompt: '', castAssignmentIds: [], wardrobeLookIds: [], continuityNotes: [], storyboardStatus: 'draft'
};
const scene = {
  id: 'scene-1', version: 2, orderKey: 1, beatId: '', title: 'Flower shop', purpose: 'dramatic', storyChange: '',
  synopsis: 'Lalin reaches down.', location: 'Flower shop', time: 'Night', emotionalStart: '', emotionalEnd: '', transitionIntent: '',
  castAssignmentIds: [], wardrobeLookIds: [], blocking: '', lighting: '', performance: '', audioIntent: '', continuityNotes: [],
  shots: [shot], shotOrder: ['shot-1'], durationMs: 4000
};
const project = { id: 'project-1', projectId: 'project-1', version: 7, title: 'Rain Letters', chapterTitle: 'Arrival', scenes: [scene] } as unknown as CinematicProject;
const prepared = { shotDocument: shot.shotDocument, generatedPrompt: 'A quiet conversation.', sourceFingerprint: 'a'.repeat(64),
  overrideStale: false, maximumPromptCharacters: 12000, dialogue: { cues: [], findings: [], performance: '' }, timing: { findings: [] } };
function renderWriter(props: React.ComponentProps<typeof CinematicShotWriter>) {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><CinematicShotWriter {...props} /></QueryClientProvider>);
}

describe('CinematicShotWriter', () => {
  beforeEach(() => { localStorage.clear(); api.update.mockReset(); api.prepare.mockReset(); api.prepare.mockResolvedValue(prepared); });
  it.each([
    ['processing', 'cinematic.projectTabs.framePending'],
    ['completed', 'cinematic.visuals.reviewFrame'],
    ['failed', 'cinematic.projectTabs.frameFailed']
  ])('retains the selected frame while a replacement is %s', (status, label) => {
    const value = structuredClone(project);
    value.scenes[0]!.shots[0]!.approvedStoryboardSource = { assetId: 'approved', imageUrl: '/approved.png' } as never;
    value.scenes[0]!.shots[0]!.storyboardStatus = 'approved';
    value.generationAttempts = [{ id: 'replacement', shotId: 'shot-1', operation: 'cinematic_storyboard_still', status }];
    renderWriter({ actorId: 'actor-1', project: value, shotId: 'shot-1', online: true, onBackToScenes: vi.fn(), onOpenShot: vi.fn(), onProjectChanged: vi.fn() });
    expect(screen.getByText(label)).toBeVisible();
    expect(document.querySelector('.cinematic-shot-writer__frame img')).toHaveAttribute('src', '/approved.png');
  });

  it('pairs the current First Frame with script, preserves draft on image refresh and never auto-generates', async () => {
    const value = structuredClone(project);
    value.scenes[0]!.shots[0]!.approvedStoryboardSource = { assetId: 'image-a', imageUrl: '/image-a.png' } as never;
    const open = vi.fn();
    const props = { actorId: 'actor-1', project: value, shotId: 'shot-1', online: true, onBackToScenes: vi.fn(), onOpenShot: vi.fn(), onProjectChanged: vi.fn(), onOpenFirstFrame: open };
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const view = render(<QueryClientProvider client={client}><CinematicShotWriter {...props} /></QueryClientProvider>);
    const pair = document.querySelector('.cinematic-shot-writer__frame-script')!;
    expect(pair).toContainElement(screen.getByLabelText('cinematic.shotWriter.direction'));
    expect(pair.querySelector('img')).toHaveAttribute('src', '/image-a.png');
    expect(document.querySelectorAll('.cinematic-shot-writer__frame')).toHaveLength(1);
    expect(open).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('cinematic.shotWriter.direction'), { target: { value: 'Keep this edit' } });
    const updated = structuredClone(value);
    updated.version += 1; updated.scenes[0]!.shots[0]!.version += 1;
    updated.scenes[0]!.shots[0]!.approvedStoryboardSource!.imageUrl = '/image-b.png';
    view.rerender(<QueryClientProvider client={client}><CinematicShotWriter {...props} project={updated} /></QueryClientProvider>);
    expect(screen.getByLabelText('cinematic.shotWriter.direction')).toHaveValue('Keep this edit');
    expect(pair.querySelector('img')).toHaveAttribute('src', '/image-b.png');
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.projectTabs.inspectFrame' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Full image viewer');
    expect(open).not.toHaveBeenCalled();
    const nextShot = { ...updated.scenes[0]!.shots[0]!, id: 'shot-2', shotDocument: 'Next script', approvedStoryboardSource: { assetId: 'image-c', imageUrl: '/image-c.png' } };
    updated.scenes[0]!.shots.push(nextShot as never);
    view.rerender(<QueryClientProvider client={client}><CinematicShotWriter {...props} project={structuredClone(updated)} shotId="shot-2" /></QueryClientProvider>);
    await waitFor(() => expect(screen.getByLabelText('cinematic.shotWriter.direction')).toHaveValue('Next script'));
    expect(pair.querySelector('img')).toHaveAttribute('src', '/image-c.png');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('recovers custom Video Prompt text explicitly and preserves it through server refresh', async () => {
    const props = { actorId: 'actor-1', project, shotId: 'shot-1', online: true, onBackToScenes: vi.fn(), onOpenShot: vi.fn(), onProjectChanged: vi.fn() };
    const first = renderWriter(props);
    fireEvent.click(screen.getByText('cinematic.shotWorkspace.videoPrompt'));
    const editor = await screen.findByRole('textbox', { name: 'cinematic.shotWorkspace.videoPrompt' });
    await waitFor(() => expect(editor).toHaveValue(prepared.generatedPrompt));
    fireEvent.change(editor, { target: { value: 'Unfinished prompt' } });
    first.unmount();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const view = render(<QueryClientProvider client={client}><CinematicShotWriter {...props} /></QueryClientProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.recovery.restore' }));
    const changed = { ...project, version: 8, scenes: [{ ...scene, shots: [{ ...shot, version: 2, shotDocument: 'Server direction' }] }] } as unknown as CinematicProject;
    view.rerender(<QueryClientProvider client={client}><CinematicShotWriter {...props} project={changed} /></QueryClientProvider>);
    fireEvent.click(screen.getByText('cinematic.shotWorkspace.videoPrompt'));
    expect(await screen.findByRole('textbox', { name: 'cinematic.shotWorkspace.videoPrompt' })).toHaveValue('Unfinished prompt');
    expect(screen.getByLabelText('cinematic.shotWriter.direction')).toHaveValue(shot.shotDocument);
    expect(screen.getByRole('button', { name: 'cinematic.shotWriter.backToScenes' })).toBeDisabled();
    expect(api.update).not.toHaveBeenCalled();
  });

  it('edits and saves one canonical Shot document', async () => {
    const saved = { ...project, version: 8, scenes: [{ ...scene, version: 3, shots: [{ ...shot, version: 2, shotDocument: 'CUSTOM NOTE' }] }] } as unknown as CinematicProject;
    api.update.mockResolvedValue({ project: saved, scene: saved.scenes[0]!, shot: saved.scenes[0]!.shots[0]! });
    const onProjectChanged = vi.fn();
    renderWriter({ actorId: 'actor-1', project, shotId: 'shot-1', online: true, onBackToScenes: vi.fn(), onOpenShot: vi.fn(), onProjectChanged });
    fireEvent.change(screen.getByLabelText('cinematic.shotWriter.direction'), { target: { value: 'CUSTOM NOTE' } });
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.shotWriter.save' }));
    await waitFor(() => expect(api.update).toHaveBeenCalledWith('project-1', 'scene-1', 'shot-1', expect.objectContaining({
      expectedVersion: 7, expectedShotVersion: 1, durationMs: 4000, shotDocument: 'CUSTOM NOTE'
    })));
    expect(onProjectChanged).toHaveBeenCalledWith(saved);
  });

  it('keeps Shot navigation disabled while the document has unsaved changes', () => {
    renderWriter({ actorId: 'actor-1', project, shotId: 'shot-1', online: true, onBackToScenes: vi.fn(), onOpenShot: vi.fn(), onProjectChanged: vi.fn() });
    fireEvent.change(screen.getByLabelText('cinematic.shotWriter.direction'), { target: { value: 'Changed direction' } });
    expect(screen.getByText('cinematic.shotWriter.unsaved')).toBeVisible();
    expect(screen.getByRole('button', { name: 'cinematic.shotWriter.backToScenes' })).toBeDisabled();
  });

  it('opens first-frame tools for the selected Shot and preserves a single editable document', () => {
    const open = vi.fn();
    const back = vi.fn();
    renderWriter({ actorId: 'actor-1', project, shotId: 'shot-1', online: true, onBackToScenes: back, onOpenShot: vi.fn(), onProjectChanged: vi.fn(), onOpenFirstFrame: open });
    expect(screen.getByRole('region', { name: 'cinematic.visuals.environment' })).toHaveTextContent('Flower shop');
    expect(screen.queryByText('cinematic.visuals.preparationPending')).not.toBeInTheDocument();
    expect(document.querySelectorAll('textarea')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.visuals.openFrameTools' }));
    expect(open).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.visuals.manageScene' }));
    expect(back).toHaveBeenCalledOnce();
    fireEvent.change(screen.getByLabelText('cinematic.shotWriter.direction'), { target: { value: 'Unsaved revision' } });
    expect(screen.getByRole('button', { name: 'cinematic.visuals.openFrameTools' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'cinematic.visuals.manageScene' })).toBeDisabled();
  });

  it('saves an editable Video Prompt separately without changing Shot prose', async () => {
    api.update.mockResolvedValue({ project });
    renderWriter({ actorId: 'actor-1', project, shotId: 'shot-1', online: true, onBackToScenes: vi.fn(), onOpenShot: vi.fn(), onProjectChanged: vi.fn() });
    fireEvent.click(screen.getByText('cinematic.shotWorkspace.videoPrompt'));
    const editor = await screen.findByRole('textbox', { name: 'cinematic.shotWorkspace.videoPrompt' });
    await waitFor(() => expect(editor).toHaveValue(prepared.generatedPrompt));
    fireEvent.change(editor, { target: { value: 'My own video direction' } });
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.shotWorkspace.savePrompt' }));
    await waitFor(() => expect(api.update).toHaveBeenCalledWith('project-1', 'scene-1', 'shot-1', expect.objectContaining({
      shotDocument: shot.shotDocument, videoPromptOverride: { text: 'My own video direction', sourceFingerprint: prepared.sourceFingerprint }
    })));
  });

  it('retains a stale custom prompt and requires review before video navigation', async () => {
    const value = structuredClone(project);
    value.scenes[0]!.shots[0]!.videoPromptOverride = { text: 'Keep my edit', sourceFingerprint: 'b'.repeat(64) };
    api.prepare.mockResolvedValue({ ...prepared, overrideStale: true });
    renderWriter({ actorId: 'actor-1', project: value, shotId: 'shot-1', online: true, onBackToScenes: vi.fn(), onOpenShot: vi.fn(), onProjectChanged: vi.fn(), onOpenVideo: vi.fn() });
    fireEvent.click(screen.getByText('cinematic.shotWorkspace.videoPrompt'));
    expect(await screen.findByDisplayValue('Keep my edit')).toBeVisible();
    await screen.findByText('cinematic.shotWorkspace.stale');
    expect(screen.getByRole('button', { name: 'cinematic.shotWorkspace.openVideo' })).toBeDisabled();
  });

  it('loads legacy dialogue from the canonical preparation before enabling save', async () => {
    const value = structuredClone(project);
    delete value.scenes[0]!.shots[0]!.shotDocument;
    api.prepare.mockResolvedValue({ ...prepared, shotDocument: 'DIALOGUE AND FACIAL PERFORMANCE\nLalin: Thank you.' });
    renderWriter({ actorId: 'actor-1', project: value, shotId: 'shot-1', online: true, onBackToScenes: vi.fn(), onOpenShot: vi.fn(), onProjectChanged: vi.fn() });
    await waitFor(() => expect(screen.getByLabelText('cinematic.shotWriter.direction')).toHaveValue('DIALOGUE AND FACIAL PERFORMANCE\nLalin: Thank you.'));
    expect(screen.getByRole('button', { name: 'cinematic.shotWriter.save' })).toBeDisabled();
  });
});

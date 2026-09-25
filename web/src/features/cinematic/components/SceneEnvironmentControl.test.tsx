import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18next from 'i18next';
import { useState, type ReactNode } from 'react';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { CinematicProject } from '../schemas/cinematicSchemas';
import { SceneEnvironmentControl } from './SceneEnvironmentControl';

const mocks = vi.hoisted(() => ({ context: vi.fn(), list: vi.fn(), save: vi.fn(), approve: vi.fn(), propose: vi.fn() }));
vi.mock('../api/cinematicApi', async original => ({ ...await original<object>(),
  getCinematicSceneEnvironment: mocks.context, listCinematicSceneEnvironmentImages: mocks.list,
  saveCinematicSceneEnvironment: mocks.save, approveCinematicSceneEnvironment: mocks.approve,
  proposeCinematicSceneEnvironment: mocks.propose }));
vi.mock('../../../lib/auth/ActorProvider', () => ({ useActor: () => ({ actor: { userId: 'owner' } }) }));
vi.mock('../../../components/media/AuthenticatedMediaImage', () => ({ AuthenticatedMediaImage: (props: object) => <img {...props} /> }));
vi.mock('../../../components/generation/GenerationExperience', () => ({
  GenerationExperience: ({ onCompleted, renderWorkspace }: {
    onCompleted?: (jobId: string) => void;
    renderWorkspace?: (regions: Record<string, ReactNode>) => ReactNode;
  }) => <div data-testid="existing-generation">{renderWorkspace?.({ result: null, prompt: null, engine: null,
    queue: null, messages: null, actions: <button onClick={() => onCompleted?.('job_new')}>Finish scene render</button> })}</div>
}));

let current: CinematicProject;
const source = { assetId: 'scene_asset', contentHash: 'a'.repeat(64), sourceJobId: 'job_a', imageUrl: '/a.jpg', thumbnailUrl: '/a.jpg' };
beforeEach(async () => {
  vi.clearAllMocks();
  await i18next.use(initReactI18next).init({ lng: 'en', fallbackLng: 'en', keySeparator: false, resources: {} });
  current = { id: 'project', version: 1, aspectRatio: '9:16', generationAttempts: [],
    scenes: [{ id: 'scene', version: 1, title: 'Rainy street', shots: [], approvedEnvironmentSource: source }] } as unknown as CinematicProject;
  mocks.context.mockImplementation(async () => ({ projectId: current.id, projectVersion: current.version,
    sceneId: 'scene', sceneVersion: current.scenes[0]!.version, environmentPrompt: 'Rainy street',
    compiledPrompt: 'Empty location', promptFingerprint: 'f', approvedSource: current.scenes[0]!.approvedEnvironmentSource }));
  mocks.list.mockResolvedValue({ items: [
    { jobId: 'job_a', sceneId: 'scene', sceneTitle: 'Rainy street', imageUrl: '/a.jpg', thumbnailUrl: '/a.jpg' },
    { jobId: 'job_b', sceneId: 'other', sceneTitle: 'Older courtyard', imageUrl: '/b.jpg', thumbnailUrl: '/b.jpg' }
  ], nextCursor: null });
  mocks.propose.mockResolvedValue({ proposalId: 'proposal', environmentPrompt: 'Empty flower shop pavement in heavy rain.',
    warnings: [], provenance: { provider: 'fixture', model: 'fixture', responseId: null }, billingStatus: 'qualification_no_charge' });
  mocks.save.mockImplementation(async (_p, _s, input) => {
    current = structuredClone(current); current.version++; current.scenes[0]!.version++;
    if (input.referenceEnabled !== undefined) current.scenes[0]!.environmentReferenceEnabled = input.referenceEnabled;
    return current;
  });
  mocks.approve.mockImplementation(async (_p, _s, input) => {
    current = structuredClone(current); current.version++; current.scenes[0]!.version++;
    current.scenes[0]!.approvedEnvironmentSource = { ...current.scenes[0]!.approvedEnvironmentSource!, sourceJobId: input.jobId, imageUrl: '/b.jpg', thumbnailUrl: '/b.jpg' };
    current.scenes[0]!.environmentReferenceEnabled = true;
    return current;
  });
});
afterEach(cleanup);

function setup(compact = false) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  function Harness() {
    const [project, setProject] = useState(current);
    return <SceneEnvironmentControl project={project} scene={project.scenes[0]!} compact={compact} onProjectRefresh={() => setProject(current)} />;
  }
  render(<QueryClientProvider client={client}><I18nextProvider i18n={i18next}><Harness /></I18nextProvider></QueryClientProvider>);
}

it('defaults to enabled and retains the selected image while toggled off and on', async () => {
  setup();
  const toggle = screen.getByRole('switch', { name: 'cinematic.environment.enabled' });
  expect(toggle).toHaveAttribute('aria-checked', 'true');
  fireEvent.click(toggle);
  await waitFor(() => expect(toggle).toHaveAttribute('aria-checked', 'false'));
  expect(mocks.save).toHaveBeenCalledWith('project', 'scene', { expectedVersion: 1, expectedSceneVersion: 1, referenceEnabled: false });
  expect(screen.getByRole('img')).toHaveAttribute('src', '/a.jpg');
  fireEvent.click(toggle);
  await waitFor(() => expect(toggle).toHaveAttribute('aria-checked', 'true'));
  expect(mocks.approve).not.toHaveBeenCalled();
});

it('compact Scene row keeps name, preview, selection action and disabled selection together', async () => {
  setup(true);
  expect(screen.getByText('Rainy street')).toBeInTheDocument();
  expect(screen.getByAltText('Rainy street')).toHaveAttribute('src', '/a.jpg');
  const toggle = screen.getByRole('switch');
  fireEvent.click(toggle);
  await waitFor(() => expect(toggle).toHaveAttribute('aria-checked', 'false'));
  expect(screen.getByText(/cinematic.storyboard.referenceInactive/)).toBeInTheDocument();
  expect(screen.getByAltText('Rainy street')).toHaveAttribute('src', '/a.jpg');
  expect(screen.getByRole('button', { name: 'cinematic.environment.edit' })).toBeEnabled();
});

it('compact empty Scene row reserves preview space without inventing a toggle', () => {
  current.scenes[0]!.approvedEnvironmentSource = null;
  setup(true);
  expect(document.querySelector('.cinematic-scene-environment__preview')).not.toBeNull();
  expect(screen.getByRole('button', { name: 'cinematic.environment.generate' })).toBeEnabled();
  expect(screen.queryByRole('switch')).not.toBeInTheDocument();
});

it('shows Project images and explicitly selects an older image without replacing generation controls', async () => {
  setup();
  fireEvent.click(screen.getByRole('button', { name: 'cinematic.environment.edit' }));
  const older = await screen.findByRole('button', { name: 'cinematic.environment.select: Older courtyard' });
  const direction = screen.getByText('cinematic.environment.direction');
  const generate = screen.getByRole('heading', { level: 3, name: 'cinematic.environment.generate' });
  const gallery = screen.getByRole('heading', { level: 3, name: 'cinematic.environment.gallery' });
  expect(direction.compareDocumentPosition(generate) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(generate.compareDocumentPosition(gallery) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(mocks.approve).not.toHaveBeenCalled();
  expect(screen.getByTestId('existing-generation')).toBeInTheDocument();
  fireEvent.click(older);
  await waitFor(() => expect(screen.getByRole('button', { name: 'cinematic.environment.select: Older courtyard' })).toHaveAttribute('aria-pressed', 'true'));
  expect(mocks.approve).toHaveBeenCalledWith('project', 'scene', { expectedVersion: 1, jobId: 'job_b', reuse: true });
});

it('shows a newly completed Scene image in the open Project gallery without approving it', async () => {
  setup();
  fireEvent.click(screen.getByRole('button', { name: 'cinematic.environment.edit' }));
  await screen.findByRole('button', { name: 'cinematic.environment.select: Older courtyard' });
  mocks.list.mockResolvedValue({ items: [
    { jobId: 'job_new', sceneId: 'scene', sceneTitle: 'New rainy street', imageUrl: '/new.jpg', thumbnailUrl: '/new.jpg' },
    { jobId: 'job_a', sceneId: 'scene', sceneTitle: 'Rainy street', imageUrl: '/a.jpg', thumbnailUrl: '/a.jpg' }
  ], nextCursor: null });
  fireEvent.click(screen.getByRole('button', { name: 'Finish scene render' }));
  const candidate = await screen.findByRole('button', { name: 'cinematic.environment.select: New rainy street' });
  expect(candidate).toHaveAttribute('aria-pressed', 'false');
  expect(mocks.approve).not.toHaveBeenCalled();
});

it('reconciles a completed image that reaches the Project gallery after the Job result', async () => {
  setup();
  fireEvent.click(screen.getByRole('button', { name: 'cinematic.environment.edit' }));
  await screen.findByRole('button', { name: 'cinematic.environment.select: Older courtyard' });
  let reads = 0;
  mocks.list.mockImplementation(async () => ({ items: ++reads < 3
    ? [{ jobId: 'job_a', sceneId: 'scene', sceneTitle: 'Rainy street', imageUrl: '/a.jpg', thumbnailUrl: '/a.jpg' }]
    : [{ jobId: 'job_new', sceneId: 'scene', sceneTitle: 'New rainy street', imageUrl: '/new.jpg', thumbnailUrl: '/new.jpg' }],
  nextCursor: null }));
  fireEvent.click(screen.getByRole('button', { name: 'Finish scene render' }));
  expect(await screen.findByRole('button', { name: 'cinematic.environment.select: New rainy street' }, { timeout: 4000 })).toBeVisible();
  expect(mocks.approve).not.toHaveBeenCalled();
});

it('stops delayed gallery checks when the Scene dialog closes', async () => {
  setup();
  fireEvent.click(screen.getByRole('button', { name: 'cinematic.environment.edit' }));
  await screen.findByRole('button', { name: 'cinematic.environment.select: Older courtyard' });
  const initialReads = mocks.list.mock.calls.length;
  mocks.list.mockResolvedValue({ items: [
    { jobId: 'job_a', sceneId: 'scene', sceneTitle: 'Rainy street', imageUrl: '/a.jpg', thumbnailUrl: '/a.jpg' }
  ], nextCursor: null });
  fireEvent.click(screen.getByRole('button', { name: 'Finish scene render' }));
  await waitFor(() => expect(mocks.list.mock.calls.length).toBeGreaterThanOrEqual(initialReads + 2));
  fireEvent.click(screen.getAllByRole('button', { name: 'cinematic.actions.close' }).at(-1)!);
  const readsAtClose = mocks.list.mock.calls.length;
  await new Promise(resolve => window.setTimeout(resolve, 1700));
  expect(mocks.list).toHaveBeenCalledTimes(readsAtClose);
});

it('reloads Project images when reopened after a render completed in the background', async () => {
  setup();
  fireEvent.click(screen.getByRole('button', { name: 'cinematic.environment.edit' }));
  await screen.findByRole('button', { name: 'cinematic.environment.select: Older courtyard' });
  fireEvent.click(screen.getAllByRole('button', { name: 'cinematic.actions.close' }).at(-1)!);
  mocks.list.mockResolvedValue({ items: [
    { jobId: 'job_new', sceneId: 'scene', sceneTitle: 'New rainy street', imageUrl: '/new.jpg', thumbnailUrl: '/new.jpg' }
  ], nextCursor: null });
  fireEvent.click(screen.getByRole('button', { name: 'cinematic.environment.edit' }));
  expect(await screen.findByRole('button', { name: 'cinematic.environment.select: New rainy street' })).toBeVisible();
  expect(mocks.approve).not.toHaveBeenCalled();
});

it('keeps current selection on errors and protects unsaved direction from gallery selection', async () => {
  mocks.save.mockRejectedValue(new Error('Save failed'));
  setup();
  fireEvent.click(screen.getByRole('switch'));
  expect(await screen.findByRole('alert')).toHaveTextContent('Save failed');
  expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  fireEvent.click(screen.getByRole('button', { name: 'cinematic.environment.edit' }));
  const older = await screen.findByRole('button', { name: 'cinematic.environment.select: Older courtyard' });
  fireEvent.change(screen.getByRole('textbox', { name: 'cinematic.environment.direction' }), { target: { value: 'Unsaved change' } });
  expect(older).toBeDisabled();
  expect(mocks.approve).not.toHaveBeenCalled();
});

it('writes a context proposal into the editable draft without saving or generating media', async () => {
  setup();
  fireEvent.click(screen.getByRole('button', { name: 'cinematic.environment.edit' }));
  const textarea = await screen.findByRole('textbox', { name: 'cinematic.environment.direction' });
  const generate = screen.getByRole('button', { name: 'cinematic.environment.generateDescription' });
  await waitFor(() => expect(generate).toBeEnabled());
  fireEvent.click(generate);
  await waitFor(() => expect(mocks.propose).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(textarea).toHaveValue('Empty flower shop pavement in heavy rain.'));
  expect(mocks.propose).toHaveBeenCalledWith('project', 'scene', {
    expectedVersion: 1, expectedSceneVersion: 1, currentDirection: 'Rainy street'
  });
  expect(mocks.save).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'cinematic.environment.save' })).toBeEnabled();
});

it('preserves the current draft when scene description generation fails', async () => {
  mocks.propose.mockRejectedValueOnce(new Error('Proposal unavailable'));
  setup();
  fireEvent.click(screen.getByRole('button', { name: 'cinematic.environment.edit' }));
  const textarea = await screen.findByRole('textbox', { name: 'cinematic.environment.direction' });
  const generate = screen.getByRole('button', { name: 'cinematic.environment.generateDescription' });
  await waitFor(() => expect(generate).toBeEnabled());
  fireEvent.change(textarea, { target: { value: 'Keep this draft' } });
  fireEvent.click(generate);
  expect(await screen.findByRole('alert')).toHaveTextContent('Proposal unavailable');
  expect(textarea).toHaveValue('Keep this draft');
  expect(mocks.save).not.toHaveBeenCalled();
});

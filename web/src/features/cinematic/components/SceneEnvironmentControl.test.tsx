import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18next from 'i18next';
import { useState } from 'react';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { CinematicProject } from '../schemas/cinematicSchemas';
import { SceneEnvironmentControl } from './SceneEnvironmentControl';

const mocks = vi.hoisted(() => ({ context: vi.fn(), list: vi.fn(), save: vi.fn(), approve: vi.fn() }));
vi.mock('../api/cinematicApi', async original => ({ ...await original<object>(),
  getCinematicSceneEnvironment: mocks.context, listCinematicSceneEnvironmentImages: mocks.list,
  saveCinematicSceneEnvironment: mocks.save, approveCinematicSceneEnvironment: mocks.approve }));
vi.mock('../../../lib/auth/ActorProvider', () => ({ useActor: () => ({ actor: { userId: 'owner' } }) }));
vi.mock('../../../components/media/AuthenticatedMediaImage', () => ({ AuthenticatedMediaImage: (props: object) => <img {...props} /> }));
vi.mock('../../../components/generation/GenerationExperience', () => ({ GenerationExperience: () => <div data-testid="existing-generation" /> }));

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

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  function Harness() {
    const [project, setProject] = useState(current);
    return <SceneEnvironmentControl project={project} scene={project.scenes[0]!} onProjectRefresh={() => setProject(current)} />;
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

it('shows Project images and explicitly selects an older image without replacing generation controls', async () => {
  setup();
  fireEvent.click(screen.getByRole('button', { name: 'cinematic.environment.edit' }));
  const older = await screen.findByRole('button', { name: 'cinematic.environment.select: Older courtyard' });
  expect(mocks.approve).not.toHaveBeenCalled();
  expect(screen.getByTestId('existing-generation')).toBeInTheDocument();
  fireEvent.click(older);
  await waitFor(() => expect(screen.getByRole('button', { name: 'cinematic.environment.select: Older courtyard' })).toHaveAttribute('aria-pressed', 'true'));
  expect(mocks.approve).toHaveBeenCalledWith('project', 'scene', { expectedVersion: 1, jobId: 'job_b', reuse: true });
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

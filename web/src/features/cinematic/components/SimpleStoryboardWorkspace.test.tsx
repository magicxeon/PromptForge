import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import en from '../../../../../client/i18n/locales/en/cinematic.json';
import th from '../../../../../client/i18n/locales/th/cinematic.json';
import { ApiError } from '../../../lib/api/apiError';
import type { CinematicProject, CinematicScene, CinematicShot } from '../schemas/cinematicSchemas';
import { SimpleStoryboardWorkspace, type SimpleStoryboardWorkspaceProps } from './SimpleStoryboardWorkspace';

const api = vi.hoisted(() => ({ create: vi.fn(), save: vi.fn() }));
vi.mock('../api/cinematicApi', () => ({
  createCinematicSimpleScene: api.create,
  saveCinematicManualStoryboard: api.save
}));
vi.mock('../../../components/media/AuthenticatedMediaImage', () => ({
  AuthenticatedMediaImage: ({ src, alt, fallback }: { src?: string; alt: string; fallback?: React.ReactNode }) =>
    src ? <img src={src} alt={alt} /> : fallback
}));
vi.mock('./produce/ClipBundleDownload', () => ({
  ClipBundleDownload: ({ projectId, version }: { projectId: string; version: number }) =>
    <button type="button" data-testid="clip-bundle" data-project={projectId} data-version={version}>Download selected clips</button>
}));

const i18n = i18next.createInstance();
beforeAll(async () => {
  await i18n.use(initReactI18next).init({ lng: 'en', fallbackLng: 'en', keySeparator: false,
    resources: { en: { cinematic: en }, th: { cinematic: th } },
    interpolation: { escapeValue: false, prefix: '{', suffix: '}' } });
});
beforeEach(async () => {
  vi.clearAllMocks();
  api.create.mockReset();
  api.save.mockReset();
  await i18n.changeLanguage('en');
});

describe('SimpleStoryboardWorkspace manual rows (039)', () => {
  it('mounts only active engines, keeps inactive drafts mounted, and groups image before video', () => {
    const project = fixture();
    const { image, video } = setup(project);
    expect(screen.getAllByTestId('image-engine')).toHaveLength(1);
    expect(screen.getAllByTestId('video-engine')).toHaveLength(1);
    expect(screen.getAllByTestId('clip-bundle')).toHaveLength(1);
    expect(screen.getByTestId('clip-bundle')).toHaveAttribute('data-project', project.id);
    const prompt = screen.getByRole('textbox', { name: 'Image prompt' });
    fireEvent.change(prompt, { target: { value: 'A new opening, not the ending' } });
    expect(screen.getByTestId('image-engine')).toHaveTextContent('Save changes before generating.');
    const firstDraft = prompt.closest('.cinematic-manual__draft');
    const firstImage = screen.getByTestId('image-engine');
    expect(firstImage.closest('section')).toHaveClass('cinematic-manual__image');
    expect(screen.getByTestId('video-engine').closest('section')).toHaveClass('cinematic-manual__video');
    expect(firstImage.compareDocumentPosition(screen.getByRole('spinbutton', { name: 'Clip duration (seconds)' }))
      & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Scene 1 \/ Shot 2/ }));
    expect(prompt).toBeInTheDocument();
    expect(firstDraft).toHaveAttribute('hidden');
    expect(screen.getByRole('textbox', { name: 'Image prompt' })).toHaveValue('Second image');
    expect(screen.getAllByTestId('image-engine')).toHaveLength(1);
    expect(screen.getByTestId('image-engine')).toHaveAttribute('data-shot', 'shot-2');
    fireEvent.click(screen.getByRole('button', { name: /Scene 1 \/ Shot 1/ }));
    expect(screen.getByRole('textbox', { name: 'Image prompt' })).toBe(prompt);
    expect(prompt).toHaveValue('A new opening, not the ending');
    expect(image.mock.calls.at(-1)?.[1]).toBe(project.scenes[0]!.shots[0]);
    expect(video.mock.calls.at(-1)?.[2]).toBe('Save changes before generating.');
    expect(api.save).not.toHaveBeenCalled();
    expect(api.create).not.toHaveBeenCalled();
  });

  it('saves exact authored events and optimistic versions without sibling, audio or media mutation', async () => {
    const project = fixture();
    const before = structuredClone(project);
    const next = savedProject(project, { title: 'Changed title', prompt: 'Changed image',
      videoActionTimeline: [{ startMs: 250, endMs: 3750, description: '  Turn, then pause.\nKeep the door closed.  ' }] });
    let resolve!: (project: CinematicProject) => void;
    api.save.mockReturnValue(new Promise<CinematicProject>(done => { resolve = done; }));
    const view = setup(project);
    expect(view.dirty.mock.calls).toEqual([[false]]);
    fireEvent.change(screen.getByRole('textbox', { name: 'Title' }), { target: { value: 'Changed title' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Image prompt' }), { target: { value: 'Changed image' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Start (seconds)' }), { target: { value: '0.25' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'End (seconds)' }), { target: { value: '3.75' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Action description' }), {
      target: { value: '  Turn, then pause.\nKeep the door closed.  ' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(api.save).toHaveBeenCalledExactlyOnceWith('project-1', 'scene-1', 'shot-1', {
      expectedVersion: 4, expectedShotVersion: 2, title: 'Changed title', imagePrompt: 'Changed image',
      durationMs: 5000, castAssignmentIds: ['cast-1'], wardrobeLookIds: ['look-1'],
      videoActionTimeline: [{ startMs: 250, endMs: 3750, description: '  Turn, then pause.\nKeep the door closed.  ' }]
    });
    expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Add Scene' })).toBeDisabled();
    expect(screen.getByRole('textbox', { name: 'Image prompt' })).toBeDisabled();
    expect(document.querySelector('[data-processing-spinner]')).toBeInTheDocument();
    expect(screen.getByTestId('video-engine')).toHaveTextContent('Saving changes.');
    expect(view.dirty.mock.calls).toEqual([[false], [true]]);
    await act(async () => resolve(next));
    await waitFor(() => expect(view.changed).toHaveBeenCalledWith(next));
    view.rerender(next);
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(screen.getByTestId('image-engine')).toHaveTextContent('ready');
    expect(view.dirty.mock.calls).toEqual([[false], [true], [false]]);
    expect(project).toEqual(before);
    expect(next.scenes[0]!.shots[1]).toEqual(before.scenes[0]!.shots[1]);
    expect(screen.getByAltText('Saved first-frame image: Changed title')).toHaveAttribute('src', '/old-image.png');
  });

  it('retains a conflict draft after refresh and requires explicit rebasing before Save', async () => {
    const project = fixture();
    api.save.mockRejectedValueOnce(new ApiError({ status: 409, code: 'cinematic_project_version_conflict', message: 'Changed' }));
    const view = setup(project);
    const prompt = screen.getByRole('textbox', { name: 'Image prompt' });
    fireEvent.change(prompt, { target: { value: 'Keep this local image' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await screen.findByRole('alert');
    expect(prompt).toHaveValue('Keep this local image');
    expect(view.dirty).toHaveBeenLastCalledWith(true);
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh project' }));
    expect(view.refresh).toHaveBeenCalledOnce();
    const refreshed = savedProject(project, { prompt: 'Someone else changed this' });
    view.rerender(refreshed);
    expect(prompt).toHaveValue('Keep this local image');
    fireEvent.click(screen.getByRole('button', { name: 'Keep my edits over latest' }));
    expect(view.dirty.mock.calls).toEqual([[false], [true]]);
    expect(api.save).toHaveBeenCalledOnce();
    api.save.mockResolvedValueOnce(savedProject(refreshed, { prompt: 'Keep this local image' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(api.save).toHaveBeenCalledTimes(2));
    expect(api.save.mock.calls[1]?.[3]).toMatchObject({ expectedVersion: 5, expectedShotVersion: 3, imagePrompt: 'Keep this local image' });
    await waitFor(() => expect(view.changed).toHaveBeenCalledOnce());
  });

  it('aggregates inactive dirty rows until every row is saved or restored', async () => {
    const project = fixture();
    const next = savedProject(project, { prompt: 'Saved first edit' });
    api.save.mockResolvedValueOnce(next);
    const view = setup(project);
    fireEvent.change(screen.getByRole('textbox', { name: 'Image prompt' }), { target: { value: 'Saved first edit' } });
    fireEvent.click(screen.getByRole('button', { name: /Scene 1 \/ Shot 2/ }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Image prompt' }), { target: { value: 'Unsaved second edit' } });
    fireEvent.click(screen.getByRole('button', { name: /Scene 1 \/ Shot 1/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(view.changed).toHaveBeenCalledWith(next));
    view.rerender(next);
    expect(view.dirty.mock.calls).toEqual([[false], [true]]);
    fireEvent.click(screen.getByRole('button', { name: /Scene 1 \/ Shot 2/ }));
    expect(screen.getByRole('textbox', { name: 'Image prompt' })).toHaveValue('Unsaved second edit');
    fireEvent.change(screen.getByRole('textbox', { name: 'Image prompt' }), { target: { value: 'Second image' } });
    expect(view.dirty.mock.calls).toEqual([[false], [true], [false]]);
  });

  it('unregisters removed rows and releases the dirty guard when the workspace unmounts', () => {
    const project = fixture();
    const view = setup(project);
    fireEvent.change(screen.getByRole('textbox', { name: 'Image prompt' }), { target: { value: 'Removed row draft' } });
    view.rerender({ ...project, version: 5, scenes: project.scenes.map(scene => ({
      ...scene, shots: scene.shots.slice(1), shotOrder: ['shot-2']
    })) });
    expect(view.dirty).toHaveBeenLastCalledWith(false);
    fireEvent.change(screen.getByRole('textbox', { name: 'Image prompt' }), { target: { value: 'Remaining row draft' } });
    expect(view.dirty).toHaveBeenLastCalledWith(true);
    view.unmount();
    expect(view.dirty).toHaveBeenLastCalledWith(false);
  });

  it('keeps failed drafts and errors visible when another row is opened', async () => {
    api.save.mockRejectedValueOnce(new Error('Network error'));
    setup(fixture());
    const prompt = screen.getByRole('textbox', { name: 'Image prompt' });
    fireEvent.change(prompt, { target: { value: 'Still unsaved' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: /Scene 1 \/ Shot 2/ }));
    expect(screen.getByRole('alert')).toBeVisible();
    expect(prompt).toHaveValue('Still unsaved');
    expect(prompt).not.toBeVisible();
  });

  it('preserves timing order, rejects overlaps and overlong text, and caps events at twelve', () => {
    setup(fixture());
    fireEvent.change(screen.getByRole('spinbutton', { name: 'End (seconds)' }), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add action' }));
    const descriptions = screen.getAllByRole('textbox', { name: 'Action description' });
    expect(descriptions[1]).toHaveFocus();
    fireEvent.change(descriptions[1]!, { target: { value: 'Wait' } });
    const starts = screen.getAllByRole('spinbutton', { name: 'Start (seconds)' });
    fireEvent.change(starts[1]!, { target: { value: '1' } });
    expect(screen.getByText('This action must start at or after the previous action ends.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    fireEvent.change(starts[1]!, { target: { value: '2' } });
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
    const long = 'a'.repeat(1201);
    fireEvent.change(descriptions[1]!, { target: { value: long } });
    expect(descriptions[1]).toHaveValue(long);
    expect(screen.getByText(/Maximum 1200 characters/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    for (let index = 2; index < 12; index++) fireEvent.click(screen.getByRole('button', { name: 'Add action' }));
    expect(screen.getByRole('button', { name: 'Add action' })).toBeDisabled();
    expect(screen.getAllByRole('textbox', { name: 'Action description' })).toHaveLength(12);
    fireEvent.click(screen.getByRole('button', { name: 'Remove action 12' }));
    expect(screen.getByRole('button', { name: 'Add action' })).toBeEnabled();
    expect(screen.getAllByRole('textbox', { name: 'Action description' })).toHaveLength(11);
    expect(api.save).not.toHaveBeenCalled();
  });

  it.each(['0', '31', ''])('keeps invalid duration %s editable and blocks saving', value => {
    setup(fixture());
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Clip duration (seconds)' }), { target: { value } });
    expect(screen.getByText('Enter a clip duration from 1 to 30 seconds.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('uses legacy author direction and subject action without displaying the canonical wrapper', () => {
    const project = fixture();
    project.scenes[0]!.shots[0] = { ...project.scenes[0]!.shots[0]!, manualStoryboard: undefined,
      videoActionTimeline: undefined, subjectAction: 'Turn the handle',
      prompt: 'STORYBOARD KEYFRAME CONTRACT v1\n\nAUTHOR DIRECTION:\nA hand on the closed door\n\nCONSTRAINTS:\nPrivate compiler policy' };
    setup(project);
    expect(screen.getByRole('textbox', { name: 'Image prompt' })).toHaveValue('A hand on the closed door');
    expect(screen.getByRole('textbox', { name: 'Action description' })).toHaveValue('Turn the handle');
    expect(screen.getByRole('spinbutton', { name: 'Start (seconds)' })).toHaveValue(0);
    expect(screen.getByRole('spinbutton', { name: 'End (seconds)' })).toHaveValue(5);
    expect(screen.queryByText(/Private compiler policy/)).not.toBeInTheDocument();
  });

  it('creates only on command, reuses a retry key, and shows blank manual rows with server-selected Cast/Looks', async () => {
    const project = fixture();
    const manual = { ...project.scenes[0]!.shots[0]!, id: 'shot-new', version: 1, manualStoryboard: true,
      title: '', prompt: '', visibleMoment: '', subjectAction: 'Never display this inherited action',
      videoActionTimeline: [], approvedStoryboardSource: undefined, approvedVideoAttemptId: null };
    const next = { ...project, version: 5, scenes: [...project.scenes, {
      ...project.scenes[0]!, id: 'scene-new', orderKey: 2, shots: [manual], shotOrder: [manual.id]
    }] };
    api.create.mockRejectedValueOnce(new Error('Connection lost')).mockResolvedValueOnce(next);
    const view = setup(project);
    expect(api.create).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Add Scene' }));
    await screen.findByRole('alert');
    const key = api.create.mock.calls[0]?.[1].idempotencyKey;
    fireEvent.click(screen.getByRole('button', { name: 'Add Scene' }));
    await waitFor(() => expect(view.changed).toHaveBeenCalledWith(next));
    expect(api.create).toHaveBeenLastCalledWith('project-1', { expectedVersion: 4, idempotencyKey: key });
    expect(key).toEqual(expect.any(String));
    view.rerender(next);
    expect(screen.getByRole('textbox', { name: 'Image prompt' })).toHaveValue('');
    expect(screen.getByRole('textbox', { name: 'Action description' })).toHaveValue('');
    expect(screen.getByRole('checkbox', { name: 'Mira' })).toBeChecked();
    expect(screen.getByRole('combobox', { name: 'Look for Mira' })).toHaveValue('look-1');
    expect(screen.getByTestId('image-engine')).toHaveAttribute('data-shot', 'shot-new');
    expect(screen.getByTestId('image-engine')).toHaveTextContent('Enter and save an image prompt');
    expect(screen.getByTestId('video-engine')).toHaveTextContent('Enter and save an action');
    expect(api.save).not.toHaveBeenCalled();
  });

  it('allows an image-only save and never fabricates an action for a manual Shot', async () => {
    const project = fixture();
    const shot = project.scenes[0]!.shots[0]!;
    shot.prompt = '';
    shot.videoActionTimeline = [];
    shot.subjectAction = 'Legacy motion must not be restored';
    api.save.mockResolvedValueOnce(savedProject(project, { prompt: 'Opening instant only', videoActionTimeline: [] }));
    const view = setup(project);
    fireEvent.change(screen.getByRole('textbox', { name: 'Image prompt' }), { target: { value: 'Opening instant only' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(view.changed).toHaveBeenCalledOnce());
    expect(api.save.mock.calls[0]?.[3].videoActionTimeline).toEqual([]);
  });

  it('uses only manual Shot selections, including an explicit empty Cast and Look selection', () => {
    const project = fixture();
    project.scenes[0]!.castMode = 'none';
    const view = setup(project);
    expect(screen.getByRole('checkbox', { name: 'Mira' })).toBeChecked();
    expect(screen.getByRole('combobox', { name: 'Look for Mira' })).toHaveValue('look-1');
    const next = savedProject(project, { castMode: 'none', castAssignmentIds: [], wardrobeLookIds: [] });
    next.scenes[0]!.castMode = 'selected';
    view.rerender(next);
    expect(screen.getByRole('checkbox', { name: 'Mira' })).not.toBeChecked();
    expect(screen.getByRole('combobox', { name: 'Look for Mira' })).toHaveValue('');
    expect(screen.queryByText(/Look unavailable for selected Cast/)).not.toBeInTheDocument();
  });

  it('keeps scene hierarchy and retained media/history visible on inactive rows', async () => {
    const project = fixture();
    const snapshot = structuredClone(project);
    setup(project);
    fireEvent.click(screen.getByRole('button', { name: /Scene 1 \/ Shot 2/ }));
    const inactive = document.querySelector('[data-shot-id="shot-1"]') as HTMLElement;
    expect(within(inactive).getByAltText('Saved first-frame image: Opening')).toBeVisible();
    expect(within(inactive).getByAltText('Selected video Take: Opening')).toHaveAttribute('src', '/old-poster.png');
    expect(within(inactive).getByText('Selected Take retained')).toBeVisible();
    const history = inactive.querySelector('details')!;
    fireEvent.click(history.querySelector('summary')!);
    await waitFor(() => expect(history).toHaveAttribute('open'));
    await waitFor(() => expect(within(inactive).getByText('Take 1')).toBeVisible());
    expect(within(inactive).getByText('Image & Take history')).toBeVisible();
    expect(project).toEqual(snapshot);
  });

  it('saves explicit Cast/Look selections without changing the sibling Shot', async () => {
    const project = fixture();
    const view = setup(project);
    api.save.mockResolvedValueOnce(savedProject(project, { wardrobeLookIds: ['look-2'] }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Look for Mira' }), { target: { value: 'look-2' } });
    expect(screen.getByTestId('image-engine')).toHaveTextContent('Save changes before generating.');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(view.changed).toHaveBeenCalledOnce());
    expect(api.save.mock.calls[0]?.[3]).toMatchObject({ castAssignmentIds: ['cast-1'], wardrobeLookIds: ['look-2'] });
    expect(project.scenes[0]!.shots[1]!.wardrobeLookIds).toEqual(['look-1']);
    view.rerender(savedProject(project, { wardrobeLookIds: ['look-2'] }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Mira' }));
    expect(screen.getByRole('combobox', { name: 'Look for Mira' })).toBeDisabled();
    expect(screen.getByRole('combobox', { name: 'Look for Mira' })).toHaveValue('');
  });

  it('exposes independent pending/failed media states while preserving completed results', () => {
    const project = fixture();
    project.generationAttempts.push({ id: 'still-failed', sceneId: 'scene-1', shotId: 'shot-1',
      operation: 'cinematic_storyboard_still', status: 'failed' });
    project.generationAttempts.push({ id: 'video-running', sceneId: 'scene-1', shotId: 'shot-1',
      operation: 'cinematic_draft_clip', status: 'provider_processing' });
    const view = setup(project);
    fireEvent.click(screen.getByRole('button', { name: /Scene 1 \/ Shot 2/ }));
    expect(screen.getByText('Generation failed')).toBeVisible();
    expect(screen.getByText('Generation in progress')).toBeVisible();
    expect(document.querySelectorAll('[data-processing-spinner]')).toHaveLength(1);
    project.generationAttempts[project.generationAttempts.length - 1] = { ...(project.generationAttempts.at(-1) as object), status: 'cancelled' };
    view.rerender({ ...project, version: 5 });
    expect(screen.getByText('Generation cancelled')).toBeVisible();
    expect(document.querySelector('[data-processing-spinner]')).not.toBeInTheDocument();
    expect(screen.getByAltText('Saved first-frame image: Opening')).toBeVisible();
  });

  it('clears row drafts across project ownership changes and ignores late save completion', async () => {
    const project = fixture();
    let resolve!: (project: CinematicProject) => void;
    api.save.mockReturnValueOnce(new Promise<CinematicProject>(done => { resolve = done; }));
    const view = setup(project);
    fireEvent.change(screen.getByRole('textbox', { name: 'Image prompt' }), { target: { value: 'Private local draft' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    view.rerender({ ...fixture(), id: 'other-project', ownerUserId: 'other-owner' });
    expect(view.dirty).toHaveBeenLastCalledWith(false);
    expect(screen.getByRole('textbox', { name: 'Image prompt' })).toHaveValue('First image');
    await act(async () => resolve(savedProject(project, { prompt: 'Private local draft' })));
    expect(view.changed).not.toHaveBeenCalled();
  });

  it('caps Add Scene at 24 and preserves manual locale key/interpolation parity', async () => {
    const project = fixture();
    project.scenes = Array.from({ length: 24 }, (_, index) => ({ ...project.scenes[0]!, id: `scene-${index}`, shots: [], shotOrder: [] }));
    setup(project);
    expect(screen.getByRole('button', { name: 'Add Scene' })).toBeDisabled();
    expect(screen.getByText('Maximum 24 Scenes')).toBeVisible();
    const keys = Object.keys(en).filter(key => key.startsWith('cinematic.manual.'));
    expect(keys.sort()).toEqual(Object.keys(th).filter(key => key.startsWith('cinematic.manual.')).sort());
    for (const key of keys) {
      expect((en as Record<string, string>)[key]?.match(/\{\w+\}/g) || [])
        .toEqual((th as Record<string, string>)[key]?.match(/\{\w+\}/g) || []);
    }
    expect(en['cinematic.storyboard.faceless']).toBe('Faceless previs');
    expect(th['cinematic.storyboard.faceless']).toBe('ภาพร่างใบหน้าว่าง');
    await act(async () => { await i18n.changeLanguage('th'); });
    expect(screen.getByRole('button', { name: th['cinematic.manual.addScene'] })).toBeDisabled();
  });
});

function setup(project: CinematicProject) {
  const changed = vi.fn(), refresh = vi.fn(), dirty = vi.fn();
  const image = vi.fn((_scene: CinematicScene, shot: CinematicShot, blocked: string | null) =>
    <div data-testid="image-engine" data-shot={shot.id}>{blocked || 'ready'}</div>);
  const video = vi.fn((_scene: CinematicScene, shot: CinematicShot, blocked: string | null) =>
    <div data-testid="video-engine" data-shot={shot.id}>{blocked || 'ready'}</div>);
  const props: Omit<SimpleStoryboardWorkspaceProps, 'project'> = {
    onProjectChanged: changed, onProjectRefresh: refresh, onDirtyChange: dirty, renderImage: image, renderVideo: video
  };
  const ui = (value: CinematicProject) => <I18nextProvider i18n={i18n}><SimpleStoryboardWorkspace project={value} {...props} /></I18nextProvider>;
  const result = render(ui(project));
  return { ...result, changed, refresh, dirty, image, video, rerender: (value: CinematicProject) => result.rerender(ui(value)) };
}

function savedProject(project: CinematicProject, fields: Partial<CinematicShot>) {
  return { ...project, version: project.version + 1, scenes: project.scenes.map((scene, index) => index ? scene : {
    ...scene, shots: scene.shots.map((shot, shotIndex) => shotIndex ? shot : { ...shot, ...fields, version: shot.version + 1 })
  }) };
}

function fixture(): CinematicProject {
  const shot: CinematicShot = {
    id: 'shot-1', version: 2, orderKey: 1, title: 'Opening', purpose: '', durationMs: 5000,
    framing: 'wide', cameraAngle: 'eye-level', cameraMovement: 'fixed', lensIntent: '', blocking: '',
    performance: '', gaze: '', lighting: '', environment: '', audioIntent: 'Keep existing ambience',
    prompt: 'First image', manualStoryboard: true, storyboardFaceless: false, castMode: 'selected',
    castAssignmentIds: ['cast-1'], wardrobeLookIds: ['look-1'], continuityNotes: [], storyboardStatus: 'approved',
    videoActionTimeline: [{ startMs: 0, endMs: 5000, description: 'Hold the door' }],
    approvedVideoAttemptId: 'take-1', approvedStoryboardSource: {
      assetId: 'asset-1', assetVersionId: 'asset-v1', sourceJobId: 'job-1', imageUrl: '/old-image.png',
      thumbnailUrl: '/old-image.png', contentHash: 'hash', sourceFingerprint: 'fingerprint', approvedAt: '2026-09-13T00:00:00Z'
    }
  };
  return {
    id: 'project-1', projectId: 'project-1', ownerUserId: 'owner-1', version: 4, aspectRatio: '16:9',
    castAssignments: [{ id: 'cast-1', active: true, identityReady: true, displayName: 'Mira',
      looks: [{ id: 'look-1', name: 'Raincoat', locked: true }, { id: 'look-2', name: 'Coat', locked: true }] }],
    scenes: [{ id: 'scene-1', version: 2, orderKey: 1, title: 'At the station',
      castAssignmentIds: ['cast-1'], wardrobeLookIds: ['look-1'], durationMs: 10000,
      shotOrder: ['shot-1', 'shot-2'], shots: [shot, { ...shot, id: 'shot-2', title: 'Second', orderKey: 2,
        prompt: 'Second image', approvedStoryboardSource: undefined, approvedVideoAttemptId: null }] }],
    generationAttempts: [
      { id: 'still-1', sceneId: 'scene-1', shotId: 'shot-1', operation: 'cinematic_storyboard_still', status: 'completed' },
      { id: 'take-1', sceneId: 'scene-1', shotId: 'shot-1', operation: 'cinematic_draft_clip', status: 'completed',
        outputAsset: { publicUrl: '/old-video.mp4', posterUrl: '/old-poster.png' } }
    ]
  } as unknown as CinematicProject;
}

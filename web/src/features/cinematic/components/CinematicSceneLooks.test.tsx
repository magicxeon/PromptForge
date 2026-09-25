import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CinematicSceneLooks } from './CinematicSceneLooks';
import type { CinematicProject, CinematicScene } from '../schemas/cinematicSchemas';

const update = vi.hoisted(() => vi.fn());
vi.mock('../api/cinematicSeriesApi', () => ({ updateCinematicSceneLooks: (...args: unknown[]) => update(...args) }));
vi.mock('../../../lib/auth/actorStore', () => ({ getActiveActorId: () => 'actor-1' }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('../../../components/media/AuthenticatedMediaImage', () => ({ AuthenticatedMediaImage: ({ src, fallback }: { src?: string; fallback?: ReactNode }) => src ? <img src={src} alt="" /> : fallback }));
const scene = { id: 'scene-1', version: 3, castAssignmentIds: ['cast-1'], wardrobeLookIds: ['old'], shots: [] } as unknown as CinematicScene;
const project = { id: 'project-1', version: 5, castAssignments: [{ id: 'cast-1', displayName: 'Lalin', identityReady: true, characterProfileId: 'profile-1', looks: [
  { id: 'old', name: 'Work', mode: 'character_look', characterLookId: 'look-1', characterLookVersionId: 'v1', locked: true },
  { id: 'new', name: 'Evening', mode: 'character_look', characterLookId: 'look-2', characterLookVersionId: 'v2', locked: true },
  { id: 'draft', name: 'Draft', mode: 'uploaded', locked: false }
] }], scenes: [scene] } as unknown as CinematicProject;
describe('Scene Look selection', () => {
  beforeEach(() => update.mockReset());
  it('keeps a portrait slot before identity text when the Character has no image', () => {
    render(<CinematicSceneLooks actorId="actor-1" project={project} scene={{ ...scene, wardrobeLookIds: [] }} disabled={false} onProjectChanged={vi.fn()} />);
    const identity = screen.getByText('Lalin').closest('.cinematic-director-cast__character')!;
    expect(identity.firstElementChild).toHaveClass('cinematic-director-cast__portrait');
    expect(identity.firstElementChild?.querySelector('svg')).not.toBeNull();
    expect(identity.lastElementChild).toContainElement(screen.getByText('Lalin'));
    expect(identity.children).toHaveLength(2);
  });
  it('replaces one Characters selected Look using version guards without editing Scene prose', async () => {
    const onProjectChanged = vi.fn(); update.mockResolvedValue({ project });
    render(<CinematicSceneLooks actorId="actor-1" project={project} scene={scene} disabled={false} onProjectChanged={onProjectChanged} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'new' } });
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.lookReferences.saveScene' }));
    await waitFor(() => expect(update).toHaveBeenCalledWith('project-1', 'scene-1', { expectedVersion: 5, expectedSceneVersion: 3, wardrobeLookIds: ['new'] }));
    expect(onProjectChanged).toHaveBeenCalledWith(project);
    expect(screen.getByRole('option', { name: /Draft/ })).toBeDisabled();
  });
  it('respects the surrounding Scene offline or unsaved state', () => {
    render(<CinematicSceneLooks actorId="actor-1" project={project} scene={scene} disabled onProjectChanged={vi.fn()} />);
    expect(screen.getByRole('combobox')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'cinematic.lookReferences.saveScene' })).toBeDisabled();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });
  it('preserves the unsaved Look selection across an unrelated Scene prose save', async () => {
    const pending = vi.fn(); const onProjectChanged = vi.fn();
    const view = render(<CinematicSceneLooks actorId="actor-1" project={project} scene={scene} disabled={false} onProjectChanged={onProjectChanged} onPendingChange={pending} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'new' } });
    expect(pending).toHaveBeenLastCalledWith(true);
    view.rerender(<CinematicSceneLooks actorId="actor-1" project={{ ...project, version: 6 }} scene={{ ...scene, version: 4, title: 'New title' }} disabled={false} onProjectChanged={onProjectChanged} onPendingChange={pending} />);
    expect(screen.getByRole('combobox')).toHaveValue('new');
    update.mockResolvedValue({ project });
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.lookReferences.saveScene' }));
    await waitFor(() => expect(update).toHaveBeenCalledWith('project-1', 'scene-1', { expectedVersion: 6, expectedSceneVersion: 4, wardrobeLookIds: ['new'] }));
  });
  it('discards only the local Look draft without making an API request', () => {
    const pending = vi.fn();
    render(<CinematicSceneLooks actorId="actor-1" project={project} scene={scene} disabled={false} onProjectChanged={vi.fn()} onPendingChange={pending} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'new' } });
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.lookReferences.discard' }));
    expect(screen.getByRole('combobox')).toHaveValue('old');
    expect(pending).toHaveBeenLastCalledWith(false);
    expect(update).not.toHaveBeenCalled();
  });
});

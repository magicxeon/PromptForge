import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { CinematicProjectNavigation } from './CinematicProjectNavigation';
import type { CinematicProject } from '../schemas/cinematicSchemas';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
const project = { id: 'root', title: 'Rain Letters' } as CinematicProject;
function Destination() {
  const location = useLocation();
  return <CinematicProjectNavigation actorId="actor" project={project}>
    <output data-testid="path">{location.pathname}{location.search}</output>
  </CinematicProjectNavigation>;
}
function mount(path = '/create/cinematic/root/characters', saved?: unknown) {
  render(<MemoryRouter initialEntries={[{ pathname: path, state: { cinematicStoryReturn: saved } }]}><Destination /></MemoryRouter>);
}
describe('Project Story and Characters navigation', () => {
  it('returns to the same Shot and preserves its search context', () => {
    mount('/create/cinematic/root/shot/one', undefined);
    fireEvent.click(screen.getByRole('link', { name: 'cinematic.projectTabs.characters' }));
    expect(screen.getByTestId('path')).toHaveTextContent('/create/cinematic/root/characters');
    fireEvent.click(screen.getByRole('link', { name: 'cinematic.projectTabs.backToStory' }));
    expect(screen.getByTestId('path')).toHaveTextContent('/create/cinematic/root/shot/one');
  });
  it('restores a valid actor and Project-scoped deep link', () => {
    mount(undefined, { actorId: 'actor', projectId: 'root', path: '/create/cinematic/root/chapters?chapter=two' });
    expect(screen.getByRole('link', { name: 'cinematic.projectTabs.backToStory' })).toHaveAttribute('href', '/create/cinematic/root/chapters?chapter=two');
  });
  it.each([
    { actorId: 'other', projectId: 'root', path: '/create/cinematic/root/produce' },
    { actorId: 'actor', projectId: 'other', path: '/create/cinematic/root/produce' },
    { actorId: 'actor', projectId: 'root', path: '/create/cinematic/root/../other/produce' },
    { actorId: 'actor', projectId: 'root', path: '//external.test/create/cinematic/root/produce' },
    { actorId: 'actor', projectId: 'root', path: '/create/cinematic/root/characters?character=two' }
  ])('rejects invalid return context %# and keeps old cast route semantics', saved => {
    mount(undefined, saved);
    expect(screen.getByRole('link', { name: 'cinematic.projectTabs.backToStory' })).toHaveAttribute('href', '/create/cinematic/root/cast');
    expect(screen.getByText('cinematic.projectTabs.characters')).toBeVisible();
  });
  it('shows project context and only one destination link, without tab semantics', () => {
    mount('/create/cinematic/root/cast');
    expect(screen.getByText('Rain Letters')).toBeVisible();
    expect(screen.getByText('cinematic.fullStory.eyebrow')).toBeVisible();
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.getByRole('link')).not.toHaveAttribute('aria-current');
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });
});

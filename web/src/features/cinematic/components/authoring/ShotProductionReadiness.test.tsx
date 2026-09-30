import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import type { CinematicProject, CinematicScene, CinematicShot } from '../../schemas/cinematicSchemas';
import { ShotProductionReadiness } from './ShotProductionReadiness';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
const shot = { id: 's', castAssignmentIds: [], wardrobeLookIds: [], storyboardStatus: 'draft' } as unknown as CinematicShot;
const scene = { castAssignmentIds: [], wardrobeLookIds: [], sourceChapterRevisionId: 'before' } as unknown as CinematicScene;
const project = { activeChapterVersionId: 'after', castAssignments: [], generationAttempts: [] } as unknown as CinematicProject;

it('distinguishes advisory Chapter/First Frame changes from saved Shot problems without adding locks', () => {
  render(<ShotProductionReadiness project={project} scene={scene} shot={shot} dirty promptStale timingIssues={1} />);
  expect(screen.getByText('cinematic.flowReadiness.chapterChanged')).toBeVisible();
  expect(screen.getByText('cinematic.flowReadiness.optionalFrame')).toBeVisible();
  expect(screen.getByText('cinematic.flowReadiness.promptChanged')).toBeVisible();
  expect(screen.getByText('cinematic.flowReadiness.unsaved')).toBeVisible();
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});

it('retains historical Take feedback and does not require a Look for intentionally empty Cast', () => {
  render(<ShotProductionReadiness project={{ ...project, generationAttempts: [{ id: 'take', downstreamSourceStatus: 'source_changed' }] }}
    scene={{ ...scene, castMode: 'none', sourceChapterRevisionId: 'after' }} shot={{ ...shot, approvedVideoAttemptId: 'take' }} dirty={false} />);
  expect(screen.getByText('cinematic.flowReadiness.takeChanged')).toBeVisible();
  expect(screen.queryByText('cinematic.flowReadiness.look')).not.toBeInTheDocument();
  expect(screen.queryByText('cinematic.flowReadiness.chapterChanged')).not.toBeInTheDocument();
});

it('does not inherit Scene Cast when the Shot explicitly selected an empty Cast', () => {
  render(<ShotProductionReadiness project={project} scene={{ ...scene, castAssignmentIds: ['unavailable'] }}
    shot={{ ...shot, castMode: 'selected' }} dirty={false} />);
  expect(screen.queryByText('cinematic.flowReadiness.castUnavailable')).not.toBeInTheDocument();
});

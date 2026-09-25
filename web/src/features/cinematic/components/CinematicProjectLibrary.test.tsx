import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { CinematicProjectLibrary } from './CinematicProjectLibrary';
import type { CinematicProjectSummary } from '../api/cinematicApi';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: 'en', resolvedLanguage: 'en' },
    t: (key: string, values?: Record<string, unknown>) => values
      ? `${key}:${Object.values(values).join('|')}`
      : key
  })
}));

const project: CinematicProjectSummary = {
  projectId: 'chapter_1', productionProjectId: 'project_root', chapterId: 'chapter_2',
  productionUnitId: 'chapter_2', ownerUserId: 'owner', title: 'คืนฝนที่ยาวนานมากแต่ยังอ่านได้',
  chapterTitle: 'Chapter two', chapterCount: 2, thumbnailUrl: null,
  activeStage: 'storyboard', durationSeconds: 60, status: 'producing',
  updatedAt: '2026-09-18T12:00:00.000Z',
  seriesMembership: { seriesId: 'project_root', seasonId: 'season_1', chapterNumber: 2 },
  progress: { approvedClipCount: 3, totalClipCount: 8 },
  resumeContext: {
    productionProjectId: 'project_root', chapterId: 'chapter_2',
    productionUnitId: 'chapter_2', stage: 'storyboard'
  }
};

describe('CinematicProjectLibrary', () => {
  it('opens the whole-story Project Brief owner from the entire compact project row', () => {
    render(<MemoryRouter><CinematicProjectLibrary projects={[project]} loading={false} error={false} onRetry={vi.fn()} /></MemoryRouter>);
    const link = screen.getByRole('link', { name: /cinematic\.projects\.openProject/ });
    expect(link).toHaveAttribute('href', '/create/cinematic/chapter_1/setup');
    expect(screen.getByText(project.title)).toBeVisible();
    expect(screen.getByText(/cinematic\.projects\.clipProgress:3\|8/)).toBeVisible();
  });

  it('shows an actionable error without removing the New Project command', () => {
    const retry = vi.fn();
    render(<MemoryRouter><CinematicProjectLibrary projects={[]} loading={false} error onRetry={retry} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'cinematic.projects.retry' }));
    expect(retry).toHaveBeenCalledOnce();
    expect(screen.getByRole('link', { name: /cinematic\.actions\.newProject/ })).toBeVisible();
  });

  it('renders a clear empty state and an accessible loading state', () => {
    const { rerender } = render(<MemoryRouter><CinematicProjectLibrary projects={[]} loading error={false} onRetry={vi.fn()} /></MemoryRouter>);
    expect(screen.getByRole('status')).toHaveTextContent('cinematic.projects.loading');
    rerender(<MemoryRouter><CinematicProjectLibrary projects={[]} loading={false} error={false} onRetry={vi.fn()} /></MemoryRouter>);
    expect(screen.getByText('cinematic.empty.title')).toBeVisible();
  });
});

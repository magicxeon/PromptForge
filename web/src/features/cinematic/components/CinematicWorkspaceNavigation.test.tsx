import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CinematicWorkspaceNavigation } from './CinematicWorkspaceNavigation';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe('Cinematic workspace navigation', () => {
  it('groups the legacy stages into three stable workspaces', () => {
    render(<CinematicWorkspaceNavigation activeStage="story-plan" mode="advanced" onStageChange={vi.fn()} />);
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    expect(screen.getByRole('tab', { name: /cinematic\.workspaces\.story/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('button', { name: 'cinematic.workspaces.section.story-plan' })).toHaveAttribute('aria-current', 'page');
  });

  it('enters Production through Storyboard and keeps Simple mode concise', () => {
    const changed = vi.fn();
    render(<CinematicWorkspaceNavigation activeStage="cast" mode="simple" onStageChange={changed} />);
    fireEvent.click(screen.getByRole('tab', { name: /cinematic\.workspaces\.production/ }));
    expect(changed).toHaveBeenCalledWith('storyboard');
    expect(screen.queryByText('cinematic.workspaces.section.story-plan')).not.toBeInTheDocument();
  });

  it('preserves read-only navigation state while a draft is dirty', () => {
    render(<CinematicWorkspaceNavigation activeStage="produce" mode="advanced" />);
    expect(screen.getByRole('tab', { name: /cinematic\.workspaces\.production/ })).toHaveAttribute('aria-selected', 'true');
    for (const button of screen.getAllByRole('button')) expect(button).toBeDisabled();
  });
});

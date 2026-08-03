import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ProfileOverviewSection } from './ProfileOverviewSection';

describe('ProfileOverviewSection', () => {
  it('links View all to the canonical profile tab and labels the section', () => {
    render(
      <MemoryRouter>
        <ProfileOverviewSection
          title="Popular Characters"
          viewAllHref="/profiles/creator_alice/characters"
          viewAllLabel="View all"
        >
          <p>Character content</p>
        </ProfileOverviewSection>
      </MemoryRouter>
    );

    expect(screen.getByRole('region', { name: 'Popular Characters' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'View all' })).toHaveAttribute(
      'href',
      '/profiles/creator_alice/characters'
    );
  });

  it('does not render a View all action without a destination', () => {
    render(
      <MemoryRouter>
        <ProfileOverviewSection title="Creator highlights" viewAllLabel="View all">
          <p>Metrics</p>
        </ProfileOverviewSection>
      </MemoryRouter>
    );

    expect(screen.queryByRole('link', { name: 'View all' })).not.toBeInTheDocument();
  });
});

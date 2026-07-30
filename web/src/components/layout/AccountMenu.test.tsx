import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AccountMenu } from './AccountMenu';

describe('AccountMenu', () => {
  it('exposes the active actor profile independently from other header controls', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AccountMenu
          displayName="Alice Creator"
          initials="AC"
          profilePath="/creators/alice"
          menuLabel="Account menu"
          viewProfileLabel="View profile"
          unavailableLabel="Profile unavailable"
        />
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: 'Account menu' }));

    const profileLink = await screen.findByRole('menuitem', { name: 'View profile' });
    expect(profileLink).toHaveAttribute('href', '/creators/alice');
  });
});

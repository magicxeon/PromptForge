import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import i18n from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { AccountMenu } from './AccountMenu';

const testI18n = i18n.createInstance();
const savePreference = vi.hoisted(() => vi.fn().mockResolvedValue({ confirmCreditUsage: true }));
vi.mock('../../lib/auth/userPreferences', () => ({ useUserPreferences: () => ({
  data: { confirmCreditUsage: false }, isLoading: false, isError: false, save: savePreference
}) }));

describe('AccountMenu', () => {
  it('opens account settings and allows restoring Credit confirmation', async () => {
    const user = userEvent.setup();
    renderAccountMenu('alice');
    await user.click(screen.getByRole('button', { name: 'Account menu' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Settings' }));
    expect(await screen.findByRole('dialog')).toBeVisible();
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();
    await user.click(checkbox);
    expect(savePreference).toHaveBeenCalledWith(true);
  });
  beforeAll(async () => {
    await testI18n.use(initReactI18next).init({
      lng: 'en',
      resources: {
        en: {
          shell: {
            'shell.account.viewProfile': 'View profile'
          }
        }
      },
      interpolation: {
        escapeValue: false,
        prefix: '{',
        suffix: '}'
      }
    });
  });

  it('exposes the active actor profile independently from other header controls', async () => {
    const user = userEvent.setup();
    renderAccountMenu();

    await user.click(screen.getByRole('button', { name: 'Account menu' }));

    const profileLink = await screen.findByRole('menuitem', { name: 'View profile' });
    expect(profileLink).toHaveAttribute('href', '/creators/alice');
    expect(screen.queryByRole('menuitemradio')).not.toBeInTheDocument();
  });
});

function renderAccountMenu(actorId?: string) {
  return render(
    <I18nextProvider i18n={testI18n}>
      <MemoryRouter>
        <AccountMenu
          actorId={actorId}
          displayName="Alice Creator"
          initials="AC"
          profilePath="/creators/alice"
          menuLabel="Account menu"
          viewProfileLabel="View profile"
          unavailableLabel="Profile unavailable"
        />
      </MemoryRouter>
    </I18nextProvider>
  );
}

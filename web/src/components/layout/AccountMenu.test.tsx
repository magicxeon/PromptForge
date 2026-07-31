import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import i18n from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { beforeAll, describe, expect, it } from 'vitest';
import { AccountMenu } from './AccountMenu';

const testI18n = i18n.createInstance();

describe('AccountMenu', () => {
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

function renderAccountMenu() {
  return render(
    <I18nextProvider i18n={testI18n}>
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
    </I18nextProvider>
  );
}

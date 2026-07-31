import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { ThemeContext } from '../../lib/theme/ThemeContext';
import { FooterThemeSelector } from './FooterThemeSelector';

const testI18n = i18n.createInstance();

describe('FooterThemeSelector', () => {
  beforeAll(async () => {
    await testI18n.use(initReactI18next).init({
      lng: 'en',
      resources: {
        en: {
          shell: {
            'shell.theme.label': 'Appearance',
            'shell.theme.options.auto': 'Automatic',
            'shell.theme.options.default': 'Momelo Neon',
            'shell.theme.options.fashion': 'Pearl Editorial',
            'shell.theme.options.creative': 'Electric Studio',
            'shell.theme.autoResolved': 'Currently using {theme}'
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

  it('updates the actor theme preference from the footer', async () => {
    const user = userEvent.setup();
    const setPreference = vi.fn();

    render(
      <ThemeContext.Provider value={{
        preference: 'auto',
        resolvedTheme: 'default',
        setPreference,
        syncRoute: vi.fn()
      }}>
        <I18nextProvider i18n={testI18n}>
          <FooterThemeSelector />
        </I18nextProvider>
      </ThemeContext.Provider>
    );

    expect(screen.getByText('Currently using Momelo Neon')).toBeVisible();
    await user.click(screen.getByRole('radio', { name: 'Pearl Editorial' }));
    expect(setPreference).toHaveBeenCalledWith('fashion');
  });
});

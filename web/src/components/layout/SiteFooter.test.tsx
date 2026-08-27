import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { SiteFooter } from './SiteFooter';

const mocks = vi.hoisted(() => ({ changeLocale: vi.fn() }));

vi.mock('../../lib/i18n/i18n', () => ({
  i18n: { resolvedLanguage: 'en' },
  changeLocale: mocks.changeLocale,
  resolveSupportedLocale: (locale?: string) => locale?.startsWith('en') ? 'en' : 'th'
}));

vi.mock('./FooterThemeSelector', () => ({ FooterThemeSelector: () => <div data-testid="theme-selector" /> }));

const testI18n = i18n.createInstance();

describe('SiteFooter language selector', () => {
  beforeAll(async () => {
    Object.assign(globalThis, { __APP_VERSION__: 'test' });
    await testI18n.use(initReactI18next).init({
      lng: 'en',
      resources: { en: { shell: {
        'shell.languageLabel': 'Language',
        'shell.footer.tagline': 'Create with Momelo',
        'shell.footer.navigationLabel': 'Footer navigation',
        'shell.footer.groups.product': 'Product',
        'shell.footer.groups.resources': 'Resources',
        'shell.footer.groups.company': 'Company',
        'shell.footer.links.community': 'Community',
        'shell.footer.links.studio': 'Studio',
        'shell.footer.links.playground': 'Playground',
        'shell.footer.links.knowledge': 'Knowledge',
        'shell.footer.links.blog': 'Blog',
        'shell.footer.links.support': 'Support',
        'shell.footer.links.about': 'About',
        'shell.footer.links.privacy': 'Privacy',
        'shell.footer.links.terms': 'Terms',
        'shell.footer.comingSoon': 'Coming soon',
        'shell.footer.copyright': 'Copyright {year}',
        'shell.footer.version': 'Version {version}'
      } } },
      interpolation: { escapeValue: false, prefix: '{', suffix: '}' }
    });
  });

  it('owns the global language selector and changes the shared locale', async () => {
    const user = userEvent.setup();
    render(<I18nextProvider i18n={testI18n}><MemoryRouter><SiteFooter /></MemoryRouter></I18nextProvider>);
    const footer = screen.getByTestId('site-footer');
    const selector = screen.getByLabelText('Language');
    const preferences = footer.querySelector('.site-footer__preferences');
    expect(footer).toContainElement(selector);
    expect(preferences).toContainElement(selector);
    expect(preferences).toContainElement(screen.getByTestId('theme-selector'));
    expect(selector).toHaveAttribute('id', 'react-language-select');
    await user.selectOptions(selector, 'th');
    expect(mocks.changeLocale).toHaveBeenCalledWith('th');
  });
});

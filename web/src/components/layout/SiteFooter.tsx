import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MomeloBrand } from '../brand/MomeloBrand';
import { FooterThemeSelector } from './FooterThemeSelector';
import { HeaderSelect } from './HeaderSelect';
import { changeLocale, i18n, resolveSupportedLocale } from '../../lib/i18n/i18n';

const footerGroups = [
  {
    id: 'product',
    links: [
      { id: 'community', to: '/' },
      { id: 'studio', to: '/create/studio/face' },
      { id: 'playground', to: '/create/playground' }
    ]
  },
  {
    id: 'resources',
    links: [
      { id: 'knowledge', disabled: true },
      { id: 'blog', disabled: true },
      { id: 'support', href: 'mailto:support@momelo.app' }
    ]
  },
  {
    id: 'company',
    links: [
      { id: 'about', disabled: true },
      { id: 'privacy', disabled: true },
      { id: 'terms', disabled: true }
    ]
  }
] as const;

export function SiteFooter() {
  const { t } = useTranslation('shell');

  return (
    <footer
      className="site-footer"
      data-testid="site-footer"
      data-app-version={__APP_VERSION__}
    >
      <div className="site-footer__main">
        <div className="site-footer__brand">
          <MomeloBrand />
          <p>{t('shell.footer.tagline')}</p>
          <a href="mailto:hello@momelo.app">hello@momelo.app</a>
        </div>
        <nav className="site-footer__navigation" aria-label={t('shell.footer.navigationLabel')}>
          {footerGroups.map(group => (
            <div className="site-footer__group" key={group.id}>
              <h2>{t(`shell.footer.groups.${group.id}`)}</h2>
              {group.links.map(link => {
                const label = t(`shell.footer.links.${link.id}`);
                if ('to' in link) {
                  return <Link key={link.id} to={link.to}>{label}</Link>;
                }
                if ('href' in link) {
                  return <a key={link.id} href={link.href}>{label}</a>;
                }
                return (
                  <span
                    key={link.id}
                    aria-disabled="true"
                    title={t('shell.footer.comingSoon')}
                  >
                    {label}
                  </span>
                );
              })}
            </div>
          ))}
        </nav>
      </div>
      <div className="site-footer__preferences">
        <FooterThemeSelector />
        <div className="site-footer__language">
          <span>{t('shell.languageLabel')}</span>
          <HeaderSelect
            id="react-language-select"
            label={t('shell.languageLabel')}
            value={resolveSupportedLocale(i18n.resolvedLanguage)}
            onValueChange={locale => void changeLocale(locale as 'th' | 'en')}
            className="global-header-select--language"
            options={[
              { value: 'th', label: 'TH' },
              { value: 'en', label: 'EN' }
            ]}
          />
        </div>
      </div>
      <div className="site-footer__legal">
        <span>{t('shell.footer.copyright', { year: new Date().getFullYear() })}</span>
        <span>{t('shell.footer.version', { version: __APP_VERSION__ })}</span>
      </div>
    </footer>
  );
}

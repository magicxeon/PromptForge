import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MomeloBrand } from '../brand/MomeloBrand';
import { FooterThemeSelector } from './FooterThemeSelector';

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
          <FooterThemeSelector />
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
      <div className="site-footer__legal">
        <span>{t('shell.footer.copyright', { year: new Date().getFullYear() })}</span>
        <span>{t('shell.footer.version', { version: __APP_VERSION__ })}</span>
      </div>
    </footer>
  );
}

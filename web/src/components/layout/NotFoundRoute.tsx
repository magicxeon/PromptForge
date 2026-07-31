import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';

export function NotFoundRoute() {
  const { t } = useTranslation(['common', 'react-ui']);
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center px-5 text-center">
      <span className="text-sm font-semibold uppercase text-[var(--theme-primary)]">404</span>
      <h1 className="mt-3 text-3xl font-semibold">{t('ui.notFound.title', { ns: 'react-ui' })}</h1>
      <p className="mt-3 max-w-lg text-[var(--mpf-text-muted)]">
        {t('ui.notFound.description', { ns: 'react-ui' })}
      </p>
      <Button className="mt-6" variant="primary" onClick={() => window.location.assign('/community')}>
        {t('common.action.back', 'Back')}
      </Button>
    </main>
  );
}

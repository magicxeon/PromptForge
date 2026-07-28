import { useQuery } from '@tanstack/react-query';
import { Activity, Database, ServerCog } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { apiRequest } from '../../lib/api/apiClient';

const healthResponseSchema = z.object({
  status: z.literal('ok'),
  time: z.coerce.date()
});

const statusItems = [
  { id: 'api', icon: ServerCog, labelKey: 'shell.footer.status.api' },
  { id: 'queue', icon: Activity, labelKey: 'shell.footer.status.queue' },
  { id: 'history', icon: Database, labelKey: 'shell.footer.status.history' }
] as const;

export function SystemStatusFooter() {
  const { t } = useTranslation('shell');
  const health = useQuery({
    queryKey: ['application-health'],
    queryFn: () => apiRequest('/api/health', { schema: healthResponseSchema }),
    refetchInterval: 60_000,
    retry: false,
    staleTime: 30_000
  });
  const operational = health.isSuccess;

  return (
    <section
      className="system-status-footer"
      data-testid="system-status-footer"
      aria-label={t('shell.footer.status.label')}
      aria-live="polite"
    >
      <div className="system-status-footer__services">
        {statusItems.map(({ id, icon: Icon, labelKey }) => (
          <div className="system-status-footer__item" key={id}>
            <Icon aria-hidden="true" />
            <span>{t(labelKey)}</span>
            <strong className={operational ? 'is-operational' : 'is-unavailable'}>
              {operational
                ? t('shell.footer.status.operational')
                : health.isLoading
                  ? t('shell.footer.status.checking')
                  : t('shell.footer.status.unavailable')}
            </strong>
          </div>
        ))}
      </div>
      <span className="system-status-footer__ready">
        <span
          className={operational ? 'is-operational' : 'is-unavailable'}
          aria-hidden="true"
        />
        {operational
          ? t('shell.footer.status.ready')
          : health.isLoading
            ? t('shell.footer.status.checking')
            : t('shell.footer.status.degraded')}
      </span>
    </section>
  );
}

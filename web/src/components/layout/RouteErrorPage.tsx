import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { createCorrelationId, emitTelemetry } from '../../lib/telemetry/telemetry';
import { ErrorState } from '../ui/AsyncState';

export function RouteErrorPage() {
  const error = useRouteError();
  const { t } = useTranslation('common');
  const correlationId = useMemo(createCorrelationId, []);
  useEffect(() => {
    emitTelemetry('route_error', {
      correlationId,
      status: isRouteErrorResponse(error) ? error.status : null
    });
  }, [correlationId, error]);
  const description = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error ? error.message : t('common.error.routeUnexpected');
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-5">
      <ErrorState
        title={t('common.error.routeTitle')}
        description={`${description} ${t('common.error.reference', { id: correlationId })}`}
        retryLabel={t('common.action.goCommunity')}
        onRetry={() => window.location.assign('/community')}
      />
    </main>
  );
}

import { useQuery } from '@tanstack/react-query';
import {
  RefreshCw,
  ArrowDownLeft,
  ArrowUpRight,
  ReceiptText,
  CircleHelp,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { ErrorState, LoadingState } from '../../../components/ui/AsyncState';
import { StatusNotice } from '../../../components/ui/StatusNotice';
import { useActor } from '../../../lib/auth/ActorProvider';
import { getFinanceReport } from '../api/financeApi';
import type { FinanceInventory } from '../schemas/financeSchemas';
import { AdminPagination } from './AdminPagination';
import { FinanceReportExport } from './FinanceReportExport';

export function FinanceReports({ inventory }: { inventory: FinanceInventory }) {
  const { t, i18n } = useTranslation('admin');
  const { actor } = useActor();
  const currentYear = Number(
    new Intl.DateTimeFormat('en', {
      year: 'numeric',
      timeZone: 'Asia/Bangkok',
    }).format(new Date()),
  );
  const [filters, setFilters] = useState<Record<string, string>>({
    year: String(currentYear),
    month: '',
    providerId: '',
    modelId: '',
    page: '1',
  });
  const [snapshot, setSnapshot] = useState<Record<string, string>>({});
  const query = useQuery({
    queryKey: ['admin', 'finance', actor?.userId, 'report', filters, snapshot],
    queryFn: () => getFinanceReport({ ...filters, ...snapshot }),
    retry: false,
  });
  const providers = [
    ...new Map(
      inventory.rows.map((row) => [row.providerId, row.providerName]),
    ).entries(),
  ];
  const models = inventory.rows.filter(
    (row) => !filters.providerId || row.providerId === filters.providerId,
  );
  const number = (value: number | null | undefined) =>
    value == null
      ? t('finance.unavailable')
      : value.toLocaleString(i18n.language);
  function update(key: string, value: string) {
    setFilters((current) => ({
      ...current,
      [key]: value,
      ...(key === 'providerId' ? { modelId: '' } : {}),
      page: '1',
    }));
    setSnapshot({});
  }
  function refresh() {
    setSnapshot({});
    setFilters((current) => ({ ...current, page: '1' }));
    void query.refetch();
  }
  function page(value: number) {
    if (!query.data) return;
    setSnapshot({ asOf: query.data.asOf, revision: query.data.revision });
    setFilters((current) => ({ ...current, page: String(value) }));
  }
  const data = query.data;
  return (
    <section className="finance-section">
      <div className="finance-filters">
        <label>
          {t('finance.year')}
          <input
            type="number"
            min="2000"
            max={currentYear}
            value={filters.year}
            onChange={(event) => update('year', event.target.value)}
          />
        </label>
        <label>
          {t('finance.period')}
          <select
            value={filters.month}
            onChange={(event) => update('month', event.target.value)}
          >
            <option value="">{t('finance.fullYear')}</option>
            {Array.from({ length: 12 }, (_, index) => (
              <option value={index + 1} key={index}>
                {new Intl.DateTimeFormat(i18n.language, {
                  month: 'long',
                }).format(new Date(2026, index, 1))}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t('finance.provider')}
          <select
            value={filters.providerId}
            onChange={(event) => update('providerId', event.target.value)}
          >
            <option value="">{t('finance.allProviders')}</option>
            {providers.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t('finance.model')}
          <select
            value={filters.modelId}
            onChange={(event) => update('modelId', event.target.value)}
          >
            <option value="">{t('finance.allModels')}</option>
            {[...new Set(models.map((row) => row.modelId))].map((id) => (
              <option key={id}>{id}</option>
            ))}
          </select>
        </label>
        <Button
          size="icon"
          onClick={refresh}
          title={t('finance.refresh')}
          aria-label={t('finance.refresh')}
          disabled={query.isFetching}
        >
          <RefreshCw size={16} />
        </Button>
        <FinanceReportExport
          key={JSON.stringify([
            actor?.userId,
            filters,
            data?.asOf,
            data?.revision,
            i18n.language,
          ])}
          report={data}
          scope={{
            providerId: filters.providerId || '',
            modelId: filters.modelId || '',
          }}
          disabled={query.isFetching || query.isError}
        />
      </div>
      {query.isLoading ? (
        <LoadingState label={t('finance.loading')} />
      ) : query.isError || !data ? (
        <ErrorState
          title={t('finance.loadFailed')}
          description={t('finance.retrySnapshot')}
        />
      ) : (
        <>
          <div className="finance-metrics">
            <div>
              <ArrowUpRight aria-hidden="true" />
              <span>{t('finance.captured')}</span>
              <strong>{number(data.totals.capturedCredits)}</strong>
              <small>{t('finance.creditUnit')}</small>
            </div>
            <div>
              <ArrowDownLeft aria-hidden="true" />
              <span>{t('finance.returned')}</span>
              <strong>{number(data.totals.returnedCredits)}</strong>
              <small>{t('finance.creditUnit')}</small>
            </div>
            <div>
              <ReceiptText aria-hidden="true" />
              <span>{t('finance.usageCost')}</span>
              <strong>{t('finance.unavailable')}</strong>
              <small>{t('finance.awaitingUsage')}</small>
            </div>
            <div>
              <CircleHelp aria-hidden="true" />
              <span>{t('finance.cashAndProfit')}</span>
              <strong>{t('finance.unavailable')}</strong>
              <small>{t('finance.awaitingPayments')}</small>
            </div>
          </div>
          <StatusNotice tone="info" title={t('finance.evidenceNotice')}>
            <span>{t('finance.creditNotCash')}</span>
          </StatusNotice>
          {data.sourceStatus !== 'available' ? (
            <StatusNotice tone="warning" title={t('finance.incomplete')}>
              <span>
                {t('finance.invalidRows', { count: data.invalidCount })}
              </span>
            </StatusNotice>
          ) : null}
          <div className="finance-section-heading">
            <h2>{t('finance.monthly')}</h2>
            <small>
              {t('finance.asOf', {
                date: new Date(data.asOf).toLocaleString(i18n.language, {
                  timeZone: data.timezone,
                }),
                timezone: data.timezone,
              })}
            </small>
          </div>
          <div
            className="finance-table-scroll"
            tabIndex={0}
            role="region"
            aria-label={t('finance.monthly')}
          >
            <table>
              <thead>
                <tr>
                  <th>{t('finance.period')}</th>
                  <th>{t('finance.captured')}</th>
                  <th>{t('finance.returned')}</th>
                  <th>{t('finance.usageCost')}</th>
                  <th>{t('finance.cashReceived')}</th>
                  <th>{t('finance.supplierPaid')}</th>
                  <th>{t('finance.events')}</th>
                </tr>
              </thead>
              <tbody>
                {data.periods
                  .filter(
                    (row) =>
                      !filters.month ||
                      Number(row.period.slice(-2)) === Number(filters.month),
                  )
                  .map((row) => (
                    <tr key={row.period}>
                      <th>
                        <button
                          disabled={row.status === 'future'}
                          onClick={() =>
                            update(
                              'month',
                              String(Number(row.period.slice(-2))),
                            )
                          }
                        >
                          {row.period}
                        </button>
                        {row.status === 'future' ? (
                          <small>{t('finance.future')}</small>
                        ) : null}
                      </th>
                      <td>{number(row.capturedCredits)}</td>
                      <td>{number(row.returnedCredits)}</td>
                      <td>{t('finance.unavailable')}</td>
                      <td>{t('finance.unavailable')}</td>
                      <td>{t('finance.unavailable')}</td>
                      <td>{row.eventCount}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <div className="finance-section-heading">
            <h2>{t('finance.creditEvents')}</h2>
            <small>
              {t('finance.eventSummary', {
                count: data.totals.eventCount,
                unallocated: data.unallocatedCount,
              })}
            </small>
          </div>
          <div
            className="finance-table-scroll"
            tabIndex={0}
            role="region"
            aria-label={t('finance.creditEvents')}
          >
            <table>
              <thead>
                <tr>
                  <th>{t('finance.event')}</th>
                  <th>{t('finance.model')}</th>
                  <th>{t('finance.operation')}</th>
                  <th>{t('finance.creditUnit')}</th>
                  <th>{t('finance.priceVersion')}</th>
                </tr>
              </thead>
              <tbody>
                {data.events.map((row) => (
                  <tr key={row.ledgerEntryId}>
                    <td>
                      <details>
                        <summary>{row.ledgerEntryId}</summary>
                        <dl className="finance-detail">
                          <dt>{t('finance.job')}</dt>
                          <dd>{row.relatedJobId || t('finance.unknown')}</dd>
                          <dt>{t('finance.reservation')}</dt>
                          <dd>{row.reservationId || t('finance.unknown')}</dd>
                          <dt>{t('finance.estimate')}</dt>
                          <dd>{row.estimateId || t('finance.unknown')}</dd>
                        </dl>
                      </details>
                      <small>
                        {new Date(row.createdAt).toLocaleString(i18n.language, {
                          timeZone: data.timezone,
                        })}
                      </small>
                    </td>
                    <td>
                      {row.modelId || t('finance.unallocated')}
                      <small>{row.providerId}</small>
                    </td>
                    <td>{row.operationType}</td>
                    <td>{number(row.amountCredits)}</td>
                    <td>{row.pricingPolicyVersion || t('finance.unknown')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data.events.length ? (
              <p className="finance-empty">
                {t(
                  data.sourceStatus === 'available'
                    ? 'finance.noEvents'
                    : 'finance.incomplete',
                )}
              </p>
            ) : null}
          </div>
          <AdminPagination
            canPrevious={data.page > 1 && !query.isFetching}
            canNext={data.hasMore && !query.isFetching}
            onPrevious={() => page(data.page - 1)}
            onNext={() => page(data.page + 1)}
            previousLabel={t('admin.pagination.previous')}
            nextLabel={t('admin.pagination.next')}
            label={t('finance.page', { page: data.page })}
          />
        </>
      )}
    </section>
  );
}

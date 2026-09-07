import { useState } from 'react';
import { FilePlus2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { routePaths } from '../../../app/routeRegistry/routes';
import type { FinanceInventory } from '../schemas/financeSchemas';

export function FinanceRates({
  inventory,
  onDraft,
}: {
  inventory: FinanceInventory;
  onDraft: (key: string) => void;
}) {
  const { t } = useTranslation('admin');
  const [search, setSearch] = useState('');
  const [media, setMedia] = useState('');
  const filtered = inventory.rows.filter(
    (row) =>
      (!media || row.mediaType === media) &&
      `${row.providerName} ${row.modelId}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <section className="finance-section">
      <div className="finance-filters">
        <label className="finance-search">
          {t('finance.search')}
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label>
          {t('finance.media')}
          <select
            value={media}
            onChange={(event) => setMedia(event.target.value)}
          >
            {['', 'image', 'video', 'ai_text'].map((id) => (
              <option key={id} value={id}>
                {t(`finance.mediaTypes.${id || 'all'}`)}
              </option>
            ))}
          </select>
        </label>
        <Link to={routePaths.adminProviders}>
          {t('finance.providerControls')}
        </Link>
      </div>
      <div className="finance-policy">
        <span>
          {t('finance.retailPolicy')}: <b>{inventory.retailPolicyVersion}</b>
        </span>
        <span>
          {t('finance.fxAssumption')}: {inventory.pricingFxThbPerUsd} THB/USD
        </span>
      </div>
      <div
        className="finance-table-scroll"
        tabIndex={0}
        role="region"
        aria-label={t('finance.tabs.rates')}
      >
        <table>
          <thead>
            <tr>
              <th>{t('finance.model')}</th>
              <th>{t('finance.coverage')}</th>
              <th>{t('finance.providerRate')}</th>
              <th>{t('finance.retailCredits')}</th>
              <th>{t('finance.priceVersion')}</th>
              <th>{t('finance.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.id}>
                <td>
                  <strong>{row.displayName}</strong>
                  <small>
                    {row.providerName} / {row.mediaType}
                  </small>
                  <details>
                    <summary>{t('finance.workflows')}</summary>
                    <ul>
                      {row.workflows.map((id) => (
                        <li key={id}>{id}</li>
                      ))}
                    </ul>
                  </details>
                </td>
                <td>
                  <span
                    className={`finance-badge finance-badge--${row.coverage === 'configured' ? 'ready' : 'warning'}`}
                  >
                    {t(`finance.coverageStates.${row.coverage}`)}
                  </span>
                  <small>
                    {t(
                      row.enabled
                        ? 'finance.routingEnabled'
                        : 'finance.routingDisabled',
                    )}
                  </small>
                </td>
                <td>
                  {row.rates.length ? (
                    <details>
                      <summary>
                        {row.rates[0]?.value} USD{' '}
                        {row.rates.length > 1
                          ? `(+${row.rates.length - 1})`
                          : ''}
                      </summary>
                      <dl>
                        {row.rates.map((rate) => (
                          <div key={rate.dimension}>
                            <dt>{rate.dimension}</dt>
                            <dd>{rate.value} USD</dd>
                          </div>
                        ))}
                      </dl>
                    </details>
                  ) : (
                    t('finance.unavailable')
                  )}
                  <small>
                    {row.billingMetric || t('finance.unitUnverified')}
                  </small>
                </td>
                <td>
                  {row.retail.length ? (
                    <details>
                      <summary>{t('finance.viewTable')}</summary>
                      <dl>
                        {row.retail.map((rate) => (
                          <div key={rate.dimension}>
                            <dt>{rate.dimension}</dt>
                            <dd>{rate.value}</dd>
                          </div>
                        ))}
                      </dl>
                    </details>
                  ) : (
                    t('finance.ownerCalculator')
                  )}
                </td>
                <td>
                  {row.rateVersion || t('finance.unknown')}
                  <small>
                    {row.sourceDate || row.effectiveAt || t('finance.unknown')}
                  </small>
                  <details>
                    <summary>{t('finance.evidence')}</summary>
                    <p>{row.source || t('finance.unavailable')}</p>
                  </details>
                </td>
                <td>
                  <Button
                    size="sm"
                    icon={<FilePlus2 size={14} />}
                    onClick={() => onDraft(row.id)}
                  >
                    {t('finance.prepareDraft')}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length ? (
          <p className="finance-empty">{t('finance.noModels')}</p>
        ) : null}
      </div>
    </section>
  );
}

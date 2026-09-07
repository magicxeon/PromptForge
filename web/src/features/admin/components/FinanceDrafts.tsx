import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, Save, LockKeyhole } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { ErrorState, LoadingState } from '../../../components/ui/AsyncState';
import { StatusNotice } from '../../../components/ui/StatusNotice';
import { useActor } from '../../../lib/auth/ActorProvider';
import { createFinanceDraft, getFinanceDrafts } from '../api/financeApi';
import type { FinanceInventory } from '../schemas/financeSchemas';

export function FinanceDrafts({
  inventory,
  modelKey,
  onModel,
  onDirty,
  agreement = false,
}: {
  inventory: FinanceInventory;
  modelKey: string;
  onModel: (key: string) => void;
  onDirty: (dirty: boolean) => void;
  agreement?: boolean;
}) {
  const { t } = useTranslation('admin');
  const { actor } = useActor();
  const client = useQueryClient();
  const [dirty, setDirty] = useState(false);
  const markDirty = (value: boolean) => {
    setDirty(value);
    onDirty(value);
  };
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const command = useRef({ body: '', id: '' });
  const scope = agreement
    ? 'finance_supplier_agreement'
    : 'finance_provider_cost';
  const queryKey = ['admin', 'finance', actor?.userId, 'drafts'];
  const query = useQuery({ queryKey, queryFn: getFinanceDrafts });
  const mutation = useMutation({
    mutationFn: createFinanceDraft,
    onSuccess: () => {
      markDirty(false);
      void client.invalidateQueries({ queryKey });
    },
  });
  const model =
    inventory.rows.find((row) => row.id === modelKey) || inventory.rows[0];

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!model || mutation.isPending) return;
    const form = new FormData(event.currentTarget);
    const values: Record<string, string> = {
      modelKey: model.id,
      baselineRevision: inventory.revision,
    };
    for (const [key, value] of form.entries())
      values[key] = String(value).trim();
    for (const key of ['announcedAt', 'intendedEffectiveAt']) {
      if (values[key])
        values[key] = new Date(`${values[key]}:00+07:00`).toISOString();
    }
    const body = JSON.stringify({ scope, values });
    if (command.current.body !== body)
      command.current = { body, id: `finance_${crypto.randomUUID()}` };
    mutation.mutate({
      scope,
      values: { ...values, commandId: command.current.id },
    });
  }
  return (
    <section className="finance-section">
      <StatusNotice
        tone="info"
        title={t(agreement ? 'finance.noFundingRecords' : 'finance.draftOnly')}
      >
        <span>
          {t(
            agreement
              ? 'finance.fundingDraftNotice'
              : 'finance.publicationGate',
          )}
        </span>
      </StatusNotice>
      <div className="finance-draft-layout">
        <div className="finance-draft-history">
          <h2>
            {t(agreement ? 'finance.agreementHistory' : 'finance.draftHistory')}
          </h2>
          {query.isLoading ? (
            <LoadingState label={t('finance.loading')} />
          ) : query.isError ? (
            <ErrorState title={t('finance.loadFailed')} />
          ) : (
            <>
              {query.data?.revisions
                .filter((row) => row.scope === scope)
                .map((row) => (
                  <article key={row.id} className="finance-revision">
                    <div>
                      <strong>{row.values.versionLabel}</strong>
                      <span className="finance-badge">
                        {t('finance.draft')}
                      </span>
                    </div>
                    <small>{row.id}</small>
                    <p>{row.values.modelId}</p>
                    <dl>
                      <dt>{t('finance.intendedDate')}</dt>
                      <dd>
                        {new Date(
                          row.values.intendedEffectiveAt || '',
                        ).toLocaleString(undefined, {
                          timeZone: 'Asia/Bangkok',
                        })}{' '}
                        (Asia/Bangkok)
                      </dd>
                      <dt>{t('finance.announcedDate')}</dt>
                      <dd>
                        {row.values.announcedAt || t('finance.notSpecified')}
                      </dd>
                      <dt>{t('finance.reason')}</dt>
                      <dd>{row.values.reason}</dd>
                      {agreement ? (
                        <>
                          <dt>{t('finance.billingMode')}</dt>
                          <dd>
                            {t(`finance.modes.${row.values.billingMode}`)}
                          </dd>
                          <dt>{t('finance.accountKey')}</dt>
                          <dd>
                            {row.values.billingAccountKey} /{' '}
                            {row.values.fundingPoolKey}
                          </dd>
                        </>
                      ) : (
                        <>
                          <dt>{t('finance.proposedCost')}</dt>
                          <dd>
                            {row.values.unitCostUsd} USD /{' '}
                            {row.values.unitQuantity || '1'}{' '}
                            {row.values.billingMetric}
                          </dd>
                          <dt>{t('finance.dimension')}</dt>
                          <dd>{row.values.dimension}</dd>
                        </>
                      )}
                    </dl>
                    <small>{t('finance.notScheduled')}</small>
                  </article>
                ))}
              {!query.data?.revisions.some((row) => row.scope === scope) ? (
                <p className="finance-empty">{t('finance.noDrafts')}</p>
              ) : null}
            </>
          )}
        </div>
        <form
          className="finance-draft-form"
          onSubmit={submit}
          onChange={(event) => {
            if (!event.target.getAttribute('name')) return;
            markDirty(true);
            if (!mutation.isPending) mutation.reset();
          }}
          key={`${scope}/${model?.id}`}
        >
          <fieldset disabled={mutation.isPending}>
            <h2>
              {t(agreement ? 'finance.newAgreement' : 'finance.newCostDraft')}
            </h2>
            <label>
              {t('finance.model')}
              <select
                value={model?.id || ''}
                onChange={(event) => {
                  if (dirty && !window.confirm(t('finance.discardDraft')))
                    return;
                  onModel(event.target.value);
                  markDirty(false);
                  mutation.reset();
                }}
              >
                {inventory.rows.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.providerName} / {row.modelId} / {row.mediaType}
                  </option>
                ))}
              </select>
            </label>
            <small className="finance-model-name">{model?.modelId}</small>
            {agreement ? (
              <>
                <label>
                  {t('finance.accountKey')}
                  <input
                    name="billingAccountKey"
                    required
                    maxLength={100}
                    pattern="[a-zA-Z0-9:_\-]+"
                    autoComplete="off"
                  />
                </label>
                <label>
                  {t('finance.poolKey')}
                  <input
                    name="fundingPoolKey"
                    required
                    maxLength={100}
                    pattern="[a-zA-Z0-9:_\-]+"
                    autoComplete="off"
                  />
                </label>
                <div className="finance-form-pair">
                  <label>
                    {t('finance.billingMode')}
                    <select name="billingMode">
                      {['prepaid', 'postpaid', 'hybrid'].map((id) => (
                        <option key={id} value={id}>
                          {t(`finance.modes.${id}`)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {t('finance.currency')}
                    <input
                      name="currency"
                      defaultValue="USD"
                      maxLength={3}
                      pattern="[A-Z]{3}"
                      required
                    />
                  </label>
                </div>
              </>
            ) : (
              <>
                <div className="finance-current-cost">
                  <span>{t('finance.currentCost')}</span>
                  <strong>
                    {model?.rates
                      .map((rate) => `${rate.dimension}: ${rate.value} USD`)
                      .join(' / ') || t('finance.unavailable')}
                  </strong>
                </div>
                <label>
                  {t('finance.dimension')}
                  <input
                    name="dimension"
                    defaultValue={model?.rates[0]?.dimension || ''}
                    required
                    maxLength={200}
                    list="finance-dimensions"
                  />
                  <datalist id="finance-dimensions">
                    {model?.rates.map((rate) => (
                      <option key={rate.dimension}>{rate.dimension}</option>
                    ))}
                  </datalist>
                </label>
                <div className="finance-form-pair">
                  <label>
                    {t('finance.proposedCost')} (USD)
                    <input
                      name="unitCostUsd"
                      inputMode="decimal"
                      required
                      pattern="(0|[1-9][0-9]{0,7})(\.[0-9]{1,12})?"
                    />
                  </label>
                  <label>
                    {t('finance.billingUnit')}
                    <select
                      name="billingMetric"
                      defaultValue={model?.billingMetric || ''}
                      required
                    >
                      <option value="">{t('finance.selectUnit')}</option>
                      {[
                        'returned_image',
                        'output_second',
                        'completion_token',
                        'input_token',
                        'output_token',
                        'cached_input_token',
                        'request',
                      ].map((id) => (
                        <option key={id} value={id}>
                          {id}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <p className="finance-inline-note">
                  {t('finance.retailUnchanged', {
                    version: inventory.retailPolicyVersion,
                  })}
                </p>
              </>
            )}
            {!agreement ? (
              <label>
                {t('finance.unitQuantity')}
                <input
                  name="unitQuantity"
                  inputMode="numeric"
                  required
                  pattern="[1-9][0-9]{0,11}"
                  defaultValue={
                    model?.rates[0]?.dimension.includes('MillionTokens')
                      ? '1000000'
                      : '1'
                  }
                />
              </label>
            ) : null}
            <label>
              {t('finance.versionLabel')}
              <input name="versionLabel" required maxLength={120} />
            </label>
            <label>
              {t('finance.announcedDate')}
              <input type="datetime-local" name="announcedAt" />
            </label>
            <label>
              {t('finance.intendedDate')}
              <input
                type="datetime-local"
                name="intendedEffectiveAt"
                required
              />
            </label>
            <small>{t('finance.dateTimezone')}</small>
            <label>
              {t('finance.evidence')}
              <input name="evidence" required maxLength={1000} />
            </label>
            <label>
              {t('finance.reason')}
              <textarea
                name="reason"
                required
                minLength={3}
                maxLength={1000}
                rows={2}
              />
            </label>
            <Button
              type="submit"
              variant="primary"
              icon={<Save size={16} />}
              disabled={!model || mutation.isPending}
            >
              {t(mutation.isPending ? 'finance.saving' : 'finance.saveDraft')}
            </Button>
            <div className="finance-form-pair">
              <Button
                disabled
                icon={<LockKeyhole size={16} />}
                title={t('finance.publicationGate')}
              >
                {t('finance.publish')}
              </Button>
              <Button
                disabled
                icon={<CalendarClock size={16} />}
                title={t('finance.publicationGate')}
              >
                {t('finance.schedule')}
              </Button>
            </div>
          </fieldset>
          {dirty ? <small>{t('finance.unsaved')}</small> : null}
          {mutation.isSuccess ? (
            <StatusNotice tone="success" title={t('finance.saved')}>
              <span>
                {mutation.data.id} {t('finance.notScheduled')}
              </span>
            </StatusNotice>
          ) : null}
          {mutation.isError ? (
            <StatusNotice tone="error" title={t('finance.saveFailed')}>
              <span>{t('finance.checkDraft')}</span>
            </StatusNotice>
          ) : null}
        </form>
      </div>
    </section>
  );
}

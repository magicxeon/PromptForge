import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { ComparisonSlotInput } from '../../features/generation/api/generationApi';
import type { ProviderCatalog } from '../../features/generation/schemas/generationSchemas';
import { Button } from '../ui/Button';

export type ComparisonSlotEstimate = {
  id: string;
  estimatedCredit: number;
};

export function ComparisonConfigurator({
  catalog,
  slots,
  estimates,
  estimating = false,
  estimateError = null,
  onChange
}: {
  catalog: ProviderCatalog;
  slots: ComparisonSlotInput[];
  estimates?: ComparisonSlotEstimate[];
  estimating?: boolean;
  estimateError?: string | null;
  onChange: (slots: ComparisonSlotInput[]) => void;
}) {
  const { t } = useTranslation('playground');
  const estimatedTotal = estimates?.length === slots.length
    ? estimates.reduce((total, estimate) => total + estimate.estimatedCredit, 0)
    : undefined;

  function patch(index: number, next: Partial<ComparisonSlotInput>) {
    onChange(slots.map((slot, slotIndex) => (
      slotIndex === index ? { ...slot, ...next } : slot
    )));
  }

  function move(index: number, direction: -1 | 1) {
    const destination = index + direction;
    if (destination < 0 || destination >= slots.length) return;
    const reordered = [...slots];
    [reordered[index], reordered[destination]] = [
      reordered[destination] as ComparisonSlotInput,
      reordered[index] as ComparisonSlotInput
    ];
    onChange(reordered);
  }

  return (
    <section className="comparison-configurator" aria-labelledby="comparison-configurator-title">
      <header className="comparison-configurator__heading">
        <div>
          <span className="comparison-configurator__eyebrow">
            {t('playground.comparison.eyebrow', 'Fair comparison')}
          </span>
          <strong id="comparison-configurator-title">
            {t('playground.comparison.title')}
          </strong>
          <p>{t('playground.comparison.description')}</p>
        </div>
        <span>{slots.length} / 4</span>
      </header>

      <div className="comparison-configurator__grid">
        {slots.map((slot, index) => {
          const provider = catalog.providers.find(item => item.id === slot.provider)
            || catalog.providers[0];
          const selectedModel = provider?.models.find(item => item.id === slot.model);
          const estimate = estimates?.find(item => item.id === slot.id);
          return (
            <article key={slot.id} className="comparison-slot-card">
              <div className="comparison-slot-card__heading">
                <strong>{t('playground.comparison.slot')} {index + 1}</strong>
                <div className="comparison-slot-card__actions">
                  <Button
                    size="icon"
                    variant="ghost"
                    title={t('playground.comparison.moveLeft', 'Move model left')}
                    disabled={index === 0}
                    icon={<ChevronLeft className="size-4" />}
                    onClick={() => move(index, -1)}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    title={t('playground.comparison.moveRight', 'Move model right')}
                    disabled={index === slots.length - 1}
                    icon={<ChevronRight className="size-4" />}
                    onClick={() => move(index, 1)}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    title={t('playground.comparison.remove')}
                    disabled={slots.length <= 2}
                    icon={<X className="size-4" />}
                    onClick={() => onChange(slots.filter(item => item.id !== slot.id))}
                  />
                </div>
              </div>

              <div className="comparison-slot-card__fields">
                <Field label={t('playground.engine.provider')}>
                  <select
                    value={slot.provider}
                    onChange={event => {
                      const nextProvider = catalog.providers.find(
                        item => item.id === event.target.value
                      );
                      patch(index, {
                        provider: event.target.value,
                        model: nextProvider?.defaultModel || nextProvider?.models[0]?.id || ''
                      });
                    }}
                  >
                    {catalog.providers.map(item => (
                      <option key={item.id} value={item.id} disabled={item.models.every(model => model.paidRoutingEnabled === false)}>
                        {localized(item.displayName)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={t('playground.engine.model')}>
                  <select
                    value={slot.model}
                    onChange={event => patch(index, { model: event.target.value })}
                  >
                    {provider?.models.map(item => (
                      <option key={item.id} value={item.id} disabled={item.paidRoutingEnabled === false}>
                        {localized(item.displayName)}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <footer className="comparison-slot-card__meta">
                <strong>
                  {estimate
                    ? `${estimate.estimatedCredit} ${t('playground.comparison.credits')}`
                    : estimating
                      ? t('playground.estimate.loading')
                      : t('playground.estimate.pending')}
                </strong>
                <span>
                  {selectedModel?.capabilities.maxReferenceImages || 0}{' '}
                  {t('playground.comparison.referencesShort')}
                </span>
              </footer>
            </article>
          );
        })}

        {slots.length < 4 ? (
          <button
            type="button"
            className="comparison-slot-add"
            onClick={() => {
              const provider = catalog.providers[0];
              onChange([...slots, {
                id: createSlotId(),
                provider: provider?.id || '',
                model: provider?.defaultModel || provider?.models[0]?.id || ''
              }]);
            }}
          >
            <Plus aria-hidden="true" />
            <strong>{t('playground.comparison.add')}</strong>
            <span>{t('playground.comparison.addHelp')}</span>
          </button>
        ) : null}
      </div>

      {estimateError ? (
        <p className="comparison-configurator__error" role="alert">
          {estimateError}
        </p>
      ) : null}

      <footer className="comparison-configurator__total">
        <span>{t('playground.comparison.estimatedTotal')}</span>
        <strong>
          {estimatedTotal !== undefined
            ? `${estimatedTotal} ${t('playground.comparison.credits')}`
            : estimating
              ? t('playground.estimate.loading')
              : t('playground.estimate.pending')}
        </strong>
      </footer>
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="comparison-slot-card__field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function createSlotId() {
  return `slot_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function localized(value: string | Record<string, string>) {
  return typeof value === 'string'
    ? value
    : value.en || value.th || Object.values(value)[0] || '';
}

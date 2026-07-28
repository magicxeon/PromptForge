import { Columns3, Plus, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import type { ProviderCatalog } from '../../features/generation/schemas/generationSchemas';
import type { ComparisonSlotInput } from '../../features/generation/api/generationApi';

const ratioLabels: Record<string, string> = {
  '6:8': '6:8 Portrait',
  '1:1': '1:1 Square',
  '9:16': '9:16 Mobile',
  '16:9': '16:9 Wide',
  '4:5': '4:5 Social'
};

export type EngineValue = {
  provider: string;
  model: string;
  resolution: string | null;
  aspectRatio: string;
};

export function EngineTargetPanel({
  catalog,
  value,
  comparison,
  comparisonSlots,
  comparisonEstimates,
  studioLayout = false,
  allowComparison = true,
  onChange,
  onComparisonChange,
  onSlotsChange
}: {
  catalog: ProviderCatalog;
  value: EngineValue;
  comparison: boolean;
  comparisonSlots: ComparisonSlotInput[];
  comparisonEstimates?: Array<{ id: string; estimatedCredit: number }>;
  studioLayout?: boolean;
  allowComparison?: boolean;
  onChange: (value: EngineValue) => void;
  onComparisonChange: (active: boolean) => void;
  onSlotsChange: (slots: ComparisonSlotInput[]) => void;
}) {
  const { t } = useTranslation('playground');
  const { t: tUi } = useTranslation('react-ui');
  const provider = catalog.providers.find(item => item.id === value.provider) || catalog.providers[0];
  const model = provider?.models.find(item => item.id === value.model) || provider?.models[0];
  const ratios = model?.capabilities.aspectRatios.length ? model.capabilities.aspectRatios : ['6:8', '1:1', '16:9'];
  const resolutions = model?.capabilities.resolutions || [];
  const dimensions = dimensionsForRatio(value.aspectRatio);

  function setProvider(providerId: string) {
    const next = catalog.providers.find(item => item.id === providerId);
    const nextModel = next?.models.find(item => item.id === next.defaultModel) || next?.models[0];
    onChange({
      ...value,
      provider: providerId,
      model: nextModel?.id || '',
      resolution: nextModel?.capabilities.resolutions?.[0] || nextModel?.defaults?.resolution || null
    });
  }

  return (
    <section
      id="generation-engine"
      className={`engine-target-panel${studioLayout ? ' engine-target-panel--studio' : ''}`}
    >
      <div className="engine-target-panel__heading">
        <div className="engine-target-panel__title">
          {studioLayout ? (
            <span className="studio-step-badge">
              {tUi('ui.studio.stepLabel')} 2
            </span>
          ) : null}
          <div>
            <h2>{t('playground.section.engine')}</h2>
            <p>{t('playground.engine.help')}</p>
          </div>
        </div>
        {allowComparison ? <Button className={`engine-comparison-toggle btn-compare-models${comparison ? ' active is-active' : ''}`} variant="secondary" icon={<Columns3 className="size-4" />} onClick={() => onComparisonChange(!comparison)}>{t('playground.action.compare')}{comparison ? ` ${comparisonSlots.length}/4` : ''}</Button> : null}
      </div>
      <div className="engine-target-panel__controls">
        {!comparison ? (
          <div className="engine-target-panel__model-grid">
            <Field label={t('playground.engine.provider')}><select value={value.provider} onChange={event => setProvider(event.target.value)}>{catalog.providers.map(item => <option key={item.id} value={item.id}>{localized(item.displayName)}</option>)}</select></Field>
            <Field label={t('playground.engine.model')}><select value={value.model} onChange={event => {
              const next = provider?.models.find(item => item.id === event.target.value);
              onChange({ ...value, model: event.target.value, resolution: next?.capabilities.resolutions?.[0] || next?.defaults?.resolution || null });
            }}>{provider?.models.map(item => <option key={item.id} value={item.id}>{localized(item.displayName)}</option>)}</select>
              {/* <small className="engine-target-panel__model-meta">
                {model?.capabilities.maxReferenceImages || 0} {t('playground.comparison.referencesShort')}
              </small> */}
            </Field>
            {resolutions.length ? <Field label={t('playground.engine.resolution')}><select value={value.resolution || ''} onChange={event => onChange({ ...value, resolution: event.target.value || null })}>{resolutions.map(item => <option key={item} value={item}>{item.toUpperCase()}</option>)}</select></Field> : null}
          </div>
        ) : null}
        <div className="engine-target-panel__output-grid">
          <Field label={t('playground.engine.width')}><input readOnly value={dimensions.width} /></Field>
          <Field label={t('playground.engine.height')}><input readOnly value={dimensions.height} /></Field>
          <div className="engine-target-panel__aspect">
            <span>{t('playground.engine.aspect')}</span>
            <div>
              {ratios.map(ratio => (
                <Button
                  key={ratio}
                  className={value.aspectRatio === ratio ? 'is-selected' : ''}
                  size="sm"
                  variant={value.aspectRatio === ratio ? 'primary' : 'secondary'}
                  onClick={() => onChange({ ...value, aspectRatio: ratio })}
                >
                  {ratioLabels[ratio] || ratio}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
      {comparison ? (
        <ComparisonConfigurator
          catalog={catalog}
          slots={comparisonSlots}
          estimates={comparisonEstimates}
          onChange={onSlotsChange}
        />
      ) : null}
    </section>
  );
}

function ComparisonConfigurator({
  catalog,
  slots,
  estimates,
  onChange
}: {
  catalog: ProviderCatalog;
  slots: ComparisonSlotInput[];
  estimates?: Array<{ id: string; estimatedCredit: number }>;
  onChange: (slots: ComparisonSlotInput[]) => void;
}) {
  const { t } = useTranslation('playground');
  const estimatedTotal = estimates?.length === slots.length
    ? estimates.reduce(
      (total, estimate) => total + estimate.estimatedCredit,
      0
    )
    : undefined;
  function patch(index: number, next: Partial<ComparisonSlotInput>) {
    onChange(slots.map((slot, slotIndex) => slotIndex === index ? { ...slot, ...next } : slot));
  }
  return (
    <div className="comparison-configurator">
      <div className="comparison-configurator__heading"><div><strong>{t('playground.comparison.title')}</strong><p>{t('playground.comparison.description')}</p></div><span>{slots.length} / 4</span></div>
      <div className="comparison-configurator__grid">
        {slots.map((slot, index) => {
          const provider = catalog.providers.find(item => item.id === slot.provider) || catalog.providers[0];
          const selectedModel = provider?.models.find(item => item.id === slot.model);
          const estimate = estimates?.find(item => item.id === slot.id);
          return (
            <article key={slot.id} className="comparison-slot-card">
              <div className="comparison-slot-card__heading">
                <strong>{t('playground.comparison.slot')} {index + 1}</strong>
                <Button
                  size="icon"
                  variant="ghost"
                  title={t('playground.comparison.remove')}
                  disabled={slots.length <= 1}
                  icon={<X className="size-4" />}
                  onClick={() => onChange(slots.filter(item => item.id !== slot.id))}
                />
              </div>
              <div className="comparison-slot-card__fields">
                <Field label={t('playground.engine.provider')}>
                  <select
                    value={slot.provider}
                    onChange={event => {
                      const nextProvider = catalog.providers.find(item => item.id === event.target.value);
                      patch(index, {
                        provider: event.target.value,
                        model: nextProvider?.defaultModel || nextProvider?.models[0]?.id || ''
                      });
                    }}
                  >
                    {catalog.providers.map(item => (
                      <option key={item.id} value={item.id}>{localized(item.displayName)}</option>
                    ))}
                  </select>
                </Field>
                <Field label={t('playground.engine.model')}>
                  <select
                    value={slot.model}
                    onChange={event => patch(index, { model: event.target.value })}
                  >
                    {provider?.models.map(item => (
                      <option key={item.id} value={item.id}>{localized(item.displayName)}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <footer className="comparison-slot-card__meta">
                <strong>
                  {estimate
                    ? `${estimate.estimatedCredit} ${t('playground.comparison.credits')}`
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
      <footer className="comparison-configurator__total">
        <span>{t('playground.comparison.estimatedTotal')}</span>
        <strong>
          {estimatedTotal !== undefined
            ? `${estimatedTotal} ${t('playground.comparison.credits')}`
            : t('playground.estimate.pending')}
        </strong>
      </footer>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid gap-1 text-sm text-[var(--mpf-text-muted)]"><span>{label}</span>{children}</label>;
}

function createSlotId() {
  return `slot_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function dimensionsForRatio(ratio: string) {
  const dimensions: Record<string, { width: number; height: number }> = {
    '6:8': { width: 768, height: 1024 },
    '1:1': { width: 1024, height: 1024 },
    '9:16': { width: 768, height: 1365 },
    '16:9': { width: 1365, height: 768 },
    '4:5': { width: 819, height: 1024 }
  };
  return dimensions[ratio] || { width: 1024, height: 1024 };
}

function localized(value: string | Record<string, string>) {
  return typeof value === 'string' ? value : value.en || value.th || Object.values(value)[0] || '';
}

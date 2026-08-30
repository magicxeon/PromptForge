import { Columns3, Minus, Plus, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import type { ProviderCatalog } from '../../features/generation/schemas/generationSchemas';
import type { ComparisonSlotInput } from '../../features/generation/api/generationApi';
import { ComparisonConfigurator } from '../comparisons/ComparisonConfigurator';
import { EngineTargetPanelFrame } from './EngineTargetPanelFrame';
import { imageModelUnavailableReason } from './engineTargetPanelHelpers';

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
  outputCount: number;
};

export function EngineTargetPanel({
  catalog,
  value,
  comparison,
  comparisonSlots,
  comparisonEstimates,
  comparisonEstimating = false,
  comparisonEstimateError = null,
  studioLayout = false,
  allowComparison = true,
  allowMultiOutput = true,
  promptRefinementAvailable = false,
  promptRefinementEnabled = false,
  fixedAspectRatio = null,
  requiredReferenceCount = 0,
  onChange,
  onComparisonChange,
  onSlotsChange,
  onPromptRefinementChange = () => {}
}: {
  catalog: ProviderCatalog;
  value: EngineValue;
  comparison: boolean;
  comparisonSlots: ComparisonSlotInput[];
  comparisonEstimates?: Array<{ id: string; estimatedCredit: number }>;
  comparisonEstimating?: boolean;
  comparisonEstimateError?: string | null;
  studioLayout?: boolean;
  allowComparison?: boolean;
  allowMultiOutput?: boolean;
  promptRefinementAvailable?: boolean;
  promptRefinementEnabled?: boolean;
  fixedAspectRatio?: string | null;
  requiredReferenceCount?: number;
  onChange: (value: EngineValue) => void;
  onComparisonChange: (active: boolean) => void;
  onSlotsChange: (slots: ComparisonSlotInput[]) => void;
  onPromptRefinementChange?: (enabled: boolean) => void;
}) {
  const { t } = useTranslation('playground');
  const { t: tUi } = useTranslation('react-ui');
  const provider = catalog.providers.find(item => item.id === value.provider) || catalog.providers[0];
  const model = provider?.models.find(item => item.id === value.model) || provider?.models[0];
  const availableRatios = model?.capabilities.aspectRatios.length ? model.capabilities.aspectRatios : ['6:8', '1:1', '16:9'];
  const ratios = fixedAspectRatio ? [fixedAspectRatio] : availableRatios;
  const resolutions = model?.capabilities.resolutions || [];
  const dimensions = dimensionsForRatio(value.aspectRatio);
  const selectedModelUnavailableReason = imageModelUnavailableReason(
    model,
    requiredReferenceCount,
    fixedAspectRatio || value.aspectRatio
  );

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
    <EngineTargetPanelFrame
      studioLayout={studioLayout}
      title={t('playground.section.engine')}
      description={t('playground.engine.help')}
      badge={studioLayout ? (
        <span className="studio-step-badge">
          {tUi('ui.studio.stepLabel')} 2
        </span>
      ) : null}
      action={allowComparison ? <Button className={`engine-comparison-toggle btn-compare-models${comparison ? ' active is-active' : ''}`} variant="secondary" icon={<Columns3 className="size-4" />} onClick={() => onComparisonChange(!comparison)}>{t('playground.action.compare')}{comparison ? ` ${comparisonSlots.length}/4` : ''}</Button> : null}
    >
      <div className="engine-target-panel__controls">
        {!comparison ? (
          <div className="engine-target-panel__model-grid">
            <Field label={t('playground.engine.provider')}><select value={value.provider} onChange={event => setProvider(event.target.value)}>{catalog.providers.map(item => <option key={item.id} value={item.id} disabled={item.models.every(candidate => Boolean(imageModelUnavailableReason(candidate, requiredReferenceCount, fixedAspectRatio || value.aspectRatio)))}>{localized(item.displayName)}</option>)}</select></Field>
            <Field label={t('playground.engine.model')}><select value={value.model} onChange={event => {
              const next = provider?.models.find(item => item.id === event.target.value);
              onChange({ ...value, model: event.target.value, resolution: next?.capabilities.resolutions?.[0] || next?.defaults?.resolution || null });
            }}>{provider?.models.map(item => <option key={item.id} value={item.id} disabled={Boolean(imageModelUnavailableReason(item, requiredReferenceCount, fixedAspectRatio || value.aspectRatio))}>{localized(item.displayName)}</option>)}</select>
              {selectedModelUnavailableReason ? <small className="engine-target-panel__model-meta is-warning">{t(`playground.engine.unavailable.${selectedModelUnavailableReason}`)}</small> : null}
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
                  disabled={Boolean(fixedAspectRatio)}
                  onClick={() => onChange({ ...value, aspectRatio: ratio })}
                >
                  {ratioLabels[ratio] || ratio}
                </Button>
              ))}
            </div>
          </div>
          {!comparison && allowMultiOutput ? (
            <div className="engine-output-count">
              <span>{t('playground.engine.images')}</span>
              <div className="engine-output-count__stepper">
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  title={t('playground.engine.decreaseImages')}
                  aria-label={t('playground.engine.decreaseImages')}
                  disabled={value.outputCount <= 1}
                  icon={<Minus className="size-4" />}
                  onClick={() => onChange({ ...value, outputCount: Math.max(1, value.outputCount - 1) })}
                />
                <output aria-live="polite" aria-label={t('playground.engine.images')}>
                  {value.outputCount}
                </output>
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  title={t('playground.engine.increaseImages')}
                  aria-label={t('playground.engine.increaseImages')}
                  disabled={value.outputCount >= 4}
                  icon={<Plus className="size-4" />}
                  onClick={() => onChange({ ...value, outputCount: Math.min(4, value.outputCount + 1) })}
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>
      {comparison ? (
        <ComparisonConfigurator
          catalog={catalog}
          slots={comparisonSlots}
          estimates={comparisonEstimates}
          estimating={comparisonEstimating}
          estimateError={comparisonEstimateError}
          onChange={onSlotsChange}
        />
      ) : null}
      {promptRefinementAvailable ? (
        <div className="engine-prompt-refinement">
          <Sparkles className="engine-prompt-refinement__icon" aria-hidden="true" />
          <div className="engine-prompt-refinement__copy">
            <strong>{t('playground.promptRefinement.label')}</strong>
            <span>{t('playground.promptRefinement.description')}</span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={promptRefinementEnabled}
            aria-label={t('playground.promptRefinement.label')}
            className="engine-prompt-refinement__switch"
            onClick={() => onPromptRefinementChange(!promptRefinementEnabled)}
          >
            <span />
          </button>
        </div>
      ) : null}
    </EngineTargetPanelFrame>
  );
}


function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid gap-1 text-sm text-[var(--mpf-text-muted)]"><span>{label}</span>{children}</label>;
}

function dimensionsForRatio(ratio: string) {
  const dimensions: Record<string, { width: number; height: number }> = {
    '6:8': { width: 768, height: 1024 },
    '1:1': { width: 1024, height: 1024 },
    '9:16': { width: 768, height: 1365 },
    '16:9': { width: 1365, height: 768 },
    '4:5': { width: 819, height: 1024 },
    '4:3': { width: 1024, height: 768 }
  };
  return dimensions[ratio] || { width: 1024, height: 1024 };
}

function localized(value: string | Record<string, string>) {
  return typeof value === 'string' ? value : value.en || value.th || Object.values(value)[0] || '';
}

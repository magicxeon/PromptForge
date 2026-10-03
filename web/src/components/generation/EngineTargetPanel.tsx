import { Columns3, Images, Maximize, Minus, Monitor, Plus, SlidersHorizontal, Sparkles } from 'lucide-react';
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import type { ProviderCatalog } from '../../features/generation/schemas/generationSchemas';
import type { ComparisonSlotInput } from '../../features/generation/api/generationApi';
import { ComparisonConfigurator } from '../comparisons/ComparisonConfigurator';
import { EngineTargetPanelFrame } from './EngineTargetPanelFrame';
import { imageModelUnavailableReason, imageModelPickerOptions, supportedImageRatio } from './engineTargetPanelHelpers';
import { GenerationModelPicker } from './GenerationModelPicker';
import { GenerationOptionSelect } from './GenerationOptionSelect';

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
  presentation = 'default',
  inlineModelAction = false,
  fixedAspectRatio = null,
  adaptAspectRatio = false,
  requiredReferenceCount = 0,
  extraControls = null,
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
  presentation?: 'default' | 'compact';
  inlineModelAction?: boolean;
  fixedAspectRatio?: string | null;
  adaptAspectRatio?: boolean;
  requiredReferenceCount?: number;
  extraControls?: ReactNode;
  onChange: (value: EngineValue) => void;
  onComparisonChange: (active: boolean) => void;
  onSlotsChange: (slots: ComparisonSlotInput[]) => void;
  onPromptRefinementChange?: (enabled: boolean) => void;
}) {
  const { t, i18n } = useTranslation('playground');
  const [selectionNotice, setSelectionNotice] = useState('');
  const comparisonButtonRef = useRef<HTMLButtonElement>(null);
  const restoreComparisonFocus = useRef(false);
  useLayoutEffect(() => {
    if (!restoreComparisonFocus.current) return;
    comparisonButtonRef.current?.focus({ preventScroll: true });
    restoreComparisonFocus.current = false;
  }, [comparison]);
  const { t: tUi } = useTranslation('react-ui');
  const provider = catalog.providers.find(item => item.id === value.provider) || catalog.providers[0];
  const model = provider?.models.find(item => item.id === value.model) || provider?.models[0];
  const availableRatios = model?.capabilities.aspectRatios.length ? model.capabilities.aspectRatios : ['6:8', '1:1', '16:9'];
  const ratios = fixedAspectRatio ? [fixedAspectRatio] : availableRatios;
  const resolutions = model?.capabilities.resolutions || [];
  const selectionRatio = fixedAspectRatio || (adaptAspectRatio ? null : value.aspectRatio);
  const dimensions = dimensionsForRatio(fixedAspectRatio || value.aspectRatio);
  const selectedModelUnavailableReason = imageModelUnavailableReason(
    model,
    requiredReferenceCount,
    fixedAspectRatio || value.aspectRatio
  );
  const comparisonUsesAspectOnlyDimensions = comparison && comparisonSlots.some(slot => (
    catalog.providers.find(item => item.id === slot.provider)?.models
      .find(item => item.id === slot.model)?.capabilities.dimensionControl === 'aspect_ratio_only'
  ));
  const showDimensions = model?.capabilities.dimensionControl !== 'aspect_ratio_only'
    && (fixedAspectRatio || value.aspectRatio) !== 'auto' && !comparisonUsesAspectOnlyDimensions;

  function selectModel({ providerId, modelId }: { providerId: string; modelId: string }) {
    const nextModel = catalog.providers.find(item => item.id === providerId)?.models.find(item => item.id === modelId);
    if (!nextModel || imageModelUnavailableReason(nextModel, requiredReferenceCount, selectionRatio)) return;
    const next = { ...value, provider: providerId, model: modelId,
      aspectRatio: adaptAspectRatio && !fixedAspectRatio
        ? supportedImageRatio(nextModel.capabilities.aspectRatios || [], value.aspectRatio) : value.aspectRatio,
      resolution: value.resolution && nextModel.capabilities.resolutions?.includes(value.resolution)
        ? value.resolution : nextModel.capabilities.resolutions?.[0] || nextModel.defaults?.resolution || null };
    const fields = [next.aspectRatio !== value.aspectRatio ? t('playground.engine.aspect') : '',
      next.resolution !== value.resolution ? t('playground.engine.resolution') : ''].filter(Boolean);
    setSelectionNotice(fields.length ? t('playground.options.selectionChanged', { fields: fields.join(', ') }) : '');
    onChange(next);
  }

  const comparisonAction = allowComparison ? <Button ref={comparisonButtonRef}
    className={`engine-comparison-toggle btn-compare-models${comparison ? ' active is-active' : ''}`}
    variant="secondary" icon={<Columns3 className="size-4" />} aria-pressed={comparison}
    onClick={event => {
      // The inline action changes parent when Comparison replaces the model picker.
      restoreComparisonFocus.current = inlineModelAction && document.activeElement === event.currentTarget;
      onComparisonChange(!comparison);
    }}>{t('playground.action.compare')}{comparison ? ` ${comparisonSlots.length}/4` : ''}</Button> : null;

  return (
    <EngineTargetPanelFrame
      studioLayout={studioLayout}
      className={`generation-options-panel${presentation === 'compact' ? ' engine-target-panel--compact' : ''}`}
      title={t('playground.section.engine')}
      description={t('playground.engine.help')}
      badge={studioLayout ? (
        <span className="studio-step-badge">
          {tUi('ui.studio.stepLabel')} 2
        </span>
      ) : null}
      action={!inlineModelAction || comparison ? comparisonAction : null}
    >
      <div className="engine-target-panel__controls">
        {!comparison ? <div className="engine-target-panel__model-grid">
          <GenerationModelPicker providerId={value.provider} modelId={value.model}
            labelAction={inlineModelAction ? comparisonAction : null}
            options={imageModelPickerOptions(catalog, requiredReferenceCount, selectionRatio, i18n?.language || 'en',
              reason => t(`playground.engine.unavailable.${reason}`))}
            onChange={selectModel} />
          {!selectedModelUnavailableReason && model?.testingRoutingEnabled && !model.paidRoutingEnabled
            ? <small className="generation-option-warning">{t('playground.engine.internalTesting')}</small> : null}
        </div> : null}
        {selectionNotice && !comparison ? <p className="generation-option-warning" role="status">{selectionNotice}</p> : null}
        <div className="engine-target-panel__output-grid">
          <GenerationOptionSelect label={t('playground.engine.aspect')} icon={Maximize}
            value={fixedAspectRatio || value.aspectRatio} locked={Boolean(fixedAspectRatio)}
            options={ratios.map(ratio => ({ value: ratio, label: ratio }))}
            onChange={aspectRatio => onChange({ ...value, aspectRatio })} />
          {!comparison && resolutions.length ? <GenerationOptionSelect label={t('playground.engine.resolution')}
            icon={Monitor} value={value.resolution || ''} options={resolutions.map(resolution => ({
              value: resolution, label: resolution.toUpperCase()
            }))} onChange={resolution => onChange({ ...value, resolution: resolution || null })} /> : null}
          {!comparison && allowMultiOutput ? <div className="engine-output-count generation-option-field">
            <span className="generation-option-label"><Images className="inline size-4" aria-hidden="true" /> {t('playground.engine.images')}</span>
            <div className="engine-output-count__stepper">
              <Button type="button" size="icon" variant="secondary"
                title={t('playground.engine.decreaseImages')} aria-label={t('playground.engine.decreaseImages')}
                disabled={value.outputCount <= 1} icon={<Minus className="size-4" />}
                onClick={() => onChange({ ...value, outputCount: Math.max(1, value.outputCount - 1) })} />
              <output aria-live="polite" aria-label={t('playground.engine.images')}>{value.outputCount}</output>
              <Button type="button" size="icon" variant="secondary"
                title={t('playground.engine.increaseImages')} aria-label={t('playground.engine.increaseImages')}
                disabled={value.outputCount >= 4} icon={<Plus className="size-4" />}
                onClick={() => onChange({ ...value, outputCount: Math.min(4, value.outputCount + 1) })} />
            </div>
          </div> : null}
          {!comparison && !allowMultiOutput ? <GenerationOptionSelect label={t('playground.engine.images')}
            icon={Images} locked value={String(value.outputCount)} options={[{ value: String(value.outputCount), label: String(value.outputCount) }]}
            onChange={() => {}} /> : null}
        </div>
      </div>
      {comparison ? (
        <ComparisonConfigurator
          catalog={catalog}
          slots={comparisonSlots}
          estimates={comparisonEstimates}
          estimating={comparisonEstimating}
          estimateError={comparisonEstimateError}
          requiredReferenceCount={requiredReferenceCount}
          aspectRatio={fixedAspectRatio || value.aspectRatio}
          onChange={onSlotsChange}
        />
      ) : null}
      {showDimensions || promptRefinementAvailable || extraControls ? <details className="generation-options-more">
        <summary><SlidersHorizontal aria-hidden="true" />{t('playground.options.more')}
          {promptRefinementAvailable ? <small className="engine-prompt-refinement__free font-medium text-[var(--theme-success)]">{t('playground.promptRefinement.free')}</small> : null}
        </summary>
        <div className="generation-options-more__body">
          {showDimensions ? <dl className="generation-output-details">
            <div><dt>{t('playground.engine.width')}</dt><dd><output aria-label={t('playground.engine.width')}>{dimensions.width} px</output></dd></div>
            <div><dt>{t('playground.engine.height')}</dt><dd><output aria-label={t('playground.engine.height')}>{dimensions.height} px</output></dd></div>
          </dl> : null}
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
          {extraControls}
        </div>
      </details> : null}
    </EngineTargetPanelFrame>
  );
}

function dimensionsForRatio(ratio: string) {
  const dimensions: Record<string, { width: number; height: number }> = {
    '6:8': { width: 768, height: 1024 },
    '3:4': { width: 768, height: 1024 },
    '1:1': { width: 1024, height: 1024 },
    '9:16': { width: 768, height: 1365 },
    '16:9': { width: 1365, height: 768 },
    '4:5': { width: 819, height: 1024 },
    '4:3': { width: 1024, height: 768 }
  };
  if (dimensions[ratio]) return dimensions[ratio];
  const [width, height] = ratio.split(':').map(Number);
  if (width && height && width > 0 && height > 0 && Number.isFinite(width / height)) {
    return width >= height ? { width: Math.round(768 * width / height), height: 768 }
      : { width: 768, height: Math.round(768 * height / width) };
  }
  return { width: 1024, height: 1024 };
}

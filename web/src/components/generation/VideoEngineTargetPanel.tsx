import { AudioLines, Check, Clock3, Columns3, Maximize, Monitor, Volume2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { VideoModelCapability } from '../../features/generation/schemas/videoGenerationSchemas';
import { Button } from '../ui/Button';
import { ProcessingSpinner } from '../ui/ProcessingSpinner';
import { EngineTargetPanelFrame } from './EngineTargetPanelFrame';
import { GenerationModelPicker } from './GenerationModelPicker';
import { GenerationOptionSelect } from './GenerationOptionSelect';

export function VideoEngineTargetPanel({
  models, catalogModels = models, selectedModel, aspectRatio, resolution, durationSeconds,
  audioMode, comparisonEnabled, comparisonActive, quoteLoading, estimatedCredits,
  canAfford, quoteError, maximumCreditEstimate = false, compact = false, title,
  description, badge, showComparisonAction = true, inlineModelAction = false, showQuote = true, compactNotices = false, summary, footer, aspectRatioLocked = false,
  onModelChange, onAspectRatioChange, onResolutionChange, onDurationChange,
  onAudioModeChange, onComparisonChange
}: {
  models: VideoModelCapability[];
  catalogModels?: VideoModelCapability[];
  selectedModel: VideoModelCapability;
  aspectRatio: string;
  resolution: string;
  durationSeconds: number;
  audioMode: string;
  comparisonEnabled: boolean;
  comparisonActive: boolean;
  quoteLoading: boolean;
  estimatedCredits?: number;
  canAfford?: boolean;
  quoteError?: string | null;
  maximumCreditEstimate?: boolean;
  compact?: boolean;
  title?: ReactNode;
  description?: ReactNode;
  badge?: ReactNode;
  showComparisonAction?: boolean;
  inlineModelAction?: boolean;
  showQuote?: boolean;
  compactNotices?: boolean;
  summary?: ReactNode;
  footer?: ReactNode;
  aspectRatioLocked?: boolean;
  onModelChange: (providerModelKey: string) => void;
  onAspectRatioChange: (aspectRatio: string) => void;
  onResolutionChange: (resolution: string) => void;
  onDurationChange: (durationSeconds: number) => void;
  onAudioModeChange: (audioMode: string) => void;
  onComparisonChange: () => void;
}) {
  const { t } = useTranslation('playground');
  const { t: tUi } = useTranslation('react-ui');
  const [selectionNotice, setSelectionNotice] = useState('');
  const outputContractAvailable = selectedModel.pricingStatus !== 'unavailable'
    && selectedModel.durations.length > 0 && selectedModel.resolutions.length > 0
    && selectedModel.audioModes.length > 0;
  const audioBinary = selectedModel.audioModes.length === 2
    && selectedModel.audioModes.includes('none') && selectedModel.audioModes.includes('generated');

  const comparisonAction = showComparisonAction ? <Button
    className={`engine-comparison-toggle btn-compare-models${comparisonActive ? ' active is-active' : ''}`}
    variant="secondary" icon={<Columns3 className="size-4" />}
    disabled={!comparisonEnabled} title={!comparisonEnabled ? t('playground.video.comparisonBlocked') : undefined}
    aria-pressed={comparisonActive} onClick={onComparisonChange}>
    {t('playground.action.compare')}
  </Button> : undefined;

  return <EngineTargetPanelFrame studioLayout
    className={`generation-options-panel generation-options-panel--video${compact ? ' engine-target-panel--compact' : ''}`}
    title={title ?? t('playground.section.engine')}
    description={description ?? t('playground.video.engineDescription')}
    badge={badge ?? <span className="studio-step-badge">{tUi('ui.studio.stepLabel')} 2</span>}
    action={inlineModelAction ? undefined : comparisonAction}>
    <div className="engine-target-panel__controls">
      <div className="engine-target-panel__model-grid">
        <GenerationModelPicker providerId={selectedModel.providerId} modelId={selectedModel.modelId}
          labelAction={inlineModelAction ? comparisonAction : undefined}
          options={catalogModels.map(model => ({ providerId: model.providerId, modelId: model.modelId,
            providerLabel: providerLabel(model.providerId), modelLabel: model.displayName,
            disabledReason: models.some(available => available.providerId === model.providerId && available.modelId === model.modelId)
              ? null : t('playground.video.promptOnlyProvider') }))}
          onChange={({ providerId, modelId }) => {
            const next = models.find(model => model.providerId === providerId && model.modelId === modelId);
            const fields = next ? [!next.aspectRatios.includes(aspectRatio) ? t('playground.engine.aspect') : '',
              !next.durations.includes(durationSeconds) ? t('playground.video.duration') : '',
              !next.resolutions.includes(resolution) ? t('playground.engine.resolution') : '',
              !next.audioModes.includes(audioMode as 'none' | 'generated') ? t('playground.video.audio') : ''].filter(Boolean) : [];
            setSelectionNotice(fields.length ? t('playground.options.selectionChanged', { fields: fields.join(', ') }) : '');
            onModelChange(`${providerId}:${modelId}`);
          }} />
      </div>
      {selectionNotice ? <p className="generation-option-warning" role="status">{selectionNotice}</p> : null}
      {outputContractAvailable ? <div className="engine-target-panel__output-grid">
        {selectedModel.aspectRatios.length ? <GenerationOptionSelect label={t('playground.engine.aspect')}
          icon={Maximize} value={aspectRatio} locked={aspectRatioLocked}
          options={selectedModel.aspectRatios.map(value => ({ value, label: value }))}
          onChange={onAspectRatioChange} /> : null}
        <GenerationOptionSelect label={t('playground.video.duration')} icon={Clock3} value={String(durationSeconds)}
          options={selectedModel.durations.map(value => ({ value: String(value), label: `${value}s` }))}
          onChange={value => onDurationChange(Number(value))} />
        <GenerationOptionSelect label={t('playground.engine.resolution')} icon={Monitor} value={resolution}
          options={selectedModel.resolutions.map(value => ({ value, label: value.toUpperCase() }))}
          onChange={onResolutionChange} />
        {audioBinary ? <div className="generation-option-field">
          <span className="generation-option-label">{t('playground.video.audio')}</span>
          <button type="button" className="generation-option-field__control generation-audio-switch"
            role="switch" aria-checked={audioMode === 'generated'} aria-label={t('playground.video.audio')}
            onClick={() => onAudioModeChange(audioMode === 'generated' ? 'none' : 'generated')}>
            <Volume2 aria-hidden="true" /><span>{t(`playground.options.audio.${audioMode}`)}</span>
            {audioMode === 'generated' ? <Check aria-hidden="true" /> : null}
          </button>
        </div> : <GenerationOptionSelect label={t('playground.video.audio')} icon={AudioLines} value={audioMode}
          options={selectedModel.audioModes.map(value => ({ value, label: t(`playground.options.audio.${value}`) }))}
          onChange={onAudioModeChange} />}
      </div> : <p className="engine-target-panel__video-notice" role="status">{t('playground.video.catalogOnlyNotice')}</p>}
      {!selectedModel.developmentPocUnverified && selectedModel.testingRoutingEnabled && !selectedModel.paidRoutingEnabled
        ? compactNotices ? <details className="engine-target-panel__video-notice engine-target-panel__video-notice--compact">
          <summary>{t('playground.options.internalTestingOnly')}</summary>
          <p>{t('playground.video.internalTestingNotice')}</p>
        </details> : <p className="engine-target-panel__video-notice">{t('playground.video.internalTestingNotice')}</p> : null}
      {summary}
      {outputContractAvailable && showQuote ? <div className="engine-target-panel__video-quote" aria-live="polite" aria-busy={quoteLoading}>
        <span>{t('playground.video.creditEstimate')}</span>
        <strong>{quoteLoading ? <><ProcessingSpinner className="size-4" />{t('playground.estimate.loading')}</>
          : estimatedCredits !== undefined ? maximumCreditEstimate
            ? t('playground.options.maximumCredits', { count: estimatedCredits })
            : `${estimatedCredits} ${t('playground.comparison.credits')}` : '-'}</strong>
        {canAfford === false ? <small>{t('playground.estimate.insufficient')}</small> : null}
        {quoteError ? <small role="alert">{quoteError}</small> : null}
      </div> : null}
      {footer}
    </div>
  </EngineTargetPanelFrame>;
}

function providerLabel(providerId: string) {
  if (providerId === 'gemini') return 'Google Gemini AI';
  if (providerId === 'modelark') return 'BytePlus ModelArk (Seedance)';
  return providerId;
}

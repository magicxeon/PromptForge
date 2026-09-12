import { Columns3 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { VideoModelCapability } from '../../features/generation/schemas/videoGenerationSchemas';
import { Button } from '../ui/Button';
import { EngineTargetPanelFrame } from './EngineTargetPanelFrame';

export function VideoEngineTargetPanel({
  models,
  catalogModels = models,
  selectedModel,
  aspectRatio,
  resolution,
  durationSeconds,
  audioMode,
  comparisonEnabled,
  comparisonActive,
  quoteLoading,
  estimatedCredits,
  canAfford,
  quoteError,
  compact = false,
  title,
  description,
  badge,
  showComparisonAction = true,
  summary,
  footer,
  aspectRatioLocked = false,
  onModelChange,
  onAspectRatioChange,
  onResolutionChange,
  onDurationChange,
  onAudioModeChange,
  onComparisonChange
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
  compact?: boolean;
  title?: ReactNode;
  description?: ReactNode;
  badge?: ReactNode;
  showComparisonAction?: boolean;
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
  const providers = [...new Set(catalogModels.map(model => model.providerId))];
  const providerModels = models.filter(model => model.providerId === selectedModel.providerId);
  const outputContractAvailable = selectedModel.pricingStatus !== 'unavailable'
    && selectedModel.durations.length > 0
    && selectedModel.resolutions.length > 0
    && selectedModel.audioModes.length > 0;

  return (
    <EngineTargetPanelFrame
      studioLayout
      className={compact ? 'engine-target-panel--compact' : undefined}
      title={title ?? t('playground.section.engine')}
      description={description ?? t('playground.video.engineDescription')}
      badge={badge ?? <span className="studio-step-badge">{tUi('ui.studio.stepLabel')} 2</span>}
      action={showComparisonAction ? (
        <Button
          className={`engine-comparison-toggle btn-compare-models${comparisonActive ? ' active is-active' : ''}`}
          variant="secondary"
          icon={<Columns3 className="size-4" />}
          disabled={!comparisonEnabled}
          title={!comparisonEnabled ? t('playground.video.comparisonBlocked') : undefined}
          aria-pressed={comparisonActive}
          onClick={onComparisonChange}
        >
          {t('playground.action.compare')}
        </Button>
      ) : undefined}
    >
      <div className="engine-target-panel__controls">
        <div className="engine-target-panel__model-grid">
          <Field label={t('playground.engine.provider')}>
            <select
              value={selectedModel.providerId}
              onChange={event => {
                const next = models.find(model => model.providerId === event.target.value);
                if (next) onModelChange(`${next.providerId}:${next.modelId}`);
              }}
            >
              {providers.map(providerId => {
                const availableForSource = models.some(model => model.providerId === providerId);
                return (
                  <option key={providerId} value={providerId} disabled={!availableForSource}>
                    {providerLabel(providerId)}
                    {!availableForSource ? ` - ${t('playground.video.promptOnlyProvider')}` : ''}
                  </option>
                );
              })}
            </select>
          </Field>
          <Field label={t('playground.engine.model')}>
            <select
              value={`${selectedModel.providerId}:${selectedModel.modelId}`}
              onChange={event => onModelChange(event.target.value)}
            >
              {providerModels.map(model => (
                <option key={`${model.providerId}:${model.modelId}`} value={`${model.providerId}:${model.modelId}`}>
                  {model.displayName}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {outputContractAvailable ? <div className="engine-target-panel__output-grid">
          <Field label={t('playground.engine.resolution')}>
            <select value={resolution} onChange={event => onResolutionChange(event.target.value)}>
              {selectedModel.resolutions.map(value => <option key={value} value={value}>{value.toUpperCase()}</option>)}
            </select>
          </Field>
          <Field label={t('playground.video.duration')}>
            <select value={durationSeconds} onChange={event => onDurationChange(Number(event.target.value))}>
              {selectedModel.durations.map(value => <option key={value} value={value}>{value}s</option>)}
            </select>
          </Field>
          <Field label={t('playground.video.audio')}>
            <select value={audioMode} onChange={event => onAudioModeChange(event.target.value)}>
              {selectedModel.audioModes.map(value => <option key={value} value={value}>{value}</option>)}
            </select>
          </Field>
          <div className="engine-target-panel__aspect">
            <span>{t('playground.engine.aspect')}</span>
            <div>
              {selectedModel.aspectRatios.map(value => (
                <Button
                  key={value}
                  className={aspectRatio === value ? 'is-selected' : ''}
                  size="sm"
                  variant={aspectRatio === value ? 'primary' : 'secondary'}
                  disabled={aspectRatioLocked && aspectRatio !== value}
                  onClick={() => onAspectRatioChange(value)}
                >
                  {value}
                </Button>
              ))}
            </div>
          </div>
        </div> : (
          <p className="engine-target-panel__video-notice" role="status">
            {t('playground.video.catalogOnlyNotice')}
          </p>
        )}
        {!selectedModel.developmentPocUnverified && selectedModel.testingRoutingEnabled && !selectedModel.paidRoutingEnabled ? (
          <p className="engine-target-panel__video-notice">{t('playground.video.internalTestingNotice')}</p>
        ) : null}
        {summary}
        {outputContractAvailable ? <div className="engine-target-panel__video-quote">
          <span>{t('playground.video.creditEstimate')}</span>
          <strong>{quoteLoading
            ? t('playground.estimate.loading')
            : estimatedCredits !== undefined
              ? `${estimatedCredits} ${t('playground.comparison.credits')}`
              : '-'}</strong>
          {canAfford === false ? <small>{t('playground.estimate.insufficient')}</small> : null}
          {quoteError ? <small>{quoteError}</small> : null}
        </div> : null}
        {footer}
      </div>
    </EngineTargetPanelFrame>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid gap-1 text-sm text-[var(--mpf-text-muted)]"><span>{label}</span>{children}</label>;
}

function providerLabel(providerId: string) {
  if (providerId === 'gemini') return 'Google Gemini AI';
  if (providerId === 'modelark') return 'BytePlus ModelArk (Seedance)';
  return providerId;
}

import { Film, LockKeyhole } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { EngineTargetPanelFrame } from '../../../components/generation/EngineTargetPanelFrame';
import { GenerationStageState } from '../../../components/generation/GenerationStageState';
import { StatusNotice } from '../../../components/ui/StatusNotice';
import {
  cinematicVideoCapabilitySchema,
  type CinematicVideoCapability
} from '../schemas/cinematicSchemas';

export type CinematicGenerationPreviewState = 'ready' | 'queued' | 'completed' | 'failed';

const internalCapability: CinematicVideoCapability = cinematicVideoCapabilitySchema.parse({
  providerId: 'cinematic-preview',
  modelId: 'provider-qualification-pending',
  displayName: 'Qualification preview',
  resolutions: ['720p'],
  aspectRatios: ['9:16'],
  durationsSeconds: [5, 8],
  audioModes: ['none'],
  paidRoutingEnabled: false
});

export function CinematicEngineTargetPanel({
  state = 'ready'
}: {
  state?: CinematicGenerationPreviewState;
}) {
  const { t } = useTranslation('cinematic');

  return (
    <EngineTargetPanelFrame
      id="cinematic-generation-engine"
      title={t('cinematic.engine.title')}
      description={t('cinematic.engine.description')}
      badge={<Film className="size-5 text-[var(--theme-primary)]" aria-hidden="true" />}
      className="cinematic-engine-panel"
    >
      <div className="engine-target-panel__controls">
        <div className="engine-target-panel__model-grid">
          <PreviewField label={t('cinematic.engine.provider')} value={internalCapability.displayName} />
          <PreviewField label={t('cinematic.engine.model')} value={internalCapability.modelId} />
          <PreviewField label={t('cinematic.engine.resolution')} value={internalCapability.resolutions[0] || '720p'} />
          <PreviewField label={t('cinematic.engine.duration')} value={`${internalCapability.durationsSeconds[0]}s`} />
        </div>
        {state === 'ready' ? (
          <StatusNotice tone="info" title={t('cinematic.engine.qualificationPending')}>
            {t('cinematic.engine.noPaidDispatch')}
          </StatusNotice>
        ) : null}
        {state === 'queued' ? (
          <GenerationStageState
            loading
            title={t('cinematic.engine.queued')}
            description={t('cinematic.engine.previewOnly')}
          />
        ) : null}
        {state === 'completed' ? (
          <GenerationStageState
            title={t('cinematic.engine.completed')}
            description={t('cinematic.engine.previewOnly')}
          />
        ) : null}
        {state === 'failed' ? (
          <StatusNotice tone="error" title={t('cinematic.engine.failed')}>
            {t('cinematic.engine.previewOnly')}
          </StatusNotice>
        ) : null}
        <button
          type="button"
          className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-[var(--mpf-radius-sm)] border border-[var(--theme-border)] bg-[var(--theme-input)] px-4 text-xs font-semibold text-[var(--theme-text-muted)] opacity-60"
          disabled
        >
          <LockKeyhole className="size-4" aria-hidden="true" />
          {t('cinematic.engine.generateDisabled')}
        </button>
      </div>
    </EngineTargetPanelFrame>
  );
}

function PreviewField({ label, value }: { label: string; value: string }) {
  return (
    <label className="grid gap-1 text-sm text-[var(--theme-text-muted)]">
      <span>{label}</span>
      <input readOnly value={value} />
    </label>
  );
}

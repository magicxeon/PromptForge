import { RefreshCw, Sparkles } from 'lucide-react';
import { ProcessingSpinner } from '../../../components/ui/ProcessingSpinner';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { ToggleSwitch } from '../../../components/ui/ToggleSwitch';
import type { LookSheetRenderState } from '../../generation/hooks/useLookSheetRender';

export function LookSheetEnhancementPanel({ state, onEnabledChange }: {
  state: LookSheetRenderState; onEnabledChange: (enabled: boolean) => void;
}) {
  const { t } = useTranslation('playground');
  const working = state.stage !== 'idle';
  return <section className="look-sheet-enhancement" aria-label={t('lookSheet.enhancement.title')} aria-busy={working}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h3 className="m-0 flex items-center gap-2 text-base"><Sparkles className="size-4" />{t('lookSheet.enhancement.title')}</h3>
      <div className="flex items-center gap-2">
        {working ? <ProcessingSpinner className="size-5 animate-spin text-[var(--theme-primary)]" aria-hidden="true" /> : null}
        <ToggleSwitch label={t('lookSheet.enhancement.title')} checked={state.enabled} disabled={working} onClick={() => onEnabledChange(!state.enabled)} />
      </div>
    </div>
    {state.enabled ? <div className="mt-3 grid min-w-0 gap-3">
      <p className="m-0 text-sm" role="status">{working ? t(`lookSheet.auto.${state.stage}`)
        : state.pricing ? t('lookSheet.auto.pricing')
          : state.readyId ? t('lookSheet.auto.reused')
            : state.record && state.record.status !== 'quoted' ? t(`lookSheet.enhancement.status.${state.record.status}`)
              : t('lookSheet.auto.onGenerate')}</p>
      {state.fee !== undefined ? <span className="text-sm">{t('lookSheet.enhancement.fee', { credits: state.fee })}</span> : null}
      <small className="text-[var(--mpf-text-muted)]">{t('lookSheet.auto.separateCharge')}</small>
      {state.error ? <p role="alert" className="m-0 text-sm">{state.error.message}</p> : null}
      {state.blocked && !working ? <Button size="sm" variant="ghost" icon={<RefreshCw className="size-4" />}
        disabled={state.refreshing || state.pricing} onClick={() => void state.refresh()}>{t('lookSheet.enhancement.refresh')}</Button> : null}
      {state.stale || ['failed', 'expired'].includes(state.record?.status || '') ? <Button size="sm" icon={<RefreshCw className="size-4" />}
        disabled={working} onClick={state.retry}>{t('lookSheet.enhancement.retry')}</Button> : null}
      {state.readyId && state.record?.prompt ? <details><summary>{t('lookSheet.enhancement.review')}</summary>
        <textarea readOnly rows={8} aria-label={t('lookSheet.enhancement.review')}
          className="mt-2 w-full min-w-0 resize-y rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] p-3" value={state.record.prompt} />
      </details> : null}
    </div> : null}
  </section>;
}

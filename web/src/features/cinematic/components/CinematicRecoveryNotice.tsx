import { RotateCcw, Trash2 } from 'lucide-react';
import { useContext, useEffect, useRef, useState } from 'react';
import { UNSAFE_DataRouterContext, useBlocker } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { StatusNotice } from '../../../components/ui/StatusNotice';

export function CinematicRecoveryNotice({ recovery, disabled = false }: {
  recovery: { pending: boolean; stale: boolean; unavailable: boolean; dirty?: boolean; restore: (acknowledgeStale?: boolean) => void; discard: () => void };
  disabled?: boolean;
}) {
  const { t } = useTranslation('cinematic');
  const dataRouter = useContext(UNSAFE_DataRouterContext);
  const [acknowledged, setAcknowledged] = useState(false);
  const region = useRef<HTMLDivElement>(null);
  function resolve(action: () => void) {
    const main = region.current?.closest('main');
    action();
    requestAnimationFrame(() => main?.querySelector<HTMLTextAreaElement>('textarea:not([disabled])')?.focus());
  }
  return <>
    {dataRouter ? <RecoveryNavigationGuard blocked={Boolean(recovery.unavailable && recovery.dirty)} /> : null}
    {recovery.pending || recovery.unavailable ? <div ref={region}><StatusNotice tone="warning" title={t(recovery.pending ? 'cinematic.recovery.available' : 'cinematic.recovery.unavailable')}>
    {recovery.unavailable ? <p>{t('cinematic.recovery.unavailableDescription')}</p> : null}
    {recovery.pending ? <>
      <p>{t(recovery.stale ? 'cinematic.recovery.stale' : 'cinematic.recovery.description')}</p>
      {recovery.stale ? <label><input type="checkbox" checked={acknowledged} disabled={disabled}
        onChange={event => setAcknowledged(event.target.checked)} />{t('cinematic.recovery.acknowledge')}</label> : null}
      <div className="cinematic-shot-workspace__actions">
        <Button size="sm" icon={<RotateCcw />} disabled={disabled || (recovery.stale && !acknowledged)} onClick={() => resolve(() => recovery.restore(acknowledged))}>{t('cinematic.recovery.restore')}</Button>
        <Button size="sm" icon={<Trash2 />} disabled={disabled} onClick={() => resolve(recovery.discard)}>{t('cinematic.recovery.discard')}</Button>
      </div>
    </> : null}
    </StatusNotice></div> : null}
  </>;
}

function RecoveryNavigationGuard({ blocked }: { blocked: boolean }) {
  const { t } = useTranslation('cinematic');
  const blocker = useBlocker(blocked);
  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    if (window.confirm(t('cinematic.recovery.leaveConfirm'))) blocker.proceed();
    else blocker.reset();
  }, [blocker, t]);
  return null;
}

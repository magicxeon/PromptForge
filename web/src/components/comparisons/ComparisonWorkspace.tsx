import { ChevronLeft, ChevronRight, Crown, Download, Maximize2, ZoomIn, ZoomOut } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Button } from '../ui/Button';
import { Surface } from '../ui/Surface';
import { apiMediaUrl } from '../../lib/api/apiClient';
import type { ComparisonRun, ComparisonSlot } from '../../features/comparisons/schemas/comparisonSchemas';

type ComparisonWorkspaceProps =
  | {
      mode: 'private';
      run: ComparisonRun;
      winnerJobId?: string | null;
      winnerJobIds?: string[];
      onWinnerChange?: (jobId: string | null) => void;
    }
  | {
      mode: 'public';
      run: ComparisonRun;
      winnerJobId?: string | null;
      winnerJobIds?: string[];
      publicVoteJobId?: string | null;
      onVote?: (slotId: string) => void;
    }
  | {
      mode: 'generation';
      run: ComparisonRun;
      winnerJobId?: string | null;
      winnerJobIds?: string[];
    };

export function ComparisonWorkspace(props: ComparisonWorkspaceProps) {
  const { t } = useTranslation(['comparisons', 'playground', 'community']);
  const availableSlots = useMemo(
    () => props.run.slots.filter(slot => slot.result?.imageUrl || slot.status !== 'failed'),
    [props.run.slots]
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const active = availableSlots[Math.min(activeIndex, Math.max(0, availableSlots.length - 1))];
  const prompt = props.run.sourcePrompt || active?.submittedPrompt || '';

  if (!availableSlots.length) {
    return (
      <Surface className="p-6 text-sm text-[var(--mpf-text-muted)]">
        {t('comparisons.viewer.noOutput', 'No comparison output is available.')}
      </Surface>
    );
  }

  function choose(index: number) {
    setActiveIndex(index);
    setZoom(1);
  }

  const activeWinner = isWinner(props, active);
  return (
    <div className="space-y-4">
      <Surface className="overflow-hidden p-0">
        <div className="grid min-h-[520px] grid-cols-[52px_minmax(0,1fr)_52px] bg-black">
          <Button
            variant="ghost"
            size="icon"
            className="h-full w-full rounded-none"
            disabled={activeIndex <= 0}
            title={t('comparisons.viewer.previous', 'Previous result')}
            icon={<ChevronLeft />}
            onClick={() => choose(Math.max(0, activeIndex - 1))}
          />
          <div className="relative grid min-h-0 place-items-center overflow-auto p-3">
            {active?.result?.imageUrl ? (
              <img
                src={apiMediaUrl(active.result.imageUrl) || ''}
                alt=""
                className="max-h-[76vh] max-w-full object-contain transition-transform"
                style={{ transform: `scale(${zoom})` }}
              />
            ) : (
              <p className="text-sm text-[var(--mpf-text-muted)]">{active?.error?.message || active?.status}</p>
            )}
            {activeWinner ? (
              <span className="absolute left-4 top-4 flex items-center gap-2 bg-amber-300 px-3 py-1 text-xs font-bold text-black">
                <Crown className="size-4" />{t('comparisons.viewer.winner')}
              </span>
            ) : null}
            <div className="absolute bottom-3 right-3 flex gap-1 bg-black/75 p-1">
              <Button variant="ghost" size="icon" title={t('comparisons.viewer.zoomOut', 'Zoom out')} icon={<ZoomOut className="size-4" />} onClick={() => setZoom(value => Math.max(0.75, value - 0.25))} />
              <Button variant="ghost" size="icon" title={t('comparisons.viewer.zoomIn', 'Zoom in')} icon={<ZoomIn className="size-4" />} onClick={() => setZoom(value => Math.min(2.5, value + 0.25))} />
              {active?.result?.imageUrl ? (
                <>
                  <a href={apiMediaUrl(active.result.imageUrl) || ''} target="_blank" rel="noreferrer" className="grid size-10 place-items-center text-[var(--mpf-text-muted)] hover:text-white" title={t('comparisons.viewer.fullscreen')}><Maximize2 className="size-4" /></a>
                  <a href={apiMediaUrl(active.result.imageUrl) || ''} download className="grid size-10 place-items-center text-[var(--mpf-text-muted)] hover:text-white" title={t('comparisons.viewer.download')}><Download className="size-4" /></a>
                </>
              ) : null}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-full w-full rounded-none"
            disabled={activeIndex >= availableSlots.length - 1}
            title={t('comparisons.viewer.next', 'Next result')}
            icon={<ChevronRight />}
            onClick={() => choose(Math.min(availableSlots.length - 1, activeIndex + 1))}
          />
        </div>
      </Surface>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {availableSlots.map((slot, index) => (
          <SlotCard
            key={slot.id}
            slot={slot}
            active={index === activeIndex}
            winner={isWinner(props, slot)}
            onOpen={() => choose(index)}
            action={comparisonAction(props, slot, t)}
          />
        ))}
      </div>

      <Surface className="p-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="m-0 text-sm">{t('community.detail.prompt', { ns: 'community', defaultValue: 'Prompt' })}</h2>
          <span className="text-xs text-[var(--mpf-text-muted)]">{prompt.length}</span>
        </div>
        <textarea
          readOnly
          value={prompt}
          aria-label={t('comparisons.viewer.promptLabel', 'Comparison prompt')}
          className="h-56 w-full resize-y overflow-auto border border-[var(--mpf-border)] bg-black/35 p-3 text-xs leading-5 text-[var(--mpf-text-muted)]"
        />
      </Surface>
    </div>
  );
}

function SlotCard({
  slot,
  active,
  winner,
  onOpen,
  action
}: {
  slot: ComparisonSlot;
  active: boolean;
  winner: boolean;
  onOpen: () => void;
  action: ReactNode;
}) {
  const modelLabel = localized(slot.modelDisplayName) || slot.model;
  return (
    <Surface className={`overflow-hidden p-0 ${active ? 'border-cyan-400' : ''} ${winner ? 'shadow-[0_0_18px_rgb(247_189_56_/_0.25)]' : ''}`}>
      <button type="button" className="block w-full border-0 bg-black p-0" onClick={onOpen}>
        {slot.result?.imageUrl ? <img src={apiMediaUrl(slot.thumbnailUrl || slot.result.imageUrl) || ''} alt="" className="aspect-[4/3] w-full object-cover object-top" /> : <span className="grid aspect-[4/3] place-items-center text-xs text-[var(--mpf-text-muted)]">{slot.status}</span>}
      </button>
      <div className="p-3">
        <strong className="block truncate text-sm">{modelLabel}</strong>
        <span className="text-xs text-[var(--mpf-text-muted)]">
          {slot.provider} · {slot.actualCredit || slot.estimatedCredit || 0} credits
        </span>
        {action}
      </div>
    </Surface>
  );
}

function comparisonAction(
  props: ComparisonWorkspaceProps,
  slot: ComparisonSlot,
  t: TFunction
) {
  if (!slot.jobId) return null;
  if (props.mode === 'private' && props.onWinnerChange) {
    const selected = props.winnerJobId === slot.jobId;
    return <Button className="mt-3 w-full" size="sm" variant={selected ? 'primary' : 'secondary'} onClick={() => props.onWinnerChange?.(selected ? null : slot.jobId || null)}>{selected ? t('comparisons.viewer.clearWinner') : t('comparisons.viewer.winner')}</Button>;
  }
  if (props.mode === 'public' && props.onVote) {
    const selected = props.publicVoteJobId === slot.jobId;
    return <Button className="mt-3 w-full" size="sm" variant={selected ? 'primary' : 'secondary'} onClick={() => props.onVote?.(slot.id)}>{selected ? t('comparisons.viewer.voted', 'Voted') : t('comparisons.viewer.vote', 'Vote')}</Button>;
  }
  return null;
}

function isWinner(props: ComparisonWorkspaceProps, slot?: ComparisonSlot) {
  if (!slot?.jobId) return false;
  return props.winnerJobId === slot.jobId || props.winnerJobIds?.includes(slot.jobId) === true;
}

function localized(value: string | Record<string, string> | undefined) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value.en || value.th || Object.values(value)[0] || '';
}

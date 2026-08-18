import {
  ChevronLeft,
  ChevronRight,
  Crown,
  Download,
  Maximize2,
  Minimize2,
  Minus,
  Move,
  Plus,
  RotateCcw
} from 'lucide-react';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode
} from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Button } from '../ui/Button';
import { Surface } from '../ui/Surface';
import { VideoMediaPlayer } from '../media/VideoMediaPlayer';
import { apiMediaUrl } from '../../lib/api/apiClient';
import type {
  ComparisonRun,
  ComparisonSlot
} from '../../features/comparisons/schemas/comparisonSchemas';

type ViewTransform = {
  scale: number;
  x: number;
  y: number;
};

type WorkspaceModeProps =
  | {
      mode: 'private';
      winnerJobId?: string | null;
      winnerJobIds?: string[];
      onWinnerChange?: (jobId: string | null) => void;
    }
  | {
      mode: 'public';
      winnerJobId?: string | null;
      winnerJobIds?: string[];
      publicVoteJobId?: string | null;
      onVote?: (slotId: string) => void;
    }
  | {
      mode: 'generation';
      winnerJobId?: string | null;
      winnerJobIds?: string[];
    };

type ComparisonWorkspaceProps = WorkspaceModeProps & {
  run: ComparisonRun;
  renderSlotActions?: (slot: ComparisonSlot) => ReactNode;
};

const DEFAULT_TRANSFORM: ViewTransform = { scale: 1, x: 0, y: 0 };
const IMAGE_PAGE_SIZE = 3;
const VIDEO_PAGE_SIZE = 2;

export function ComparisonWorkspace(props: ComparisonWorkspaceProps) {
  const { t } = useTranslation(['comparisons', 'community']);
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    slotId: string;
    pointerId: number;
    startX: number;
    startY: number;
    origin: ViewTransform;
  } | null>(null);
  const isVideo = props.run.mediaType === 'video';
  const pageSize = isVideo ? VIDEO_PAGE_SIZE : IMAGE_PAGE_SIZE;
  const availableSlots = useMemo(
    () => props.run.slots.filter(slot => (
      slot.result?.imageUrl || slot.result?.videoUrl || slot.status !== 'failed'
    )),
    [props.run.slots]
  );
  const [pageStart, setPageStart] = useState(0);
  const [syncView, setSyncView] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sharedTransform, setSharedTransform] = useState<ViewTransform>(DEFAULT_TRANSFORM);
  const [slotTransforms, setSlotTransforms] = useState<Record<string, ViewTransform>>({});
  const maximumPageStart = Math.max(0, availableSlots.length - pageSize);
  const hasPages = availableSlots.length > pageSize;
  const normalizedPageStart = Math.min(pageStart, maximumPageStart);
  const visibleSlots = availableSlots.slice(
    normalizedPageStart,
    normalizedPageStart + pageSize
  );
  const prompt = props.run.sourcePrompt || availableSlots[0]?.submittedPrompt || '';

  useEffect(() => {
    const workspace = workspaceRef.current;
    if (!workspace) return;

    const handleWheel = (event: WheelEvent) => {
      if (isVideo) return;
      if (!(event.target instanceof Element)) return;
      const viewport = event.target.closest<HTMLElement>(
        '[data-comparison-slot-id]'
      );
      if (!viewport || !workspace.contains(viewport)) return;

      const slotId = viewport.dataset.comparisonSlotId;
      if (!slotId) return;

      event.preventDefault();
      event.stopPropagation();
      const delta = event.deltaY < 0 ? 0.15 : -0.15;

      if (syncView) {
        setSharedTransform(current => clampTransform({
          ...current,
          scale: current.scale + delta
        }));
        return;
      }

      setSlotTransforms(current => {
        const transform = current[slotId] || DEFAULT_TRANSFORM;
        return {
          ...current,
          [slotId]: clampTransform({
            ...transform,
            scale: transform.scale + delta
          })
        };
      });
    };

    workspace.addEventListener('wheel', handleWheel, { passive: false });
    return () => workspace.removeEventListener('wheel', handleWheel);
  }, [isVideo, syncView]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === workspaceRef.current);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  if (!availableSlots.length) {
    return (
      <Surface className="p-6 text-sm text-[var(--mpf-text-muted)]">
        {t('comparisons.viewer.noOutput')}
      </Surface>
    );
  }

  function currentTransform(slotId: string) {
    return syncView
      ? sharedTransform
      : slotTransforms[slotId] || DEFAULT_TRANSFORM;
  }

  function writeTransform(
    slotId: string,
    updater: (current: ViewTransform) => ViewTransform
  ) {
    if (syncView) {
      setSharedTransform(current => clampTransform(updater(current)));
      return;
    }
    setSlotTransforms(current => ({
      ...current,
      [slotId]: clampTransform(updater(current[slotId] || DEFAULT_TRANSFORM))
    }));
  }

  function zoomVisible(delta: number) {
    if (syncView) {
      setSharedTransform(current => clampTransform({
        ...current,
        scale: current.scale + delta
      }));
      return;
    }
    setSlotTransforms(current => {
      const next = { ...current };
      visibleSlots.forEach(slot => {
        const transform = current[slot.id] || DEFAULT_TRANSFORM;
        next[slot.id] = clampTransform({
          ...transform,
          scale: transform.scale + delta
        });
      });
      return next;
    });
  }

  function resetVisible() {
    setSharedTransform(DEFAULT_TRANSFORM);
    setSlotTransforms(current => {
      const next = { ...current };
      visibleSlots.forEach(slot => {
        next[slot.id] = DEFAULT_TRANSFORM;
      });
      return next;
    });
  }

  function startDrag(slotId: string, event: ReactPointerEvent<HTMLDivElement>) {
    const transform = currentTransform(slotId);
    dragRef.current = {
      slotId,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origin: transform
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function drag(slotId: string, event: ReactPointerEvent<HTMLDivElement>) {
    const active = dragRef.current;
    if (!active || active.slotId !== slotId || active.pointerId !== event.pointerId) return;
    const x = active.origin.x + event.clientX - active.startX;
    const y = active.origin.y + event.clientY - active.startY;
    writeTransform(slotId, current => ({ ...current, x, y }));
  }

  function stopDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  async function toggleFullscreen() {
    if (document.fullscreenElement === workspaceRef.current) {
      await document.exitFullscreen?.();
      return;
    }
    if (!workspaceRef.current?.requestFullscreen) return;
    await workspaceRef.current.requestFullscreen();
  }

  return (
    <div className="comparison-workspace" ref={workspaceRef}>
      <div
        className="comparison-workspace__toolbar"
        aria-label={t('comparisons.viewer.controls')}
      >
        {!isVideo ? <label className="comparison-workspace__sync">
          <input
            type="checkbox"
            checked={syncView}
            onChange={event => {
              const nextSync = event.target.checked;
              if (nextSync) {
                setSharedTransform(
                  slotTransforms[visibleSlots[0]?.id || ''] || sharedTransform
                );
              } else {
                setSlotTransforms(current => ({
                  ...current,
                  ...Object.fromEntries(
                    visibleSlots.map(slot => [slot.id, sharedTransform])
                  )
                }));
              }
              setSyncView(nextSync);
            }}
          />
          <span>{t('comparisons.viewer.sync')}</span>
        </label> : null}
        {!isVideo ? <Button
          variant="ghost"
          size="icon"
          title={t('comparisons.viewer.zoomOut')}
          icon={<Minus className="size-4" />}
          onClick={() => zoomVisible(-0.2)}
        /> : null}
        {!isVideo ? <Button
          variant="ghost"
          size="sm"
          title={t('comparisons.viewer.fit')}
          onClick={resetVisible}
        >
          {t('comparisons.viewer.fit')}
        </Button> : null}
        {!isVideo ? <Button
          variant="ghost"
          size="icon"
          title={t('comparisons.viewer.zoomIn')}
          icon={<Plus className="size-4" />}
          onClick={() => zoomVisible(0.2)}
        /> : null}
        {!isVideo ? <Button
          variant="ghost"
          size="sm"
          icon={<RotateCcw className="size-4" />}
          onClick={resetVisible}
        >
          {t('comparisons.viewer.reset')}
        </Button> : null}
        <Button
          variant="ghost"
          size="sm"
          title={isFullscreen
            ? t('comparisons.viewer.exitFullscreen')
            : t('comparisons.viewer.fullscreen')}
          icon={isFullscreen
            ? <Minimize2 className="size-4" />
            : <Maximize2 className="size-4" />}
          onClick={() => void toggleFullscreen()}
        >
          {isFullscreen
            ? t('comparisons.viewer.exitFullscreen')
            : t('comparisons.viewer.fullscreen')}
        </Button>
      </div>

      <div className="comparison-workspace__page">
        <Button
          className={`comparison-workspace__page-button${hasPages ? '' : ' is-hidden'}`}
          variant="ghost"
          size="icon"
          disabled={!hasPages || normalizedPageStart === 0}
          aria-hidden={!hasPages}
          tabIndex={hasPages ? 0 : -1}
          title={t('comparisons.viewer.previous')}
          icon={<ChevronLeft className="size-5" />}
          onClick={() => setPageStart(current => Math.max(0, current - 1))}
        />

        <div className={`comparison-workspace__grid${isVideo ? ' is-video' : ''}`}>
          {visibleSlots.map(slot => {
            const transform = currentTransform(slot.id);
            const winner = isWinner(props, slot);
            return (
              <article
                key={slot.id}
                className={`comparison-result-panel${winner ? ' is-winner' : ''}`}
              >
                <header className="comparison-result-panel__header">
                  <div>
                    <span>{localized(slot.providerDisplayName) || slot.provider}</span>
                    <strong>{localized(slot.modelDisplayName) || slot.model}</strong>
                  </div>
                  <span className={`comparison-result-panel__status is-${slot.status}`}>
                    {slot.status}
                  </span>
                </header>

                <div
                  className={`comparison-result-panel__viewport${isVideo ? ' is-video' : ''}`}
                  data-comparison-slot-id={slot.id}
                  onPointerDown={isVideo ? undefined : event => startDrag(slot.id, event)}
                  onPointerMove={isVideo ? undefined : event => drag(slot.id, event)}
                  onPointerUp={isVideo ? undefined : stopDrag}
                  onPointerCancel={isVideo ? undefined : stopDrag}
                >
                  {isVideo && slot.result?.videoUrl ? (
                    <VideoMediaPlayer
                      videoUrl={slot.result.videoUrl}
                      posterUrl={slot.result.posterUrl || slot.thumbnailUrl}
                      title={`${localized(slot.providerDisplayName) || slot.provider} ${localized(slot.modelDisplayName) || slot.model}`}
                    />
                  ) : slot.result?.imageUrl ? (
                    <img
                      src={apiMediaUrl(slot.result.imageUrl) || ''}
                      alt=""
                      draggable={false}
                      style={{
                        transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})`
                      }}
                    />
                  ) : (
                    <p>{slot.error?.message || slot.status}</p>
                  )}
                  {winner ? (
                    <span className="comparison-result-panel__winner">
                      <Crown className="size-4" />
                      {t('comparisons.viewer.winner')}
                    </span>
                  ) : null}
                  {!isVideo ? <span className="comparison-result-panel__pan-hint" aria-hidden="true">
                    <Move className="size-4" />
                  </span> : null}
                </div>

                <footer className="comparison-result-panel__footer">
                  <span>
                    {formatDuration(slot.result?.generationDuration)}
                  </span>
                  <div className="comparison-result-panel__actions">
                    {comparisonAction(props, slot, t)}
                    {props.renderSlotActions?.(slot)}
                    {slot.result?.imageUrl || slot.result?.videoUrl ? (
                      <a
                        href={apiMediaUrl(slot.result.videoUrl || slot.result.imageUrl) || ''}
                        download
                        className="comparison-result-panel__download"
                        title={t('comparisons.viewer.download')}
                      >
                        <Download className="size-4" />
                      </a>
                    ) : null}
                  </div>
                </footer>
              </article>
            );
          })}
        </div>

        <Button
          className={`comparison-workspace__page-button${hasPages ? '' : ' is-hidden'}`}
          variant="ghost"
          size="icon"
          disabled={!hasPages || normalizedPageStart >= maximumPageStart}
          aria-hidden={!hasPages}
          tabIndex={hasPages ? 0 : -1}
          title={t('comparisons.viewer.next')}
          icon={<ChevronRight className="size-5" />}
          onClick={() => setPageStart(current => Math.min(maximumPageStart, current + 1))}
        />
      </div>

      {prompt ? (
        <Surface className="comparison-workspace__prompt">
          <div>
            <h2>{t('community.detail.prompt', { ns: 'community' })}</h2>
            <span>{prompt.length}</span>
          </div>
          <textarea
            readOnly
            value={prompt}
            aria-label={t('comparisons.viewer.promptLabel')}
          />
        </Surface>
      ) : null}
    </div>
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
    return (
      <Button
        size="sm"
        variant={selected ? 'primary' : 'secondary'}
        onClick={() => props.onWinnerChange?.(selected ? null : slot.jobId || null)}
      >
        {selected
          ? t('comparisons.viewer.clearWinner')
          : t('comparisons.viewer.winner')}
      </Button>
    );
  }
  if (props.mode === 'public' && props.onVote) {
    const selected = props.publicVoteJobId === slot.id;
    return (
      <Button
        size="sm"
        variant={selected ? 'primary' : 'secondary'}
        onClick={() => props.onVote?.(slot.id)}
      >
        {selected
          ? t('comparisons.viewer.voted')
          : t('comparisons.viewer.vote')}
      </Button>
    );
  }
  return null;
}

function isWinner(props: ComparisonWorkspaceProps, slot?: ComparisonSlot) {
  if (!slot) return false;
  const identity = slot.jobId || slot.id;
  return props.winnerJobId === identity
    || props.winnerJobIds?.includes(identity) === true;
}

function clampTransform(transform: ViewTransform): ViewTransform {
  return {
    scale: Math.min(4, Math.max(0.5, transform.scale)),
    x: Math.min(1200, Math.max(-1200, transform.x)),
    y: Math.min(1200, Math.max(-1200, transform.y))
  };
}

function localized(value: string | Record<string, string> | undefined) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value.en || value.th || Object.values(value)[0] || '';
}

function formatDuration(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return '';
  const normalized = String(value);
  return /(?:ms|s)$/i.test(normalized) ? normalized : `${normalized}s`;
}

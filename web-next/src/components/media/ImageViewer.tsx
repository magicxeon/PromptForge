import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, Download, Expand, ImageIcon, Minus, Plus, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  ProcessingSpinner,
  useActor,
  type HistoryItem,
} from "../../lib/canonical";
import { MediaImage, usePrivateImage } from "./MediaImage";
import { observeIdleScrollbars } from "./idleScrollbars";

export function ImageViewer({ item, initialExpanded = false, onExpandedClose, gallery, onSelect, footer, loadMore, loadingMore, galleryError }: {
  item: HistoryItem | null; initialExpanded?: boolean; onExpandedClose?: () => void;
  gallery?: HistoryItem[]; onSelect?: (item: HistoryItem) => void; footer?: ReactNode;
  loadMore?: () => void; loadingMore?: boolean;
  galleryError?: string;
}) {
  const { t } = useTranslation();
  const { isLoading } = useActor();
  const media = usePrivateImage(item?.imageUrl);
  const [expanded, setExpanded] = useState(initialExpanded);
  const [showThumbnails, setShowThumbnails] = useState(true);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const index = gallery?.findIndex(image => image.id === item?.id) ?? -1;
  function step(direction: number) {
    const next = gallery?.[index + direction];
    if (next) onSelect?.(next);
  }
  const initialFocus = useRef(document.activeElement instanceof HTMLElement ? document.activeElement : null);
  const [natural, setNatural] = useState({ width: 1, height: 1 });
  const [size, setSize] = useState({ width: 1, height: 1 });
  const [manual, setManual] = useState<number | null>(null);
  const [decodeError, setDecodeError] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    x: number;
    y: number;
    left: number;
    top: number;
  } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; zoom: number } | null>(null);
  useEffect(() => {
    setManual(null);
    setNatural({ width: 1, height: 1 });
  }, [item?.id]);
  useEffect(() => {
    setDecodeError(false);
  }, [media.url]);
  useEffect(() => {
    if (isLoading) setExpanded(false);
  }, [isLoading]);
  // Radix mounts its portal after the parent layout pass. Observe the actual
  // surface when it attaches, rather than the previous inline element.
  const attachSurface = useCallback((node: HTMLDivElement | null) => {
    surface.current = node;
    if (!node) return;
    const measure = () => setSize({ width: Math.max(1, node.clientWidth - 32), height: Math.max(1, node.clientHeight - 32) });
    measure();
    const observer = new ResizeObserver(measure);
    const stopScrollbars = observeIdleScrollbars(node);
    observer.observe(node);
    return () => {
      observer.disconnect();
      stopScrollbars();
      if (surface.current === node) surface.current = null;
    };
  }, []);
  const fit = Math.max(
    0.001,
    Math.min(size.width / natural.width, size.height / natural.height, 1),
  );
  const scale = manual ?? fit;
  function zoom(next: number) {
    const clamped = Math.min(8, Math.max(fit, next));
    const node = surface.current;
    const center = node
      ? {
          x: (node.scrollLeft + node.clientWidth / 2) / scale,
          y: (node.scrollTop + node.clientHeight / 2) / scale,
        }
      : null;
    setManual(clamped);
    requestAnimationFrame(() => {
      if (node && center) {
        node.scrollLeft = center.x * clamped - node.clientWidth / 2;
        node.scrollTop = center.y * clamped - node.clientHeight / 2;
      }
    });
  }
  const controls = (
    <div className="viewer-toolbar">
      <div className="toolbar-group">
        <button disabled={!media.url} onClick={() => setManual(null)}>
          {t("fit")}
        </button>
        <button disabled={!media.url} onClick={() => zoom(1)}>
          100%
        </button>
        <button
          aria-label={t("zoomOut")}
          disabled={!media.url}
          onClick={() => zoom(scale / 1.4)}
        >
          <Minus size={16} />
        </button>
        <span className="zoom-value">{Math.round(scale * 100)}%</span>
        <button
          aria-label={t("zoomIn")}
          disabled={!media.url}
          onClick={() => zoom(scale * 1.4)}
        >
          <Plus size={16} />
        </button>
      </div>
      <div className="toolbar-group">
        {media.url && (
          <a
            className="icon-button"
            href={media.url}
            download={`${item?.id || "image"}.${item?.mimeType === "image/jpeg" ? "jpg" : item?.mimeType === "image/webp" ? "webp" : "png"}`}
            aria-label={t("download")}
            title={t("download")}
          >
            <Download size={17} />
          </a>
        )}
        {expanded ? (
          <Dialog.Close asChild>
            <button aria-label={t("close")}>
              <X size={17} />
            </button>
          </Dialog.Close>
        ) : (
          <Dialog.Trigger asChild>
            <button ref={opener} disabled={!item} aria-label={t("expand")}>
              <Expand size={17} />
            </button>
          </Dialog.Trigger>
        )}
      </div>
    </div>
  );
  const content = (
    <>
      {controls}
      <div
        className={`image-surface ${manual && scale > fit ? "zoomed" : ""}`}
        ref={attachSurface}
        tabIndex={item ? 0 : -1}
        aria-label={t("results")}
        onKeyDown={(event) => {
          if (!item) return;
          if (event.key === "+" || event.key === "=") {
            event.stopPropagation();
            event.preventDefault();
            zoom(scale * 1.4);
          } else if (event.key === "-") {
            event.stopPropagation();
            event.preventDefault();
            zoom(scale / 1.4);
          } else if (
            manual &&
            ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
              event.key,
            )
          ) {
            event.preventDefault();
            event.stopPropagation();
            event.currentTarget.scrollBy({
              left:
                event.key === "ArrowLeft"
                  ? -60
                  : event.key === "ArrowRight"
                    ? 60
                    : 0,
              top:
                event.key === "ArrowUp"
                  ? -60
                  : event.key === "ArrowDown"
                    ? 60
                    : 0,
            });
          }
        }}
        onWheel={(event) => {
          if (event.ctrlKey) {
            event.preventDefault();
            zoom(scale * (event.deltaY > 0 ? 0.9 : 1.1));
          }
        }}
        onPointerDown={(event) => {
          if (event.pointerType === "touch" && !manual) {
            swipe.current = { x: event.clientX, y: event.clientY };
            event.currentTarget.setPointerCapture(event.pointerId);
          }
          pointers.current.set(event.pointerId, {
            x: event.clientX,
            y: event.clientY,
          });
          if (manual && scale > fit) {
            event.currentTarget.setPointerCapture(event.pointerId);
            drag.current = {
              x: event.clientX,
              y: event.clientY,
              left: event.currentTarget.scrollLeft,
              top: event.currentTarget.scrollTop,
            };
          }
          if (pointers.current.size === 2) {
            swipe.current = null;
            const [a, b] = [...pointers.current.values()];
            pinch.current = {
              distance: Math.hypot(a.x - b.x, a.y - b.y),
              zoom: scale,
            };
          }
        }}
        onPointerMove={(event) => {
          if (!pointers.current.has(event.pointerId)) return;
          pointers.current.set(event.pointerId, {
            x: event.clientX,
            y: event.clientY,
          });
          if (pinch.current && pointers.current.size === 2) {
            const [a, b] = [...pointers.current.values()];
            zoom(
              (pinch.current.zoom * Math.hypot(a.x - b.x, a.y - b.y)) /
                pinch.current.distance,
            );
          } else if (drag.current) {
            event.currentTarget.scrollLeft =
              drag.current.left - event.clientX + drag.current.x;
            event.currentTarget.scrollTop =
              drag.current.top - event.clientY + drag.current.y;
          }
        }}
        onPointerUp={(event) => {
          if (swipe.current && !manual && pointers.current.size === 1) {
            const dx = event.clientX - swipe.current.x, dy = event.clientY - swipe.current.y;
            if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
          }
          swipe.current = null;
          pointers.current.delete(event.pointerId);
          drag.current = null;
          pinch.current = null;
        }}
        onPointerCancel={() => {
          swipe.current = null;
          pointers.current.clear();
          drag.current = null;
          pinch.current = null;
        }}
      >
        {!item ? (
          <div className="empty-viewer">
            <div className="empty-art">
              <ImageIcon size={34} />
            </div>
            <h2>{t("emptyTitle")}</h2>
            <p>{t("emptyHelp")}</p>
          </div>
        ) : media.error || decodeError ? (
          <div className="empty-viewer" role="alert">
            <p>{t("mediaError")}</p>
            <button
              onClick={() => {
                setDecodeError(false);
                media.retry();
              }}
            >
              {t("retry")}
            </button>
          </div>
        ) : !media.url ? (
          <div className="empty-viewer" role="status">
            <ProcessingSpinner />
            <p>{t("loadingImage")}</p>
          </div>
        ) : (
          <div
            className="image-stage"
            style={{
              minWidth: "100%",
              minHeight: "100%",
              width: natural.width * scale + 32,
              height: natural.height * scale + 32,
            }}
          >
            <img
              onError={() => setDecodeError(true)}
              draggable={false}
              src={media.url}
              alt={item.prompt || t("results")}
              style={{
                width: natural.width * scale,
                height: natural.height * scale,
              }}
              onLoad={(event) =>
                setNatural({
                  width: event.currentTarget.naturalWidth,
                  height: event.currentTarget.naturalHeight,
                })
              }
            />
          </div>
        )}
      </div>
    </>
  );
  return (
    <Dialog.Root open={expanded && !isLoading} onOpenChange={open => {
      setManual(null);
      drag.current = null;
      pinch.current = null;
      pointers.current.clear();
      setExpanded(open);
      if (!open) onExpandedClose?.();
    }}>
      <section className="viewer">{!expanded && content}</section>
      {expanded && !isLoading && (
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content
            className={`expanded-viewer ${gallery ? "gallery-viewer" : ""}`}
            aria-describedby={undefined}
            onKeyDown={(event) => {
              if (!gallery || (event.target instanceof Element && event.target.closest("input,select,textarea,[contenteditable=true]"))) return;
              if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                event.preventDefault(); step(event.key === "ArrowLeft" ? -1 : 1);
              }
            }}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              requestAnimationFrame(() => (initialExpanded ? initialFocus.current : opener.current)?.focus({ preventScroll: true }));
            }}
          >
            <Dialog.Title className="sr-only">{t("results")}</Dialog.Title>
            {content}
            {gallery && <div className="gallery-navigation">
              <button aria-label={t("previousImage")} disabled={index <= 0} onClick={() => step(-1)}><ChevronLeft size={18} /></button>
              <span aria-live="polite">{index + 1} / {gallery.length}</span>
              <button aria-label={t("nextImage")} disabled={index < 0 || index >= gallery.length - 1} onClick={() => step(1)}><ChevronRight size={18} /></button>
              <button aria-expanded={showThumbnails} onClick={() => setShowThumbnails(value => !value)}>{t(showThumbnails ? "hideThumbnails" : "showThumbnails")}</button>
              {loadMore && <button disabled={loadingMore} onClick={loadMore}>{loadingMore && <ProcessingSpinner />}{t("loadMore")}</button>}
            </div>}
            {galleryError && <p role="alert" className="gallery-error">{galleryError}</p>}
            {gallery && showThumbnails && <div className="gallery-filmstrip" aria-label={t("recent")}>
              {gallery.map(image => <button key={image.id} aria-label={image.submodel} aria-pressed={image.id === item?.id}
                ref={node => { if (node && image.id === item?.id) { const parent = node.parentElement; if (parent) parent.scrollLeft = node.offsetLeft - parent.clientWidth / 2 + node.clientWidth / 2; } }}
                onClick={() => onSelect?.(image)}><MediaImage src={image.thumbnailUrl || image.imageUrl} alt={image.submodel} /></button>)}
            </div>}
            {footer && <div className="gallery-actions">{footer}</div>}
          </Dialog.Content>
        </Dialog.Portal>
      )}
    </Dialog.Root>
  );
}

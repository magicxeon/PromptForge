import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Minus, Plus, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ProcessingSpinner, type HistoryItem } from "../../../lib/canonical";
import { usePrivateImage } from "../../../components/media/MediaImage";
import { observeIdleScrollbars } from "../../../components/media/idleScrollbars";

type View = { zoom: number; x: number; y: number };
const initial: View = { zoom: 1, x: 0.5, y: 0.5 };
const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

function DetailPane({
  item,
  view,
  change,
}: {
  item: HistoryItem;
  view: View;
  change: (view: View) => void;
}) {
  const { t } = useTranslation();
  const media = usePrivateImage(item.imageUrl);
  const surface = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 1, height: 1 });
  const [natural, setNatural] = useState({
    width: item.width || 1,
    height: item.height || 1,
  });
  const [broken, setBroken] = useState(false);
  const expected = useRef({ x: 0, y: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef(0);
  const fit = Math.min(
    size.width / natural.width,
    size.height / natural.height,
  );
  const width = natural.width * fit * view.zoom,
    height = natural.height * fit * view.zoom;
  const offsetX = Math.max(0, (size.width - width) / 2),
    offsetY = Math.max(0, (size.height - height) / 2);
  useEffect(() => {
    const node = surface.current!;
    const measure = () =>
      setSize({
        width: Math.max(1, node.clientWidth),
        height: Math.max(1, node.clientHeight),
      });
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    measure();
    const stop = observeIdleScrollbars(node);
    return () => {
      observer.disconnect();
      stop();
    };
  }, []);
  useEffect(() => {
    setBroken(false);
  }, [media.url]);
  useLayoutEffect(() => {
    const node = surface.current!;
    const x = clamp(
      view.x * width + offsetX - size.width / 2,
      0,
      Math.max(0, width - size.width),
    );
    const y = clamp(
      view.y * height + offsetY - size.height / 2,
      0,
      Math.max(0, height - size.height),
    );
    expected.current = { x, y };
    node.scrollLeft = x;
    node.scrollTop = y;
  }, [view, width, height, size, offsetX, offsetY]);
  useEffect(() => {
    const node = surface.current!;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      change({
        ...view,
        zoom: clamp(view.zoom * (event.deltaY > 0 ? 0.9 : 1.1), 1, 8),
      });
    };
    node.addEventListener("wheel", wheel, { passive: false });
    return () => node.removeEventListener("wheel", wheel);
  }, [view, change]);
  return (
    <article className="detail-compare-pane">
      <header title={item.submodel}>{item.submodel}</header>
      <div
        ref={surface}
        className="detail-compare-surface"
        tabIndex={0}
        aria-label={item.submodel}
        onScroll={(event) => {
          const node = event.currentTarget;
          if (
            Math.abs(node.scrollLeft - expected.current.x) < 1 &&
            Math.abs(node.scrollTop - expected.current.y) < 1
          )
            return;
          change({
            ...view,
            x:
              width > size.width
                ? clamp(
                    (node.scrollLeft + size.width / 2 - offsetX) / width,
                    0,
                    1,
                  )
                : view.x,
            y:
              height > size.height
                ? clamp(
                    (node.scrollTop + size.height / 2 - offsetY) / height,
                    0,
                    1,
                  )
                : view.y,
          });
        }}
        onKeyDown={(event) => {
          if (
            ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
              event.key,
            )
          ) {
            event.preventDefault();
            change({
              ...view,
              x: clamp(
                view.x +
                  (event.key === "ArrowLeft"
                    ? -0.04
                    : event.key === "ArrowRight"
                      ? 0.04
                      : 0),
                0,
                1,
              ),
              y: clamp(
                view.y +
                  (event.key === "ArrowUp"
                    ? -0.04
                    : event.key === "ArrowDown"
                      ? 0.04
                      : 0),
                0,
                1,
              ),
            });
          } else if (["+", "=", "-", "0"].includes(event.key)) {
            event.preventDefault();
            change(
              event.key === "0"
                ? initial
                : {
                    ...view,
                    zoom: clamp(
                      view.zoom * (event.key === "-" ? 1 / 1.4 : 1.4),
                      1,
                      8,
                    ),
                  },
            );
          }
        }}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          pointers.current.set(event.pointerId, {
            x: event.clientX,
            y: event.clientY,
          });
          pinch.current = 0;
        }}
        onPointerMove={(event) => {
          const previous = pointers.current.get(event.pointerId);
          if (!previous) return;
          pointers.current.set(event.pointerId, {
            x: event.clientX,
            y: event.clientY,
          });
          if (pointers.current.size === 2) {
            const [a, b] = [...pointers.current.values()];
            const distance = Math.hypot(a.x - b.x, a.y - b.y);
            if (pinch.current > 0)
              change({
                ...view,
                zoom: clamp((view.zoom * distance) / pinch.current, 1, 8),
              });
            pinch.current = distance;
          } else
            change({
              ...view,
              x: clamp(view.x - (event.clientX - previous.x) / width, 0, 1),
              y: clamp(view.y - (event.clientY - previous.y) / height, 0, 1),
            });
        }}
        onPointerUp={(event) => {
          pointers.current.delete(event.pointerId);
          pinch.current = 0;
        }}
        onPointerCancel={() => {
          pointers.current.clear();
          pinch.current = 0;
        }}
      >
        {media.error || broken ? (
          <div className="detail-media-state" role="alert">
            <p>{t("mediaError")}</p>
            <button
              onClick={() => {
                setBroken(false);
                media.retry();
              }}
            >
              {t("retry")}
            </button>
          </div>
        ) : !media.url ? (
          <div className="detail-media-state" role="status">
            <ProcessingSpinner />
            {t("loadingImage")}
          </div>
        ) : (
          <div
            className="detail-image-stage"
            style={{
              width: Math.max(size.width, width),
              height: Math.max(size.height, height),
            }}
          >
            <img
              src={media.url}
              alt={item.submodel}
              draggable={false}
              style={{ width, height }}
              onError={() => setBroken(true)}
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
    </article>
  );
}

export function DetailCompare({ items }: { items: HistoryItem[] }) {
  const { t } = useTranslation("comparison");
  const { t: common } = useTranslation();
  const [open, setOpen] = useState(false);
  const [view, change] = useState<View>(initial);
  const [columns, setColumns] = useState(2);
  const attachGrid = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) return;
      const arrange = () => {
        let best = 1,
          area = -1;
        for (let cols = 1; cols <= items.length; cols++) {
          const rows = Math.ceil(items.length / cols);
          const cellWidth = Math.max(
            1,
            (node.clientWidth - 16 - (cols - 1) * 8) / cols - 2,
          );
          const cellHeight = Math.max(
            1,
            (node.clientHeight - 16 - (rows - 1) * 8) / rows - 30,
          );
          const score = items.reduce((sum, item) => {
            const ratio = (item.width || 1) / (item.height || 1);
            const width = Math.min(cellWidth, cellHeight * ratio);
            return sum + (width * width) / ratio;
          }, 0);
          if (score > area) {
            best = cols;
            area = score;
          }
        }
        setColumns(best);
      };
      const observer = new ResizeObserver(arrange);
      observer.observe(node);
      arrange();
      return () => observer.disconnect();
    },
    [items],
  );
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        change(initial);
      }}
    >
      <Dialog.Trigger asChild>
        <button>{t("detailCompare")}</button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content
          className="detail-compare-dialog"
          aria-describedby={undefined}
        >
          <header>
            <Dialog.Title>{t("detailCompare")}</Dialog.Title>
            <button onClick={() => change(initial)}>
              {common("fit")} / {t("resetView")}
            </button>
            <button
              aria-label={common("zoomOut")}
              disabled={view.zoom <= 1}
              onClick={() =>
                change({ ...view, zoom: clamp(view.zoom / 1.4, 1, 8) })
              }
            >
              <Minus size={17} />
            </button>
            <output aria-live="polite">{Math.round(view.zoom * 100)}%</output>
            <button
              aria-label={common("zoomIn")}
              disabled={view.zoom >= 8}
              onClick={() =>
                change({ ...view, zoom: clamp(view.zoom * 1.4, 1, 8) })
              }
            >
              <Plus size={17} />
            </button>
            <Dialog.Close asChild>
              <button aria-label={common("close")}>
                <X size={18} />
              </button>
            </Dialog.Close>
          </header>
          <p>{t("detailCompareHint")}</p>
          <div
            ref={attachGrid}
            className="detail-compare-grid"
            data-count={items.length}
            style={{
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${Math.ceil(items.length / columns)}, minmax(0, 1fr))`,
            }}
          >
            {items.map((item) => (
              <DetailPane
                key={item.id}
                item={item}
                view={view}
                change={change}
              />
            ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

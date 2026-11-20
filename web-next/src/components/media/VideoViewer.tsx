import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { apiMediaUrl } from "../../../../web/src/lib/api/apiClient";
import { useActor } from "../../lib/canonical";
import type { VideoTask } from "../../../../web/src/features/generation/schemas/videoGenerationSchemas";

export function VideoViewer({ task }: { task: VideoTask }) {
  const { t } = useTranslation("video");
  const { identityScope, isLoading } = useActor();
  const player = useRef<HTMLVideoElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const expandButton = useRef<HTMLButtonElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [actualDuration, setActualDuration] = useState<number | null>(null);
  const authorizedUrl = (path?: string | null) => {
    if (!path || /^(data:|blob:)/i.test(path)) return null;
    const resolved = apiMediaUrl(path);
    if (!resolved) return null;
    try {
      return new URL(resolved, window.location.origin).origin ===
        window.location.origin
        ? resolved
        : null;
    } catch {
      return null;
    }
  };
  const url = authorizedUrl(task.outputAsset?.publicUrl);
  useEffect(() => {
    setFailed(false);
    setActualDuration(null);
    const node = player.current;
    // StrictMode replays setup after cleanup without replacing the element.
    if (node && url && !isLoading && !node.getAttribute("src")) node.src = url;
    return () => {
      if (node) {
        node.pause();
        node.removeAttribute("src");
        node.load();
      }
    };
  }, [task.id, url, identityScope, isLoading, retry]);
  useEffect(() => {
    const changed = () => {
      const active = document.fullscreenElement === stage.current;
      setExpanded(active);
      if (!active) expandButton.current?.focus({ preventScroll: true });
    };
    document.addEventListener("fullscreenchange", changed);
    return () => document.removeEventListener("fullscreenchange", changed);
  }, []);
  if (isLoading || task.status !== "completed" || !url) return null;
  return (
    <section className="video-viewer">
      <div className="video-player-stage" ref={stage}>
        <video
          key={`${identityScope}:${task.id}:${retry}`}
          ref={player}
          src={failed ? undefined : url}
          poster={authorizedUrl(task.outputAsset?.posterUrl) || undefined}
          controls
          playsInline
          preload="metadata"
          aria-label={t("videoPlayer")}
          onError={(event) => {
            event.currentTarget.pause();
            setFailed(true);
          }}
          onLoadedMetadata={(event) =>
            setActualDuration(
              Number.isFinite(event.currentTarget.duration)
                ? event.currentTarget.duration
                : null,
            )
          }
          onPlay={(event) => {
            document
              .querySelectorAll<HTMLVideoElement>("video")
              .forEach((node) => {
                if (node !== event.currentTarget) node.pause();
              });
          }}
        />
        {failed && (
          <div className="video-media-error" role="alert">
            <p>{t("mediaError")}</p>
            <button
              onClick={() => {
                setFailed(false);
                setRetry((value) => value + 1);
              }}
            >
              {t("retryMedia")}
            </button>
          </div>
        )}
      </div>
      <div className="video-result-toolbar">
        <button
          ref={expandButton}
          onClick={() => {
            if (document.fullscreenElement) void document.exitFullscreen();
            else
              void stage.current
                ?.requestFullscreen()
                .catch(() => setFailed(true));
          }}
          disabled={!document.fullscreenEnabled}
        >
          {t(expanded ? "collapse" : "fullscreen")}
        </button>
        <a className="button" href={url} download>
          {t("download")}
        </a>
        <span>{task.modelId}</span>
      </div>
      <dl className="video-metadata">
        <div>
          <dt>{t("requestedDuration")}</dt>
          <dd>
            {task.submittedRequest?.plannedDurationSeconds ||
              task.plannedDurationSeconds ||
              task.submittedRequest?.durationSeconds ||
              task.durationSeconds ||
              "—"}{" "}
            {t("seconds")}
          </dd>
        </div>
        <div>
          <dt>{t("renderDuration")}</dt>
          <dd>
            {task.submittedRequest?.durationReconciliation
              ?.renderDurationSeconds ||
              task.durationSeconds ||
              "—"}{" "}
            {t("seconds")}
          </dd>
        </div>
        <div>
          <dt>{t("actualDuration")}</dt>
          <dd>
            {actualDuration?.toFixed(1) ||
              task.outputAsset?.durationSeconds ||
              "—"}{" "}
            {t("seconds")}
          </dd>
        </div>
      </dl>
    </section>
  );
}

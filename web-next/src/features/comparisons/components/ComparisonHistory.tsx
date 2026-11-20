import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import {
  getComparison,
  getIdentitySnapshot,
  pollingPolicy,
  ProcessingSpinner,
  setComparisonWinner,
  updateComparison,
  useActor,
  type HistoryItem,
} from "../../../lib/canonical";
import { MediaImage } from "../../../components/media/MediaImage";
import { ComparisonResults } from "./ComparisonResults";
import { comparisonHistoryConfig as config } from "../config/comparisonUi";
import type { useComparisonWorkspace } from "../hooks/useComparisonWorkspace";

export function ComparisonHistory({
  history,
}: {
  history: ReturnType<typeof useComparisonWorkspace>["history"];
}) {
  const { t, i18n } = useTranslation("comparison");
  const { t: common } = useTranslation();
  const { identityScope } = useActor();
  const client = useQueryClient();
  const [opened, open] = useState<string | null>(null);
  const openedRef = useRef(opened);
  openedRef.current = opened;
  const [inspected, inspect] = useState<HistoryItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const trigger = useRef<HTMLButtonElement | null>(null);
  const sentinel = useRef<HTMLDivElement | null>(null);
  const flight = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const items =
    history.data?.pages
      .flatMap((page) => page.items)
      .filter(
        (item, index, all) =>
          all.findIndex((other) => other.id === item.id) === index,
      )
      .slice(0, config.maxLoadedSets) || [];
  const detail = useQuery({
    queryKey: ["comparison", identityScope, opened],
    queryFn: ({ signal }) => getComparison(opened!, signal),
    enabled: !!opened,
    retry: false,
    refetchInterval: (query) =>
      query.state.error
        ? false
        : pollingPolicy.comparison(
            Boolean(
              query.state.data?.runs.some(
                (run) =>
                  ![
                    "completed",
                    "partially_completed",
                    "failed",
                    "cancelled",
                  ].includes(run.status),
              ),
            ),
          ),
  });
  useEffect(() => {
    if (
      !config.lazyLoad ||
      !history.hasNextPage ||
      history.isFetching ||
      history.isError ||
      !sentinel.current
    )
      return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          void history.fetchNextPage();
        }
      },
      { rootMargin: `${config.prefetchMarginPx}px` },
    );
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [
    items.length,
    history.hasNextPage,
    history.isFetching,
    history.isError,
    history.fetchNextPage,
  ]);
  async function editSet(action: "name" | "winner", value: string | null) {
    if (!opened || flight.current) return;
    flight.current = true;
    setSaving(true);
    setError("");
    const target = opened,
      epoch = getIdentitySnapshot().epoch;
    try {
      if (action === "name")
        await updateComparison(target, { name: value || "" });
      else await setComparisonWinner(target, value);
      if (!mounted.current || getIdentitySnapshot().epoch !== epoch) return;
      await client.invalidateQueries({
        queryKey: ["comparison", identityScope, target],
      });
      await client.invalidateQueries({
        queryKey: ["fe24-comparisons", identityScope],
      });
    } catch (reason) {
      if (
        mounted.current &&
        openedRef.current === target &&
        getIdentitySnapshot().epoch === epoch
      )
        setError(reason instanceof Error ? reason.message : t("saveFailed"));
    } finally {
      flight.current = false;
      if (mounted.current) setSaving(false);
    }
  }
  return (
    <section className="recent-panel comparison-history">
      <div className="section-heading">
        <h2>{t("historyTitle")}</h2>
        <button
          disabled={history.isFetching}
          onClick={() => void history.refetch()}
        >
          {common("check")}
        </button>
      </div>
      <div className="comparison-history-grid">
        {items.map((item) => (
          <button
            key={item.id}
            className="comparison-history-card"
            onClick={(event) => {
              trigger.current = event.currentTarget;
              setError("");
              inspect(null);
              open(item.id);
            }}
          >
            {!!item.previewImages.length && (
              <div
                className="comparison-history-mosaic"
                data-count={item.previewImages.length}
              >
                {item.previewImages.slice(0, 4).map((preview, index) => (
                  <MediaImage
                    key={preview.jobId || index}
                    src={preview.thumbnailUrl || preview.imageUrl || undefined}
                    alt={t("slot", { number: index + 1 })}
                  />
                ))}
              </div>
            )}
            <div className="comparison-history-caption">
              <strong>{item.name}</strong>
              <time>
                {new Date(item.createdAt).toLocaleString(
                  i18n.language === "th" ? "th-TH" : "en-US",
                )}
              </time>
              <span>
                {common(`status_${item.status}`, { defaultValue: item.status })}{" "}
                ·{" "}
                {t("completedCount", {
                  done: item.completedCount,
                  total: item.slotCount,
                })}
              </span>
              <small>{item.models.join(" · ")}</small>
            </div>
          </button>
        ))}
      </div>
      {history.isPending && (
        <p role="status">
          <ProcessingSpinner />
          {t("loading")}
        </p>
      )}
      {!items.length && !history.isPending && !history.isError && (
        <p>{t("noHistory")}</p>
      )}
      {history.isError && (
        <p role="alert">
          {t("loadFailed")}{" "}
          <button
            onClick={() =>
              void (history.isFetchNextPageError
                ? history.fetchNextPage()
                : history.refetch())
            }
          >
            {common("retry")}
          </button>
        </p>
      )}
      <div ref={sentinel} className="comparison-history-more">
        {history.hasNextPage && (
          <button
            disabled={history.isFetching}
            onClick={() => void history.fetchNextPage()}
          >
            {history.isFetchingNextPage && <ProcessingSpinner />}
            {common("loadMore")}
          </button>
        )}
      </div>
      {items.length >= config.maxLoadedSets && (
        <p>{t("historyLimit", { count: config.maxLoadedSets })}</p>
      )}
      <Dialog.Root
        open={!!opened}
        onOpenChange={(value) => {
          if (!value) {
            open(null);
            inspect(null);
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="comparison-history-overlay" />
          <Dialog.Content
            className="comparison-history-dialog"
            aria-describedby={undefined}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              trigger.current?.focus({ preventScroll: true });
            }}
          >
            <header>
              <Dialog.Title>
                {detail.data?.name || t("historyTitle")}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button aria-label={t("closeHistory")}>
                  <X size={18} />
                </button>
              </Dialog.Close>
            </header>
            <div className="comparison-history-body">
              {detail.isPending && (
                <p role="status">
                  <ProcessingSpinner />
                  {t("loading")}
                </p>
              )}
              {detail.isError && (
                <p role="alert">
                  {t("loadFailed")}{" "}
                  <button onClick={() => void detail.refetch()}>
                    {common("retry")}
                  </button>
                </p>
              )}
              {error && (
                <p role="alert" className="danger">
                  {error}
                </p>
              )}
              {detail.data && (
                <ComparisonResults
                  key={detail.data.id}
                  historyView
                  set={detail.data}
                  saving={saving}
                  editSet={editSet}
                  inspected={inspected}
                  inspect={inspect}
                />
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}

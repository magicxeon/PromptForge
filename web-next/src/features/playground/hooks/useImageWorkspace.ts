import { useEffect, useMemo, useRef, useState } from "react";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  useActor,
  getIdentitySnapshot,
  getProviderCatalog,
  estimateGeneration,
  previewCompiledPrompt,
  previewReferenceProcessing,
  submitGeneration,
  getImageRequestStatus,
  uploadGenerationReference,
  listHistory,
  useGenerationJob,
  useGenerationGroup,
  useGenerationJobCenter,
  imageModelUnavailableReason,
  readActorScopedDraft,
  writeActorScopedDraft,
  removeActorScopedDraft,
  type GenerationRequestDraft,
  type GenerationReferenceRole,
  type HistoryItem,
} from "../../../lib/canonical";
import {
  draftSchema,
  emptyDraft,
  intentSchema,
  persistentDraft,
  referenceUrl,
  outputStorageKey,
  type ImageDraft,
  type ImageIntent,
} from "../state/imageDraft";

export function useImageWorkspace() {
  const { actor, identityScope, isLoading } = useActor();
  const actorId = actor!.userId;
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<ImageDraft>(
    () =>
      draftSchema.safeParse(
        readActorScopedDraft({
          actorId,
          feature: "fe24-image",
          schemaVersion: 1,
          fallback: emptyDraft,
        }),
      ).data || emptyDraft,
  );
  const [intent, setIntent] = useState<ImageIntent | null>(
    () =>
      intentSchema.safeParse(
        readActorScopedDraft({
          actorId,
          feature: "fe24-image-intent",
          schemaVersion: 1,
          fallback: null,
        }),
      ).data || null,
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [, tickQuoteExpiry] = useState(0);
  const flight = useRef(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    if (isLoading)
      setDraft((value) => ({
        ...value,
        references: value.references.map((ref) =>
          ref.status === "uploading" ? { ...ref, status: "reselect" } : ref,
        ),
      }));
  }, [isLoading]);
  const current = (epoch: number) =>
    alive.current &&
    getIdentitySnapshot().ready &&
    getIdentitySnapshot().epoch === epoch;
  useEffect(() => {
    if (isLoading) return;
    try {
      writeActorScopedDraft({
        actorId,
        feature: "fe24-image",
        schemaVersion: 1,
        payload: persistentDraft(draft),
      });
    } catch {
      setError(t("storageError"));
    }
  }, [actorId, draft, isLoading, t]);
  const catalog = useQuery({
    queryKey: ["fe24-catalog", identityScope],
    queryFn: () =>
      getProviderCatalog({
        generationSurface: "playground",
        generationMode: "playground",
      }),
    enabled: !isLoading,
  });
  const models =
    catalog.data?.providers.flatMap((provider) =>
      provider.models
        .filter((model) => model.capabilities.imageGeneration)
        .map((model) => ({ provider, model })),
    ) || [];
  const selected = models.find(
    (item) =>
      item.provider.id === draft.provider && item.model.id === draft.model,
  );
  useEffect(() => {
    if (draft.provider || !catalog.data) return;
    const choices = catalog.data.providers.flatMap((provider) =>
      provider.models
        .filter((model) => model.capabilities.imageGeneration)
        .map((model) => ({ provider, model })),
    );
    const first =
      choices.find(
        (item) =>
          item.provider.id === catalog.data.defaultProvider &&
          item.model.id === item.provider.defaultModel &&
          !imageModelUnavailableReason(item.model),
      ) || choices.find((item) => !imageModelUnavailableReason(item.model));
    if (first)
      setDraft((value) => ({
        ...value,
        provider: first.provider.id,
        model: first.model.id,
        ratio: first.model.capabilities.aspectRatios.includes("1:1")
          ? "1:1"
          : first.model.capabilities.aspectRatios[0] || "1:1",
        resolution:
          first.model.defaults?.resolution ||
          first.model.capabilities.resolutions?.[0] ||
          "",
      }));
  }, [catalog.data, draft.provider]);
  const request = useMemo<GenerationRequestDraft>(
    () => ({
      provider: draft.provider,
      submodel: draft.model,
      prompt: draft.prompt,
      negativePrompt: draft.negative,
      aspectRatio: draft.ratio,
      imageResolution: selected?.model.capabilities.resolutions?.length
        ? draft.resolution || null
        : null,
      outputCount: draft.count,
      generationMode: "playground",
      generationSurface: "playground",
      references: Object.fromEntries(
        draft.references
          .filter((ref) => ref.status === "ready")
          .map((ref) => [ref.role, referenceUrl(ref)]),
      ),
    }),
    [draft, selected?.model],
  );
  const requestKey = JSON.stringify(request);
  const [settledKey, setSettledKey] = useState(requestKey);
  useEffect(() => {
    const timer = setTimeout(() => setSettledKey(requestKey), 450);
    return () => clearTimeout(timer);
  }, [requestKey]);
  const incompatible =
    imageModelUnavailableReason(
      selected?.model,
      draft.references.length,
      draft.ratio,
    ) ||
    (selected?.model.capabilities.resolutions?.length &&
    !selected.model.capabilities.resolutions.includes(draft.resolution)
      ? "resolution"
      : null);
  const valid = Boolean(
    selected &&
    draft.prompt.trim() &&
    !incompatible &&
    draft.references.every(
      (ref) => ref.status === "ready" && referenceUrl(ref),
    ),
  );
  const enabled = valid && !isLoading && settledKey === requestKey;
  const estimate = useQuery({
    queryKey: ["fe24-estimate", identityScope, settledKey],
    queryFn: () => estimateGeneration(JSON.parse(settledKey)),
    enabled,
    retry: false,
  });
  useEffect(() => {
    if (!estimate.data) return;
    const delay =
      new Date(estimate.data.estimate.expiresAt).getTime() - Date.now();
    if (delay <= 0) return;
    const timer = setTimeout(
      () => tickQuoteExpiry((value) => value + 1),
      Math.min(delay + 10, 2_147_483_647),
    );
    return () => clearTimeout(timer);
  }, [estimate.data]);
  const preview = useQuery({
    queryKey: ["fe24-prompt", identityScope, settledKey],
    queryFn: () => previewCompiledPrompt(JSON.parse(settledKey)),
    // The compiled-prompt debug endpoint is admin-only; normal generation does not depend on it.
    enabled: enabled && actor?.role === "admin",
    retry: false,
  });
  const processing = useQuery({
    queryKey: ["fe24-references", identityScope, settledKey],
    queryFn: () => previewReferenceProcessing(JSON.parse(settledKey)),
    enabled: enabled && draft.references.length > 0,
    retry: false,
  });
  const history = useInfiniteQuery({
    queryKey: ["fe24-history", identityScope],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => listHistory(pageParam),
    getNextPageParam: (page) => (page.hasMore ? page.nextCursor : undefined),
    maxPages: 4,
    enabled: !isLoading,
  });
  const jobs = useGenerationJobCenter();
  const job = useGenerationJob(intent?.groupId ? null : intent?.jobId || null);
  const group = useGenerationGroup(intent?.groupId || null);
  const status = group.data?.status || job.data?.status;
  const terminal = [
    "completed",
    "partially_completed",
    "failed",
    "cancelled",
  ].includes(status || "");
  useEffect(() => {
    if (terminal) {
      void queryClient.invalidateQueries({
        queryKey: ["fe24-history", identityScope],
      });
      void jobs.refetch();
    }
  }, [terminal, identityScope, queryClient]);
  const results =
    history.data?.pages
      .flatMap((page) => page.items)
      .filter(
        (item, index, all) =>
          all.findIndex((other) => other.id === item.id) === index,
      ) || [];
  function persistIntent(next: ImageIntent) {
    writeActorScopedDraft({
      actorId,
      feature: "fe24-image-intent",
      schemaVersion: 1,
      payload: next,
    });
    setIntent(next);
  }
  async function check() {
    if (!intent || checking || isLoading) return;
    const epoch = getIdentitySnapshot().epoch;
    setChecking(true);
    try {
      const result = await getImageRequestStatus(intent.requestId);
      if (!current(epoch)) return;
      if (result.state === "found")
        persistIntent({
          ...intent,
          status: "accepted",
          jobId: result.jobId || null,
          groupId: result.groupId || null,
        });
      else if (result.state === "reconciliation_required")
        persistIntent({ ...intent, status: "reconciliation_required" });
      await jobs.refetch();
    } catch (reason) {
      if (current(epoch))
        setError(reason instanceof Error ? reason.message : t("unknown"));
    } finally {
      if (alive.current) setChecking(false);
    }
  }
  const unresolved = Boolean(intent && intent.status !== "accepted");
  const quoteCurrent =
    enabled &&
    !!estimate.data &&
    new Date(estimate.data.estimate.expiresAt).getTime() > Date.now() &&
    !estimate.isFetching &&
    !estimate.error;
  const processingAccepted =
    !draft.references.length ||
    (!!processing.data &&
      ["accepted", "accepted_with_warning"].includes(processing.data.status) &&
      !processing.isFetching &&
      !processing.error);
  const canGenerate =
    quoteCurrent &&
    (actor?.role !== "admin" ||
      (!!preview.data && !preview.isFetching && !preview.error &&
        preview.data.promptBudget?.status !== "over_limit")) &&
    processingAccepted &&
    estimate.data!.account.canAfford &&
    !busy &&
    !unresolved;
  async function generate() {
    if (!canGenerate || flight.current) return;
    const quote = estimate.data!;
    if (new Date(quote.estimate.expiresAt).getTime() <= Date.now()) {
      void estimate.refetch();
      setError(t("quoteError"));
      return;
    }
    flight.current = true;
    setBusy(true);
    setError("");
    const epoch = getIdentitySnapshot().epoch;
    const next: ImageIntent = {
      requestId: `fe24_${crypto.randomUUID()}`,
      estimateId: quote.estimate.estimateId,
      fingerprint: "",
      jobId: null,
      groupId: null,
      status: "unknown",
    };
    let sent = false;
    try {
      const digest = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(requestKey),
      );
      if (!current(epoch)) return;
      next.fingerprint = Array.from(new Uint8Array(digest))
        .map((n) => n.toString(16).padStart(2, "0"))
        .join("");
      persistIntent(next); // A durable intent must exist before the billable request leaves the browser.
      sent = true;
      const result = await submitGeneration(
        request,
        next.estimateId,
        next.requestId,
      );
      if (!current(epoch)) return;
      persistIntent({
        ...next,
        status: "accepted",
        jobId: result.jobId,
        groupId: result.groupId || null,
      });
      await jobs.refetch();
    } catch (reason) {
      if (!current(epoch)) return;
      const httpStatus = Number((reason as { status?: number })?.status || 0);
      if (sent && [400, 402, 403, 422, 429].includes(httpStatus)) {
        removeActorScopedDraft(actorId, "fe24-image-intent");
        setIntent(null);
      }
      setError(
        !sent
          ? t("storageError")
          : reason instanceof Error
            ? reason.message
            : t("unknown"),
      );
    } finally {
      flight.current = false;
      if (alive.current) setBusy(false);
    }
  }
  async function upload(file: File, role: GenerationReferenceRole) {
    if (!file.type.startsWith("image/") || file.size > 12 * 1024 * 1024) {
      setError(t("fileError"));
      return;
    }
    const epoch = getIdentitySnapshot().epoch;
    const id = crypto.randomUUID();
    setDraft((value) => ({
      ...value,
      references: [
        ...value.references.filter((ref) => ref.role !== role),
        { id, role, name: file.name, status: "uploading" },
      ],
    }));
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      if (!current(epoch)) return;
      const result = await uploadGenerationReference(
        dataUrl,
        role,
        "playground",
      );
      if (!current(epoch)) return;
      const storageKey = outputStorageKey(result.imageUrl);
      setDraft((value) => ({
        ...value,
        references: value.references.map((ref) =>
          ref.id === id
            ? { ...ref, id: result.referenceId, storageKey, status: "ready" }
            : ref,
        ),
      }));
    } catch {
      if (current(epoch))
        setDraft((value) => ({
          ...value,
          references: value.references.map((ref) =>
            ref.id === id ? { ...ref, status: "failed" } : ref,
          ),
        }));
    }
  }
  function useReference(item: HistoryItem, role: GenerationReferenceRole) {
    if (
      !selected?.model.capabilities.imageReferences ||
      draft.references.some((ref) => ref.role === role) ||
      draft.references.length >= selected.model.capabilities.maxReferenceImages
    ) {
      setError(t("referencesFull"));
      return;
    }
    try {
      const storageKey = outputStorageKey(item.imageUrl);
      setDraft((value) => ({
        ...value,
        references: [
          ...value.references,
          {
            id: item.id,
            role,
            name: item.submodel,
            storageKey,
            status: "ready",
          },
        ],
      }));
    } catch {
      setError(t("invalid"));
    }
  }
  return {
    draft,
    setDraft,
    catalog,
    models,
    selected,
    incompatible,
    estimate,
    quoteCurrent,
    processingAccepted,
    preview,
    processing,
    history,
    results,
    jobs,
    job,
    group,
    status,
    terminal,
    intent,
    unresolved,
    check,
    checking,
    generate,
    busy,
    canGenerate,
    error,
    upload,
    useReference,
  };
}

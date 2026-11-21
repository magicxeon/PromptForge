import { useEffect, useMemo, useRef, useState } from "react";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useWorkspaceCredits } from "../../../lib/workspaceConfig";
import {
  useActor,
  getIdentitySnapshot,
  getProviderCatalog,
  imageModelUnavailableReason,
  getComparisonPolicy,
  estimateComparison,
  submitComparison,
  getComparisonRequestStatus,
  getComparison,
  listComparisons,
  updateComparison,
  setComparisonWinner,
  pollingPolicy,
  readActorScopedDraft,
  writeActorScopedDraft,
  removeActorScopedDraft,
  uploadGenerationReference,
  type GenerationRequestDraft,
  type GenerationReferenceRole,
  type HistoryItem,
} from "../../../lib/canonical";
import { useCreditConfirmation } from "../../../../../web/src/components/generation/useCreditConfirmation";
import { comparisonHistoryConfig } from "../config/comparisonUi";
import {
  outputStorageKey,
  referenceUrl,
  roles,
} from "../../playground/state/imageDraft";
import {
  comparisonDraftSchema,
  comparisonIntentSchema,
  emptyComparison,
  persistentComparison,
  type ComparisonDraft,
  type ComparisonIntent,
} from "../state/comparisonDraft";

const terminal = (status: string) =>
  ["completed", "partially_completed", "failed", "cancelled"].includes(status);
export function useComparisonWorkspace() {
  const creditsEnabled = useWorkspaceCredits();
  const { actor, identityScope } = useActor();
  const actorId = actor!.userId;
  const { t } = useTranslation("comparison");
  const client = useQueryClient();
  const [draft, setDraft] = useState<ComparisonDraft>(
    () =>
      comparisonDraftSchema.safeParse(
        readActorScopedDraft({
          actorId,
          feature: "fe24-comparison",
          schemaVersion: 1,
          fallback: emptyComparison,
        }),
      ).data || emptyComparison,
  );
  const [intent, setIntent] = useState<ComparisonIntent | null>(
    () =>
      comparisonIntentSchema.safeParse(
        readActorScopedDraft({
          actorId,
          feature: "fe24-comparison-intent",
          schemaVersion: 1,
          fallback: null,
        }),
      ).data || null,
  );
  const [selectedId, selectSet] = useState<string | null>(
    intent?.setId || null,
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const flight = useRef(false),
    alive = useRef(true);
  const [, expireQuote] = useState(0);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const current = (epoch: number) =>
    alive.current &&
    getIdentitySnapshot().ready &&
    getIdentitySnapshot().epoch === epoch;
  useEffect(() => {
    try {
      writeActorScopedDraft({
        actorId,
        feature: "fe24-comparison",
        schemaVersion: 1,
        payload: persistentComparison(draft),
      });
    } catch {
      setError(t("storageError"));
    }
  }, [actorId, draft, t]);
  const catalog = useQuery({
    queryKey: ["fe24-catalog", identityScope],
    queryFn: () =>
      getProviderCatalog({
        generationSurface: "playground",
        generationMode: "playground",
      }),
  });
  const policy = useQuery({
    queryKey: ["comparison-policy", identityScope],
    queryFn: () => getComparisonPolicy(),
    retry: false,
  });
  const models = useMemo(
    () =>
      catalog.data?.providers.flatMap((provider) =>
        provider.models
          .filter((model) => model.capabilities.imageGeneration)
          .map((model) => ({ provider, model })),
      ) || [],
    [catalog.data],
  );
  useEffect(() => {
    if (draft.slots.length || !policy.data || !models.length || creditsEnabled === undefined) return;
    const available = models.filter(
      (item) => !imageModelUnavailableReason(item.model, 0, null, creditsEnabled),
    );
    if (!available.length) return;
    setDraft((value) =>
      value.slots.length
        ? value
        : {
            ...value,
            slots: Array.from(
              { length: policy.data.minimumSlots },
              (_, index) => {
                const item = available[index % available.length];
                return {
                  id: crypto.randomUUID(),
                  provider: item.provider.id,
                  model: item.model.id,
                  enabled: true,
                };
              },
            ),
          },
    );
  }, [draft.slots.length, policy.data, models, creditsEnabled]);
  const enabledSlots = draft.slots.filter((slot) => slot.enabled);
  const slots = enabledSlots.map(({ id, provider, model }) => ({
    id,
    provider,
    model,
  }));
  const selections = enabledSlots.map((slot) =>
    models.find(
      (item) =>
        item.provider.id === slot.provider && item.model.id === slot.model,
    ),
  );
  const ratios =
    selections.length && selections.every(Boolean)
      ? selections[0]!.model.capabilities.aspectRatios.filter((ratio) =>
          selections.every((item) =>
            item!.model.capabilities.aspectRatios.includes(ratio),
          ),
        )
      : [];
  const resolutions = [
    ...new Set(
      selections.flatMap((item) => item?.model.capabilities.resolutions || []),
    ),
  ];
  const maxReferences = Math.min(
    roles.length,
    ...selections.map((item) =>
      item?.model.capabilities.imageReferences
        ? item.model.capabilities.maxReferenceImages
        : 0,
    ),
  );
  const slotIssues = enabledSlots
    .map((slot, index) => ({
      id: slot.id,
      reason: imageModelUnavailableReason(
        selections[index]?.model,
        draft.references.length,
        draft.ratio,
        creditsEnabled,
      ),
    }))
    .filter((item) => item.reason);
  const request: GenerationRequestDraft = {
    provider: slots[0]?.provider || "",
    submodel: slots[0]?.model || "",
    prompt: draft.prompt,
    negativePrompt: draft.negative,
    aspectRatio: draft.ratio,
    imageResolution: draft.resolution || null,
    outputCount: 1,
    generationMode: "playground",
    generationSurface: "playground",
    references: Object.fromEntries(
      draft.references
        .filter((ref) => ref.status === "ready")
        .map((ref) => [ref.role, referenceUrl(ref)]),
    ),
  };
  const requestKey = JSON.stringify({ request, slots });
  const [settledKey, settle] = useState(requestKey);
  useEffect(() => {
    const timer = setTimeout(() => settle(requestKey), 450);
    return () => clearTimeout(timer);
  }, [requestKey]);
  const valid = Boolean(
    policy.data &&
    slots.length >= policy.data.minimumSlots &&
    slots.length <= policy.data.maximumSlots &&
    draft.prompt.trim() &&
    draft.name.trim().length <= 100 &&
    !slotIssues.length &&
    ratios.includes(draft.ratio) &&
    draft.references.every(
      (ref) => ref.status === "ready" && referenceUrl(ref),
    ),
  );
  const estimate = useQuery({
    queryKey: ["fe24-comparison-estimate", identityScope, settledKey],
    queryFn: () => {
      const input = JSON.parse(settledKey);
      return estimateComparison(input.request, input.slots);
    },
    enabled: creditsEnabled === true && valid && requestKey === settledKey,
    retry: false,
  });
  useEffect(() => {
    if (!estimate.data) return;
    const delay = estimate.data.expiresAt - Date.now();
    if (delay <= 0) return;
    const timer = setTimeout(
      () => expireQuote((value) => value + 1),
      Math.min(delay + 10, 2_147_483_647),
    );
    return () => clearTimeout(timer);
  }, [estimate.data]);
  const quoteCurrent =
    creditsEnabled === true &&
    valid &&
    requestKey === settledKey &&
    !!estimate.data &&
    estimate.data.expiresAt > Date.now() &&
    !estimate.isFetching &&
    !estimate.isError;
  const unresolved = !!intent && intent.status !== "accepted";
  const canGenerate = (creditsEnabled === false ? valid : quoteCurrent) && !busy && !unresolved;
  const consent = useCreditConfirmation({
    actorId: creditsEnabled ? actorId : "",
    requestKey: JSON.stringify([requestKey, draft.name, estimate.data]),
    estimatedCredits: quoteCurrent
      ? estimate.data?.estimatedTotalCredit
      : undefined,
    description: t("generateCount", { count: slots.length }),
    ready: creditsEnabled === true && canGenerate,
  });
  const history = useInfiniteQuery({
    retry: false,
    queryKey: [
      "fe24-comparisons",
      identityScope,
      comparisonHistoryConfig.pageSize,
    ],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      listComparisons(pageParam, comparisonHistoryConfig.pageSize),
    getNextPageParam: (page, pages) =>
      page.hasMore &&
      pages.reduce((count, item) => count + item.items.length, 0) <
        comparisonHistoryConfig.maxLoadedSets
        ? page.nextCursor
        : undefined,
  });
  const selected = useQuery({
    queryKey: ["comparison", identityScope, selectedId],
    queryFn: ({ signal }) => getComparison(selectedId!, signal),
    enabled: !!selectedId,
    retry: false,
    refetchInterval: (query) =>
      query.state.error
        ? false
        : pollingPolicy.comparison(
            Boolean(
              query.state.data?.runs.some((run) => !terminal(run.status)),
            ),
          ),
  });
  const active = useQuery({
    queryKey: ["comparison", identityScope, intent?.setId],
    queryFn: ({ signal }) => getComparison(intent!.setId!, signal),
    enabled: !!intent?.setId && intent.setId !== selectedId,
    retry: false,
    refetchInterval: (query) =>
      query.state.error
        ? false
        : pollingPolicy.comparison(
            Boolean(
              query.state.data?.runs.some((run) => !terminal(run.status)),
            ),
          ),
  });
  const activeSet = intent?.setId === selectedId ? selected.data : active.data;
  const activeRun = activeSet?.runs.find((run) => run.id === intent?.runId);
  const activeTerminal = activeRun ? terminal(activeRun.status) : false;
  useEffect(() => {
    if (activeTerminal)
      void client.invalidateQueries({
        queryKey: ["fe24-comparisons", identityScope],
      });
  }, [activeTerminal, identityScope, client]);
  function saveIntent(next: ComparisonIntent) {
    writeActorScopedDraft({
      actorId,
      feature: "fe24-comparison-intent",
      schemaVersion: 1,
      payload: next,
    });
    setIntent(next);
  }
  async function check() {
    if (!intent || checking) return;
    const epoch = getIdentitySnapshot().epoch;
    setChecking(true);
    setError("");
    try {
      const result = await getComparisonRequestStatus(intent.requestId);
      if (!current(epoch)) return;
      if (result.state === "found") {
        saveIntent({
          ...intent,
          status: "accepted",
          setId: result.setId,
          runId: result.runId,
        });
        selectSet(result.setId);
      } else saveIntent({ ...intent, status: result.state });
      void history.refetch();
    } catch (reason) {
      if (current(epoch))
        setError(reason instanceof Error ? reason.message : t("unknown"));
    } finally {
      if (alive.current) setChecking(false);
    }
  }
  async function generate() {
    if (!canGenerate || flight.current) return;
    flight.current = true;
    const epoch = getIdentitySnapshot().epoch;
    let sent = false;
    try {
      if (creditsEnabled && (!(await consent.request()) || !consent.isCurrent() || !current(epoch)))
        return;
      if (creditsEnabled && (!estimate.data || estimate.data.expiresAt <= Date.now())) {
        void estimate.refetch();
        return;
      }
      const bytes = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(requestKey),
      );
      if (
        !current(epoch) ||
        (creditsEnabled && (!consent.isCurrent() || !estimate.data || estimate.data.expiresAt <= Date.now()))
      )
        return;
      setBusy(true);
      setError("");
      const next: ComparisonIntent = {
        requestId: `cmp_${crypto.randomUUID()}`,
        fingerprint: Array.from(new Uint8Array(bytes))
          .map((n) => n.toString(16).padStart(2, "0"))
          .join(""),
        setId: null,
        runId: null,
        status: "unknown",
      };
      saveIntent(next);
      sent = true;
      const result = await submitComparison(
        request,
        slots,
        creditsEnabled ? estimate.data : undefined,
        draft.name.trim() || undefined,
        next.requestId,
      );
      if (!current(epoch)) return;
      saveIntent({
        ...next,
        setId: result.setId,
        runId: result.runId,
        status: "accepted",
      });
      selectSet(result.setId);
      void history.refetch();
    } catch (reason) {
      if (!current(epoch)) return;
      // Failures can occur after a partial reservation/enqueue; preserve intent
      // for reconciliation rather than assuming any HTTP status means no work.
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
    const epoch = getIdentitySnapshot().epoch,
      id = crypto.randomUUID();
    setDraft((value) => ({
      ...value,
      references: [
        ...value.references.filter((ref) => ref.role !== role),
        { id, role, name: file.name, status: "uploading" },
      ],
    }));
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      if (!current(epoch)) return;
      const result = await uploadGenerationReference(data, role, "playground");
      if (!current(epoch)) return;
      const storageKey = outputStorageKey(result.imageUrl);
      setDraft((value) => ({
        ...value,
        references: value.references.map((ref) =>
          ref.id === id ? { ...ref, storageKey, status: "ready" } : ref,
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
      draft.references.some((ref) => ref.role === role) ||
      draft.references.length >= maxReferences
    ) {
      setError(t("referencesFull"));
      return false;
    }
    try {
      const storageKey = outputStorageKey(item.imageUrl);
      setDraft((value) => ({
        ...value,
        references: [
          ...value.references,
          {
            id: crypto.randomUUID(),
            name: item.submodel,
            role,
            storageKey,
            status: "ready",
          },
        ],
      }));
      return true;
    } catch {
      setError(t("fileError"));
      return false;
    }
  }
  async function editSet(action: "name" | "winner", value: string | null) {
    if (!selectedId || saving) return;
    const epoch = getIdentitySnapshot().epoch;
    setSaving(true);
    setError("");
    try {
      if (action === "name")
        await updateComparison(selectedId, { name: value || "" });
      else await setComparisonWinner(selectedId, value);
      if (!current(epoch)) return;
      await selected.refetch();
      void history.refetch();
    } catch (reason) {
      if (current(epoch))
        setError(reason instanceof Error ? reason.message : t("saveFailed"));
    } finally {
      if (alive.current) setSaving(false);
    }
  }
  return {
    draft,
    setDraft,
    models,
    policy,
    catalog,
    slots,
    ratios,
    resolutions,
    maxReferences,
    slotIssues,
    estimate,
    quoteCurrent,
    creditsEnabled,
    canGenerate,
    consent,
    generate,
    busy,
    intent,
    unresolved,
    checking,
    check,
    selected,
    selectSet,
    history,
    error,
    setError,
    upload,
    useReference,
    editSet,
    saving,
    activeRun,
  };
}

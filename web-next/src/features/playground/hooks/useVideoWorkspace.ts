import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  useActor,
  getIdentitySnapshot,
  readActorScopedDraft,
  writeActorScopedDraft,
  uploadGenerationReference,
  useGenerationJobCenter,
} from "../../../lib/canonical";
import {
  getVideoCapabilityCatalog,
  getVideoTask,
  listRecentVideoTasks,
  quoteVideoGeneration,
  submitVideoGeneration,
  getVideoRequestStatus,
  type VideoGenerationInput,
} from "../../../../../web/src/features/generation/api/videoGenerationApi";
import { canQuoteVideoModel, canSubmitUnmeteredVideoModel } from "../../../../../web/src/features/playground/components/videoModelSelection";
import { useWorkspaceCredits } from "../../../lib/workspaceConfig";
import { useCreditConfirmation } from "../../../../../web/src/components/generation/useCreditConfirmation";
import { outputStorageKey } from "../state/imageDraft";
import {
  canRecheckVideo,
  emptyVideoDraft,
  persistentVideoDraft,
  terminalVideoStates,
  videoDraftSchema,
  videoIntentSchema,
  videoReferencePlan,
  type VideoDraft,
  type VideoIntent,
} from "../state/videoDraft";

export function useVideoWorkspace() {
  const creditsEnabled = useWorkspaceCredits();
  const modelAvailable = creditsEnabled === false ? canSubmitUnmeteredVideoModel : canQuoteVideoModel;
  const { actor, identityScope, isLoading } = useActor();
  const actorId = actor!.userId;
  const { t } = useTranslation("video");
  const client = useQueryClient();
  const [draft, setDraft] = useState<VideoDraft>(
    () =>
      videoDraftSchema.safeParse(
        readActorScopedDraft({
          actorId,
          feature: "fe24-video",
          schemaVersion: 1,
          fallback: emptyVideoDraft,
        }),
      ).data || emptyVideoDraft,
  );
  const [intent, setIntent] = useState<VideoIntent | null>(
    () =>
      videoIntentSchema.safeParse(
        readActorScopedDraft({
          actorId,
          feature: "fe24-video-intent",
          schemaVersion: 1,
          fallback: null,
        }),
      ).data || null,
  );
  const [taskId, setTaskId] = useState<string | null>(intent?.taskId || null);
  const [inspectedTaskId, setInspectedTaskId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  const flight = useRef(false);
  const mounted = useRef(true);
  const uploadTokens = useRef(new Map<string, symbol>());
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      uploadTokens.current.clear();
    };
  }, []);
  const current = (epoch: number) =>
    mounted.current &&
    getIdentitySnapshot().ready &&
    getIdentitySnapshot().epoch === epoch;
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (isLoading) return;
    try {
      writeActorScopedDraft({
        actorId,
        feature: "fe24-video",
        schemaVersion: 1,
        payload: persistentVideoDraft(draft),
      });
    } catch {
      setError(t("storageError"));
    }
  }, [actorId, draft, isLoading, t]);
  const catalog = useQuery({
    queryKey: ["video-capabilities", identityScope],
    queryFn: getVideoCapabilityCatalog,
    enabled: !isLoading,
    retry: false,
  });
  const model =
    catalog.data?.models.find(
      (item) => `${item.providerId}:${item.modelId}` === draft.providerModelKey,
    ) || null;
  useEffect(() => {
    if (draft.providerModelKey || !catalog.data?.models.length || creditsEnabled === undefined) return;
    const first =
      catalog.data.models.find(modelAvailable) || catalog.data.models[0];
    setDraft((value) => ({
      ...value,
      providerModelKey: `${first.providerId}:${first.modelId}`,
      duration: String(first.durations[0] || ""),
      aspectRatio: first.aspectRatios[0] || "",
      resolution: first.resolutions[0] || "",
      audioMode: first.audioModes[0] || "none",
    }));
  }, [catalog.data, draft.providerModelKey, creditsEnabled, modelAvailable]);
  const plan = useMemo(() => videoReferencePlan(draft, model), [draft, model]);
  const valid = Boolean(
    model &&
    modelAvailable(model) &&
    (creditsEnabled !== false || (model.inputModes.includes(plan.inputMode)
      && model.commercialOperations.includes("playground_video"))) &&
    plan.ready &&
    draft.prompt.trim() &&
    Array.from(draft.prompt).length <=
      (catalog.data?.promptMaximumCharacters || Infinity) &&
    model.durations.includes(Number(draft.duration)) &&
    model.aspectRatios.includes(draft.aspectRatio) &&
    model.resolutions.includes(draft.resolution) &&
    model.audioModes.includes(draft.audioMode) &&
    (draft.operation === "text_to_video" ||
      draft.sources.every((source) => source.status === "ready")),
  );
  const input = useMemo<VideoGenerationInput | null>(
    () =>
      model
        ? {
            providerId: model.providerId,
            modelId: model.modelId,
            operation: draft.operation,
            inputMode: plan.inputMode,
            prompt: draft.prompt.trim(),
            aspectRatio: draft.aspectRatio,
            resolution: draft.resolution,
            durationSeconds: Number(draft.duration),
            audioMode: draft.audioMode,
            references: plan.references,
            characterProfileId:
              draft.operation === "character_to_video" &&
              !model.playgroundReferencePolicy
                ? draft.sources.find((source) => source.kind === "look")
                    ?.characterProfileId
                : undefined,
            characterProfileVersionId:
              draft.operation === "character_to_video" &&
              !model.playgroundReferencePolicy
                ? draft.sources.find((source) => source.kind === "look")
                    ?.characterProfileVersionId
                : undefined,
            referencePlanVersion:
              draft.operation === "text_to_video"
                ? undefined
                : model.playgroundReferencePolicy?.kind ===
                      "trusted_generated_only" &&
                    !(
                      draft.operation === "image_to_video" &&
                      model.playgroundReferencePolicy.allowImageReferenceUploads
                    )
                  ? "playground-trusted-v1"
                  : "playground-reference-v1",
          }
        : null,
    [draft, model, plan],
  );
  const signature = JSON.stringify(input);
  const [debounced, setDebounced] = useState(signature);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(signature), 350);
    return () => clearTimeout(timer);
  }, [signature]);
  const quote = useQuery({
    queryKey: ["video-quote", identityScope, signature],
    queryFn: () => quoteVideoGeneration(input!),
    enabled: creditsEnabled === true && !isLoading && valid && signature === debounced,
    retry: false,
    staleTime: 15000,
  });
  const jobs = useGenerationJobCenter(12);
  const task = useQuery({
    queryKey: ["video-task", identityScope, taskId],
    queryFn: () => getVideoTask(taskId!),
    enabled: !isLoading && !!taskId,
    retry: false,
    refetchInterval: (query) => {
      const value = query.state.data;
      if (
        !value ||
        terminalVideoStates.has(value.status) ||
        value.automaticMonitoring === false ||
        query.state.error
      )
        return false;
      if (
        value.recovery?.deadlineAt &&
        Date.parse(value.recovery.deadlineAt) <= Date.now()
      )
        return false;
      return Math.max(
        5000,
        value.recovery?.nextCheckAt
          ? Date.parse(value.recovery.nextCheckAt) - Date.now()
          : 5000,
      );
    },
  });
  const inspectedTask = useQuery({
    queryKey: ["video-task", identityScope, inspectedTaskId],
    queryFn: () => getVideoTask(inspectedTaskId!),
    enabled: !isLoading && !!inspectedTaskId && inspectedTaskId !== taskId,
    retry: false,
  });
  const displayedTask =
    inspectedTaskId && inspectedTaskId !== taskId ? inspectedTask : task;
  const recent = useQuery({
    queryKey: ["video-tasks", identityScope, "fe24-recent"],
    queryFn: () => listRecentVideoTasks(12),
    enabled: !isLoading,
    retry: false,
    staleTime: 15000,
  });
  useEffect(() => {
    if (!task.data || !terminalVideoStates.has(task.data.status)) return;
    void recent.refetch();
    void jobs.refetch();
    if (creditsEnabled) void client.invalidateQueries({ queryKey: ["credits"] });
  }, [task.data?.id, task.data?.status]);
  function persistIntent(value: VideoIntent) {
    writeActorScopedDraft({
      actorId,
      feature: "fe24-video-intent",
      schemaVersion: 1,
      payload: value,
    });
    setIntent(value);
  }
  const quoteReady =
    creditsEnabled === true &&
    valid &&
    signature === debounced &&
    !!quote.data &&
    !quote.isFetching &&
    !quote.isError &&
    Date.parse(quote.data.estimate.expiresAt) > now;
  const unresolved = !!intent && intent.status !== "accepted";
  const active =
    !!taskId && (!task.data || !terminalVideoStates.has(task.data.status));
  const canGenerate =
    (creditsEnabled === false ? valid : quoteReady && quote.data?.account.canAfford) &&
    !busy &&
    !unresolved &&
    !active &&
    !isLoading;
  const consent = useCreditConfirmation({
    actorId: creditsEnabled ? actorId : "",
    requestKey: JSON.stringify([signature, quote.data?.estimate.estimateId]),
    estimatedCredits:
      quote.data?.estimate.billingStatus === "qualification_no_charge"
        ? 0
        : quote.data?.estimate.estimatedCredits,
    description: [
      model?.displayName,
      `${draft.duration} ${t("seconds")}`,
      draft.resolution,
    ]
      .filter(Boolean)
      .join(" / "),
    ready: creditsEnabled === true && canGenerate,
  });
  async function generate() {
    if (!canGenerate || flight.current) return;
    flight.current = true;
    const epoch = getIdentitySnapshot().epoch;
    let sent = false;
    try {
      if (creditsEnabled && (!(await consent.request()) || !current(epoch) || !consent.isCurrent()))
        return;
      const priced = creditsEnabled ? quote.data : undefined;
      if (priced && Date.parse(priced.estimate.expiresAt) <= Date.now()) {
        void quote.refetch();
        return;
      }
      setBusy(true);
      setError("");
      const next: VideoIntent = {
        requestId: `fe24_video_${crypto.randomUUID()}`,
        estimateId: priced?.estimate.estimateId || "",
        fingerprint: priced?.requestFingerprint || "",
        taskId: null,
        status: "unknown",
        snapshot: persistentVideoDraft(draft),
      };
      persistIntent(next);
      sent = true;
      const result = await submitVideoGeneration({
        ...input!,
        requestFingerprint: priced?.requestFingerprint,
        estimateId: priced?.estimate.estimateId,
        idempotencyKey: next.requestId,
      });
      if (!current(epoch)) return;
      persistIntent({ ...next, taskId: result.id, status: "accepted" });
      client.setQueryData(["video-task", identityScope, result.id], result);
      setTaskId(result.id);
      setInspectedTaskId(null);
      void jobs.refetch();
      void recent.refetch();
      if (creditsEnabled) void client.invalidateQueries({ queryKey: ["credits"] });
    } catch (reason) {
      if (!current(epoch)) return;
      // A task may already exist even when submission returns an HTTP error.
      // Retain the durable key for read-only reconciliation; never unlock a new POST here.
      setError(
        !sent
          ? t("storageError")
          : reason instanceof Error
            ? reason.message
            : t("unknown"),
      );
    } finally {
      flight.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  async function checkStatus() {
    if (checking || isLoading) return;
    setChecking(true);
    setError("");
    const epoch = getIdentitySnapshot().epoch;
    try {
      if (intent && !intent.taskId) {
        const found = await getVideoRequestStatus(intent.requestId);
        if (!current(epoch)) return;
        if (found.state === "found") {
          persistIntent({
            ...intent,
            taskId: found.taskId,
            status: "accepted",
          });
          setTaskId(found.taskId);
        } else persistIntent({ ...intent, status: found.state });
      } else if (inspectedTaskId || taskId) {
        const target = inspectedTaskId || taskId!;
        const result = await getVideoTask(target, {
          recheck: canRecheckVideo(displayedTask.data),
        });
        if (current(epoch))
          client.setQueryData(["video-task", identityScope, target], result);
      }
    } catch {
      if (current(epoch)) setError(t("checkError"));
    } finally {
      if (mounted.current) setChecking(false);
    }
  }
  async function upload(
    file: File,
    kind: "image" | "look",
    replaceId?: string,
  ) {
    const id = replaceId || crypto.randomUUID(),
      token = Symbol(),
      epoch = getIdentitySnapshot().epoch;
    uploadTokens.current.set(id, token);
    const source = { id, name: "", kind, status: "uploading" as const };
    setDraft((value) => ({
      ...value,
      sources: replaceId
        ? value.sources.map((row) => (row.id === id ? source : row))
        : [...value.sources, source],
    }));
    try {
      if (
        !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
        !file.size ||
        file.size > 12 * 1024 * 1024
      )
        throw new Error("invalid_upload");
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      if (!current(epoch) || uploadTokens.current.get(id) !== token) return;
      const result = await uploadGenerationReference(
        data,
        "character_reference",
        "playground-video",
      );
      if (!current(epoch) || uploadTokens.current.get(id) !== token) return;
      const storageKey = outputStorageKey(result.imageUrl);
      setDraft((value) => ({
        ...value,
        sources: value.sources.map((row) =>
          row.id === id
            ? {
                ...row,
                storageKey,
                assetId: result.referenceId,
                status: "ready",
              }
            : row,
        ),
      }));
    } catch {
      if (current(epoch) && uploadTokens.current.get(id) === token)
        setDraft((value) => ({
          ...value,
          sources: value.sources.map((row) =>
            row.id === id ? { ...row, status: "failed" } : row,
          ),
        }));
    }
  }
  function removeSource(id: string) {
    uploadTokens.current.delete(id);
    setDraft((value) => ({
      ...value,
      sources: value.sources.filter((source) => source.id !== id),
    }));
  }
  const allTasks = [
    ...new Map(
      [
        ...(recent.data?.items || []),
        ...(inspectedTask.data ? [inspectedTask.data] : []),
        ...(task.data ? [task.data] : []),
      ].map((value) => [value.id, value]),
    ).values(),
  ];
  return {
    draft,
    setDraft,
    model,
    catalog,
    plan,
    input,
    valid,
    quote,
    quoteReady,
    creditsEnabled,
    canGenerate,
    generate,
    consent,
    busy,
    checking,
    error,
    intent,
    task: displayedTask,
    taskId,
    setTaskId: setInspectedTaskId,
    jobs,
    recent,
    results: allTasks.filter(
      (value) => value.status === "completed" && value.outputAsset?.publicUrl,
    ),
    allTasks,
    checkStatus,
    upload,
    removeSource,
    now,
  };
}

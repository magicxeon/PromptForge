import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowUp, Coins, Copy, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useLookSheetRender, type LookSheetEnhancementControl, type LookSheetRenderState } from '../../features/generation/hooks/useLookSheetRender';
import { Button } from '../ui/Button';
import { ErrorState, LoadingState } from '../ui/AsyncState';
import { Surface } from '../ui/Surface';
import { StatusNotice } from '../ui/StatusNotice';
import { PromptEditor } from './PromptEditor';
import { PromptComposerAssist } from './PromptComposerAssist';
import { ReferenceSlotGrid, type ReferenceDisplayPreviews } from './ReferenceSlotGrid';
import {
  EngineTargetPanel,
  type EngineValue
} from './EngineTargetPanel';
import {
  createDefaultComparisonSlots,
  filterImageCatalogForSurface,
  imageModelUnavailableReason,
  supportedImageRatio,
  resolveAvailableImageEngine
} from './engineTargetPanelHelpers';
import { GenerationResultSurface } from './GenerationResultSurface';
import {
  estimateComparison,
  estimateAndSubmitGeneration,
  estimateGeneration,
  getProviderCatalog,
  previewCompiledPrompt,
  previewReferenceProcessing,
  submitComparison,
  type ComparisonSlotInput,
  type GenerationReferenceRole,
  type GenerationRequestDraft
} from '../../features/generation/api/generationApi';
import { useGenerationJob } from '../../features/generation/hooks/useGenerationJob';
import { useGenerationGroup } from '../../features/generation/hooks/useGenerationGroup';
import {
  getComparison,
  updateComparison
} from '../../features/comparisons/api/comparisonApi';
import {
  comparisonNeedsPolling,
  comparisonRunStatus,
  newestComparisonRun
} from '../../features/comparisons/comparisonRunState';
import { useActor } from '../../lib/auth/ActorProvider';
import { emitTelemetry } from '../../lib/telemetry/telemetry';
import type { JobStatus, ProviderModel } from '../../features/generation/schemas/generationSchemas';
import type { ReferenceAuthorityProjection } from '../../features/generation/schemas/generationSchemas';
import { StudioRecentGenerations } from '../../features/studio/components/StudioRecentGenerations';
import { StudioGenerationWorkspace } from './StudioGenerationWorkspace';
import { PlaygroundGenerationWorkspace } from './PlaygroundGenerationWorkspace';
import { GenerationReferenceActions } from './GenerationReferenceActions';
import type { StudioCustomColors } from '../../features/studio/attributes/customColorModel';
import { PlaygroundRecentGenerations } from '../../features/playground/components/PlaygroundRecentGenerations';
import {
  GenerationQueueStatus,
  type GenerationProcessQueueItem
} from './GenerationQueueStatus';
import {
  readComparisonGenerationPreferences,
  writeComparisonGenerationPreferences
} from '../../features/comparisons/comparisonGenerationPreferences';
import {
  getCreditAccount,
  grantMockCredits
} from '../../features/credits/api/creditApi';
import { CreditExhaustedDialog } from '../../features/credits/components/CreditExhaustedDialog';
import { queryKeys } from '../../lib/api/queryKeys';
import { pollingPolicy } from '../../lib/api/pollingPolicy';
import { isTerminalJobStatus } from '../../lib/api/jobLifecycle';
import { ApiError } from '../../lib/api/apiError';
import { useFeaturePolicy } from '../../lib/permissions/FeaturePolicyProvider';
import {
  readPromptRefinementPreference,
  writePromptRefinementPreference
} from '../../features/generation/promptRefinementPreference';
import {
  readOutputCountPreference,
  writeOutputCountPreference
} from '../../features/generation/outputCountPreference';
import {
  readImageEnginePreference,
  writeImageEnginePreference
} from '../../features/generation/imageEnginePreference';
import {
  generationRoutePointerFeature,
  readGenerationRoutePointer,
  writeGenerationRoutePointer
} from '../../features/generation/job-center/generationRoutePointer';

type GenerationExperienceProps = {
  lookSheetDefinition?: GenerationRequestDraft['lookSheetDefinition'];
  lookSheetEnhancementId?: string | null;
  surface: 'playground' | 'studio' | 'fashion' | 'cinematic';
  generationMode: 'playground' | 'headshot' | 'scene' | 'character-sheet' | 'fashion';
  initialPrompt?: string;
  prompt?: string;
  onPromptChange?: (prompt: string) => void;
  additionalDirection?: string;
  selections?: Record<string, unknown>;
  customColors?: StudioCustomColors;
  initialReferences?: Partial<Record<GenerationReferenceRole, string>>;
  initialComparisonActive?: boolean;
  references?: Partial<Record<GenerationReferenceRole, string>>;
  referenceDisplayPreviews?: ReferenceDisplayPreviews;
  referenceLead?: ReactNode;
  onReferencesChange?: (references: Partial<Record<GenerationReferenceRole, string>>) => void;
  onReferenceAuthorityChange?: (projection: ReferenceAuthorityProjection | null) => void;
  characterProfileContext?: Record<string, unknown> | null;
  cinematicCastReferences?: GenerationRequestDraft['cinematicCastReferences'];
  cinematicContainsPeople?: boolean;
  characterReferenceOutfitBehavior?: 'replaceable' | 'preserve';
  faceReferenceContext?: { authorizationToken: string; expiresAt?: string } | null;
  sceneTemplateSnapshot?: Record<string, unknown> | null;
  templateUseContext?: {
    templateUseSessionId: string;
    replacements: Record<string, unknown>;
  } | null;
  authoringMode?: 'guided' | 'manual';
  characterType?: 'reusable_model' | 'styled_character' | null;
  allowComparison?: boolean;
  showPromptEditor?: boolean;
  readOnlyPrompt?: { label: string; description?: string } | null;
  readOnlyPromptSupplement?: ReactNode;
  cinematicCaptureProfileId?: 'photorealistic-cinematic' | null;
  engineOptions?: ReactNode;
  renderEngineSelectionNotice?: (selection: {
    providerId: string;
    modelId: string;
    model: ProviderModel | null;
  }) => ReactNode;
  onCompleted?: (jobId: string) => void;
  blockedReason?: string | null;
  blockedNotice?: ReactNode;
  showEngine?: boolean;
  enginePresentation?: 'default' | 'compact';
  layoutVariant?: 'stacked' | 'studio' | 'playground';
  showRecentGenerations?: boolean;
  recentExpanded?: boolean;
  onRecentExpandedChange?: (expanded: boolean) => void;
  referenceRoles?: GenerationReferenceRole[];
  renderResultActions?: (job: JobStatus, context: { closeViewer: () => void }) => ReactNode;
  studioBuilder?: ReactNode | ((draft: GenerationRequestDraft, enhancement: LookSheetRenderState) => ReactNode);
  lookSheetEnhancement?: LookSheetEnhancementControl;
  studioBuilderTitle?: string;
  studioConfigurationFirst?: boolean;
  studioModeSelector?: ReactNode;
  studioQueueExtra?: ReactNode;
  studioConfigActions?: ReactNode;
  fixedAspectRatio?: string | null;
  fixedOutputCount?: number | null;
  initialEnginePreference?: { provider: string; model: string } | null;
  allowPromptRefinement?: boolean;
  persistenceScope?: string;
  referencesReadOnly?: boolean;
  showEmptyResult?: boolean;
  resumeJobId?: string | null;
  submitSingleDraft?: (draft: GenerationRequestDraft) => Promise<{
    jobId: string;
    groupId?: string | null;
    status: string;
  }>;
};

export function GenerationExperience({
  lookSheetDefinition = null,
  lookSheetEnhancementId = null,
  surface,
  generationMode,
  initialPrompt = '',
  prompt: controlledPrompt,
  onPromptChange,
  additionalDirection = '',
  selections,
  customColors,
  initialReferences = {},
  initialComparisonActive = false,
  references: controlledReferences,
  referenceDisplayPreviews,
  referenceLead,
  onReferencesChange,
  onReferenceAuthorityChange,
  characterProfileContext = null,
  cinematicCastReferences,
  cinematicContainsPeople,
  characterReferenceOutfitBehavior = 'preserve',
  faceReferenceContext = null,
  sceneTemplateSnapshot = null,
  templateUseContext = null,
  authoringMode = 'manual',
  characterType = null,
  allowComparison = true,
  showPromptEditor = true,
  readOnlyPrompt = null,
  readOnlyPromptSupplement,
  cinematicCaptureProfileId,
  engineOptions,
  renderEngineSelectionNotice,
  onCompleted,
  blockedReason = null,
  blockedNotice,
  showEngine = true,
  enginePresentation = 'default',
  layoutVariant = 'stacked',
  showRecentGenerations = true,
  recentExpanded = true,
  onRecentExpandedChange = () => {},
  referenceRoles,
  renderResultActions,
  studioBuilder,
  lookSheetEnhancement,
  studioBuilderTitle,
  studioConfigurationFirst = false,
  studioModeSelector,
  studioQueueExtra,
  studioConfigActions,
  fixedAspectRatio: requestedFixedAspectRatio = null,
  fixedOutputCount: requestedFixedOutputCount = null,
  initialEnginePreference = null,
  allowPromptRefinement = true,
  persistenceScope = '',
  referencesReadOnly = false,
  showEmptyResult = false,
  resumeJobId = null,
  submitSingleDraft
}: GenerationExperienceProps) {
  const queryClient = useQueryClient();
  const { actor, mockSwitcherEnabled } = useActor();
  const { isEnabled } = useFeaturePolicy();
  const { t, i18n } = useTranslation('playground');
  const { t: tUi } = useTranslation('react-ui');
  const promptRef = useRef<HTMLElement | null>(null);
  const resultRef = useRef<HTMLElement | null>(null);
  const initialPromptRef = useRef(initialPrompt);
  const initialReferencesRef = useRef(initialReferences);
  const [localPrompt, setLocalPrompt] = useState(initialPrompt);
  const prompt = controlledPrompt ?? localPrompt;
  const setPrompt = (value: string) => {
    setLocalPrompt(value);
    onPromptChange?.(value);
  };
  const [negativePrompt, setNegativePrompt] = useState('');
  const [localReferences, setLocalReferences] = useState(initialReferences);
  const [referenceScopes, setReferenceScopes] = useState<
    Partial<Record<GenerationReferenceRole, string>>
  >({});
  const references = controlledReferences ?? localReferences;
  const setReferences = (next: Partial<Record<GenerationReferenceRole, string>>) => {
    setLocalReferences(next);
    onReferencesChange?.(next);
  };
  const [engine, setEngine] = useState<EngineValue>({ provider: '', model: '', resolution: null, aspectRatio: '6:8', outputCount: 1 });
  const [comparison, setComparison] = useState(false);
  const [comparisonSlots, setComparisonSlots] = useState<ComparisonSlotInput[]>([]);
  const [comparisonJobBindings, setComparisonJobBindings] = useState<Array<{
    slotId: string;
    jobId?: string | null;
  }>>([]);
  const [jobId, setJobId] = useState<string | null>(null);
  const [generationGroupId, setGenerationGroupId] = useState<string | null>(null);
  const [comparisonSetId, setComparisonSetId] = useState<string | null>(null);
  const [routePointerActorId, setRoutePointerActorId] = useState<string | null>(null);
  const [resultFocusSequence, setResultFocusSequence] = useState(0);
  const [debouncedDraft, setDebouncedDraft] = useState<GenerationRequestDraft | null>(null);
  const [comparisonPreferencesActorId, setComparisonPreferencesActorId] = useState<string | null>(null);
  const [creditDialogOpen, setCreditDialogOpen] = useState(false);
  const [promptRefinementEnabled, setPromptRefinementEnabled] = useState(false);
  const [promptRefinementActorId, setPromptRefinementActorId] = useState<string | null>(null);
  const completedJobRef = useRef<string | null>(null);
  const completedGroupJobsRef = useRef(new Set<string>());
  const [outputCountPreferenceActorId, setOutputCountPreferenceActorId] = useState<string | null>(null);
  const [enginePreferenceActorId, setEnginePreferenceActorId] = useState<string | null>(null);
  const actorId = actor?.userId || 'loading';
  const routePointerFeature = generationRoutePointerFeature(surface, generationMode, persistenceScope);
  const fixedOutputCount = requestedFixedOutputCount === null
    ? null
    : Math.max(1, Math.min(4, Math.trunc(requestedFixedOutputCount)));
  const fixedAspectRatio = requestedFixedAspectRatio || (generationMode === 'character-sheet'
    && !lookSheetDefinition
    && characterType === 'reusable_model'
    ? '1:1'
    : null);
  const requiredReferenceCount = Object.values(references).filter(Boolean).length
    + (characterProfileContext?.purpose === 'character_usage' ? 1 : 0) + (cinematicCastReferences?.length || 0);

  const catalog = useQuery({
    queryKey: ['provider-catalog', surface, generationMode, comparison ? 'comparison.image' : null],
    queryFn: () => getProviderCatalog({
      generationSurface: surface,
      generationMode,
      workflow: comparison ? 'comparison.image' : undefined
    }),
    staleTime: 0,
    select: data => filterImageCatalogForSurface(data, surface, generationMode)
  });
  const creditAccount = useQuery({
    queryKey: queryKeys.credits(actorId),
    queryFn: getCreditAccount,
    enabled: Boolean(actor),
    staleTime: 15_000
  });
  useEffect(() => {
    const pointer = actor?.userId
      ? readGenerationRoutePointer(actor.userId, routePointerFeature)
      : null;
    setJobId(resumeJobId || pointer?.jobId || null);
    setGenerationGroupId(pointer?.generationGroupId || null);
    setComparisonSetId(pointer?.comparisonSetId || null);
    setRoutePointerActorId(actor?.userId || null);
    setComparison(false);
    setComparisonSlots([]);
    setComparisonPreferencesActorId(null);
    setCreditDialogOpen(false);
    setPromptRefinementEnabled(false);
    setPromptRefinementActorId(null);
    setOutputCountPreferenceActorId(null);
    setEnginePreferenceActorId(null);
    setEngine(current => ({
      ...current,
      provider: '',
      model: '',
      resolution: null,
      outputCount: fixedOutputCount || 1
    }));
    setLocalPrompt(initialPromptRef.current);
    setNegativePrompt('');
    setLocalReferences(initialReferencesRef.current);
    setReferenceScopes({});
    completedJobRef.current = null;
    completedGroupJobsRef.current.clear();
  }, [actor?.userId, fixedOutputCount, resumeJobId, routePointerFeature]);

  useEffect(() => {
    if (!actor?.userId || routePointerActorId !== actor.userId) return;
    writeGenerationRoutePointer(actor.userId, routePointerFeature, {
      jobId,
      generationGroupId,
      comparisonSetId
    });
  }, [
    actor?.userId,
    comparisonSetId,
    generationGroupId,
    jobId,
    routePointerActorId,
    routePointerFeature
  ]);

  useEffect(() => {
    if (!actor || outputCountPreferenceActorId === actor.userId) return;
    if (fixedOutputCount !== null) {
      setEngine(current => ({ ...current, outputCount: fixedOutputCount }));
      setOutputCountPreferenceActorId(actor.userId);
      return;
    }
    const outputCount = readOutputCountPreference(actor.userId);
    setEngine(current => ({ ...current, outputCount }));
    setOutputCountPreferenceActorId(actor.userId);
  }, [actor, fixedOutputCount, outputCountPreferenceActorId]);

  useEffect(() => {
    if (!actor || fixedOutputCount !== null || outputCountPreferenceActorId !== actor.userId) return;
    writeOutputCountPreference(actor.userId, engine.outputCount);
  }, [actor, engine.outputCount, fixedOutputCount, outputCountPreferenceActorId]);

  useEffect(() => {
    if (!actor || promptRefinementActorId === actor.userId) return;
    setPromptRefinementEnabled(readPromptRefinementPreference(actor.userId));
    setPromptRefinementActorId(actor.userId);
  }, [actor, promptRefinementActorId]);

  useEffect(() => {
    if (!actor || promptRefinementActorId !== actor.userId) return;
    writePromptRefinementPreference(actor.userId, promptRefinementEnabled);
  }, [actor, promptRefinementActorId, promptRefinementEnabled]);

  useEffect(() => {
    if (!actor || !catalog.data || engine.provider || enginePreferenceActorId === actor.userId) return;
    const preference = initialEnginePreference || readImageEnginePreference(actor.userId);
    const resolved = resolveAvailableImageEngine(
      catalog.data,
      preference,
      requiredReferenceCount,
      fixedAspectRatio
    );
    const provider = resolved?.provider;
    const model = resolved?.model;
    setEngine({
      provider: provider?.id || '',
      model: model?.id || '',
      resolution: model?.capabilities.resolutions?.[0] || model?.defaults?.resolution || null,
      aspectRatio: fixedAspectRatio
        || (lookSheetDefinition ? supportedImageRatio(model?.capabilities.aspectRatios || [])
          : model?.capabilities.aspectRatios.includes('6:8') ? '6:8' : model?.capabilities.aspectRatios[0] || '1:1'),
      outputCount: fixedOutputCount || engine.outputCount
    });
    setEnginePreferenceActorId(actor.userId);
  }, [
    actor,
    catalog.data,
    enginePreferenceActorId,
    engine.outputCount,
    engine.provider,
    fixedAspectRatio,
    fixedOutputCount,
    initialEnginePreference,
    requiredReferenceCount
  ]);

  useEffect(() => {
    if (!actor || !catalog.data || enginePreferenceActorId !== actor.userId || !engine.provider) return;
    const provider = catalog.data.providers.find(item => item.id === engine.provider);
    const model = provider?.models.find(item => item.id === engine.model);
    if (model && !imageModelUnavailableReason(
      model,
      requiredReferenceCount,
      fixedAspectRatio || engine.aspectRatio
    )) return;
    const resolved = resolveAvailableImageEngine(
      catalog.data,
      { provider: engine.provider, model: engine.model },
      requiredReferenceCount,
      fixedAspectRatio || (lookSheetDefinition ? null : engine.aspectRatio)
    );
    const nextModel = resolved?.model;
    setEngine(current => ({
      ...current,
      provider: resolved?.provider.id || '',
      model: nextModel?.id || '',
      resolution: nextModel?.capabilities.resolutions?.[0]
        || nextModel?.defaults?.resolution
        || null,
      aspectRatio: fixedAspectRatio
        || (lookSheetDefinition ? supportedImageRatio(nextModel?.capabilities.aspectRatios || [], current.aspectRatio)
          : nextModel?.capabilities.aspectRatios.includes(current.aspectRatio) ? current.aspectRatio : nextModel?.capabilities.aspectRatios[0] || '1:1')
    }));
  }, [
    actor,
    catalog.data,
    engine.aspectRatio,
    engine.model,
    engine.provider,
    enginePreferenceActorId,
    fixedAspectRatio,
    lookSheetDefinition,
    requiredReferenceCount
  ]);

  useEffect(() => {
    if (!fixedAspectRatio || engine.aspectRatio === fixedAspectRatio) return;
    setEngine(current => ({ ...current, aspectRatio: fixedAspectRatio }));
  }, [engine.aspectRatio, fixedAspectRatio]);

  useEffect(() => {
    if (!actor || !catalog.data || comparisonPreferencesActorId === actor.userId) return;
    const fallbackSlots = createDefaultComparisonSlots(catalog.data);
    const preference = readComparisonGenerationPreferences(
      actor.userId,
      catalog.data,
      fallbackSlots
    );
    setComparison(
      allowComparison && (initialComparisonActive || preference.active)
    );
    setComparisonSlots(preference.slots);
    setComparisonPreferencesActorId(actor.userId);
  }, [
    actor,
    allowComparison,
    catalog.data,
    comparisonPreferencesActorId,
    initialComparisonActive
  ]);

  useEffect(() => {
    if (!actor || comparisonPreferencesActorId !== actor.userId || comparisonSlots.length < 2) {
      return;
    }
    writeComparisonGenerationPreferences(actor.userId, {
      active: allowComparison && comparison,
      slots: comparisonSlots
    });
  }, [
    actor,
    allowComparison,
    comparison,
    comparisonPreferencesActorId,
    comparisonSlots
  ]);

  const resolvedSceneTemplateSnapshot = useMemo(() => sceneTemplateSnapshot
    ? {
      ...sceneTemplateSnapshot,
      providerModelSnapshot: {
        ...asRecord(sceneTemplateSnapshot.providerModelSnapshot),
        providerId: engine.provider,
        modelId: engine.model
      },
      generationSettingsSnapshot: {
        ...asRecord(sceneTemplateSnapshot.generationSettingsSnapshot),
        aspectRatio: engine.aspectRatio,
        resolution: engine.resolution,
        outputCount: engine.outputCount
      }
    }
    : null, [engine, sceneTemplateSnapshot]);

  const promptRefinementAvailable = allowPromptRefinement
    && isEnabled('generation.promptRefinementEnabled');
  const draft = useMemo<GenerationRequestDraft>(() => ({
    provider: engine.provider,
    submodel: engine.model,
    prompt,
    negativePrompt,
    additionalDirection,
    aspectRatio: engine.aspectRatio,
    imageResolution: engine.resolution,
    outputCount: comparison ? 1 : engine.outputCount,
    generationMode,
    generationSurface: surface,
    cinematicCaptureProfileId,
    references,
    referenceScopes,
    selections,
    customColors,
    sceneTemplateSnapshot: resolvedSceneTemplateSnapshot,
    templateUseSessionId: templateUseContext?.templateUseSessionId || null,
    templateReplacements: templateUseContext?.replacements || {},
    characterProfileContext,
    cinematicCastReferences,
    cinematicContainsPeople,
    characterReferenceOutfitBehavior,
    faceReferenceContext,
    authoringMode,
    characterType,
    lookSheetDefinition,
    lookSheetEnhancementId,
    promptRefinementEnabled: promptRefinementAvailable && promptRefinementEnabled
  }), [additionalDirection, authoringMode, characterProfileContext, cinematicCastReferences, cinematicContainsPeople, characterReferenceOutfitBehavior, characterType, cinematicCaptureProfileId, comparison, customColors, engine, faceReferenceContext, generationMode, lookSheetDefinition, lookSheetEnhancementId, negativePrompt, prompt, promptRefinementAvailable, promptRefinementEnabled, referenceScopes, references, resolvedSceneTemplateSnapshot, selections, surface, templateUseContext]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedDraft(draft), 320);
    return () => window.clearTimeout(timer);
  }, [draft]);

  const selectedCatalogModel = catalog.data?.providers
    .find(item => item.id === engine.provider)?.models
    .find(item => item.id === engine.model);
  const modelAvailabilityReason = imageModelUnavailableReason(
    selectedCatalogModel,
    requiredReferenceCount,
    fixedAspectRatio || engine.aspectRatio
  );
  const canEstimate = Boolean(
    debouncedDraft?.provider
    && debouncedDraft.submodel
    && !modelAvailabilityReason
    && !(lookSheetDefinition && blockedReason)
  );
  const enhancement = useLookSheetRender({ draft, pricedDraft: debouncedDraft, valid: canEstimate && !blockedReason, control: lookSheetEnhancement });
  const pricedDraft = debouncedDraft ? { ...debouncedDraft,
    lookSheetEnhancementId: enhancement.enabled ? enhancement.readyId : debouncedDraft.lookSheetEnhancementId } : null;
  const estimateKey = pricedDraft ? createEstimateKey(pricedDraft) : null;
  const singleEstimate = useQuery({
    queryKey: ['generation-estimate', actor?.userId || 'loading', estimateKey],
    queryFn: () => estimateGeneration(pricedDraft as GenerationRequestDraft),
    enabled: canEstimate && !comparison,
    staleTime: 20_000,
    retry: false
  });
  const referencePreview = useQuery({
    queryKey: [
      'reference-processing-preview',
      actor?.userId || 'loading',
      estimateKey
    ],
    queryFn: () => previewReferenceProcessing(debouncedDraft as GenerationRequestDraft),
    enabled: canEstimate && Object.values(debouncedDraft?.references || {}).some(Boolean),
    staleTime: 20_000,
    retry: false
  });
  useEffect(() => {
    if (enhancement.readyId && singleEstimate.error && 'code' in singleEstimate.error
      && singleEstimate.error.code === 'enhancement_stale') enhancement.invalidate();
  }, [singleEstimate.error, enhancement.readyId]);
  const debugPromptEnabled = surface === 'studio'
    && (actor?.role === 'admin'
      || isEnabled('development.debugPromptOverrideEnabled'));
  const compiledPromptPreview = useQuery({
    queryKey: [
      'compiled-prompt-preview',
      actor?.userId || 'loading',
      estimateKey
    ],
    queryFn: () => previewCompiledPrompt(pricedDraft as GenerationRequestDraft),
    enabled: Boolean(canEstimate && (debugPromptEnabled || lookSheetDefinition) && debouncedDraft),
    staleTime: 20_000,
    retry: false
  });
  useEffect(() => {
    onReferenceAuthorityChange?.(
      referencePreview.data?.publicAuthorityProjection || null
    );
  }, [onReferenceAuthorityChange, referencePreview.data]);
  const comparisonEstimate = useQuery({
    queryKey: ['comparison-estimate', actor?.userId || 'loading', estimateKey, comparisonSlots],
    queryFn: () => estimateComparison(debouncedDraft as GenerationRequestDraft, comparisonSlots),
    enabled: canEstimate && comparison && comparisonSlots.length >= 2,
    staleTime: 20_000,
    retry: false
  });

  const submitSingle = useMutation({
    // Lock pricing from the exact draft being submitted. The displayed query
    // may still represent the previous debounced selection for a few frames.
    mutationFn: () => enhancement.enabled
      ? enhancement.submit(draft, singleEstimate.data?.estimate.estimatedCredits)
      : submitSingleDraft
      ? submitSingleDraft(draft)
      : estimateAndSubmitGeneration(draft),
    onMutate: () => {
      setJobId(null);
      setGenerationGroupId(null);
      setComparisonSetId(null);
      setComparisonJobBindings([]);
    },
    onSuccess: response => {
      setComparisonSetId(null);
      setJobId(response.groupId ? null : response.jobId);
      setGenerationGroupId(response.groupId || null);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.generationJobCenter(actorId)
      });
      emitTelemetry('generation_transition', {
        actorId: actor?.userId,
        jobId: response.jobId,
        mode: generationMode,
        surface,
        status: response.status
      });
    },
    onError: error => {
      emitTelemetry('generation_transition', {
        actorId: actor?.userId,
        mode: generationMode,
        surface,
        status: 'enqueue_failed',
        errorCode: 'code' in error ? String(error.code) : null
      });
      if (isInsufficientCreditError(error)) setCreditDialogOpen(true);
    }
  });
  const submitCompare = useMutation({
    mutationFn: async () => {
      const estimate = comparisonEstimate.data || await estimateComparison(draft, comparisonSlots);
      return submitComparison(draft, comparisonSlots, estimate);
    },
    onMutate: () => {
      setJobId(null);
      setGenerationGroupId(null);
      setComparisonSetId(null);
      setComparisonJobBindings([]);
    },
    onSuccess: response => {
      setJobId(null);
      setComparisonSetId(response.setId);
      setComparisonJobBindings(response.jobs);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.generationJobCenter(actorId)
      });
      emitTelemetry('generation_transition', {
        actorId: actor?.userId,
        comparisonSetId: response.setId,
        mode: generationMode,
        surface,
        status: response.status
      });
    },
    onError: error => {
      emitTelemetry('generation_transition', {
        actorId: actor?.userId,
        mode: generationMode,
        surface,
        status: 'comparison_enqueue_failed',
        errorCode: 'code' in error ? String(error.code) : null
      });
      if (isInsufficientCreditError(error)) setCreditDialogOpen(true);
    }
  });
  const job = useGenerationJob(jobId);
  const generationGroup = useGenerationGroup(generationGroupId);
  const comparisonResult = useQuery({
    queryKey: queryKeys.comparison(actor?.userId || 'loading', comparisonSetId),
    queryFn: ({ signal }) => {
      if (!comparisonSetId) throw new Error('A comparison set ID is required.');
      return getComparison(comparisonSetId, signal);
    },
    enabled: Boolean(comparisonSetId && actor),
    refetchInterval: query => {
      return pollingPolicy.comparison(
        comparisonNeedsPolling(comparisonSetId, query.state.data)
      );
    }
  });
  const comparisonRun = newestComparisonRun(comparisonResult.data);
  const derivedComparisonStatus = comparisonRunStatus(comparisonRun);
  const renameComparison = useMutation({
    mutationFn: (name: string) => {
      if (!comparisonSetId) throw new Error('A comparison set ID is required.');
      return updateComparison(comparisonSetId, { name });
    },
    onSuccess: updatedComparison => {
      queryClient.setQueryData(
        queryKeys.comparison(actor?.userId || 'loading', comparisonSetId),
        updatedComparison
      );
      void queryClient.invalidateQueries({
        queryKey: queryKeys.comparisons(actor?.userId || 'loading')
      });
    }
  });
  const grantCredits = useMutation({
    mutationFn: () => grantMockCredits(100),
    onSuccess: response => {
      queryClient.setQueryData(queryKeys.credits(actorId), response);
      void queryClient.invalidateQueries({ queryKey: queryKeys.creditLedger(actorId) });
      void queryClient.invalidateQueries({ queryKey: ['generation-estimate', actorId] });
      void queryClient.invalidateQueries({ queryKey: ['comparison-estimate', actorId] });
      setCreditDialogOpen(false);
    }
  });
  useEffect(() => {
    const status = job.data?.status;
    const completedJobId = job.data?.jobId || job.data?.id || jobId;
    if (
      status
      && ['completed', 'succeeded'].includes(status)
      && completedJobId
      && completedJobRef.current !== completedJobId
    ) {
      completedJobRef.current = completedJobId;
      onCompleted?.(completedJobId);
      void queryClient.invalidateQueries({ queryKey: ['history'] });
      void queryClient.invalidateQueries({ queryKey: ['credits'] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.generationJobCenter(actorId) });
    }
  }, [actorId, job.data?.id, job.data?.jobId, job.data?.status, jobId, onCompleted, queryClient]);
  useEffect(() => {
    if (!generationGroupId || !generationGroup.data) return;
    const terminal = ['completed', 'partially_completed', 'failed']
      .includes(generationGroup.data.status);
    for (const child of generationGroup.data.children) {
      if (child.status !== 'completed' || completedGroupJobsRef.current.has(child.jobId)) continue;
      completedGroupJobsRef.current.add(child.jobId);
      onCompleted?.(child.jobId);
    }
    if (terminal) {
      void queryClient.invalidateQueries({ queryKey: ['history'] });
      void queryClient.invalidateQueries({ queryKey: ['credits'] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.generationJobCenter(actorId) });
    }
  }, [actorId, generationGroup.data, generationGroupId, onCompleted, queryClient]);
  useEffect(() => {
    if (!jobId || !job.data?.status) return;
    emitTelemetry('generation_transition', {
      actorId: actor?.userId,
      jobId,
      mode: generationMode,
      surface,
      status: job.data.status
    });
  }, [actor?.userId, generationMode, job.data?.status, jobId, surface]);
  useEffect(() => {
    if (
      !comparisonSetId
      || !derivedComparisonStatus
      || !['completed', 'partially_completed', 'failed', 'cancelled']
        .includes(derivedComparisonStatus)
    ) {
      return;
    }
    void queryClient.invalidateQueries({ queryKey: ['history'] });
    void queryClient.invalidateQueries({ queryKey: ['credits'] });
    void queryClient.invalidateQueries({ queryKey: queryKeys.generationJobCenter(actorId) });
  }, [actorId, comparisonSetId, derivedComparisonStatus, queryClient]);

  if (catalog.isLoading) return <LoadingState label={t('playground.engine.loading')} />;
  if (catalog.isError || !catalog.data) return <ErrorState title={t('playground.engine.unavailable')} description={catalog.error?.message} onRetry={() => void catalog.refetch()} />;
  const model = selectedCatalogModel;
  const effectiveBlockedReason = blockedReason || (enhancement.enabled && (enhancement.blocked || !singleEstimate.data || singleEstimate.isFetching)
    ? t('lookSheet.auto.priceRequired') : null) || (modelAvailabilityReason
    ? t(`playground.engine.unavailable.${modelAvailabilityReason}`)
    : null);
  const imageEstimate = singleEstimate.data?.estimate.estimatedCredits;
  const estimate = comparison ? comparisonEstimate.data?.estimatedTotalCredit
    : imageEstimate === undefined || enhancement.fee === undefined ? undefined : imageEstimate + enhancement.fee;
  const availableCredits = comparison
    ? creditAccount.data?.account.availableCredits
    : singleEstimate.data?.account.availableCredits
      ?? creditAccount.data?.account.availableCredits;
  const canAfford = estimate === undefined
    || availableCredits === undefined
    || availableCredits >= estimate;
  const pending = submitSingle.isPending
    || submitCompare.isPending
    || Boolean(jobId && !job.isError && !isTerminalJobStatus(job.data?.status))
    || Boolean(generationGroupId && !generationGroup.isError && !['completed', 'partially_completed', 'failed']
      .includes(generationGroup.data?.status || 'queued'))
    || (!comparisonResult.isError && comparisonNeedsPolling(comparisonSetId, comparisonResult.data));
  const submitError = submitSingle.error || submitCompare.error;
  const comparisonQueueItems: GenerationProcessQueueItem[] = comparison
    && (
      Boolean(comparisonSetId)
      || Boolean(comparisonRun)
    )
    ? comparisonSlots.map(slot => {
        const persistedSlot = comparisonRun?.slots.find(item => item.id === slot.id);
        const binding = comparisonJobBindings.find(item => item.slotId === slot.id);
        const provider = catalog.data.providers.find(item => item.id === slot.provider);
        const providerModel = provider?.models.find(item => item.id === slot.model);
        return {
          slotId: slot.id,
          providerLabel: localizedLabel(provider?.displayName, i18n.resolvedLanguage)
            || slot.provider,
          modelLabel: localizedLabel(providerModel?.displayName, i18n.resolvedLanguage)
            || slot.model,
          jobId: persistedSlot?.jobId || binding?.jobId || null,
          status: persistedSlot?.status
            || 'queued'
        };
      })
    : [];
  const effectiveResultActions = (
    completedJob: JobStatus,
    context: { closeViewer: () => void }
  ) => (
    <>
      {model?.capabilities.imageReferences && completedJob.result?.imageUrl ? (
        <GenerationReferenceActions
          imageUrl={completedJob.result.imageUrl}
          roles={referenceRoles}
          value={references}
          maxReferences={model.capabilities.maxReferenceImages}
          onChange={setReferences}
        />
      ) : null}
      {renderResultActions?.(completedJob, context)}
    </>
  );

  const resultRegion = (
    <div ref={node => { resultRef.current = node; }}>
      {enhancement.stage !== 'idle' ? <p role="status">{t(`lookSheet.auto.${enhancement.stage}`)}</p> : null}
      <GenerationResultSurface
        job={job.data}
        group={generationGroup.data}
        comparison={comparisonResult.data}
        pending={pending}
        onGoToPrompt={() => promptRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        renderActions={effectiveResultActions}
        showEmpty={showEmptyResult || layoutVariant === 'studio' || layoutVariant === 'playground'}
        showGoToPrompt={layoutVariant !== 'studio'}
        comparisonActive={comparison}
        canRevealPrompt={actor?.role === 'admin'
          || (surface === 'studio'
            && isEnabled('development.debugPromptOverrideEnabled'))}
        onRenameComparison={comparisonSetId
          && ['completed', 'partially_completed'].includes(derivedComparisonStatus || '')
          ? name => renameComparison.mutateAsync(name)
          : undefined}
        comparisonRenamePending={renameComparison.isPending}
        comparisonRenameError={renameComparison.error?.message || null}
        viewerContext={{
          prompt,
          provider: engine.provider,
          model: engine.model,
          estimatedCredit: estimate,
          parentImages: Object.entries(references)
            .filter((entry): entry is [string, string] => Boolean(entry[1]))
            .map(([role, imageUrl]) => {
              const jobId = referenceJobId(imageUrl);
              return {
                id: jobId || role,
                imageUrl,
                role: lineageRole(role),
                href: jobId ? `/history/${encodeURIComponent(jobId)}` : null
              };
            })
        }}
      />
    </div>
  );
  const canRevealStudioPrompt = layoutVariant === 'studio'
    && !lookSheetDefinition
    && (actor?.role === 'admin'
      || isEnabled('development.debugPromptOverrideEnabled'));
  const hasVisiblePromptRegion = showPromptEditor
    || Boolean(readOnlyPrompt)
    || Boolean(readOnlyPromptSupplement)
    || canRevealStudioPrompt;
  const debugPromptText = compiledPromptPreview.data?.compiledPrompt || prompt;
  const readOnlyPromptText = lookSheetDefinition
    ? compiledPromptPreview.data?.compiledPrompt || t(compiledPromptPreview.isError ? 'lookSheet.loadError' : 'lookSheet.loading')
    : prompt;
  const promptRegion = hasVisiblePromptRegion ? (
    <div ref={node => { promptRef.current = node; }}>
      {showPromptEditor ? (
        <PromptEditor
          value={prompt}
          negativeValue={negativePrompt}
          onChange={setPrompt}
          onNegativeChange={setNegativePrompt}
          variant={layoutVariant === 'playground' ? 'playground' : 'default'}
        />
      ) : readOnlyPrompt ? (
        <Surface className="studio-prompt-preview">
          <div className="studio-prompt-preview__heading">
            <span>
              <strong className="block text-[var(--mpf-text)]">{readOnlyPrompt.label}</strong>
              {readOnlyPrompt.description ? <small>{readOnlyPrompt.description}</small> : null}
            </span>
            <Button
              variant="ghost"
              size="icon"
              title={t('playground.prompt.copy')}
              aria-label={t('playground.prompt.copy')}
              icon={<Copy className="size-4" aria-hidden="true" />}
              onClick={() => void navigator.clipboard.writeText(readOnlyPromptText)}
            />
          </div>
          <textarea aria-label={readOnlyPrompt.label} readOnly value={readOnlyPromptText} />
          {readOnlyPromptSupplement ? (
            <div className="studio-prompt-preview__supplement">
              {readOnlyPromptSupplement}
            </div>
          ) : null}
        </Surface>
      ) : canRevealStudioPrompt ? (
        <Surface className="studio-prompt-preview">
          <div className="studio-prompt-preview__heading">
            <label htmlFor="studio-debug-compiled-prompt">
              {t('playground.prompt.label')}
            </label>
            <Button
              variant="ghost"
              size="icon"
              title={t('playground.prompt.copy')}
              aria-label={t('playground.prompt.copy')}
              icon={<Copy className="size-4" aria-hidden="true" />}
              onClick={() => void navigator.clipboard.writeText(debugPromptText)}
            />
          </div>
          <textarea
            id="studio-debug-compiled-prompt"
            readOnly
            value={debugPromptText}
          />
          <details>
            <summary>{t('playground.negative.label')}</summary>
            <textarea
              value={negativePrompt}
              onChange={event => setNegativePrompt(event.target.value)}
              placeholder={t('playground.negative.placeholder')}
            />
          </details>
        </Surface>
      ) : readOnlyPromptSupplement ? (
        <Surface className="studio-prompt-preview studio-prompt-preview--supplement-only">
          <div className="studio-prompt-preview__supplement">
            {readOnlyPromptSupplement}
          </div>
        </Surface>
      ) : null}
    </div>
  ) : null;
  const referencesRegion = (
    <ReferenceSlotGrid
      value={references}
      displayPreviews={referenceDisplayPreviews}
      leadingContent={referenceLead}
      lookSheetSelection={surface === 'playground' && generationMode === 'playground'}
      roles={referenceRoles}
      supported={model?.capabilities.imageReferences === true}
      maxReferences={model?.capabilities.maxReferenceImages || 0}
      compact={layoutVariant === 'studio' || layoutVariant === 'playground'}
      authorityProjection={referencePreview.data?.publicAuthorityProjection}
      processing={referencePreview.isFetching}
      processingError={referencePreview.error?.message || null}
      characterIdentityPackActive={characterProfileContext?.purpose === 'character_usage'}
      scopes={referenceScopes}
      onScopeChange={(role, scope) => {
        setReferenceScopes(current => ({ ...current, [role]: scope }));
      }}
      onChange={setReferences}
      readOnly={referencesReadOnly}
    />
  );
  const engineRegion = showEngine ? (<>
    <EngineTargetPanel
      catalog={catalog.data}
      value={engine}
      comparison={comparison}
      comparisonSlots={comparisonSlots}
      comparisonEstimates={comparisonEstimate.data?.slots}
      comparisonEstimating={comparisonEstimate.isFetching}
      comparisonEstimateError={comparisonEstimate.error?.message || null}
      studioLayout={layoutVariant === 'studio' || layoutVariant === 'playground'}
      allowComparison={allowComparison}
      allowMultiOutput={fixedOutputCount === null}
      promptRefinementAvailable={promptRefinementAvailable}
      promptRefinementEnabled={promptRefinementEnabled}
      presentation={enginePresentation}
      fixedAspectRatio={fixedAspectRatio}
      adaptAspectRatio={Boolean(lookSheetDefinition)}
      requiredReferenceCount={requiredReferenceCount}
      extraControls={engineOptions}
      onChange={next => {
        const normalized = fixedOutputCount === null
          ? next
          : { ...next, outputCount: fixedOutputCount };
        const engineChanged = normalized.provider !== engine.provider
          || normalized.model !== engine.model;
        setEngine(normalized);
        if (
          engineChanged
          && actor
          && enginePreferenceActorId === actor.userId
          && !initialEnginePreference
        ) {
          writeImageEnginePreference(actor.userId, normalized);
        }
      }}
      onComparisonChange={setComparison}
      onSlotsChange={setComparisonSlots}
      onPromptRefinementChange={setPromptRefinementEnabled}
    />
    {renderEngineSelectionNotice?.({
      providerId: engine.provider,
      modelId: engine.model,
      model: selectedCatalogModel || null
    })}
  </>) : null;
  const submitGenerationRequest = () => {
    if (pending || effectiveBlockedReason) return;
    if (estimate !== undefined && !canAfford) {
      setCreditDialogOpen(true);
      return;
    }
    if (layoutVariant === 'studio') {
      setResultFocusSequence(current => current + 1);
    } else {
      window.requestAnimationFrame(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
    if (comparison) {
      submitCompare.mutate();
      return;
    }
    submitSingle.mutate();
  };
  const usesStudioCommandPresentation = layoutVariant === 'studio'
    || layoutVariant === 'playground';
  const actionRegion = usesStudioCommandPresentation ? (
    <Surface className="studio-generation-action">
      {enhancement.enabled && imageEstimate !== undefined && enhancement.fee !== undefined
        ? <p className="mb-3 text-sm" role="status">{t('lookSheet.auto.breakdown', { image: imageEstimate, enhancement: enhancement.fee, total: estimate })}</p> : null}
      <Button
        className="studio-generate-button btn-neon-yellow-glow"
        size="lg"
        icon={<Sparkles className="size-5" />}
        disabled={!prompt.trim() || pending || Boolean(effectiveBlockedReason)}
        onClick={submitGenerationRequest}
      >
        <span>{pending
          ? t('playground.result.generating')
          : comparison
            ? t('playground.action.generateComparison')
            : engine.outputCount > 1
              ? t('playground.action.generateImages', { count: engine.outputCount })
              : t('playground.action.generate')}</span>
        <small>
          {comparison
            ? t('playground.estimate.comparisonDetail')
            : estimate !== undefined
              ? `${estimate} ${t('playground.comparison.credits')}`
              : singleEstimate.isError || comparisonEstimate.isError
                ? t('playground.estimate.unavailable')
                : t('playground.estimate.pending')}
        </small>
      </Button>
    </Surface>
  ) : (
    <Surface className="generation-command-bar sticky bottom-3 z-30 flex flex-wrap items-center justify-between gap-4 border-cyan-400/35 bg-[#0e1320f2] p-4 shadow-[var(--mpf-shadow-raised)] backdrop-blur">
        <div className="flex items-center gap-3">
          <Coins className="size-6 text-amber-300" />
          <span><strong className="block">{singleEstimate.isFetching || comparisonEstimate.isFetching ? t('playground.estimate.loading') : estimate !== undefined ? `${estimate} ${t('playground.comparison.credits')}` : t('playground.estimate.pending')}</strong><small className="text-[var(--mpf-text-muted)]">{canAfford ? t('playground.estimate.locked') : t('playground.estimate.insufficient')}</small></span>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" icon={<ArrowUp className="size-4" />} onClick={() => promptRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>{t('playground.action.goToPrompt')}</Button>
          <Button
            variant="primary"
            size="lg"
            icon={<Sparkles className="size-5" />}
            disabled={!prompt.trim() || pending || Boolean(effectiveBlockedReason)}
            onClick={submitGenerationRequest}
          >
            {pending
              ? t('playground.result.generating')
              : comparison
                ? t('playground.action.generateComparison')
                : engine.outputCount > 1
                  ? t('playground.action.generateImages', { count: engine.outputCount })
                  : t('playground.action.generate')}
          </Button>
        </div>
    </Surface>
  );
  const messages = (
    <>
      <CreditExhaustedDialog
        open={creditDialogOpen}
        requiredCredits={estimate}
        availableCredits={availableCredits}
        canGrantMockCredits={Boolean(actor?.isMockActor || mockSwitcherEnabled)}
        grantPending={grantCredits.isPending}
        grantError={grantCredits.error?.message || null}
        onOpenChange={setCreditDialogOpen}
        onGrantMockCredits={() => grantCredits.mutate()}
      />
      {submitError && !isInsufficientCreditError(submitError)
        ? (
          <StatusNotice tone="error" title={tUi('ui.status.error')}>
            {submitError.message}
          </StatusNotice>
        )
        : null}
      {effectiveBlockedReason
        ? blockedNotice || (
          <StatusNotice tone="warning" title={tUi('ui.status.warning')}>
            {effectiveBlockedReason}
          </StatusNotice>
        )
        : null}
      {job.isError ? (
        <StatusNotice tone="error" title={tUi('ui.status.error')}>
          {job.error.message}
        </StatusNotice>
      ) : null}
      {generationGroup.isError ? (
        <StatusNotice tone="error" title={tUi('ui.status.error')}>
          {generationGroup.error.message}
        </StatusNotice>
      ) : null}
    </>
  );
  const queueStatusRegion = (
    <GenerationQueueStatus
      jobId={jobId}
      jobStatus={job.data?.status}
      comparisonSetId={comparisonSetId}
      comparisonStatus={derivedComparisonStatus
        || (comparisonSetId ? 'queued' : null)}
      comparisonItems={comparisonQueueItems}
      groupId={generationGroupId}
      groupStatus={generationGroup.data?.status || null}
      groupCompletedCount={generationGroup.data?.completedCount || 0}
      groupFailedCount={generationGroup.data?.failedCount || 0}
      groupTotalCount={generationGroup.data?.requestedOutputCount || engine.outputCount}
      submitting={Boolean(jobId || comparisonSetId)
        && (submitSingle.isPending || submitCompare.isPending)}
    />
  );

  if (layoutVariant === 'studio') {
    const queueRegion = comparison
      ? queueStatusRegion
      : (
        <>
          {queueStatusRegion}
          <StudioRecentGenerations limit={12} />
          {studioQueueExtra}
        </>
      );
    return (
      <StudioGenerationWorkspace
        modeSelector={studioModeSelector}
        builder={lookSheetDefinition ? <fieldset disabled={pending} className="m-0 min-w-0 border-0 p-0">
          {typeof studioBuilder === 'function' ? studioBuilder(draft, enhancement) : studioBuilder}
        </fieldset> : typeof studioBuilder === 'function' ? studioBuilder(draft, enhancement) : studioBuilder}
        builderTitle={studioBuilderTitle}
        singleBuilderHeading={Boolean(lookSheetDefinition)}
        configurationFirst={studioConfigurationFirst}
        result={resultRegion}
        queue={queueRegion}
        engine={lookSheetDefinition ? <fieldset disabled={pending} className="m-0 min-w-0 border-0 p-0">{engineRegion}</fieldset> : engineRegion}
        references={referencesRegion}
        prompt={promptRegion}
        configActions={studioConfigActions}
        actions={actionRegion}
        messages={messages}
        focusResultSignal={resultFocusSequence}
        showRenderPromptHeading={Boolean(promptRegion && prompt.trim())}
        comparisonActive={comparison}
      />
    );
  }

  if (layoutVariant === 'playground') {
    return (
      <PlaygroundGenerationWorkspace
        prompt={promptRegion}
        result={resultRegion}
        queue={queueStatusRegion}
        recent={showRecentGenerations ? <PlaygroundRecentGenerations /> : null}
        engine={engineRegion}
        references={referencesRegion}
        actions={actionRegion}
        messages={messages}
        showRenderPromptHeading={Boolean(promptRegion && prompt.trim())}
        recentExpanded={recentExpanded}
        onRecentExpandedChange={onRecentExpandedChange}
        comparisonActive={comparison}
      />
    );
  }

  return (
    <div className="space-y-5">
      {resultRegion}
      {promptRegion}
      {surface === 'playground' && showPromptEditor ? <PromptComposerAssist onAccept={setPrompt} /> : null}
      {referencesRegion}
      {engineRegion}
      {actionRegion}
      {messages}
    </div>
  );
}

function localizedLabel(
  value: string | Record<string, string> | undefined,
  language = 'en'
) {
  if (typeof value === 'string') return value;
  return value?.[language] || value?.en || Object.values(value || {})[0] || '';
}

function createEstimateKey(draft: GenerationRequestDraft) {
  return {
    provider: draft.provider,
    submodel: draft.submodel,
    prompt: draft.prompt,
    negativePrompt: draft.negativePrompt,
    additionalDirection: draft.additionalDirection,
    aspectRatio: draft.aspectRatio,
    imageResolution: draft.imageResolution,
    outputCount: draft.outputCount,
    generationMode: draft.generationMode,
    authoringMode: draft.authoringMode,
    characterType: draft.characterType,
    lookSheetDefinition: draft.lookSheetDefinition,
    lookSheetEnhancementId: draft.lookSheetEnhancementId,
    templateUseSessionId: draft.templateUseSessionId,
    templateReplacements: draft.templateReplacements,
    references: Object.entries(draft.references || {})
      .filter(([, value]) => Boolean(value))
      .map(([role, value]) => [role, value || ''] as const)
      .sort(([left], [right]) => left.localeCompare(right)),
    referenceScopes: draft.referenceScopes || {},
    cinematicCastReferences: draft.cinematicCastReferences,
    cinematicContainsPeople: draft.cinematicContainsPeople
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function referenceJobId(value: string) {
  return value.match(/\/outputs\/(job_[a-zA-Z0-9_-]+)\.[a-zA-Z0-9]+/)?.[1] || null;
}

function lineageRole(role: string): 'face' | 'character' | 'style' | 'outfit' | undefined {
  if (role === 'face_reference') return 'face';
  if (role === 'character_reference') return 'character';
  if (role === 'style_reference' || role === 'pose_reference') return 'style';
  if (role === 'outfit_front' || role === 'outfit_back') return 'outfit';
  return undefined;
}

function isInsufficientCreditError(error: unknown): error is ApiError {
  return error instanceof ApiError && error.code === 'credit_insufficient';
}

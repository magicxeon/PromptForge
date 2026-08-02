import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient
} from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleX,
  Coins,
  Download,
  LoaderCircle,
  PackagePlus,
  Search,
  Sparkles,
  X
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { CollectionPickerDialog } from '../../../components/collections/CollectionPickerDialog';
import momeloMark from '../../../assets/brand/momelo-mark.svg';
import { ShareGeneratedDialog } from '../../../components/community/ShareGeneratedDialog';
import {
  EngineTargetPanel,
  type EngineValue
} from '../../../components/generation/EngineTargetPanel';
import { ReferenceSlotGrid } from '../../../components/generation/ReferenceSlotGrid';
import { MediaCard } from '../../../components/media/MediaCard';
import { CharacterCard } from '../../../components/profiles/CharacterCard';
import {
  EmptyState,
  ErrorState,
  LoadingState
} from '../../../components/ui/AsyncState';
import { Button } from '../../../components/ui/Button';
import { StatusNotice } from '../../../components/ui/StatusNotice';
import { Surface } from '../../../components/ui/Surface';
import { apiMediaUrl } from '../../../lib/api/apiClient';
import { ApiError } from '../../../lib/api/apiError';
import { queryKeys } from '../../../lib/api/queryKeys';
import { useActor } from '../../../lib/auth/ActorProvider';
import {
  listCommunityPosts,
  requestCommunityTemplateHandoff
} from '../../community/api/communityApi';
import type { CommunityPost } from '../../community/schemas/communitySchemas';
import {
  getCreditAccount,
  grantMockCredits
} from '../../credits/api/creditApi';
import { CreditExhaustedDialog } from '../../credits/components/CreditExhaustedDialog';
import {
  getProviderCatalog,
  type GenerationReferenceRole
} from '../../generation/api/generationApi';
import {
  listCharacters,
  requestCharacterHandoff
} from '../../profiles/api/profileApi';
import type { CharacterSummary } from '../../profiles/schemas/profileSchemas';
import {
  approveFashionProof,
  createFashionQuote,
  createFashionRun,
  getFashionRun,
  listFashionReadyTemplateIds,
  uploadFashionReference,
  type FashionPlanInput,
  type FashionReferenceAsset
} from '../api/fashionBlueprintApi';
import type { FashionQuote, FashionRun } from '../schemas/fashionSchemas';
import {
  readFashionDraft,
  writeFashionDraft,
  type FashionDraft,
  type FashionProductDraft
} from '../state/fashionDraft';
import { filterFashionReadyCommunityTemplates } from '../state/fashionTemplateDiscovery';

type QualityTier = 'draft' | 'selling_quality' | 'premium_campaign';
type QuotePurpose = 'full' | 'proof' | 'continuation';
type ProductItem = FashionProductDraft & {
  references: Partial<Record<GenerationReferenceRole, FashionReferenceAsset>>;
};

export function FashionBlueprintRoute() {
  const { t } = useTranslation('fashion-blueprint');
  const { actor, mockSwitcherEnabled } = useActor();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const actorId = actor?.userId || 'loading';
  const firstProduct = useMemo(() => createProductItem(1), []);
  const [step, setStep] = useState(1);
  const [template, setTemplate] = useState<CommunityPost | null>(null);
  const [templateUseSessionId, setTemplateUseSessionId] = useState<string | null>(null);
  const [templateSelectionError, setTemplateSelectionError] = useState<string | null>(null);
  const [character, setCharacter] = useState<CharacterSummary | null>(null);
  const [characterContext, setCharacterContext] = useState<Record<string, unknown> | null>(null);
  const [products, setProducts] = useState<ProductItem[]>([firstProduct]);
  const [activeProductKey, setActiveProductKey] = useState(firstProduct.key);
  const [quality, setQuality] = useState<QualityTier>('selling_quality');
  const [poseDirection, setPoseDirection] = useState('template_pose');
  const [environmentDirection, setEnvironmentDirection] = useState('template_environment');
  const [advanced, setAdvanced] = useState(false);
  const [engine, setEngine] = useState<EngineValue>({
    provider: '',
    model: '',
    resolution: null,
    aspectRatio: '6:8'
  });
  const [quotePurpose, setQuotePurpose] = useState<QuotePurpose>('full');
  const [approvedProofRunId, setApprovedProofRunId] = useState<string | null>(null);
  const [quote, setQuote] = useState<FashionQuote | null>(null);
  const [run, setRun] = useState<FashionRun | null>(null);
  const [uploading, setUploading] = useState(false);
  const [creditDialogOpen, setCreditDialogOpen] = useState(false);
  const hydratedActor = useRef<string | null>(null);
  const restoredTemplateId = useRef<string | null>(null);
  const restoredCharacterId = useRef<string | null>(null);
  const uploadedAssetsByUrl = useRef(new Map<string, FashionReferenceAsset>());
  const appliedTemplateQuery = useRef<string | null>(null);

  const templates = useInfiniteQuery({
    queryKey: ['fashion-templates', actorId],
    queryFn: ({ pageParam }) => listCommunityPosts({
      sort: 'trending',
      period: 'month',
      postType: 'template',
      officialTag: '',
      search: ''
    }, pageParam),
    enabled: Boolean(actor),
    initialPageParam: null as string | null,
    getNextPageParam: page => page.nextCursor || undefined
  });
  const characters = useInfiniteQuery({
    queryKey: ['fashion-characters', actorId],
    queryFn: ({ pageParam }) => listCharacters({
      cursor: pageParam || '',
      destination: 'fashion_blueprint'
    }),
    enabled: Boolean(actor),
    initialPageParam: null as string | null,
    getNextPageParam: page => page.nextCursor || undefined
  });
  const fashionReadyTemplates = useQuery({
    queryKey: ['fashion-ready-template-index', actorId],
    queryFn: listFashionReadyTemplateIds,
    enabled: Boolean(actor),
    staleTime: 0,
    refetchOnMount: 'always'
  });
  const catalog = useQuery({
    queryKey: ['provider-catalog'],
    queryFn: getProviderCatalog,
    staleTime: 300_000
  });
  const creditAccount = useQuery({
    queryKey: queryKeys.credits(actorId),
    queryFn: getCreditAccount,
    enabled: Boolean(actor),
    staleTime: 15_000
  });

  const templateItems = useMemo(() => {
    return filterFashionReadyCommunityTemplates(
      templates.data?.pages.flatMap(page => page.items) || [],
      fashionReadyTemplates.data || []
    );
  }, [fashionReadyTemplates.data, templates.data]);
  const characterItems = useMemo(
    () => characters.data?.pages.flatMap(page => page.items) || [],
    [characters.data]
  );

  useEffect(() => {
    if (!catalog.data || engine.provider) return;
    const provider = catalog.data.providers.find(
      item => item.id === catalog.data.defaultProvider
    ) || catalog.data.providers[0];
    const model = provider?.models.find(
      item => item.id === provider.defaultModel
    ) || provider?.models[0];
    setEngine({
      provider: provider?.id || '',
      model: model?.id || '',
      resolution:
        model?.capabilities.resolutions?.[0]
        || model?.defaults?.resolution
        || model?.defaults?.imageSize
        || null,
      aspectRatio: model?.capabilities.aspectRatios.includes('6:8')
        ? '6:8'
        : model?.capabilities.aspectRatios[0] || '1:1'
    });
  }, [catalog.data, engine.provider]);

  useEffect(() => {
    if (!actor?.userId || hydratedActor.current === actor.userId) return;
    hydratedActor.current = actor.userId;
    const fallback = createDraftFallback(createProductItem(1));
    const saved = readFashionDraft(actor.userId, fallback);
    restoredTemplateId.current = saved.templatePostId;
    restoredCharacterId.current = saved.characterProfileId;
    setStep(clampStep(saved.step));
    setTemplate(null);
    setTemplateUseSessionId(saved.templateUseSessionId);
    setCharacter(null);
    setCharacterContext(saved.characterProfileContext);
    setProducts(saved.products.length
      ? saved.products as ProductItem[]
      : fallback.products as ProductItem[]);
    setActiveProductKey(
      saved.activeProductKey || saved.products[0]?.key || fallback.activeProductKey
    );
    setQuality(saved.qualityTier);
    setPoseDirection(saved.poseDirection);
    setEnvironmentDirection(saved.environmentDirection);
    setAdvanced(saved.routingMode === 'advanced');
    setRun(saved.runId
      ? { id: saved.runId, status: 'processing', operations: [] } as FashionRun
      : null);
    setQuote(null);
    setApprovedProofRunId(null);
    setQuotePurpose('full');
    setCreditDialogOpen(false);
  }, [actor?.userId]);

  useEffect(() => {
    if (!template && restoredTemplateId.current && templateItems.length) {
      setTemplate(templateItems.find(item =>
        item.id === restoredTemplateId.current
      ) || null);
    }
  }, [template, templateItems]);
  useEffect(() => {
    if (
      !template
      || fashionReadyTemplates.isLoading
      || fashionReadyTemplates.isError
      || Boolean(
        template.templateId
        && fashionReadyTemplates.data?.includes(template.templateId)
      )
    ) {
      return;
    }
    restoredTemplateId.current = null;
    setTemplate(null);
    setTemplateUseSessionId(null);
    setQuote(null);
    setRun(null);
    setStep(1);
    setTemplateSelectionError(t('fashion.error.templatePoseNotReady'));
  }, [fashionReadyTemplates.data, fashionReadyTemplates.isError, fashionReadyTemplates.isLoading, template, t]);
  useEffect(() => {
    const requestedTemplateId = searchParams.get('templateId');
    if (
      !requestedTemplateId
      || appliedTemplateQuery.current === requestedTemplateId
      || !templateItems.length
    ) {
      return;
    }
    const requested = templateItems.find(item =>
      item.id === requestedTemplateId || item.templateId === requestedTemplateId
    );
    if (!requested) return;
    appliedTemplateQuery.current = requestedTemplateId;
    void chooseTemplate(requested);
  // chooseTemplate is deliberately invoked once per deep-link id.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, templateItems]);
  useEffect(() => {
    if (!character && restoredCharacterId.current && characterItems.length) {
      setCharacter(characterItems.find(item =>
        item.id === restoredCharacterId.current
      ) || null);
    }
  }, [character, characterItems]);

  const activeProduct = products.find(
    item => item.key === activeProductKey
  ) || products[0]!;
  const plan = useMemo<FashionPlanInput | null>(() => {
    if (
      !template
      || !templateUseSessionId
      || !characterContext
      || !products.every(item => item.references.outfit_front?.assetId)
    ) {
      return null;
    }
    return {
      templateId: template.id,
      templateUseSessionId,
      characterProfileContext: characterContext,
      productItems: products.map(item => ({
        key: item.key,
        clientKey: item.clientKey,
        name: item.name,
        sku: item.sku,
        productType: item.productType,
        outfitScope: item.outfitScope,
        colorNotes: item.colorNotes,
        integrityLevel: item.integrityLevel,
        references: item.references
      })),
      qualityTier: quality,
      routingMode: advanced ? 'advanced' : 'simple',
      requestedProviderId: advanced ? engine.provider : undefined,
      requestedModelId: advanced ? engine.model : undefined,
      resolution: advanced ? engine.resolution : undefined,
      aspectRatio: engine.aspectRatio,
      poseDirection,
      environmentDirection
    };
  }, [
    advanced,
    characterContext,
    engine,
    environmentDirection,
    poseDirection,
    products,
    quality,
    template,
    templateUseSessionId
  ]);
  const planFingerprint = useMemo(
    () => plan ? JSON.stringify(plan) : '',
    [plan]
  );

  useEffect(() => {
    setQuote(null);
  }, [planFingerprint, quotePurpose, approvedProofRunId]);
  useEffect(() => {
    if (products.length === 1 && quotePurpose !== 'full') {
      setQuotePurpose('full');
      setApprovedProofRunId(null);
    }
  }, [products.length, quotePurpose]);
  useEffect(() => {
    if (!actor?.userId || hydratedActor.current !== actor.userId) return;
    const timer = window.setTimeout(() => writeFashionDraft(actor.userId, {
      step,
      templatePostId: template?.id || restoredTemplateId.current,
      templateUseSessionId,
      characterProfileId: character?.id || restoredCharacterId.current,
      characterProfileContext: characterContext,
      products,
      activeProductKey,
      qualityTier: quality,
      routingMode: advanced ? 'advanced' : 'simple',
      poseDirection,
      environmentDirection,
      runId: run?.id || null
    }), 250);
    return () => window.clearTimeout(timer);
  }, [
    actor?.userId,
    activeProductKey,
    advanced,
    character?.id,
    characterContext,
    environmentDirection,
    poseDirection,
    products,
    quality,
    run?.id,
    step,
    template?.id,
    templateUseSessionId
  ]);

  const quoteMutation = useMutation({
    mutationFn: () => {
      if (!plan) throw new Error(t('fashion.error.incomplete'));
      return createFashionQuote(plan, quotePurpose, approvedProofRunId);
    },
    onSuccess: data => setQuote(data.quote)
  });
  const runMutation = useMutation({
    mutationFn: () => {
      if (!plan || !quote) {
        throw new Error(t('fashion.error.quoteRequired'));
      }
      return createFashionRun(
        quote.id,
        plan,
        `fashion:${quote.id}:${quote.quotePurpose}`
      );
    },
    onSuccess: nextRun => {
      setRun(nextRun);
      void queryClient.invalidateQueries({ queryKey: queryKeys.credits(actorId) });
      void queryClient.invalidateQueries({ queryKey: ['credit-ledger', actorId] });
    },
    onError: error => {
      if (isInsufficientCreditError(error)) {
        setCreditDialogOpen(true);
        void creditAccount.refetch();
      }
    }
  });
  const grantCreditsMutation = useMutation({
    mutationFn: () => grantMockCredits(100),
    onSuccess: response => {
      queryClient.setQueryData(queryKeys.credits(actorId), response);
      void queryClient.invalidateQueries({ queryKey: ['credit-ledger', actorId] });
      setCreditDialogOpen(false);
    }
  });
  const runQuery = useQuery({
    queryKey: ['fashion-run', actor?.userId, run?.id],
    queryFn: ({ signal }) => getFashionRun(run!.id, signal),
    enabled: Boolean(run?.id),
    refetchInterval: query => {
      const status = query.state.data?.status;
      return status && ['completed', 'partially_completed', 'failed'].includes(status)
        ? false
        : 1_500;
    }
  });
  const displayedRun = runQuery.data || run;
  const approveProofMutation = useMutation({
    mutationFn: () => approveFashionProof(displayedRun!.id),
    onSuccess: approved => {
      setRun(approved);
      setApprovedProofRunId(approved.id);
      setQuotePurpose('continuation');
    }
  });

  async function chooseTemplate(next: CommunityPost) {
    setTemplateSelectionError(null);
    try {
      const handoff = await requestCommunityTemplateHandoff(next.id);
      if (!handoff.useSession?.id) {
        throw new Error(t('fashion.error.templateSession'));
      }
      if (!handoff.poseProxyReadiness?.fashionCompatible) {
        throw new Error(t('fashion.error.templatePoseNotReady'));
      }
      restoredTemplateId.current = next.id;
      setTemplate(next);
      setTemplateUseSessionId(handoff.useSession.id);
      setStep(2);
    } catch (error) {
      setTemplateSelectionError(error instanceof Error ? error.message : t('fashion.error.templateSession'));
    }
  }

  async function chooseCharacter(next: CharacterSummary) {
    const handoff = await requestCharacterHandoff(next.id, 'fashion_blueprint');
    const characterReference: FashionReferenceAsset = {
      assetId: null,
      imageUrl: handoff.characterReferenceUrl
    };
    restoredCharacterId.current = next.id;
    setCharacter(next);
    setCharacterContext(handoff.characterProfileContext);
    setProducts(current => current.map(item => ({
      ...item,
      references: {
        ...item.references,
        character_reference: characterReference
      }
    })));
    setStep(3);
  }

  async function uploadOutfitReference(
    dataUrl: string,
    role: GenerationReferenceRole
  ) {
    setUploading(true);
    try {
      const asset = await uploadFashionReference(dataUrl, role);
      uploadedAssetsByUrl.current.set(asset.imageUrl, {
        assetId: asset.assetId,
        imageUrl: asset.imageUrl,
        thumbnailUrl: asset.thumbnailUrl
      });
      return asset.imageUrl;
    } finally {
      setUploading(false);
    }
  }

  function patchActiveReferences(
    next: Partial<Record<GenerationReferenceRole, string>>
  ) {
    const normalized = Object.fromEntries(
      Object.entries(next).flatMap(([role, imageUrl]) => {
        if (!imageUrl) return [];
        const existing =
          activeProduct.references[role as GenerationReferenceRole];
        return [[
          role,
          existing?.imageUrl === imageUrl
            ? existing
            : uploadedAssetsByUrl.current.get(imageUrl) || {
              assetId: null,
              imageUrl
            }
        ]];
      })
    ) as Partial<Record<GenerationReferenceRole, FashionReferenceAsset>>;
    setProducts(current => current.map(item =>
      item.key === activeProduct.key
        ? {
          ...item,
          references: {
            ...normalized,
            character_reference: item.references.character_reference
          }
        }
        : item
    ));
  }

  function patchProduct(patch: Partial<ProductItem>) {
    setProducts(current => current.map(item =>
      item.key === activeProduct.key ? { ...item, ...patch } : item
    ));
  }

  return (
    <main>
      <header className="mb-5 border-b border-[var(--mpf-border)] pb-5">
        <span className="text-xs font-bold uppercase text-[var(--theme-primary)]">
          {t('fashion.eyebrow')}
        </span>
        <h1 className="mb-1 mt-2 text-3xl">{t('fashion.title')}</h1>
        <p className="m-0 text-sm text-[var(--mpf-text-muted)]">
          {t('fashion.description')}
        </p>
      </header>
      <StepRail current={step} onSelect={setStep} />

      <div className="fashion-blueprint-layout mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0">
          {step === 1 ? (
            <FashionTemplateStep
              items={templateItems}
              selected={template}
              pending={templates.isLoading || fashionReadyTemplates.isLoading}
              error={templateSelectionError || (
                fashionReadyTemplates.isError
                  ? fashionReadyTemplates.error.message
                  : null
              )}
              onSelect={chooseTemplate}
            />
          ) : null}
          {step === 2 ? (
            <FashionCharacterStep
              items={characterItems}
              selected={character}
              onBack={() => setStep(1)}
              onSelect={chooseCharacter}
            />
          ) : null}
          {step === 3 ? (
            <FashionProductsStep
              products={products}
              activeProduct={activeProduct}
              uploading={uploading}
              onActivate={setActiveProductKey}
              onAdd={() => {
                const item = createProductItem(
                  products.length + 1,
                  products[0]?.references.character_reference
                );
                setProducts(current => [...current, item]);
                setActiveProductKey(item.key);
              }}
              onRemove={() => {
                const remaining = products.filter(
                  item => item.key !== activeProduct.key
                );
                setProducts(remaining);
                setActiveProductKey(remaining[0]!.key);
              }}
              onPatch={patchProduct}
              onReferencesChange={patchActiveReferences}
              uploadReference={uploadOutfitReference}
              onBack={() => setStep(2)}
              onContinue={() => setStep(4)}
            />
          ) : null}
          {step === 4 ? (
            <FashionReviewStep
              catalog={catalog.data}
              advanced={advanced}
              engine={engine}
              quality={quality}
              poseDirection={poseDirection}
              environmentDirection={environmentDirection}
              quotePurpose={quotePurpose}
              productCount={products.length}
              approvedProofRunId={approvedProofRunId}
              quote={quote}
              run={displayedRun}
              planReady={Boolean(plan)}
              quotePending={quoteMutation.isPending}
              runPending={runMutation.isPending}
              approvePending={approveProofMutation.isPending}
              quoteError={quoteMutation.error?.message || null}
              runError={runMutation.error
                && !isInsufficientCreditError(runMutation.error)
                ? runMutation.error.message
                : null}
              onAdvancedChange={setAdvanced}
              onEngineChange={setEngine}
              onQualityChange={setQuality}
              onPoseChange={setPoseDirection}
              onEnvironmentChange={setEnvironmentDirection}
              onPurposeChange={setQuotePurpose}
              onCalculate={() => quoteMutation.mutate()}
              onGenerate={() => runMutation.mutate()}
              onApproveProof={() => approveProofMutation.mutate()}
              onBack={() => setStep(3)}
            />
          ) : null}
        </div>
        <FashionSetupSummary
          step={step}
          template={template}
          character={character}
          products={products}
          quality={quality}
          quote={quote}
          onGoToStep={setStep}
        />
      </div>
      <CreditExhaustedDialog
        open={creditDialogOpen}
        requiredCredits={quote?.maximumCredits}
        availableCredits={creditAccount.data?.account.availableCredits}
        canGrantMockCredits={Boolean(
          actor?.isMockActor || mockSwitcherEnabled
        )}
        grantPending={grantCreditsMutation.isPending}
        grantError={grantCreditsMutation.error?.message || null}
        onOpenChange={setCreditDialogOpen}
        onGrantMockCredits={() => grantCreditsMutation.mutate()}
      />
    </main>
  );
}

function FashionTemplateStep({
  items,
  selected,
  pending,
  error,
  onSelect
}: {
  items: CommunityPost[];
  selected: CommunityPost | null;
  pending: boolean;
  error: string | null;
  onSelect: (item: CommunityPost) => Promise<void>;
}) {
  const { t } = useTranslation('fashion-blueprint');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const categories = useMemo(
    () => Array.from(new Set(
      items.flatMap(item => item.officialTags).filter(Boolean)
    )).sort((left, right) => left.localeCompare(right)),
    [items]
  );
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredItems = useMemo(
    () => items.filter(item => {
      if (category !== 'all' && !item.officialTags.includes(category)) {
        return false;
      }
      if (!normalizedQuery) return true;
      return [
        item.title,
        item.description,
        item.creator.displayName,
        item.creator.username,
        ...item.officialTags,
        ...item.customTags
      ].some(value => String(value || '').toLocaleLowerCase().includes(normalizedQuery));
    }),
    [category, items, normalizedQuery]
  );
  return (
    <Surface className="fashion-blueprint-template-panel p-4">
      <StepHeading number={1} title={t('fashion.step.template')} />
      <div className="fashion-blueprint-template-toolbar mb-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_190px]">
        <label className="relative">
          <span className="sr-only">{t('fashion.template.searchLabel')}</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--mpf-text-muted)]"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder={t('fashion.template.searchPlaceholder')}
            className="h-10 w-full border border-[var(--theme-border)] bg-[var(--theme-input)] pl-10 pr-3 text-[var(--theme-text)]"
          />
        </label>
        <label>
          <span className="sr-only">{t('fashion.template.categoryLabel')}</span>
          <select
            value={category}
            onChange={event => setCategory(event.target.value)}
            className="h-10 w-full border border-[var(--theme-border)] bg-[var(--theme-input)] px-3 text-[var(--theme-text)]"
          >
            <option value="all">{t('fashion.template.categoryAll')}</option>
            {categories.map(item => (
              <option key={item} value={item}>{formatCategoryLabel(item)}</option>
            ))}
          </select>
        </label>
      </div>
      {pending ? <LoadingState label={t('fashion.loading.templates')} /> : null}
      {error ? (
        <StatusNotice tone="warning" title={t('fashion.error.templateNotReadyTitle')}>
          {error}
        </StatusNotice>
      ) : null}
      <div className="fashion-blueprint-template-grid grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {filteredItems.slice(0, 12).map(item => (
          <div
            key={item.id}
            className={`fashion-blueprint-template-option ${
              selected?.id === item.id
                ? 'ring-2 ring-[var(--theme-primary)]'
                : ''
            }`}
          >
            <MediaCard post={item} />
            <Button
              className="mt-2 w-full"
              size="sm"
              variant={selected?.id === item.id ? 'primary' : 'secondary'}
              onClick={() => void onSelect(item)}
            >
              {t('fashion.action.useLook')}
            </Button>
          </div>
        ))}
      </div>
      {!pending && !filteredItems.length ? (
        <EmptyState
          title={items.length
            ? t('fashion.empty.filteredTemplates')
            : t('fashion.empty.templates')}
          description={items.length
            ? t('fashion.empty.filteredTemplatesHelp')
            : t('fashion.empty.templatesHelp')}
        />
      ) : null}
    </Surface>
  );
}

function FashionCharacterStep({
  items,
  selected,
  onBack,
  onSelect
}: {
  items: CharacterSummary[];
  selected: CharacterSummary | null;
  onBack: () => void;
  onSelect: (item: CharacterSummary) => Promise<void>;
}) {
  const { t } = useTranslation('fashion-blueprint');
  return (
    <Surface className="p-5">
      <StepHeading number={2} title={t('fashion.step.character')} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.slice(0, 9).map(item => (
          <div
            key={item.id}
            className={selected?.id === item.id
              ? 'ring-2 ring-[var(--theme-primary)]'
              : ''}
          >
            <CharacterCard character={item} />
            <Button
              className="mt-2 w-full"
              size="sm"
              disabled={!item.handoffAvailable}
              variant={selected?.id === item.id ? 'primary' : 'secondary'}
              onClick={() => void onSelect(item)}
            >
              {item.handoffAvailable
                ? t('fashion.action.useCharacter')
                : t('fashion.action.viewOnly')}
            </Button>
          </div>
        ))}
      </div>
      <WizardBack onClick={onBack} />
    </Surface>
  );
}

function FashionProductsStep({
  products,
  activeProduct,
  uploading,
  onActivate,
  onAdd,
  onRemove,
  onPatch,
  onReferencesChange,
  uploadReference,
  onBack,
  onContinue
}: {
  products: ProductItem[];
  activeProduct: ProductItem;
  uploading: boolean;
  onActivate: (key: string) => void;
  onAdd: () => void;
  onRemove: () => void;
  onPatch: (patch: Partial<ProductItem>) => void;
  onReferencesChange: (
    value: Partial<Record<GenerationReferenceRole, string>>
  ) => void;
  uploadReference: (
    dataUrl: string,
    role: GenerationReferenceRole
  ) => Promise<string>;
  onBack: () => void;
  onContinue: () => void;
}) {
  const { t } = useTranslation('fashion-blueprint');
  const allReady = products.every(item =>
    Boolean(item.references.outfit_front?.assetId)
  );
  return (
    <Surface className="p-5">
      <StepHeading number={3} title={t('fashion.step.outfit')} />
      <p className="text-sm text-[var(--mpf-text-muted)]">
        {t('fashion.products.help')}
      </p>
      <div className="mb-4 flex flex-wrap gap-2">
        {products.map((item, index) => (
          <Button
            key={item.key}
            variant={activeProduct.key === item.key ? 'primary' : 'secondary'}
            onClick={() => onActivate(item.key)}
          >
            {t('fashion.outfitLabel', { number: index + 1 })}
          </Button>
        ))}
        <Button
          disabled={products.length >= 5}
          icon={<PackagePlus className="size-4" />}
          onClick={onAdd}
        >
          {t('fashion.action.addOutfit')}
        </Button>
        <Button
          variant="danger"
          disabled={products.length === 1}
          icon={<X className="size-4" />}
          onClick={onRemove}
        >
          {t('fashion.action.removeOutfit')}
        </Button>
      </div>
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <Field label={t('fashion.field.productName')}>
          <input
            value={activeProduct.name}
            onChange={event => onPatch({ name: event.target.value })}
            className="h-11 border border-[var(--mpf-border)] bg-[var(--theme-input)] px-3 text-[var(--mpf-text)]"
          />
        </Field>
        <Field label={t('fashion.field.sku')}>
          <input
            maxLength={80}
            value={activeProduct.sku}
            onChange={event => onPatch({ sku: event.target.value })}
            className="h-11 border border-[var(--mpf-border)] bg-[var(--theme-input)] px-3 text-[var(--mpf-text)]"
          />
        </Field>
        <Field label={t('fashion.field.productType')}>
          <select
            value={activeProduct.productType}
            onChange={event => onPatch({
              productType: event.target.value as ProductItem['productType']
            })}
            className="h-11 border border-[var(--mpf-border)] bg-[var(--theme-input)] px-3 text-[var(--mpf-text)]"
          >
            <option value="top">{t('fashion.product.top')}</option>
            <option value="bottom">{t('fashion.product.bottom')}</option>
            <option value="dress">{t('fashion.product.dress')}</option>
            <option value="clothing_set">{t('fashion.product.set')}</option>
          </select>
        </Field>
        <Field label={t('fashion.field.outfitScope')}>
          <select
            value={activeProduct.outfitScope}
            onChange={event => onPatch({
              outfitScope: event.target.value as ProductItem['outfitScope']
            })}
            className="h-11 border border-[var(--mpf-border)] bg-[var(--theme-input)] px-3 text-[var(--mpf-text)]"
          >
            <option value="full_look">{t('fashion.scope.full')}</option>
            <option value="top_only">{t('fashion.scope.top')}</option>
            <option value="bottom_only">{t('fashion.scope.bottom')}</option>
            <option value="single_item">{t('fashion.scope.single')}</option>
          </select>
        </Field>
        <Field label={t('fashion.field.integrity')}>
          <select
            value={activeProduct.integrityLevel}
            onChange={event => onPatch({
              integrityLevel:
                event.target.value as ProductItem['integrityLevel']
            })}
            className="h-11 border border-[var(--mpf-border)] bg-[var(--theme-input)] px-3 text-[var(--mpf-text)]"
          >
            <option value="creative">{t('fashion.integrity.creative')}</option>
            <option value="balanced">{t('fashion.integrity.balanced')}</option>
            <option value="strict">{t('fashion.integrity.strict')}</option>
          </select>
        </Field>
        <Field label={t('fashion.field.colorNotes')}>
          <input
            maxLength={160}
            value={activeProduct.colorNotes}
            onChange={event => onPatch({ colorNotes: event.target.value })}
            className="h-11 border border-[var(--mpf-border)] bg-[var(--theme-input)] px-3 text-[var(--mpf-text)]"
          />
        </Field>
      </div>
      <ReferenceSlotGrid
        value={referenceUrls(activeProduct.references)}
        maxReferences={3}
        supported
        roles={['outfit_front', 'outfit_back']}
        uploadReference={uploadReference}
        onChange={onReferencesChange}
      />
      {uploading ? (
        <p className="flex items-center gap-2 text-sm text-[var(--theme-primary)]">
          <LoaderCircle className="size-4 animate-spin" />
          {t('fashion.uploading')}
        </p>
      ) : null}
      <div className="mt-5 flex flex-wrap justify-between gap-2">
        <WizardBack onClick={onBack} />
        <Button
          variant="primary"
          disabled={!allReady}
          icon={<ArrowRight className="size-4" />}
          onClick={onContinue}
        >
          {t('fashion.action.review')}
        </Button>
      </div>
    </Surface>
  );
}

function FashionReviewStep({
  catalog,
  advanced,
  engine,
  quality,
  poseDirection,
  environmentDirection,
  quotePurpose,
  productCount,
  approvedProofRunId,
  quote,
  run,
  planReady,
  quotePending,
  runPending,
  approvePending,
  quoteError,
  runError,
  onAdvancedChange,
  onEngineChange,
  onQualityChange,
  onPoseChange,
  onEnvironmentChange,
  onPurposeChange,
  onCalculate,
  onGenerate,
  onApproveProof,
  onBack
}: {
  catalog: Awaited<ReturnType<typeof getProviderCatalog>> | undefined;
  advanced: boolean;
  engine: EngineValue;
  quality: QualityTier;
  poseDirection: string;
  environmentDirection: string;
  quotePurpose: QuotePurpose;
  productCount: number;
  approvedProofRunId: string | null;
  quote: FashionQuote | null;
  run: FashionRun | null;
  planReady: boolean;
  quotePending: boolean;
  runPending: boolean;
  approvePending: boolean;
  quoteError: string | null;
  runError: string | null;
  onAdvancedChange: (value: boolean) => void;
  onEngineChange: (value: EngineValue) => void;
  onQualityChange: (value: QualityTier) => void;
  onPoseChange: (value: string) => void;
  onEnvironmentChange: (value: string) => void;
  onPurposeChange: (value: QuotePurpose) => void;
  onCalculate: () => void;
  onGenerate: () => void;
  onApproveProof: () => void;
  onBack: () => void;
}) {
  const { t } = useTranslation('fashion-blueprint');
  return (
    <Surface className="p-5">
      <StepHeading number={4} title={t('fashion.step.review')} />
      <details className="mb-5 border border-[var(--mpf-border)] p-4">
        <summary className="cursor-pointer font-semibold">
          {t('fashion.direction.title')}
        </summary>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label={t('fashion.field.pose')}>
            <select
              value={poseDirection}
              onChange={event => onPoseChange(event.target.value)}
              className="h-11 border border-[var(--mpf-border)] bg-[var(--theme-input)] px-3 text-[var(--mpf-text)]"
            >
              <option value="template_pose">{t('fashion.direction.templatePose')}</option>
              <option value="relaxed_ecommerce_stance">{t('fashion.direction.relaxed')}</option>
              <option value="natural_walking_pose">{t('fashion.direction.walking')}</option>
              <option value="confident_editorial_pose">{t('fashion.direction.editorial')}</option>
            </select>
          </Field>
          <Field label={t('fashion.field.environment')}>
            <select
              value={environmentDirection}
              onChange={event => onEnvironmentChange(event.target.value)}
              className="h-11 border border-[var(--mpf-border)] bg-[var(--theme-input)] px-3 text-[var(--mpf-text)]"
            >
              <option value="template_environment">{t('fashion.direction.templateEnvironment')}</option>
              <option value="clean_white_ecommerce_studio">{t('fashion.direction.whiteStudio')}</option>
              <option value="warm_minimal_lifestyle_interior">{t('fashion.direction.lifestyle')}</option>
              <option value="premium_editorial_studio">{t('fashion.direction.premiumStudio')}</option>
            </select>
          </Field>
        </div>
      </details>
      <div className="mb-5 grid gap-3 md:grid-cols-3">
        {(['draft', 'selling_quality', 'premium_campaign'] as QualityTier[])
          .map(tier => (
            <button
              key={tier}
              type="button"
              className={`border p-4 text-left ${
                quality === tier
                  ? 'border-[var(--theme-primary)] bg-[var(--theme-selected)]'
                  : 'border-[var(--mpf-border)] bg-[var(--mpf-surface)]'
              }`}
              onClick={() => onQualityChange(tier)}
            >
              <strong>{t(`fashion.quality.${tier}.title`)}</strong>
              <small className="mt-2 block text-[var(--mpf-text-muted)]">
                {t(`fashion.quality.${tier}.description`)}
              </small>
            </button>
          ))}
      </div>
      <Surface className="mb-5 flex flex-wrap items-center justify-between gap-3 p-4">
        <span>
          <strong>{t(advanced
            ? 'fashion.routing.advanced'
            : 'fashion.routing.simple')}</strong>
          <small className="block text-[var(--mpf-text-muted)]">
            {t(advanced
              ? 'fashion.routing.advancedHelp'
              : 'fashion.routing.simpleHelp')}
          </small>
        </span>
        <Button onClick={() => onAdvancedChange(!advanced)}>
          {t(advanced
            ? 'fashion.action.useSimple'
            : 'fashion.action.advanced')}
        </Button>
      </Surface>
      {advanced && catalog ? (
        <EngineTargetPanel
          catalog={catalog}
          value={engine}
          comparison={false}
          comparisonSlots={[]}
          allowComparison={false}
          onChange={onEngineChange}
          onComparisonChange={() => {}}
          onSlotsChange={() => {}}
        />
      ) : null}
      <Surface className="mt-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <strong className="text-lg">{t('fashion.quote.title')}</strong>
            <p className="mb-0 mt-1 text-sm text-[var(--mpf-text-muted)]">
              {t('fashion.quote.lockedHelp')}
            </p>
          </div>
          {quote ? (
            <div className="text-right">
              <strong className="flex items-center gap-2 text-xl text-[var(--theme-primary)]">
                <Coins className="size-5" />
                {t('fashion.quote.credits', {
                  credits: quote.maximumCredits
                })}
              </strong>
              <small className="text-[var(--mpf-text-muted)]">
                {quote.routeSnapshot.providerId} / {quote.routeSnapshot.modelId}
              </small>
            </div>
          ) : null}
        </div>
        <Field label={t('fashion.quote.purpose')}>
          <select
            value={quotePurpose}
            onChange={event =>
              onPurposeChange(event.target.value as QuotePurpose)}
            className="mt-3 h-11 w-full border border-[var(--mpf-border)] bg-[var(--theme-input)] px-3 text-[var(--mpf-text)] sm:w-72"
          >
            <option value="full">{t('fashion.quote.full')}</option>
            {productCount > 1 ? (
              <option value="proof">{t('fashion.quote.proof')}</option>
            ) : null}
            {productCount > 1 && approvedProofRunId ? (
              <option value="continuation">
                {t('fashion.quote.continuation')}
              </option>
            ) : null}
          </select>
        </Field>
        {quoteError ? (
          <ErrorState title={t('fashion.error.quote')} description={quoteError} />
        ) : null}
        {runError ? (
          <ErrorState title={t('fashion.error.run')} description={runError} />
        ) : null}
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button
            disabled={!planReady || quotePending}
            icon={quotePending
              ? <LoaderCircle className="size-4 animate-spin" />
              : <Coins className="size-4" />}
            onClick={onCalculate}
          >
            {t(quote
              ? 'fashion.action.refreshQuote'
              : 'fashion.action.calculate')}
          </Button>
          <Button
            variant="primary"
            disabled={!quote || runPending}
            icon={runPending
              ? <LoaderCircle className="size-4 animate-spin" />
              : <Sparkles className="size-4" />}
            onClick={onGenerate}
          >
            {t(quotePurpose === 'proof'
              ? 'fashion.action.generateProof'
              : 'fashion.action.generateAll')}
          </Button>
        </div>
      </Surface>
      {run ? <FashionRunResults run={run} /> : null}
      {run?.quotePurpose === 'proof'
        && run.status === 'completed'
        && run.proofStatus !== 'approved' ? (
          <div className="mt-4 flex justify-end">
            <Button
              variant="primary"
              disabled={approvePending}
              onClick={onApproveProof}
            >
              {t('fashion.action.approveProof')}
            </Button>
          </div>
        ) : null}
      <WizardBack onClick={onBack} />
    </Surface>
  );
}

function FashionSetupSummary({
  step,
  template,
  character,
  products,
  quality,
  quote,
  onGoToStep
}: {
  step: number;
  template: CommunityPost | null;
  character: CharacterSummary | null;
  products: ProductItem[];
  quality: QualityTier;
  quote: FashionQuote | null;
  onGoToStep: (step: number) => void;
}) {
  const { t } = useTranslation('fashion-blueprint');
  const complete = [
    Boolean(template),
    Boolean(character),
    products.every(item => item.references.outfit_front?.assetId),
    Boolean(quote)
  ].filter(Boolean).length;
  return (
    <aside className="fashion-blueprint-setup sticky top-5 border border-[var(--theme-border)] bg-[var(--theme-bg-raised)] p-4">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="m-0 text-lg">{t('fashion.summary.title')}</h2>
        <span className="text-xs text-[var(--theme-primary)]">
          {t('fashion.summary.complete', { complete })}
        </span>
      </div>
      <SummaryRow
        label={t('fashion.rail.template')}
        value={template?.title || t('fashion.summary.notSelected')}
        imageUrl={template?.thumbnailUrl || template?.imageUrl || null}
        active={step === 1}
        onClick={() => onGoToStep(1)}
      />
      <SummaryRow
        label={t('fashion.rail.character')}
        value={character?.displayName || t('fashion.summary.notSelected')}
        imageUrl={
          character?.displayImageUrl
          || character?.thumbnailUrl
          || character?.imageUrl
          || null
        }
        active={step === 2}
        onClick={() => onGoToStep(2)}
      />
      <SummaryRow
        label={t('fashion.rail.outfit')}
        value={t('fashion.summary.products', {
          ready: products.filter(item =>
            item.references.outfit_front?.assetId
          ).length,
          total: products.length
        })}
        active={step === 3}
        onClick={() => onGoToStep(3)}
      />
      <SummaryRow
        label={t('fashion.rail.review')}
        value={t(`fashion.quality.${quality}.title`)}
        active={step === 4}
        onClick={() => onGoToStep(4)}
      />
      {quote ? (
        <div className="mt-4 border-t border-[var(--mpf-border)] pt-4">
          <small className="text-[var(--mpf-text-muted)]">
            {t('fashion.summary.lockedTotal')}
          </small>
          <strong className="mt-1 block text-xl text-[var(--theme-primary)]">
            {t('fashion.quote.credits', { credits: quote.maximumCredits })}
          </strong>
        </div>
      ) : null}
    </aside>
  );
}

function FashionRunResults({ run }: { run: FashionRun }) {
  const { t } = useTranslation('fashion-blueprint');
  const completedCount = run.operations.filter(operation => operation.status === 'completed').length;
  const failedCount = run.operations.filter(operation => operation.status === 'failed').length;
  const active = !['completed', 'partially_completed', 'failed'].includes(run.status);
  return (
    <section
      className="fashion-production mt-5 border border-[var(--mpf-border)] bg-[var(--theme-bg-raised)] p-4"
      aria-live="polite"
      aria-busy={active}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="m-0 text-lg">{t('fashion.run.title')}</h2>
        <div className="fashion-production__status">
          {active ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
          <span>
            {t(`common.status.${run.status}`, {
              ns: 'common',
              defaultValue: run.status
            })}
          </span>
          <small>{t('fashion.run.progress', {
            completed: completedCount,
            total: run.operations.length,
            failed: failedCount
          })}</small>
        </div>
      </div>
      {run.operations.length === 0 ? (
        <div className="fashion-production__empty">
          {active ? (
            <LoaderCircle className="size-10 animate-spin" aria-hidden="true" />
          ) : (
            <img src={momeloMark} alt="" aria-hidden="true" />
          )}
          <strong>{active
            ? t('fashion.run.preparingTitle')
            : t('fashion.run.emptyTitle')}</strong>
          <p>{active
            ? t('fashion.run.preparingDescription')
            : t('fashion.run.emptyDescription')}</p>
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {run.operations.map(operation => (
          <article
            key={operation.operationId}
            className="border border-[var(--mpf-border)] bg-[var(--mpf-surface)] p-3"
          >
            {operation.result?.imageUrl ? (
              <img
                src={apiMediaUrl(operation.result.imageUrl) || ''}
                alt=""
                className="aspect-[3/4] w-full bg-[var(--theme-media-backdrop)] object-contain"
              />
            ) : (
              <div className="fashion-production__operation-state aspect-[3/4] bg-[var(--theme-media-backdrop)] text-sm text-[var(--mpf-text-muted)]">
                {operation.status === 'failed'
                  ? <CircleX className="size-8 text-[var(--theme-danger)]" aria-hidden="true" />
                  : operation.status === 'completed'
                    ? <CheckCircle2 className="size-8 text-[var(--theme-success)]" aria-hidden="true" />
                    : <LoaderCircle className="size-8 animate-spin text-[var(--theme-primary)]" aria-hidden="true" />}
                <span>{t(`common.status.${operation.status}`, {
                  ns: 'common',
                  defaultValue: operation.status
                })}</span>
              </div>
            )}
            <strong className="mt-3 block text-sm">
              {operation.productName || operation.productItemKey}
            </strong>
            {operation.error ? (
              <small className="mt-1 block text-[var(--theme-danger)]">
                {typeof operation.error === 'string'
                  ? operation.error
                  : operation.error.message}
              </small>
            ) : null}
            {operation.status === 'completed' && operation.result?.imageUrl ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={apiMediaUrl(operation.result.imageUrl) || ''}
                  download
                  className="inline-flex min-h-9 items-center justify-center gap-2 border border-[var(--mpf-border-strong)] px-3 text-xs font-semibold text-[var(--mpf-text)] no-underline"
                >
                  <Download className="size-4" />
                  {t('fashion.action.download')}
                </a>
                <CollectionPickerDialog jobId={operation.jobId} />
                <ShareGeneratedDialog jobId={operation.jobId} />
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function StepRail({
  current,
  onSelect
}: {
  current: number;
  onSelect: (step: number) => void;
}) {
  const { t } = useTranslation('fashion-blueprint');
  const labels = [
    t('fashion.rail.template'),
    t('fashion.rail.character'),
    t('fashion.rail.outfit'),
    t('fashion.rail.review')
  ];
  return (
    <ol className="fashion-blueprint-stepper">
      {labels.map((label, index) => (
        <li
          key={label}
          className="fashion-blueprint-stepper__item"
        >
          <button
            type="button"
            onClick={() => onSelect(index + 1)}
            aria-current={current === index + 1 ? 'step' : undefined}
            className={`fashion-blueprint-stepper__button${
              current > index + 1 ? ' is-complete' : ''
            }`}
          >
            <span className="fashion-blueprint-stepper__number">
              {String(index + 1).padStart(2, '0')}
            </span>
            <span className="fashion-blueprint-stepper__label">{label}</span>
          </button>
        </li>
      ))}
    </ol>
  );
}

function StepHeading({ number, title }: { number: number; title: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="grid size-8 place-items-center border border-[var(--theme-primary)] text-[var(--theme-primary)]">
        {number}
      </span>
      <h2 className="m-0 text-xl">{title}</h2>
    </div>
  );
}

function Field({
  label,
  children
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-1 text-sm text-[var(--mpf-text-muted)]">
      {label}
      {children}
    </label>
  );
}

function SummaryRow({
  label,
  value,
  imageUrl,
  active,
  onClick
}: {
  label: string;
  value: string;
  imageUrl?: string | null;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`mb-2 w-full border p-3 text-left ${
        active
          ? 'border-[var(--theme-primary)] bg-[var(--theme-selected)]'
          : 'border-[var(--mpf-border)] bg-[var(--mpf-surface)]'
      }`}
    >
      <span className="flex items-center gap-3">
        {imageUrl ? (
          <span className="fashion-blueprint-setup-preview">
            <img src={apiMediaUrl(imageUrl) || ''} alt="" />
          </span>
        ) : null}
        <span className="min-w-0">
          <small className="block text-[var(--mpf-text-muted)]">{label}</small>
          <strong className="mt-1 block [overflow-wrap:anywhere]">{value}</strong>
        </span>
      </span>
    </button>
  );
}

function WizardBack({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation('fashion-blueprint');
  return (
    <Button
      className="mt-5"
      icon={<ArrowLeft className="size-4" />}
      onClick={onClick}
    >
      {t('fashion.action.back')}
    </Button>
  );
}

function createProductItem(
  index: number,
  characterReference?: FashionReferenceAsset
): ProductItem {
  const key = `fashion_item_${Date.now()}_${index}`;
  return {
    key,
    clientKey: key,
    name: `Outfit ${index}`,
    sku: '',
    productType: 'clothing_set',
    outfitScope: 'full_look',
    colorNotes: '',
    integrityLevel: 'balanced',
    references: characterReference
      ? { character_reference: characterReference }
      : {}
  };
}

function referenceUrls(
  references: Partial<Record<GenerationReferenceRole, FashionReferenceAsset>>
) {
  return Object.fromEntries(
    Object.entries(references).map(([role, reference]) => [
      role,
      reference?.imageUrl
    ])
  ) as Partial<Record<GenerationReferenceRole, string>>;
}

function createDraftFallback(product: ProductItem): FashionDraft {
  return {
    step: 1,
    templatePostId: null,
    templateUseSessionId: null,
    characterProfileId: null,
    characterProfileContext: null,
    products: [product],
    activeProductKey: product.key,
    qualityTier: 'selling_quality',
    routingMode: 'simple',
    poseDirection: 'template_pose',
    environmentDirection: 'template_environment',
    runId: null
  };
}

function clampStep(value: number) {
  return Math.min(4, Math.max(1, Number(value) || 1));
}

function formatCategoryLabel(value: string) {
  return value
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, character => character.toUpperCase());
}

function isInsufficientCreditError(error: unknown): error is ApiError {
  return error instanceof ApiError && error.code === 'credit_insufficient';
}

import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';
import { Check, ChevronRight, Coins, Download, LoaderCircle, PackagePlus, Sparkles, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EngineTargetPanel, type EngineValue } from '../../../components/generation/EngineTargetPanel';
import { ReferenceSlotGrid } from '../../../components/generation/ReferenceSlotGrid';
import { MediaCard } from '../../../components/media/MediaCard';
import { CharacterCard } from '../../../components/profiles/CharacterCard';
import { ErrorState, EmptyState, LoadingState } from '../../../components/ui/AsyncState';
import { Button } from '../../../components/ui/Button';
import { Surface } from '../../../components/ui/Surface';
import { CollectionPickerDialog } from '../../../components/collections/CollectionPickerDialog';
import { ShareGeneratedDialog } from '../../../components/community/ShareGeneratedDialog';
import { useActor } from '../../../lib/auth/ActorProvider';
import { getActiveActorId } from '../../../lib/auth/actorStore';
import { readHandoff } from '../../../lib/persistence/handoffStorage';
import { apiMediaUrl } from '../../../lib/api/apiClient';
import { listCommunityPosts } from '../../community/api/communityApi';
import type { CommunityPost } from '../../community/schemas/communitySchemas';
import { getProviderCatalog, type GenerationReferenceRole } from '../../generation/api/generationApi';
import { listCharacters, requestCharacterHandoff } from '../../profiles/api/profileApi';
import type { CharacterSummary } from '../../profiles/schemas/profileSchemas';
import {
  createFashionQuote,
  createFashionRun,
  getFashionRun,
  uploadFashionReference,
  type FashionPlanInput
} from '../api/fashionBlueprintApi';
import type { FashionQuote, FashionRun } from '../schemas/fashionSchemas';

type QualityTier = 'draft' | 'selling_quality' | 'premium_campaign';
type ProductItem = {
  key: string;
  name: string;
  productType: 'top' | 'bottom' | 'dress' | 'clothing_set';
  references: Partial<Record<GenerationReferenceRole, string>>;
};

export function FashionBlueprintRoute() {
  const { t } = useTranslation('fashion-blueprint');
  const { actor } = useActor();
  const actorId = actor?.userId || 'loading';
  const previousActorId = useRef(getActiveActorId());
  const initialCharacter = useMemo(loadCharacterHandoff, []);
  const [step, setStep] = useState(1);
  const [template, setTemplate] = useState<CommunityPost | null>(null);
  const [character, setCharacter] = useState<CharacterSummary | null>(initialCharacter.character);
  const [characterContext, setCharacterContext] = useState<Record<string, unknown> | null>(initialCharacter.characterProfileContext);
  const [items, setItems] = useState<ProductItem[]>([createProductItem(1, initialCharacter.characterReferenceUrl)]);
  const [activeItemKey, setActiveItemKey] = useState(items[0]!.key);
  const [quality, setQuality] = useState<QualityTier>('selling_quality');
  const [poseDirection, setPoseDirection] = useState('template_pose');
  const [environmentDirection, setEnvironmentDirection] = useState('template_environment');
  const [advanced, setAdvanced] = useState(false);
  const [engine, setEngine] = useState<EngineValue>({ provider: '', model: '', resolution: null, aspectRatio: '6:8' });
  const [quote, setQuote] = useState<FashionQuote | null>(null);
  const [run, setRun] = useState<FashionRun | null>(null);
  const [uploading, setUploading] = useState(false);

  const templates = useInfiniteQuery({
    queryKey: ['fashion-templates', actorId],
    queryFn: ({ pageParam }) => listCommunityPosts({ sort: 'trending', period: 'month', postType: 'template', search: '' }, pageParam),
    enabled: Boolean(actor),
    initialPageParam: null as string | null,
    getNextPageParam: page => page.nextCursor || undefined
  });
  const characters = useInfiniteQuery({
    queryKey: ['fashion-characters', actorId],
    queryFn: ({ pageParam }) => listCharacters({ cursor: pageParam || '', destination: 'fashion_blueprint' }),
    enabled: Boolean(actor),
    initialPageParam: null as string | null,
    getNextPageParam: page => page.nextCursor || undefined
  });
  const catalog = useQuery({ queryKey: ['provider-catalog'], queryFn: getProviderCatalog, staleTime: 300_000 });
  useEffect(() => {
    if (!catalog.data || engine.provider) return;
    const provider = catalog.data.providers.find(item => item.id === catalog.data.defaultProvider) || catalog.data.providers[0];
    const model = provider?.models.find(item => item.id === provider.defaultModel) || provider?.models[0];
    setEngine({
      provider: provider?.id || '',
      model: model?.id || '',
      resolution: model?.capabilities.resolutions?.[0] || model?.defaults?.resolution || model?.defaults?.imageSize || null,
      aspectRatio: model?.capabilities.aspectRatios.includes('6:8') ? '6:8' : model?.capabilities.aspectRatios[0] || '1:1'
    });
  }, [catalog.data, engine.provider]);
  useEffect(() => {
    if (!actor?.userId || previousActorId.current === actor.userId) return;
    previousActorId.current = actor.userId;
    const first = createProductItem(1);
    setStep(1);
    setTemplate(null);
    setCharacter(null);
    setCharacterContext(null);
    setItems([first]);
    setActiveItemKey(first.key);
    setQuality('selling_quality');
    setPoseDirection('template_pose');
    setEnvironmentDirection('template_environment');
    setAdvanced(false);
    setQuote(null);
    setRun(null);
  }, [actor?.userId]);

  const activeItem = items.find(item => item.key === activeItemKey) || items[0]!;
  const plan = useMemo<FashionPlanInput | null>(() => {
    if (!template || !characterContext || !items.every(item => item.references.outfit_front)) return null;
    return {
      templateId: template.id,
      characterProfileContext: characterContext,
      productItems: items.map(item => ({
        key: item.key,
        name: item.name,
        productType: item.productType,
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
  }, [advanced, characterContext, engine, environmentDirection, items, poseDirection, quality, template]);
  const planFingerprint = useMemo(() => plan ? JSON.stringify(plan) : '', [plan]);
  useEffect(() => {
    setQuote(null);
    setRun(null);
  }, [planFingerprint]);

  const quoteMutation = useMutation({
    mutationFn: () => {
      if (!plan) throw new Error(t('fashion.error.incomplete'));
      return createFashionQuote(plan);
    },
    onSuccess: data => setQuote(data.quote)
  });
  const runMutation = useMutation({
    mutationFn: () => {
      if (!plan || !quote) throw new Error(t('fashion.error.quoteRequired'));
      return createFashionRun(quote.id, plan, `fashion:${quote.id}`);
    },
    onSuccess: data => setRun(data)
  });
  const runQuery = useQuery({
    queryKey: ['fashion-run', actor?.userId, run?.id],
    queryFn: ({ signal }) => getFashionRun(run!.id, signal),
    enabled: Boolean(run?.id),
    refetchInterval: query => {
      const status = query.state.data?.status;
      return status && ['completed', 'failed'].includes(status) ? false : 1_500;
    }
  });
  const displayedRun = runQuery.data || run;

  async function chooseCharacter(next: CharacterSummary) {
    const handoff = await requestCharacterHandoff(next.id, 'fashion_blueprint');
    setCharacter(next);
    setCharacterContext(handoff.characterProfileContext);
    setItems(current => current.map(item => ({
      ...item,
      references: { ...item.references, character_reference: handoff.characterReferenceUrl }
    })));
    setStep(Math.max(step, 3));
  }

  function patchActiveReferences(next: Partial<Record<GenerationReferenceRole, string>>) {
    setItems(current => current.map(item =>
      item.key === activeItem.key
        ? { ...item, references: { ...next, character_reference: item.references.character_reference } }
        : item
    ));
    if (next.outfit_front) setStep(current => Math.max(current, 4));
  }

  async function uploadOutfitReference(dataUrl: string, role: GenerationReferenceRole) {
    setUploading(true);
    try {
      const asset = await uploadFashionReference(dataUrl, role);
      return asset.imageUrl;
    } finally {
      setUploading(false);
    }
  }

  return (
    <main>
      <header className="mb-5 border-b border-[var(--mpf-border)] pb-5">
        <span className="text-xs font-bold uppercase text-cyan-300">{t('fashion.eyebrow')}</span>
        <h1 className="mb-2 mt-2 text-3xl">{t('fashion.title')}</h1>
        <p className="m-0 text-sm text-[var(--mpf-text-muted)]">{t('fashion.description')}</p>
      </header>
      <StepRail current={step} />

      <section className="mt-5 border-b border-[var(--mpf-border)] pb-6">
        <StepHeading number={1} title={t('fashion.step.template')} complete={Boolean(template)} />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {templates.data?.pages.flatMap(page => page.items).slice(0, 8).map(item => (
            <div key={item.id} className={template?.id === item.id ? 'ring-2 ring-cyan-400' : ''}>
              <MediaCard post={item} />
              <Button className="mt-2 w-full" size="sm" variant={template?.id === item.id ? 'primary' : 'secondary'} onClick={() => { setTemplate(item); setStep(Math.max(step, 2)); }}>{t('fashion.action.useLook')}</Button>
            </div>
          ))}
        </div>
        {!templates.data?.pages.flatMap(page => page.items).length ? <EmptyState title={t('fashion.empty.templates')} description={t('fashion.empty.templatesHelp')} /> : null}
      </section>

      <section className="border-b border-[var(--mpf-border)] py-6">
        <StepHeading number={2} title={t('fashion.step.character')} complete={Boolean(characterContext)} />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {characters.data?.pages.flatMap(page => page.items).slice(0, 8).map(item => (
            <div key={item.id} className={character?.id === item.id ? 'ring-2 ring-cyan-400' : ''}>
              <CharacterCard character={item} />
              <Button className="mt-2 w-full" size="sm" disabled={!item.handoffAvailable} variant={character?.id === item.id ? 'primary' : 'secondary'} onClick={() => void chooseCharacter(item)}>{item.handoffAvailable ? t('fashion.action.useCharacter') : t('fashion.action.viewOnly')}</Button>
            </div>
          ))}
        </div>
      </section>

      <section className="border-b border-[var(--mpf-border)] py-6">
        <StepHeading number={3} title={t('fashion.step.outfit')} complete={items.every(item => Boolean(item.references.outfit_front))} />
        <div className="mb-4 flex flex-wrap gap-2">
          {items.map((item, index) => <Button key={item.key} variant={activeItem.key === item.key ? 'primary' : 'secondary'} onClick={() => setActiveItemKey(item.key)}>{t('fashion.outfitLabel', { number: index + 1 })}</Button>)}
          <Button disabled={items.length >= 5} icon={<PackagePlus className="size-4" />} onClick={() => {
            const item = createProductItem(items.length + 1, items[0]!.references.character_reference);
            setItems(current => [...current, item]);
            setActiveItemKey(item.key);
          }}>{t('fashion.action.addOutfit')}</Button>
          <Button variant="danger" disabled={items.length === 1} icon={<X className="size-4" />} onClick={() => {
            const remaining = items.filter(item => item.key !== activeItem.key);
            setItems(remaining);
            setActiveItemKey(remaining[0]!.key);
          }}>{t('fashion.action.removeOutfit')}</Button>
        </div>
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm text-[var(--mpf-text-muted)]">{t('fashion.field.productName')}<input value={activeItem.name} onChange={event => setItems(current => current.map(item => item.key === activeItem.key ? { ...item, name: event.target.value } : item))} className="h-11 border border-[var(--mpf-border)] bg-black/30 px-3 text-white" /></label>
          <label className="grid gap-1 text-sm text-[var(--mpf-text-muted)]">{t('fashion.field.productType')}<select value={activeItem.productType} onChange={event => setItems(current => current.map(item => item.key === activeItem.key ? { ...item, productType: event.target.value as ProductItem['productType'] } : item))} className="h-11 border border-[var(--mpf-border)] bg-black/30 px-3 text-white"><option value="top">{t('fashion.product.top')}</option><option value="bottom">{t('fashion.product.bottom')}</option><option value="dress">{t('fashion.product.dress')}</option><option value="clothing_set">{t('fashion.product.set')}</option></select></label>
        </div>
        <ReferenceSlotGrid value={activeItem.references} maxReferences={3} supported roles={['outfit_front', 'outfit_back']} uploadReference={uploadOutfitReference} onChange={patchActiveReferences} />
        {uploading ? <p className="flex items-center gap-2 text-sm text-cyan-200"><LoaderCircle className="size-4 animate-spin" />{t('fashion.uploading')}</p> : null}
      </section>

      <section className="py-6">
        <StepHeading number={4} title={t('fashion.step.direction')} complete />
        <div className="mb-5 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm text-[var(--mpf-text-muted)]">{t('fashion.field.pose')}<select value={poseDirection} onChange={event => setPoseDirection(event.target.value)} className="h-11 border border-[var(--mpf-border)] bg-black/30 px-3 text-white"><option value="template_pose">{t('fashion.direction.templatePose')}</option><option value="relaxed_ecommerce_stance">{t('fashion.direction.relaxed')}</option><option value="natural_walking_pose">{t('fashion.direction.walking')}</option><option value="confident_editorial_pose">{t('fashion.direction.editorial')}</option></select></label>
          <label className="grid gap-1 text-sm text-[var(--mpf-text-muted)]">{t('fashion.field.environment')}<select value={environmentDirection} onChange={event => setEnvironmentDirection(event.target.value)} className="h-11 border border-[var(--mpf-border)] bg-black/30 px-3 text-white"><option value="template_environment">{t('fashion.direction.templateEnvironment')}</option><option value="clean_white_ecommerce_studio">{t('fashion.direction.whiteStudio')}</option><option value="warm_minimal_lifestyle_interior">{t('fashion.direction.lifestyle')}</option><option value="premium_editorial_studio">{t('fashion.direction.premiumStudio')}</option></select></label>
        </div>

        <StepHeading number={5} title={t('fashion.step.quality')} complete={Boolean(quote)} />
        <div className="mb-5 grid gap-3 md:grid-cols-3">
          {(['draft', 'selling_quality', 'premium_campaign'] as QualityTier[]).map(tier => <button key={tier} type="button" className={`border p-4 text-left ${quality === tier ? 'border-cyan-400 bg-cyan-400/10' : 'border-[var(--mpf-border)] bg-[var(--mpf-surface)]'}`} onClick={() => { setQuality(tier); setStep(current => Math.max(current, 5)); }}><strong>{t(`fashion.quality.${tier}.title`)}</strong><small className="mt-2 block text-[var(--mpf-text-muted)]">{t(`fashion.quality.${tier}.description`)}</small></button>)}
        </div>
        <Surface className="mb-5 flex flex-wrap items-center justify-between gap-3 p-4"><span><strong>{t(advanced ? 'fashion.routing.advanced' : 'fashion.routing.simple')}</strong><small className="block text-[var(--mpf-text-muted)]">{t(advanced ? 'fashion.routing.advancedHelp' : 'fashion.routing.simpleHelp')}</small></span><Button onClick={() => setAdvanced(value => !value)}>{t(advanced ? 'fashion.action.useSimple' : 'fashion.action.advanced')}</Button></Surface>
        {advanced && catalog.data ? <EngineTargetPanel catalog={catalog.data} value={engine} comparison={false} comparisonSlots={[]} allowComparison={false} onChange={setEngine} onComparisonChange={() => {}} onSlotsChange={() => {}} /> : null}

        <Surface className="mt-5 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <strong className="text-lg">{t('fashion.quote.title')}</strong>
              <p className="mb-0 mt-1 text-sm text-[var(--mpf-text-muted)]">{t('fashion.quote.summary', { products: items.length, outputs: items.length })}</p>
            </div>
            {quote ? <div className="text-right"><strong className="flex items-center gap-2 text-xl text-cyan-200"><Coins className="size-5" />{t('fashion.quote.credits', { credits: quote.maximumCredits })}</strong><small className="text-[var(--mpf-text-muted)]">{quote.routeSnapshot.providerId} / {quote.routeSnapshot.modelId}</small></div> : null}
          </div>
          {quoteMutation.error ? <ErrorState title={t('fashion.error.quote')} description={quoteMutation.error.message} /> : null}
          {runMutation.error ? <ErrorState title={t('fashion.error.run')} description={runMutation.error.message} /> : null}
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button disabled={!plan || uploading || quoteMutation.isPending} icon={quoteMutation.isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Coins className="size-4" />} onClick={() => quoteMutation.mutate()}>{t(quote ? 'fashion.action.refreshQuote' : 'fashion.action.calculate')}</Button>
            <Button variant="primary" disabled={!quote || runMutation.isPending} icon={runMutation.isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />} onClick={() => runMutation.mutate()}>{t('fashion.action.generateAll')}</Button>
          </div>
        </Surface>

        {displayedRun ? <FashionRunResults run={displayedRun} /> : null}
        {runQuery.isLoading ? <LoadingState label={t('fashion.run.loading')} /> : null}
      </section>
    </main>
  );
}

function FashionRunResults({ run }: { run: FashionRun }) {
  const { t } = useTranslation('fashion-blueprint');
  return (
    <section className="mt-5 border border-[var(--mpf-border)] bg-black/25 p-4">
      <div className="mb-4 flex items-center justify-between gap-3"><h2 className="m-0 text-lg">{t('fashion.run.title')}</h2><span className="text-xs uppercase text-cyan-300">{t(`common.status.${run.status}`, { ns: 'common', defaultValue: run.status })}</span></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {run.operations.map(operation => (
          <article key={operation.operationId} className="border border-[var(--mpf-border)] bg-[var(--mpf-surface)] p-3">
            {operation.result?.imageUrl
              ? <img src={apiMediaUrl(operation.result.imageUrl) || ''} alt="" className="aspect-[3/4] w-full bg-black object-contain" />
              : <div className="grid aspect-[3/4] place-items-center bg-black/40 text-sm text-[var(--mpf-text-muted)]">{t(`common.status.${operation.status}`, { ns: 'common', defaultValue: operation.status })}</div>}
            <strong className="mt-3 block text-sm">{operation.productName || operation.productItemKey}</strong>
            {operation.error ? <small className="mt-1 block text-red-300">{typeof operation.error === 'string' ? operation.error : operation.error.message}</small> : null}
            {operation.status === 'completed' && operation.result?.imageUrl ? <div className="mt-3 flex flex-wrap gap-2"><a href={apiMediaUrl(operation.result.imageUrl) || ''} download className="inline-flex min-h-9 items-center justify-center gap-2 border border-[var(--mpf-border-strong)] px-3 text-xs font-semibold text-white no-underline"><Download className="size-4" />{t('fashion.action.download')}</a><CollectionPickerDialog jobId={operation.jobId} /><ShareGeneratedDialog jobId={operation.jobId} /></div> : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function StepRail({ current }: { current: number }) {
  const { t } = useTranslation('fashion-blueprint');
  const labels = [t('fashion.rail.template'), t('fashion.rail.character'), t('fashion.rail.outfit'), t('fashion.rail.direction'), t('fashion.rail.quality')];
  return <ol className="flex gap-1 overflow-x-auto border border-[var(--mpf-border)] bg-[var(--mpf-surface)] p-2">{labels.map((label, index) => <li key={label} className={`flex min-w-32 flex-1 items-center gap-2 px-3 py-2 text-xs ${current >= index + 1 ? 'text-cyan-200' : 'text-[var(--mpf-text-muted)]'}`}><span className={`grid size-6 place-items-center border ${current > index + 1 ? 'border-cyan-400 bg-cyan-400/15' : 'border-[var(--mpf-border)]'}`}>{current > index + 1 ? <Check className="size-3" /> : index + 1}</span>{label}{index < labels.length - 1 ? <ChevronRight className="ml-auto size-3" /> : null}</li>)}</ol>;
}

function StepHeading({ number, title, complete }: { number: number; title: string; complete: boolean }) {
  return <div className="mb-4 flex items-center gap-3"><span className={`grid size-8 place-items-center border ${complete ? 'border-emerald-400 text-emerald-300' : 'border-cyan-400 text-cyan-300'}`}>{complete ? <Check className="size-4" /> : number}</span><h2 className="m-0 text-xl">{title}</h2></div>;
}

function createProductItem(index: number, characterReferenceUrl?: string | null): ProductItem {
  return {
    key: `fashion_item_${Date.now()}_${index}`,
    name: `Outfit ${index}`,
    productType: 'clothing_set',
    references: characterReferenceUrl ? { character_reference: characterReferenceUrl } : {}
  };
}

function loadCharacterHandoff(): {
  character: CharacterSummary | null;
  characterProfileContext: Record<string, unknown> | null;
  characterReferenceUrl: string | null;
} {
  const empty = { character: null, characterProfileContext: null, characterReferenceUrl: null };
  try {
    const envelope = readHandoff<Record<string, unknown>>({
      actorId: getActiveActorId(),
      kind: 'character',
      consume: true
    });
    const payload = envelope?.payload || {};
    if (payload.destination !== 'fashion_blueprint' || !payload.characterReferenceUrl) return empty;
    const imageUrl = String(payload.characterReferenceUrl);
    return {
      character: {
        id: String(payload.characterProfileId || ''),
        displayName: String(payload.displayName || 'Selected Character'),
        personalitySummary: String(payload.personalitySummarySnapshot || ''),
        shortDescription: '',
        intendedUses: Array.isArray(payload.intendedUsesSnapshot) ? payload.intendedUsesSnapshot.map(String) : ['fashion'],
        characterType: payload.characterType === 'styled_character' ? 'styled_character' : 'reusable_model',
        destinationCapabilities: Array.isArray(payload.destinationCapabilities) ? payload.destinationCapabilities.map(String) : ['fashion_blueprint'],
        outfitBehavior: payload.outfitBehavior === 'preserve' ? 'preserve' : 'replaceable',
        ownerUsername: null,
        reusePolicy: 'authorized_handoff',
        reuseStatus: 'available',
        handoffAvailable: true,
        imageUrl,
        thumbnailUrl: imageUrl,
        faceThumbnailUrl: null,
        displayImageUrl: imageUrl,
        displayImageSource: 'authorized_handoff',
        characterProfileVersionId: String(payload.characterProfileVersionId || ''),
        stats: { totalOutputs: 0, byUseCase: { fashion: 0, sceneStory: 0, other: 0 } }
      },
      characterProfileContext: payload.characterProfileContext as Record<string, unknown> || null,
      characterReferenceUrl: imageUrl
    };
  } catch {
    return empty;
  }
}

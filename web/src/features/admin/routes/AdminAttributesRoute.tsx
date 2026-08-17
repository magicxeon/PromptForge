import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  CircleDashed,
  FileText,
  FlaskConical,
  History,
  ImagePlus,
  Plus,
  Search,
  Upload,
  WandSparkles
} from 'lucide-react';
import { useMemo, useState, type CSSProperties, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { ErrorState, LoadingState } from '../../../components/ui/AsyncState';
import { Button } from '../../../components/ui/Button';
import { Surface } from '../../../components/ui/Surface';
import { ThemeSelect } from '../../../components/ui/ThemeSelect';
import { showToast } from '../../../components/ui/toastStore';
import type { AttributeField, AttributeOption } from '../../studio/attributes/attributeModel';
import { localized } from '../../studio/attributes/attributeModel';
import {
  isSafeVisualAssetUrl,
  loadStudioVisualManifests
} from '../../studio/api/visualManifestApi';
import { resolveVisualPresentation } from '../../studio/visual-options/visualOptionRegistry';
import { useActor } from '../../../lib/auth/ActorProvider';
import {
  createAttributeCatalogDraft,
  getAttributeCatalogOverview,
  listAttributeDefinitions,
  saveAttributeCatalogOption
} from '../api/attributeCatalogApi';
import { AttributeDefinitionEditor, type AttributeDefinitionValues } from '../components/AttributeDefinitionEditor';
import { AttributeCategoryReleasePanel } from '../components/AttributeCategoryReleasePanel';
import { AdminNavigation } from '../components/AdminNavigation';
import type { AttributeCatalogOption } from '../schemas/attributeCatalogSchemas';

const tabs = ['definition', 'visual', 'test', 'history'] as const;
type WorkspaceTab = typeof tabs[number];

export function AdminAttributesRoute() {
  const { t } = useTranslation('admin');
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [searchDraft, setSearchDraft] = useState(params.get('search') || '');
  const [creatingOption, setCreatingOption] = useState(false);
  const category = params.get('category') || '';
  const subcategory = params.get('field') || '';
  const status = normalizeStatus(params.get('status'));
  const presentationKind = normalizePresentationKind(params.get('type'));
  const selectedOptionId = params.get('option') || '';
  const draftId = params.get('draft') || '';
  const requestedTab = params.get('tab');
  const workspace = params.get('workspace') === 'releases' ? 'releases' : 'studio';
  const tab = tabs.includes(requestedTab as WorkspaceTab)
    ? requestedTab as WorkspaceTab
    : 'definition';
  const search = params.get('search') || '';
  const actorId = actor?.userId || 'loading';

  const definitions = useQuery({
    queryKey: ['admin', actorId, 'attribute-catalog', 'definitions', draftId, category, subcategory, status, presentationKind, search],
    queryFn: ({ signal }) => listAttributeDefinitions({
      category,
      subcategory,
      status,
      presentationKind,
      search,
      draftId,
      limit: 100
    }, signal),
    enabled: Boolean(actor)
  });
  const overview = useQuery({
    queryKey: ['admin', actorId, 'attribute-catalog', 'overview'],
    queryFn: ({ signal }) => getAttributeCatalogOverview(signal),
    enabled: Boolean(actor)
  });
  const activeDraft = overview.data?.drafts.find(item => item.id === draftId) || null;
  const manifests = useQuery({
    queryKey: ['studio', 'visual-manifests', 'admin-preview'],
    queryFn: ({ signal }) => loadStudioVisualManifests('character-sheet', signal),
    staleTime: Number.POSITIVE_INFINITY
  });
  const createDraft = useMutation({
    mutationFn: () => createAttributeCatalogDraft(t('admin.attributes.newDraftTitle')),
    onSuccess: async draft => {
      update({ draft: draft.id, option: null });
      await queryClient.invalidateQueries({ queryKey: ['admin', actorId, 'attribute-catalog'] });
      showToast({ tone: 'success', title: t('admin.attributes.draftCreated') });
    },
    onError: error => showToast({ tone: 'error', title: t('admin.attributes.actionFailed'), description: error.message })
  });
  const saveOption = useMutation({
    mutationFn: ({ option, values }: { option: AttributeCatalogOption; values: AttributeDefinitionValues }) => {
      const prompt = typeof option.prompt === 'string'
        ? values.prompt
        : { ...(option.prompt || {}), default: values.prompt };
      return saveAttributeCatalogOption(draftId, {
        expectedRevision: activeDraft?.revision || 0,
        option: {
          ...option,
          label: { ...(typeof option.label === 'object' ? option.label : {}), en: values.label },
          prompt,
          enabled: values.enabled
        }
      });
    },
    onSuccess: async draft => {
      setCreatingOption(false);
      update({ option: draft.lastSavedOptionId || selectedOptionId || null });
      await queryClient.invalidateQueries({ queryKey: ['admin', actorId, 'attribute-catalog'] });
      showToast({ tone: 'success', title: t('admin.attributes.optionSaved') });
    },
    onError: error => showToast({ tone: 'error', title: t('admin.attributes.actionFailed'), description: error.message })
  });

  if (!['admin', 'support'].includes(actor?.role || '')) {
    return <ErrorState title={t('admin.access.title')} description={t('admin.access.description')} />;
  }
  if (definitions.isLoading) return <LoadingState label={t('admin.attributes.loading')} />;
  if (definitions.isError || !definitions.data) {
    return <ErrorState
      title={t('admin.attributes.loadFailed')}
      description={definitions.error?.message}
      onRetry={() => void definitions.refetch()}
    />;
  }

  const data = definitions.data;
  const effectiveCategory = category || data.resolvedFilters.category;
  const effectiveField = subcategory || data.resolvedFilters.subcategory;
  const releaseCategory = params.get('releaseCategory') || data.facets[0]?.category || '';
  const categoryFacet = data.facets.find(item => item.category === effectiveCategory);
  const catalogSelected = data.items.find(item => item.id === selectedOptionId) || data.items[0] || null;
  const selected = creatingOption && activeDraft && effectiveCategory && effectiveField
    ? createNewOption(effectiveCategory, effectiveField, presentationKind || catalogSelected?.presentationKind || 'text')
    : catalogSelected;
  const visual = buildVisualPreview(data.items, selected, manifests.data);
  const effectiveTab = selected?.presentationKind === 'text' && tab === 'visual' ? 'definition' : tab;

  function update(next: Record<string, string | null>) {
    setParams(current => {
      const updated = new URLSearchParams(current);
      for (const [key, value] of Object.entries(next)) {
        if (value) updated.set(key, value);
        else updated.delete(key);
      }
      return updated;
    });
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    update({ search: searchDraft.trim() || null, option: null });
  }

  return (
    <main className="min-w-0">
      <header className="mb-4 border-b border-[var(--mpf-border)] pb-4">
        <div>
          <span className="text-xs font-bold uppercase text-[var(--theme-primary)]">{t('admin.attributes.kicker')}</span>
          <h1 className="mb-1 mt-2 text-3xl">{t('admin.attributes.title')}</h1>
          <p className="m-0 max-w-3xl text-sm text-[var(--mpf-text-muted)]">{t('admin.attributes.description')}</p>
        </div>
      </header>

      <AdminNavigation />

      <nav className="mb-4 flex gap-1 overflow-x-auto border-b border-[var(--mpf-border)]" aria-label={t('admin.attributes.workspaces')}>
        <button type="button" className={workspaceTabClass(workspace === 'studio')} onClick={() => update({ workspace: null })}>{t('admin.attributes.attributeStudio')}</button>
        <button type="button" className={workspaceTabClass(workspace === 'releases')} onClick={() => update({ workspace: 'releases' })}>{t('admin.attributes.categoryReleases')}</button>
      </nav>

      {workspace === 'releases' ? (
        <AttributeCategoryReleasePanel
          actorId={actorId}
          categories={data.facets.map(item => ({ category: item.category, count: item.count }))}
          selectedCategory={releaseCategory}
          onCategoryChange={next => update({ releaseCategory: next || null })}
        />
      ) : <>

      <Surface className="mb-3 flex flex-wrap items-end justify-between gap-3 p-3" aria-label={t('admin.attributes.draftWorkspace')}>
        <Filter label={t('admin.attributes.currentDraft')} className="min-w-[15rem] flex-1 md:max-w-md">
          <ThemeSelect
            value={draftId}
            ariaLabel={t('admin.attributes.currentDraft')}
            options={[
              { value: '', label: t('admin.attributes.runtimeCatalog') },
              ...(overview.data?.drafts || []).filter(item => item.status !== 'published').map(item => ({ value: item.id, label: `${item.title} (r${item.revision})` }))
            ]}
            onValueChange={next => update({ draft: next || null, option: null })}
          />
        </Filter>
        {actor?.role === 'admin' ? <Button type="button" onClick={() => createDraft.mutate()} disabled={createDraft.isPending}>{t('admin.attributes.createDraft')}</Button> : <span className="text-xs text-[var(--theme-warning)]">{t('admin.attributes.supportMode')}</span>}
      </Surface>

      <Surface className="mb-3 grid gap-3 p-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_0.8fr_0.8fr_1.35fr]" aria-label={t('admin.attributes.attributeContext')}>
        <Filter label={t('admin.attributes.category')}>
          <ThemeSelect value={effectiveCategory} ariaLabel={t('admin.attributes.category')} options={data.facets.map(item => ({ value: item.category, label: `${humanize(item.category)} (${item.count})` }))} onValueChange={next => update({ category: next, field: null, option: null })} />
        </Filter>
        <Filter label={t('admin.attributes.field')}>
          <ThemeSelect value={effectiveField} ariaLabel={t('admin.attributes.field')} options={(categoryFacet?.fields || []).map(item => ({ value: item.field, label: `${item.field} (${item.count})` }))} onValueChange={next => update({ field: next, option: null })} />
        </Filter>
        <Filter label={t('admin.attributes.status')}>
          <ThemeSelect value={status} ariaLabel={t('admin.attributes.status')} options={[
            { value: '', label: t('admin.attributes.allStatuses') },
            { value: 'enabled', label: t('admin.attributes.enabled') },
            { value: 'disabled', label: t('admin.attributes.disabled') }
          ]} onValueChange={next => update({ status: next || null, option: null })} />
        </Filter>
        <Filter label={t('admin.attributes.attributeType')}>
          <ThemeSelect value={presentationKind} ariaLabel={t('admin.attributes.attributeType')} options={[
            { value: '', label: t('admin.attributes.allAttributeTypes') },
            { value: 'visual', label: t('admin.attributes.visualCharacterAttribute') },
            { value: 'text', label: t('admin.attributes.textAttribute') }
          ]} onValueChange={next => update({ type: next || null, option: null })} />
        </Filter>
        <form className="flex min-w-0 items-end gap-2" onSubmit={submitSearch}>
          <input
            aria-label={t('admin.attributes.search')}
            value={searchDraft}
            onChange={event => setSearchDraft(event.target.value)}
            placeholder={t('admin.attributes.search')}
            className="h-10 min-w-0 flex-1 rounded-[var(--mpf-radius-sm)] border border-[var(--mpf-border-strong)] bg-[var(--theme-background)] px-3 text-sm text-[var(--mpf-text)] outline-none placeholder:text-[var(--mpf-text-muted)] focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-focus-ring)]"
          />
          <Button size="icon" type="submit" title={t('admin.attributes.searchAction')} aria-label={t('admin.attributes.searchAction')}>
            <Search className="size-4" aria-hidden="true" />
          </Button>
        </form>
      </Surface>

      <section className="grid min-h-[690px] min-w-0 gap-3 xl:grid-cols-[minmax(13rem,0.7fr)_minmax(30rem,1.8fr)_minmax(16rem,0.85fr)]">
        <Surface className="min-w-0 overflow-hidden">
          <div className="flex min-h-14 items-center justify-between gap-2 border-b border-[var(--mpf-border)] px-3">
            <h2 className="m-0 truncate text-sm">{effectiveField || t('admin.attributes.catalog')}</h2>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-[var(--mpf-border-strong)] px-2 py-1 text-[0.65rem] text-[var(--mpf-text-muted)]">{data.total}</span>
              {actor?.role === 'admin' && activeDraft ? <Button size="icon" className="size-9 min-h-9" title={t('admin.attributes.newAttribute')} aria-label={t('admin.attributes.newAttribute')} onClick={() => setCreatingOption(true)}><Plus className="size-4" /></Button> : null}
            </div>
          </div>
          <div className="max-h-[635px] overflow-y-auto">
            {data.items.map(item => (
              <button
                key={item.id}
                type="button"
                className={`grid w-full grid-cols-[3rem_minmax(0,1fr)] gap-2 border-0 border-b border-[var(--mpf-border)] bg-transparent p-2 text-left hover:bg-[var(--theme-hover)] ${selected?.id === item.id ? 'shadow-[inset_3px_0_var(--theme-primary)] [background:var(--theme-hover)]' : ''}`}
                onClick={() => { setCreatingOption(false); update({ option: item.id }); }}
              >
                <OptionThumb option={item} manifests={manifests.data} />
                <span className="min-w-0">
                  <strong className="block truncate text-xs">{labelOf(item)}</strong>
                  <small className="block truncate text-[0.68rem] text-[var(--mpf-text-muted)]">{item.id}</small>
                  <span className="mt-1 inline-flex rounded-full border border-[var(--mpf-border-strong)] px-1.5 py-0.5 text-[0.58rem] text-[var(--mpf-text-muted)]">
                    {t(item.presentationKind === 'visual' ? 'admin.attributes.visualCharacterAttribute' : 'admin.attributes.textAttribute')}
                  </span>
                </span>
              </button>
            ))}
            {!data.items.length ? <p className="p-6 text-center text-xs text-[var(--mpf-text-muted)]">{t('admin.attributes.noOptions')}</p> : null}
          </div>
        </Surface>

        <Surface className="min-w-0 overflow-hidden">
          {selected ? (
            <>
              <div className="flex min-h-16 items-start justify-between gap-3 px-4 pt-4">
                <div className="min-w-0"><h2 className="m-0 truncate text-lg">{labelOf(selected)}</h2><p className="m-0 truncate text-xs text-[var(--mpf-text-muted)]">{selected.id}</p></div>
                <span className="rounded-full border border-[var(--mpf-border-strong)] px-2 py-1 text-[0.65rem] text-[var(--mpf-text-muted)]">{selected.enabled ? t('admin.attributes.enabled') : t('admin.attributes.disabled')}</span>
              </div>
              <div className="flex gap-1 overflow-x-auto border-b border-[var(--mpf-border)] px-4" role="tablist" aria-label={t('admin.attributes.workspaceTabs')}>
                <WorkspaceTabButton active={effectiveTab === 'definition'} icon={<FileText />} onClick={() => update({ tab: 'definition' })}>{t('admin.attributes.definition')}</WorkspaceTabButton>
                {selected.presentationKind === 'visual' ? <WorkspaceTabButton active={effectiveTab === 'visual'} icon={<ImagePlus />} onClick={() => update({ tab: 'visual' })}>{t('admin.attributes.visualProduction')}</WorkspaceTabButton> : null}
                <WorkspaceTabButton active={effectiveTab === 'test'} icon={<FlaskConical />} onClick={() => update({ tab: 'test' })}>{t('admin.attributes.focusedTest')}</WorkspaceTabButton>
                <WorkspaceTabButton active={effectiveTab === 'history'} icon={<History />} onClick={() => update({ tab: 'history' })}>{t('admin.attributes.history')}</WorkspaceTabButton>
              </div>
              <div className="p-4">
                {effectiveTab === 'definition' ? <AttributeDefinitionEditor
                  key={`${selected.id || 'new'}:${activeDraft?.revision || 0}`}
                  option={selected}
                  canEdit={actor?.role === 'admin' && Boolean(activeDraft)}
                  readOnlyMessage={actor?.role === 'support'
                    ? t('admin.attributes.supportReadOnlyHelp')
                    : t('admin.attributes.selectDraftToEdit')}
                  isSaving={saveOption.isPending}
                  error={saveOption.error?.message}
                  onSave={values => saveOption.mutate({ option: selected, values })}
                /> : null}
                {effectiveTab === 'visual' ? <VisualProductionPreview visual={visual} /> : null}
                {effectiveTab === 'test' ? <PlaceholderPanel icon={<FlaskConical />} title={t('admin.attributes.focusedTest')} description={t('admin.attributes.focusedTestPreview')} /> : null}
                {effectiveTab === 'history' ? <PlaceholderPanel icon={<History />} title={t('admin.attributes.history')} description={t('admin.attributes.historyPreview')} /> : null}
              </div>
            </>
          ) : <div className="grid min-h-[32rem] place-items-center p-8 text-center text-sm text-[var(--mpf-text-muted)]">{t('admin.attributes.selectOption')}</div>}
        </Surface>

        <Surface className="min-w-0 overflow-hidden">
          <div className="flex min-h-14 items-center justify-between gap-2 border-b border-[var(--mpf-border)] px-3"><h2 className="m-0 text-sm">{t('admin.attributes.readiness')}</h2><CircleDashed className="size-4 text-[var(--theme-warning)]" aria-hidden="true" /></div>
          <div className="p-3">
            <CustomerPreview option={selected} visual={visual} />
            {selected ? <ul className="m-0 mt-4 list-none p-0 text-xs">
              <Readiness label={t('admin.attributes.definition')} ready={Boolean(labelOf(selected) && promptOf(selected))} />
              <Readiness label={t('admin.attributes.currentApprovedVisual')} ready={selected.presentationKind === 'text' || Boolean(visual)} optional={selected.presentationKind === 'text'} />
              <Readiness label={t('admin.attributes.focusedTest')} ready={false} />
            </ul> : null}
          </div>
        </Surface>
      </section>
      </>}
    </main>
  );
}

function Filter({ label, className = '', children }: { label: string; className?: string; children: React.ReactNode }) {
  return <label className={`min-w-0 text-xs font-semibold ${className}`}><span className="mb-1 block text-[var(--mpf-text-muted)]">{label}</span>{children}</label>;
}

function WorkspaceTabButton({ active, icon, onClick, children }: { active: boolean; icon: React.ReactElement; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" role="tab" aria-selected={active} className={`inline-flex min-h-10 shrink-0 items-center gap-2 border-0 border-b-2 bg-transparent px-3 text-xs ${active ? 'border-[var(--theme-primary)] text-[var(--mpf-text)]' : 'border-transparent text-[var(--mpf-text-muted)]'}`} onClick={onClick}>{icon}{children}</button>;
}

function workspaceTabClass(active: boolean) {
  return `shrink-0 border-0 border-b-2 bg-transparent px-4 py-3 text-sm ${active
    ? 'border-[var(--theme-primary)] text-[var(--mpf-text)]'
    : 'border-transparent text-[var(--mpf-text-muted)] hover:text-[var(--mpf-text)]'}`;
}

function VisualProductionPreview({ visual }: { visual: ResolvedAdminVisual | null }) {
  const { t } = useTranslation('admin');
  return <div>
    <div className="grid gap-4 border-b border-[var(--mpf-border)] pb-4 md:grid-cols-[minmax(10rem,0.7fr)_1.3fr]">
      <PreviewMedia visual={visual} className="min-h-56" />
      <div><h3 className="mt-0 text-sm">{t('admin.attributes.currentApprovedVisual')}</h3><p className="text-sm text-[var(--mpf-text-muted)]">{visual ? t('admin.attributes.approvedVisualHelp') : t('admin.attributes.missingVisualHelp')}</p></div>
    </div>
    <div className="mt-4 flex flex-wrap gap-2"><Button icon={<WandSparkles className="size-4" />} disabled>{t('admin.attributes.generateCandidates')}</Button><Button icon={<Upload className="size-4" />} disabled>{t('admin.attributes.uploadImage')}</Button></div>
  </div>;
}

function PlaceholderPanel({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return <div className="grid min-h-72 place-items-center text-center"><div><span className="mx-auto mb-3 block w-fit text-[var(--theme-primary)]">{icon}</span><strong>{title}</strong><p className="mt-2 max-w-md text-sm text-[var(--mpf-text-muted)]">{description}</p></div></div>;
}

function CustomerPreview({ option, visual }: { option: AttributeCatalogOption | null; visual: ResolvedAdminVisual | null }) {
  const { t } = useTranslation('admin');
  if (!option) return <div className="grid aspect-square place-items-center border border-dashed border-[var(--mpf-border)] text-xs text-[var(--mpf-text-muted)]">{t('admin.attributes.selectOption')}</div>;
  return <div className="border border-[var(--mpf-border)] bg-[var(--theme-background)] p-2 text-center"><PreviewMedia visual={visual} className="aspect-square" /><strong className="mt-2 block text-xs">{labelOf(option)}</strong><small className="text-[var(--mpf-text-muted)]">{t('admin.attributes.customerPreview')}</small></div>;
}

function OptionThumb({ option, manifests }: { option: AttributeCatalogOption; manifests?: Awaited<ReturnType<typeof loadStudioVisualManifests>> }) {
  const visual = buildVisualPreview([option], option, manifests);
  return <PreviewMedia visual={visual} className="h-12 w-12" />;
}

function PreviewMedia({ visual, className }: { visual: ResolvedAdminVisual | null; className: string }) {
  if (!visual) return <span className={`grid place-items-center border border-[var(--mpf-border)] bg-[var(--theme-background)] text-[var(--mpf-text-muted)] ${className}`}><ImagePlus className="size-5" aria-hidden="true" /></span>;
  if (visual.colors?.length) return <span className={`flex overflow-hidden border border-[var(--mpf-border)] ${className}`}>{visual.colors.map(color => <span key={color} className="h-full flex-1" style={{ backgroundColor: color }} />)}</span>;
  if (visual.renderMode === 'mask') return <span className={`grid min-h-0 min-w-0 place-items-center overflow-hidden border border-[var(--mpf-border)] bg-[var(--theme-background)] ${className}`}><span className="visual-option-icon visual-option-icon--fluid max-h-full max-w-full shrink-0" aria-hidden="true" style={{ '--visual-option-url': `url("${visual.imageUrl}")` } as CSSProperties} /></span>;
  return <span className={`block overflow-hidden border border-[var(--mpf-border)] bg-[var(--theme-background)] ${className}`}><img className="h-full w-full object-contain" src={visual.imageUrl} alt={visual.alt || ''} style={{ objectPosition: visual.focalPoint || '50% 50%' }} /></span>;
}

function Readiness({ label, ready, optional = false }: { label: string; ready: boolean; optional?: boolean }) {
  const { t } = useTranslation('admin');
  return <li className="flex items-center justify-between gap-2 border-b border-[var(--mpf-border)] py-2"><span>{label}</span><strong className={ready ? 'text-[var(--theme-success)]' : 'text-[var(--theme-warning)]'}>{optional ? t('admin.attributes.notRequired') : t(ready ? 'admin.attributes.ready' : 'admin.attributes.required')}</strong></li>;
}

type ResolvedAdminVisual = {
  imageUrl?: string;
  colors?: string[];
  focalPoint?: string;
  alt?: string;
  renderMode: 'image' | 'mask';
};

function buildVisualPreview(items: AttributeCatalogOption[], selected: AttributeCatalogOption | null, manifests?: Awaited<ReturnType<typeof loadStudioVisualManifests>>): ResolvedAdminVisual | null {
  if (!selected || selected.presentationKind !== 'visual' || !manifests) return null;
  const field: AttributeField = {
    group: selected.ui?.group || humanize(selected.category),
    name: selected.subcategory,
    control: selected.ui?.control || 'select',
    options: items.map(toAttributeOption)
  };
  const presentation = resolveVisualPresentation({ field, manifests });
  const item = presentation?.items.find(candidate => candidate.option.id === selected.id);
  if (item) return {
    imageUrl: item.imageUrl,
    colors: item.colors,
    focalPoint: item.focalPoint,
    alt: item.alt?.en,
    renderMode: item.renderMode
  };

  // Admin has no active Gender selection. Resolve an exact stable ID directly
  // from the same Studio manifests so neutral and gender-variant catalogs can
  // still preview their approved asset without introducing a second registry.
  const manifestItem = Object.values(manifests)
    .flatMap(manifest => manifest.items.map(candidate => ({ candidate, manifest })))
    .find(({ candidate }) => candidate.optionId === selected.id || candidate.attributeId === selected.id);
  if (!manifestItem) return null;
  const imageUrl = manifestItem.candidate.assets.preview
    || manifestItem.candidate.assets.thumb
    || manifestItem.candidate.assets.master;
  if (!imageUrl || !isSafeVisualAssetUrl(imageUrl)) return null;
  return {
    imageUrl,
    colors: manifestItem.candidate.swatch?.colors,
    focalPoint: manifestItem.candidate.focalPoint,
    alt: manifestItem.candidate.alt?.en,
    renderMode: manifestItem.candidate.recolorMode === 'mask'
      || manifestItem.manifest.recolorMode === 'mask'
      ? 'mask'
      : 'image'
  };
}

function toAttributeOption(option: AttributeCatalogOption): AttributeOption {
  return {
    id: option.id,
    category: option.category,
    subcategory: option.subcategory,
    label: option.label,
    group: option.ui?.group || humanize(option.category),
    prompt: promptOf(option),
    tags: option.tags
  };
}

function labelOf(option: AttributeCatalogOption) {
  return localized(option.label);
}

function promptOf(option: AttributeCatalogOption) {
  if (typeof option.prompt === 'string') return option.prompt;
  const prompt = option.prompt || {};
  return String(prompt.default || prompt['gpt-image'] || '');
}

function normalizeStatus(value: string | null): '' | 'enabled' | 'disabled' {
  return value === 'enabled' || value === 'disabled' ? value : '';
}

function normalizePresentationKind(value: string | null): '' | 'visual' | 'text' {
  return value === 'visual' || value === 'text' ? value : '';
}

function createNewOption(category: string, subcategory: string, presentationKind: 'visual' | 'text'): AttributeCatalogOption {
  return {
    id: '',
    category,
    subcategory,
    label: { en: '' },
    prompt: { default: '' },
    tags: [],
    enabled: true,
    presentationKind
  };
}

function humanize(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, character => character.toUpperCase());
}

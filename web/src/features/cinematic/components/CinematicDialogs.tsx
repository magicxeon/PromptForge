import * as Dialog from '@radix-ui/react-dialog';
import { ArrowDown, ArrowUp, Check, ChevronLeft, ChevronRight, Clock3, Plus, Search, Sparkles, Trash2, UserRound, WandSparkles } from 'lucide-react';
import { ProcessingSpinner } from '../../../components/ui/ProcessingSpinner';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { AuthenticatedMediaImage } from '../../../components/media/AuthenticatedMediaImage';
import { GenerationStageState } from '../../../components/generation/GenerationStageState';
import { ContextualOperationDock } from './ContextualOperationDock';
import { DialogHeader } from './ProjectCostSummary';
import { isSimpleSceneReady } from './sceneDirectorSimpleContract';
import { CinematicAuthoringModeHeader } from './authoring/CinematicAuthoringModeHeader';
import { CinematicReadinessSummary } from './authoring/CinematicReadinessSummary';
import { SceneCastLookSelector, readAssignmentLooks } from './authoring/SceneCastLookSelector';
import { isCinematicFieldVisible } from './authoring/cinematicFieldProjection';
import { ShotSequenceEditor } from './authoring/ShotSequenceEditor';
import { hasInvalidCues } from './authoring/DialogueSoundEditor';
import { listCharacters, listOwnedCharacters } from '../../profiles/api/profileApi';
import type { z } from 'zod';
import { characterSummarySchema } from '../../profiles/schemas/profileSchemas';
import { enhanceCinematicStory } from '../api/cinematicApi';
import type {
  CinematicAuthoringManifest, CinematicCastAssignment, CinematicScene, CinematicSceneDirectionProposal, CinematicSetupDraft, CinematicStoryBeat,
  CinematicStoryEnhancement, CinematicStoryPlanLiveProgress, CinematicStoryPlanProposal
} from '../schemas/cinematicSchemas';

type OpenDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function BeatDetailsDialog({
  open, onOpenChange, beat, scenes, onSave, onAddScene, onEditScene,
  onMoveScene, onRemoveScene, canRemoveScene
}: OpenDialogProps & {
  beat: CinematicStoryBeat | null;
  scenes: CinematicScene[];
  onSave: (beat: CinematicStoryBeat) => void;
  onAddScene: (beatId: string) => void;
  onEditScene: (sceneId: string) => void;
  onMoveScene: (sceneId: string, direction: 'earlier' | 'later') => void;
  onRemoveScene: (sceneId: string) => void;
  canRemoveScene: boolean;
}) {
  const { t } = useTranslation('cinematic');
  const [draft, setDraft] = useState<CinematicStoryBeat | null>(beat);
  useEffect(() => {
    if (open) setDraft(beat ? structuredClone(beat) : null);
  }, [beat?.id, open]);
  const update = (field: keyof CinematicStoryBeat, value: string) => {
    setDraft(current => current ? { ...current, [field]: value } : current);
  };
  if (!beat || !draft) return null;
  return <Dialog.Root open={open} onOpenChange={onOpenChange}><Dialog.Portal>
    <Dialog.Overlay className="cinematic-dialog__overlay" />
    <Dialog.Content className="cinematic-dialog__content cinematic-dialog__content--wide cinematic-authoring-dialog">
      <DialogHeader title={t('cinematic.beatDialog.title')} description={t('cinematic.beatDialog.description')} />
      <div className="cinematic-director-context">
        <span><Clock3 aria-hidden="true" />{draft.targetDurationMs > 0 ? t('cinematic.beatDialog.duration', { seconds: (draft.targetDurationMs / 1000).toFixed(1) }) : t('cinematic.story.durationRequired')}</span>
        <span>{t('cinematic.beatDialog.sceneCount', { count: scenes.length })}</span>
      </div>
      <div className="cinematic-director-grid">
        <label><span>{t('cinematic.beatDialog.type')}</span><select value={draft.type} onChange={event => update('type', event.target.value)}>
          {['opening', 'inciting_change', 'development', 'decision', 'climax', 'resolution'].map(value => <option key={value} value={value}>{t(`cinematic.beatType.${value}`)}</option>)}
        </select></label>
        <label><span>{t('cinematic.beatDialog.name')}</span><input value={draft.title} onChange={event => update('title', event.target.value)} /></label>
        <label className="cinematic-director-grid__wide"><span>{t('cinematic.beatDialog.purpose')}</span><textarea rows={3} value={draft.purpose} onChange={event => update('purpose', event.target.value)} /></label>
        <label className="cinematic-director-grid__wide"><span>{t('cinematic.beatDialog.change')}</span><textarea rows={3} value={draft.storyChange} onChange={event => update('storyChange', event.target.value)} /></label>
        <label><span>{t('cinematic.beatDialog.cause')}</span><textarea rows={2} value={draft.cause || ''} onChange={event => update('cause', event.target.value)} /></label>
        <label><span>{t('cinematic.beatDialog.consequence')}</span><textarea rows={2} value={draft.consequence || ''} onChange={event => update('consequence', event.target.value)} /></label>
        <label><span>{t('cinematic.beatDialog.emotionalStart')}</span><textarea rows={2} value={draft.emotionalStart} onChange={event => update('emotionalStart', event.target.value)} /></label>
        <label><span>{t('cinematic.beatDialog.emotionalTurn')}</span><textarea rows={2} value={draft.emotionalTurn || ''} onChange={event => update('emotionalTurn', event.target.value)} /></label>
        <label><span>{t('cinematic.beatDialog.emotionalEnd')}</span><textarea rows={2} value={draft.emotionalEnd} onChange={event => update('emotionalEnd', event.target.value)} /></label>
      </div>
      <section className="cinematic-beat-dialog-scenes">
        <header><div><h3>{t('cinematic.beatDialog.scenes')}</h3><p>{t('cinematic.beatDialog.scenesHint')}</p></div><Button size="sm" icon={<Plus aria-hidden="true" />} onClick={() => onAddScene(beat.id)}>{t('cinematic.beatDialog.addScene')}</Button></header>
        {scenes.length ? <ol>{scenes.map((scene, index) => <li key={scene.id}>
          <strong>{index + 1}</strong><button type="button" onClick={() => onEditScene(scene.id)}><span>{scene.title}</span><small>{scene.shots.length} {t('cinematic.storyboard.shots')} · {(scene.durationMs / 1000).toFixed(1)}s</small></button>
          <div>
            <Button size="sm" variant="ghost" icon={<ArrowUp aria-hidden="true" />} aria-label={t('cinematic.beatDialog.moveSceneEarlier', { name: scene.title })} disabled={index === 0} onClick={() => onMoveScene(scene.id, 'earlier')} />
            <Button size="sm" variant="ghost" icon={<ArrowDown aria-hidden="true" />} aria-label={t('cinematic.beatDialog.moveSceneLater', { name: scene.title })} disabled={index === scenes.length - 1} onClick={() => onMoveScene(scene.id, 'later')} />
            <ConfirmDialog trigger={<Button size="sm" variant="ghost" icon={<Trash2 aria-hidden="true" />} aria-label={t('cinematic.beatDialog.removeScene', { name: scene.title })} disabled={!canRemoveScene} />} title={t('cinematic.beatDialog.removeSceneTitle')} description={t('cinematic.beatDialog.removeSceneDescription', { name: scene.title })} confirmLabel={t('cinematic.beatDialog.removeSceneConfirm')} destructive onConfirm={() => onRemoveScene(scene.id)} />
          </div>
        </li>)}</ol> : <div className="cinematic-beat-dialog-scenes__empty" role="status"><strong>{t('cinematic.beatDialog.sceneRequired')}</strong><span>{t('cinematic.beatDialog.sceneRequiredHint')}</span></div>}
      </section>
      <div className="cinematic-dialog__footer"><Dialog.Close asChild><Button>{t('cinematic.actions.close')}</Button></Dialog.Close><Button variant="primary" icon={<Check aria-hidden="true" />} disabled={!draft.title.trim()} onClick={() => onSave(draft)}>{t('cinematic.beatDialog.save')}</Button></div>
    </Dialog.Content>
  </Dialog.Portal></Dialog.Root>;
}

export function StoryEnhanceDialog({ open, onOpenChange, draft, purpose = 'story', onApply }: OpenDialogProps & {
  draft: CinematicSetupDraft;
  purpose?: 'story' | 'roles';
  onApply: (enhancement: CinematicStoryEnhancement) => void;
}) {
  const { t } = useTranslation('cinematic');
  const [result, setResult] = useState<CinematicStoryEnhancement | null>(null);
  const [editedBrief, setEditedBrief] = useState('');
  const [editedDirection, setEditedDirection] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = useRef(0);
  const rolesOnly = purpose === 'roles';
  const sourceKey = JSON.stringify(draft);
  useEffect(() => {
    request.current++;
    setResult(null);
    setEditedBrief('');
    setEditedDirection('');
    setError(null);
    setLoading(false);
    return () => { request.current++; };
  }, [open, sourceKey, purpose]);

  async function generate() {
    if (loading) return;
    const current = ++request.current;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const enhancement = await enhanceCinematicStory(draft, purpose);
      if (request.current !== current) return;
      if ((enhancement.purpose && enhancement.purpose !== purpose) || (rolesOnly && !enhancement.recommendedRoles.length)) throw new Error(t('cinematic.enhance.failed'));
      setResult(enhancement);
      setEditedBrief(enhancement.enhancedStoryBrief);
      setEditedDirection(enhancement.creativeDirection);
    } catch (reason) {
      if (request.current === current) setError(reason instanceof Error ? reason.message : t('cinematic.enhance.failed'));
    } finally {
      if (request.current === current) setLoading(false);
    }
  }

  const canApply = Boolean(result && !loading && (rolesOnly ? result.recommendedRoles.length : editedBrief.trim()));
  function apply() {
    if (!result || !canApply) return;
    onApply(rolesOnly ? result : { ...result, enhancedStoryBrief: editedBrief.trim(), creativeDirection: editedDirection.trim() });
    onOpenChange(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="cinematic-dialog__overlay" />
        <Dialog.Content className="cinematic-dialog__content cinematic-dialog__content--wide">
          <DialogHeader title={t(purpose === 'roles' ? 'cinematic.enhance.roleTitle' : 'cinematic.enhance.title')} description={t(purpose === 'roles' ? 'cinematic.enhance.roleDescription' : 'cinematic.enhance.description')} />
          <dl className="cinematic-operation-intent">
            {[
              ['cinematic.setup.storyCountryStyle', t(`cinematic.countryStyle.${draft.storyCountryStyle ?? 'none'}`)],
              ['cinematic.setup.genre', (draft.genres || [draft.genre]).map(id => t(`cinematic.genre.${id}`)).join(' + ')],
              ['cinematic.setup.feeling', (draft.audienceFeelings || [draft.audienceFeeling]).map(id => t(`cinematic.feeling.${id}`)).join(' > ')],
              ['cinematic.setup.pacing', (draft.pacingTraits || [draft.pacing]).map(id => t(`cinematic.pacing.${id}`)).join(' + ')]
            ].map(([label, value]) => <div key={label}><dt>{t(label!)}</dt><dd>{value}</dd></div>)}
          </dl>
          {rolesOnly ? <>
            <details className="cinematic-role-analysis-source"><summary>{t('cinematic.roles.source')}</summary><p>{draft.storyBrief}</p></details>
            <section className="cinematic-role-analysis" aria-label={t('cinematic.enhance.recommendedCast')}>
              <h3>{t('cinematic.enhance.recommendedCast')}{result ? ` (${result.recommendedRoles.length})` : ''}</h3>
              {result ? result.recommendedRoles.map(role => <article key={role.id}>
                <header><h4>{role.label}</h4><span>{t(`cinematic.roleImportance.${role.importance}`)}</span></header>
                <dl>{[
                  ['cinematic.setup.storyFunction', role.storyFunction], ['cinematic.setup.roleObjective', role.objective],
                  ['cinematic.setup.relationshipHint', role.relationshipHint], ['cinematic.setup.roleEmotionalArc', role.emotionalArc],
                  ['cinematic.setup.roleTraits', role.personalityTraits?.join(', ')], ['cinematic.setup.rolePerformance', role.performanceDirection]
                ].filter(([, value]) => value).map(([label, value]) => <div key={label}><dt>{t(label!)}</dt><dd>{value}</dd></div>)}</dl>
              </article>) : <p>{t('cinematic.roles.empty')}</p>}
            </section>
          </> : <div className="cinematic-compare-grid">
            <article><span>{t('cinematic.enhance.original')}</span><p>{draft.storyBrief}</p></article>
            <article className="is-enhanced"><span>{t('cinematic.enhance.preview')}</span>{result
              ? <textarea aria-label={t('cinematic.enhance.preview')} maxLength={600} rows={7} value={editedBrief} onChange={event => setEditedBrief(event.target.value)} />
              : <p>{t('cinematic.enhance.previewEmpty')}</p>}</article>
          </div>}
          {result && !rolesOnly ? <section className="cinematic-enhancement-details">
            <div><strong>{t('cinematic.enhance.conflict')}</strong><p>{result.conflict}</p></div>
            <div><strong>{t('cinematic.enhance.arc')}</strong><p>{result.emotionalArc}</p></div>
            <label className="is-wide"><strong>{t('cinematic.setup.creativeDirection')}</strong><textarea rows={3} maxLength={800} value={editedDirection} onChange={event => setEditedDirection(event.target.value)} /></label>
          </section> : null}
          <p className="cinematic-operation-apply-note">{t(rolesOnly ? 'cinematic.roles.applyNote' : 'cinematic.enhance.rolesPreserved')}</p>
          {result?.warnings.length ? <ul className="cinematic-operation-warnings">{result.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul> : null}
          {error ? <p role="alert" className="text-sm text-red-400">{error}</p> : null}
          <ContextualOperationDock
            title={t(rolesOnly ? 'cinematic.roles.operationTitle' : 'cinematic.enhance.operationTitle')}
            description={t(rolesOnly ? 'cinematic.roles.operationDescription' : 'cinematic.enhance.operationDescription')}
            operation={t('cinematic.enhance.operation')}
            notice={t('cinematic.enhance.qualificationNotice')}
            actionLabel={t(rolesOnly ? 'cinematic.roles.generate' : 'cinematic.enhance.generateStory')}
            actionIcon={<Sparkles aria-hidden="true" />}
            disabled={!draft.storyBrief.trim() || loading}
            loading={loading}
            onAction={() => void generate()}
          />
          <div className="cinematic-dialog__footer">
            <Dialog.Close asChild><Button>{t('cinematic.actions.cancel')}</Button></Dialog.Close>
            <Button variant="primary" disabled={!canApply} icon={<Check aria-hidden="true" />} onClick={apply}>{t(rolesOnly ? 'cinematic.roles.apply' : 'cinematic.enhance.applyStory')}</Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export type CharacterCandidate = z.infer<typeof characterSummarySchema> & { scope?: 'mine' | 'community' };
type CharacterCandidatePage = {
  items: CharacterCandidate[];
  ownedCursor: string | null;
  communityCursor: string | null;
  hasMore: boolean;
};

export function CharacterPickerDialog({ open, onOpenChange, onSelect, onChooseGenerated }: OpenDialogProps & {
  onSelect?: (character: CharacterCandidate) => void | Promise<void>; onChooseGenerated?: () => void;
}) {
  const { t } = useTranslation('cinematic');
  const [query, setQuery] = useState('');
  const [gender, setGender] = useState('all');
  const [age, setAge] = useState('all');
  const [ethnicity, setEthnicity] = useState('all');
  const [scope, setScope] = useState('all');
  const [selected, setSelected] = useState<CharacterCandidate | null>(null);
  const [pages, setPages] = useState<CharacterCandidatePage[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setSelected(null);
    setPages([]);
    setPageIndex(0);
    setLoadError(false);
    setSubmitError(null);
    setSubmitting(false);
    setLoading(true);
    loadCharacterCandidatePage(null, null)
      .then(page => {
        if (cancelled) return;
        setPages([page]);
      })
      .catch(() => { if (!cancelled) setLoadError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open]);
  const activePage = pages[pageIndex] || emptyCharacterPage();
  const ethnicityOptions = useMemo(() => [...new Set(activePage.items
    .map(item => item.identityFacets?.ethnicity)
    .filter((value): value is string => Boolean(value)))]
    .sort((left, right) => left.localeCompare(right)), [activePage.items]);
  const candidates = useMemo(() => activePage.items.filter(item => {
    const facets = item.identityFacets;
    return item.displayName.toLowerCase().includes(query.toLowerCase())
    && (gender === 'all' || facets?.presentationGender === gender)
    && (age === 'all' || overlapsAgeBucket(facets?.ageRange, age))
    && (ethnicity === 'all' || facets?.ethnicity === ethnicity)
    && (scope === 'all' || item.scope === scope)
  }), [activePage.items, age, ethnicity, gender, query, scope]);

  async function showNextPage() {
    if (pages[pageIndex + 1]) {
      setPageIndex(index => index + 1);
      return;
    }
    if (!activePage.hasMore || loading) return;
    setLoading(true);
    setLoadError(false);
    try {
      const page = await loadCharacterCandidatePage(activePage.ownedCursor, activePage.communityCursor);
      setPages(current => [...current, page]);
      setPageIndex(index => index + 1);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  async function confirmSelection() {
    if (!selected || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await onSelect?.(selected);
      onOpenChange(false);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : t('cinematic.status.saveFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="cinematic-dialog__overlay" />
        <Dialog.Content className="cinematic-dialog__content cinematic-dialog__content--wide cinematic-dialog__character-picker-shell">
          <div className="cinematic-dialog__character-picker-header">
            <DialogHeader title={t('cinematic.picker.title')} description={t('cinematic.picker.description')} />
            {onChooseGenerated ? <div className="cinematic-character-tabs" aria-label={t('cinematic.castSource.source')}>
              <button type="button" className="is-active" aria-pressed="true">{t('cinematic.castSource.character')}</button>
              <button type="button" disabled={submitting} aria-pressed="false" onClick={onChooseGenerated}>{t('cinematic.castSource.sheet')}</button>
            </div> : null}
          <div className="cinematic-picker-filters">
            <label className="cinematic-search-field"><Search aria-hidden="true" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder={t('cinematic.picker.search')} /></label>
            <select aria-label={t('cinematic.picker.gender')} value={gender} onChange={event => setGender(event.target.value)}>
              <option value="all">{t('cinematic.picker.allGenders')}</option><option value="female">{t('cinematic.picker.female')}</option><option value="male">{t('cinematic.picker.male')}</option>
            </select>
            <select aria-label={t('cinematic.picker.age')} value={age} onChange={event => setAge(event.target.value)}><option value="all">{t('cinematic.picker.allAges')}</option><option value="18-19">18-19</option><option value="20-29">20-29</option><option value="30-39">30-39</option><option value="40-49">40-49</option><option value="50-120">50+</option></select>
            <select aria-label={t('cinematic.picker.ethnicity')} value={ethnicity} onChange={event => setEthnicity(event.target.value)}><option value="all">{t('cinematic.picker.allEthnicities')}</option>{ethnicityOptions.map(value => <option value={value} key={value}>{formatFacetLabel(value)}</option>)}</select>
            <select aria-label={t('cinematic.picker.scope')} value={scope} onChange={event => setScope(event.target.value)}><option value="all">{t('cinematic.picker.allSources')}</option><option value="mine">{t('cinematic.picker.mine')}</option><option value="community">{t('cinematic.picker.community')}</option></select>
          </div>
          </div>
          <div className="cinematic-dialog__character-picker-body">
          {loading && !pages.length ? <p className="cinematic-picker-state" role="status">{t('cinematic.picker.loading')}</p> : null}
          {loadError ? <p className="cinematic-picker-state" role="alert">{t('cinematic.picker.loadFailed')}</p> : null}
          {!loading && !loadError && candidates.length === 0 ? <p className="cinematic-picker-state">{t('cinematic.picker.empty')}</p> : null}
          <div className="cinematic-character-results" role="listbox" aria-label={t('cinematic.picker.results')}>
            {candidates.map(item => {
              const mediaUrl = characterCandidateMediaUrl(item);
              const fallback = <span className="cinematic-character-results__fallback"><UserRound aria-hidden="true" /></span>;
              const isSelected = selected?.id === item.id;
              return <button type="button" role="option" aria-selected={isSelected} className={isSelected ? 'is-selected' : ''} key={item.id} onClick={() => setSelected(item)}><span className="cinematic-character-results__media">{mediaUrl ? <AuthenticatedMediaImage src={mediaUrl} alt="" fallback={fallback} /> : fallback}{isSelected ? <span className="cinematic-character-results__check"><Check aria-hidden="true" /></span> : null}</span><strong>{item.displayName}</strong><small>{item.personalitySummary}</small></button>;
            })}
          </div>
          </div>
          <div className="cinematic-dialog__footer cinematic-dialog__character-picker-footer">
            <div className="cinematic-picker-pagination" aria-label={t('cinematic.picker.pagination')}>
              <Button size="sm" icon={<ChevronLeft aria-hidden="true" />} disabled={pageIndex === 0 || loading} onClick={() => setPageIndex(index => Math.max(0, index - 1))}>{t('cinematic.picker.previous')}</Button>
              <span>{t('cinematic.picker.page', { page: pageIndex + 1 })}</span>
              <Button size="sm" icon={<ChevronRight aria-hidden="true" />} disabled={(!activePage.hasMore && !pages[pageIndex + 1]) || loading} onClick={() => void showNextPage()}>{t('cinematic.picker.next')}</Button>
            </div>
            <div className="cinematic-character-picker-submit">
              {submitError ? <p role="alert">{submitError}</p> : null}
              <div><Dialog.Close asChild><Button type="button" disabled={submitting}>{t('cinematic.actions.close')}</Button></Dialog.Close><Button type="button" variant="primary" disabled={!selected || submitting} onClick={() => void confirmSelection()}>{submitting ? t('cinematic.save.saving') : t('cinematic.picker.use')}</Button></div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function characterCandidateMediaUrl(item: Partial<CharacterCandidate>) {
  return item.faceThumbnailUrl
    || item.displayImageUrl
    || item.thumbnailUrl
    || item.imageUrl
    || null;
}

async function loadCharacterCandidatePage(ownedCursor: string | null, communityCursor: string | null): Promise<CharacterCandidatePage> {
  const [owned, community] = await Promise.all([
    listOwnedCharacters(ownedCursor, { limit: '12' }),
    listCharacters({ reusePolicy: 'public_reusable', limit: '12', ...(communityCursor ? { cursor: communityCursor } : {}) })
  ]);
  const unique = new Map<string, CharacterCandidate>();
  owned.items.filter(isCastReadyCharacter).forEach(item => unique.set(item.id, { ...item, scope: 'mine' }));
  community.items.filter(isCastReadyCharacter).forEach(item => {
    if (!unique.has(item.id)) unique.set(item.id, { ...item, scope: 'community' });
  });
  return {
    items: [...unique.values()],
    ownedCursor: owned.nextCursor || null,
    communityCursor: community.nextCursor || null,
    hasMore: owned.hasMore || community.hasMore
  };
}

function isCastReadyCharacter(item: CharacterCandidate) {
  return item.handoffAvailable && Boolean(item.characterProfileVersionId);
}

function emptyCharacterPage(): CharacterCandidatePage {
  return { items: [], ownedCursor: null, communityCursor: null, hasMore: false };
}

export function overlapsAgeBucket(
  range: { minimum: number | null; maximum: number | null } | null | undefined,
  bucket: string
) {
  if (!range) return false;
  const [bucketMinimum = Number.NaN, bucketMaximum = Number.NaN] = bucket.split('-').map(Number);
  if (!Number.isFinite(bucketMinimum) || !Number.isFinite(bucketMaximum)) return false;
  const minimum = range.minimum ?? range.maximum;
  const maximum = range.maximum ?? range.minimum;
  return minimum != null && maximum != null && minimum <= bucketMaximum && maximum >= bucketMinimum;
}

export function formatFacetLabel(value?: string | null) {
  return String(value || '').replaceAll(/[_-]+/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
}

export function SceneDirectorDialog({
  open, onOpenChange, scene, castAssignments = [], authoringManifest, onSave, onGenerate, generating = false,
  defaultMode = 'simple', onModeChange, isFirstScene = false
}: OpenDialogProps & {
  scene?: CinematicScene | null;
  castAssignments?: CinematicCastAssignment[];
  authoringManifest?: CinematicAuthoringManifest;
  onSave?: (scene: CinematicScene) => void;
  onGenerate?: (sceneId: string, direction: string, sceneDraft: CinematicScene) => void;
  generating?: boolean;
  defaultMode?: 'simple' | 'advanced';
  isFirstScene?: boolean;
  onModeChange?: (mode: 'simple' | 'advanced') => void;
}) {
  const { t } = useTranslation('cinematic');
  const [draft, setDraft] = useState<CinematicScene | null>(scene || null);
  const [direction, setDirection] = useState('');
  const [authoringMode, setAuthoringMode] = useState<'simple' | 'advanced'>(defaultMode);
  useEffect(() => {
    if (open) {
      setDraft(scene ? structuredClone(scene) : null);
      setDirection('');
    }
  }, [open, scene]);
  useEffect(() => {
    if (!open) setAuthoringMode(defaultMode);
  }, [defaultMode, open]);
  const update = (field: keyof CinematicScene, value: string) => {
    setDraft(current => current ? { ...current, [field]: value } : current);
  };
  function updateShot<K extends keyof CinematicScene['shots'][number]>(
    shotId: string,
    field: K,
    value: CinematicScene['shots'][number][K]
  ) {
    setDraft(current => {
      if (!current) return current;
      const shots = current.shots.map(shot => shot.id === shotId ? {
        ...shot, [field]: value,
        ...(['dialogueCues', 'audioCues'].includes(field) ? { audioDirectionVersion: 1 as const } : {}),
        ...(['visibleMoment', 'continuityEntry'].includes(field) ? { openingFrameVersion: 1 as const } : {}),
        ...(field === 'castMode' && value === 'none' ? { castAssignmentIds: [], wardrobeLookIds: [], dialogueCues: (shot.dialogueCues || []).filter(cue => !cue.speakerVisible), performance: '', performanceCue: '', gaze: '' } : {}),
        ...(field === 'castMode' && value === 'inherit' ? { castAssignmentIds: [...current.castAssignmentIds], wardrobeLookIds: [...current.wardrobeLookIds] } : {}),
        ...(field === 'castAssignmentIds' && Array.isArray(value) ? {
          castMode: 'selected' as const,
          wardrobeLookIds: castAssignments.filter(assignment => value.some(id => id === assignment.id))
            .flatMap(assignment => readAssignmentLooks(assignment).filter(look => current.wardrobeLookIds.includes(look.id)).map(look => look.id))
        } : {})
      } : shot);
      return { ...current, shots, durationMs: shots.reduce((total, shot) => total + shot.durationMs, 0) };
    });
  }
  const setShots = (updater: (shots: CinematicScene['shots']) => CinematicScene['shots']) => {
    setDraft(current => {
      if (!current) return current;
      const shots = updater(current.shots).map((shot, index) => ({ ...shot, orderKey: index + 1 }));
      return { ...current, shots, shotOrder: shots.map(shot => shot.id), durationMs: shots.reduce((total, shot) => total + shot.durationMs, 0) };
    });
  };
  const addShot = () => {
    if (!draft) return;
    const id = `manual-shot-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    setShots(shots => [...shots, {
      id, version: 1, orderKey: shots.length + 1,
      title: t('cinematic.story.newShotTitle', { count: shots.length + 1 }), purpose: '', durationMs: 1000,
      coverageRole: shots.length ? 'action' : 'establishing',
      openingFrameVersion: 1, castMode: draft.castMode === 'none' ? 'none' : 'inherit',
      visibleMoment: '', subjectAction: '', emotionalTarget: '', performanceCue: '',
      framing: 'medium shot', cameraAngle: 'eye level', cameraMovement: 'locked camera', lensIntent: '',
      blocking: '', performance: '', gaze: '', lighting: '', environment: '', audioIntent: '', prompt: '',
      castAssignmentIds: [...draft.castAssignmentIds], wardrobeLookIds: [...draft.wardrobeLookIds],
      continuityEntry: '', continuityExit: '', transitionToNext: '', estimatedActionDurationMs: 1000,
      dialogueCues: [], audioCues: [], continuityNotes: [], storyboardStatus: 'draft'
    }]);
  };
  const moveShot = (shotId: string, direction: 'earlier' | 'later') => {
    setShots(shots => {
      const index = shots.findIndex(shot => shot.id === shotId);
      const target = direction === 'earlier' ? index - 1 : index + 1;
      if (index < 0 || target < 0 || target >= shots.length) return shots;
      const next = [...shots];
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
  };
  const removeShot = (shotId: string) => setShots(shots => shots.length > 1 ? shots.filter(shot => shot.id !== shotId) : shots);
  const toggleCastAssignment = (assignmentId: string, selected: boolean) => {
    setDraft(current => {
      if (!current) return current;
      const assignment = castAssignments.find(item => item.id === assignmentId);
      const assignmentLookIds = new Set(readAssignmentLooks(assignment).map(look => look.id));
      const castAssignmentIds = selected
        ? uniqueIds([...current.castAssignmentIds, assignmentId])
        : current.castAssignmentIds.filter(id => id !== assignmentId);
      const wardrobeLookIds = selected
        ? current.wardrobeLookIds
        : current.wardrobeLookIds.filter(id => !assignmentLookIds.has(id));
      const shots = current.shots.map(shot => ({
        ...shot,
        castAssignmentIds: selected && shot.castMode !== 'none' && shot.castMode !== 'selected'
          ? uniqueIds([...shot.castAssignmentIds, assignmentId])
          : selected ? shot.castAssignmentIds : shot.castAssignmentIds.filter(id => id !== assignmentId),
        wardrobeLookIds: selected
          ? shot.wardrobeLookIds
          : shot.wardrobeLookIds.filter(id => !assignmentLookIds.has(id))
      }));
      return { ...current, castMode: castAssignmentIds.length ? 'selected' : 'none', castAssignmentIds, wardrobeLookIds, shots };
    });
  };
  const selectWardrobeLook = (assignmentId: string, lookId: string) => {
    setDraft(current => {
      if (!current) return current;
      const assignment = castAssignments.find(item => item.id === assignmentId);
      const assignmentLookIds = new Set(readAssignmentLooks(assignment).map(look => look.id));
      const replaceLook = (lookIds: string[]) => uniqueIds([
        ...lookIds.filter(id => !assignmentLookIds.has(id)),
        ...(lookId ? [lookId] : [])
      ]);
      return {
        ...current,
        wardrobeLookIds: replaceLook(current.wardrobeLookIds),
        shots: current.shots.map(shot => ({ ...shot, wardrobeLookIds: shot.castMode === 'none' ? []
          : shot.castMode === 'selected' && !shot.castAssignmentIds.includes(assignmentId) ? shot.wardrobeLookIds : replaceLook(shot.wardrobeLookIds) }))
      };
    });
  };
  const displayScene = draft || previewScene(t);
  const fieldVisible = (path: string) => isCinematicFieldVisible(authoringManifest, path, authoringMode);
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="cinematic-dialog__overlay" />
        <Dialog.Content className="cinematic-dialog__content cinematic-dialog__content--wide cinematic-authoring-dialog">
          <DialogHeader title={t('cinematic.director.title')} description={t('cinematic.director.description')} />
          <div className="cinematic-director-context">
            <span>{t('cinematic.story.sceneDuration', { seconds: (displayScene.durationMs / 1000).toFixed(1) })}</span>
            <span>{t('cinematic.story.shotCount', { count: displayScene.shots.length })}</span>
          </div>
          {isFirstScene || displayScene.cinematicOpening ? <label className="cinematic-opening-control">
            <input type="checkbox" checked={displayScene.cinematicOpening === true} onChange={event => setDraft(current => current ? { ...current, cinematicOpening: event.target.checked } : current)} />
            <span>{t('cinematic.opening.label')}</span>
          </label> : null}
          <CinematicAuthoringModeHeader
            mode={authoringMode}
            label={t('cinematic.director.modeLabel')}
            helpText={t(authoringMode === 'simple' ? 'cinematic.director.simpleModeHint' : 'cinematic.director.advancedModeHint')}
            onChange={nextMode => {
              setAuthoringMode(nextMode);
              onModeChange?.(nextMode);
            }}
          />
          <div className="cinematic-director-grid">
            <label><span>{t('cinematic.director.sceneTitle')}</span><input value={displayScene.title} onChange={event => update('title', event.target.value)} /></label>
            <label><span>{t('cinematic.director.location')}</span><input value={displayScene.location} onChange={event => update('location', event.target.value)} /></label>
            <label><span>{t('cinematic.director.time')}</span><input value={displayScene.time} onChange={event => update('time', event.target.value)} /></label>
            {fieldVisible('scene.transitionIntent') ? <label><span>{t('cinematic.director.transition')}</span><input value={displayScene.transitionIntent} onChange={event => update('transitionIntent', event.target.value)} /></label> : null}
            {fieldVisible('scene.purpose') ? <label className="cinematic-director-grid__wide"><span>{t('cinematic.director.purpose')}</span><textarea rows={3} value={displayScene.purpose} onChange={event => update('purpose', event.target.value)} /></label> : null}
            <label className="cinematic-director-grid__wide"><span>{t('cinematic.director.storyChange')}</span><textarea rows={3} value={displayScene.storyChange} onChange={event => update('storyChange', event.target.value)} /></label>
            {fieldVisible('scene.entryState') ? <label><span>{t('cinematic.director.entryState')}</span><textarea rows={2} value={displayScene.entryState || ''} onChange={event => update('entryState', event.target.value)} /></label> : null}
            <label><span>{t('cinematic.director.exitState')}</span><textarea rows={2} value={displayScene.exitState || ''} onChange={event => update('exitState', event.target.value)} /></label>
            {fieldVisible('scene.objective') ? <label><span>{t('cinematic.director.objective')}</span><textarea rows={2} value={displayScene.objective || ''} onChange={event => update('objective', event.target.value)} /></label> : null}
            {fieldVisible('scene.pressure') ? <label><span>{t('cinematic.director.pressure')}</span><textarea rows={2} value={displayScene.pressure || ''} onChange={event => update('pressure', event.target.value)} /></label> : null}
            {fieldVisible('scene.emotionalStart') ? <label><span>{t('cinematic.director.emotionalStart')}</span><textarea rows={2} value={displayScene.emotionalStart} onChange={event => update('emotionalStart', event.target.value)} /></label> : null}
            <label><span>{t('cinematic.director.emotionalEnd')}</span><textarea rows={2} value={displayScene.emotionalEnd} onChange={event => update('emotionalEnd', event.target.value)} /></label>
            {fieldVisible('scene.blocking') ? <label className="cinematic-director-grid__wide"><span>{t('cinematic.director.blocking')}</span><textarea rows={3} value={displayScene.blocking} onChange={event => update('blocking', event.target.value)} /></label> : null}
          </div>
          <SceneCastLookSelector
            assignments={castAssignments}
            selectedCastAssignmentIds={displayScene.castAssignmentIds}
            selectedLookIds={displayScene.wardrobeLookIds}
            onToggleAssignment={toggleCastAssignment}
            onSelectLook={selectWardrobeLook}
          />
          <ShotSequenceEditor
            scene={displayScene}
            mode={authoringMode}
            authoringManifest={authoringManifest}
            castAssignments={castAssignments}
            onAddShot={addShot}
            onMoveShot={moveShot}
            onRemoveShot={removeShot}
            onUpdateShot={updateShot}
          />
          {authoringMode === 'advanced' ? <details className="cinematic-director-advanced" open>
            <summary>{t('cinematic.director.advanced')}</summary>
            <div className="cinematic-director-grid">
              <label className="cinematic-director-grid__wide"><span>{t('cinematic.director.artDirection')}</span><textarea rows={3} maxLength={1000} value={displayScene.artDirection || ''} onChange={event => update('artDirection', event.target.value)} /></label>
              <label><span>{t('cinematic.director.lighting')}</span><textarea rows={3} value={displayScene.lighting} onChange={event => update('lighting', event.target.value)} /></label>
              <label><span>{t('cinematic.director.performance')}</span><textarea rows={3} value={displayScene.performance} onChange={event => update('performance', event.target.value)} /></label>
              <label><span>{t('cinematic.director.audio')}</span><textarea rows={3} value={displayScene.audioIntent} onChange={event => update('audioIntent', event.target.value)} /></label>
              <label><span>{t('cinematic.director.propContinuity')}</span><textarea rows={3} value={displayScene.propContinuity || ''} onChange={event => update('propContinuity', event.target.value)} /></label>
              <label><span>{t('cinematic.director.screenDirection')}</span><textarea rows={3} value={displayScene.screenDirection || ''} onChange={event => update('screenDirection', event.target.value)} /></label>
              <label><span>{t('cinematic.director.continuity')}</span><textarea rows={3} value={displayScene.continuityNotes.join('\n')} onChange={event => setDraft(current => current ? { ...current, continuityNotes: event.target.value.split('\n').map(value => value.trim()).filter(Boolean) } : current)} /></label>
            </div>
          </details> : null}
          {scene && onGenerate ? <section className="cinematic-director-ai">
            <label><span>{t('cinematic.director.aiDirection')}</span><textarea rows={2} value={direction} onChange={event => setDirection(event.target.value)} placeholder={t('cinematic.director.aiDirectionPlaceholder')} /></label>
            <div><p className="cinematic-operation-status">{t('cinematic.story.qualificationNotice')}</p><Button icon={<WandSparkles aria-hidden="true" />} disabled={generating || !draft} onClick={() => draft && onGenerate(scene.id, direction, draft)}>{generating ? t('cinematic.story.generating') : t('cinematic.director.generate')}</Button></div>
          </section> : null}
          {authoringMode === 'simple' ? <CinematicReadinessSummary
            ready={isSimpleSceneReady(draft)}
            readyMessage={t('cinematic.director.simpleReady')}
            incompleteMessage={t('cinematic.director.simpleRequiredHint')}
          /> : null}
          {draft?.shots.some(hasInvalidCues) ? <p role="alert">{t('cinematic.cues.invalid')}</p> : null}
          <div className="cinematic-dialog__footer"><Dialog.Close asChild><Button>{t('cinematic.actions.close')}</Button></Dialog.Close><Button variant="primary" disabled={!draft || draft.shots.some(hasInvalidCues) || !onSave || (authoringMode === 'simple' ? !isSimpleSceneReady(draft) : !displayScene.title.trim())} icon={<Check aria-hidden="true" />} onClick={() => draft && onSave?.(draft)}>{t('cinematic.director.save')}</Button></div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function uniqueIds(ids: string[]) {
  return [...new Set(ids.filter(Boolean))];
}

const STORY_PLAN_WORKFLOW_STAGE_IDS = [
  'source_preflight', 'plan_generation', 'director_review',
  'visual_validation', 'visual_repair', 'storyboard_readiness'
] as const;

type StoryPlanRepair = NonNullable<CinematicStoryPlanProposal['workflow']>['repairs'][number];

function groupStoryPlanRepairs(repairs: StoryPlanRepair[]) {
  const groups = new Map<string, { sceneTitle: string; shotTitle: string; repairs: StoryPlanRepair[] }>();
  for (const repair of repairs) {
    const key = `${repair.sceneIndex ?? 'plan'}:${repair.shotIndex ?? 'scene'}`;
    const group = groups.get(key) || { sceneTitle: repair.sceneTitle, shotTitle: repair.shotTitle, repairs: [] };
    group.repairs.push(repair);
    groups.set(key, group);
  }
  return [...groups.values()];
}

function useElapsedSeconds(active: boolean) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  useEffect(() => {
    if (!active) return undefined;
    const startedAt = Date.now();
    setElapsedSeconds(0);
    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [active]);
  return elapsedSeconds;
}

function formatElapsedTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.max(0, totalSeconds % 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function StoryPlanProposalDialog({ open, onOpenChange, proposal, liveProgress = null, draftSaved = false, onApply, onResolveSource, generating = false, applying = false, error = null }: OpenDialogProps & {
  proposal: CinematicStoryPlanProposal | null;
  liveProgress?: CinematicStoryPlanLiveProgress | null;
  draftSaved?: boolean;
  onApply: (proposal: CinematicStoryPlanProposal) => void | Promise<void>;
  onResolveSource?: (resolution: 'story_brief' | 'creative_direction') => void | Promise<void>;
  generating?: boolean;
  applying?: boolean;
  error?: string | null;
}) {
  const { t } = useTranslation('cinematic');
  const elapsedSeconds = useElapsedSeconds(generating);
  if (!proposal && !generating && !error) return null;
  const plan = proposal?.plan || null;
  const shots = plan?.scenes.reduce((total, scene) => total + scene.shots.length, 0) || 0;
  const busy = generating || applying;
  const workflow = proposal?.workflow;
  const blocked = proposal?.status === 'blocked' || workflow?.status === 'blocked' || Boolean(proposal && !plan);
  const readiness = proposal?.filmReadiness || plan?.filmReadiness || null;
  const scriptPreview = proposal?.scriptPreview || plan?.scriptPreview || [];
  const progressStages = workflow?.stages || liveProgress?.stages || STORY_PLAN_WORKFLOW_STAGE_IDS.map((id, index) => ({
    id, status: index === 0 ? 'processing' : 'queued', issueCount: 0, repairCount: 0
  }));
  const repairGroups = groupStoryPlanRepairs(workflow?.repairs || []);
  const repairTimeout = workflow?.repairRounds.find(round => round.status === 'provider_timeout');
  return <Dialog.Root open={open} onOpenChange={nextOpen => { if (!busy) onOpenChange(nextOpen); }}><Dialog.Portal>
    <Dialog.Overlay className="cinematic-dialog__overlay" />
    <Dialog.Content className="cinematic-dialog__content cinematic-dialog__content--wide" aria-busy={generating}>
      <DialogHeader title={t('cinematic.story.proposalTitle')} description={generating ? t('cinematic.story.generatingDescription') : t('cinematic.story.proposalDescription')} />
      {generating ? <><GenerationStageState loading title={t('cinematic.story.generating')} description={t('cinematic.story.generatingDescription')} />
        <p className="cinematic-story-plan-workflow__elapsed" aria-live="polite">{t('cinematic.story.generatingElapsed', { time: formatElapsedTime(elapsedSeconds) })}</p></> : null}
      {(generating || workflow) ? <section className="cinematic-story-plan-workflow" aria-labelledby="cinematic-story-plan-workflow-title">
        <header><div><small>{t('cinematic.story.workflowEyebrow')}</small><h3 id="cinematic-story-plan-workflow-title">{t('cinematic.story.workflowTitle')}</h3><p>{t('cinematic.story.workflowDescription')}</p></div>{workflow ? <strong className={`is-${workflow.status}`}>{t(`cinematic.story.workflowStatus.${workflow.status}`)}</strong> : null}</header>
        <ol className="cinematic-story-plan-workflow__stages" aria-label={t('cinematic.story.directorProgress')}>
          {progressStages.map(stage => <li key={stage.id} className={`is-${stage.status}`}>
            <span aria-hidden="true">{stage.status === 'completed' || stage.status === 'skipped'
              ? <Check />
              : stage.status === 'processing'
                ? <ProcessingSpinner className="animate-spin" />
                : <Clock3 />}</span>
            <div><strong>{t(`cinematic.story.workflowStage.${stage.id}`)}</strong><small>{t(`cinematic.story.workflowStageStatus.${stage.status}`)}</small></div>
            {stage.issueCount || stage.repairCount ? <em>{t('cinematic.story.workflowStageEvidence', { issues: stage.issueCount, repairs: stage.repairCount })}</em> : null}
          </li>)}
        </ol>
        {workflow ? <div className="cinematic-story-plan-workflow__summary">
          <span>{t('cinematic.story.workflowInitialIssues', { count: workflow.initialFindings.length })}</span>
          <span>{t('cinematic.story.workflowRepairs', { count: workflow.repairs.length })}</span>
          <span>{t('cinematic.story.workflowRounds', { count: workflow.repairRoundCount })}</span>
          <span>{t('cinematic.story.workflowRemainingIssues', { count: workflow.remainingFindings.length })}</span>
        </div> : null}
        {repairTimeout ? <p className="cinematic-plan-warning" role="status">
          {t('cinematic.story.repairTimedOut', { seconds: Math.round((repairTimeout.failure?.timeoutMs || 0) / 1000) })}
        </p> : null}
        {workflow?.repairs.length ? <div className="cinematic-story-plan-repairs">
          <h4>{t('cinematic.story.repairDetailsTitle')}</h4>
          <p>{t('cinematic.story.repairDetailsDescription')}</p>
          {repairGroups.map((group, groupIndex) => <section key={`${group.sceneTitle}-${group.shotTitle}-${groupIndex}`}>
            <h5>{group.sceneTitle || t('cinematic.story.planScope')} / {group.shotTitle || t('cinematic.story.sceneScope')}</h5>
            {group.repairs.map((repair, index) => {
              const reasons = repair.reasonCodes.map(code => workflow.initialFindings.find(finding => finding.code === code)?.summary).filter(Boolean);
              return <details key={`${repair.round}-${repair.fieldPath}-${index}`}>
                <summary>{repair.fieldPath}</summary>
                <dl><div><dt>{t('cinematic.story.repairBefore')}</dt><dd>{repair.before || t('cinematic.story.emptyValue')}</dd></div><div><dt>{t('cinematic.story.repairAfter')}</dt><dd>{repair.after || t('cinematic.story.emptyValue')}</dd></div><div><dt>{t('cinematic.story.repairReason')}</dt><dd>{reasons.join(' ') || t('cinematic.story.repairReasonFallback')}</dd></div></dl>
              </details>;
            })}
          </section>)}
        </div> : null}
        {workflow && workflow.remainingFindings.length > 0 ? <details className="cinematic-story-plan-findings">
          <summary>{t('cinematic.story.remainingVisualIssues', { count: workflow.remainingFindings.length })}</summary>
          <ul>{workflow.remainingFindings.map((finding, index) => <li key={`${finding.code}-${finding.sceneId}-${finding.shotId}-${index}`} className={`is-${finding.severity}`}><strong>{finding.sceneTitle} / {finding.shotTitle}</strong><span>{finding.summary}</span><small>{finding.recommendation}</small></li>)}</ul>
        </details> : workflow ? <p className="cinematic-story-plan-workflow__clear"><Check aria-hidden="true" />{t('cinematic.story.noRemainingVisualIssues')}</p> : null}
      </section> : null}
      {blocked && proposal?.preflight ? <section className="cinematic-source-preflight" aria-labelledby="cinematic-source-preflight-title">
        <h3 id="cinematic-source-preflight-title">{t('cinematic.story.sourceIssuesTitle')}</h3>
        <p>{t('cinematic.story.sourceIssuesDescription')}</p>
        <ul>{proposal.preflight.diagnostics.filter(item => !item.resolved).map(item => <li key={item.code} className={`is-${item.severity}`}><strong>{item.summary}</strong><span>{item.recoveryAction}</span></li>)}</ul>
        <div className="cinematic-source-preflight__actions"><Button variant="primary" disabled={busy} onClick={() => void onResolveSource?.('story_brief')}>{t('cinematic.story.useStoryBrief')}</Button></div>
      </section> : null}
      {plan ? <><div className="cinematic-proposal-summary">
        <article><span>{t('cinematic.story.beats')}</span><strong>{plan.beats.length}</strong></article>
        <article><span>{t('cinematic.story.scenes')}</span><strong>{plan.scenes.length}</strong></article>
        <article><span>{t('cinematic.story.estimatedShots')}</span><strong>{shots}</strong></article>
        <article><span>{t('cinematic.story.runtime')}</span><strong>{(plan.scenes.reduce((sum, scene) => sum + scene.durationMs, 0) / 1000).toFixed(1)}s</strong></article>
      </div>
      <section className="cinematic-proposal-copy"><h3>{plan.logline}</h3><p>{plan.emotionalArc}</p></section>
      <ol className="cinematic-proposal-beats">{plan.beats.map(beat => <li key={beat.id}><strong>{beat.title}</strong><span>{beat.storyChange || beat.purpose}</span></li>)}</ol>
      {readiness ? <section className={`cinematic-film-readiness is-${readiness.status}`}><header><div><small>{t('cinematic.story.filmReadiness')}</small><h3>{t(`cinematic.story.readinessStatus.${readiness.status}`)}</h3></div><strong>{readiness.findings.length}</strong></header>{readiness.findings.length ? <ul>{readiness.findings.map((finding, index) => <li key={`${finding.code}-${index}`} className={`is-${finding.severity}`}><strong>{finding.summary}</strong>{finding.recommendation ? <span>{finding.recommendation}</span> : null}</li>)}</ul> : <p>{t('cinematic.story.noReadinessIssues')}</p>}</section> : null}
      {scriptPreview.length ? <details className="cinematic-film-script"><summary>{t('cinematic.story.filmScriptPreview')}</summary><ol>{scriptPreview.map(entry => <li key={entry.shotId}><header><time>{formatScriptTime(entry.startMs)}-{formatScriptTime(entry.endMs)}</time><strong>{entry.sceneTitle} / {entry.shotTitle}</strong></header>{entry.visual ? <p><b>{t('cinematic.story.scriptVisual')}</b>{entry.visual}</p> : null}{entry.action ? <p><b>{t('cinematic.story.scriptAction')}</b>{entry.action}</p> : null}{entry.performance ? <p><b>{t('cinematic.story.scriptPerformance')}</b>{entry.performance}</p> : null}{entry.dialogue.map((cue, index) => <p key={`dialogue-${index}`}><b>{t('cinematic.story.scriptDialogue')}</b>{cue.text}</p>)}{entry.audio.map((cue, index) => <p key={`audio-${index}`}><b>{t('cinematic.story.scriptAudio')}</b>{cue.description || cue.source}</p>)}{entry.cut ? <p><b>{t('cinematic.story.scriptCut')}</b>{entry.cut}</p> : null}</li>)}</ol></details> : null}
      {plan.warnings.length ? <div className="cinematic-plan-warning" role="status">{plan.warnings.join(' ')}</div> : null}
      {draftSaved ? <p className="cinematic-story-plan-workflow__clear" role="status"><Check aria-hidden="true" />{t('cinematic.story.generatedDraftSaved')}</p> : null}
      <p className="cinematic-qualification-notice">{t('cinematic.story.qualificationNotice')}</p></> : null}
      {error ? <p role="alert" className="text-sm text-red-400">{error}</p> : null}
      <div className="cinematic-dialog__footer">{draftSaved
        ? <Dialog.Close asChild><Button variant="primary" disabled={busy}>{t('cinematic.story.continueEditing')}</Button></Dialog.Close>
        : <><Dialog.Close asChild><Button disabled={busy}>{plan ? t('cinematic.story.discardProposal') : t('cinematic.actions.close')}</Button></Dialog.Close>{plan ? <Button variant="primary" disabled={busy || blocked || readiness?.status === 'not_ready'} onClick={() => void onApply(proposal!)}>{applying ? t('cinematic.save.saving') : t('cinematic.story.saveGeneratedDraft')}</Button> : null}</>}
      </div>
    </Dialog.Content>
  </Dialog.Portal></Dialog.Root>;
}

function formatScriptTime(milliseconds: number) {
  const seconds = Math.max(0, milliseconds) / 1000;
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toFixed(1).padStart(4, '0')}`;
}

export function SceneDirectionProposalDialog({ open, onOpenChange, proposal, onApply, generating = false, applying = false, error = null }: OpenDialogProps & {
  proposal: CinematicSceneDirectionProposal | null;
  onApply: (proposal: CinematicSceneDirectionProposal, selectedFieldKeys: string[]) => void | Promise<void>;
  generating?: boolean;
  applying?: boolean;
  error?: string | null;
}) {
  const { t } = useTranslation('cinematic');
  const [fieldSelection, setFieldSelection] = useState<{ proposalId: string; keys: string[] } | null>(null);
  const reviewFields = (proposal?.fieldProposals || []).filter(field => field.outcome !== 'unchanged');
  const selectableFieldKeys = reviewFields
    .filter(field => field.outcome === 'proposed')
    .map(field => field.fieldKey);
  const selectedFieldKeys = fieldSelection && fieldSelection.proposalId === proposal?.proposalId
    ? fieldSelection.keys
    : selectableFieldKeys;
  const allProposedSelected = selectableFieldKeys.length > 0
    && selectableFieldKeys.every(key => selectedFieldKeys.includes(key));
  const someProposedSelected = selectedFieldKeys.some(key => selectableFieldKeys.includes(key));
  const hasFieldContract = Boolean(proposal?.fieldProposals);
  const busy = generating || applying;
  return <Dialog.Root open={open} onOpenChange={nextOpen => { if (!busy) onOpenChange(nextOpen); }}><Dialog.Portal>
    <Dialog.Overlay className="cinematic-dialog__overlay" />
    <Dialog.Content className="cinematic-dialog__content">
      <DialogHeader title={t('cinematic.director.proposalTitle')} description={t('cinematic.director.proposalDescription')} />
      {generating ? <GenerationStageState loading title={t('cinematic.director.proposalGenerating')} description={t('cinematic.director.proposalGeneratingDescription')} /> : null}
      {!generating && proposal ? <>
        <div className="cinematic-scene-proposal"><h3>{proposal.scene.title}</h3><p>{proposal.scene.purpose}</p></div>
        {hasFieldContract ? <section className="cinematic-field-proposals" aria-label={t('cinematic.director.proposalFields')}>
          <header><div><strong>{t('cinematic.director.proposalFields')}</strong><span>{t('cinematic.director.proposalSummary', {
            proposed: proposal.mergeSummary?.proposed || 0,
            locked: proposal.mergeSummary?.locked || 0
          })}</span></div>{selectableFieldKeys.length ? <label className="cinematic-field-proposals__select-all">
            <input
              type="checkbox"
              checked={allProposedSelected}
              aria-checked={someProposedSelected && !allProposedSelected ? 'mixed' : allProposedSelected}
              ref={node => { if (node) node.indeterminate = someProposedSelected && !allProposedSelected; }}
              onChange={event => setFieldSelection({
                proposalId: proposal.proposalId,
                keys: event.target.checked ? selectableFieldKeys : []
              })}
            />
            <span><strong>{t('cinematic.director.proposalSelectAll')}</strong><small>{t('cinematic.director.proposalSelectedCount', {
              selected: selectedFieldKeys.length,
              total: selectableFieldKeys.length
            })}</small></span>
          </label> : null}</header>
          {reviewFields.length ? <ul>{reviewFields.map(field => {
            const selected = selectedFieldKeys.includes(field.fieldKey);
            return <li key={field.fieldKey} className={`is-${field.outcome}`}>
              <label>
                <input
                  type="checkbox"
                  checked={selected}
                  disabled={field.outcome !== 'proposed'}
                  onChange={event => setFieldSelection({
                    proposalId: proposal!.proposalId,
                    keys: event.target.checked
                      ? [...new Set([...selectedFieldKeys, field.fieldKey])]
                      : selectedFieldKeys.filter(key => key !== field.fieldKey)
                  })}
                />
                <span><strong>{t(field.localizationKey)}</strong><small>{field.outcome === 'locked' ? t('cinematic.director.proposalLocked') : field.visibility === 'advanced' ? t('cinematic.mode.advanced') : t('cinematic.mode.simple')}</small></span>
              </label>
              <div><small>{t('cinematic.director.proposalCurrent')}</small><p>{formatProposalValue(field.currentValue, field.manifestPath)}</p></div>
              <div><small>{t('cinematic.director.proposalSuggested')}</small><p>{formatProposalValue(field.proposedValue, field.manifestPath)}</p></div>
            </li>;
          })}</ul> : <p>{t('cinematic.director.proposalNoChanges')}</p>}
        </section> : <div className="cinematic-scene-proposal"><dl><div><dt>{t('cinematic.director.storyChange')}</dt><dd>{proposal.scene.storyChange}</dd></div><div><dt>{t('cinematic.director.blocking')}</dt><dd>{proposal.scene.blocking}</dd></div><div><dt>{t('cinematic.director.performance')}</dt><dd>{proposal.scene.performance}</dd></div></dl></div>}
        <p className="cinematic-qualification-notice">{t('cinematic.story.qualificationNotice')}</p>
      </> : null}
      {error ? <p role="alert" className="text-sm text-red-400">{error}</p> : null}
      <div className="cinematic-dialog__footer"><Dialog.Close asChild><Button disabled={busy}>{proposal ? t('cinematic.story.discardProposal') : t('cinematic.actions.close')}</Button></Dialog.Close>{proposal ? <Button variant="primary" disabled={busy || (hasFieldContract && selectedFieldKeys.length === 0)} onClick={() => void onApply(proposal, selectedFieldKeys)}>{applying ? t('cinematic.save.saving') : t('cinematic.story.applyProposal')}</Button> : null}</div>
    </Dialog.Content>
  </Dialog.Portal></Dialog.Root>;
}

function formatProposalValue(value: unknown, manifestPath: string) {
  if (manifestPath.endsWith('estimatedActionDurationMs') && typeof value === 'number') {
    return formatProposalDuration(value);
  }
  if (Array.isArray(value)) {
    return value.map((item, index) => formatProposalListItem(item, manifestPath, index)).filter(Boolean).join('\n') || '-';
  }
  if (value && typeof value === 'object') return formatProposalObject(value as Record<string, unknown>);
  return String(value ?? '').trim() || '-';
}

function formatProposalListItem(value: unknown, manifestPath: string, index: number) {
  if (!value || typeof value !== 'object') return String(value ?? '').trim();
  const item = value as Record<string, unknown>;
  if (manifestPath.endsWith('dialogueCues')) {
    const timing = formatProposalRange(item.startOffsetMs, item.estimatedDurationMs);
    const speaker = String(item.offscreenVoiceRole || item.speakerCastAssignmentId || '').trim();
    return [timing, speaker, quoteProposalText(item.text), item.delivery]
      .map(part => String(part || '').trim()).filter(Boolean).join(' · ');
  }
  if (manifestPath.endsWith('audioCues')) {
    const timing = formatProposalRange(item.startOffsetMs, item.durationMs);
    return [timing, item.kind, item.source, item.description]
      .map(part => String(part || '').trim()).filter(Boolean).join(' · ');
  }
  return `${index + 1}. ${formatProposalObject(item)}`;
}

function formatProposalObject(value: Record<string, unknown>) {
  const readable = Object.values(value).flatMap(item => {
    if (Array.isArray(item)) return item.map(entry => String(entry ?? '').trim()).filter(Boolean);
    if (item == null || typeof item === 'object') return [];
    return String(item).trim();
  }).filter(Boolean);
  return readable.join(' · ') || '-';
}

function formatProposalRange(startValue: unknown, durationValue: unknown) {
  const start = Number(startValue);
  const duration = Number(durationValue);
  if (!Number.isFinite(start) || !Number.isFinite(duration)) return '';
  return `${formatProposalDuration(start)}-${formatProposalDuration(start + duration)}`;
}

function formatProposalDuration(milliseconds: number) {
  const seconds = Math.max(0, milliseconds) / 1000;
  return `${Number.isInteger(seconds) ? seconds.toFixed(0) : seconds.toFixed(1)}s`;
}

function quoteProposalText(value: unknown) {
  const text = String(value || '').trim();
  return text ? `"${text}"` : '';
}

function previewScene(t: (key: string) => string): CinematicScene {
  return {
    id: 'preview-scene', version: 1, orderKey: 1, beatId: 'preview-beat',
    title: t('cinematic.storyboard.sceneOne'), purpose: t('cinematic.director.purposeValue'),
    storyChange: '', location: '', time: '', emotionalStart: '', emotionalEnd: '',
    transitionIntent: 'cut', castAssignmentIds: [], wardrobeLookIds: [],
    blocking: t('cinematic.director.blockingValue'), lighting: t('cinematic.director.lightingValue'),
    performance: t('cinematic.director.performanceValue'), audioIntent: t('cinematic.director.audioValue'),
    continuityNotes: [t('cinematic.director.continuityValue')], shots: [], shotOrder: [], durationMs: 4000
  };
}

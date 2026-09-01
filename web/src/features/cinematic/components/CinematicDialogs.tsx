import * as Dialog from '@radix-ui/react-dialog';
import {
  ArrowDown, ArrowUp, Check, ChevronLeft, ChevronRight, Clock3, Plus, Search,
  Trash2, UserRound, WandSparkles
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { AuthenticatedMediaImage } from '../../../components/media/AuthenticatedMediaImage';
import { GenerationStageState } from '../../../components/generation/GenerationStageState';
import { ContextualOperationDock } from './ContextualOperationDock';
import { DialogHeader } from './ProjectCostSummary';
import { listCharacters, listOwnedCharacters } from '../../profiles/api/profileApi';
import type { z } from 'zod';
import { characterSummarySchema } from '../../profiles/schemas/profileSchemas';
import { enhanceCinematicStory } from '../api/cinematicApi';
import type {
  CinematicCastAssignment, CinematicScene, CinematicSceneDirectionProposal, CinematicSetupDraft, CinematicStoryBeat,
  CinematicStoryEnhancement, CinematicStoryPlanProposal
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    setResult(null);
    setEditedBrief('');
    setError(null);
  }, [open, draft.storyBrief]);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const enhancement = await enhanceCinematicStory(draft);
      setResult(enhancement);
      setEditedBrief(enhancement.enhancedStoryBrief);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('cinematic.enhance.failed'));
    } finally {
      setLoading(false);
    }
  }

  function apply() {
    if (!result || !editedBrief.trim()) return;
    onApply({ ...result, enhancedStoryBrief: editedBrief.trim() });
    onOpenChange(false);
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="cinematic-dialog__overlay" />
        <Dialog.Content className="cinematic-dialog__content cinematic-dialog__content--wide">
          <DialogHeader title={t(purpose === 'roles' ? 'cinematic.enhance.roleTitle' : 'cinematic.enhance.title')} description={t(purpose === 'roles' ? 'cinematic.enhance.roleDescription' : 'cinematic.enhance.description')} />
          <div className="cinematic-compare-grid">
            <article><span>{t('cinematic.enhance.original')}</span><p>{draft.storyBrief}</p></article>
            <article className="is-enhanced"><span>{t('cinematic.enhance.preview')}</span>{result
              ? <textarea aria-label={t('cinematic.enhance.preview')} maxLength={600} rows={7} value={editedBrief} onChange={event => setEditedBrief(event.target.value)} />
              : <p>{t('cinematic.enhance.previewEmpty')}</p>}</article>
          </div>
          {result ? <section className="cinematic-enhancement-details">
            <div><strong>{t('cinematic.enhance.conflict')}</strong><p>{result.conflict}</p></div>
            <div><strong>{t('cinematic.enhance.arc')}</strong><p>{result.emotionalArc}</p></div>
            <div className="is-wide"><strong>{t('cinematic.enhance.recommendedCast')}</strong><ul>{result.recommendedRoles.map(role => <li key={role.id}><b>{role.label}</b> · {t(`cinematic.roleImportance.${role.importance}`)} — {role.storyFunction}</li>)}</ul></div>
          </section> : null}
          {error ? <p role="alert" className="text-sm text-red-400">{error}</p> : null}
          <ContextualOperationDock
            title={t('cinematic.enhance.operationTitle')}
            description={t('cinematic.enhance.operationDescription')}
            operation={t('cinematic.enhance.operation')}
            notice={t('cinematic.enhance.qualificationNotice')}
            actionLabel={t('cinematic.enhance.generate')}
            disabled={!draft.storyBrief.trim() || loading}
            loading={loading}
            onAction={() => void generate()}
          />
          <div className="cinematic-dialog__footer">
            <Dialog.Close asChild><Button>{t('cinematic.actions.cancel')}</Button></Dialog.Close>
            <Button variant="primary" disabled={!result || !editedBrief.trim()} icon={<Check aria-hidden="true" />} onClick={apply}>{t('cinematic.enhance.apply')}</Button>
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

export function CharacterPickerDialog({ open, onOpenChange, onSelect }: OpenDialogProps & { onSelect?: (character: CharacterCandidate) => void | Promise<void> }) {
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
  open, onOpenChange, scene, castAssignments = [], onSave, onGenerate, generating = false
}: OpenDialogProps & {
  scene?: CinematicScene | null;
  castAssignments?: CinematicCastAssignment[];
  onSave?: (scene: CinematicScene) => void;
  onGenerate?: (sceneId: string, direction: string) => void;
  generating?: boolean;
}) {
  const { t } = useTranslation('cinematic');
  const [draft, setDraft] = useState<CinematicScene | null>(scene || null);
  const [direction, setDirection] = useState('');
  useEffect(() => {
    if (open) {
      setDraft(scene || null);
      setDirection('');
    }
  }, [open, scene]);
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
      const shots = current.shots.map(shot => shot.id === shotId ? { ...shot, [field]: value } : shot);
      return { ...current, shots, durationMs: shots.reduce((total, shot) => total + shot.durationMs, 0) };
    });
  }
  const updateDialogueCue = (shotId: string, patch: Partial<NonNullable<CinematicScene['shots'][number]['dialogueCues']>[number]>) => {
    const shot = draft?.shots.find(item => item.id === shotId);
    if (!shot) return;
    const current = shot.dialogueCues?.[0] || {
      speakerCastAssignmentId: shot.castAssignmentIds[0] || '', offscreenVoiceRole: '', text: '', delivery: '',
      startOffsetMs: 0, estimatedDurationMs: Math.min(2000, shot.durationMs), speakerVisible: true
    };
    updateShot(shotId, 'dialogueCues', [{ ...current, ...patch }]);
  };
  const updateAudioCue = (shotId: string, description: string) => {
    const shot = draft?.shots.find(item => item.id === shotId);
    if (!shot) return;
    updateShot(shotId, 'audioCues', description.trim() ? [{
      kind: 'ambience', source: 'scene', description, startOffsetMs: 0, durationMs: shot.durationMs
    }] : []);
  };
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
        castAssignmentIds: selected
          ? uniqueIds([...shot.castAssignmentIds, assignmentId])
          : shot.castAssignmentIds.filter(id => id !== assignmentId),
        wardrobeLookIds: selected
          ? shot.wardrobeLookIds
          : shot.wardrobeLookIds.filter(id => !assignmentLookIds.has(id))
      }));
      return { ...current, castAssignmentIds, wardrobeLookIds, shots };
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
        shots: current.shots.map(shot => ({ ...shot, wardrobeLookIds: replaceLook(shot.wardrobeLookIds) }))
      };
    });
  };
  const displayScene = draft || previewScene(t);
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
          <div className="cinematic-director-grid">
            <label><span>{t('cinematic.director.sceneTitle')}</span><input value={displayScene.title} onChange={event => update('title', event.target.value)} /></label>
            <label><span>{t('cinematic.director.location')}</span><input value={displayScene.location} onChange={event => update('location', event.target.value)} /></label>
            <label><span>{t('cinematic.director.time')}</span><input value={displayScene.time} onChange={event => update('time', event.target.value)} /></label>
            <label><span>{t('cinematic.director.transition')}</span><input value={displayScene.transitionIntent} onChange={event => update('transitionIntent', event.target.value)} /></label>
            <label className="cinematic-director-grid__wide"><span>{t('cinematic.director.purpose')}</span><textarea rows={3} value={displayScene.purpose} onChange={event => update('purpose', event.target.value)} /></label>
            <label className="cinematic-director-grid__wide"><span>{t('cinematic.director.storyChange')}</span><textarea rows={3} value={displayScene.storyChange} onChange={event => update('storyChange', event.target.value)} /></label>
            <label><span>{t('cinematic.director.entryState')}</span><textarea rows={2} value={displayScene.entryState || ''} onChange={event => update('entryState', event.target.value)} /></label>
            <label><span>{t('cinematic.director.exitState')}</span><textarea rows={2} value={displayScene.exitState || ''} onChange={event => update('exitState', event.target.value)} /></label>
            <label><span>{t('cinematic.director.objective')}</span><textarea rows={2} value={displayScene.objective || ''} onChange={event => update('objective', event.target.value)} /></label>
            <label><span>{t('cinematic.director.pressure')}</span><textarea rows={2} value={displayScene.pressure || ''} onChange={event => update('pressure', event.target.value)} /></label>
            <label><span>{t('cinematic.director.emotionalStart')}</span><textarea rows={2} value={displayScene.emotionalStart} onChange={event => update('emotionalStart', event.target.value)} /></label>
            <label><span>{t('cinematic.director.emotionalEnd')}</span><textarea rows={2} value={displayScene.emotionalEnd} onChange={event => update('emotionalEnd', event.target.value)} /></label>
            <label className="cinematic-director-grid__wide"><span>{t('cinematic.director.blocking')}</span><textarea rows={3} value={displayScene.blocking} onChange={event => update('blocking', event.target.value)} /></label>
          </div>
          {castAssignments.length ? <section className="cinematic-director-cast" aria-labelledby="cinematic-director-cast-title">
            <header><div><h3 id="cinematic-director-cast-title">{t('cinematic.director.sceneCast')}</h3><p>{t('cinematic.director.sceneCastHint')}</p></div></header>
            <div className="cinematic-director-cast__list">
              {castAssignments.filter(assignment => assignment.active !== false).map(assignment => {
                const selected = displayScene.castAssignmentIds.includes(assignment.id);
                const looks = readAssignmentLooks(assignment);
                const selectedLookId = displayScene.wardrobeLookIds.find(id => looks.some(look => look.id === id)) || '';
                return <article key={assignment.id} className={selected ? 'is-selected' : ''}>
                  <label className="cinematic-director-cast__character">
                    <input type="checkbox" checked={selected} onChange={event => toggleCastAssignment(assignment.id, event.target.checked)} />
                    <AuthenticatedMediaImage src={assignment.portraitUrl || undefined} alt="" />
                    <span><strong>{assignment.displayName}</strong><small>{assignment.storyRole}</small></span>
                  </label>
                  <label><span>{t('cinematic.director.sceneLook')}</span><select value={selectedLookId} disabled={!selected} onChange={event => selectWardrobeLook(assignment.id, event.target.value)}>
                    <option value="">{t('cinematic.director.characterWardrobe')}</option>
                    {looks.map(look => <option key={look.id} value={look.id}>{look.name}</option>)}
                  </select></label>
                </article>;
              })}
            </div>
          </section> : null}
          <section className="cinematic-director-shots">
            <header><div><h3>{t('cinematic.director.shotSkeleton')}</h3><span>{t('cinematic.director.shotSkeletonHint')}</span></div><Button size="sm" icon={<Plus aria-hidden="true" />} onClick={addShot}>{t('cinematic.director.addShot')}</Button></header>
            {displayScene.shots.map((shot, index) => <article key={shot.id} className="cinematic-director-shot-row">
              <div className="cinematic-director-shot-row__summary">
                <strong>{String(index + 1).padStart(2, '0')}</strong>
                <label><span>{t('cinematic.director.shotTitle')}</span><input value={shot.title} onChange={event => updateShot(shot.id, 'title', event.target.value)} /></label>
                <label><span>{t('cinematic.director.shotPurpose')}</span><input value={shot.purpose} onChange={event => updateShot(shot.id, 'purpose', event.target.value)} /></label>
                <label><span>{t('cinematic.director.shotDuration')}</span><input type="number" min="0.5" step="0.5" value={shot.durationMs / 1000} onChange={event => updateShot(shot.id, 'durationMs', Math.max(500, Number(event.target.value || 0) * 1000))} /></label>
                <div className="cinematic-director-shot-row__actions">
                <Button size="icon" variant="ghost" icon={<ArrowUp aria-hidden="true" />} aria-label={t('cinematic.director.moveShotEarlier', { name: shot.title })} disabled={index === 0} onClick={() => moveShot(shot.id, 'earlier')} />
                <Button size="icon" variant="ghost" icon={<ArrowDown aria-hidden="true" />} aria-label={t('cinematic.director.moveShotLater', { name: shot.title })} disabled={index === displayScene.shots.length - 1} onClick={() => moveShot(shot.id, 'later')} />
                <ConfirmDialog trigger={<Button size="icon" variant="ghost" icon={<Trash2 aria-hidden="true" />} aria-label={t('cinematic.director.removeShot', { name: shot.title })} disabled={displayScene.shots.length <= 1} />} title={t('cinematic.director.removeShotTitle')} description={t('cinematic.director.removeShotDescription', { name: shot.title })} confirmLabel={t('cinematic.director.removeShotConfirm')} destructive onConfirm={() => removeShot(shot.id)} />
                </div>
              </div>
              <div className="cinematic-director-shot-contract">
                <label className="cinematic-director-grid__wide"><span>{t('cinematic.director.visibleMoment')}</span><textarea rows={2} value={shot.visibleMoment || ''} onChange={event => updateShot(shot.id, 'visibleMoment', event.target.value)} /></label>
                <label><span>{t('cinematic.director.subjectAction')}</span><textarea rows={2} value={shot.subjectAction || ''} onChange={event => updateShot(shot.id, 'subjectAction', event.target.value)} /></label>
                <label><span>{t('cinematic.director.emotionalTarget')}</span><textarea rows={2} value={shot.emotionalTarget || ''} onChange={event => updateShot(shot.id, 'emotionalTarget', event.target.value)} /></label>
                <label className="cinematic-director-grid__wide"><span>{t('cinematic.director.performanceCue')}</span><textarea rows={2} value={shot.performanceCue || ''} onChange={event => updateShot(shot.id, 'performanceCue', event.target.value)} /></label>
                <label><span>{t('cinematic.director.continuityEntry')}</span><textarea rows={2} value={shot.continuityEntry || ''} onChange={event => updateShot(shot.id, 'continuityEntry', event.target.value)} /></label>
                <label><span>{t('cinematic.director.continuityExit')}</span><textarea rows={2} value={shot.continuityExit || ''} onChange={event => updateShot(shot.id, 'continuityExit', event.target.value)} /></label>
                <label className="cinematic-director-grid__wide"><span>{t('cinematic.director.transitionToNext')}</span><input value={shot.transitionToNext || ''} onChange={event => updateShot(shot.id, 'transitionToNext', event.target.value)} /></label>
              </div>
              <details className="cinematic-director-shot-advanced">
                <summary>{t('cinematic.director.shotAdvanced')}</summary>
                <div className="cinematic-director-shot-contract">
                  <label><span>{t('cinematic.director.dialogueSpeaker')}</span><select value={shot.dialogueCues?.[0]?.speakerCastAssignmentId || ''} onChange={event => updateDialogueCue(shot.id, { speakerCastAssignmentId: event.target.value, offscreenVoiceRole: '' })}><option value="">{t('cinematic.director.noDialogue')}</option>{castAssignments.filter(item => shot.castAssignmentIds.includes(item.id)).map(item => <option key={item.id} value={item.id}>{item.displayName}</option>)}</select></label>
                  <label><span>{t('cinematic.director.dialogueDelivery')}</span><input value={shot.dialogueCues?.[0]?.delivery || ''} onChange={event => updateDialogueCue(shot.id, { delivery: event.target.value })} /></label>
                  <label className="cinematic-director-grid__wide"><span>{t('cinematic.director.dialogueText')}</span><textarea rows={2} value={shot.dialogueCues?.[0]?.text || ''} onChange={event => event.target.value ? updateDialogueCue(shot.id, { text: event.target.value }) : updateShot(shot.id, 'dialogueCues', [])} /></label>
                  <label className="cinematic-director-grid__wide"><span>{t('cinematic.director.audioCue')}</span><textarea rows={2} value={shot.audioCues?.[0]?.description || ''} onChange={event => updateAudioCue(shot.id, event.target.value)} /></label>
                </div>
              </details>
            </article>)}
          </section>
          <details className="cinematic-director-advanced">
            <summary>{t('cinematic.director.advanced')}</summary>
            <div className="cinematic-director-grid">
              <label><span>{t('cinematic.director.lighting')}</span><textarea rows={3} value={displayScene.lighting} onChange={event => update('lighting', event.target.value)} /></label>
              <label><span>{t('cinematic.director.performance')}</span><textarea rows={3} value={displayScene.performance} onChange={event => update('performance', event.target.value)} /></label>
              <label><span>{t('cinematic.director.audio')}</span><textarea rows={3} value={displayScene.audioIntent} onChange={event => update('audioIntent', event.target.value)} /></label>
              <label><span>{t('cinematic.director.propContinuity')}</span><textarea rows={3} value={displayScene.propContinuity || ''} onChange={event => update('propContinuity', event.target.value)} /></label>
              <label><span>{t('cinematic.director.screenDirection')}</span><textarea rows={3} value={displayScene.screenDirection || ''} onChange={event => update('screenDirection', event.target.value)} /></label>
              <label><span>{t('cinematic.director.continuity')}</span><textarea rows={3} value={displayScene.continuityNotes.join('\n')} onChange={event => setDraft(current => current ? { ...current, continuityNotes: event.target.value.split('\n').map(value => value.trim()).filter(Boolean) } : current)} /></label>
            </div>
          </details>
          {scene && onGenerate ? <section className="cinematic-director-ai">
            <label><span>{t('cinematic.director.aiDirection')}</span><textarea rows={2} value={direction} onChange={event => setDirection(event.target.value)} placeholder={t('cinematic.director.aiDirectionPlaceholder')} /></label>
            <div><p className="cinematic-operation-status">{t('cinematic.story.qualificationNotice')}</p><Button icon={<WandSparkles aria-hidden="true" />} disabled={generating} onClick={() => onGenerate(scene.id, direction)}>{generating ? t('cinematic.story.generating') : t('cinematic.director.generate')}</Button></div>
          </section> : null}
          <div className="cinematic-dialog__footer"><Dialog.Close asChild><Button>{t('cinematic.actions.close')}</Button></Dialog.Close><Button variant="primary" disabled={!draft || !onSave || !displayScene.title.trim()} icon={<Check aria-hidden="true" />} onClick={() => draft && onSave?.(draft)}>{t('cinematic.director.save')}</Button></div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

type SceneWardrobeLook = { id: string; name: string };

function readAssignmentLooks(assignment?: CinematicCastAssignment): SceneWardrobeLook[] {
  return (assignment?.looks || []).flatMap(value => {
    if (!value || typeof value !== 'object') return [];
    const record = value as Record<string, unknown>;
    const id = String(record.id || '').trim();
    if (!id) return [];
    return [{ id, name: String(record.name || id) }];
  });
}

function uniqueIds(ids: string[]) {
  return [...new Set(ids.filter(Boolean))];
}

export function StoryPlanProposalDialog({ open, onOpenChange, proposal, onApply, onResolveSource, generating = false, applying = false, error = null }: OpenDialogProps & {
  proposal: CinematicStoryPlanProposal | null;
  onApply: (proposal: CinematicStoryPlanProposal) => void | Promise<void>;
  onResolveSource?: (resolution: 'story_brief' | 'creative_direction') => void | Promise<void>;
  generating?: boolean;
  applying?: boolean;
  error?: string | null;
}) {
  const { t } = useTranslation('cinematic');
  if (!proposal && !generating && !error) return null;
  const plan = proposal?.plan || null;
  const shots = plan?.scenes.reduce((total, scene) => total + scene.shots.length, 0) || 0;
  const busy = generating || applying;
  const blocked = proposal?.status === 'blocked' || Boolean(proposal && !plan);
  const readiness = proposal?.filmReadiness || plan?.filmReadiness || null;
  const scriptPreview = proposal?.scriptPreview || plan?.scriptPreview || [];
  return <Dialog.Root open={open} onOpenChange={nextOpen => { if (!busy) onOpenChange(nextOpen); }}><Dialog.Portal>
    <Dialog.Overlay className="cinematic-dialog__overlay" />
    <Dialog.Content className="cinematic-dialog__content cinematic-dialog__content--wide" aria-busy={generating}>
      <DialogHeader title={t('cinematic.story.proposalTitle')} description={generating ? t('cinematic.story.generatingDescription') : t('cinematic.story.proposalDescription')} />
      {generating ? <><GenerationStageState loading title={t('cinematic.story.generating')} description={t('cinematic.story.generatingDescription')} /><ol className="cinematic-director-progress" aria-label={t('cinematic.story.directorProgress')}><li>{t('cinematic.story.progressSource')}</li><li>{t('cinematic.story.progressDirecting')}</li><li>{t('cinematic.story.progressContinuity')}</li><li>{t('cinematic.story.progressReview')}</li></ol></> : null}
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
      <p className="cinematic-qualification-notice">{t('cinematic.story.qualificationNotice')}</p></> : null}
      {error ? <p role="alert" className="text-sm text-red-400">{error}</p> : null}
      <div className="cinematic-dialog__footer"><Dialog.Close asChild><Button disabled={busy}>{plan ? t('cinematic.story.discardProposal') : t('cinematic.actions.close')}</Button></Dialog.Close>{plan ? <Button variant="primary" disabled={busy || readiness?.status === 'not_ready'} onClick={() => void onApply(proposal!)}>{applying ? t('cinematic.save.saving') : t('cinematic.story.applyProposal')}</Button> : null}</div>
    </Dialog.Content>
  </Dialog.Portal></Dialog.Root>;
}

function formatScriptTime(milliseconds: number) {
  const seconds = Math.max(0, milliseconds) / 1000;
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toFixed(1).padStart(4, '0')}`;
}

export function SceneDirectionProposalDialog({ open, onOpenChange, proposal, onApply, applying = false, error = null }: OpenDialogProps & {
  proposal: CinematicSceneDirectionProposal | null;
  onApply: (proposal: CinematicSceneDirectionProposal) => void | Promise<void>;
  applying?: boolean;
  error?: string | null;
}) {
  const { t } = useTranslation('cinematic');
  if (!proposal) return null;
  return <Dialog.Root open={open} onOpenChange={nextOpen => { if (!applying) onOpenChange(nextOpen); }}><Dialog.Portal>
    <Dialog.Overlay className="cinematic-dialog__overlay" />
    <Dialog.Content className="cinematic-dialog__content">
      <DialogHeader title={t('cinematic.director.proposalTitle')} description={t('cinematic.director.proposalDescription')} />
      <div className="cinematic-scene-proposal"><h3>{proposal.scene.title}</h3><p>{proposal.scene.purpose}</p><dl><div><dt>{t('cinematic.director.storyChange')}</dt><dd>{proposal.scene.storyChange}</dd></div><div><dt>{t('cinematic.director.blocking')}</dt><dd>{proposal.scene.blocking}</dd></div><div><dt>{t('cinematic.director.performance')}</dt><dd>{proposal.scene.performance}</dd></div></dl></div>
      <p className="cinematic-qualification-notice">{t('cinematic.story.qualificationNotice')}</p>
      {error ? <p role="alert" className="text-sm text-red-400">{error}</p> : null}
      <div className="cinematic-dialog__footer"><Dialog.Close asChild><Button disabled={applying}>{t('cinematic.story.discardProposal')}</Button></Dialog.Close><Button variant="primary" disabled={applying} onClick={() => void onApply(proposal)}>{applying ? t('cinematic.save.saving') : t('cinematic.story.applyProposal')}</Button></div>
    </Dialog.Content>
  </Dialog.Portal></Dialog.Root>;
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

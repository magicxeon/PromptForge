import * as Dialog from '@radix-ui/react-dialog';
import { Camera, Check, ChevronLeft, ChevronRight, Search, UserRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { AuthenticatedMediaImage } from '../../../components/media/AuthenticatedMediaImage';
import { ContextualOperationDock } from './ContextualOperationDock';
import { DialogHeader } from './ProjectCostSummary';
import { listCharacters, listOwnedCharacters } from '../../profiles/api/profileApi';
import type { z } from 'zod';
import { characterSummarySchema } from '../../profiles/schemas/profileSchemas';
import { enhanceCinematicStory } from '../api/cinematicApi';
import type { CinematicSetupDraft, CinematicStoryEnhancement } from '../schemas/cinematicSchemas';

type OpenDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

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

export function SceneDirectorDialog({ open, onOpenChange }: OpenDialogProps) {
  const { t } = useTranslation('cinematic');
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="cinematic-dialog__overlay" />
        <Dialog.Content className="cinematic-dialog__content cinematic-dialog__content--wide">
          <DialogHeader title={t('cinematic.director.title')} description={t('cinematic.director.description')} />
          <div className="cinematic-director-grid">
            {(['purpose', 'camera', 'blocking', 'lighting', 'performance', 'audio', 'continuity', 'transition'] as const).map(item => (
              <label key={item}><span>{t(`cinematic.director.${item}`)}</span><textarea rows={3} defaultValue={t(`cinematic.director.${item}Value`)} /></label>
            ))}
          </div>
          <ContextualOperationDock title={t('cinematic.director.operationTitle')} description={t('cinematic.director.operationDescription')} operation={t('cinematic.director.operation')} credits={5} actionLabel={t('cinematic.director.generate')} />
          <div className="cinematic-dialog__footer"><Dialog.Close asChild><Button>{t('cinematic.actions.close')}</Button></Dialog.Close><Button variant="primary" disabled icon={<Camera aria-hidden="true" />}>{t('cinematic.director.save')}</Button></div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

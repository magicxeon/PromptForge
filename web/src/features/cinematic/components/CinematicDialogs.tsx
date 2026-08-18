import * as Dialog from '@radix-ui/react-dialog';
import { Camera, Check, Search, UserRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { AuthenticatedMediaImage } from '../../../components/media/AuthenticatedMediaImage';
import { ContextualOperationDock } from './ContextualOperationDock';
import { DialogHeader } from './ProjectCostSummary';
import { listCharacters, listOwnedCharacters } from '../../profiles/api/profileApi';
import type { z } from 'zod';
import { characterSummarySchema } from '../../profiles/schemas/profileSchemas';

type OpenDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function StoryEnhanceDialog({ open, onOpenChange }: OpenDialogProps) {
  const { t } = useTranslation('cinematic');
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="cinematic-dialog__overlay" />
        <Dialog.Content className="cinematic-dialog__content cinematic-dialog__content--wide">
          <DialogHeader title={t('cinematic.enhance.title')} description={t('cinematic.enhance.description')} />
          <div className="cinematic-compare-grid">
            <article><span>{t('cinematic.enhance.original')}</span><p>{t('cinematic.enhance.originalCopy')}</p></article>
            <article className="is-enhanced"><span>{t('cinematic.enhance.preview')}</span><p>{t('cinematic.enhance.previewCopy')}</p></article>
          </div>
          <ContextualOperationDock
            title={t('cinematic.enhance.operationTitle')}
            description={t('cinematic.enhance.operationDescription')}
            operation={t('cinematic.enhance.operation')}
            credits={3}
            actionLabel={t('cinematic.enhance.generate')}
          />
          <div className="cinematic-dialog__footer">
            <Dialog.Close asChild><Button>{t('cinematic.actions.cancel')}</Button></Dialog.Close>
            <Button variant="primary" disabled icon={<Check aria-hidden="true" />}>{t('cinematic.enhance.apply')}</Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const characterFixtures = [
  { id: 'mira', name: 'Mira Chen', gender: 'female', age: '20-29', ethnicity: 'east-asian', scope: 'mine' },
  { id: 'noah', name: 'Noah Lin', gender: 'male', age: '20-29', ethnicity: 'east-asian', scope: 'mine' },
  { id: 'amara', name: 'Amara Reed', gender: 'female', age: '30-39', ethnicity: 'mixed', scope: 'community' },
  { id: 'theo', name: 'Theo Martin', gender: 'male', age: '30-39', ethnicity: 'european', scope: 'community' }
] as const;

export type CharacterCandidate = z.infer<typeof characterSummarySchema> & { scope?: 'mine' | 'community' };

export function CharacterPickerDialog({ open, onOpenChange, onSelect }: OpenDialogProps & { onSelect?: (character: CharacterCandidate) => void }) {
  const { t } = useTranslation('cinematic');
  const [query, setQuery] = useState('');
  const [gender, setGender] = useState('all');
  const [age, setAge] = useState('all');
  const [ethnicity, setEthnicity] = useState('all');
  const [scope, setScope] = useState('all');
  const [selectedId, setSelectedId] = useState('');
  const [loadedCandidates, setLoadedCandidates] = useState<CharacterCandidate[] | null>(null);
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    Promise.all([listOwnedCharacters(), listCharacters({ reusePolicy: 'public_reusable' })])
      .then(([owned, community]) => {
        if (cancelled) return;
        const unique = new Map<string, CharacterCandidate>();
        owned.items.filter(item => item.handoffAvailable).forEach(item => unique.set(item.id, { ...item, scope: 'mine' }));
        community.items.filter(item => item.handoffAvailable).forEach(item => {
          if (!unique.has(item.id)) unique.set(item.id, { ...item, scope: 'community' });
        });
        setLoadedCandidates([...unique.values()]);
      })
      .catch(() => { if (!cancelled) setLoadedCandidates([]); });
    return () => { cancelled = true; };
  }, [open]);
  const ethnicityOptions = useMemo(() => [...new Set((loadedCandidates || [])
    .map(item => item.identityFacets?.ethnicity)
    .filter((value): value is string => Boolean(value)))]
    .sort((left, right) => left.localeCompare(right)), [loadedCandidates]);
  const candidates = useMemo(() => (loadedCandidates || characterFixtures).filter(item => {
    const name = 'displayName' in item ? item.displayName : item.name;
    const facets = 'identityFacets' in item ? item.identityFacets : undefined;
    const fixtureGender = 'gender' in item ? item.gender : null;
    const fixtureAge = 'age' in item ? item.age : null;
    const fixtureEthnicity = 'ethnicity' in item ? item.ethnicity : null;
    return name.toLowerCase().includes(query.toLowerCase())
    && (gender === 'all' || (facets?.presentationGender || fixtureGender) === gender)
    && (age === 'all' || (fixtureAge ? fixtureAge === age : overlapsAgeBucket(facets?.ageRange, age)))
    && (ethnicity === 'all' || (facets?.ethnicity || fixtureEthnicity) === ethnicity)
    && (scope === 'all' || item.scope === scope)
  }), [age, ethnicity, gender, loadedCandidates, query, scope]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="cinematic-dialog__overlay" />
        <Dialog.Content className="cinematic-dialog__content cinematic-dialog__content--wide">
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
          <div className="cinematic-character-results">
            {candidates.map(item => {
              const name = 'displayName' in item ? item.displayName : item.name;
              const detail = 'age' in item ? `${item.age} · ${item.ethnicity}` : item.personalitySummary;
              const mediaUrl = characterCandidateMediaUrl(item);
              const fallback = <span className="cinematic-character-results__fallback"><UserRound aria-hidden="true" /></span>;
              return <button type="button" className={selectedId === item.id ? 'is-selected' : ''} key={item.id} onClick={() => setSelectedId(item.id)}><span className="cinematic-character-results__media">{mediaUrl ? <AuthenticatedMediaImage src={mediaUrl} alt="" fallback={fallback} /> : fallback}</span><strong>{name}</strong><small>{detail}</small></button>;
            })}
          </div>
          <div className="cinematic-dialog__footer"><Dialog.Close asChild><Button>{t('cinematic.actions.close')}</Button></Dialog.Close><Button variant="primary" disabled={!selectedId || !loadedCandidates} onClick={() => { const selected = loadedCandidates?.find(item => item.id === selectedId); if (selected) { onSelect?.(selected); onOpenChange(false); } }}>{t('cinematic.picker.use')}</Button></div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function characterCandidateMediaUrl(item: Partial<CharacterCandidate>) {
  return item.thumbnailUrl
    || item.faceThumbnailUrl
    || item.displayImageUrl
    || item.imageUrl
    || null;
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

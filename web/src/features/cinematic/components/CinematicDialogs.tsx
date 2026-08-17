import * as Dialog from '@radix-ui/react-dialog';
import { Camera, Check, Search, Sparkles, UserRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { ContextualOperationDock } from './ContextualOperationDock';
import { DialogHeader } from './ProjectCostSummary';

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

export function CharacterPickerDialog({ open, onOpenChange }: OpenDialogProps) {
  const { t } = useTranslation('cinematic');
  const [query, setQuery] = useState('');
  const [gender, setGender] = useState('all');
  const [scope, setScope] = useState('all');
  const candidates = useMemo(() => characterFixtures.filter(item =>
    item.name.toLowerCase().includes(query.toLowerCase())
    && (gender === 'all' || item.gender === gender)
    && (scope === 'all' || item.scope === scope)
  ), [gender, query, scope]);

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
            <select aria-label={t('cinematic.picker.age')} defaultValue="all"><option value="all">{t('cinematic.picker.allAges')}</option><option value="20-29">20-29</option><option value="30-39">30-39</option></select>
            <select aria-label={t('cinematic.picker.ethnicity')} defaultValue="all"><option value="all">{t('cinematic.picker.allEthnicities')}</option><option value="east-asian">East Asian</option><option value="mixed">Mixed</option><option value="european">European</option></select>
            <select aria-label={t('cinematic.picker.scope')} value={scope} onChange={event => setScope(event.target.value)}><option value="all">{t('cinematic.picker.allSources')}</option><option value="mine">{t('cinematic.picker.mine')}</option><option value="community">{t('cinematic.picker.community')}</option></select>
          </div>
          <div className="cinematic-character-results">
            {candidates.map(item => <button type="button" key={item.id}><span><UserRound aria-hidden="true" /></span><strong>{item.name}</strong><small>{item.age} · {item.ethnicity}</small></button>)}
          </div>
          <div className="cinematic-dialog__footer"><Dialog.Close asChild><Button>{t('cinematic.actions.close')}</Button></Dialog.Close><Button variant="primary" disabled>{t('cinematic.picker.use')}</Button></div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
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

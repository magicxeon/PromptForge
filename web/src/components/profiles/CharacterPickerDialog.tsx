import * as Dialog from '@radix-ui/react-dialog';
import { Check, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import { AuthenticatedMediaImage } from '../media/AuthenticatedMediaImage';

export type CharacterPickerItem = { id: string; name: string; image?: string | null; unavailableReason?: string };
export function CharacterPickerDialog({ open, onOpenChange, items, recent, current, selectedId, onSelect,
  search, onSearch, scope, onScope, loading, error, onRetry, pending, onConfirm, page, hasMore, onPrevious, onNext
}: {
  open: boolean; onOpenChange: (open: boolean) => void; items: CharacterPickerItem[]; recent: CharacterPickerItem[];
  current?: CharacterPickerItem | null; selectedId: string | null; onSelect: (id: string) => void;
  search: string; onSearch: (value: string) => void; scope: 'mine' | 'community'; onScope: (value: 'mine' | 'community') => void;
  loading: boolean; error?: string | null; onRetry: () => void; pending: boolean; onConfirm: () => void;
  page: number; hasMore: boolean; onPrevious: () => void; onNext: () => void;
}) {
  const { t } = useTranslation('react-ui');
  const renderItems = (entries: CharacterPickerItem[]) => <div className="character-picker__grid">{entries.map(item =>
    <button key={item.id} type="button" className={item.id === selectedId ? 'is-selected' : ''}
      aria-label={item.name} aria-pressed={item.id === selectedId} disabled={pending || Boolean(item.unavailableReason)}
      onClick={() => onSelect(item.id)} title={item.unavailableReason || item.name}>
      <span className="character-picker__image"><AuthenticatedMediaImage src={item.image || ''} alt="" fallback={<span>{item.name.slice(0, 1)}</span>} />
        {item.id === selectedId ? <Check aria-hidden="true" /> : null}</span>
      <strong>{item.name}</strong>{item.unavailableReason ? <small>{item.unavailableReason}</small> : null}
    </button>)}</div>;
  return <Dialog.Root open={open} onOpenChange={value => { if (!pending) onOpenChange(value); }}><Dialog.Portal>
    <Dialog.Overlay className="character-picker__overlay" />
    <Dialog.Content className="character-picker" aria-describedby={undefined} onEscapeKeyDown={event => { if (pending) event.preventDefault(); }}>
      <header><Dialog.Title>{t('ui.characterPicker.title')}</Dialog.Title><Dialog.Close asChild><Button disabled={pending} icon={<X />} aria-label={t('ui.action.close')} /></Dialog.Close></header>
      <div className="character-picker__toolbar"><label><Search aria-hidden="true" /><input maxLength={160} value={search} onChange={event => onSearch(event.target.value)} placeholder={t('ui.characterPicker.search')} aria-label={t('ui.characterPicker.search')} disabled={pending} /></label>
        <select value={scope} onChange={event => onScope(event.target.value as 'mine' | 'community')} aria-label={t('ui.characterPicker.source')} disabled={pending}>
          <option value="mine">{t('ui.characterPicker.mine')}</option><option value="community">{t('ui.characterPicker.community')}</option>
        </select></div>
      <div className="character-picker__body">
        {current ? <section><h3>{t('ui.characterPicker.current')}</h3>{renderItems([current])}</section> : null}
        {recent.length ? <section><h3>{t('ui.characterPicker.recent')}</h3>{renderItems(recent.filter(item => item.id !== current?.id))}</section> : null}
        <section><h3>{t(`ui.characterPicker.${scope}`)}</h3>
          {error ? <div role="alert">{error}<Button onClick={onRetry}>{t('ui.characterPicker.retry')}</Button></div> : null}
          {loading ? <p role="status">{t('ui.characterPicker.loading')}</p> : renderItems(items)}
          {!loading && !items.length ? <p>{t('ui.characterPicker.empty')}</p> : null}
        </section>
      </div>
      <footer><div><Button icon={<ChevronLeft />} aria-label={t('ui.characterPicker.previous')} disabled={page === 0 || loading || pending} onClick={onPrevious} /><span>{page + 1}</span><Button icon={<ChevronRight />} aria-label={t('ui.characterPicker.next')} disabled={!hasMore || loading || pending} onClick={onNext} /></div>
        <Button variant="primary" disabled={!selectedId || pending || loading} icon={<Check />} onClick={onConfirm}>{t(pending ? 'ui.characterPicker.applying' : 'ui.characterPicker.use')}</Button></footer>
    </Dialog.Content>
  </Dialog.Portal></Dialog.Root>;
}

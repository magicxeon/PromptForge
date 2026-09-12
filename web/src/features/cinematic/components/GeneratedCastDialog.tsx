import * as Dialog from '@radix-ui/react-dialog';
import { Check, UserRound, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { ProcessingSpinner } from '../../../components/ui/ProcessingSpinner';
import { GeneratedLookSourceField } from '../../../components/generation/GeneratedLookSourceField';
import { useActor } from '../../../lib/auth/ActorProvider';
import type { TrustedVideoSource } from '../../generation/api/trustedVideoSources';

export function GeneratedCastDialog({ open, onOpenChange, onCharacter, onSelect }: {
  open: boolean; onOpenChange: (open: boolean) => void; onCharacter: () => void;
  onSelect: (source: TrustedVideoSource, name: string) => Promise<void>;
}) {
  const { t } = useTranslation('cinematic');
  const { actor } = useActor();
  const [source, setSource] = useState<TrustedVideoSource | null>(null);
  const [name, setName] = useState('');
  const [ready, setReady] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { setSource(null); setName(''); setReady(false); setConfirmed(false); setError(null); }, [open, actor?.userId]);
  const canAssign = source?.eligible && ready && confirmed && name.trim() && !pending;
  async function assign() {
    if (!canAssign || !source) return;
    setPending(true); setError(null);
    try { await onSelect(source, name.trim()); onOpenChange(false); }
    catch (cause) { setError(cause instanceof Error ? cause.message : t('cinematic.status.saveFailed')); }
    finally { setPending(false); }
  }
  return <Dialog.Root open={open} onOpenChange={value => { if (!pending) onOpenChange(value); }}>
    <Dialog.Portal><Dialog.Overlay className="character-look-dialog__overlay" />
      <Dialog.Content className="character-look-dialog__content">
        <header className="character-look-dialog__header">
          <div><Dialog.Title>{t('cinematic.castSource.title')}</Dialog.Title>
            <Dialog.Description>{t('cinematic.castSource.description')}</Dialog.Description></div>
          <Button size="icon" variant="ghost" icon={<X />} disabled={pending} aria-label={t('cinematic.actions.close')} onClick={() => onOpenChange(false)} />
        </header>
        <div className="character-look-draft-form">
          <Button icon={<UserRound />} disabled={pending} onClick={onCharacter}>{t('cinematic.castSource.character')}</Button>
          <GeneratedLookSourceField value={source} disabled={pending} onPreviewReady={setReady}
            onChange={value => { setSource(value); setReady(false); setConfirmed(false); setError(null); }} />
          <label className="block space-y-2"><span>{t('cinematic.castSource.name')}</span>
            <input className="w-full" maxLength={80} value={name} disabled={pending} onChange={event => setName(event.target.value)} /></label>
          <label className="character-look-rights-row"><input type="checkbox" checked={confirmed}
            disabled={pending || !ready} onChange={event => setConfirmed(event.target.checked)} /><span>{t('cinematic.castSource.confirm')}</span></label>
          {error ? <p role="alert">{error}</p> : null}
        </div>
        <footer className="character-look-dialog__footer">
          <Button variant="primary" disabled={!canAssign} icon={pending ? <ProcessingSpinner /> : <Check />}
            onClick={() => void assign()}>{t(pending ? 'cinematic.save.saving' : 'cinematic.castSource.assign')}</Button>
        </footer>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}

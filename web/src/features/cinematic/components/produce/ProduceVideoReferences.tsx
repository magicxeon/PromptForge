import { Image as ImageIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ThemeSelect } from '../../../../components/ui/ThemeSelect';
import { AuthenticatedMediaImage } from '../../../../components/media/AuthenticatedMediaImage';

type ReferenceMode = 'storyboard_only' | 'storyboard_and_looks';
type Props = {
  mode: ReferenceMode;
  disabled: boolean;
  loading: boolean;
  onChange: (mode: ReferenceMode) => void;
  references?: Array<{ imageNumber: number; assetId: string | null; purpose: string;
    roleName: string | null; lookName: string | null; previewUrl: string }>;
};

export function ProduceVideoReferences({ mode, disabled, loading, onChange, references }: Props) {
  const { t } = useTranslation('cinematic');
  return <section className="min-w-0 space-y-3 py-2 text-sm" aria-label={t('cinematic.produce.references.title')}>
    <strong>{t('cinematic.produce.references.title')}</strong>
    <ThemeSelect value={mode} ariaLabel={t('cinematic.produce.references.mode')} disabled={disabled}
      onValueChange={value => onChange(value as ReferenceMode)} options={[
        { value: 'storyboard_only', label: t('cinematic.produce.references.single') },
        { value: 'storyboard_and_looks', label: t('cinematic.produce.references.multiple') }
      ]} />
    {mode === 'storyboard_and_looks' ? <p className="text-xs text-[var(--mpf-text-muted)]">{t('cinematic.produce.references.caveat')}</p> : null}
    <div aria-live="polite" aria-busy={loading}>
      {loading ? <p className="text-xs">{t('cinematic.produce.preparingQuote')}</p> : <ol className="space-y-2">
        {references?.map(reference => <li key={`${reference.imageNumber}:${reference.assetId}`} className="grid min-w-0 grid-cols-[3rem_minmax(0,1fr)] items-center gap-2">
          <div className="flex size-12 items-center justify-center overflow-hidden rounded border border-[var(--mpf-border)]">
            <AuthenticatedMediaImage src={reference.previewUrl} alt="" className="size-full object-contain" fallback={<ImageIcon className="size-5" aria-hidden="true" />} />
          </div>
          <div className="min-w-0 break-words text-xs">
            <strong>{t('cinematic.produce.references.image', { number: reference.imageNumber })}: {t(reference.purpose === 'storyboard_opening' ? 'cinematic.produce.references.storyboard' : 'cinematic.produce.references.look')}</strong>
            {reference.roleName ? <p>{reference.roleName} / {reference.lookName}</p> : null}
          </div>
        </li>)}
      </ol>}
    </div>
  </section>;
}

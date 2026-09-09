import { useId, useState, type ReactNode } from 'react';
import { ClipboardList, UserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { LookSheetDefinition } from '../../features/profiles/schemas/lookSheetDefinitionSchemas';

export function CharacterLookSheetForm({ value, onChange, ageLabel, outfitLocked = false, identitySlot, enhancementSlot }: {
  value: LookSheetDefinition; onChange: (value: LookSheetDefinition) => void;
  ageLabel?: string; outfitLocked?: boolean;
  identitySlot?: ReactNode; enhancementSlot?: ReactNode;
}) {
  const { t } = useTranslation('playground');
  const prefix = useId();
  const [tooLong, setTooLong] = useState(false);
  return <div className="look-sheet-form grid min-w-0 gap-4">
    <div className="look-sheet-group-heading"><h3><UserRound aria-hidden="true" />{t('lookSheet.identityHeading')}</h3>{identitySlot}</div>
    <div className="look-sheet-identity-row">
      <label className="grid gap-1 text-sm" htmlFor={`${prefix}-name`}>{t('lookSheet.name')}
        <input id={`${prefix}-name`} className="w-full min-w-0 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] p-2" required maxLength={80} value={value.name} onChange={e => onChange({ ...value, name: e.target.value })} />
      </label>
      <label className="grid gap-1 text-sm" htmlFor={`${prefix}-age`}>{t('lookSheet.age')}
        {ageLabel ? <input id={`${prefix}-age`} readOnly value={ageLabel} className="w-full min-w-0 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] p-2" />
          : <input id={`${prefix}-age`} type="number" min={18} max={120} step={1} required className="w-full min-w-0 rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] p-2" value={value.ageYears ?? ''} onChange={e => onChange({ ...value, ageYears: e.target.value ? Number(e.target.value) : null })} />}
      </label>
    </div>
    <div className="look-sheet-character-prompt">
      <label className="text-base font-semibold" htmlFor={`${prefix}-appearance`}>{t('lookSheet.appearance')}</label>
      <textarea id={`${prefix}-appearance`} rows={8} required value={value.appearance}
        aria-describedby={`${prefix}-count ${prefix}-limit`}
        onChange={e => {
          const invalid = [...e.target.value].length > 2000;
          setTooLong(invalid);
          if (!invalid) onChange({ ...value, appearance: e.target.value });
        }} />
      <div className="flex flex-wrap justify-between gap-2 text-xs">
        <span id={`${prefix}-limit`} role={tooLong ? 'alert' : undefined}>{tooLong ? t('lookSheet.promptLimit') : ''}</span>
        <span id={`${prefix}-count`}>{t('lookSheet.promptCount', { count: [...value.appearance].length, max: 2000 })}</span>
      </div>
    </div>
    <div className="look-sheet-group-heading"><h3><ClipboardList aria-hidden="true" />{t('lookSheet.storyHeading')}</h3></div>
    <div className="look-sheet-secondary-fields grid min-w-0 gap-4">
    {(['situation', 'outfit', 'personality'] as const).map(field => <label key={field} className="grid min-w-0 gap-2 text-sm" htmlFor={`${prefix}-${field}`}>
      <span>{t(`lookSheet.${field}`)}</span>
      <textarea id={`${prefix}-${field}`} rows={field === 'personality' ? 2 : 3}
        className="w-full min-w-0 resize-y rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] p-2"
        required={field === 'situation'}
        maxLength={{ situation: 800, outfit: 800, personality: 240 }[field]}
        readOnly={field === 'outfit' && outfitLocked}
        value={value[field]} onChange={e => onChange({ ...value, [field]: e.target.value })} />
    </label>)}
    </div>
    {enhancementSlot}
  </div>;
}

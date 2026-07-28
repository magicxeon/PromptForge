import { Columns3, Plus, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import type { ProviderCatalog } from '../../features/generation/schemas/generationSchemas';
import type { ComparisonSlotInput } from '../../features/generation/api/generationApi';

const ratioLabels: Record<string, string> = {
  '6:8': '6:8 Portrait',
  '1:1': '1:1 Square',
  '9:16': '9:16 Mobile',
  '16:9': '16:9 Wide',
  '4:5': '4:5 Social'
};

export type EngineValue = {
  provider: string;
  model: string;
  resolution: string | null;
  aspectRatio: string;
};

export function EngineTargetPanel({
  catalog,
  value,
  comparison,
  comparisonSlots,
  allowComparison = true,
  onChange,
  onComparisonChange,
  onSlotsChange
}: {
  catalog: ProviderCatalog;
  value: EngineValue;
  comparison: boolean;
  comparisonSlots: ComparisonSlotInput[];
  allowComparison?: boolean;
  onChange: (value: EngineValue) => void;
  onComparisonChange: (active: boolean) => void;
  onSlotsChange: (slots: ComparisonSlotInput[]) => void;
}) {
  const { t } = useTranslation('playground');
  const provider = catalog.providers.find(item => item.id === value.provider) || catalog.providers[0];
  const model = provider?.models.find(item => item.id === value.model) || provider?.models[0];
  const ratios = model?.capabilities.aspectRatios.length ? model.capabilities.aspectRatios : ['6:8', '1:1', '16:9'];
  const resolutions = model?.capabilities.resolutions || [];

  function setProvider(providerId: string) {
    const next = catalog.providers.find(item => item.id === providerId);
    const nextModel = next?.models.find(item => item.id === next.defaultModel) || next?.models[0];
    onChange({
      ...value,
      provider: providerId,
      model: nextModel?.id || '',
      resolution: nextModel?.capabilities.resolutions?.[0] || nextModel?.defaults?.resolution || null
    });
  }

  return (
    <section id="generation-engine" className="border border-[var(--mpf-border)] bg-[var(--mpf-surface)] p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--mpf-border)] pb-4">
        <div><h2 className="m-0 text-lg">{t('playground.section.engine')}</h2><p className="mb-0 mt-1 text-xs text-[var(--mpf-text-muted)]">{t('playground.engine.help')}</p></div>
        {allowComparison ? <Button variant={comparison ? 'primary' : 'secondary'} icon={<Columns3 className="size-4" />} onClick={() => onComparisonChange(!comparison)}>{t('playground.action.compare')}{comparison ? ` ${comparisonSlots.length}/4` : ''}</Button> : null}
      </div>
      {!comparison ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('playground.engine.provider')}><select value={value.provider} onChange={event => setProvider(event.target.value)} className="h-11 w-full border border-[var(--mpf-border)] bg-black/30 px-3">{catalog.providers.map(item => <option key={item.id} value={item.id}>{localized(item.displayName)}</option>)}</select></Field>
          <Field label={t('playground.engine.model')}><select value={value.model} onChange={event => {
            const next = provider?.models.find(item => item.id === event.target.value);
            onChange({ ...value, model: event.target.value, resolution: next?.capabilities.resolutions?.[0] || next?.defaults?.resolution || null });
          }} className="h-11 w-full border border-[var(--mpf-border)] bg-black/30 px-3">{provider?.models.map(item => <option key={item.id} value={item.id}>{localized(item.displayName)}</option>)}</select></Field>
          {resolutions.length ? <Field label={t('playground.engine.resolution')}><select value={value.resolution || ''} onChange={event => onChange({ ...value, resolution: event.target.value || null })} className="h-11 w-full border border-[var(--mpf-border)] bg-black/30 px-3">{resolutions.map(item => <option key={item} value={item}>{item.toUpperCase()}</option>)}</select></Field> : null}
          <div className="sm:col-span-2"><span className="mb-2 block text-sm text-[var(--mpf-text-muted)]">{t('playground.engine.aspect')}</span><div className="flex flex-wrap gap-2">{ratios.map(ratio => <Button key={ratio} size="sm" variant={value.aspectRatio === ratio ? 'primary' : 'secondary'} onClick={() => onChange({ ...value, aspectRatio: ratio })}>{ratioLabels[ratio] || ratio}</Button>)}</div></div>
        </div>
      ) : (
        <ComparisonConfigurator catalog={catalog} slots={comparisonSlots} onChange={onSlotsChange} />
      )}
    </section>
  );
}

function ComparisonConfigurator({ catalog, slots, onChange }: { catalog: ProviderCatalog; slots: ComparisonSlotInput[]; onChange: (slots: ComparisonSlotInput[]) => void }) {
  const { t } = useTranslation('playground');
  function patch(index: number, next: Partial<ComparisonSlotInput>) {
    onChange(slots.map((slot, slotIndex) => slotIndex === index ? { ...slot, ...next } : slot));
  }
  return (
    <div>
      <div className="mb-3 flex items-center justify-between"><strong className="text-sm text-amber-300">{t('playground.comparison.title')}</strong><span className="text-xs text-[var(--mpf-text-muted)]">{slots.length} / 4</span></div>
      <div className="grid gap-3 lg:grid-cols-2">
        {slots.map((slot, index) => {
          const provider = catalog.providers.find(item => item.id === slot.provider) || catalog.providers[0];
          return <article key={slot.id} className="border border-[var(--mpf-border-strong)] bg-black/20 p-3"><div className="mb-3 flex items-center justify-between"><strong>{t('playground.comparison.slot')} {index + 1}</strong><Button size="icon" variant="ghost" title={t('playground.comparison.remove')} disabled={slots.length <= 2} icon={<X className="size-4" />} onClick={() => onChange(slots.filter(item => item.id !== slot.id))} /></div><div className="grid gap-3 sm:grid-cols-2"><Field label={t('playground.engine.provider')}><select value={slot.provider} onChange={event => {
            const nextProvider = catalog.providers.find(item => item.id === event.target.value);
            patch(index, { provider: event.target.value, model: nextProvider?.defaultModel || nextProvider?.models[0]?.id || '' });
          }} className="h-10 w-full border border-[var(--mpf-border)] bg-black/35 px-2">{catalog.providers.map(item => <option key={item.id} value={item.id}>{localized(item.displayName)}</option>)}</select></Field><Field label={t('playground.engine.model')}><select value={slot.model} onChange={event => patch(index, { model: event.target.value })} className="h-10 w-full border border-[var(--mpf-border)] bg-black/35 px-2">{provider?.models.map(item => <option key={item.id} value={item.id}>{localized(item.displayName)}</option>)}</select></Field></div></article>;
        })}
      </div>
      <Button className="mt-3" size="sm" disabled={slots.length >= 4} icon={<Plus className="size-4" />} onClick={() => {
        const provider = catalog.providers[0];
        onChange([...slots, { id: createSlotId(), provider: provider?.id || '', model: provider?.defaultModel || provider?.models[0]?.id || '' }]);
      }}>{t('playground.comparison.add')}</Button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid gap-1 text-sm text-[var(--mpf-text-muted)]"><span>{label}</span>{children}</label>;
}

function createSlotId() {
  return `slot_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function localized(value: string | Record<string, string>) {
  return typeof value === 'string' ? value : value.en || value.th || Object.values(value)[0] || '';
}

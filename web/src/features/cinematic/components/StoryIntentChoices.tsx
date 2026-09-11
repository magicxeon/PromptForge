import { ArrowUp, ArrowDown, ChevronDown, ListFilter } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import type { CinematicStoryAuthoring } from '../schemas/cinematicSchemas';

export function StoryIntentChoices({ label, prefix, rule, value, onChange, disabled = false }: {
  label: string; prefix: string; rule: CinematicStoryAuthoring['choices']['genres'];
  value: string[]; onChange: (values: string[]) => void; disabled?: boolean;
}) {
  const { t } = useTranslation('cinematic');
  const move = (index: number, offset: number) => {
    const next = [...value];
    [next[index], next[index + offset]] = [next[index + offset]!, next[index]!];
    onChange(next);
  };
  return <fieldset className="cinematic-intent-choice" disabled={disabled}>
    <legend><span>{label}</span><span className="cinematic-intent-choice__count">{value.length} / {rule.maxSelections}</span></legend>
    <ol className="cinematic-intent-choice__selected">
      {value.map((id, index) => <li key={id}>
        <span className="cinematic-intent-choice__rank" aria-hidden="true">{index + 1}</span>
        <span className="cinematic-intent-choice__name">{t(`${prefix}.${id}`)}</span>
        <div className="cinematic-intent-choice__order">
          <Button className="cinematic-intent-choice__move" type="button" size="icon" variant="ghost" disabled={index === 0 || disabled} icon={<ArrowUp aria-hidden="true" />} aria-label={t('cinematic.intent.moveEarlier', { name: t(`${prefix}.${id}`) })} title={t('cinematic.intent.moveEarlier', { name: t(`${prefix}.${id}`) })} onClick={() => move(index, -1)} />
          <Button className="cinematic-intent-choice__move" type="button" size="icon" variant="ghost" disabled={index === value.length - 1 || disabled} icon={<ArrowDown aria-hidden="true" />} aria-label={t('cinematic.intent.moveLater', { name: t(`${prefix}.${id}`) })} title={t('cinematic.intent.moveLater', { name: t(`${prefix}.${id}`) })} onClick={() => move(index, 1)} />
        </div>
      </li>)}
    </ol>
    <details className="cinematic-intent-choice__disclosure">
      <summary><ListFilter aria-hidden="true" /><span>{t('cinematic.intent.options')}</span><ChevronDown aria-hidden="true" /></summary>
      <div className="cinematic-intent-choice__options">
        {rule.ids.map(id => {
          const selected = value.includes(id);
          const compatible = value.filter(other => !(rule.incompatiblePairs || []).some(pair => pair.includes(id) && pair.includes(other)));
          return <label key={id} className="cinematic-intent-choice__option" data-selected={selected}>
            <input type="checkbox" checked={selected} disabled={disabled || (!selected && compatible.length >= rule.maxSelections) || (selected && value.length === 1)}
              onChange={() => onChange(selected ? value.filter(item => item !== id) : [...compatible, id])} />
            <span>{t(`${prefix}.${id}`)}</span>
          </label>;
        })}
      </div>
    </details>
  </fieldset>;
}

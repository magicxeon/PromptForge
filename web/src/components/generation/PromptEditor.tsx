import { Copy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';

export function PromptEditor({
  value,
  negativeValue,
  onChange,
  onNegativeChange,
  compact = false
}: {
  value: string;
  negativeValue: string;
  onChange: (value: string) => void;
  onNegativeChange: (value: string) => void;
  compact?: boolean;
}) {
  const { t } = useTranslation('playground');
  return (
    <section id="generation-prompt" className="border border-cyan-400/45 bg-[var(--mpf-surface)] p-4 shadow-[0_0_20px_rgb(240_45_145_/_0.13)]">
      <div className="mb-2 flex items-center justify-between gap-3">
        <label htmlFor="generation-main-prompt" className="font-semibold">{t('playground.prompt.label')}</label>
        <Button variant="ghost" size="icon" title={t('playground.prompt.copy')} icon={<Copy className="size-4" />} onClick={() => void navigator.clipboard.writeText(value)} />
      </div>
      <textarea
        id="generation-main-prompt"
        value={value}
        maxLength={8000}
        onChange={event => onChange(event.target.value)}
        placeholder={t('playground.prompt.placeholder')}
        className={`${compact ? 'h-36' : 'h-52'} w-full resize-y border border-[var(--mpf-border-strong)] bg-black/35 p-4 text-sm leading-6`}
      />
      <div className="mt-2 text-right text-xs text-[var(--mpf-text-muted)]">{value.length} / 8000</div>
      <details className="mt-3 border-t border-[var(--mpf-border)] pt-3">
        <summary className="cursor-pointer text-sm font-semibold">{t('playground.negative.label')}</summary>
        <textarea
          value={negativeValue}
          maxLength={2000}
          onChange={event => onNegativeChange(event.target.value)}
          placeholder={t('playground.negative.placeholder')}
          className="mt-3 h-24 w-full resize-y border border-[var(--mpf-border)] bg-black/35 p-3 text-sm"
        />
      </details>
    </section>
  );
}

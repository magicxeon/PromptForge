import { Copy } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';

export function PromptEditor({
  value,
  negativeValue,
  onChange,
  onNegativeChange,
  compact = false,
  variant = 'default',
  primaryLabel,
  primaryDescription,
  primaryPlaceholder,
  primaryMaxLength = 8000,
  primaryFooter,
  showNegative = true,
  inputId = 'generation-main-prompt'
}: {
  value: string;
  negativeValue: string;
  onChange: (value: string) => void;
  onNegativeChange: (value: string) => void;
  compact?: boolean;
  variant?: 'default' | 'playground';
  primaryLabel?: ReactNode;
  primaryDescription?: ReactNode;
  primaryPlaceholder?: string;
  primaryMaxLength?: number;
  primaryFooter?: ReactNode;
  showNegative?: boolean;
  inputId?: string;
}) {
  const { t } = useTranslation('playground');
  if (variant === 'playground') {
    return (
      <div id="generation-prompt" className="playground-prompt-editor">
        <section className="playground-prompt-editor__panel playground-prompt-editor__panel--primary">
          <div className="playground-prompt-editor__heading">
            <label htmlFor={inputId}>{primaryLabel || t('playground.prompt.label')}</label>
            <Button variant="ghost" size="icon" title={t('playground.prompt.copy')} icon={<Copy className="size-4" />} onClick={() => void navigator.clipboard.writeText(value)} />
          </div>
          <p className="playground-prompt-editor__description" style={{ marginTop: '-13px' }}>
            {primaryDescription || t('playground.prompt.description')}
          </p>
          <textarea
            id={inputId}
            value={value}
            maxLength={primaryMaxLength}
            onChange={event => onChange(event.target.value)}
            placeholder={primaryPlaceholder || t('playground.prompt.placeholder')}
            className="playground-prompt-editor__main"
          />
          <div className="playground-prompt-editor__count">{value.length} / {primaryMaxLength}</div>
          {primaryFooter}
        </section>
        {showNegative ? <section className="playground-prompt-editor__panel">
          <div className="playground-prompt-editor__heading">
            <label htmlFor="generation-negative-prompt">{t('playground.negative.label')}</label>
          </div>
          <p className="playground-prompt-editor__description">
            {t('playground.negative.description')}
          </p>
          <textarea
            id="generation-negative-prompt"
            value={negativeValue}
            maxLength={2000}
            onChange={event => onNegativeChange(event.target.value)}
            placeholder={t('playground.negative.placeholder')}
            className="playground-prompt-editor__negative"
          />
          <div className="playground-prompt-editor__count">{negativeValue.length} / 2000</div>
        </section> : null}
      </div>
    );
  }
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

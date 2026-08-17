import { useEffect, useState, type FormEvent } from 'react';
import { Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import type { AttributeCatalogOption } from '../schemas/attributeCatalogSchemas';

export type AttributeDefinitionValues = {
  label: string;
  prompt: string;
  enabled: boolean;
};

export function AttributeDefinitionEditor({
  option,
  canEdit,
  readOnlyMessage,
  isSaving,
  error,
  onSave
}: {
  option: AttributeCatalogOption;
  canEdit: boolean;
  readOnlyMessage: string;
  isSaving: boolean;
  error?: string;
  onSave: (values: AttributeDefinitionValues) => void;
}) {
  const { t } = useTranslation('admin');
  const [label, setLabel] = useState(readLabel(option));
  const [prompt, setPrompt] = useState(readPrompt(option));
  const [enabled, setEnabled] = useState(option.enabled);

  useEffect(() => {
    setLabel(readLabel(option));
    setPrompt(readPrompt(option));
    setEnabled(option.enabled);
  }, [option]);

  const dirty = label !== readLabel(option)
    || prompt !== readPrompt(option)
    || enabled !== option.enabled;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!canEdit || !dirty || !label.trim() || !prompt.trim()) return;
    onSave({ label: label.trim(), prompt: prompt.trim(), enabled });
  }

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <div className="grid gap-3 md:grid-cols-2">
        <ReadOnlyField label={t('admin.attributes.optionId')} value={option.id || t('admin.attributes.idGeneratedOnSave')} />
        <ReadOnlyField label={t('admin.attributes.attributeType')} value={t(option.presentationKind === 'visual' ? 'admin.attributes.visualCharacterAttribute' : 'admin.attributes.textAttribute')} />
        <label className="grid gap-1 text-xs font-semibold">
          <span className="text-[var(--mpf-text-muted)]">{t('admin.attributes.labelEn')}</span>
          <input
            value={label}
            required
            maxLength={140}
            disabled={!canEdit || isSaving}
            onChange={event => setLabel(event.target.value)}
            className={controlClass}
          />
        </label>
        <ReadOnlyField label={t('admin.attributes.field')} value={option.subcategory} />
        <label className="grid gap-1 text-xs font-semibold md:col-span-2">
          <span className="text-[var(--mpf-text-muted)]">{t('admin.attributes.prompt')}</span>
          <textarea
            value={prompt}
            required
            maxLength={4000}
            disabled={!canEdit || isSaving}
            onChange={event => setPrompt(event.target.value)}
            className={`${controlClass} min-h-32 resize-y py-3`}
          />
        </label>
      </div>

      <label className="flex min-h-10 items-center gap-3 border-y border-[var(--mpf-border)] py-3 text-xs font-semibold">
        <input type="checkbox" checked={enabled} disabled={!canEdit || isSaving} onChange={event => setEnabled(event.target.checked)} />
        <span>{t('admin.attributes.enabled')}</span>
      </label>

      <p className="m-0 text-xs text-[var(--mpf-text-muted)]">{t('admin.attributes.localizationOnSave')}</p>
      {error ? <p role="alert" className="m-0 text-xs text-[var(--theme-danger)]">{error}</p> : null}
      {canEdit ? (
        <div className="flex justify-end">
          <Button type="submit" variant="primary" icon={<Save className="size-4" />} disabled={!dirty || isSaving || !label.trim() || !prompt.trim()}>
            {isSaving ? t('admin.attributes.savingOption') : t('admin.attributes.saveOption')}
          </Button>
        </div>
      ) : <p className="m-0 text-xs text-[var(--theme-warning)]">{readOnlyMessage}</p>}
    </form>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return <div><span className="mb-1 block text-xs text-[var(--mpf-text-muted)]">{label}</span><div className="min-h-10 truncate border border-[var(--mpf-border)] bg-[var(--theme-background)] px-3 py-2 text-sm">{value}</div></div>;
}

function readLabel(option: AttributeCatalogOption) {
  return typeof option.label === 'string' ? option.label : option.label.en || '';
}

function readPrompt(option: AttributeCatalogOption) {
  if (typeof option.prompt === 'string') return option.prompt;
  return String(option.prompt?.default || option.prompt?.['gpt-image'] || '');
}

const controlClass = 'w-full rounded-[var(--mpf-radius-sm)] border border-[var(--mpf-border-strong)] bg-[var(--theme-background)] px-3 text-sm text-[var(--mpf-text)] outline-none focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-focus-ring)] disabled:cursor-not-allowed disabled:opacity-60';

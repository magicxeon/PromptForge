import { useTranslation } from 'react-i18next';
import type { z } from 'zod';
import type { promptBudgetSchema } from '../../features/generation/schemas/generationSchemas';
import { ProcessingSpinner } from '../ui/ProcessingSpinner';

export function PromptBudgetStatus({ value, pending = false, error }: {
  value?: z.infer<typeof promptBudgetSchema>; pending?: boolean; error?: string;
}) {
  const { t } = useTranslation('react-ui');
  if (error) return <p role="alert" className="text-sm text-[var(--mpf-text-muted)]">{error}</p>;
  if (!value && !pending) return null;
  return <p role="status" className="flex flex-wrap items-center gap-2 text-sm text-[var(--mpf-text-muted)]">
    {pending ? <ProcessingSpinner className="size-4" /> : null}
    {value ? t(`ui.promptBudget.${value.status}`, { count: value.characters, budget: value.recommendedCharacters })
      : t('ui.promptBudget.checking')}
  </p>;
}

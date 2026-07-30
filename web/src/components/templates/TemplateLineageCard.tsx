import { Layers3 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

export type TemplateLineageContext = {
  templateId: string;
  templateVersionId: string;
  templateTitle?: string;
  templateOwnerUsername?: string;
  templateUseSessionId: string;
  sourceCommunityPostId?: string | null;
  replacementSummary?: Array<{
    inputId?: string;
    inputType?: string;
    supplied?: boolean;
  }>;
};

export function TemplateLineageCard({
  context
}: {
  context?: TemplateLineageContext | null;
}) {
  const { t } = useTranslation('react-ui');
  if (!context) return null;

  const suppliedCount = (context.replacementSummary || [])
    .filter(item => item.supplied === true)
    .length;

  return (
    <section className="my-4 rounded-[var(--mpf-radius-sm)] border border-cyan-400/30 bg-cyan-400/[0.06] p-4">
      <div className="flex items-start gap-3">
        <Layers3 className="mt-0.5 size-5 shrink-0 text-cyan-300" aria-hidden="true" />
        <div className="min-w-0">
          <h2 className="m-0 text-sm text-white">
            {context.templateTitle || t('ui.history.templateLineageTitle')}
          </h2>
          <p className="mb-0 mt-1 text-[0.75rem] leading-5 text-[var(--mpf-text-muted)]">
            {t('ui.history.templateLineageDescription', {
              version: context.templateVersionId,
              count: suppliedCount
            })}
          </p>
          {context.templateOwnerUsername ? (
            <p className="mb-0 mt-1 text-[0.75rem] text-[var(--mpf-text-muted)]">
              {t('ui.history.templateCreator', {
                creator: context.templateOwnerUsername
              })}
            </p>
          ) : null}
          {context.sourceCommunityPostId ? (
            <Link
              className="mt-3 inline-flex min-h-9 items-center text-[0.75rem] font-semibold text-cyan-300"
              to={`/community/${encodeURIComponent(context.sourceCommunityPostId)}`}
            >
              {t('ui.history.viewSourceTemplate')}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}

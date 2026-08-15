import { Image as ImageIcon, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { apiMediaUrl } from '../../lib/api/apiClient';
import { GenerationLoadingIndicator } from './GenerationStageState';

export type GenerationResultGridItem = {
  id: string;
  imageUrl?: string | null;
  status: string;
  error?: { code?: string; message?: string } | string | null;
  label?: string;
};

export function GenerationResultGrid({
  items,
  onOpen,
  renderFooter
}: {
  items: GenerationResultGridItem[];
  onOpen: (id: string) => void;
  renderFooter?: (item: GenerationResultGridItem) => ReactNode;
}) {
  const { t } = useTranslation('playground');
  return (
    <div
      className="generation-result-grid"
      data-count={Math.min(4, Math.max(1, items.length))}
      aria-live="polite"
    >
      {items.map((item, index) => {
        const active = ['queued', 'processing', 'running'].includes(item.status);
        const message = typeof item.error === 'string'
          ? item.error
          : item.error?.message;
        return (
          <article
            className={`generation-result-grid__tile${renderFooter ? ' has-footer' : ''}`}
            key={item.id}
          >
            <div className="generation-result-grid__media">
              {item.imageUrl ? (
                <button
                  type="button"
                  className="generation-result-grid__open"
                  aria-label={t('playground.result.openImage')}
                  title={t('playground.result.openImage')}
                  onClick={() => onOpen(item.id)}
                >
                  <img
                    src={apiMediaUrl(item.imageUrl) || ''}
                    alt={`${t('playground.result.imageAlt')} ${index + 1}`}
                  />
                </button>
              ) : (
                <div
                  className="generation-result-grid__state"
                  role={active ? 'status' : item.status === 'failed' ? 'alert' : undefined}
                  aria-busy={active}
                >
                  {active ? (
                    <GenerationLoadingIndicator
                      className="generation-loading-indicator--compact"
                      iconClassName="size-9"
                    />
                  ) : item.status === 'failed' ? (
                    <TriangleAlert className="size-9 text-red-300" aria-hidden="true" />
                  ) : (
                    <ImageIcon className="size-9 text-[var(--theme-text-muted)]" aria-hidden="true" />
                  )}
                  <strong>{item.label || (active
                    ? t('playground.result.generating')
                    : message || item.status)}</strong>
                  {message ? <small>{message}</small> : null}
                </div>
              )}
            </div>
            {renderFooter ? (
              <div className="generation-result-grid__footer">
                {renderFooter(item)}
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

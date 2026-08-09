import { Image as ImageIcon, LoaderCircle, TriangleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { apiMediaUrl } from '../../lib/api/apiClient';

export type GenerationResultGridItem = {
  id: string;
  imageUrl?: string | null;
  status: string;
  error?: { code?: string; message?: string } | string | null;
  label?: string;
};

export function GenerationResultGrid({
  items,
  onOpen
}: {
  items: GenerationResultGridItem[];
  onOpen: (id: string) => void;
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
          <article className="generation-result-grid__tile" key={item.id}>
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
                  <LoaderCircle className="size-9 animate-spin text-amber-300" aria-hidden="true" />
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
          </article>
        );
      })}
    </div>
  );
}

import { useQuery } from '@tanstack/react-query';
import { History, RotateCcw, Send, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { ThemeSelect } from '../../../components/ui/ThemeSelect';
import { ErrorState, LoadingState } from '../../../components/ui/AsyncState';
import { Surface } from '../../../components/ui/Surface';
import { getAttributeCatalogOverview } from '../api/attributeCatalogApi';

type AttributeCategoryReleasePanelProps = {
  actorId: string;
  categories: Array<{ category: string; count: number }>;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
};

export function AttributeCategoryReleasePanel({
  actorId,
  categories,
  selectedCategory,
  onCategoryChange
}: AttributeCategoryReleasePanelProps) {
  const { t } = useTranslation('admin');
  const overview = useQuery({
    queryKey: ['admin', actorId, 'attribute-catalog', 'overview'],
    queryFn: ({ signal }) => getAttributeCatalogOverview(signal)
  });
  if (overview.isLoading) return <LoadingState label={t('admin.attributes.loadingReleases')} />;
  if (overview.isError || !overview.data) {
    return <ErrorState
      title={t('admin.attributes.releaseLoadFailed')}
      description={overview.error?.message}
      onRetry={() => void overview.refetch()}
    />;
  }

  const data = overview.data;
  const category = categories.find(item => item.category === selectedCategory) || categories[0] || null;
  return (
    <section aria-labelledby="category-release-title" className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,0.75fr)]">
      <div className="min-w-0">
        <Surface className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--mpf-border)] pb-4">
            <div>
              <span className="text-xs font-bold uppercase text-[var(--theme-primary)]">{t('admin.attributes.releaseKicker')}</span>
              <h2 id="category-release-title" className="mb-1 mt-2 text-xl">{t('admin.attributes.categoryReleases')}</h2>
              <p className="m-0 max-w-2xl text-sm text-[var(--mpf-text-muted)]">{t('admin.attributes.categoryReleasesDescription')}</p>
            </div>
            <ShieldCheck className="size-6 text-[var(--theme-primary)]" aria-hidden="true" />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-[minmax(14rem,0.7fr)_minmax(0,1.3fr)]">
            <label className="min-w-0 text-xs font-semibold">
              <span className="mb-1 block text-[var(--mpf-text-muted)]">{t('admin.attributes.category')}</span>
              <ThemeSelect
                value={category?.category || ''}
                ariaLabel={t('admin.attributes.releaseCategory')}
                options={categories.map(item => ({
                  value: item.category,
                  label: `${humanize(item.category)} (${item.count})`
                }))}
                onValueChange={onCategoryChange}
                disabled={!categories.length}
              />
            </label>
            <div className="border border-[var(--mpf-border)] bg-[var(--theme-background)] p-3">
              <strong className="block text-sm">{category ? humanize(category.category) : t('admin.attributes.noCategory')}</strong>
              <span className="mt-1 block text-xs text-[var(--mpf-text-muted)]">
                {category ? t('admin.attributes.categoryOptionCount', { count: category.count }) : t('admin.attributes.noCategoryDescription')}
              </span>
            </div>
          </div>

          <div className="mt-4 border border-[var(--theme-warning)] bg-[color-mix(in_srgb,var(--theme-warning)_8%,transparent)] p-3">
            <strong className="block text-xs text-[var(--theme-warning)]">{t('admin.attributes.categoryFacadePending')}</strong>
            <p className="mb-0 mt-1 text-xs text-[var(--mpf-text-muted)]">{t('admin.attributes.categoryFacadePendingDescription')}</p>
          </div>

          <div className="mt-4 flex justify-end">
            <Button variant="primary" icon={<Send className="size-4" />} disabled>
              {t('admin.attributes.publishSelectedCategory')}
            </Button>
          </div>
        </Surface>

        <Surface className="mt-4 overflow-hidden">
          <div className="flex min-h-14 items-center gap-2 border-b border-[var(--mpf-border)] px-4">
            <History className="size-4 text-[var(--theme-primary)]" aria-hidden="true" />
            <h2 className="m-0 text-sm">{t('admin.attributes.releaseHistory')}</h2>
          </div>
          {data.releases.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left text-xs">
                <thead className="bg-[var(--theme-background)] text-[var(--mpf-text-muted)]">
                  <tr><th className="p-3">{t('admin.attributes.releaseId')}</th><th className="p-3">{t('admin.attributes.scope')}</th><th className="p-3">{t('admin.attributes.publishedBy')}</th><th className="p-3">{t('admin.attributes.publishedAt')}</th><th className="p-3">{t('admin.attributes.action')}</th></tr>
                </thead>
                <tbody>{data.releases.map(release => (
                  <tr key={release.id} className="border-t border-[var(--mpf-border)]">
                    <td className="max-w-56 truncate p-3">{release.id}</td>
                    <td className="p-3">{t('admin.attributes.catalogWideLegacy')}</td>
                    <td className="p-3">{release.publishedByUsername || '-'}</td>
                    <td className="p-3">{formatTime(release.publishedAt)}</td>
                    <td className="p-3"><Button size="sm" icon={<RotateCcw className="size-3.5" />} disabled>{t('admin.attributes.rollback')}</Button></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ) : <p className="m-0 p-6 text-center text-xs text-[var(--mpf-text-muted)]">{t('admin.attributes.noReleaseHistory')}</p>}
        </Surface>
      </div>

      <Surface className="h-fit p-4">
        <h2 className="mt-0 text-sm">{t('admin.attributes.releaseReadiness')}</h2>
        <ReleaseFact label={t('admin.attributes.selectedCategory')} value={category ? humanize(category.category) : '-'} />
        <ReleaseFact label={t('admin.attributes.activeCatalogRelease')} value={data.state.activeReleaseId || t('admin.attributes.none')} />
        <ReleaseFact label={t('admin.attributes.previousCatalogRelease')} value={data.state.previousReleaseId || t('admin.attributes.none')} />
        <ReleaseFact label={t('admin.attributes.categoryFacade')} value={t('admin.attributes.pending')} warning />
      </Surface>
    </section>
  );
}

function ReleaseFact({ label, value, warning = false }: { label: string; value: string; warning?: boolean }) {
  return <div className="flex items-start justify-between gap-4 border-b border-[var(--mpf-border)] py-3 text-xs"><span className="text-[var(--mpf-text-muted)]">{label}</span><strong className={`max-w-[60%] break-words text-right ${warning ? 'text-[var(--theme-warning)]' : ''}`}>{value}</strong></div>;
}

function formatTime(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function humanize(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, character => character.toUpperCase());
}

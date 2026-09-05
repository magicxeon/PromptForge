import { Columns3, Share2 } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShareComparisonDialog } from '../../../components/community/ShareComparisonDialog';
import {
  ComparisonThumbnailGrid,
  comparisonThumbnailProfileId
} from '../../../components/comparisons/ComparisonThumbnailGrid';
import { Button } from '../../../components/ui/Button';
import { routeBuilders } from '../../../app/routeRegistry/routes';
import { createReturnNavigationState } from '../../../lib/navigation/returnNavigation';
import type { ComparisonListItem } from '../../comparisons/schemas/comparisonSchemas';

export function RecentComparisonCard({ comparison }: { comparison: ComparisonListItem }) {
  const { t } = useTranslation('react-ui');
  const location = useLocation();
  const href = routeBuilders.comparison(comparison.id);
  const previews = comparison.previewImages
    .filter(image => image.thumbnailUrl || image.imageUrl)
    .slice(0, 4);
  const profileId = comparisonThumbnailProfileId(previews.length);
  const canShare = comparison.completedCount >= 2
    && ['completed', 'partially_completed'].includes(comparison.status);

  return (
    <article className="library-comparison-card">
      <Link
        to={href}
        state={createReturnNavigationState(location)}
        className="library-comparison-card__main"
        aria-label={t('ui.history.openComparisonNamed', { name: comparison.name })}
      >
        <ComparisonThumbnailGrid
          className="library-comparison-card__mosaic"
          items={previews.map((image, index) => ({
            id: image.jobId || `${comparison.id}_${index}`,
            imageUrl: image.imageUrl,
            thumbnailUrl: image.thumbnailUrl,
            presentationUrl: image.jobId
              ? `/api/history/${encodeURIComponent(image.jobId)}/presentations/${profileId}`
              : null
          }))}
        />
        <div className="library-comparison-card__body">
          <span className="library-comparison-card__type">
            <Columns3 aria-hidden="true" />
            {t('ui.history.comparisonBadge')}
          </span>
          <h3>{comparison.name}</h3>
          <p>
            {t('ui.history.comparisonProgress', {
              completed: comparison.completedCount,
              total: comparison.slotCount,
              status: comparison.status.replaceAll('_', ' ')
            })}
          </p>
        </div>
      </Link>
      <footer className="library-comparison-card__actions">
        <Link
          to={href}
          state={createReturnNavigationState(location)}
          className="library-comparison-card__open"
        >
          {t('ui.history.openComparison')}
        </Link>
        {canShare ? (
          <ShareComparisonDialog
            setId={comparison.id}
            trigger={(
              <Button
                size="sm"
                variant="ghost"
                className="library-comparison-card__share"
                icon={<Share2 aria-hidden="true" />}
              >
                {t('ui.action.share')}
              </Button>
            )}
          />
        ) : null}
      </footer>
    </article>
  );
}

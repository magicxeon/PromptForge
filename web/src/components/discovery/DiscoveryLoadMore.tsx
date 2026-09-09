import { ProcessingSpinner } from '../ui/ProcessingSpinner';
import { Button } from '../ui/Button';

export function DiscoveryLoadMore({
  hasMore,
  loading,
  loadLabel,
  loadingLabel,
  endLabel,
  onLoadMore
}: {
  hasMore: boolean;
  loading: boolean;
  loadLabel: string;
  loadingLabel: string;
  endLabel?: string;
  onLoadMore: () => void;
}) {
  return (
    <div className="discovery-load-more">
      {hasMore ? (
        <Button type="button" disabled={loading} onClick={onLoadMore}>
          {loading ? <ProcessingSpinner className="animate-spin" aria-hidden="true" /> : null}
          {loading ? loadingLabel : loadLabel}
        </Button>
      ) : endLabel ? <p>{endLabel}</p> : null}
    </div>
  );
}

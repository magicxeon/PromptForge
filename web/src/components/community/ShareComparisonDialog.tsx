import { useTranslation } from 'react-i18next';
import { publishComparisonToCommunity } from '../../features/comparisons/api/comparisonApi';
import { PublishCommunityResourceDialog } from './PublishCommunityResourceDialog';

export function ShareComparisonDialog({ setId }: { setId: string }) {
  const { t } = useTranslation('react-ui');
  return (
    <PublishCommunityResourceDialog
      title={t('ui.comparisons.shareTitle')}
      description={t('ui.comparisons.shareDescription')}
      actionLabel={t('ui.comparisons.share')}
      publish={input => publishComparisonToCommunity(setId, input)}
    />
  );
}

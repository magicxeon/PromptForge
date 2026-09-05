import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';
import { publishComparisonToCommunity } from '../../features/comparisons/api/comparisonApi';
import { PublishCommunityResourceDialog } from './PublishCommunityResourceDialog';

export function ShareComparisonDialog({
  setId,
  trigger,
  triggerClassName
}: {
  setId: string;
  trigger?: ReactNode;
  triggerClassName?: string;
}) {
  const { t } = useTranslation('react-ui');
  return (
    <PublishCommunityResourceDialog
      title={t('ui.comparisons.shareTitle')}
      description={t('ui.comparisons.shareDescription')}
      actionLabel={t('ui.comparisons.share')}
      trigger={trigger}
      triggerClassName={triggerClassName}
      allowPromptVisibility
      publish={input => publishComparisonToCommunity(setId, input)}
    />
  );
}

import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export function GenerationCommandRegion({
  showPromptHeading,
  configActions,
  actions,
  messages
}: {
  showPromptHeading: boolean;
  configActions?: ReactNode;
  actions: ReactNode;
  messages?: ReactNode;
}) {
  const { t } = useTranslation('react-ui');
  return (
    <div className="studio-generation-command-region">
      {showPromptHeading ? (
        <header className="studio-step-heading studio-step-heading--render">
          <span>{t('ui.studio.stepLabel')} 3</span>
          <h2>{t('ui.studio.renderPrompt')}</h2>
        </header>
      ) : null}
      {configActions}
      {actions}
      {messages}
    </div>
  );
}

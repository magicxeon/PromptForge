import { CircleAlert, CloudOff, LoaderCircle, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ProjectCostSummary, type ProjectCostReadModel } from './ProjectCostSummary';

export type CinematicSaveState = 'idle' | 'saving' | 'saved' | 'offline' | 'failed';

export function CinematicWorkspaceHeader({
  projectTitle,
  saveState,
  costSummary
}: {
  projectTitle: string;
  saveState: CinematicSaveState;
  costSummary?: ProjectCostReadModel;
}) {
  const { t } = useTranslation('cinematic');
  const SaveIcon = saveState === 'saving'
    ? LoaderCircle
    : saveState === 'offline'
      ? CloudOff
      : saveState === 'failed' ? CircleAlert : Save;
  return (
    <header className="cinematic-workspace-header" data-testid="cinematic-workspace-header">
      <div className="cinematic-workspace-header__identity">
        <p>{t('cinematic.eyebrow')}</p>
        <div>
          <h1>{projectTitle}</h1>
          <span role="status" aria-live="polite" data-save-state={saveState}>
            <SaveIcon className={saveState === 'saving' ? 'animate-spin' : undefined} aria-hidden="true" />
            {t(`cinematic.save.${saveState}`)}
          </span>
        </div>
      </div>
      <ProjectCostSummary summary={costSummary} variant="trigger" />
    </header>
  );
}

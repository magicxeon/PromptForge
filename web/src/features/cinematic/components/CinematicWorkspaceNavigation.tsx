import { BookOpen, Clapperboard, Film, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { CinematicStage } from '../cinematicStages';
import {
  cinematicWorkspaces,
  entryStageForCinematicWorkspace,
  stagesForCinematicWorkspace,
  workspaceForCinematicStage,
  type CinematicWorkspace
} from '../cinematicWorkspaces';

const workspaceIcons: Record<CinematicWorkspace, LucideIcon> = {
  story: BookOpen,
  production: Clapperboard,
  final: Film
};

export function CinematicWorkspaceNavigation({
  activeStage,
  mode = 'advanced',
  onStageChange
}: {
  activeStage: CinematicStage;
  mode?: 'simple' | 'advanced';
  onStageChange?: (stage: CinematicStage) => void;
}) {
  const { t } = useTranslation('cinematic');
  const activeWorkspace = workspaceForCinematicStage(activeStage);
  const sections = stagesForCinematicWorkspace(activeWorkspace, mode);

  return (
    <nav className="cinematic-workspace-navigation" aria-label={t('cinematic.workspaces.label')}>
      <div className="cinematic-workspace-navigation__primary" role="tablist" aria-label={t('cinematic.workspaces.label')}>
        {cinematicWorkspaces.map(workspace => {
          const Icon = workspaceIcons[workspace];
          const active = workspace === activeWorkspace;
          return (
            <button
              key={workspace}
              type="button"
              role="tab"
              aria-selected={active}
              className={active ? 'is-active' : undefined}
              onClick={() => onStageChange?.(entryStageForCinematicWorkspace(workspace, mode))}
              disabled={!onStageChange}
            >
              <Icon aria-hidden="true" />
              <span>
                <strong>{t(`cinematic.workspaces.${workspace}`)}</strong>
                <small>{t(`cinematic.workspaces.${workspace}Description`)}</small>
              </span>
            </button>
          );
        })}
      </div>
      {sections.length > 1 ? (
        <div className="cinematic-workspace-navigation__sections" aria-label={t('cinematic.workspaces.sections')}>
          {sections.map(stage => (
            <button
              key={stage}
              type="button"
              aria-current={activeStage === stage ? 'page' : undefined}
              className={activeStage === stage ? 'is-active' : undefined}
              onClick={() => onStageChange?.(stage)}
              disabled={!onStageChange}
            >
              {t(`cinematic.workspaces.section.${stage}`)}
            </button>
          ))}
        </div>
      ) : null}
    </nav>
  );
}

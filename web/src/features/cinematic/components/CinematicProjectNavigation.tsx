import { ArrowLeft, ArrowRight, Users } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';
import { routeBuilders } from '../../../app/routeRegistry/routes';
import type { CinematicProject } from '../schemas/cinematicSchemas';

export function CinematicProjectNavigation({ actorId, project, children }: {
  actorId: string; project: CinematicProject; children: ReactNode;
}) {
  const { t } = useTranslation('cinematic');
  const location = useLocation();
  const charactersPath = routeBuilders.cinematicCharacters(project.id);
  const inCharacters = location.pathname === charactersPath;
  const saved = location.state?.cinematicStoryReturn;
  const prefix = `${routeBuilders.cinematicProject(project.id).replace(/\/setup$/, '')}/`;
  const savedUrl = typeof saved?.path === 'string' && saved.path.startsWith('/') && !saved.path.startsWith('//')
    ? new URL(saved.path, 'https://cinematic.local') : null;
  const storyPath = saved?.actorId === actorId && saved?.projectId === project.id
    && savedUrl?.origin === 'https://cinematic.local' && savedUrl.pathname.startsWith(prefix)
    && !savedUrl.pathname.startsWith(charactersPath)
    ? `${savedUrl.pathname}${savedUrl.search}` : routeBuilders.cinematicProject(project.id, project.chapterOrigin ? 'chapters' : 'cast');
  const returnState = inCharacters ? location.state : {
    cinematicStoryReturn: { actorId, projectId: project.id, path: `${location.pathname}${location.search}` }
  };
  const stage = location.pathname.slice(prefix.length).split('/')[0] || '';
  const locationKeys: Record<string, string> = {
    setup: 'cinematic.newProject.existingTitle', cast: 'cinematic.fullStory.eyebrow',
    chapters: 'cinematic.chapterWriter.eyebrow', scenes: 'cinematic.scenes.eyebrow',
    shot: 'cinematic.shotWriter.eyebrow', characters: 'cinematic.projectTabs.characters',
    'story-plan': 'cinematic.stages.story-plan', storyboard: 'cinematic.stages.storyboard',
    produce: 'cinematic.stages.produce', finish: 'cinematic.stages.finish'
  };
  return <div className="cinematic-project-workspace">
    <nav className="cinematic-project-header" aria-label={t('cinematic.projectTabs.label')}>
      <div className="cinematic-project-header__context">
        <strong>{project.title || t('cinematic.newProject.untitled')}</strong>
        <span>{t(locationKeys[stage] || 'cinematic.projectTabs.story')}</span>
      </div>
      <Link className="cinematic-project-header__switch" to={inCharacters ? storyPath : charactersPath} state={returnState}>
        {inCharacters ? <ArrowLeft aria-hidden="true" /> : <Users aria-hidden="true" />}
        <span>{t(inCharacters ? 'cinematic.projectTabs.backToStory' : 'cinematic.projectTabs.characters')}</span>
        {!inCharacters ? <ArrowRight aria-hidden="true" /> : null}
      </Link>
    </nav>
    {children}
  </div>;
}

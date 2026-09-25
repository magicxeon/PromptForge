import { ArrowRight, Clapperboard, Clock3, Film, Layers3, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { EmptyState, ErrorState, LoadingState } from '../../../components/ui/AsyncState';
import { routeBuilders, routePaths } from '../../../app/routeRegistry/routes';
import type { CinematicProjectSummary } from '../api/cinematicApi';

type Props = {
  projects: CinematicProjectSummary[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
};

export function CinematicProjectLibrary({ projects, loading, error, onRetry }: Props) {
  const { t, i18n } = useTranslation('cinematic');

  return (
    <main className="cinematic-project-library" data-testid="cinematic-project-list">
      <header className="cinematic-project-library__header">
        <div>
          <p>{t('cinematic.eyebrow')}</p>
          <h1>{t('cinematic.title')}</h1>
          <span>{t('cinematic.projects.description')}</span>
        </div>
        <Link className="cinematic-project-library__new" to={routePaths.createCinematicNew}>
          <Plus aria-hidden="true" />
          {t('cinematic.actions.newProject')}
        </Link>
      </header>

      <section className="cinematic-project-library__body" aria-labelledby="cinematic-project-library-heading">
        <div className="cinematic-project-library__list-heading">
          <h2 id="cinematic-project-library-heading">{t('cinematic.projects.recent')}</h2>
          {!loading && !error ? <span>{t('cinematic.projects.count', { count: projects.length })}</span> : null}
        </div>

        {loading ? <LoadingState label={t('cinematic.projects.loading')} /> : null}
        {error ? (
          <ErrorState
            title={t('cinematic.projects.loadFailed')}
            description={t('cinematic.projects.loadFailedDescription')}
            retryLabel={t('cinematic.projects.retry')}
            onRetry={onRetry}
          />
        ) : null}
        {!loading && !error && projects.length === 0 ? (
          <EmptyState title={t('cinematic.empty.title')} description={t('cinematic.empty.description')} />
        ) : null}
        {!loading && !error && projects.length > 0 ? (
          <div className="cinematic-project-library__rows">
            {projects.map(project => {
              const context = t('cinematic.projects.workspaceContext', { workspace: t('cinematic.stages.setup') });
              const progress = project.progress.totalClipCount > 0
                ? t('cinematic.projects.clipProgress', {
                  approved: project.progress.approvedClipCount,
                  total: project.progress.totalClipCount
                })
                : t('cinematic.projects.storyDraft');
              return (
                <Link
                  key={project.productionProjectId}
                  className="cinematic-project-library__row"
                  to={routeBuilders.cinematicProject(project.projectId, 'setup')}
                  aria-label={t('cinematic.projects.openProject', { title: project.title })}
                >
                  <span className="cinematic-project-library__thumbnail" aria-hidden="true">
                    {project.thumbnailUrl
                      ? <img src={project.thumbnailUrl} alt="" />
                      : <Clapperboard />}
                  </span>
                  <span className="cinematic-project-library__identity">
                    <strong title={project.title}>{project.title}</strong>
                    <small>{context}</small>
                    <span className="cinematic-project-library__mobile-meta">
                      <Clock3 aria-hidden="true" />
                      {formatEditedAt(project.updatedAt, i18n.resolvedLanguage || i18n.language, t)}
                    </span>
                  </span>
                  <span className="cinematic-project-library__updated">
                    <Clock3 aria-hidden="true" />
                    <span>{t('cinematic.projects.lastEdited')}</span>
                    <strong>{formatEditedAt(project.updatedAt, i18n.resolvedLanguage || i18n.language, t)}</strong>
                  </span>
                  <span className="cinematic-project-library__progress">
                    {project.progress.totalClipCount > 0 ? <Film aria-hidden="true" /> : <Layers3 aria-hidden="true" />}
                    <span>{t('cinematic.projects.progress')}</span>
                    <strong>{progress}</strong>
                  </span>
                  <span className={`cinematic-project-library__status is-${project.status}`}>
                    {t(`cinematic.projects.status.${project.status}`)}
                  </span>
                  <ArrowRight className="cinematic-project-library__open" aria-hidden="true" />
                </Link>
              );
            })}
          </div>
        ) : null}
      </section>
    </main>
  );
}

function formatEditedAt(
  value: string,
  locale: string,
  t: (key: string, values?: Record<string, unknown>) => string
) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return t('cinematic.projects.dateUnknown');
  const date = new Date(timestamp);
  const today = new Date();
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const currentDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const dayDifference = Math.round((currentDay - day) / 86_400_000);
  if (dayDifference === 0) return t('cinematic.projects.today');
  if (dayDifference === 1) return t('cinematic.projects.yesterday');
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric' }).format(date);
}

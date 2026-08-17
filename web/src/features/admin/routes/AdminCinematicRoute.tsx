import { useQuery } from '@tanstack/react-query';
import { Film, Search } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ErrorState, LoadingState } from '../../../components/ui/AsyncState';
import { Surface } from '../../../components/ui/Surface';
import { useActor } from '../../../lib/auth/ActorProvider';
import { AdminNavigation } from '../components/AdminNavigation';
import { getOperationalVideoCapabilities, listOperationalCinematicProjects, listOperationalVideoTasks } from '../api/cinematicOperationsApi';

export function AdminCinematicRoute() {
  const { t } = useTranslation('admin');
  const { actor } = useActor();
  const [search, setSearch] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const authorized = ['admin', 'support'].includes(actor?.role || '');
  const projects = useQuery({ queryKey: ['admin', actor?.userId, 'cinematic-projects', submittedSearch], queryFn: () => listOperationalCinematicProjects(submittedSearch), enabled: authorized });
  const tasks = useQuery({ queryKey: ['admin', actor?.userId, 'cinematic-tasks', submittedSearch], queryFn: () => listOperationalVideoTasks(submittedSearch), enabled: authorized });
  const capabilities = useQuery({ queryKey: ['admin', actor?.userId, 'cinematic-capabilities'], queryFn: getOperationalVideoCapabilities, enabled: authorized });
  if (!authorized) return <ErrorState title={t('admin.cinematic.accessRequired')} />;
  return <main>
    <header className="mb-5 border-b border-[var(--mpf-border)] pb-5"><span className="text-xs font-bold uppercase text-cyan-300">{t('admin.cinematic.eyebrow')}</span><h1 className="mb-0 mt-2 text-3xl">{t('admin.cinematic.title')}</h1></header>
    <AdminNavigation />
    <form className="mb-5 flex gap-2" onSubmit={event => { event.preventDefault(); setSubmittedSearch(search.trim()); }}><label className="relative min-w-0 flex-1"><Search className="absolute left-3 top-3 size-4 text-[var(--mpf-text-muted)]" aria-hidden="true" /><span className="sr-only">{t('admin.cinematic.search')}</span><input className="h-10 w-full border border-[var(--mpf-border)] bg-[var(--mpf-surface)] pl-10 pr-3" value={search} onChange={event => setSearch(event.target.value)} placeholder={t('admin.cinematic.searchPlaceholder')} /></label><button type="submit" className="border border-cyan-400 px-4 text-sm">{t('admin.cinematic.search')}</button></form>
    {(projects.isPending || tasks.isPending || capabilities.isPending) ? <LoadingState label={t('admin.cinematic.loading')} /> : null}
    {(projects.isError || tasks.isError || capabilities.isError) ? <ErrorState title={t('admin.cinematic.loadFailed')} description={(projects.error || tasks.error || capabilities.error)?.message} /> : null}
    {projects.data && tasks.data && capabilities.data ? <div className="grid gap-4 xl:grid-cols-2">
      <OperationsSection title={t('admin.cinematic.projects')} count={projects.data.items.length}>{projects.data.items.map(project => <article key={project.projectId} className="border-t border-[var(--mpf-border)] p-3"><strong>{project.title}</strong><small className="block text-[var(--mpf-text-muted)]">{project.projectId} · {project.ownerUsername}</small><p className="mb-0 text-sm">{project.activeStage} · {project.status} · {project.shotCount} shots · {project.staleAttemptCount} stale</p></article>)}</OperationsSection>
      <OperationsSection title={t('admin.cinematic.providerTasks')} count={tasks.data.items.length}>{tasks.data.items.map(task => <article key={task.id} className="border-t border-[var(--mpf-border)] p-3"><strong>{task.status}</strong><small className="block text-[var(--mpf-text-muted)]">{task.id} · {task.providerId}/{task.modelId}</small><p className="mb-0 text-sm">{task.shotId} · {task.supportReference}</p></article>)}</OperationsSection>
      <OperationsSection title={t('admin.cinematic.capabilities')} count={capabilities.data.models.length}>{capabilities.data.models.map(model => <article key={`${model.providerId}:${model.modelId}`} className="border-t border-[var(--mpf-border)] p-3"><strong>{model.displayName}</strong><small className="block text-[var(--mpf-text-muted)]">{model.providerId}/{model.modelId}</small><p className="mb-0 text-sm">{model.qualificationStatus} · {model.pricingStatus} · paid: {String(model.paidRoutingEnabled)}</p></article>)}</OperationsSection>
    </div> : null}
  </main>;
}

function OperationsSection({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return <Surface className="overflow-hidden"><header className="flex items-center justify-between p-3"><span className="flex items-center gap-2"><Film className="size-4 text-cyan-300" aria-hidden="true" /><strong>{title}</strong></span><small>{count}</small></header>{children}</Surface>;
}

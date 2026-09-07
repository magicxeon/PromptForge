import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, Coins, Film, FileImage, ShieldCheck, Users } from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { ErrorState, LoadingState } from '../../../components/ui/AsyncState';
import { Surface } from '../../../components/ui/Surface';
import { useActor } from '../../../lib/auth/ActorProvider';
import {
  adjustCredits,
  getAdminCapabilities,
  getAdminOverview,
  listAdminGenerations,
  listAdminPosts,
  listAdminUsers,
  listAuditEvents,
  moderatePost
} from '../api/adminApi';
import { AdminMetricTile } from '../components/AdminMetricTile';
import { AdminStatusBadge } from '../components/AdminStatusBadge';
import { AdminWorkspaceLayout } from '../components/AdminWorkspaceLayout';
import { AdminFilterBar } from '../components/AdminFilterBar';
import { AdminPagination } from '../components/AdminPagination';
import { AdminDailyJobChart } from '../components/AdminDailyJobChart';
import { useAdminCursorNavigation } from '../hooks/useAdminCursorNavigation';
import { routeBuilders } from '../../../app/routeRegistry/routes';

const tabs = ['overview', 'users', 'generations', 'posts', 'audit'] as const;

export function AdminRoute() {
  const { t } = useTranslation('react-ui');
  const { actor } = useActor();
  const actorId = actor?.userId || 'loading';
  const [params, setParams] = useSearchParams();
  const selected = params.get('tab');
  const tab = tabs.includes(selected as typeof tabs[number]) ? selected as typeof tabs[number] : 'overview';
  if (!['admin', 'support'].includes(actor?.role || '')) {
    return <ErrorState title={t('ui.admin.accessRequired')} description={t('ui.admin.accessDescription')} />;
  }
  return (
    <AdminWorkspaceLayout eyebrow={t('ui.admin.operation')} title={t('ui.admin.title')}>
      <nav className="mb-5 flex gap-1 overflow-x-auto border-b border-[var(--mpf-border)]">
        {tabs.map(item => <button key={item} type="button" className={`shrink-0 border-b-2 bg-transparent px-4 py-3 text-sm ${tab === item ? 'border-cyan-400 text-white' : 'border-transparent text-[var(--mpf-text-muted)]'}`} onClick={() => setParams(item === 'overview' ? {} : { tab: item })}>{t(`ui.admin.tab.${item}`)}</button>)}
      </nav>
      {tab === 'overview' ? <Overview actorId={actorId} /> : null}
      {tab === 'users' ? <UsersPanel actorId={actorId} /> : null}
      {tab === 'generations' ? <GenericTable actorId={actorId} kind="generations" /> : null}
      {tab === 'posts' ? <PostsPanel actorId={actorId} /> : null}
      {tab === 'audit' ? <GenericTable actorId={actorId} kind="audit" /> : null}
    </AdminWorkspaceLayout>
  );
}

function Overview({ actorId }: { actorId: string }) {
  const { t } = useTranslation(['react-ui', 'admin']);
  const [windowDays, setWindowDays] = useState(7);
  const query = useQuery({ queryKey: ['admin', actorId, 'overview', windowDays], queryFn: () => getAdminOverview(windowDays) });
  if (query.isLoading) return <LoadingState label={t('ui.admin.loadingOverview')} />;
  if (query.isError || !query.data) return <ErrorState title={t('ui.admin.overviewUnavailable')} description={query.error?.message} onRetry={() => void query.refetch()} />;
  const sources = query.data.sources || {};
  const image = sources.imageGeneration;
  const video = sources.videoGeneration;
  return <div className="grid gap-5">
    {query.data.status === 'partial' ? <Surface className="flex items-center justify-between gap-3 border-amber-300/40 p-4">
      <div><strong>{t('admin:admin.overview.partialTitle')}</strong><p className="mb-0 mt-1 text-sm text-[var(--mpf-text-muted)]">{t('admin:admin.overview.partialDescription')}</p></div>
      <AdminStatusBadge status="partial" />
    </Surface> : null}
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5" aria-label={t('admin:admin.overview.health')}>
      <AdminMetricTile icon={<Users />} label={t('ui.admin.metricUsers')} value={query.data.users.total} detail={t('ui.admin.activeCount', { count: query.data.users.active })} status={sources.users?.status} href="/admin?tab=users" />
      <AdminMetricTile icon={<FileImage />} label={t('admin:admin.overview.imageJobs')} value={image?.count ?? null} detail={t('admin:admin.overview.activeAttention', { active: image?.activeCount ?? 0, attention: image?.attentionCount ?? 0 })} status={image?.status} href="/admin/operations?mediaType=image" />
      <AdminMetricTile icon={<Film />} label={t('admin:admin.overview.videoJobs')} value={video?.count ?? null} detail={t('admin:admin.overview.activeAttention', { active: video?.activeCount ?? 0, attention: video?.attentionCount ?? 0 })} status={video?.status} href="/admin/operations?mediaType=video" />
      <AdminMetricTile icon={<ShieldCheck />} label={t('ui.admin.metricPosts')} value={query.data.communityPosts.totalApprox} status={sources.community?.status} href="/admin?tab=posts" />
      <AdminMetricTile icon={<Activity />} label={t('ui.admin.metricAudit')} value={query.data.auditEvents.totalApprox} status={sources.audit?.status} href="/admin?tab=audit" />
    </section>
    {query.data.analytics ? <section className="grid gap-4" aria-label={t('admin:admin.overview.dailyTitle')}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h2 className="mb-0 text-xl">{t('admin:admin.overview.dailyTitle')}</h2><p className="mb-0 mt-1 text-sm text-[var(--mpf-text-muted)]">{t('admin:admin.overview.dailyDescription', { timezone: query.data.analytics.timezone })}</p></div>
        <label className="grid gap-1 text-xs text-[var(--mpf-text-muted)]"><span>{t('admin:admin.overview.window')}</span><select className="h-10 border border-[var(--mpf-border)] bg-[var(--mpf-surface)] px-3 text-sm" value={windowDays} onChange={event => setWindowDays(Number(event.target.value))}><option value={7}>{t('admin:admin.overview.days', { count: 7 })}</option><option value={14}>{t('admin:admin.overview.days', { count: 14 })}</option><option value={30}>{t('admin:admin.overview.days', { count: 30 })}</option></select></label>
      </div>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminMetricTile icon={<ShieldCheck />} label={t('admin:admin.overview.successRate')} value={query.data.analytics.totals.successRate} detail="%" status="ready" />
        <AdminMetricTile icon={<Activity />} label={t('admin:admin.overview.successful')} value={query.data.analytics.totals.success} />
        <AdminMetricTile icon={<Activity />} label={t('admin:admin.overview.failed')} value={query.data.analytics.totals.failed} status={query.data.analytics.totals.failed ? 'warning' : 'ready'} href="/admin/operations?status=attention" />
        <AdminMetricTile icon={<Activity />} label={t('admin:admin.overview.inProgress')} value={query.data.analytics.totals.active} />
      </section>
      <AdminDailyJobChart title={t('admin:admin.overview.chartTitle')} description={t('admin:admin.overview.chartDescription')} daily={query.data.analytics.daily} successLabel={t('admin:admin.overview.successful')} failedLabel={t('admin:admin.overview.failed')} activeLabel={t('admin:admin.overview.inProgress')} otherLabel={t('admin:admin.overview.other')} />
    </section> : null}
    <Surface className="overflow-hidden">
      <header className="flex items-center justify-between gap-3 border-b border-[var(--mpf-border)] p-4"><div><strong>{t('admin:admin.overview.priorityTitle')}</strong><p className="mb-0 mt-1 text-sm text-[var(--mpf-text-muted)]">{t('admin:admin.overview.priorityDescription')}</p></div><small>{query.data.priorityItems?.length || 0}</small></header>
      {query.data.priorityItems?.length ? query.data.priorityItems.map(item => <Link key={item.id} to={item.href} className="flex items-center justify-between gap-4 border-b border-[var(--mpf-border)] p-4 text-inherit no-underline last:border-0"><span>{t(`admin:admin.overview.capability.${item.capability}`)}</span><span className="flex items-center gap-3"><strong>{item.count}</strong><AdminStatusBadge status={item.severity} /></span></Link>) : <p className="m-0 p-4 text-sm text-[var(--mpf-text-muted)]">{t('admin:admin.overview.noPriority')}</p>}
    </Surface>
  </div>;
}

function UsersPanel({ actorId }: { actorId: string }) {
  const { t } = useTranslation(['react-ui', 'admin']);
  const navigation = useAdminCursorNavigation();
  const [search, setSearch] = useState(navigation.params.get('search') || '');
  const status = navigation.params.get('status') || '';
  const queryClient = useQueryClient();
  const capabilities = useQuery({ queryKey: ['admin', actorId, 'capabilities'], queryFn: getAdminCapabilities });
  const canAdjustCredits = capabilities.data?.capabilities.financialCommands?.enabled === true;
  const filters = { cursor: navigation.cursor, search: navigation.params.get('search') || '', status };
  const query = useQuery({ queryKey: ['admin', actorId, 'users', filters], queryFn: () => listAdminUsers(filters) });
  const adjustment = useMutation({
    mutationFn: ({ userId, delta, reason }: { userId: string; delta: number; reason: string }) => adjustCredits(userId, delta, reason),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin'] });
      void queryClient.invalidateQueries({ queryKey: ['credits'] });
    }
  });
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedUser) return;
    const form = new FormData(event.currentTarget);
    adjustment.mutate({
      userId: selectedUser,
      delta: Number(form.get('delta')),
      reason: String(form.get('reason') || '').trim()
    });
  }
  if (query.isLoading) return <LoadingState label={t('ui.admin.loadingUsers')} />;
  if (query.isError || !query.data) return <ErrorState title={t('ui.admin.usersUnavailable')} description={query.error?.message} />;
  return (
    <>
      <AdminFilterBar search={search} searchLabel={t('admin:admin.operations.search')} searchPlaceholder={t('admin:admin.users.searchPlaceholder')} onSearchChange={setSearch} onSubmit={() => navigation.updateFilters({ search: search.trim() })} onClear={() => { setSearch(''); navigation.updateFilters({ search: '', status: '' }); }} clearLabel={t('admin:admin.filters.clear')}>
        <select aria-label={t('admin:admin.operations.status')} className="h-10 border border-[var(--mpf-border)] bg-[var(--mpf-surface)] px-3" value={status} onChange={event => navigation.updateFilters({ status: event.target.value })}><option value="">{t('admin:admin.operations.allStatuses')}</option><option value="active">active</option><option value="suspended">suspended</option><option value="disabled">disabled</option></select>
      </AdminFilterBar>
      <div className="overflow-x-auto border border-[var(--mpf-border)]">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead className="bg-white/5 text-[var(--mpf-text-muted)]"><tr><th className="p-3">{t('ui.admin.user')}</th><th className="p-3">{t('ui.admin.role')}</th><th className="p-3">{t('ui.admin.status')}</th><th className="p-3">{t('ui.admin.credits')}</th><th className="p-3">{t('ui.admin.action')}</th></tr></thead>
          <tbody>{query.data.items.map(user => <tr key={user.id} className="border-t border-[var(--mpf-border)]"><td className="p-3"><strong>{user.displayName}</strong><small className="block text-[var(--mpf-text-muted)]">@{user.username}</small></td><td className="p-3">{user.role}</td><td className="p-3">{user.status}</td><td className="p-3">{user.credits?.availableCredits ?? 0}</td><td className="p-3"><div className="flex flex-wrap gap-2"><Link className="inline-flex min-h-9 items-center justify-center rounded-[var(--mpf-radius-sm)] border border-[var(--mpf-border-strong)] bg-[var(--mpf-surface)] px-3 py-2 text-xs font-semibold text-[var(--mpf-text)] no-underline hover:border-[var(--theme-primary)]" to={routeBuilders.adminUser(user.id)}>{t('admin:admin.users.open')}</Link>{canAdjustCredits ? <Button size="sm" icon={<Coins className="size-4" />} onClick={() => setSelectedUser(user.id)}>{t('ui.admin.adjust')}</Button> : null}</div></td></tr>)}</tbody>
        </table>
      </div>
      <AdminPagination canPrevious={navigation.canPrevious} canNext={query.data.hasMore} onPrevious={navigation.previous} onNext={() => navigation.next(query.data?.nextCursor)} previousLabel={t('admin:admin.pagination.previous')} nextLabel={t('admin:admin.pagination.next')} label={query.data.totalApprox === undefined ? undefined : t('admin:admin.pagination.total', { count: query.data.totalApprox })} />
      {selectedUser && canAdjustCredits ? <Surface className="mt-4 p-4"><form className="grid gap-3 md:grid-cols-[140px_1fr_auto]" onSubmit={submit}><input name="delta" required type="number" step="1" placeholder={t('ui.admin.deltaPlaceholder')} className="h-11 border border-[var(--mpf-border)] bg-black/30 px-3" /><input name="reason" required minLength={4} maxLength={300} placeholder={t('ui.admin.reasonPlaceholder')} className="h-11 border border-[var(--mpf-border)] bg-black/30 px-3" /><Button type="submit" variant="primary" disabled={adjustment.isPending}>{t('ui.admin.adjustment')}</Button></form></Surface> : null}
    </>
  );
}

function PostsPanel({ actorId }: { actorId: string }) {
  const { t } = useTranslation(['react-ui', 'admin']);
  const navigation = useAdminCursorNavigation();
  const [search, setSearch] = useState(navigation.params.get('search') || '');
  const status = navigation.params.get('status') || '';
  const queryClient = useQueryClient();
  const filters = { cursor: navigation.cursor, search: navigation.params.get('search') || '', status };
  const query = useQuery({ queryKey: ['admin', actorId, 'posts', filters], queryFn: () => listAdminPosts(filters) });
  const moderation = useMutation({
    mutationFn: ({ postId, action }: { postId: string; action: string }) => moderatePost(postId, action, `Support moderation: ${action}`),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', actorId, 'posts'] }),
        queryClient.invalidateQueries({ queryKey: ['community-template-previews', actorId] }),
        queryClient.invalidateQueries({ queryKey: ['community-template-detail', actorId] })
      ]);
    }
  });
  if (query.isLoading) return <LoadingState label={t('ui.admin.loadingPosts')} />;
  if (query.isError || !query.data) return <ErrorState title={t('ui.admin.postsUnavailable')} description={query.error?.message} />;
  return <><AdminFilterBar search={search} searchLabel={t('admin:admin.operations.search')} searchPlaceholder={t('admin:admin.posts.searchPlaceholder')} onSearchChange={setSearch} onSubmit={() => navigation.updateFilters({ search: search.trim() })} onClear={() => { setSearch(''); navigation.updateFilters({ search: '', status: '' }); }} clearLabel={t('admin:admin.filters.clear')}><select aria-label={t('admin:admin.operations.status')} className="h-10 border border-[var(--mpf-border)] bg-[var(--mpf-surface)] px-3" value={status} onChange={event => navigation.updateFilters({ status: event.target.value })}><option value="">{t('admin:admin.operations.allStatuses')}</option><option value="published">published</option><option value="reported">reported</option><option value="hidden">hidden</option><option value="removed">removed</option></select></AdminFilterBar><RecordTable items={query.data.items} action={record => <Button size="sm" variant="danger" disabled={moderation.isPending} onClick={() => moderation.mutate({ postId: String(record.id), action: 'hide' })}>{t('ui.action.hide')}</Button>} /><AdminPagination canPrevious={navigation.canPrevious} canNext={query.data.hasMore} onPrevious={navigation.previous} onNext={() => navigation.next(query.data?.nextCursor)} previousLabel={t('admin:admin.pagination.previous')} nextLabel={t('admin:admin.pagination.next')} label={query.data.totalApprox === undefined ? undefined : t('admin:admin.pagination.total', { count: query.data.totalApprox })} /></>;
}

function GenericTable({ actorId, kind }: { actorId: string; kind: 'generations' | 'audit' }) {
  const { t } = useTranslation(['react-ui', 'admin']);
  const navigation = useAdminCursorNavigation();
  const [search, setSearch] = useState(navigation.params.get('search') || '');
  const status = navigation.params.get('status') || '';
  const filters = { cursor: navigation.cursor, search: navigation.params.get('search') || '', status };
  const query = useQuery({
    queryKey: ['admin', actorId, kind, filters],
    queryFn: () => kind === 'generations' ? listAdminGenerations(filters) : listAuditEvents({ cursor: filters.cursor, search: filters.search, action: filters.status })
  });
  if (query.isLoading) return <LoadingState label={t('ui.admin.loadingRecords', { kind: t(`ui.admin.tab.${kind}`) })} />;
  if (query.isError || !query.data) return <ErrorState title={t('ui.admin.recordsUnavailable', { kind: t(`ui.admin.tab.${kind}`) })} description={query.error?.message} />;
  return <><AdminFilterBar search={search} searchLabel={t('admin:admin.operations.search')} searchPlaceholder={t('admin:admin.records.searchPlaceholder')} onSearchChange={setSearch} onSubmit={() => navigation.updateFilters({ search: search.trim() })} onClear={() => { setSearch(''); navigation.updateFilters({ search: '', status: '' }); }} clearLabel={t('admin:admin.filters.clear')}>{kind === 'generations' ? <select aria-label={t('admin:admin.operations.status')} className="h-10 border border-[var(--mpf-border)] bg-[var(--mpf-surface)] px-3" value={status} onChange={event => navigation.updateFilters({ status: event.target.value })}><option value="">{t('admin:admin.operations.allStatuses')}</option><option value="completed">completed</option><option value="failed">failed</option></select> : null}</AdminFilterBar><RecordTable items={query.data.items} /><AdminPagination canPrevious={navigation.canPrevious} canNext={query.data.hasMore} onPrevious={navigation.previous} onNext={() => navigation.next(query.data?.nextCursor)} previousLabel={t('admin:admin.pagination.previous')} nextLabel={t('admin:admin.pagination.next')} label={query.data.totalApprox === undefined ? undefined : t('admin:admin.pagination.total', { count: query.data.totalApprox })} /></>;
}

function RecordTable({ items, action }: { items: Record<string, unknown>[]; action?: (item: Record<string, unknown>) => ReactNode }) {
  const { t } = useTranslation('react-ui');
  return (
    <div className="overflow-x-auto border border-[var(--mpf-border)]">
      <table className="w-full min-w-[760px] border-collapse text-left text-xs">
        <thead className="bg-white/5 text-[var(--mpf-text-muted)]"><tr><th className="p-3">ID</th><th className="p-3">{t('ui.admin.ownerActor')}</th><th className="p-3">{t('ui.admin.statusAction')}</th><th className="p-3">{t('ui.admin.time')}</th>{action ? <th className="p-3">{t('ui.admin.control')}</th> : null}</tr></thead>
        <tbody>{items.map((item, index) => <tr key={String(item.id || index)} className="border-t border-[var(--mpf-border)]"><td className="max-w-64 truncate p-3">{String(item.id || item.eventId || '')}</td><td className="p-3">{String(item.ownerUsername || item.actorUserId || item.ownerUserId || '')}</td><td className="p-3">{String(item.status || item.action || item.eventType || '')}</td><td className="p-3">{formatTime(item.createdAt || item.timestamp)}</td>{action ? <td className="p-3">{action(item)}</td> : null}</tr>)}</tbody>
      </table>
    </div>
  );
}

function formatTime(value: unknown) {
  if (!value) return '';
  const date = new Date(typeof value === 'number' ? value : String(value));
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

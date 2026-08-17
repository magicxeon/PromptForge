import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, Coins, FileImage, ShieldCheck, Users } from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { ErrorState, LoadingState } from '../../../components/ui/AsyncState';
import { Surface } from '../../../components/ui/Surface';
import { useActor } from '../../../lib/auth/ActorProvider';
import {
  adjustCredits,
  getAdminOverview,
  listAdminGenerations,
  listAdminPosts,
  listAdminUsers,
  listAuditEvents,
  moderatePost
} from '../api/adminApi';
import { AdminNavigation } from '../components/AdminNavigation';

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
    <main>
      <header className="mb-5 border-b border-[var(--mpf-border)] pb-5">
        <span className="text-xs font-bold uppercase text-cyan-300">{t('ui.admin.operation')}</span>
        <h1 className="mb-0 mt-2 text-3xl">{t('ui.admin.title')}</h1>
      </header>
      <AdminNavigation />
      <nav className="mb-5 flex gap-1 overflow-x-auto border-b border-[var(--mpf-border)]">
        {tabs.map(item => <button key={item} type="button" className={`shrink-0 border-b-2 bg-transparent px-4 py-3 text-sm ${tab === item ? 'border-cyan-400 text-white' : 'border-transparent text-[var(--mpf-text-muted)]'}`} onClick={() => setParams(item === 'overview' ? {} : { tab: item })}>{t(`ui.admin.tab.${item}`)}</button>)}
      </nav>
      {tab === 'overview' ? <Overview actorId={actorId} /> : null}
      {tab === 'users' ? <UsersPanel actorId={actorId} /> : null}
      {tab === 'generations' ? <GenericTable actorId={actorId} kind="generations" /> : null}
      {tab === 'posts' ? <PostsPanel actorId={actorId} /> : null}
      {tab === 'audit' ? <GenericTable actorId={actorId} kind="audit" /> : null}
    </main>
  );
}

function Overview({ actorId }: { actorId: string }) {
  const { t } = useTranslation('react-ui');
  const query = useQuery({ queryKey: ['admin', actorId, 'overview'], queryFn: getAdminOverview });
  if (query.isLoading) return <LoadingState label={t('ui.admin.loadingOverview')} />;
  if (query.isError || !query.data) return <ErrorState title={t('ui.admin.overviewUnavailable')} description={query.error?.message} onRetry={() => void query.refetch()} />;
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric icon={<Users />} label={t('ui.admin.metricUsers')} value={query.data.users.total} detail={t('ui.admin.activeCount', { count: query.data.users.active })} />
      <Metric icon={<FileImage />} label={t('ui.admin.metricJobs')} value={query.data.generationJobs.totalApprox} />
      <Metric icon={<ShieldCheck />} label={t('ui.admin.metricPosts')} value={query.data.communityPosts.totalApprox} />
      <Metric icon={<Activity />} label={t('ui.admin.metricAudit')} value={query.data.auditEvents.totalApprox} />
    </section>
  );
}

function Metric({ icon, label, value, detail }: { icon: ReactNode; label: string; value: number; detail?: string }) {
  return <Surface className="p-4"><span className="text-cyan-300">{icon}</span><strong className="mt-5 block text-3xl">{value}</strong><span className="text-sm">{label}</span>{detail ? <small className="mt-2 block text-[var(--mpf-text-muted)]">{detail}</small> : null}</Surface>;
}

function UsersPanel({ actorId }: { actorId: string }) {
  const { t } = useTranslation('react-ui');
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['admin', actorId, 'users'], queryFn: listAdminUsers });
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
      <div className="overflow-x-auto border border-[var(--mpf-border)]">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead className="bg-white/5 text-[var(--mpf-text-muted)]"><tr><th className="p-3">{t('ui.admin.user')}</th><th className="p-3">{t('ui.admin.role')}</th><th className="p-3">{t('ui.admin.status')}</th><th className="p-3">{t('ui.admin.credits')}</th><th className="p-3">{t('ui.admin.action')}</th></tr></thead>
          <tbody>{query.data.items.map(user => <tr key={user.id} className="border-t border-[var(--mpf-border)]"><td className="p-3"><strong>{user.displayName}</strong><small className="block text-[var(--mpf-text-muted)]">@{user.username}</small></td><td className="p-3">{user.role}</td><td className="p-3">{user.status}</td><td className="p-3">{user.credits?.availableCredits ?? 0}</td><td className="p-3"><Button size="sm" icon={<Coins className="size-4" />} onClick={() => setSelectedUser(user.id)}>{t('ui.admin.adjust')}</Button></td></tr>)}</tbody>
        </table>
      </div>
      {selectedUser ? <Surface className="mt-4 p-4"><form className="grid gap-3 md:grid-cols-[140px_1fr_auto]" onSubmit={submit}><input name="delta" required type="number" step="1" placeholder={t('ui.admin.deltaPlaceholder')} className="h-11 border border-[var(--mpf-border)] bg-black/30 px-3" /><input name="reason" required minLength={4} maxLength={300} placeholder={t('ui.admin.reasonPlaceholder')} className="h-11 border border-[var(--mpf-border)] bg-black/30 px-3" /><Button type="submit" variant="primary" disabled={adjustment.isPending}>{t('ui.admin.adjustment')}</Button></form></Surface> : null}
    </>
  );
}

function PostsPanel({ actorId }: { actorId: string }) {
  const { t } = useTranslation('react-ui');
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['admin', actorId, 'posts'], queryFn: () => listAdminPosts() });
  const moderation = useMutation({
    mutationFn: ({ postId, action }: { postId: string; action: string }) => moderatePost(postId, action, `Support moderation: ${action}`),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin', actorId, 'posts'] })
  });
  if (query.isLoading) return <LoadingState label={t('ui.admin.loadingPosts')} />;
  if (query.isError || !query.data) return <ErrorState title={t('ui.admin.postsUnavailable')} description={query.error?.message} />;
  return <RecordTable items={query.data.items} action={record => <Button size="sm" variant="danger" disabled={moderation.isPending} onClick={() => moderation.mutate({ postId: String(record.id), action: 'hide' })}>{t('ui.action.hide')}</Button>} />;
}

function GenericTable({ actorId, kind }: { actorId: string; kind: 'generations' | 'audit' }) {
  const { t } = useTranslation('react-ui');
  const query = useQuery({
    queryKey: ['admin', actorId, kind],
    queryFn: () => kind === 'generations' ? listAdminGenerations() : listAuditEvents()
  });
  if (query.isLoading) return <LoadingState label={t('ui.admin.loadingRecords', { kind: t(`ui.admin.tab.${kind}`) })} />;
  if (query.isError || !query.data) return <ErrorState title={t('ui.admin.recordsUnavailable', { kind: t(`ui.admin.tab.${kind}`) })} description={query.error?.message} />;
  return <RecordTable items={query.data.items} />;
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

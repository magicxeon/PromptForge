import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, Coins, Film, FileImage, UserRound } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { ErrorState, LoadingState } from '../../../components/ui/AsyncState';
import { Surface } from '../../../components/ui/Surface';
import { showToast } from '../../../components/ui/toastStore';
import { useActor } from '../../../lib/auth/ActorProvider';
import { changeAdminUserStatus, getAdminUser } from '../api/adminApi';
import { AdminMetricTile } from '../components/AdminMetricTile';
import { AdminStatusBadge } from '../components/AdminStatusBadge';
import { AdminWorkspaceLayout } from '../components/AdminWorkspaceLayout';

export function AdminUserDetailRoute() {
  const { t } = useTranslation('admin');
  const { actor } = useActor();
  const { userId = '' } = useParams();
  const queryClient = useQueryClient();
  const authorized = ['admin', 'support'].includes(actor?.role || '');
  const query = useQuery({ queryKey: ['admin', actor?.userId, 'user', userId], queryFn: () => getAdminUser(userId), enabled: authorized && Boolean(userId) });
  const [nextStatus, setNextStatus] = useState('');
  const [reason, setReason] = useState('');
  const command = useMutation({
    mutationFn: () => changeAdminUserStatus(userId, nextStatus, query.data?.user.status || '', reason),
    onSuccess: () => {
      showToast({ tone: 'success', title: t('admin.users.statusUpdated') });
      setNextStatus(''); setReason('');
      void queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: error => showToast({ tone: 'error', title: t('admin.users.statusUpdateFailed'), description: error.message })
  });
  if (!authorized) return <ErrorState title={t('admin.access.title')} description={t('admin.access.description')} />;
  if (query.isPending) return <LoadingState label={t('admin.users.loadingDetail')} />;
  if (query.isError || !query.data) return <ErrorState title={t('admin.users.detailFailed')} description={query.error?.message} />;
  const { user, credits, activity } = query.data;
  return <AdminWorkspaceLayout eyebrow={t('admin.users.detailEyebrow')} title={user.displayName} description={`@${user.username} / ${user.id}`}>
    <Link className="mb-4 inline-block text-sm text-cyan-300" to="/admin?tab=users">{t('admin.users.back')}</Link>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <AdminMetricTile icon={<UserRound />} label={t('admin.users.accountStatus')} value={null} detail={user.role} status={user.status} />
      <AdminMetricTile icon={<Coins />} label={t('admin.users.availableCredits')} value={credits?.availableCredits ?? 0} detail={t('admin.users.reservedCredits', { count: credits?.reservedCredits ?? 0 })} />
      <AdminMetricTile icon={<FileImage />} label={t('admin.users.imageJobs')} value={activity.imageJobs} href={`/admin/operations?mediaType=image&search=${encodeURIComponent(user.id)}`} />
      <AdminMetricTile icon={<Film />} label={t('admin.users.videoJobs')} value={activity.videoJobs} href={`/admin/operations?mediaType=video&search=${encodeURIComponent(user.id)}`} />
      <AdminMetricTile icon={<Activity />} label={t('admin.users.communityPosts')} value={activity.communityPosts} href={`/admin?tab=posts&search=${encodeURIComponent(user.id)}`} />
    </section>
    <Surface className="mt-5 p-4"><div className="flex items-center justify-between gap-3"><div><strong>{t('admin.users.accountControl')}</strong><p className="mb-0 mt-1 text-sm text-[var(--mpf-text-muted)]">{t('admin.users.accountControlHelp')}</p></div><AdminStatusBadge status={user.status} /></div>
      {actor?.role === 'admin' ? <form className="mt-4 grid gap-3 md:grid-cols-[180px_1fr_auto]" onSubmit={event => { event.preventDefault(); command.mutate(); }}><select className="h-10 border border-[var(--mpf-border)] bg-[var(--mpf-surface)] px-3" required value={nextStatus} onChange={event => setNextStatus(event.target.value)}><option value="">{t('admin.users.chooseStatus')}</option>{['active', 'suspended', 'disabled'].filter(status => status !== user.status).map(status => <option key={status} value={status}>{status}</option>)}</select><input className="h-10 border border-[var(--mpf-border)] bg-[var(--mpf-surface)] px-3" required minLength={3} maxLength={300} value={reason} onChange={event => setReason(event.target.value)} placeholder={t('admin.users.reason')} /><Button type="submit" variant="danger" disabled={command.isPending || actor.userId === user.id}>{t('admin.users.applyStatus')}</Button></form> : <p className="mb-0 mt-4 text-sm text-[var(--mpf-text-muted)]">{t('admin.users.supportReadOnly')}</p>}
    </Surface>
  </AdminWorkspaceLayout>;
}

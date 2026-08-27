import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ErrorState, LoadingState } from '../../../components/ui/AsyncState';
import { Button } from '../../../components/ui/Button';
import { Surface } from '../../../components/ui/Surface';
import { showToast } from '../../../components/ui/toastStore';
import { useActor } from '../../../lib/auth/ActorProvider';
import { dismissAdminOperation, listAdminOperations, restoreAdminOperation } from '../api/adminApi';
import { AdminStatusBadge } from '../components/AdminStatusBadge';
import { AdminWorkspaceLayout } from '../components/AdminWorkspaceLayout';
import { AdminFilterBar } from '../components/AdminFilterBar';
import { AdminPagination } from '../components/AdminPagination';
import { useAdminCursorNavigation } from '../hooks/useAdminCursorNavigation';

export function AdminOperationsRoute() {
  const { t } = useTranslation('admin');
  const { actor } = useActor();
  const navigation = useAdminCursorNavigation();
  const { params } = navigation;
  const [search, setSearch] = useState(params.get('search') || '');
  const [selectedOperation, setSelectedOperation] = useState<{ id: string; mediaType: string } | null>(null);
  const [reason, setReason] = useState('');
  const queryClient = useQueryClient();
  const authorized = ['admin', 'support'].includes(actor?.role || '');
  const filters = {
    mediaType: params.get('mediaType') || '',
    status: params.get('status') || '',
    search: params.get('search') || '',
    visibility: params.get('visibility') || '',
    cursor: navigation.cursor
  };
  const query = useQuery({
    queryKey: ['admin', actor?.userId, 'generation-operations', filters],
    queryFn: () => listAdminOperations(filters),
    enabled: authorized
  });
  const command = useMutation({
    mutationFn: () => {
      if (!selectedOperation) throw new Error('Operation is required.');
      return filters.visibility === 'dismissed'
        ? restoreAdminOperation(selectedOperation.id, reason)
        : dismissAdminOperation(selectedOperation.id, selectedOperation.mediaType, reason);
    },
    onSuccess: () => {
      showToast({ tone: 'success', title: filters.visibility === 'dismissed' ? t('admin.operations.restored') : t('admin.operations.dismissed') });
      setSelectedOperation(null); setReason('');
      void queryClient.invalidateQueries({ queryKey: ['admin', actor?.userId, 'generation-operations'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', actor?.userId, 'overview'] });
    },
    onError: error => showToast({ tone: 'error', title: t('admin.operations.commandFailed'), description: error.message })
  });
  if (!authorized) return <ErrorState title={t('admin.access.title')} description={t('admin.access.description')} />;
  return <AdminWorkspaceLayout eyebrow={t('admin.operations.eyebrow')} title={t('admin.operations.title')} description={t('admin.operations.description')}>
    <AdminFilterBar search={search} searchLabel={t('admin.operations.search')} searchPlaceholder={t('admin.operations.searchPlaceholder')} onSearchChange={setSearch} onSubmit={() => navigation.updateFilters({ search: search.trim() })} onClear={() => { setSearch(''); navigation.updateFilters({ search: '', mediaType: '', status: '', visibility: '' }); }} clearLabel={t('admin.filters.clear')}>
      <select aria-label={t('admin.operations.mediaType')} className="h-10 border border-[var(--mpf-border)] bg-[var(--mpf-surface)] px-3" value={filters.mediaType} onChange={event => navigation.updateFilters({ mediaType: event.target.value })}><option value="">{t('admin.operations.allMedia')}</option><option value="image">{t('admin.operations.image')}</option><option value="video">{t('admin.operations.video')}</option></select>
      <select aria-label={t('admin.operations.status')} className="h-10 border border-[var(--mpf-border)] bg-[var(--mpf-surface)] px-3" value={filters.status} onChange={event => navigation.updateFilters({ status: event.target.value })}><option value="">{t('admin.operations.allStatuses')}</option><option value="attention">{t('admin.operations.needsAttention')}</option><option value="provider_processing">provider processing</option><option value="completed">completed</option><option value="failed">failed</option><option value="reconciliation_required">reconciliation required</option></select>
      <select aria-label={t('admin.operations.visibility')} className="h-10 border border-[var(--mpf-border)] bg-[var(--mpf-surface)] px-3" value={filters.visibility} onChange={event => navigation.updateFilters({ visibility: event.target.value })}><option value="">{t('admin.operations.visible')}</option><option value="dismissed">{t('admin.operations.dismissedRecords')}</option></select>
    </AdminFilterBar>
    {query.isPending ? <LoadingState label={t('admin.operations.loading')} /> : null}
    {query.isError ? <ErrorState title={t('admin.operations.loadFailed')} description={query.error.message} onRetry={() => void query.refetch()} /> : null}
    {query.data ? <><div className="overflow-x-auto border border-[var(--mpf-border)]"><table className="w-full min-w-[980px] border-collapse text-left text-sm"><thead className="bg-white/5 text-[var(--mpf-text-muted)]"><tr><th className="p-3">ID</th><th className="p-3">{t('admin.operations.mediaType')}</th><th className="p-3">{t('admin.operations.owner')}</th><th className="p-3">Provider / Model</th><th className="p-3">{t('admin.operations.status')}</th><th className="p-3">{t('admin.operations.updated')}</th>{actor?.role === 'admin' ? <th className="p-3">{t('admin.operations.action')}</th> : null}</tr></thead><tbody>{query.data.items.map((item, index) => { const status = String(item.status || 'unknown'); const canDismiss = ['failed', 'expired', 'reconciliation_required'].includes(status); return <tr key={String(item.id || index)} className="border-t border-[var(--mpf-border)]"><td className="max-w-64 truncate p-3">{String(item.id || '')}</td><td className="p-3">{String(item.mediaType || 'image')}</td><td className="p-3">{String(item.ownerUsername || item.ownerUserId || '')}</td><td className="p-3">{String(item.providerId || '')} / {String(item.modelId || '')}</td><td className="p-3"><AdminStatusBadge status={status} /></td><td className="p-3">{formatTime(item.updatedAt || item.createdAt)}</td>{actor?.role === 'admin' ? <td className="p-3">{(canDismiss || filters.visibility === 'dismissed') ? <Button size="sm" variant={filters.visibility === 'dismissed' ? 'secondary' : 'danger'} onClick={() => setSelectedOperation({ id: String(item.id), mediaType: String(item.mediaType || 'image') })}>{filters.visibility === 'dismissed' ? t('admin.operations.restore') : t('admin.operations.dismiss')}</Button> : null}</td> : null}</tr>; })}</tbody></table>{query.data.items.length === 0 ? <p className="m-0 p-5 text-sm text-[var(--mpf-text-muted)]">{t('admin.operations.empty')}</p> : null}</div><AdminPagination canPrevious={navigation.canPrevious} canNext={query.data.hasMore} onPrevious={navigation.previous} onNext={() => navigation.next(query.data?.nextCursor)} previousLabel={t('admin.pagination.previous')} nextLabel={t('admin.pagination.next')} label={query.data.totalApprox === undefined ? undefined : t('admin.pagination.total', { count: query.data.totalApprox })} /></> : null}
    {selectedOperation ? <Surface className="mt-4 p-4"><form className="grid gap-3 md:grid-cols-[1fr_auto_auto]" onSubmit={event => { event.preventDefault(); command.mutate(); }}><label className="grid gap-1 text-sm"><span>{t('admin.operations.reason')}</span><input className="h-10 border border-[var(--mpf-border)] bg-[var(--mpf-surface)] px-3" required minLength={3} maxLength={300} value={reason} onChange={event => setReason(event.target.value)} /></label><Button type="submit" variant={filters.visibility === 'dismissed' ? 'primary' : 'danger'} disabled={command.isPending}>{filters.visibility === 'dismissed' ? t('admin.operations.restore') : t('admin.operations.dismiss')}</Button><Button type="button" variant="ghost" onClick={() => { setSelectedOperation(null); setReason(''); }}>{t('admin.operations.cancel')}</Button></form></Surface> : null}
  </AdminWorkspaceLayout>;
}

function formatTime(value: unknown) {
  if (!value) return '';
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

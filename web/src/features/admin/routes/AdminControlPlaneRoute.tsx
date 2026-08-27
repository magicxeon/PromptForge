import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, FileSearch, LifeBuoy, LockKeyhole, Search, Settings2 } from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { ErrorState, LoadingState } from '../../../components/ui/AsyncState';
import { Surface } from '../../../components/ui/Surface';
import { useActor } from '../../../lib/auth/ActorProvider';
import { createAdminConfigurationDraft, createSupportCase, getAdminCapabilities, getAdminConfigurationRevisions, getAdminCreditReconciliation, getAdminProviderHealth, getAdminTrace, listAdminContent, listSupportCases, updateSupportCase } from '../api/adminApi';
import { AdminStatusBadge } from '../components/AdminStatusBadge';
import { AdminPagination } from '../components/AdminPagination';
import { AdminWorkspaceLayout } from '../components/AdminWorkspaceLayout';

type Tab = 'readiness' | 'support' | 'content' | 'trace' | 'configuration';

export function AdminControlPlaneRoute() {
  const { t } = useTranslation('admin');
  const { actor } = useActor();
  const [tab, setTab] = useState<Tab>('readiness');
  if (!['admin', 'support'].includes(actor?.role || '')) return <ErrorState title={t('admin.control.accessRequired')} />;
  const tabs: { id: Tab; icon: ReactNode }[] = [
    { id: 'readiness', icon: <Activity className="size-4" /> },
    { id: 'support', icon: <LifeBuoy className="size-4" /> },
    { id: 'content', icon: <FileSearch className="size-4" /> },
    { id: 'trace', icon: <Search className="size-4" /> },
    { id: 'configuration', icon: <Settings2 className="size-4" /> }
  ];
  return <AdminWorkspaceLayout eyebrow={t('admin.control.eyebrow')} title={t('admin.control.title')} description={t('admin.control.description')}>
    <div className="mb-5 flex gap-2 overflow-x-auto">{tabs.map(item => <Button key={item.id} size="sm" variant={tab === item.id ? 'primary' : 'secondary'} icon={item.icon} onClick={() => setTab(item.id)}>{t(`admin.control.tab.${item.id}`)}</Button>)}</div>
    {tab === 'readiness' ? <Readiness /> : null}
    {tab === 'support' ? <SupportCases /> : null}
    {tab === 'content' ? <ContentSearch /> : null}
    {tab === 'trace' ? <TraceSearch /> : null}
    {tab === 'configuration' ? <Configuration /> : null}
  </AdminWorkspaceLayout>;
}

function Readiness() {
  const { t } = useTranslation('admin');
  const query = useQuery({ queryKey: ['admin', 'capabilities'], queryFn: getAdminCapabilities });
  const providerHealth = useQuery({ queryKey: ['admin', 'provider-health'], queryFn: getAdminProviderHealth });
  const creditReconciliation = useQuery({ queryKey: ['admin', 'credit-reconciliation'], queryFn: getAdminCreditReconciliation });
  if (query.isLoading) return <LoadingState label={t('admin.control.loading')} />;
  if (query.isError || !query.data) return <ErrorState title={t('admin.control.loadFailed')} description={query.error?.message} />;
  return <div className="grid gap-5"><div className="grid gap-3 lg:grid-cols-2"><Surface className="p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><strong>{t('admin.control.providerHealth')}</strong><p className="mb-0 mt-1 text-sm text-[var(--mpf-text-muted)]">{providerHealth.data?.note || t('admin.control.loading')}</p></div><AdminStatusBadge status={providerHealth.isError ? 'unavailable' : 'ready'} /></div>{providerHealth.data ? <p className="mb-0 mt-3 text-sm">{providerHealth.data.providers.map(provider => `${provider.id} (${provider.modelCount})`).join(' / ') || t('admin.control.noProviders')}</p> : null}</Surface><Surface className="p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><strong>{t('admin.control.creditReconciliation')}</strong><p className="mb-0 mt-1 text-sm text-[var(--mpf-text-muted)]">{t('admin.control.creditReadOnly')}</p></div><AdminStatusBadge status={creditReconciliation.isError ? 'unavailable' : 'read_only'} /></div>{creditReconciliation.data ? <p className="mb-0 mt-3 text-sm">{Object.entries(creditReconciliation.data.counts).map(([status, count]) => `${status}: ${count}`).join(' / ') || t('admin.control.noReservations')}</p> : null}</Surface></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{Object.values(query.data.capabilities).map(capability => <Surface key={capability.id} className="grid gap-3 p-4">
    <div className="flex items-start justify-between gap-3"><strong>{capability.id}</strong><AdminStatusBadge status={capability.enabled ? capability.mode : 'disabled'} /></div>
    <p className="m-0 text-sm text-[var(--mpf-text-muted)]">{capability.reason || t('admin.control.available')}</p>
    {capability.prerequisites.length ? <small className="text-[var(--mpf-text-muted)]">{capability.prerequisites.join(' / ')}</small> : null}
  </Surface>)}</div></div>;
}

function SupportCases() {
  const { t } = useTranslation('admin');
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [cursor, setCursor] = useState<string | null>(null);
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const query = useQuery({ queryKey: ['admin', 'support-cases', search, cursor], queryFn: () => listSupportCases({ search, cursor }) });
  const create = useMutation({ mutationFn: createSupportCase, onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin', 'support-cases'] }) });
  const update = useMutation({ mutationFn: ({ caseId, version, status }: { caseId: string; version: number; status: string }) => updateSupportCase(caseId, { expectedVersion: version, status, reason: `Staff changed status to ${status}` }), onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin', 'support-cases'] }) });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    create.mutate({ title: String(form.get('title') || ''), description: String(form.get('description') || ''), priority: String(form.get('priority') || 'normal'), customerUserId: String(form.get('customerUserId') || '') || undefined });
    event.currentTarget.reset();
  }
  return <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
    <div><Surface className="overflow-hidden"><header className="border-b border-[var(--mpf-border)] p-4"><input aria-label={t('admin.control.searchCases')} value={search} onChange={event => { setSearch(event.target.value); setCursor(null); setCursorStack([]); }} placeholder={t('admin.control.searchCases')} className="h-11 w-full border border-[var(--mpf-border)] bg-[var(--mpf-surface)] px-3" /></header>
      {query.isLoading ? <LoadingState label={t('admin.control.loading')} /> : query.data?.items.map(item => <article key={item.id} className="grid gap-2 border-b border-[var(--mpf-border)] p-4 last:border-0"><div className="flex justify-between gap-3"><strong>{item.title}</strong><AdminStatusBadge status={item.status} /></div><small>{item.id} · {item.priority} · v{item.version}</small><p className="m-0 text-sm text-[var(--mpf-text-muted)]">{item.description}</p><div className="flex flex-wrap gap-2">{item.status === 'open' ? <Button size="sm" onClick={() => update.mutate({ caseId: item.id, version: item.version, status: 'investigating' })}>{t('admin.control.investigate')}</Button> : null}{['open', 'investigating', 'waiting_for_customer'].includes(item.status) ? <Button size="sm" onClick={() => update.mutate({ caseId: item.id, version: item.version, status: 'resolved' })}>{t('admin.control.resolve')}</Button> : null}{item.status === 'resolved' ? <Button size="sm" onClick={() => update.mutate({ caseId: item.id, version: item.version, status: 'closed' })}>{t('admin.control.closeCase')}</Button> : null}</div></article>)}</Surface>
      <AdminPagination canPrevious={cursorStack.length > 0} canNext={Boolean(query.data?.hasMore && query.data.nextCursor)} previousLabel={t('admin.pagination.previous')} nextLabel={t('admin.pagination.next')} onPrevious={() => { const previous = cursorStack.at(-1) || null; setCursorStack(current => current.slice(0, -1)); setCursor(previous); }} onNext={() => { if (!query.data?.nextCursor) return; setCursorStack(current => [...current, cursor || '']); setCursor(query.data.nextCursor || null); }} /></div>
    <Surface className="h-fit p-4"><h2 className="mt-0 text-lg">{t('admin.control.newCase')}</h2><form className="grid gap-3" onSubmit={submit}><input name="title" required minLength={4} placeholder={t('admin.control.caseTitle')} className="h-11 border border-[var(--mpf-border)] bg-[var(--mpf-surface)] px-3" /><textarea name="description" placeholder={t('admin.control.caseDescription')} className="min-h-28 border border-[var(--mpf-border)] bg-[var(--mpf-surface)] p-3" /><input name="customerUserId" placeholder={t('admin.control.customerId')} className="h-11 border border-[var(--mpf-border)] bg-[var(--mpf-surface)] px-3" /><select name="priority" className="h-11 border border-[var(--mpf-border)] bg-[var(--mpf-surface)] px-3"><option value="normal">normal</option><option value="high">high</option><option value="urgent">urgent</option><option value="low">low</option></select><Button type="submit" variant="primary" disabled={create.isPending}>{t('admin.control.createCase')}</Button></form></Surface>
  </div>;
}

function ContentSearch() {
  const { t } = useTranslation('admin'); const [search, setSearch] = useState(''); const [type, setType] = useState('all');
  const [cursor, setCursor] = useState<string | null>(null); const [cursorStack, setCursorStack] = useState<string[]>([]);
  const resetPage = () => { setCursor(null); setCursorStack([]); };
  const query = useQuery({ queryKey: ['admin', 'content', search, type, cursor], queryFn: () => listAdminContent({ search, type, cursor }) });
  return <div className="grid gap-4"><Surface className="flex flex-wrap gap-3 p-4"><input value={search} onChange={event => { setSearch(event.target.value); resetPage(); }} placeholder={t('admin.control.searchContent')} className="h-11 min-w-64 flex-1 border border-[var(--mpf-border)] bg-[var(--mpf-surface)] px-3" /><select value={type} onChange={event => { setType(event.target.value); resetPage(); }} className="h-11 border border-[var(--mpf-border)] bg-[var(--mpf-surface)] px-3"><option value="all">all</option><option value="asset">asset</option><option value="post">post</option><option value="template">template</option><option value="character">character</option></select></Surface><RecordList items={query.data?.items || []} loading={query.isLoading} /><AdminPagination canPrevious={cursorStack.length > 0} canNext={Boolean(query.data?.hasMore && query.data.nextCursor)} previousLabel={t('admin.pagination.previous')} nextLabel={t('admin.pagination.next')} onPrevious={() => { const previous = cursorStack.at(-1) || null; setCursorStack(current => current.slice(0, -1)); setCursor(previous); }} onNext={() => { if (!query.data?.nextCursor) return; setCursorStack(current => [...current, cursor || '']); setCursor(query.data.nextCursor || null); }} /></div>;
}

function TraceSearch() {
  const { t } = useTranslation('admin'); const [draft, setDraft] = useState(''); const [identifier, setIdentifier] = useState('');
  const query = useQuery({ queryKey: ['admin', 'trace', identifier], queryFn: () => getAdminTrace(identifier), enabled: identifier.length >= 4 });
  return <div className="grid gap-4"><Surface className="flex gap-3 p-4"><input value={draft} onChange={event => setDraft(event.target.value)} placeholder={t('admin.control.tracePlaceholder')} className="h-11 min-w-64 flex-1 border border-[var(--mpf-border)] bg-[var(--mpf-surface)] px-3" /><Button icon={<Search className="size-4" />} onClick={() => setIdentifier(draft.trim())}>{t('admin.control.trace')}</Button></Surface>{query.data ? <><RecordList items={query.data.direct} /><RecordList items={query.data.related} /></> : null}</div>;
}

function Configuration() {
  const { t } = useTranslation('admin'); const queryClient = useQueryClient();
  const [parseError, setParseError] = useState<string | null>(null);
  const state = useQuery({ queryKey: ['admin', 'configuration'], queryFn: getAdminConfigurationRevisions });
  const create = useMutation({ mutationFn: createAdminConfigurationDraft, onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin', 'configuration'] }) });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    try {
      const values = JSON.parse(String(form.get('values') || '{}')) as Record<string, unknown>;
      setParseError(null);
      create.mutate({ scope: String(form.get('scope')), values });
    } catch {
      setParseError(t('admin.control.invalidJson'));
    }
  }
  return <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]"><div className="grid gap-4"><Surface className="flex gap-3 border-amber-300/40 p-4"><LockKeyhole className="size-5 text-amber-300" /><div><strong>{t('admin.control.configurationGate')}</strong><p className="mb-0 mt-1 text-sm text-[var(--mpf-text-muted)]">{t('admin.control.configurationGateDescription')}</p></div></Surface><RecordList items={state.data?.revisions || []} loading={state.isLoading} /></div><Surface className="h-fit p-4"><h2 className="mt-0 text-lg">{t('admin.control.newDraft')}</h2><form className="grid gap-3" onSubmit={submit}><select name="scope" className="h-11 border border-[var(--mpf-border)] bg-[var(--mpf-surface)] px-3"><option value="providers">providers</option><option value="pricing">pricing</option><option value="video_pricing">video_pricing</option><option value="qualification">qualification</option><option value="feature_exposure">feature_exposure</option></select><textarea name="values" defaultValue="{}" className="min-h-48 border border-[var(--mpf-border)] bg-[var(--mpf-surface)] p-3 font-mono text-xs" /><Button type="submit" variant="primary" disabled={create.isPending}>{t('admin.control.saveDraft')}</Button>{parseError ? <small className="text-red-300">{parseError}</small> : null}{create.isError ? <small className="text-red-300">{create.error.message}</small> : null}</form></Surface></div>;
}

function RecordList({ items, loading = false }: { items: Record<string, unknown>[]; loading?: boolean }) {
  if (loading) return <LoadingState label="Loading..." />;
  return <Surface className="overflow-hidden">{items.length ? items.map((item, index) => <article key={String(item.id || index)} className="grid gap-1 border-b border-[var(--mpf-border)] p-4 text-sm last:border-0"><strong>{String(item.title || item.id || item.type || '')}</strong><span className="text-[var(--mpf-text-muted)]">{[item.type, item.status, item.ownerUserId].filter(Boolean).join(' · ')}</span></article>) : <p className="m-0 p-4 text-sm text-[var(--mpf-text-muted)]">No matching records.</p>}</Surface>;
}

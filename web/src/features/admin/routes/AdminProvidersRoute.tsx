import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bot,
  ChevronDown,
  ChevronRight,
  Image as ImageIcon,
  Search,
  ServerCog,
  Video
} from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ErrorState, LoadingState } from '../../../components/ui/AsyncState';
import { Button } from '../../../components/ui/Button';
import { StatusNotice } from '../../../components/ui/StatusNotice';
import { Surface } from '../../../components/ui/Surface';
import { ToggleSwitch } from '../../../components/ui/ToggleSwitch';
import { useActor } from '../../../lib/auth/ActorProvider';
import { applyAdminProviderControl, getAdminProviderControls } from '../api/adminApi';
import { AdminStatusBadge } from '../components/AdminStatusBadge';
import { AdminWorkspaceLayout } from '../components/AdminWorkspaceLayout';
import type {
  AdminProviderControl,
  AdminProviderControls,
  AdminProviderModelControl,
  AdminProviderWorkflowControl
} from '../schemas/adminSchemas';

type MediaFilter = 'all' | 'image' | 'video' | 'ai_text';
type ControlTarget = {
  targetType: 'provider' | 'model' | 'workflow';
  providerId: string;
  modelId: string | null;
  workflow: string | null;
  displayName: string;
  enabled: boolean;
};

export function AdminProvidersRoute() {
  const { t } = useTranslation('admin');
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>('all');
  const [expandedProviders, setExpandedProviders] = useState<Set<string>>(new Set());
  const [target, setTarget] = useState<ControlTarget | null>(null);
  const [reason, setReason] = useState('');
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; title: string; description: string } | null>(null);
  const query = useQuery({
    queryKey: ['admin', 'provider-controls'],
    queryFn: getAdminProviderControls,
    staleTime: 0
  });
  const mutation = useMutation({
    mutationFn: applyAdminProviderControl,
    onSuccess: data => {
      queryClient.setQueryData(['admin', 'provider-controls'], data);
      setNotice({
        tone: 'success',
        title: t('admin.providers.saved'),
        description: t('admin.providers.savedDescription', { version: data.version })
      });
      setTarget(null);
      setReason('');
    },
    onError: error => {
      setNotice({
        tone: 'error',
        title: t('admin.providers.saveFailed'),
        description: error.message
      });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'provider-controls'] });
    }
  });

  const providers = useMemo(() => filterProviders(query.data?.providers || [], search, mediaFilter), [
    query.data?.providers,
    search,
    mediaFilter
  ]);

  if (!['admin', 'support'].includes(actor?.role || '')) {
    return <ErrorState title={t('admin.providers.accessRequired')} />;
  }
  if (query.isLoading) return <LoadingState label={t('admin.providers.loading')} />;
  if (query.isError || !query.data) {
    return <ErrorState title={t('admin.providers.loadFailed')} description={query.error?.message} />;
  }

  const controls = query.data;
  const canMutate = controls.mutationAvailable && actor?.role === 'admin';
  const toggleProvider = (providerId: string) => {
    setExpandedProviders(current => {
      const next = new Set(current);
      if (next.has(providerId)) next.delete(providerId);
      else next.add(providerId);
      return next;
    });
  };
  const requestChange = (nextTarget: ControlTarget) => {
    setNotice(null);
    setReason('');
    setTarget(nextTarget);
  };

  return (
    <AdminWorkspaceLayout
      eyebrow={t('admin.providers.eyebrow')}
      title={t('admin.providers.title')}
      description={t('admin.providers.description')}
    >
      <section className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--mpf-border)] pb-4 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <AdminStatusBadge status={`version_${controls.version}`} />
          <span className="text-[var(--mpf-text-muted)]">
            {controls.updatedAt
              ? t('admin.providers.updatedAt', { value: formatDateTime(controls.updatedAt) })
              : t('admin.providers.noOverrides')}
          </span>
        </div>
        <span className="text-[var(--mpf-text-muted)]">
          {t('admin.providers.providerCount', { count: controls.providers.length })}
        </span>
      </section>

      {!canMutate && controls.mutationReason ? (
        <div className="mb-4">
          <StatusNotice tone="info" title={t('admin.providers.readOnly')}>
            {controls.mutationReason}
          </StatusNotice>
        </div>
      ) : null}
      {notice ? (
        <div className="mb-4">
          <StatusNotice tone={notice.tone} title={notice.title}>{notice.description}</StatusNotice>
        </div>
      ) : null}

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <label className="relative min-w-0 flex-1 md:max-w-lg">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--mpf-text-muted)]" />
          <span className="sr-only">{t('admin.providers.search')}</span>
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder={t('admin.providers.searchPlaceholder')}
            className="h-10 w-full rounded-[var(--mpf-radius-sm)] border border-[var(--mpf-border)] bg-[var(--mpf-surface)] pl-9 pr-3 text-sm"
          />
        </label>
        <div className="flex max-w-full gap-1 overflow-x-auto" aria-label={t('admin.providers.mediaFilter')}>
          {(['all', 'image', 'video', 'ai_text'] as const).map(filter => (
            <Button
              key={filter}
              size="sm"
              variant={mediaFilter === filter ? 'primary' : 'secondary'}
              icon={mediaIcon(filter)}
              onClick={() => setMediaFilter(filter)}
            >
              {t(`admin.providers.media.${filter}`)}
            </Button>
          ))}
        </div>
      </div>

      <Surface className="overflow-hidden">
        {providers.length ? providers.map(provider => (
          <ProviderRow
            key={provider.providerId}
            provider={provider}
            expanded={expandedProviders.has(provider.providerId)}
            canMutate={canMutate}
            onExpand={() => toggleProvider(provider.providerId)}
            onChange={requestChange}
          />
        )) : (
          <p className="m-0 p-5 text-sm text-[var(--mpf-text-muted)]">{t('admin.providers.noMatches')}</p>
        )}
      </Surface>

      <ProviderControlDialog
        target={target}
        reason={reason}
        pending={mutation.isPending}
        onReasonChange={setReason}
        onClose={() => { if (!mutation.isPending) setTarget(null); }}
        onConfirm={() => {
          if (!target || reason.trim().length < 3) return;
          mutation.mutate({
            targetType: target.targetType,
            providerId: target.providerId,
            modelId: target.modelId,
            workflow: target.workflow,
            enabled: target.enabled,
            expectedVersion: controls.version,
            reason: reason.trim(),
            commandId: `provider_control_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
          });
        }}
      />
    </AdminWorkspaceLayout>
  );
}

function ProviderRow({ provider, expanded, canMutate, onExpand, onChange }: {
  provider: AdminProviderControl;
  expanded: boolean;
  canMutate: boolean;
  onExpand: () => void;
  onChange: (target: ControlTarget) => void;
}) {
  const { t } = useTranslation('admin');
  const checked = provider.masterOverride !== false;
  return (
    <section className="border-b border-[var(--mpf-border)] last:border-0">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-4">
        <button type="button" className="flex min-w-0 items-center gap-3 text-left" onClick={onExpand} aria-expanded={expanded}>
          {expanded ? <ChevronDown className="size-4 shrink-0" /> : <ChevronRight className="size-4 shrink-0" />}
          <ServerCog className="size-5 shrink-0 text-cyan-300" />
          <span className="min-w-0">
            <strong className="block truncate">{provider.displayName}</strong>
            <span className="mt-1 flex flex-wrap gap-1.5">
              {provider.mediaTypes.map(type => <AdminStatusBadge key={type} status={type} />)}
              <AdminStatusBadge status={provider.configured ? 'configured' : 'unavailable'} />
              <AdminStatusBadge status={provider.effectiveEnabled ? 'active' : provider.disabledScope || 'inactive'} />
            </span>
          </span>
        </button>
        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-[var(--mpf-text-muted)] sm:inline">
            {checked ? t('admin.providers.on') : t('admin.providers.off')}
          </span>
          <ToggleSwitch
            checked={checked}
            disabled={!canMutate}
            label={t('admin.providers.toggleLabel', {
              action: checked ? t('admin.providers.disable') : t('admin.providers.enable'),
              name: provider.displayName
            })}
            onClick={() => onChange({
              targetType: 'provider', providerId: provider.providerId, modelId: null, workflow: null,
              displayName: provider.displayName, enabled: !checked
            })}
          />
        </div>
      </header>
      {expanded ? (
        <div className="border-t border-[var(--mpf-border)] bg-[var(--theme-surface-subtle)] pl-4 sm:pl-9">
          {provider.models.map(model => (
            <ModelRow key={model.modelId} provider={provider} model={model} canMutate={canMutate} onChange={onChange} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function ModelRow({ provider, model, canMutate, onChange }: {
  provider: AdminProviderControl;
  model: AdminProviderModelControl;
  canMutate: boolean;
  onChange: (target: ControlTarget) => void;
}) {
  const { t } = useTranslation('admin');
  const checked = model.masterOverride !== false;
  return (
    <article className="border-b border-[var(--mpf-border)] p-4 last:border-0">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <strong className="block truncate text-sm">{model.displayName}</strong>
          <code className="mt-1 block break-all text-xs text-[var(--mpf-text-muted)]">{model.modelId}</code>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {model.mediaTypes.map(type => <AdminStatusBadge key={type} status={type} />)}
            <AdminStatusBadge status={model.qualificationStatus} />
            <AdminStatusBadge status={model.pricingStatus} />
            <AdminStatusBadge status={model.effectiveEnabled ? 'active' : model.disabledScope || 'inactive'} />
          </div>
          {model.reason ? <p className="mb-0 mt-2 text-xs text-amber-200">{model.reason}</p> : null}
        </div>
        <ToggleSwitch
          checked={checked}
          disabled={!canMutate}
          label={t('admin.providers.toggleLabel', {
            action: checked ? t('admin.providers.disable') : t('admin.providers.enable'),
            name: model.displayName
          })}
          onClick={() => onChange({
            targetType: 'model', providerId: provider.providerId, modelId: model.modelId, workflow: null,
            displayName: model.displayName, enabled: !checked
          })}
        />
      </div>
      <details className="mt-3 border-t border-[var(--mpf-border)] pt-3">
        <summary className="cursor-pointer text-xs font-semibold text-cyan-200">
          {t('admin.providers.workflowControls', { count: model.workflows.length })}
        </summary>
        <div className="mt-2 divide-y divide-[var(--mpf-border)]">
          {model.workflows.map(workflow => (
            <WorkflowRow
              key={workflow.id}
              provider={provider}
              model={model}
              workflow={workflow}
              canMutate={canMutate}
              onChange={onChange}
            />
          ))}
        </div>
      </details>
    </article>
  );
}

function WorkflowRow({ provider, model, workflow, canMutate, onChange }: {
  provider: AdminProviderControl;
  model: AdminProviderModelControl;
  workflow: AdminProviderWorkflowControl;
  canMutate: boolean;
  onChange: (target: ControlTarget) => void;
}) {
  const { t } = useTranslation('admin');
  const checked = workflow.override !== false;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-2.5">
      <div className="min-w-0">
        <span className="block break-all text-xs font-medium">{workflow.id}</span>
        <span className="text-xs text-[var(--mpf-text-muted)]">
          {workflow.effectiveEnabled
            ? t('admin.providers.effectiveEnabled')
            : t('admin.providers.disabledBy', { scope: workflow.disabledScope || 'static policy' })}
        </span>
      </div>
      <ToggleSwitch
        checked={checked}
        disabled={!canMutate}
        label={t('admin.providers.toggleLabel', {
          action: checked ? t('admin.providers.disable') : t('admin.providers.enable'),
          name: workflow.id
        })}
        onClick={() => onChange({
          targetType: 'workflow', providerId: provider.providerId, modelId: model.modelId,
          workflow: workflow.id, displayName: workflow.id, enabled: !checked
        })}
      />
    </div>
  );
}

function ProviderControlDialog({ target, reason, pending, onReasonChange, onClose, onConfirm }: {
  target: ControlTarget | null;
  reason: string;
  pending: boolean;
  onReasonChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const { t } = useTranslation('admin');
  return (
    <AlertDialog.Root open={Boolean(target)} onOpenChange={open => { if (!open) onClose(); }}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="app-confirm-dialog__overlay fixed inset-0 bg-[var(--theme-overlay)] backdrop-blur-sm" />
        <AlertDialog.Content className="app-confirm-dialog__content fixed left-1/2 top-1/2 w-[min(92vw,520px)] -translate-x-1/2 -translate-y-1/2 rounded-[var(--mpf-radius-md)] border border-[var(--mpf-border)] bg-[var(--mpf-surface-strong)] p-5 shadow-[var(--mpf-shadow-raised)]">
          <AlertDialog.Title className="m-0 text-xl">
            {target?.enabled ? t('admin.providers.enableTitle') : t('admin.providers.disableTitle')}
          </AlertDialog.Title>
          <AlertDialog.Description className="mb-4 mt-3 text-sm leading-6 text-[var(--mpf-text-muted)]">
            {target ? t('admin.providers.confirmDescription', {
              action: target.enabled ? t('admin.providers.enable') : t('admin.providers.disable'),
              name: target.displayName,
              scope: target.targetType
            }) : ''}
          </AlertDialog.Description>
          <label className="grid gap-2 text-sm font-semibold">
            {t('admin.providers.reason')}
            <textarea
              autoFocus
              value={reason}
              maxLength={500}
              onChange={event => onReasonChange(event.target.value)}
              placeholder={t('admin.providers.reasonPlaceholder')}
              className="min-h-28 rounded-[var(--mpf-radius-sm)] border border-[var(--mpf-border)] bg-[var(--mpf-surface)] p-3 font-normal"
            />
          </label>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <AlertDialog.Cancel asChild>
              <Button variant="ghost" disabled={pending}>{t('admin.providers.cancel')}</Button>
            </AlertDialog.Cancel>
            <Button
              variant={target?.enabled ? 'primary' : 'danger'}
              disabled={pending || reason.trim().length < 3}
              onClick={onConfirm}
            >
              {pending ? t('admin.providers.saving') : t('admin.providers.confirm')}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

function filterProviders(providers: AdminProviderControl[], search: string, mediaFilter: MediaFilter) {
  const query = search.trim().toLowerCase();
  return providers.filter(provider => {
    const matchesMedia = mediaFilter === 'all' || provider.mediaTypes.includes(mediaFilter);
    const matchesSearch = !query || provider.providerId.toLowerCase().includes(query)
      || provider.displayName.toLowerCase().includes(query)
      || provider.models.some(model => model.modelId.toLowerCase().includes(query)
        || model.displayName.toLowerCase().includes(query));
    return matchesMedia && matchesSearch;
  });
}

function mediaIcon(filter: MediaFilter): ReactNode {
  if (filter === 'image') return <ImageIcon className="size-4" />;
  if (filter === 'video') return <Video className="size-4" />;
  if (filter === 'ai_text') return <Bot className="size-4" />;
  return <ServerCog className="size-4" />;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

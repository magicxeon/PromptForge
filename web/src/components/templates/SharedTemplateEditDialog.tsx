import * as Dialog from '@radix-ui/react-dialog';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Calculator,
  CheckCircle2,
  CircleX,
  Clock3,
  LoaderCircle,
  Pencil,
  Share2,
  Trash2,
  X
} from 'lucide-react';
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  retireCommunityPost,
  updateCommunityPostPresentation
} from '../../features/community/api/communityApi';
import {
  estimateTemplatePoseProxy,
  getTemplatePoseProxy,
  prepareTemplatePoseProxy,
  reviewTemplatePoseProxy,
  type TemplatePoseProxyEstimate
} from '../../features/templates/templatePoseProxyApi';
import type {
  CommunityPost
} from '../../features/community/schemas/communitySchemas';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { StatusNotice } from '../ui/StatusNotice';
import { showToast } from '../ui/toastStore';
import { queryKeys } from '../../lib/api/queryKeys';
import { pollingPolicy } from '../../lib/api/pollingPolicy';
import { useActor } from '../../lib/auth/ActorProvider';
import { routeBuilders } from '../../app/routeRegistry/routes';

export function SharedTemplateEditDialog({
  post,
  trigger,
  open: controlledOpen,
  onOpenChange,
  autoEstimateReadiness = false,
  hideTrigger = false
}: {
  post: CommunityPost;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  autoEstimateReadiness?: boolean;
  hideTrigger?: boolean;
}) {
  const { t } = useTranslation('react-ui');
  const navigate = useNavigate();
  const { actor } = useActor();
  const actorId = actor?.userId || 'loading';
  const helpId = useId();
  const queryClient = useQueryClient();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = (next: boolean) => {
    if (controlledOpen === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  };
  const [poseProxyEstimate, setPoseProxyEstimate] = useState<TemplatePoseProxyEstimate | null>(null);
  const [activatedDuringSession, setActivatedDuringSession] = useState(false);
  const autoEstimateKey = useRef<string | null>(null);
  const templateId = post.templateId || null;
  const poseProxy = useQuery({
    queryKey: queryKeys.templatePoseProxy(actorId, templateId),
    queryFn: () => getTemplatePoseProxy(templateId!),
    enabled: open && Boolean(templateId),
    refetchInterval: query => pollingPolicy.templatePreparation(query.state.data?.status)
  });
  const estimateProxy = useMutation({
    mutationFn: () => estimateTemplatePoseProxy(templateId!, post.templateVersionId),
    onSuccess: result => {
      setPoseProxyEstimate(result);
      if (result.proxy) {
        queryClient.setQueryData(
          queryKeys.templatePoseProxy(actorId, templateId),
          result.proxy
        );
      }
    },
    onError: error => showToast({
      tone: 'error',
      title: t('ui.toast.templatePreparationFailed'),
      description: error.message
    })
  });
  const prepareProxy = useMutation({
    mutationFn: () => prepareTemplatePoseProxy(
      templateId!,
      post.templateVersionId,
      poseProxyEstimate!.estimateId!
    ),
    onSuccess: async () => {
      setPoseProxyEstimate(null);
      showToast({
        tone: 'info',
        title: t('ui.toast.templatePreparationStarted'),
        description: t('ui.toast.templatePreparationStartedDescription')
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.templatePoseProxy(actorId, templateId)
      });
    },
    onError: error => showToast({
      tone: 'error',
      title: t('ui.toast.templatePreparationFailed'),
      description: error.message
    })
  });
  const reviewProxy = useMutation({
    mutationFn: (decision: 'approve' | 'reject') => reviewTemplatePoseProxy(
      templateId!,
      poseProxy.data!.proxyId!,
      decision
    ),
    onSuccess: async (_, decision) => {
      if (decision === 'approve') {
        setActivatedDuringSession(true);
        showToast({
          tone: 'success',
          title: t('ui.toast.templatePublished'),
          description: t('ui.toast.templatePublishedDescription')
        });
      }
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.templatePoseProxy(actorId, templateId)
        }),
        queryClient.invalidateQueries({ queryKey: ['community-post', post.id] }),
        queryClient.invalidateQueries({ queryKey: ['community-posts'] }),
        queryClient.invalidateQueries({ queryKey: ['creator-page'] }),
        queryClient.invalidateQueries({ queryKey: ['fashion-ready-template-index'] })
      ]);
    }
  });
  const update = useMutation({
    mutationFn: (input: {
      title: string;
      description: string;
      customTags: string[];
      visibility: 'public' | 'unlisted' | 'private';
      promptVisibility: 'full' | 'remix_only';
      templateAccessCredits: number;
    }) => updateCommunityPostPresentation(post.id, input),
    onSuccess: async () => {
      setOpen(false);
      showToast({ tone: 'success', title: t('ui.toast.templateSaved') });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['community-post', post.id] }),
        queryClient.invalidateQueries({ queryKey: ['community-posts'] }),
        queryClient.invalidateQueries({ queryKey: ['creator-page'] })
      ]);
      navigate(routeBuilders.post(post.id));
    },
    onError: error => showToast({
      tone: 'error',
      title: t('ui.toast.templateSaveFailed'),
      description: error.message
    })
  });
  const retire = useMutation({
    mutationFn: () => retireCommunityPost(post.id),
    onSuccess: async () => {
      setOpen(false);
      showToast({
        tone: 'success',
        title: t('ui.toast.templateRetired'),
        description: t('ui.toast.templateRetiredDescription')
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['community-post', post.id] }),
        queryClient.invalidateQueries({ queryKey: ['community-posts'] }),
        queryClient.invalidateQueries({ queryKey: ['creator-page'] }),
        queryClient.invalidateQueries({ queryKey: ['fashion-templates'] }),
        queryClient.invalidateQueries({ queryKey: ['fashion-ready-template-index'] })
      ]);
    },
    onError: error => showToast({
      tone: 'error',
      title: t('ui.toast.templateRetireFailed'),
      description: error.message
    })
  });
  const readinessError = poseProxy.error
    || estimateProxy.error
    || prepareProxy.error
    || reviewProxy.error;
  const displayedReadinessStatus = readinessError
    ? 'failed'
    : prepareProxy.isPending
      ? 'processing'
      : poseProxy.data?.status || 'not_prepared';
  const readinessWorking = poseProxy.isLoading
    || prepareProxy.isPending
    || ['pending', 'processing'].includes(displayedReadinessStatus);
  const sharingStatus = post.status === 'owner_unpublished'
    ? 'retired'
    : post.status === 'draft' && !activatedDuringSession
      ? 'setup_required'
      : normalizeSharingStatus(post.visibility);
  const requestPoseProxyEstimate = estimateProxy.mutate;

  useEffect(() => {
    const key = `${templateId || ''}:${post.templateVersionId || ''}`;
    if (
      !autoEstimateReadiness
      || !open
      || !templateId
      || poseProxy.isLoading
      || !poseProxy.data
      || !['not_prepared', 'failed', 'superseded'].includes(poseProxy.data.status)
      || poseProxyEstimate
      || estimateProxy.isPending
      || autoEstimateKey.current === key
    ) {
      return;
    }
    autoEstimateKey.current = key;
    requestPoseProxyEstimate();
  }, [
    autoEstimateReadiness,
    estimateProxy.isPending,
    open,
    poseProxy.data,
    poseProxy.isLoading,
    poseProxyEstimate,
    post.templateVersionId,
    requestPoseProxyEstimate,
    templateId
  ]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    update.mutate({
      title: String(form.get('title') || '').trim(),
      description: String(form.get('description') || '').trim(),
      customTags: parseTags(String(form.get('customTags') || '')),
      visibility: normalizeVisibility(form.get('visibility')),
      promptVisibility: normalizeTemplatePromptVisibility(form.get('promptVisibility')),
      templateAccessCredits: Math.max(
        0,
        Math.trunc(Number(form.get('templateAccessCredits')) || 0)
      )
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      {!hideTrigger ? (
        <Dialog.Trigger asChild>
          {trigger || (
            <Button size="sm" icon={<Pencil className="size-4" aria-hidden="true" />}>
              {t('ui.templateManagement.edit')}
            </Button>
          )}
        </Dialog.Trigger>
      ) : null}
      <Dialog.Portal>
        <Dialog.Overlay className="template-management-dialog__overlay" />
        <Dialog.Content className="template-management-dialog">
          <header className="template-management-dialog__header">
            <div>
              <Dialog.Title>{t('ui.templateManagement.title')}</Dialog.Title>
              <Dialog.Description>
                {t('ui.templateManagement.description')}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button
                variant="ghost"
                size="icon"
                title={t('ui.action.close')}
                icon={<X aria-hidden="true" />}
              />
            </Dialog.Close>
          </header>

          <form onSubmit={submit}>
            <div className="template-management-dialog__body">
              <StatusNotice
                tone="info"
                title={t('ui.templateManagement.versionNoticeTitle')}
              >
                {t('ui.templateManagement.versionNotice', {
                  version: post.templateVersionId || '-'
                })}
              </StatusNotice>

              {templateId ? (
                <section
                  className="template-management-dialog__lifecycle"
                  aria-live={readinessWorking ? 'polite' : undefined}
                  aria-busy={readinessWorking}
                >
                  <div className="template-management-dialog__lifecycle-row is-sharing">
                    <span className="template-management-dialog__lifecycle-icon" aria-hidden="true">
                      <Share2 />
                    </span>
                    <div>
                      <span>{t('ui.templateManagement.sharingStatusLabel')}</span>
                      <strong>{t(`ui.templateManagement.sharingStatus.${sharingStatus}`)}</strong>
                      <small>{t(`ui.templateManagement.sharingStatusDescription.${sharingStatus}`)}</small>
                    </div>
                  </div>

                  <div className={`template-management-dialog__lifecycle-row is-${readinessTone(displayedReadinessStatus)}`}>
                    <span className="template-management-dialog__lifecycle-icon" aria-hidden="true">
                      {readinessWorking
                        ? <LoaderCircle className="animate-spin" />
                        : displayedReadinessStatus === 'active'
                          ? <CheckCircle2 />
                          : displayedReadinessStatus === 'failed'
                            ? <CircleX />
                            : <Clock3 />}
                    </span>
                    <div>
                      <span>{t('ui.templateManagement.fashionReadinessTitle')}</span>
                      <strong>
                        {poseProxy.isLoading
                          ? t('ui.templateManagement.checkingPoseProxy')
                          : t(`ui.templateManagement.poseProxyState.${displayedReadinessStatus}`)}
                      </strong>
                      <small>
                        {poseProxy.isLoading
                          ? t('ui.templateManagement.checkingPoseProxyDescription')
                          : t(`ui.templateManagement.poseProxyStatus.${displayedReadinessStatus}`)}
                      </small>
                    </div>
                  </div>

                  {poseProxy.data?.reviewImageUrl ? (
                    <img
                      src={poseProxy.data.reviewImageUrl}
                      alt={t('ui.templateManagement.poseProxyReviewAlt')}
                      className="template-management-dialog__pose-proxy-preview"
                    />
                  ) : null}
                  {poseProxy.data?.status === 'review_required' && poseProxy.data.proxyId ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={reviewProxy.isPending}
                      onClick={() => reviewProxy.mutate('approve')}
                    >
                      {t('ui.templateManagement.approvePoseProxy')}
                    </Button>
                  ) : !['active', 'processing', 'pending'].includes(poseProxy.data?.status || '') ? (
                    poseProxyEstimate?.estimateId ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="template-management-dialog__readiness-action"
                        disabled={prepareProxy.isPending}
                        icon={prepareProxy.isPending
                          ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                          : undefined}
                        onClick={() => prepareProxy.mutate()}
                      >
                        {prepareProxy.isPending
                          ? t('ui.templateManagement.preparingPoseProxy')
                          : t('ui.templateManagement.confirmPoseProxy', {
                            credits: poseProxyEstimate.estimatedCredits
                          })}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="template-management-dialog__readiness-action"
                        disabled={estimateProxy.isPending}
                        icon={estimateProxy.isPending
                          ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                          : <Calculator className="size-4" aria-hidden="true" />}
                        onClick={() => estimateProxy.mutate()}
                      >
                        {estimateProxy.isPending
                          ? t('ui.templateManagement.calculatingPoseProxy')
                          : t('ui.templateManagement.preparePoseProxy')}
                      </Button>
                    )
                  ) : null}
                  {readinessError ? (
                    <StatusNotice
                      tone="error"
                      title={t('ui.templateManagement.readinessFailed')}
                    >
                      <p>{readinessError.message}</p>
                      {poseProxy.data?.correlationId ? (
                        <small>{t('ui.templateManagement.supportReference', {
                          id: poseProxy.data.correlationId
                        })}</small>
                      ) : null}
                    </StatusNotice>
                  ) : null}
                </section>
              ) : null}

              <label className="template-management-dialog__field">
                <span>{t('ui.templateManagement.templateTitle')}</span>
                <input
                  name="title"
                  required
                  maxLength={120}
                  defaultValue={post.title}
                />
              </label>

              <label className="template-management-dialog__field">
                <span>{t('ui.templateManagement.templateDescription')}</span>
                <textarea
                  name="description"
                  maxLength={1000}
                  defaultValue={post.description}
                />
              </label>

              <label className="template-management-dialog__field">
                <span>{t('ui.templateManagement.customTags')}</span>
                <input
                  name="customTags"
                  maxLength={300}
                  defaultValue={post.customTags.join(', ')}
                  placeholder={t('ui.templateManagement.customTagsPlaceholder')}
                  aria-label={t('ui.templateManagement.customTags')}
                  aria-describedby={`${helpId}-custom-tags`}
                />
                <small id={`${helpId}-custom-tags`}>
                  {t('ui.templateManagement.customTagsHelp')}
                </small>
              </label>

              <label className="template-management-dialog__field">
                <span>{t('ui.templateManagement.visibility')}</span>
                <select
                  name="visibility"
                  defaultValue={inferVisibility(post)}
                >
                  <option value="public">{t('ui.character.public')}</option>
                  <option value="unlisted">{t('ui.share.unlisted')}</option>
                  <option value="private">{t('ui.character.private')}</option>
                </select>
              </label>

              <label className="template-management-dialog__field">
                <span>{t('ui.templateManagement.promptVisibility')}</span>
                <select
                  name="promptVisibility"
                  defaultValue={post.promptVisibility === 'remix_only' ? 'remix_only' : 'full'}
                  aria-label={t('ui.templateManagement.promptVisibility')}
                  aria-describedby={`${helpId}-prompt-visibility`}
                >
                  <option value="full">{t('ui.share.full')}</option>
                  <option value="remix_only">{t('ui.share.remixOnly')}</option>
                </select>
                <small id={`${helpId}-prompt-visibility`}>
                  {t('ui.templateManagement.promptVisibilityHelp')}
                </small>
              </label>

              <label className="template-management-dialog__field">
                <span>{t('ui.templateManagement.accessCredits')}</span>
                <input
                  type="number"
                  name="templateAccessCredits"
                  min="0"
                  step="1"
                  defaultValue={post.templatePricing?.accessCredits || 0}
                  aria-label={t('ui.templateManagement.accessCredits')}
                  aria-describedby={`${helpId}-access-credits`}
                />
                <small id={`${helpId}-access-credits`}>
                  {t('ui.templateManagement.accessCreditsHelp')}
                </small>
              </label>

              {update.isError ? (
                <StatusNotice
                  tone="error"
                  title={t('ui.templateManagement.saveFailed')}
                >
                  {update.error.message}
                </StatusNotice>
              ) : null}
              {retire.isError ? (
                <StatusNotice
                  tone="error"
                  title={t('ui.templateManagement.retireFailed')}
                >
                  {retire.error.message}
                </StatusNotice>
              ) : null}
            </div>

            <footer className="template-management-dialog__footer">
              <ConfirmDialog
                title={t('ui.templateManagement.retireTitle')}
                description={t('ui.templateManagement.retireDescription')}
                confirmLabel={t('ui.templateManagement.retireConfirm')}
                destructive
                pending={retire.isPending}
                onConfirm={() => retire.mutate()}
                trigger={(
                  <Button
                    type="button"
                    variant="danger"
                    disabled={retire.isPending || post.status === 'owner_unpublished'}
                    icon={<Trash2 className="size-4" aria-hidden="true" />}
                  >
                    {post.status === 'owner_unpublished'
                      ? t('ui.templateManagement.retired')
                      : t('ui.templateManagement.retire')}
                  </Button>
                )}
              />
              <div className="template-management-dialog__footer-actions">
                <Dialog.Close asChild>
                  <Button type="button" variant="ghost">
                    {t('ui.action.cancel')}
                  </Button>
                </Dialog.Close>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={update.isPending || retire.isPending}
                >
                  {update.isPending
                    ? t('ui.templateManagement.saving')
                    : t('ui.templateManagement.save')}
                </Button>
              </div>
            </footer>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function parseTags(value: string) {
  return [...new Set(
    value
      .split(',')
      .map(tag => tag.trim())
      .filter(Boolean)
  )].slice(0, 12);
}

function normalizeVisibility(
  value: FormDataEntryValue | null
): 'public' | 'unlisted' | 'private' {
  return value === 'unlisted' || value === 'private' ? value : 'public';
}

function normalizeTemplatePromptVisibility(
  value: FormDataEntryValue | null
): 'full' | 'remix_only' {
  return value === 'remix_only' ? 'remix_only' : 'full';
}

function inferVisibility(post: CommunityPost): 'public' | 'unlisted' | 'private' {
  const visibility = post.visibility;
  return visibility === 'unlisted' || visibility === 'private'
    ? visibility
    : 'public';
}

function normalizeSharingStatus(
  visibility: CommunityPost['visibility']
): 'public' | 'unlisted' | 'members_only' | 'private' | 'retired' {
  if (visibility === 'unlisted' || visibility === 'members_only' || visibility === 'private') {
    return visibility;
  }
  return 'public';
}

function readinessTone(
  status: string
): 'idle' | 'working' | 'review' | 'ready' | 'error' {
  if (status === 'pending' || status === 'processing') return 'working';
  if (status === 'review_required') return 'review';
  if (status === 'active') return 'ready';
  if (status === 'failed') return 'error';
  return 'idle';
}

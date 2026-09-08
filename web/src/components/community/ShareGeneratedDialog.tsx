import * as Dialog from '@radix-ui/react-dialog';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Share2, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { routeBuilders } from '../../app/routeRegistry/routes';
import { getActiveActorId } from '../../lib/auth/actorStore';
import { cloneElement, isValidElement, useEffect, useState, type FormEvent, type ReactNode, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import {
  createGeneratedShareDraft,
  getGenerationShareStatus,
  publishGeneratedShare
} from '../../features/community/api/shareApi';
import { getCommunityPost } from '../../features/community/api/communityApi';
import { Button } from '../ui/Button';
import { Surface } from '../ui/Surface';
import { SharedTemplateEditDialog } from '../templates/SharedTemplateEditDialog';
import { TemplateInputPolicyFields } from '../templates/TemplateInputPolicyFields';
import type { TemplateInputOptions } from '../../features/templates/templateInputPolicyApi';
import type { CommunityPost } from '../../features/community/schemas/communitySchemas';
import { showToast } from '../ui/toastStore';
import { useActor } from '../../lib/auth/ActorProvider';
import { ApiError } from '../../lib/api/apiError';

export function ShareGeneratedDialog({
  jobId,
  trigger
}: {
  jobId: string;
  trigger?: ReactNode;
}) {
  const { actor } = useActor();
  return <ShareGeneratedDialogSession key={`${actor?.userId}:${jobId}`} actorId={actor?.userId || ''} jobId={jobId} trigger={trigger} />;
}

function ShareGeneratedDialogSession({ actorId, jobId, trigger }: { actorId: string; jobId: string; trigger?: ReactNode }) {
  const { t } = useTranslation('react-ui');
  const queryClient = useQueryClient();
  const statusKey = ['generation-share-status', actorId, jobId];
  const shareStatus = useQuery({ queryKey: statusKey, queryFn: () => getGenerationShareStatus(jobId),
    enabled: Boolean(actorId && jobId), staleTime: 30_000, gcTime: 60_000, retry: false });
  const [open, setOpen] = useState(false);
  const [publishedTemplate, setPublishedTemplate] = useState<CommunityPost | null>(null);
  const [templateManagementOpen, setTemplateManagementOpen] = useState(false);
  const [publishAsTemplate, setPublishAsTemplate] = useState(false);
  const [promptVisibility, setPromptVisibility] = useState('private');
  const [templateInputOptions, setTemplateInputOptions] = useState<TemplateInputOptions>({ characterEnabled: false, outfitBackEnabled: false });
  const handleConflict = (error: Error) => {
    if (error instanceof ApiError && error.code === 'community_generation_already_shared') {
      queryClient.setQueryData(statusKey, { shared: true }); setOpen(false);
      void queryClient.invalidateQueries({ queryKey: statusKey });
    } else {
      void queryClient.invalidateQueries({ queryKey: statusKey });
    }
  };
  const draft = useMutation({ mutationFn: () => createGeneratedShareDraft(jobId), onError: handleConflict });
  const publish = useMutation({
    mutationFn: (input: {
      title: string;
      description: string;
      promptVisibility: string;
      visibility: string;
      faceReusePolicy: 'view_only' | 'public_reusable';
      publishAsTemplate: boolean;
      templateAccessCredits: number;
      templateInputOptions?: TemplateInputOptions;
      publicInputSchema?: {
        schemaVersion: number;
        inputs: Record<string, unknown>[];
      } | null;
    }) => {
      if (!draft.data) throw new Error('Create a share draft first.');
      return publishGeneratedShare(draft.data.id, input);
    },
    onSuccess: (result) => {
      queryClient.setQueryData(statusKey, { shared: true, post: {
        id: result.id, postType: result.postType, visibility: result.visibility || 'public',
        status: result.status || (result.postType === 'template' ? 'draft' : 'published')
      } });
      void queryClient.invalidateQueries({ queryKey: ['community-posts', actorId] });
      void queryClient.invalidateQueries({ queryKey: ['community-template-previews', actorId] });
      void queryClient.invalidateQueries({ queryKey: ['community-template-detail', actorId] });
      if (getActiveActorId() !== actorId) return;
      setOpen(false);
      if (result.postType === 'template') {
        void getCommunityPost(result.id).then(post => {
          if (getActiveActorId() !== actorId) return;
          setPublishedTemplate(post);
          setTemplateManagementOpen(true);
        }).catch(() => {
          if (getActiveActorId() === actorId) showToast({ tone: 'error', title: t('ui.share.templateManagementLoadFailed') });
        });
        showToast({
          tone: 'success',
          title: t('ui.toast.templateSetupSaved'),
          description: t('ui.toast.templateSetupSavedDescription')
        });
      } else {
        showToast({ tone: 'success', title: t('ui.toast.postPublished') });
      }
    },
    onError: error => { handleConflict(error); showToast({
      tone: 'error',
      title: t('ui.toast.publishFailed'),
      description: error.message
    }); }
  });
  const derived = draft.data?.templateIneligibleReason === 'template_derived_generation';
  const canPublishTemplate = Boolean(draft.data?.templateEligible && !derived);
  const templatePromptPolicies = draft.data?.allowedTemplatePromptVisibilities ?? ['full'];
  const templatePromptIncompatible = publishAsTemplate && !templatePromptPolicies.some(policy => policy === promptVisibility);
  const shareDisabled = !shareStatus.data || shareStatus.isFetching || shareStatus.isError
    || shareStatus.data.shared || publish.isPending;
  const shareLabel = shareStatus.data?.shared ? t('ui.share.alreadyShared') : t('ui.action.share');
  const sharedPost = shareStatus.data?.shared ? shareStatus.data.post : undefined;

  useEffect(() => {
    setPublishAsTemplate(false);
    setPromptVisibility(draft.data?.promptVisibility || 'private');
    setTemplateInputOptions({
      characterEnabled: draft.data?.templateInputPolicy?.characterEnabled ?? false,
      outfitBackEnabled: draft.data?.templateInputPolicy?.outfitBackEnabled ?? false
    });
  }, [draft.data]);

  function change(next: boolean) {
    if (next && shareDisabled) return;
    setOpen(next);
    if (next && !draft.data && !draft.isPending) draft.mutate();
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (publish.isPending || shareStatus.data?.shared || templatePromptIncompatible) return;
    const form = new FormData(event.currentTarget);

    publish.mutate({
      title: String(form.get('title') || '').trim(),
      description: String(form.get('description') || '').trim(),
      promptVisibility: derived ? 'private' : promptVisibility,
      visibility: String(form.get('visibility') || 'public'),
      faceReusePolicy: form.get('faceReusePolicy') === 'public_reusable'
        ? 'public_reusable'
        : 'view_only',
      publishAsTemplate: canPublishTemplate && publishAsTemplate,
      templateAccessCredits: Math.max(
        0,
        Number(form.get('templateAccessCredits')) || 0
      ),
      templateInputOptions: canPublishTemplate && publishAsTemplate ? templateInputOptions : undefined
    });
  }

  return (
    <>
    <Dialog.Root open={open} onOpenChange={change}>
      <Dialog.Trigger asChild>
        {isValidElement(trigger) ? cloneElement(trigger as ReactElement<{ disabled?: boolean; title?: string }>, { disabled: shareDisabled, title: shareLabel }) : (
          <Button disabled={shareDisabled} title={shareLabel} icon={<Share2 className="size-4" />}>{shareLabel}</Button>
        )}
      </Dialog.Trigger>
      {sharedPost ? <Link className="inline-flex min-h-10 items-center gap-2 px-3 text-sm" to={
        sharedPost.postType === 'template' ? routeBuilders.templateDetail(sharedPost.id) : `/posts/${encodeURIComponent(sharedPost.id)}`
      }><ExternalLink className="size-4" aria-hidden="true" />{t(sharedPost.postType === 'template' ? 'ui.share.viewTemplate' : 'ui.share.viewPost')}</Link> : null}
      <Dialog.Portal>
        <Dialog.Overlay className="share-generated-dialog__overlay" />
        <Dialog.Content className="share-generated-dialog">
          <header className="share-generated-dialog__header">
            <div>
              <Dialog.Title>{t('ui.share.title')}</Dialog.Title>
              <Dialog.Description>{t(derived ? 'ui.share.derivedDescription' : 'ui.share.description')}</Dialog.Description>
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

          {draft.isPending ? (
            <p className="share-generated-dialog__status">
              {t('ui.share.preparing')}
            </p>
          ) : null}
          {draft.isError ? (
            <p className="share-generated-dialog__status is-error">
              {draft.error.message}
            </p>
          ) : null}

          {draft.data ? (
            <form className="share-generated-dialog__form" onSubmit={submit}>
              <div className="share-generated-dialog__body">
                <input
                  name="title"
                  required
                  maxLength={120}
                  placeholder={t('ui.share.postTitle')}
                />
                <textarea
                  name="description"
                  maxLength={1000}
                  placeholder={t('ui.share.postDescription')}
                />

                <div className="share-generated-dialog__visibility-grid">
                  {!derived ? <label>
                    <span>{t('ui.share.promptVisibility')}</span>
                    <select name="promptVisibility" value={promptVisibility}
                      onChange={event => setPromptVisibility(event.target.value)}
                      aria-invalid={templatePromptIncompatible || undefined}
                      aria-describedby={templatePromptIncompatible ? `template-prompt-policy-${jobId}` : undefined}>
                      <option value="full">{t('ui.share.full')}</option>
                      <option value="partial">{t('ui.share.partial')}</option>
                      {draft.data.templateEligible && templatePromptPolicies.includes('remix_only') ? (
                        <option value="remix_only">{t('ui.share.remixOnly')}</option>
                      ) : null}
                      <option value="private">{t('ui.character.private')}</option>
                    </select>
                  </label> : null}
                  <label>
                    <span>{t('ui.share.postVisibility')}</span>
                    <select name="visibility" defaultValue="public">
                      <option value="public">{t('ui.character.public')}</option>
                      <option value="unlisted">{t('ui.share.unlisted')}</option>
                      <option value="private">{t('ui.character.private')}</option>
                    </select>
                  </label>
                </div>

                {canPublishTemplate ? (
                  <Surface className="share-generated-dialog__template-panel">
                    <label className="share-generated-dialog__template-toggle">
                      <input
                        type="checkbox"
                        name="publishAsTemplate"
                        checked={publishAsTemplate}
                        onChange={event => setPublishAsTemplate(event.target.checked)}
                      />
                      <span>
                        <strong>{t('ui.share.publishTemplate')}</strong>
                        <small>{t('ui.share.publishTemplateHelp')}</small>
                      </span>
                    </label>

                    {publishAsTemplate ? (
                      <>
                      {templatePromptIncompatible ? (
                        <p id={`template-prompt-policy-${jobId}`} role="alert" className="share-generated-dialog__status is-error">
                          {t('ui.share.templatePromptPolicyRequired')}
                        </p>
                      ) : null}
                      {draft.data.templateInputPolicy ? (
                        <TemplateInputPolicyFields policy={draft.data.templateInputPolicy}
                          value={templateInputOptions} onChange={setTemplateInputOptions}
                          disabled={publish.isPending} />
                      ) : null}

                      <label className="share-generated-dialog__field">
                        <span>{t('ui.share.templateCredits')}</span>
                        <input
                          type="number"
                          name="templateAccessCredits"
                          min="0"
                          step="1"
                          defaultValue="0"
                        />
                      </label>
                      </>
                    ) : null}
                  </Surface>
                ) : null}

                {draft.data.faceReuseEligible ? (
                  <label className="share-generated-dialog__field">
                    <span>{t('ui.share.faceReuse')}</span>
                    <select name="faceReusePolicy" defaultValue="view_only">
                      <option value="view_only">{t('ui.share.faceViewOnly')}</option>
                      <option value="public_reusable">
                        {t('ui.share.facePublicReusable')}
                      </option>
                    </select>
                    <small>{t('ui.share.faceReuseHelp')}</small>
                  </label>
                ) : null}

                {publish.isError ? (
                  <p className="share-generated-dialog__status is-error">
                    {publish.error.message}
                  </p>
                ) : null}
              </div>

              <footer className="share-generated-dialog__footer">
                <Dialog.Close asChild>
                  <Button type="button" variant="ghost">
                    {t('ui.action.cancel')}
                  </Button>
                </Dialog.Close>
                <Button type="submit" variant="primary" disabled={publish.isPending || templatePromptIncompatible || (publishAsTemplate && !draft.data.templateInputPolicy?.supported)}>
                  {t(publishAsTemplate ? 'ui.share.publishTemplateAction' : 'ui.share.publishImageAction')}
                </Button>
              </footer>
            </form>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
    {shareStatus.isError ? <Button size="sm" onClick={() => void shareStatus.refetch()}>{t('ui.share.retryStatus')}</Button> : null}
    {publishedTemplate ? (
      <SharedTemplateEditDialog
        post={publishedTemplate}
        open={templateManagementOpen}
        onOpenChange={setTemplateManagementOpen}
        autoEstimateReadiness
        hideTrigger
      />
    ) : null}
    </>
  );
}

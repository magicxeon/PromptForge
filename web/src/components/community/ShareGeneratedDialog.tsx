import * as Dialog from '@radix-ui/react-dialog';
import { useMutation } from '@tanstack/react-query';
import { Share2, X } from 'lucide-react';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  createGeneratedShareDraft,
  publishGeneratedShare
} from '../../features/community/api/shareApi';
import { getCommunityPost } from '../../features/community/api/communityApi';
import { Button } from '../ui/Button';
import { Surface } from '../ui/Surface';
import { SharedTemplateEditDialog } from '../templates/SharedTemplateEditDialog';
import type { CommunityPost } from '../../features/community/schemas/communitySchemas';
import { showToast } from '../ui/toastStore';

export function ShareGeneratedDialog({
  jobId,
  trigger
}: {
  jobId: string;
  trigger?: ReactNode;
}) {
  const { t } = useTranslation('react-ui');
  const [open, setOpen] = useState(false);
  const [publishedTemplate, setPublishedTemplate] = useState<CommunityPost | null>(null);
  const [templateManagementOpen, setTemplateManagementOpen] = useState(false);
  const [publishAsTemplate, setPublishAsTemplate] = useState(false);
  const [selectedTemplateInputs, setSelectedTemplateInputs] = useState<Set<string>>(new Set());
  const [requiredTemplateInputs, setRequiredTemplateInputs] = useState<Set<string>>(new Set());
  const draft = useMutation({ mutationFn: () => createGeneratedShareDraft(jobId) });
  const publish = useMutation({
    mutationFn: (input: {
      title: string;
      description: string;
      promptVisibility: string;
      visibility: string;
      faceReusePolicy: 'view_only' | 'public_reusable';
      publishAsTemplate: boolean;
      templateAccessCredits: number;
      publicInputSchema?: {
        schemaVersion: number;
        inputs: Record<string, unknown>[];
      } | null;
    }) => {
      if (!draft.data) throw new Error('Create a share draft first.');
      return publishGeneratedShare(draft.data.id, input).then(async published => ({
        published,
        templatePost: input.publishAsTemplate && published.postType === 'template'
          ? await getCommunityPost(published.id)
          : null
      }));
    },
    onSuccess: (result) => {
      setOpen(false);
      if (result.templatePost) {
        setPublishedTemplate(result.templatePost);
        setTemplateManagementOpen(true);
        showToast({
          tone: 'success',
          title: t('ui.toast.templatePublished'),
          description: t('ui.toast.templatePublishedDescription')
        });
      } else {
        showToast({ tone: 'success', title: t('ui.toast.postPublished') });
      }
    },
    onError: error => showToast({
      tone: 'error',
      title: t('ui.toast.publishFailed'),
      description: error.message
    })
  });

  useEffect(() => {
    const inputs = draft.data?.suggestedTemplateInputSchema?.inputs || [];
    if (!draft.data?.templateEligible) {
      setPublishAsTemplate(false);
      setSelectedTemplateInputs(new Set());
      setRequiredTemplateInputs(new Set());
      return;
    }
    setPublishAsTemplate(true);
    setSelectedTemplateInputs(new Set(inputs
      .filter(isRecommendedTemplateInput)
      .map(input => String(input.id || ''))));
    setRequiredTemplateInputs(new Set(inputs
      .filter(input => isRecommendedTemplateInput(input) && isRecommendedRequiredInput(input))
      .map(input => String(input.id || ''))));
  }, [draft.data]);

  function change(next: boolean) {
    setOpen(next);
    if (next && !draft.data && !draft.isPending) draft.mutate();
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const publicInputSchema = publishAsTemplate && draft.data?.suggestedTemplateInputSchema
      ? {
        schemaVersion: 1,
        inputs: draft.data.suggestedTemplateInputSchema.inputs
          .filter(input => selectedTemplateInputs.has(String(input.id || '')))
          .map(input => ({
            ...input,
            required: requiredTemplateInputs.has(String(input.id || ''))
          }))
      }
      : null;

    publish.mutate({
      title: String(form.get('title') || '').trim(),
      description: String(form.get('description') || '').trim(),
      promptVisibility: String(form.get('promptVisibility') || 'full'),
      visibility: String(form.get('visibility') || 'public'),
      faceReusePolicy: form.get('faceReusePolicy') === 'public_reusable'
        ? 'public_reusable'
        : 'view_only',
      publishAsTemplate,
      templateAccessCredits: Math.max(
        0,
        Number(form.get('templateAccessCredits')) || 0
      ),
      publicInputSchema
    });
  }

  return (
    <>
    <Dialog.Root open={open} onOpenChange={change}>
      <Dialog.Trigger asChild>
        {trigger || (
          <Button icon={<Share2 className="size-4" />}>{t('ui.action.share')}</Button>
        )}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="share-generated-dialog__overlay" />
        <Dialog.Content className="share-generated-dialog">
          <header className="share-generated-dialog__header">
            <div>
              <Dialog.Title>{t('ui.share.title')}</Dialog.Title>
              <Dialog.Description>{t('ui.share.description')}</Dialog.Description>
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
                  <label>
                    <span>{t('ui.share.promptVisibility')}</span>
                    <select name="promptVisibility" defaultValue="full">
                      <option value="full">{t('ui.share.full')}</option>
                      <option value="partial">{t('ui.share.partial')}</option>
                      {draft.data.templateEligible ? (
                        <option value="remix_only">{t('ui.share.remixOnly')}</option>
                      ) : null}
                      <option value="private">{t('ui.character.private')}</option>
                    </select>
                  </label>
                  <label>
                    <span>{t('ui.share.postVisibility')}</span>
                    <select name="visibility" defaultValue="public">
                      <option value="public">{t('ui.character.public')}</option>
                      <option value="unlisted">{t('ui.share.unlisted')}</option>
                      <option value="private">{t('ui.character.private')}</option>
                    </select>
                  </label>
                </div>

                {draft.data.templateEligible ? (
                  <Surface className="share-generated-dialog__template-panel">
                    <label className="share-generated-dialog__template-toggle">
                      <input
                        type="checkbox"
                        name="publishAsTemplate"
                        checked={publishAsTemplate}
                        onChange={event => {
                          const checked = event.target.checked;
                          setPublishAsTemplate(checked);
                          if (!checked) {
                            setSelectedTemplateInputs(new Set());
                            setRequiredTemplateInputs(new Set());
                          }
                        }}
                      />
                      <span>
                        <strong>{t('ui.share.publishTemplate')}</strong>
                        <small>{t('ui.share.publishTemplateHelp')}</small>
                      </span>
                    </label>

                    {publishAsTemplate ? (
                      <>
                      <fieldset className="share-generated-dialog__template-inputs">
                      <legend>{t('ui.share.templateInputs')}</legend>
                      <div className="share-generated-dialog__template-input-list">
                        {draft.data.suggestedTemplateInputSchema?.inputs.map(input => {
                          const inputId = String(input.id || '');
                          return (
                            <div
                              key={inputId}
                              className="share-generated-dialog__template-input-row"
                            >
                              <label>
                                <input
                                  type="checkbox"
                                  name="templateInput"
                                  value={inputId}
                                  checked={selectedTemplateInputs.has(inputId)}
                                  onChange={event => {
                                    const checked = event.target.checked;
                                    setSelectedTemplateInputs(current => updateSet(current, inputId, checked));
                                    if (!checked) {
                                      setRequiredTemplateInputs(current => updateSet(current, inputId, false));
                                    }
                                  }}
                                />
                                <span>
                                  {String(input.label || input.sourceFieldName || input.id)}
                                </span>
                              </label>
                              <label className="share-generated-dialog__required-input">
                                <input
                                  type="checkbox"
                                  name="requiredTemplateInput"
                                  value={inputId}
                                  checked={requiredTemplateInputs.has(inputId)}
                                  disabled={!selectedTemplateInputs.has(inputId)}
                                  onChange={event => setRequiredTemplateInputs(current =>
                                    updateSet(current, inputId, event.target.checked))}
                                />
                                <span>{t('ui.share.required')}</span>
                              </label>
                            </div>
                          );
                        })}
                      </div>
                      </fieldset>

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
                <Button type="submit" variant="primary" disabled={publish.isPending}>
                  {t('ui.action.publish')}
                </Button>
              </footer>
            </form>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
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

function isRecommendedTemplateInput(input: Record<string, unknown>) {
  const field = String(input.sourceFieldName || input.id || '').toLowerCase();
  return /(face|character|outfit|clothing|environment|scene|color)/.test(field);
}

function isRecommendedRequiredInput(input: Record<string, unknown>) {
  const field = String(input.sourceFieldName || input.id || '').toLowerCase();
  return /(face|character|outfit|clothing)/.test(field);
}

function updateSet(current: Set<string>, value: string, enabled: boolean) {
  const next = new Set(current);
  if (enabled) next.add(value);
  else next.delete(value);
  return next;
}

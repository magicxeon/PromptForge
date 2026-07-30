import * as Dialog from '@radix-ui/react-dialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, X } from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  updateCommunityPostPresentation
} from '../../features/community/api/communityApi';
import type {
  CommunityPost
} from '../../features/community/schemas/communitySchemas';
import { Button } from '../ui/Button';
import { StatusNotice } from '../ui/StatusNotice';

export function SharedTemplateEditDialog({
  post,
  trigger
}: {
  post: CommunityPost;
  trigger?: ReactNode;
}) {
  const { t } = useTranslation('react-ui');
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const update = useMutation({
    mutationFn: (input: {
      title: string;
      description: string;
      customTags: string[];
      visibility: 'public' | 'unlisted' | 'private';
    }) => updateCommunityPostPresentation(post.id, input),
    onSuccess: async () => {
      setOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['community-post', post.id] }),
        queryClient.invalidateQueries({ queryKey: ['community-posts'] }),
        queryClient.invalidateQueries({ queryKey: ['creator-page'] })
      ]);
    }
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    update.mutate({
      title: String(form.get('title') || '').trim(),
      description: String(form.get('description') || '').trim(),
      customTags: parseTags(String(form.get('customTags') || '')),
      visibility: normalizeVisibility(form.get('visibility'))
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        {trigger || (
          <Button size="sm" icon={<Pencil className="size-4" aria-hidden="true" />}>
            {t('ui.templateManagement.edit')}
          </Button>
        )}
      </Dialog.Trigger>
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
                />
                <small>{t('ui.templateManagement.customTagsHelp')}</small>
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

              {update.isError ? (
                <StatusNotice
                  tone="error"
                  title={t('ui.templateManagement.saveFailed')}
                >
                  {update.error.message}
                </StatusNotice>
              ) : null}
            </div>

            <footer className="template-management-dialog__footer">
              <Dialog.Close asChild>
                <Button type="button" variant="ghost">
                  {t('ui.action.cancel')}
                </Button>
              </Dialog.Close>
              <Button
                type="submit"
                variant="primary"
                disabled={update.isPending}
              >
                {update.isPending
                  ? t('ui.templateManagement.saving')
                  : t('ui.templateManagement.save')}
              </Button>
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

function inferVisibility(post: CommunityPost): 'public' | 'unlisted' | 'private' {
  const visibility = post.visibility;
  return visibility === 'unlisted' || visibility === 'private'
    ? visibility
    : 'public';
}

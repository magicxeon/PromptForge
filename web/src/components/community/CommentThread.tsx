import { useState, type FormEvent } from 'react';
import { Trash2 } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  createCommunityComment,
  deleteCommunityComment,
  listCommunityComments
} from '../../features/community/api/communityApi';
import { queryKeys } from '../../lib/api/queryKeys';
import { useActor } from '../../lib/auth/ActorProvider';
import { Button } from '../ui/Button';
import { EmptyState, ErrorState, LoadingState } from '../ui/AsyncState';

export function CommentThread({ postId }: { postId: string }) {
  const { t } = useTranslation('community');
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const [body, setBody] = useState('');
  const actorId = actor?.userId || 'loading';
  const key = queryKeys.comments(postId, actorId);
  const comments = useQuery({
    queryKey: key,
    queryFn: () => listCommunityComments(postId),
    enabled: Boolean(actor)
  });
  const create = useMutation({
    mutationFn: (value: string) => createCommunityComment(postId, value),
    onSuccess: () => {
      setBody('');
      void queryClient.invalidateQueries({ queryKey: key });
      void queryClient.invalidateQueries({ queryKey: queryKeys.engagement(postId, actorId) });
    }
  });
  const remove = useMutation({
    mutationFn: (commentId: string) => deleteCommunityComment(postId, commentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: key });
      void queryClient.invalidateQueries({ queryKey: queryKeys.engagement(postId, actorId) });
    }
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    const normalized = body.trim();
    if (normalized) create.mutate(normalized);
  }

  return (
    <section aria-labelledby="community-comments-title">
      <h2 id="community-comments-title" className="text-lg">{t('community.comments.title')}</h2>
      <form className="mb-5 flex flex-col gap-2 sm:flex-row" onSubmit={submit}>
        <textarea
          value={body}
          maxLength={1000}
          rows={2}
          onChange={event => setBody(event.target.value)}
          placeholder={t('community.comments.placeholder')}
          className="min-h-20 flex-1 resize-y rounded-[var(--mpf-radius-sm)] border border-[var(--mpf-border)] bg-[var(--mpf-bg)] p-3 text-sm text-white"
        />
        <Button type="submit" variant="primary" disabled={!body.trim() || create.isPending}>
          {t('community.comments.post')}
        </Button>
      </form>
      {comments.isLoading ? <LoadingState label={t('community.detail.loading')} /> : null}
      {comments.isError ? (
        <ErrorState
          title={t('community.creator.unavailable')}
          description={comments.error.message}
          onRetry={() => void comments.refetch()}
        />
      ) : null}
      {comments.data && !comments.data.items.length ? (
        <EmptyState title={t('community.comments.empty')} />
      ) : null}
      <div className="space-y-2">
        {comments.data?.items.map(comment => (
          <article key={comment.id} className="border-b border-[var(--mpf-border)] py-3">
            <div className="flex justify-between gap-4">
              <div>
                <strong className="text-sm">{comment.author.displayName}</strong>
                <time className="ml-2 text-xs text-[var(--mpf-text-muted)]">
                  {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(comment.createdAt))}
                </time>
              </div>
              {comment.viewerCanDelete ? (
                <Button
                  size="icon"
                  variant="ghost"
                  title={t('community.comments.delete')}
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(comment.id)}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </Button>
              ) : null}
            </div>
            <p className="mb-0 whitespace-pre-wrap text-sm text-[var(--mpf-text-muted)]">{comment.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

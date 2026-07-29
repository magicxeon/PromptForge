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
    <section className="community-comment-thread" aria-labelledby="community-comments-title">
      <h2 id="community-comments-title">{t('community.comments.title')}</h2>
      <form className="community-comment-thread__composer" onSubmit={submit}>
        <span className="community-comment-thread__avatar" aria-hidden="true">
          {initials(actor?.displayName)}
        </span>
        <textarea
          value={body}
          maxLength={1000}
          rows={2}
          onChange={event => setBody(event.target.value)}
          placeholder={t('community.comments.placeholder')}
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
      <div className="community-comment-thread__items">
        {comments.data?.items.map(comment => (
          <article key={comment.id} className="community-comment-thread__item">
            <span className="community-comment-thread__avatar" aria-hidden="true">
              {initials(comment.author.displayName)}
            </span>
            <div className="community-comment-thread__body">
              <div className="community-comment-thread__meta">
                <span>
                  <strong>{comment.author.displayName}</strong>
                  <time>
                  {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(comment.createdAt))}
                  </time>
                </span>
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
              <p>{comment.body}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function initials(value?: string | null) {
  return String(value || 'User')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase();
}

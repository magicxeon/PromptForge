import { useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getCommunityEngagement, setCommunityReaction } from '../api/communityApi';
import type { CommunityPost, EngagementResponse } from '../schemas/communitySchemas';
import { queryKeys } from '../../../lib/api/queryKeys';
import { useActor } from '../../../lib/auth/ActorProvider';
import { getActiveActorId } from '../../../lib/auth/actorStore';

type Reaction = 'like' | 'save';
type Selection = { postId: string; actorId: string; type: Reaction; active: boolean };

export function useCommunityEngagement(post: CommunityPost) {
  const { actor } = useActor();
  const actorId = actor?.userId || 'loading';
  const queryClient = useQueryClient();
  const busy = useRef(false);
  const engagement = useQuery({
    queryKey: queryKeys.engagement(post.id, actorId),
    queryFn: () => getCommunityEngagement(post.id),
    enabled: Boolean(actor && post.id),
    retry: false
  });
  const reaction = useMutation({
    retry: false,
    mutationFn: async (selection: Selection) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.engagement(selection.postId, selection.actorId), exact: true });
      if (getActiveActorId() !== selection.actorId) throw new Error('Actor changed.');
      return setCommunityReaction(selection.postId, selection.type, selection.active);
    },
    onSuccess: async (payload, selection) => {
      // Never repopulate cleared actor state with a late mutation response.
      if (getActiveActorId() !== selection.actorId) return;
      const key = queryKeys.engagement(selection.postId, selection.actorId);
      queryClient.setQueryData<EngagementResponse>(key, previous => previous ? {
        ...previous,
        summary: payload.summary,
        viewerState: { ...previous.viewerState, [selection.type === 'like' ? 'liked' : 'saved']: payload.active }
      } : undefined);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: key, exact: true }),
        queryClient.invalidateQueries({ queryKey: queryKeys.communityPost(selection.postId, selection.actorId), exact: true }),
        queryClient.invalidateQueries({ queryKey: ['community-posts'] }),
        queryClient.invalidateQueries({ queryKey: ['community-template-detail', selection.actorId] }),
        queryClient.invalidateQueries({ queryKey: ['community-template-previews', selection.actorId] }),
        queryClient.invalidateQueries({ queryKey: ['character-works', selection.actorId] })
      ]);
    },
    onSettled: () => { busy.current = false; }
  });
  const canReact = Boolean(actor && engagement.data && !engagement.isError && !engagement.isFetching && !reaction.isPending);
  return {
    summary: engagement.data?.summary || post.engagementSummary,
    viewerState: engagement.data?.viewerState,
    canReact,
    hasActor: Boolean(actor),
    isLoading: Boolean(actor && engagement.isPending),
    isPending: reaction.isPending,
    loadFailed: engagement.isError,
    actionFailed: reaction.isError,
    retryRead: () => { reaction.reset(); void engagement.refetch(); },
    toggle: (type: Reaction) => {
      if (busy.current || !canReact || getActiveActorId() !== actorId) return;
      busy.current = true;
      const active = !(type === 'like' ? engagement.data!.viewerState.liked : engagement.data!.viewerState.saved);
      reaction.mutate({ postId: post.id, actorId, type, active });
    }
  };
}

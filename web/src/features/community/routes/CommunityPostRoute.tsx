import { useEffect, useState } from 'react';
import { Copy, Download, Expand, Repeat2 } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CommentThread } from '../../../components/community/CommentThread';
import { CreatorIdentity } from '../../../components/community/CreatorIdentity';
import { EngagementBar } from '../../../components/community/EngagementBar';
import { MediaStage } from '../../../components/media/MediaStage';
import { Button } from '../../../components/ui/Button';
import { ErrorState, LoadingState } from '../../../components/ui/AsyncState';
import { Surface } from '../../../components/ui/Surface';
import { MediaCard } from '../../../components/media/MediaCard';
import { ComparisonWorkspace } from '../../../components/comparisons/ComparisonWorkspace';
import { ContextBackLink } from '../../../components/layout/ContextBackLink';
import { FaceReferenceDestinationDialog } from '../../../components/generation/FaceReferenceDestinationDialog';
import { apiMediaUrl } from '../../../lib/api/apiClient';
import { queryKeys } from '../../../lib/api/queryKeys';
import { useActor } from '../../../lib/auth/ActorProvider';
import { getActiveActorId } from '../../../lib/auth/actorStore';
import { writeHandoff } from '../../../lib/persistence/handoffStorage';
import {
  getCommunityEngagement,
  getCommunityPost,
  listCommunityPosts,
  recordCommunityView,
  removeCommunityComparisonVote,
  setCommunityComparisonVote,
  requestCommunityTemplateHandoff
} from '../api/communityApi';
import type { CommunityPost } from '../schemas/communitySchemas';
import type { ComparisonRun } from '../../comparisons/schemas/comparisonSchemas';

export function CommunityPostRoute() {
  const { t } = useTranslation('community');
  const { postId = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { actor } = useActor();
  const [expandedPrompt, setExpandedPrompt] = useState(false);
  const post = useQuery({
    queryKey: queryKeys.communityPost(postId, actor?.userId || 'loading'),
    queryFn: () => getCommunityPost(postId),
    enabled: Boolean(postId && actor)
  });
  const handoff = useMutation({
    mutationFn: () => requestCommunityTemplateHandoff(postId),
    onSuccess: payload => {
      writeHandoff({
        actorId: getActiveActorId(),
        kind: 'scene-template',
        payload: {
          postId: payload.postId,
          sceneTemplateSnapshot: payload.sceneTemplateSnapshot
        }
      });
      navigate('/studio/scene');
    }
  });
  const engagement = useQuery({
    queryKey: queryKeys.engagement(postId, actor?.userId || 'loading'),
    queryFn: () => getCommunityEngagement(postId),
    enabled: Boolean(postId && actor && post.data?.postType === 'comparison')
  });
  const comparisonVote = useMutation({
    mutationFn: async (slotId: string) => {
      if (engagement.data?.viewerState.comparisonVoteSlotId === slotId) {
        return removeCommunityComparisonVote(postId);
      }
      return setCommunityComparisonVote(postId, slotId);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.engagement(postId, actor?.userId || 'loading') }),
        queryClient.invalidateQueries({ queryKey: queryKeys.communityPost(postId, actor?.userId || 'loading') })
      ]);
    }
  });

  useEffect(() => {
    if (!postId || !actor) return;
    void recordCommunityView(postId).catch(() => undefined);
  }, [actor, postId]);

  if (post.isLoading) return <LoadingState label={t('community.detail.loading')} />;
  if (post.isError || !post.data) {
    return (
      <ErrorState
        title={t('community.post.unavailable')}
        description={post.error?.message}
        retryLabel={t('community.feed.retry')}
        onRetry={() => void post.refetch()}
      />
    );
  }

  const item = post.data;
  const primaryImage = item.imageUrl
    || item.comparisonSnapshot?.slots[0]?.imageUrl
    || item.collectionSnapshot?.items[0]?.imageUrl
    || null;

  return (
    <main>
      <ContextBackLink fallbackTo="/community" className="mb-3">
        {t('community.detail.back')}
      </ContextBackLink>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.75fr)]">
        {item.postType === 'comparison' && item.comparisonSnapshot ? (
          <ComparisonWorkspace
            mode="public"
            run={toPublicComparisonRun(item)}
            winnerJobId={engagement.data?.voteSummary.leaderSlotIds[0] || null}
            winnerJobIds={engagement.data?.voteSummary.leaderSlotIds || []}
            publicVoteJobId={engagement.data?.viewerState.comparisonVoteSlotId || null}
            onVote={item.viewer?.permissions.canVoteComparison === false ? undefined : slotId => comparisonVote.mutate(slotId)}
          />
        ) : (
          <Surface className="overflow-hidden bg-black p-0">
            <MediaStage post={item} eager className="min-h-[420px] max-h-[76vh] aspect-auto" />
          </Surface>
        )}
        <aside className="min-w-0">
          <CreatorIdentity creator={item.creator} createdAt={item.createdAt} />
          <div className="my-5">
            <span className="text-xs font-bold uppercase text-cyan-300">{item.postType}</span>
            <h1 className="mb-2 mt-2 text-2xl">{item.title || t('community.creator.untitled')}</h1>
            {item.description ? <p className="text-sm leading-6 text-[var(--mpf-text-muted)]">{item.description}</p> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {item.officialTags.map(tag => (
              <span key={tag} className="rounded-[var(--mpf-radius-sm)] border border-[var(--mpf-border)] px-2 py-1 text-xs text-[var(--mpf-text-muted)]">
                {tag}
              </span>
            ))}
          </div>
          <EngagementBar post={item} />
          <div className="mt-4 flex flex-wrap gap-2">
            {item.templateAvailability ? (
              <Button
                variant="primary"
                icon={<Repeat2 className="size-4" />}
                disabled={handoff.isPending}
                onClick={() => handoff.mutate()}
              >
                {t('community.template.use')}
              </Button>
            ) : null}
            {item.faceReuseAvailability && primaryImage ? (
              <FaceReferenceDestinationDialog
                source={{ sourceType: 'community_post', sourceId: item.id }}
                imageUrl={primaryImage}
              />
            ) : null}
            {primaryImage ? (
              <>
                <Button
                  size="icon"
                  title={t('community.detail.fullscreen')}
                  onClick={() => void requestImageFullscreen(primaryImage)}
                >
                  <Expand className="size-4" aria-hidden="true" />
                </Button>
                <a
                  href={apiMediaUrl(primaryImage) || ''}
                  download
                  className="inline-flex size-10 items-center justify-center rounded-[var(--mpf-radius-sm)] border border-[var(--mpf-border-strong)] bg-[var(--mpf-surface)] text-white"
                  title={t('community.detail.download')}
                >
                  <Download className="size-4" aria-hidden="true" />
                </a>
              </>
            ) : null}
          </div>
          {handoff.isError ? <p className="text-sm text-red-300">{handoff.error.message}</p> : null}
          <Metadata post={item} />
        </aside>
      </div>

      <section className="my-5 grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
        <Surface className="p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="m-0 text-lg">{t('community.detail.prompt')}</h2>
            {item.promptPreview ? (
              <Button
                size="sm"
                icon={<Copy className="size-4" />}
                onClick={() => void navigator.clipboard.writeText(item.promptPreview || '')}
              >
                {t('community.detail.copyPrompt')}
              </Button>
            ) : null}
          </div>
          <div className="rounded-[var(--mpf-radius-sm)] border border-cyan-400/45 bg-[var(--mpf-bg)] p-4 shadow-[inset_0_0_0_1px_rgb(240_45_145_/_0.24)]">
            <p className={`m-0 whitespace-pre-wrap text-sm leading-6 text-[var(--mpf-text-muted)] ${expandedPrompt ? '' : 'line-clamp-6'}`}>
              {item.promptPreview || t('community.detail.promptHidden')}
            </p>
          </div>
          {item.promptPreview && item.promptPreview.length > 360 ? (
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => setExpandedPrompt(value => !value)}>
              {t(expandedPrompt ? 'community.detail.showLess' : 'community.detail.showMore')}
            </Button>
          ) : null}
        </Surface>
        <Surface className="p-5">
          <CommentThread postId={item.id} />
        </Surface>
      </section>

      <MoreFromCreator
        postId={item.id}
        creatorName={item.creator.displayName}
        search={item.creator.username || item.creator.handle || ''}
        actorId={actor?.userId || 'loading'}
      />
    </main>
  );
}

function Metadata({ post }: { post: CommunityPost }) {
  const { t } = useTranslation('community');
  const metadata = post.generationMetadata;
  const size = metadata.width && metadata.height
    ? `${metadata.width} × ${metadata.height}`
    : metadata.resolution;
  return (
    <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-[var(--mpf-border)] pt-4 text-sm">
      <MetadataItem label={t('community.detail.model')} value={post.providerModelDisplay} />
      <MetadataItem label={t('community.detail.aspectRatio')} value={metadata.aspectRatio} />
      <MetadataItem label={t('community.detail.imageSize')} value={size} />
    </dl>
  );
}

function MetadataItem({ label, value }: { label: string; value?: string | null }) {
  const { t } = useTranslation('community');
  return (
    <div>
      <dt className="text-xs text-[var(--mpf-text-muted)]">{label}</dt>
      <dd className="m-0 mt-1 text-white">{value || t('community.detail.metadataUnavailable')}</dd>
    </div>
  );
}

function toPublicComparisonRun(post: CommunityPost): ComparisonRun {
  const createdAt = post.createdAt ? Date.parse(post.createdAt) : Date.now();
  return {
    id: post.id,
    status: 'completed',
    sourcePrompt: post.promptPreview || '',
    estimatedTotalCredit: 0,
    actualTotalCredit: 0,
    createdAt,
    completedAt: createdAt,
    slots: (post.comparisonSnapshot?.slots || []).map(slot => ({
      id: slot.slotId,
      position: slot.position ?? undefined,
      provider: slot.providerDisplayName || '',
      model: slot.modelDisplayName || '',
      providerDisplayName: slot.providerDisplayName || undefined,
      modelDisplayName: slot.modelDisplayName || undefined,
      jobId: slot.slotId,
      status: slot.status,
      submittedPrompt: post.promptPreview || '',
      thumbnailUrl: slot.thumbnailUrl,
      result: {
        imageUrl: slot.imageUrl,
        generationDuration: slot.generationDuration ?? null
      }
    }))
  };
}

function MoreFromCreator({
  postId,
  creatorName,
  search,
  actorId
}: {
  postId: string;
  creatorName: string;
  search: string;
  actorId: string;
}) {
  const { t } = useTranslation('community');
  const posts = useQuery({
    queryKey: ['community-posts', actorId, 'creator', search],
    queryFn: () => listCommunityPosts({
      sort: 'latest',
      period: 'week',
      postType: 'all',
      search
    }),
    enabled: Boolean(search)
  });
  const items = posts.data?.items.filter(item => item.id !== postId).slice(0, 4) || [];
  return (
    <section className="mt-8">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg">{t('community.detail.moreFromCreator', { name: creatorName })}</h2>
        <Link className="text-sm text-cyan-300" to={`/community?search=${encodeURIComponent(search)}`}>
          {t('community.creator.viewAll')}
        </Link>
      </div>
      {items.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {items.map(item => <MediaCard key={item.id} post={item} />)}
        </div>
      ) : (
        <p className="text-sm text-[var(--mpf-text-muted)]">{t('community.creator.sectionEmpty')}</p>
      )}
    </section>
  );
}

async function requestImageFullscreen(imageUrl: string) {
  const image = document.createElement('img');
  image.src = apiMediaUrl(imageUrl) || '';
  image.alt = '';
  image.style.objectFit = 'contain';
  image.style.background = '#000';
  image.style.width = '100%';
  image.style.height = '100%';
  document.body.append(image);
  try {
    await image.requestFullscreen();
  } finally {
    image.remove();
  }
}

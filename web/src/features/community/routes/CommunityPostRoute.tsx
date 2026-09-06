import { useEffect, useRef, useState } from 'react';
import { Copy, Download, Expand, FolderPlus, Repeat2 } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CommentThread } from '../../../components/community/CommentThread';
import { CreatorIdentity } from '../../../components/community/CreatorIdentity';
import { EngagementBar } from '../../../components/community/EngagementBar';
import {
  MediaStage,
  resolveCommunityPostDetailMedia
} from '../../../components/media/MediaStage';
import { Button } from '../../../components/ui/Button';
import { ErrorState, LoadingState } from '../../../components/ui/AsyncState';
import { MediaCard } from '../../../components/media/MediaCard';
import { ComparisonWorkspace } from '../../../components/comparisons/ComparisonWorkspace';
import { ContextBackLink } from '../../../components/layout/ContextBackLink';
import { FaceReferenceDestinationDialog } from '../../../components/generation/FaceReferenceDestinationDialog';
import { SharedTemplateEditDialog } from '../../../components/templates/SharedTemplateEditDialog';
import { apiMediaUrl } from '../../../lib/api/apiClient';
import { queryKeys } from '../../../lib/api/queryKeys';
import { useActor } from '../../../lib/auth/ActorProvider';
import {
  getCommunityEngagement,
  getCommunityPost,
  listCommunityPosts,
  recordCommunityView,
  removeCommunityComparisonVote,
  setCommunityComparisonVote,
} from '../api/communityApi';
import { useCommunityTemplateHandoff } from '../hooks/useCommunityTemplateHandoff';
import type { CommunityPost } from '../schemas/communitySchemas';
import type { ComparisonRun } from '../../comparisons/schemas/comparisonSchemas';
import { routePaths } from '../../../app/routeRegistry/routes';

export function CommunityPostRoute() {
  const { t } = useTranslation('community');
  const { postId = '' } = useParams();
  const queryClient = useQueryClient();
  const { actor } = useActor();
  const [expandedPrompt, setExpandedPrompt] = useState(false);
  const fullscreenStageRef = useRef<HTMLDivElement>(null);
  const post = useQuery({
    queryKey: queryKeys.communityPost(postId, actor?.userId || 'loading'),
    queryFn: () => getCommunityPost(postId),
    enabled: Boolean(postId && actor)
  });
  const handoff = useCommunityTemplateHandoff();
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
  const primaryMedia = item.videoUrl || primaryImage;

  return (
    <main className="community-post-page">
      <ContextBackLink fallbackTo={routePaths.explore} className="mb-3">
        {t('community.detail.back')}
      </ContextBackLink>

      <div className={`community-post-layout${item.postType === 'comparison' ? ' is-comparison' : ''}`}>
        <div className="community-post-layout__media-column">
          {item.postType === 'comparison' && item.comparisonSnapshot ? (
            <section className="community-post-comparison-panel">
              <ComparisonWorkspace
                mode="public"
                run={toPublicComparisonRun(item)}
                winnerJobId={engagement.data?.voteSummary.leaderSlotIds[0] || null}
                winnerJobIds={engagement.data?.voteSummary.leaderSlotIds || []}
                publicVoteJobId={engagement.data?.viewerState.comparisonVoteSlotId || null}
                onVote={item.viewer?.permissions.canVoteComparison === false
                  ? undefined
                  : slotId => comparisonVote.mutate(slotId)}
              />
            </section>
          ) : (
            <section className="community-post-media-panel">
              <div
                ref={fullscreenStageRef}
                className="community-post-media-panel__fullscreen-stage"
              >
                <MediaStage
                  post={item}
                  eager
                  {...resolveCommunityPostDetailMedia(item)}
                  className="community-post-media-panel__stage"
                />
              </div>
              <div className="community-post-media-panel__footer">
                <span>{item.generationMetadata.aspectRatio || t('community.detail.metadataUnavailable')}</span>
                <span>{formatImageSize(item)}</span>
                {item.createdAt ? (
                  <time dateTime={item.createdAt}>
                    {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })
                      .format(new Date(item.createdAt))}
                  </time>
                ) : null}
                {primaryMedia ? (
                  <div className="community-post-media-panel__tools">
                    <Button
                      size="icon"
                      title={t('community.detail.fullscreen')}
                      onClick={() => void requestElementFullscreen(fullscreenStageRef.current)}
                    >
                      <Expand className="size-4" aria-hidden="true" />
                    </Button>
                    <a
                      href={apiMediaUrl(primaryMedia) || ''}
                      download
                      title={t('community.detail.download')}
                    >
                      <Download className="size-4" aria-hidden="true" />
                    </a>
                  </div>
                ) : null}
              </div>
            </section>
          )}

          <section className="community-post-comments-panel">
            <CommentThread postId={item.id} />
          </section>
        </div>

        <aside className="community-post-information-panel">
          <CreatorIdentity creator={item.creator} createdAt={item.createdAt} linked />
          <div className="community-post-information-panel__identity">
            <div className="community-post-information-panel__tags">
              <span>{formatPublicLabel(item.officialTags[0] || item.postType)}</span>
              {item.officialTags.slice(1, 4).map(tag => (
                <span key={tag}>{formatPublicLabel(tag)}</span>
              ))}
            </div>
            <h1>{item.title || t('community.creator.untitled')}</h1>
            {item.description ? <p>{item.description}</p> : null}
          </div>

          <EngagementBar post={item} />

          {item.promptPreview ? (
            <section className="community-post-prompt" aria-labelledby="community-post-prompt-title">
              <div>
                <h2 id="community-post-prompt-title">{t('community.detail.prompt')}</h2>
                <Button
                  size="sm"
                  icon={<Copy className="size-4" />}
                  onClick={() => void navigator.clipboard.writeText(item.promptPreview || '')}
                >
                  {t('community.detail.copyPrompt')}
                </Button>
              </div>
              <p className={expandedPrompt ? '' : 'is-collapsed'}>{item.promptPreview}</p>
              {item.promptPreview.length > 360 ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpandedPrompt(value => !value)}
                >
                  {t(expandedPrompt
                    ? 'community.detail.showLess'
                    : 'community.detail.showMore')}
                </Button>
              ) : null}
            </section>
          ) : null}

          <Metadata post={item} />

          {item.characterAttributions.length ? (
            <section className="community-post-prompt" aria-labelledby="community-post-characters-title">
              <h2 id="community-post-characters-title">{t('community.video.featuringCharacters')}</h2>
              <div className="flex flex-wrap gap-2">
                {item.characterAttributions.map(character => (
                  <Link
                    key={`${character.characterProfileId}:${character.characterProfileVersionId}`}
                    className="rounded-[var(--mpf-radius-sm)] border border-cyan-400/30 px-3 py-2 text-sm text-cyan-200 no-underline"
                    to={`/characters/${encodeURIComponent(character.characterProfileId)}`}
                  >
                    {character.displayName}
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          <div className="community-post-information-panel__actions">
            {item.postType === 'template' && item.viewer?.isOwner ? (
              <SharedTemplateEditDialog post={item} />
            ) : null}
            {item.templateAvailability ? (
              <Button
                variant="primary"
                icon={<Repeat2 className="size-4" />}
                disabled={handoff.isPending}
                onClick={() => handoff.mutate(postId)}
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
            <Button
              disabled
              icon={<FolderPlus className="size-4" />}
              title={t('community.detail.collectionUnavailable')}
            >
              {t('community.detail.addToCollection')}
            </Button>
          </div>
          {handoff.isError ? <p className="text-sm text-red-300">{handoff.error.message}</p> : null}
        </aside>
      </div>

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
  const size = formatImageSize(post);
  return (
    <dl className="community-post-metadata">
      <MetadataItem label={t('community.detail.model')} value={post.providerModelDisplay} />
      <MetadataItem label={t('community.detail.aspectRatio')} value={metadata.aspectRatio} />
      <MetadataItem label={t(post.mediaType === 'video' ? 'community.video.size' : 'community.detail.imageSize')} value={size} />
      {post.mediaType === 'video' ? (
        <MetadataItem label={t('community.video.duration')} value={formatDuration(post.durationSeconds)} />
      ) : null}
      <MetadataItem
        label={t('community.detail.generationDuration')}
        value={formatDuration(metadata.generationDuration)}
      />
    </dl>
  );
}

function MetadataItem({ label, value }: { label: string; value?: string | null }) {
  const { t } = useTranslation('community');
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value || t('community.detail.metadataUnavailable')}</dd>
    </div>
  );
}

function formatImageSize(post: CommunityPost) {
  const { width, height, resolution } = post.generationMetadata;
  return width && height ? `${width} × ${height}` : resolution || null;
}

function formatDuration(value?: string | number | null) {
  const duration = Number(value);
  return Number.isFinite(duration) && duration > 0
    ? `${duration.toFixed(1)}s`
    : null;
}

function formatPublicLabel(value: string) {
  return value
    .replace(/^[a-z0-9_-]+[.:/]/i, '')
    .replace(/[._/-]+/g, ' ')
    .replace(/\b\w/g, character => character.toUpperCase())
    .trim();
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
    mediaType: post.comparisonSnapshot?.slots.some(slot => slot.mediaType === 'video')
      ? 'video'
      : 'image',
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
        mediaType: slot.mediaType,
        imageUrl: slot.imageUrl,
        videoUrl: slot.videoUrl,
        posterUrl: slot.posterUrl,
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
      officialTag: '',
      search
    }),
    enabled: Boolean(search)
  });
  const items = posts.data?.items.filter(item => item.id !== postId).slice(0, 4) || [];
  return (
    <section className="community-more-from-creator">
      <div className="community-more-from-creator__heading">
        <h2>{t('community.detail.moreFromCreator', { name: creatorName })}</h2>
        <Link to={`/?search=${encodeURIComponent(search)}`}>
          {t('community.creator.viewAll')}
        </Link>
      </div>
      {items.length ? (
        <div className="community-more-from-creator__grid">
          {items.map(item => <MediaCard key={item.id} post={item} />)}
        </div>
      ) : (
        <p className="text-sm text-[var(--mpf-text-muted)]">{t('community.creator.sectionEmpty')}</p>
      )}
    </section>
  );
}

async function requestElementFullscreen(element: HTMLElement | null) {
  if (!element?.requestFullscreen) return;
  await element.requestFullscreen();
}

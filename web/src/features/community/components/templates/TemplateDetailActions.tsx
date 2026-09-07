import { Bookmark, Share2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { routeBuilders } from '../../../../app/routeRegistry/routes';
import { Button } from '../../../../components/ui/Button';
import { useCommunityEngagement } from '../../hooks/useCommunityEngagement';
import type { CommunityPost } from '../../schemas/communitySchemas';
import { useActor } from '../../../../lib/auth/ActorProvider';

export function TemplateDetailActions({ post }: { post: CommunityPost }) {
  const { actor } = useActor();
  return <TemplateDetailActionsSession key={`${actor?.userId}:${post.id}`} post={post} />;
}

function TemplateDetailActionsSession({ post }: { post: CommunityPost }) {
  const { t } = useTranslation('community');
  const engagement = useCommunityEngagement(post);
  const [shareState, setShareState] = useState<'idle' | 'pending' | 'copied' | 'failed'>('idle');
  const canonical = new URL(routeBuilders.templateDetail(post.id), window.location.origin).href;
  async function share() {
    if (shareState === 'pending') return;
    setShareState('pending');
    try {
      if (navigator.share) {
        await navigator.share({ title: post.title, url: canonical });
        setShareState('idle');
      } else {
        await navigator.clipboard.writeText(canonical);
        setShareState('copied');
      }
    } catch (error) {
      setShareState((error instanceof Error || error instanceof DOMException) && error.name === 'AbortError' ? 'idle' : 'failed');
    }
  }
  return <div className="photo-template-actions">
    <Button icon={<Bookmark className="size-4" />} aria-pressed={engagement.viewerState?.saved === true}
      disabled={!engagement.canReact} onClick={() => engagement.toggle('save')}>{t('community.detail.save')}</Button>
    <Button icon={<Share2 className="size-4" />} disabled={shareState === 'pending'} onClick={() => void share()}>{t('community.detail.share')}</Button>
    {shareState === 'copied' ? <span role="status">{t('community.detail.copied')}</span> : null}
    {shareState === 'failed' ? <label>{t('community.detail.copyFailed')}<input aria-label={t('community.detail.share')} readOnly value={canonical} onFocus={event => event.target.select()} /></label> : null}
    {engagement.loadFailed ? <Button size="sm" onClick={engagement.retryRead}>{t('community.feed.retry')}</Button> : null}
    {engagement.actionFailed ? <span role="alert">{t('community.engagement.actionFailed')}</span> : null}
  </div>;
}

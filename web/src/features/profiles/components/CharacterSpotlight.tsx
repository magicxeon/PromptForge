import { ArrowRight, LoaderCircle, RefreshCw, Star } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { routeBuilders } from '../../../app/routeRegistry/routes';
import { MediaStage } from '../../../components/media/MediaStage';
import { Button } from '../../../components/ui/Button';
import { EngagementBar } from '../../../components/community/EngagementBar';
import { createReturnNavigationState } from '../../../lib/navigation/returnNavigation';
import type { CommunityPost } from '../../community/schemas/communitySchemas';
import type { CharacterSummary } from '../schemas/profileSchemas';
import { CharacterDiscoveryCard } from './CharacterDiscoveryCard';
import { characterImageMoments } from './characterDiscoveryModel';

export function CharacterSpotlight({ character, works, loading, error, onRetry, createAction }: {
  character: CharacterSummary;
  works: CommunityPost[];
  loading: boolean;
  error: Error | null;
  onRetry: () => void;
  createAction?: ReactNode;
}) {
  const { t } = useTranslation(['character-profiles', 'community']);
  const location = useLocation();
  const moments = characterImageMoments(works);
  return (
    <section className="character-spotlight" aria-label={t('character-profiles.gallery.featuredEyebrow')}>
      <div className="character-spotlight__layout">
        <CharacterDiscoveryCard character={character} variant="spotlight" createAction={createAction}
          heading={<div className="character-spotlight__heading"><Star aria-hidden="true" />{t('character-profiles.gallery.featuredEyebrow')}</div>} />
        <section className="character-moments" aria-labelledby="character-moments-title">
          <header>
            <h3 id="character-moments-title">{t('character-profiles.gallery.momentsTitle')}</h3>
            <Link to={routeBuilders.character(character.id)} state={createReturnNavigationState(location)}>
              {t('character-profiles.gallery.viewCharacter')}<ArrowRight aria-hidden="true" />
            </Link>
          </header>
          {loading ? <div className="character-moments__state" role="status"><LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden="true" />{t('character-profiles.gallery.momentsLoading')}</div>
            : error ? <div className="character-moments__state" role="alert"><p>{t('character-profiles.gallery.momentsError')}</p>
              <Button size="sm" icon={<RefreshCw className="size-4" />} onClick={onRetry}>{t('community:community.feed.retry')}</Button></div>
              : moments.length > 0 ? (
                <div className="character-moments__grid" data-count={moments.length}>
                  {moments.map(post => <article key={post.id} className="character-moment">
                    <Link className="character-moment__image-link" to={routeBuilders.post(post.id)}
                      state={createReturnNavigationState(location)} aria-label={post.title || t('character-profiles.works.image')}>
                      <MediaStage post={post} fit="cover" source="original" className="character-moment__media" />
                    </Link>
                    <div className="character-moment__caption">
                      <Link to={routeBuilders.post(post.id)} state={createReturnNavigationState(location)}><strong>{post.title || t('character-profiles.works.image')}</strong></Link>
                      <small>{t('character-profiles.creator.createdBy')} {post.creator.displayName}</small>
                      <EngagementBar post={post} variant="compact" />
                    </div>
                  </article>)}
                </div>
              ) : <div className="character-moments__state"><p>{t('character-profiles.gallery.momentsEmpty')}</p></div>}
        </section>
      </div>
    </section>
  );
}

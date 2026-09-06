import { Clapperboard, Image as ImageIcon, Images, Shirt, Sparkles, UserRound, UserRoundPlus, Video } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { routeBuilders } from '../../../app/routeRegistry/routes';
import { DiscoveryMetricRow } from '../../../components/discovery/DiscoveryMetricRow';
import { Button } from '../../../components/ui/Button';
import { createReturnNavigationState } from '../../../lib/navigation/returnNavigation';
import type { CharacterSummary } from '../schemas/profileSchemas';
import { CharacterPortrait } from './CharacterPortrait';
import { characterDestinations, characterPortraitUrl, characterUseLabel } from './characterDiscoveryModel';

export function CharacterDiscoveryCard({ character, variant = 'card', createAction, heading }: {
  character: CharacterSummary;
  variant?: 'card' | 'spotlight';
  createAction?: ReactNode;
  heading?: ReactNode;
}) {
  const { t } = useTranslation('character-profiles');
  const location = useLocation();
  const detailHref = routeBuilders.character(character.id);
  const destinations = characterDestinations(character);
  const Heading = variant === 'spotlight' ? 'h2' : 'h3';
  const creator = character.ownerUsername?.trim().replace(/^@/, '');

  return (
    <article className={`character-discovery-card${variant === 'spotlight' ? ' character-discovery-card--spotlight' : ''}`}
      data-reusable={destinations.length > 0}>
      {heading}
      <Link
        to={detailHref}
        state={createReturnNavigationState(location)}
        className="character-discovery-card__media"
        aria-label={character.displayName}
      >
        <CharacterPortrait src={characterPortraitUrl(character)} name={character.displayName} eager={variant === 'spotlight'} />
      </Link>
      <div className="character-discovery-card__body">
        <span className="character-discovery-card__type">
          {character.characterType === 'reusable_model'
            ? t('character-profiles.type.reusable')
            : t('character-profiles.type.styled')}
        </span>
        <Heading><Link to={detailHref} state={createReturnNavigationState(location)}>{character.displayName}</Link></Heading>
        <p>{character.personalitySummary || t('character-profiles.page.noPersonality')}</p>
        {character.intendedUses.length ? (
          <div className="character-discovery-card__tags">
            {character.intendedUses.slice(0, 3).map(use => {
              const label = characterUseLabel(use);
              return <span key={use}>{label.key ? t(label.key) : label.fallback}</span>;
            })}
          </div>
        ) : null}
        <div className="character-discovery-card__creator">
          <UserRound aria-hidden="true" />
          <span>{t('character-profiles.creator.createdBy')}{' '}
            {creator ? <Link to={routeBuilders.profile(creator.toLowerCase().replaceAll('_', '-'))} state={createReturnNavigationState(location)}>@{creator}</Link>
              : t('character-profiles.gallery.creatorFallback')}
          </span>
        </div>
        <span className={`character-discovery-card__availability${destinations.length ? ' is-available' : ''}`}>
          <Sparkles aria-hidden="true" />
          {t(character.handoffAvailable ? 'character-profiles.status.available' : 'character-profiles.status.viewOnly')}
        </span>
        <DiscoveryMetricRow metrics={[
          {
            id: 'fashion',
            icon: <Shirt />,
            label: t('character-profiles.uses.fashion'),
            value: destinations.includes('fashion_blueprint') ? t('character-profiles.gallery.ready') : null
          },
          {
            id: 'scene',
            icon: <Clapperboard />,
            label: t('character-profiles.uses.scene'),
            value: destinations.includes('scene_builder') ? t('character-profiles.gallery.ready') : null
          },
          {
            id: 'outputs',
            icon: <Images />,
            label: t('character-profiles.stats.total'),
            value: character.stats.totalOutputs > 0 ? character.stats.totalOutputs : null
          }
        ]} />
        {variant === 'spotlight' && <div className="character-media-status" aria-label={t('character-profiles.gallery.mediaTypes')}>
          <span><ImageIcon aria-hidden="true" />{t('character-profiles.gallery.imageLabel')}</span>
          <span className="character-media-status__upcoming" data-preview="video">
            <Video aria-hidden="true" />{t('character-profiles.gallery.videoLabel')}
            <small>{t('character-profiles.gallery.comingSoon')}</small>
          </span>
        </div>}
      </div>
      <footer className="character-discovery-card__footer">
        <Link to={detailHref} state={createReturnNavigationState(location)}>
          <UserRound aria-hidden="true" />{t('character-profiles.gallery.viewCharacter')}
        </Link>
        {variant === 'spotlight' && <Button className="character-follow-preview" disabled
          title={t('character-profiles.gallery.followComingSoon')} icon={<UserRoundPlus className="size-4" aria-hidden="true" />}>
          <span>{t('character-profiles.gallery.follow')}<small>{t('character-profiles.gallery.comingSoon')}</small></span>
        </Button>}
        {destinations.length > 0 ? createAction : null}
      </footer>
    </article>
  );
}

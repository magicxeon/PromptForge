import { Clapperboard, Images, Shirt, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { routeBuilders } from '../../../app/routeRegistry/routes';
import { DiscoveryMetricRow } from '../../../components/discovery/DiscoveryMetricRow';
import { apiMediaUrl } from '../../../lib/api/apiClient';
import { createReturnNavigationState } from '../../../lib/navigation/returnNavigation';
import type { CharacterSummary } from '../schemas/profileSchemas';

export function CharacterDiscoveryCard({ character }: { character: CharacterSummary }) {
  const { t } = useTranslation('character-profiles');
  const location = useLocation();
  const detailHref = routeBuilders.character(character.id);
  const previewUrl = character.displayImageUrl || character.thumbnailUrl || character.imageUrl || null;
  const [mediaFailed, setMediaFailed] = useState(false);

  return (
    <article className="character-discovery-card">
      <Link
        to={detailHref}
        state={createReturnNavigationState(location)}
        className="character-discovery-card__media"
        aria-label={character.displayName}
      >
        {previewUrl && !mediaFailed ? (
          <img
            src={apiMediaUrl(previewUrl) || ''}
            alt={character.displayName}
            loading="lazy"
            onError={() => setMediaFailed(true)}
          />
        ) : (
          <span className="character-discovery-card__fallback">
            <Images aria-hidden="true" />
            {t('character-profiles.states.mediaUnavailable')}
          </span>
        )}
        <span className={`character-discovery-card__availability${character.handoffAvailable ? ' is-available' : ''}`}>
          <Sparkles aria-hidden="true" />
          {character.handoffAvailable
            ? t('character-profiles.status.available')
            : t('character-profiles.status.viewOnly')}
        </span>
      </Link>
      <div className="character-discovery-card__body">
        <span className="character-discovery-card__type">
          {character.characterType === 'reusable_model'
            ? t('character-profiles.type.reusable')
            : t('character-profiles.type.styled')}
        </span>
        <h3>{character.displayName}</h3>
        <p>{character.personalitySummary || t('character-profiles.page.noPersonality')}</p>
        {character.intendedUses.length ? (
          <div className="character-discovery-card__tags">
            {character.intendedUses.slice(0, 3).map(use => <span key={use}>{formatValue(use)}</span>)}
          </div>
        ) : null}
        <DiscoveryMetricRow metrics={[
          {
            id: 'fashion',
            icon: <Shirt />,
            label: t('character-profiles.uses.fashion'),
            value: hasDestination(character, 'fashion') ? t('character-profiles.gallery.ready') : null
          },
          {
            id: 'scene',
            icon: <Clapperboard />,
            label: t('character-profiles.uses.scene'),
            value: hasDestination(character, 'scene') ? t('character-profiles.gallery.ready') : null
          },
          {
            id: 'outputs',
            icon: <Images />,
            label: t('character-profiles.stats.total'),
            value: character.stats.totalOutputs > 0 ? character.stats.totalOutputs : null
          }
        ]} />
      </div>
      <footer className="character-discovery-card__footer">
        <span>@{character.ownerUsername || t('character-profiles.gallery.creatorFallback')}</span>
        <Link to={detailHref} state={createReturnNavigationState(location)}>
          {t('character-profiles.gallery.viewCharacter')}
        </Link>
      </footer>
    </article>
  );
}

function hasDestination(character: CharacterSummary, keyword: string) {
  return character.destinationCapabilities.some(value => value.toLowerCase().includes(keyword));
}

function formatValue(value: string) {
  return value.replace(/[._/-]+/g, ' ').trim();
}

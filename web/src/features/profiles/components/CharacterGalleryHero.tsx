import { ArrowRight, Search, UserRoundPlus } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { routeBuilders, routePaths } from '../../../app/routeRegistry/routes';
import { createReturnNavigationState } from '../../../lib/navigation/returnNavigation';
import type { CharacterSummary } from '../schemas/profileSchemas';
import { characterGalleryImageUrl } from './characterDiscoveryModel';
import { CharacterPortrait } from './CharacterPortrait';

export function CharacterGalleryHero({ characters }: { characters: CharacterSummary[] }) {
  const { t } = useTranslation('character-profiles');
  const location = useLocation();
  const identities = characters.filter(character => characterGalleryImageUrl(character)).slice(0, 4);
  return (
    <header className="character-gallery-hero">
      <div className="character-gallery-hero__copy">
        <span>{t('character-profiles.gallery.identityEyebrow')}</span>
        <h1>{t('character-profiles.gallery.identityTitle')} <em>{t('character-profiles.gallery.identityHighlight')}</em></h1>
        <p>{t('character-profiles.gallery.identityDescription')}</p>
        <div className="character-gallery-hero__actions">
          <Link className="character-gallery-link character-gallery-link--primary" to={routePaths.createStudioCharacter}>
            <UserRoundPlus aria-hidden="true" />{t('character-profiles.gallery.create')}<ArrowRight aria-hidden="true" />
          </Link>
          <Link className="character-gallery-link" to={`${routePaths.exploreCharacters}${location.search}#character-catalog`}>
            <Search aria-hidden="true" />{t('character-profiles.gallery.browse')}
          </Link>
        </div>
      </div>
      {identities.length > 0 && (
        <ul className="character-gallery-hero__identities" aria-label={t('character-profiles.gallery.identityPreviews')}>
          {identities.map(character => (
            <li key={character.id}>
              <Link to={routeBuilders.character(character.id)} state={createReturnNavigationState(location)} title={character.displayName} aria-label={character.displayName}>
                <span className="character-gallery-hero__avatar"><CharacterPortrait src={characterGalleryImageUrl(character)} name={character.displayName} eager /></span>
                <span>{character.displayName}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </header>
  );
}

import { LockKeyhole, Settings2, Sparkles } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { CharacterSummary } from '../../features/profiles/schemas/profileSchemas';
import { apiMediaUrl } from '../../lib/api/apiClient';
import { createReturnNavigationState } from '../../lib/navigation/returnNavigation';
import { routeBuilders } from '../../app/routeRegistry/routes';
import { characterDisplayImages } from '../../features/profiles/characterDisplayImage';

export function CharacterCard({
  character,
  detailHref,
  managementLabel
}: {
  character: CharacterSummary;
  detailHref?: string;
  managementLabel?: string;
}) {
  const { t } = useTranslation('character-profiles');
  const location = useLocation();
  const available = character.handoffAvailable;
  const preview = characterDisplayImages(character)[0];
  const previewUrl = preview?.src;
  return (
    <article className="overflow-hidden rounded-[var(--mpf-radius-md)] border border-[var(--mpf-border)] bg-[var(--mpf-surface)]">
      <Link
        to={detailHref || routeBuilders.character(character.id)}
        state={createReturnNavigationState(location)}
        className="block text-inherit no-underline"
      >
        <div className="aspect-[3/4] overflow-hidden bg-black">
          {previewUrl ? (
            <img
              src={apiMediaUrl(previewUrl) || ''}
              alt={character.displayName}
              loading="lazy"
              className="h-full w-full"
              style={{ objectFit: preview?.fit || 'contain', objectPosition: 'center' }}
            />
          ) : null}
        </div>
        <div className="p-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-xs font-semibold uppercase text-cyan-300">
              {character.characterType === 'reusable_model'
                ? t('character-profiles.type.reusable')
                : t('character-profiles.type.styled')}
            </span>
            {available
              ? <Sparkles className="size-4 text-emerald-300" aria-hidden="true" />
              : <LockKeyhole className="size-4 text-[var(--mpf-text-muted)]" aria-hidden="true" />}
          </div>
          <h3 className="m-0 text-lg">{character.displayName}</h3>
          <p className="line-clamp-2 min-h-10 text-sm text-[var(--mpf-text-muted)]">
            {character.personalitySummary}
          </p>
          <div className="flex items-center justify-between text-xs text-[var(--mpf-text-muted)]">
            <span>@{character.ownerUsername || 'creator'}</span>
            <span>{character.stats.totalOutputs} {t('character-profiles.stats.uses')}</span>
          </div>
        </div>
      </Link>
      {detailHref && managementLabel ? (
        <Link
          to={detailHref}
          state={createReturnNavigationState(location)}
          className="creator-profile-character-manage"
        >
          <Settings2 aria-hidden="true" />
          {managementLabel}
        </Link>
      ) : null}
    </article>
  );
}

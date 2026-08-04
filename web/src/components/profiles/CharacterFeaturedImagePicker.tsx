import { Check, Globe2, Image, RotateCcw, UserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { CharacterFeaturedImageCandidate } from '../../features/profiles/schemas/profileSchemas';
import { AuthenticatedMediaImage } from '../media/AuthenticatedMediaImage';
import { Button } from '../ui/Button';
import { Surface } from '../ui/Surface';

type CharacterFeaturedImagePickerProps = {
  candidates: CharacterFeaturedImageCandidate[];
  mode: 'auto' | 'manual';
  selectedSourceType: 'generation_result' | 'community_post' | null;
  selectedSourceId: string | null;
  displaySource?: string;
  pending?: boolean;
  onSelect: (candidate: CharacterFeaturedImageCandidate) => void;
  onUseAutomatic: () => void;
};

export function CharacterFeaturedImagePicker({
  candidates,
  mode,
  selectedSourceType,
  selectedSourceId,
  displaySource,
  pending = false,
  onSelect,
  onUseAutomatic
}: CharacterFeaturedImagePickerProps) {
  const { t } = useTranslation('character-profiles');
  const usingFallback = ![
    'featured_work',
    'owner_selected_work',
    'owner_generation',
    'owner_selected_generation'
  ].includes(displaySource || '');

  return (
    <Surface className="mt-8 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="text-xs font-bold uppercase text-cyan-300">
            {t('character-profiles.featured.kicker')}
          </span>
          <h2 className="mb-1 mt-2 text-xl">{t('character-profiles.featured.title')}</h2>
          <p className="m-0 max-w-2xl text-sm text-[var(--mpf-text-muted)]">
            {t('character-profiles.featured.description')}
          </p>
        </div>
        <Button
          icon={<RotateCcw className="size-4" aria-hidden="true" />}
          disabled={pending || mode === 'auto'}
          onClick={onUseAutomatic}
        >
          {t('character-profiles.featured.useAutomatic')}
        </Button>
      </div>

      <div className="mt-4 border border-[var(--mpf-border)] bg-[var(--mpf-surface-muted)] p-3 text-sm">
        <strong className="text-[var(--mpf-text)]">
          {mode === 'manual' && displaySource === 'owner_selected_work'
            ? t('character-profiles.featured.statusManual')
            : usingFallback
              ? t('character-profiles.featured.statusCasting')
              : t('character-profiles.featured.statusAutomatic')}
        </strong>
        <span className="ml-2 text-[var(--mpf-text-muted)]">
          {t('character-profiles.featured.publicOnly')}
        </span>
      </div>

      {candidates.length ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {candidates.map(candidate => {
            const selected = mode === 'manual'
              && selectedSourceType === candidate.sourceType
              && selectedSourceId === candidate.sourceId;
            const imageUrl = candidate.thumbnailUrl || candidate.imageUrl || null;
            return (
              <article
                key={candidate.id}
                className={`overflow-hidden rounded-[var(--mpf-radius-md)] border bg-[var(--mpf-surface)] ${
                  selected ? 'border-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.18)]' : 'border-[var(--mpf-border)]'
                }`}
              >
                <div className="aspect-[3/4] bg-black">
                  {imageUrl ? (
                    <AuthenticatedMediaImage
                      src={imageUrl}
                      alt={candidate.title || t('character-profiles.works.image')}
                      className="h-full w-full object-cover object-top"
                      loading="lazy"
                      fallback={(
                        <div className="grid h-full place-items-center">
                          <Image className="size-8 text-[var(--mpf-text-muted)]" aria-hidden="true" />
                        </div>
                      )}
                    />
                  ) : (
                    <div className="grid h-full place-items-center">
                      <Image className="size-8 text-[var(--mpf-text-muted)]" aria-hidden="true" />
                    </div>
                  )}
                </div>
                <div className="grid gap-3 p-3">
                  <div className="flex items-center gap-2 text-xs text-[var(--mpf-text-muted)]">
                    {candidate.ownership === 'owner'
                      ? <UserRound className="size-4 text-cyan-300" aria-hidden="true" />
                      : <Globe2 className="size-4 text-fuchsia-300" aria-hidden="true" />}
                    <span>{candidate.ownership === 'owner'
                      ? t('character-profiles.featured.sourceOwner')
                      : t('character-profiles.featured.sourceCommunity')}</span>
                  </div>
                  <strong className="line-clamp-1 text-sm">{candidate.title}</strong>
                  <Button
                    size="sm"
                    variant={selected ? 'primary' : 'secondary'}
                    icon={selected ? <Check className="size-4" aria-hidden="true" /> : undefined}
                    disabled={pending || selected}
                    onClick={() => onSelect(candidate)}
                  >
                    {selected
                      ? t('character-profiles.featured.selected')
                      : t('character-profiles.featured.select')}
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="mb-0 mt-4 text-sm text-[var(--mpf-text-muted)]">
          {t('character-profiles.featured.empty')}
        </p>
      )}
    </Surface>
  );
}

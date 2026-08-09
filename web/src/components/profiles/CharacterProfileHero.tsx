import {
  CheckCircle2,
  Clock3,
  ImageIcon,
  LockKeyhole,
  Share2,
  Shirt,
  Sparkles,
  UserRound
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { routeBuilders } from '../../app/routeRegistry/routes';
import { apiMediaUrl } from '../../lib/api/apiClient';
import { AuthenticatedMediaImage } from '../media/AuthenticatedMediaImage';
import { Button } from '../ui/Button';

type CharacterProfileHeroProps = {
  character: {
    displayName: string;
    personalitySummary: string;
    shortDescription?: string;
    intendedUses: string[];
    characterType: 'reusable_model' | 'styled_character';
    handoffAvailable: boolean;
    reusePolicy?: string;
    ownerUsername?: string | null;
    displayImageUrl?: string | null;
    stats: {
      totalOutputs: number;
      byUseCase: {
        fashion: number;
        sceneStory: number;
        other: number;
      };
    };
    updatedAt?: string | null;
    visibility?: string;
    status?: string;
  };
  ownerAccess: boolean;
  handoffPending: boolean;
  approvalPending?: boolean;
  onFashion?: () => void;
  onScene?: () => void;
  onApprove?: () => void;
  onShare: () => void;
};

export function CharacterProfileHero({
  character,
  ownerAccess,
  handoffPending,
  approvalPending = false,
  onFashion,
  onScene,
  onApprove,
  onShare
}: CharacterProfileHeroProps) {
  const { t, i18n } = useTranslation(['character-profiles', 'react-ui']);
  const creatorHandle = normalizeCreatorHandle(character.ownerUsername);
  const availabilityLabel = character.handoffAvailable
    ? t('character-profiles.status.available')
    : character.reusePolicy === 'owner_only'
      ? t('character-profiles.status.ownerOnly')
      : t('character-profiles.status.viewOnly');
  const typeLabel = character.characterType === 'reusable_model'
    ? t('character-profiles.type.reusable')
    : t('character-profiles.type.styled');
  const primaryAction = onFashion || onScene;
  const primaryLabel = onFashion
    ? t('character-profiles.actions.useFashion')
    : t('character-profiles.actions.useScene');

  return (
    <section className="character-showcase" aria-labelledby="character-profile-title">
      <div className="character-showcase__hero">
        <div className="character-showcase__media">
          {character.displayImageUrl && ownerAccess ? (
            <AuthenticatedMediaImage
              src={character.displayImageUrl}
              alt={t('character-profiles.media.alt')}
              className="character-showcase__image"
              fallback={<LockKeyhole aria-hidden="true" />}
            />
          ) : character.displayImageUrl ? (
            <img
              src={apiMediaUrl(character.displayImageUrl) || ''}
              alt={t('character-profiles.media.alt')}
              className="character-showcase__image"
            />
          ) : (
            <div className="character-showcase__media-empty">
              <ImageIcon aria-hidden="true" />
              <span>{t('character-profiles.states.mediaUnavailable')}</span>
            </div>
          )}
        </div>

        <div className="character-showcase__summary">
          <div className="character-showcase__identity">
            <div>
              <span className="character-showcase__kicker">{t('character-profiles.page.kicker')}</span>
              <h1 id="character-profile-title">{character.displayName}</h1>
            </div>
            <span className={`character-showcase__availability${character.handoffAvailable ? ' is-available' : ''}`}>
              {character.handoffAvailable
                ? <CheckCircle2 aria-hidden="true" />
                : <LockKeyhole aria-hidden="true" />}
              {availabilityLabel}
            </span>
          </div>

          <p className="character-showcase__description">
            {character.personalitySummary
              || character.shortDescription
              || t('character-profiles.page.noPersonality')}
          </p>

          {ownerAccess
            && onApprove
            && ['draft', 'review'].includes(character.status || '') ? (
            <div className="character-showcase__approval" role="status">
              <div>
                <strong>{t('ui.character.approvalRequired', { ns: 'react-ui' })}</strong>
                <p>{t('ui.character.approvalHelp', { ns: 'react-ui' })}</p>
              </div>
              <Button
                variant="primary"
                disabled={approvalPending}
                onClick={onApprove}
              >
                {t('ui.action.approve', { ns: 'react-ui' })}
              </Button>
            </div>
          ) : null}

          <div className="character-showcase__tags" aria-label={t('character-profiles.fields.intendedUses')}>
            <span>{typeLabel}</span>
            {character.intendedUses.map(use => (
              <span key={use}>{intendedUseLabel(use, t)}</span>
            ))}
          </div>

          <div className="character-showcase__stats" aria-label={t('character-profiles.stats.label')}>
            <HeroStat value={character.stats.totalOutputs} label={t('character-profiles.stats.total')} />
            <HeroStat value={character.stats.byUseCase.fashion} label={t('character-profiles.stats.fashion')} />
            <HeroStat value={character.stats.byUseCase.sceneStory} label={t('character-profiles.stats.scene')} />
            <HeroStat value={character.stats.byUseCase.other} label={t('character-profiles.stats.other')} />
          </div>

          {primaryAction ? (
            <Button
              variant="primary"
              size="lg"
              className="character-showcase__primary-action"
              disabled={handoffPending}
              onClick={primaryAction}
              icon={<Sparkles aria-hidden="true" />}
            >
              {primaryLabel}
            </Button>
          ) : null}

          <div className="character-showcase__secondary-actions">
            {onFashion && onScene ? (
              <Button disabled={handoffPending} onClick={onScene} icon={<Shirt aria-hidden="true" />}>
                {t('character-profiles.actions.useScene')}
              </Button>
            ) : null}
            <Button onClick={onShare} icon={<Share2 aria-hidden="true" />}>
              {t('character-profiles.actions.share')}
            </Button>
          </div>
        </div>
      </div>

      <div className="character-showcase__creator">
        <div className="character-showcase__creator-avatar" aria-hidden="true">
          {character.ownerUsername?.slice(0, 1).toUpperCase() || 'M'}
        </div>
        <div>
          <small>{t('character-profiles.creator.createdBy')}</small>
          <strong>@{character.ownerUsername}</strong>
          <span>{t('character-profiles.creator.originalOwner')}</span>
        </div>
        {creatorHandle ? (
          <Link to={routeBuilders.profile(creatorHandle)}>{t('character-profiles.creator.viewProfile')}</Link>
        ) : null}
      </div>

      <div className="character-showcase__rights">
        <RightsItem icon={Sparkles} label={t('character-profiles.metadata.type')} value={typeLabel} />
        <RightsItem icon={LockKeyhole} label={t('character-profiles.metadata.reuse')} value={availabilityLabel} />
        <RightsItem
          icon={UserRound}
          label={t('character-profiles.metadata.visibility')}
          value={character.visibility || (character.handoffAvailable ? 'public' : 'private')}
        />
        <RightsItem
          icon={Clock3}
          label={t('character-profiles.metadata.updated')}
          value={formatUpdatedAt(character.updatedAt, i18n.language, t('character-profiles.metadata.notAvailable'))}
        />
      </div>
    </section>
  );
}

function HeroStat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <strong>{new Intl.NumberFormat(undefined, { notation: 'compact' }).format(value)}</strong>
      <span>{label}</span>
    </div>
  );
}

function RightsItem({ icon: Icon, label, value }: {
  icon: typeof Sparkles;
  label: string;
  value: string;
}) {
  return (
    <div className="character-showcase__rights-item">
      <Icon aria-hidden="true" />
      <span><small>{label}</small><strong>{value}</strong></span>
    </div>
  );
}

function normalizeCreatorHandle(username?: string | null) {
  return String(username || '').trim().toLowerCase().replaceAll('_', '-');
}

function intendedUseLabel(use: string, t: (key: string) => string) {
  if (use === 'fashion') return t('character-profiles.uses.fashion');
  if (['scene', 'scene_story'].includes(use)) return t('character-profiles.uses.scene');
  if (use === 'general') return t('character-profiles.uses.general');
  return use;
}

function formatUpdatedAt(value: string | null | undefined, locale: string, fallback: string) {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
}

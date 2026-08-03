import {
  ExternalLink,
  MapPin,
  Pencil,
  Share2,
  UserPlus,
  UserRoundCheck
} from 'lucide-react';
import type { CreatorPage } from '../../features/profiles/schemas/profileSchemas';
import { apiMediaUrl } from '../../lib/api/apiClient';
import { Button } from '../ui/Button';

type CreatorProfileHeroProps = {
  page: CreatorPage;
  followLabel: string;
  followingLabel: string;
  editLabel: string;
  shareLabel: string;
  followerLabel: string;
  worksLabel: string;
  charactersLabel: string;
  templatesLabel: string;
  followPending?: boolean;
  onFollow: () => void;
  onEdit: () => void;
  onShare: () => void;
};

export function CreatorProfileHero({
  page,
  followLabel,
  followingLabel,
  editLabel,
  shareLabel,
  followerLabel,
  worksLabel,
  charactersLabel,
  templatesLabel,
  followPending = false,
  onFollow,
  onEdit,
  onShare
}: CreatorProfileHeroProps) {
  const { profile, counts, viewer } = page;

  return (
    <section className="creator-profile-hero" aria-labelledby="creator-profile-title">
      {profile.coverImageUrl ? (
        <img
          src={apiMediaUrl(profile.coverImageUrl) || ''}
          alt=""
          className="creator-profile-hero__cover"
        />
      ) : null}
      <div className="creator-profile-hero__scrim" aria-hidden="true" />
      <div className="creator-profile-hero__content">
        <div className="creator-profile-hero__avatar" aria-hidden={!profile.avatarUrl}>
          {profile.avatarUrl ? (
            <img src={apiMediaUrl(profile.avatarUrl) || ''} alt="" />
          ) : (
            <span>{profile.displayName.slice(0, 1).toUpperCase()}</span>
          )}
        </div>

        <div className="creator-profile-hero__identity">
          <div className="creator-profile-hero__name-row">
            <h1 id="creator-profile-title">{profile.displayName}</h1>
            {profile.badgeCodes.map(badge => (
              <span key={badge} className="creator-profile-hero__badge">{badge}</span>
            ))}
          </div>
          <p className="creator-profile-hero__handle">@{profile.handle}</p>
          {profile.creatorRoles.length ? (
            <div className="creator-profile-hero__roles">
              {profile.creatorRoles.map(role => <span key={role}>{humanizeCode(role)}</span>)}
            </div>
          ) : null}
          <p className="creator-profile-hero__bio">
            {profile.headline || profile.bio}
          </p>
          <div className="creator-profile-hero__meta">
            {profile.locationText ? (
              <span><MapPin aria-hidden="true" />{profile.locationText}</span>
            ) : null}
            {profile.websiteUrl ? (
              <a href={profile.websiteUrl} target="_blank" rel="noreferrer">
                <ExternalLink aria-hidden="true" />{displayWebsite(profile.websiteUrl)}
              </a>
            ) : null}
          </div>
          <dl className="creator-profile-hero__counts">
            <ProfileCount value={counts.followers || 0} label={followerLabel} />
            <ProfileCount value={counts.publicPosts || 0} label={worksLabel} />
            <ProfileCount value={counts.publicCharacters || 0} label={charactersLabel} />
            <ProfileCount value={counts.templates || 0} label={templatesLabel} />
          </dl>
        </div>

        <div className="creator-profile-hero__actions">
          {viewer.canEditProfile ? (
            <Button icon={<Pencil aria-hidden="true" />} onClick={onEdit}>
              {editLabel}
            </Button>
          ) : viewer.canFollow ? (
            <Button
              variant="primary"
              icon={viewer.isFollowing
                ? <UserRoundCheck aria-hidden="true" />
                : <UserPlus aria-hidden="true" />}
              disabled={followPending}
              onClick={onFollow}
            >
              {viewer.isFollowing ? followingLabel : followLabel}
            </Button>
          ) : null}
          <Button icon={<Share2 aria-hidden="true" />} onClick={onShare}>
            {shareLabel}
          </Button>
        </div>
      </div>
    </section>
  );
}

function ProfileCount({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{formatCompact(value)}</dd>
    </div>
  );
}

function formatCompact(value: number) {
  return new Intl.NumberFormat(undefined, {
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(value);
}

function humanizeCode(value: string) {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, character => character.toUpperCase());
}

function displayWebsite(value: string) {
  try {
    return new URL(value).hostname;
  } catch {
    return value;
  }
}

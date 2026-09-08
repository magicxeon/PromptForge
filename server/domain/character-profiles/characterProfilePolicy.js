import { RepositoryContractError } from '../../repositories/repositoryContracts.js';

export const CHARACTER_PROFILE_STATUS = Object.freeze({
  DRAFT: 'draft',
  EXPORT_PENDING: 'export_pending',
  REVIEW: 'review',
  APPROVED: 'approved',
  ARCHIVED: 'archived',
  BLOCKED: 'blocked',
  DELETED: 'deleted'
});

export function canViewCharacterProfile(profile, actorContext) {
  if (!profile || profile.status === CHARACTER_PROFILE_STATUS.DELETED) return false;
  if (actorContext?.userId === profile.ownerUserId) return true;
  return ['public', 'unlisted'].includes(profile.visibility)
    && profile.status === CHARACTER_PROFILE_STATUS.APPROVED;
}

export function canReuseCharacterProfile(profile, actorContext) {
  if (!profile || profile.status !== CHARACTER_PROFILE_STATUS.APPROVED) return false;
  if (actorContext?.userId === profile.ownerUserId) return true;
  return profile.visibility === 'public' && profile.reusePolicy === 'public_reusable';
}

export function assertProfileView(profile, actorContext) {
  if (!canViewCharacterProfile(profile, actorContext)) {
    throw new RepositoryContractError('character_profile_not_found', 'Character Profile not found.', 404);
  }
  return profile;
}

export function assertProfileReuse(profile, actorContext) {
  if (!canReuseCharacterProfile(profile, actorContext)) {
    throw new RepositoryContractError(
      'character_profile_reuse_forbidden',
      'This Character is not available for reuse.',
      403
    );
  }
  return profile;
}

export function reuseStatus(profile, actorContext) {
  if (profile.status !== CHARACTER_PROFILE_STATUS.APPROVED) return 'unavailable';
  if (actorContext?.userId === profile.ownerUserId) return 'available';
  if (profile.visibility !== 'public') return 'owner_only';
  if (profile.reusePolicy === 'public_reusable') return 'available';
  if (profile.reusePolicy === 'view_only') return 'view_only';
  return 'owner_only';
}

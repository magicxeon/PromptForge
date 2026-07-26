import { resolveDataFile } from '../../config/paths.js';
import { readJsonFile, mutateJsonFile } from '../json/jsonFileStore.js';
import {
  assertActorContext,
  RepositoryContractError
} from '../repositoryContracts.js';
import { applyRecordDefaults } from '../schemaVersioning.js';

const PROFILE_FALLBACK = [];
const HANDLE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CreatorProfileRepository {
  constructor({ profilesFile = resolveDataFile('creatorProfiles') } = {}) {
    this.profilesFile = profilesFile;
  }

  async readAll() {
    const profiles = await readJsonFile(this.profilesFile, PROFILE_FALLBACK);
    return Array.isArray(profiles) ? profiles.map(normalizeProfile) : [];
  }

  async findById(profileId) {
    if (!profileId) return null;
    return (await this.readAll()).find(profile => profile.id === profileId) || null;
  }

  async findByUserId(userId) {
    if (!userId) return null;
    return (await this.readAll()).find(profile => profile.userId === userId && profile.status === 'active') || null;
  }

  async findByHandle(handle) {
    const normalizedHandle = normalizeHandle(handle);
    if (!normalizedHandle) return null;
    return (await this.readAll()).find(
      profile => profile.handle === normalizedHandle && profile.status === 'active'
    ) || null;
  }

  async ensureForActor(actorContext) {
    const actor = assertActorContext(actorContext);
    return mutateJsonFile(this.profilesFile, PROFILE_FALLBACK, async profiles => {
      assertProfileStore(profiles);
      const existing = profiles.find(
        profile => profile.userId === actor.userId && profile.status !== 'deleted'
      );
      if (existing) {
        const normalizedExisting = normalizeProfile(existing);
        if (normalizedExisting.status !== 'active') {
          throw new RepositoryContractError(
            'creator_profile_unavailable',
            'Creator profile is not available.',
            403
          );
        }
        return normalizedExisting;
      }

      const now = new Date().toISOString();
      const preferredId = validStableId(actor.activeCreatorProfileId)
        ? actor.activeCreatorProfileId
        : `creator_${safeIdPart(actor.username || actor.userId)}`;
      const id = uniqueValue(preferredId, new Set(profiles.map(profile => profile.id)));
      const preferredHandle = normalizeHandle(actor.username || actor.displayName || actor.userId)
        || `creator-${safeIdPart(actor.userId)}`;
      const handle = uniqueValue(preferredHandle, new Set(profiles.map(profile => profile.handle)));
      const record = {
        ...applyRecordDefaults({
          userId: actor.userId,
          handle,
          displayName: normalizeDisplayName(actor.displayName || actor.username || handle),
          bio: '',
          avatarAssetId: null,
          badgeCodes: [],
          membershipEnabled: false,
          status: 'active'
        }, {
          idPrefix: 'creator',
          visibility: 'public',
          status: 'active',
          now
        }),
        id
      };
      profiles.push(record);
      return normalizeProfile(record);
    });
  }

  async updateOwnProfile(profileId, input = {}, actorContext) {
    const actor = assertActorContext(actorContext);
    return mutateJsonFile(this.profilesFile, PROFILE_FALLBACK, async profiles => {
      assertProfileStore(profiles);
      const index = profiles.findIndex(profile => profile.id === profileId);
      if (index < 0) {
        throw new RepositoryContractError('creator_profile_not_found', 'Creator profile not found.', 404);
      }
      if (profiles[index].userId !== actor.userId) {
        throw new RepositoryContractError(
          'creator_profile_forbidden',
          'You cannot edit another creator profile.',
          403
        );
      }
      const current = normalizeProfile(profiles[index]);
      const next = {
        ...current,
        displayName: input.displayName === undefined
          ? current.displayName
          : normalizeDisplayName(input.displayName),
        bio: input.bio === undefined ? current.bio : normalizeBio(input.bio),
        updatedAt: new Date().toISOString()
      };
      profiles[index] = next;
      return normalizeProfile(next);
    });
  }
}

function normalizeProfile(value = {}) {
  return {
    id: String(value.id || ''),
    schemaVersion: Number(value.schemaVersion) || 1,
    userId: String(value.userId || ''),
    handle: normalizeHandle(value.handle),
    displayName: normalizeDisplayName(value.displayName || value.handle || 'Creator'),
    bio: normalizeBio(value.bio),
    avatarAssetId: typeof value.avatarAssetId === 'string' && value.avatarAssetId.trim()
      ? value.avatarAssetId.trim()
      : null,
    badgeCodes: Array.isArray(value.badgeCodes)
      ? [...new Set(value.badgeCodes.filter(code => typeof code === 'string').map(code => code.trim()).filter(Boolean))]
      : [],
    membershipEnabled: value.membershipEnabled === true,
    visibility: 'public',
    status: ['active', 'hidden', 'disabled', 'deleted'].includes(value.status)
      ? value.status
      : 'active',
    createdAt: value.createdAt || null,
    updatedAt: value.updatedAt || value.createdAt || null
  };
}

function normalizeHandle(value) {
  const handle = String(value || '')
    .trim()
    .toLocaleLowerCase('en-US')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
  return HANDLE_PATTERN.test(handle) ? handle : '';
}

function normalizeDisplayName(value) {
  const displayName = String(value || '').trim().replace(/\s+/g, ' ').slice(0, 80);
  if (!displayName) {
    throw new RepositoryContractError(
      'creator_display_name_required',
      'Creator display name is required.'
    );
  }
  return displayName;
}

function normalizeBio(value) {
  return String(value || '').trim().replace(/\r\n/g, '\n').slice(0, 500);
}

function uniqueValue(preferred, existing) {
  if (!existing.has(preferred)) return preferred;
  for (let suffix = 2; suffix < 10000; suffix += 1) {
    const candidate = `${preferred}-${suffix}`;
    if (!existing.has(candidate)) return candidate;
  }
  throw new RepositoryContractError(
    'creator_identifier_unavailable',
    'A unique creator identifier could not be allocated.',
    409
  );
}

function safeIdPart(value) {
  return String(value || 'user').toLocaleLowerCase('en-US').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'user';
}

function validStableId(value) {
  return typeof value === 'string' && /^creator_[a-z0-9_]+$/.test(value);
}

function assertProfileStore(profiles) {
  if (!Array.isArray(profiles)) throw new TypeError('Creator profile data must be an array.');
}

export const creatorProfileRepo = new CreatorProfileRepository();

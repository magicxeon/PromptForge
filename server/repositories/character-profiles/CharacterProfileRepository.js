import { resolveDataFile } from '../../config/paths.js';
import { readJsonFile, mutateJsonFile } from '../json/jsonFileStore.js';
import {
  assertActorContext,
  createPage,
  normalizeListQuery,
  RepositoryContractError,
  VISIBILITY
} from '../repositoryContracts.js';
import { applyRecordDefaults } from '../schemaVersioning.js';
import { paginateRepositoryRecords } from '../RepositoryCursor.js';

const FALLBACK = [];
const STATUSES = ['draft', 'export_pending', 'review', 'approved', 'archived', 'blocked', 'deleted'];
const VISIBILITIES = [VISIBILITY.PRIVATE, VISIBILITY.UNLISTED, VISIBILITY.PUBLIC];
const REUSE_POLICIES = ['owner_only', 'view_only', 'public_reusable'];

export class CharacterProfileRepository {
  constructor({
    profilesFile = resolveDataFile('characterProfiles'),
    cursorSecret = process.env.CHARACTER_PROFILE_CURSOR_SECRET || 'local-character-profile-cursor'
  } = {}) {
    this.profilesFile = profilesFile;
    this.cursorSecret = cursorSecret;
  }

  async readAll() {
    const data = await readJsonFile(this.profilesFile, FALLBACK);
    if (!Array.isArray(data)) throw new TypeError('Character profiles data must be an array.');
    return data.map(normalizeProfile);
  }

  async findById(id, { includeDeleted = false } = {}) {
    if (!id) return null;
    return (await this.readAll()).find(item => item.id === id && (includeDeleted || item.status !== 'deleted')) || null;
  }

  async findByIdForOwner(id, ownerUserId) {
    const item = await this.findById(id);
    return item?.ownerUserId === ownerUserId ? item : null;
  }

  async findByIdempotencyKey(ownerUserId, idempotencyKey) {
    if (!ownerUserId || !idempotencyKey) return null;
    return (await this.readAll()).find(item =>
      item.ownerUserId === ownerUserId && item.idempotencyKey === idempotencyKey
    ) || null;
  }

  async findByOwner(ownerUserId, query = {}) {
    const normalizedQuery = normalizeListQuery(query);
    const search = String(query.q || '').trim().toLocaleLowerCase('en-US').slice(0, 160);
    const items = (await this.readAll()).filter(item =>
      item.ownerUserId === ownerUserId && item.status !== 'deleted'
      && (!search || String(item.displayName || '').toLocaleLowerCase('en-US').includes(search))
    );
    const page = paginateRepositoryRecords(
      items,
      normalizedQuery,
      JSON.stringify({ ownerUserId, sort: normalizedQuery.sort, ...(search ? { search } : {}) }),
      this.cursorSecret
    );
    return createPage(page.items, page);
  }

  async listPublic(query = {}) {
    const normalizedQuery = normalizeListQuery(query);
    const search = String(query.q || '').trim().toLocaleLowerCase('en-US').slice(0, 160);
    const intendedUse = String(query.intendedUse || normalizedQuery.filters.intendedUse || '').trim();
    const reusable = query.reusable === true || query.reusable === 'true';
    const reusePolicy = String(query.reusePolicy || normalizedQuery.filters.reusePolicy || '').trim();
    const creator = String(query.creator || normalizedQuery.filters.creator || '').trim().toLocaleLowerCase('en-US');
    const creatorProfileId = String(normalizedQuery.filters.creatorProfileId || '').trim();
    const ownerUserId = String(normalizedQuery.filters.ownerUserId || '').trim();
    const items = (await this.readAll()).filter(item =>
      item.visibility === VISIBILITY.PUBLIC
      && item.status === 'approved'
      && (!search || String(item.displayName || '').toLocaleLowerCase('en-US').includes(search))
      && (!intendedUse || item.intendedUses.includes(intendedUse))
      && (!reusable || item.reusePolicy === 'public_reusable')
      && (!reusePolicy || item.reusePolicy === reusePolicy)
      && (!creator || String(item.ownerUsernameSnapshot || item.ownerUsername || '')
        .toLocaleLowerCase('en-US')
        .includes(creator))
      && (!creatorProfileId || item.creatorProfileId === creatorProfileId)
      && (!ownerUserId || item.ownerUserId === ownerUserId)
    );
    const page = paginateRepositoryRecords(
      items,
      normalizedQuery,
      JSON.stringify({
        visibility: VISIBILITY.PUBLIC,
        intendedUse,
        reusable,
        reusePolicy,
        creator,
        creatorProfileId,
        ownerUserId,
        ...(search ? { search } : {}),
        sort: normalizedQuery.sort
      }),
      this.cursorSecret
    );
    return createPage(page.items, page);
  }

  async create(input = {}, actorContext) {
    const actor = assertActorContext(actorContext);
    const displayName = normalizeRequiredText(input.displayName, 'character_name_required', 80);
    const characterType = normalizeCharacterType(input.characterType);
    const now = new Date().toISOString();
    const record = applyRecordDefaults({
      ownerUsernameSnapshot: actor.username || null,
      displayName,
      slug: await this.allocateSlug(displayName),
      shortDescription: normalizeText(input.shortDescription, 280),
      personalitySummary: normalizeText(input.personalitySummary, 500),
      characterType,
      intendedUses: normalizeIntendedUsesForType(input.intendedUses, characterType),
      reusePolicy: 'owner_only',
      featuredImageMode: 'auto',
      featuredImageSourceType: null,
      featuredGenerationResultId: null,
      featuredWorkPostId: null,
      activeVersionId: input.activeVersionId || null,
      creatorProfileId: input.creatorProfileId || null,
      idempotencyKey: input.idempotencyKey || null,
      recordVersion: 1
    }, {
      idPrefix: 'charprof',
      ownerUserId: actor.userId,
      ownerUsername: actor.username,
      visibility: VISIBILITY.PRIVATE,
      status: 'draft',
      now
    });
    return mutateJsonFile(this.profilesFile, FALLBACK, async items => {
      assertStore(items);
      const existing = record.idempotencyKey
        ? items.find(item =>
          item.ownerUserId === actor.userId && item.idempotencyKey === record.idempotencyKey
        )
        : null;
      if (existing) return normalizeProfile(existing);
      items.unshift(record);
      return structuredClone(record);
    });
  }

  async updateOwned(id, patch = {}, actorContext) {
    const actor = assertActorContext(actorContext);
    return mutateJsonFile(this.profilesFile, FALLBACK, async items => {
      assertStore(items);
      const index = items.findIndex(item => item.id === id);
      if (index < 0 || items[index].ownerUserId !== actor.userId || items[index].status === 'deleted') {
        throw new RepositoryContractError('character_profile_not_found', 'Character Profile not found.', 404);
      }
      const current = normalizeProfile(items[index]);
      const expectedVersion = Number(patch.version);
      if (Number.isFinite(expectedVersion) && expectedVersion !== current.recordVersion) {
        throw new RepositoryContractError(
          'character_profile_version_conflict',
          'Character Profile was changed in another session.',
          409
        );
      }
      const next = applyPatch(current, patch);
      items[index] = next;
      return structuredClone(next);
    });
  }

  async updateSystem(id, patch = {}) {
    return mutateJsonFile(this.profilesFile, FALLBACK, async items => {
      assertStore(items);
      const index = items.findIndex(item => item.id === id);
      if (index < 0 || items[index].status === 'deleted') {
        throw new RepositoryContractError('character_profile_not_found', 'Character Profile not found.', 404);
      }
      const current = normalizeProfile(items[index]);
      const next = {
        ...current,
        ...structuredClone(patch),
        status: STATUSES.includes(patch.status) ? patch.status : current.status,
        visibility: VISIBILITIES.includes(patch.visibility) ? patch.visibility : current.visibility,
        reusePolicy: REUSE_POLICIES.includes(patch.reusePolicy) ? patch.reusePolicy : current.reusePolicy,
        characterType: Object.hasOwn(patch, 'characterType')
          ? normalizeCharacterType(patch.characterType)
          : current.characterType,
        intendedUses: Object.hasOwn(patch, 'intendedUses')
          ? normalizeIntendedUses(patch.intendedUses)
          : current.intendedUses,
        updatedAt: new Date().toISOString(),
        recordVersion: current.recordVersion + 1
      };
      next.intendedUses = normalizeIntendedUsesForType(next.intendedUses, next.characterType);
      items[index] = next;
      return structuredClone(next);
    });
  }

  async softDeleteOwned(id, actorContext) {
    const actor = assertActorContext(actorContext);
    return mutateJsonFile(this.profilesFile, FALLBACK, async items => {
      assertStore(items);
      const index = items.findIndex(item => item.id === id && item.ownerUserId === actor.userId);
      if (index < 0) {
        throw new RepositoryContractError('character_profile_not_found', 'Character Profile not found.', 404);
      }
      const current = normalizeProfile(items[index]);
      if (current.status === 'deleted') return structuredClone(current);
      const now = new Date().toISOString();
      const next = {
        ...current,
        status: 'deleted', visibility: 'private', reusePolicy: 'owner_only',
        deletedAt: now, deletedByUserId: actor.userId,
        deletionPreviousState: { status: current.status, visibility: current.visibility, reusePolicy: current.reusePolicy },
        updatedAt: now, recordVersion: current.recordVersion + 1
      };
      items[index] = next;
      return structuredClone(next);
    });
  }

  async allocateSlug(displayName) {
    const base = String(displayName || 'character')
      .normalize('NFKD')
      .toLocaleLowerCase('en-US')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'character';
    const existing = new Set((await this.readAll()).map(item => item.slug));
    if (!existing.has(base)) return base;
    for (let suffix = 2; suffix < 10000; suffix += 1) {
      const candidate = `${base}-${suffix}`;
      if (!existing.has(candidate)) return candidate;
    }
    throw new RepositoryContractError('character_slug_unavailable', 'Character slug is unavailable.', 409);
  }
}

function normalizeProfile(value = {}) {
  const characterType = normalizeCharacterType(value.characterType);
  return {
    ...structuredClone(value),
    displayName: String(value.displayName || '').trim(),
    shortDescription: normalizeText(value.shortDescription, 280),
    personalitySummary: normalizeText(value.personalitySummary, 500),
    characterType,
    intendedUses: normalizeIntendedUsesForType(value.intendedUses, characterType),
    status: STATUSES.includes(value.status) ? value.status : 'draft',
    visibility: VISIBILITIES.includes(value.visibility) ? value.visibility : VISIBILITY.PRIVATE,
    reusePolicy: REUSE_POLICIES.includes(value.reusePolicy) ? value.reusePolicy : 'owner_only',
    featuredImageMode: value.featuredImageMode === 'manual' ? 'manual' : 'auto',
    featuredImageSourceType: normalizeFeaturedImageSourceType(
      value.featuredImageSourceType,
      value.featuredGenerationResultId,
      value.featuredWorkPostId
    ),
    featuredGenerationResultId: normalizeOptionalId(value.featuredGenerationResultId),
    featuredWorkPostId: normalizeOptionalId(value.featuredWorkPostId),
    recordVersion: Math.max(1, Number(value.recordVersion || value.version || 1))
  };
}

function applyPatch(current, patch) {
  const next = { ...current };
  if (Object.hasOwn(patch, 'displayName')) {
    next.displayName = normalizeRequiredText(patch.displayName, 'character_name_required', 80);
  }
  if (Object.hasOwn(patch, 'shortDescription')) next.shortDescription = normalizeText(patch.shortDescription, 280);
  if (Object.hasOwn(patch, 'personalitySummary')) next.personalitySummary = normalizeText(patch.personalitySummary, 500);
  if (Object.hasOwn(patch, 'intendedUses')) {
    next.intendedUses = normalizeIntendedUsesForType(patch.intendedUses, current.characterType);
  }
  if (Object.hasOwn(patch, 'featuredImageMode')) {
    next.featuredImageMode = patch.featuredImageMode === 'manual' ? 'manual' : 'auto';
  }
  if (Object.hasOwn(patch, 'featuredImageSourceType')) {
    next.featuredImageSourceType = normalizeFeaturedImageSourceType(patch.featuredImageSourceType);
  }
  if (Object.hasOwn(patch, 'featuredGenerationResultId')) {
    next.featuredGenerationResultId = normalizeOptionalId(patch.featuredGenerationResultId);
  }
  if (Object.hasOwn(patch, 'featuredWorkPostId')) {
    next.featuredWorkPostId = normalizeOptionalId(patch.featuredWorkPostId);
  }
  if (next.featuredImageMode === 'auto') {
    next.featuredImageSourceType = null;
    next.featuredGenerationResultId = null;
    next.featuredWorkPostId = null;
  } else if (next.featuredImageSourceType === 'generation_result') {
    next.featuredWorkPostId = null;
  } else if (next.featuredImageSourceType === 'community_post') {
    next.featuredGenerationResultId = null;
  }
  next.updatedAt = new Date().toISOString();
  next.recordVersion = current.recordVersion + 1;
  return next;
}

function normalizeOptionalId(value) {
  const id = String(value || '').trim();
  return id ? id.slice(0, 160) : null;
}

function normalizeFeaturedImageSourceType(value, generationResultId = null, postId = null) {
  if (value === 'generation_result' || value === 'community_post') return value;
  if (normalizeOptionalId(generationResultId)) return 'generation_result';
  if (normalizeOptionalId(postId)) return 'community_post';
  return null;
}

function normalizeRequiredText(value, code, maxLength) {
  const text = normalizeText(value, maxLength);
  if (!text) throw new RepositoryContractError(code, 'Character display name is required.');
  return text;
}

function normalizeText(value, maxLength) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, maxLength);
}

function normalizeIntendedUses(value) {
  const allowed = new Set(['fashion', 'scene_story', 'general']);
  const normalized = Array.isArray(value) ? [...new Set(value.filter(item => allowed.has(item)))] : [];
  return normalized.length ? normalized : ['general'];
}

function normalizeIntendedUsesForType(value, characterType) {
  const uses = normalizeIntendedUses(value);
  if (normalizeCharacterType(characterType) !== 'styled_character') return uses;
  const sceneUses = uses.filter(use => use !== 'fashion');
  return sceneUses.length ? sceneUses : ['general'];
}

function normalizeCharacterType(value) {
  return value === 'styled_character' ? 'styled_character' : 'reusable_model';
}

function assertStore(value) {
  if (!Array.isArray(value)) throw new TypeError('Character profiles data must be an array.');
}

export const characterProfileRepo = new CharacterProfileRepository();

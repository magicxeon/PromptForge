import { resolveDataFile } from '../../config/paths.js';
import { readJsonFile, mutateJsonFile } from '../json/jsonFileStore.js';
import {
  assertActorContext,
  createPage,
  normalizeListQuery,
  pickAllowedValue,
  RepositoryContractError,
  VISIBILITY
} from '../repositoryContracts.js';
import { decodeRepositoryCursor, encodeRepositoryCursor } from '../RepositoryCursor.js';
import {
  normalizeCommunityEngagementSummary,
  normalizeCommunityPostRecord,
  normalizeCommunityPostType,
  stripEmbeddedBase64
} from '../recordNormalizer.js';
import { applyRecordDefaults } from '../schemaVersioning.js';
import { mockUserRepo } from '../identity/MockUserRepository.js';

const POST_FALLBACK = [];

export class CommunityPostRepository {
  constructor({
    postsFile = resolveDataFile('communityPosts'),
    userRepository = mockUserRepo,
    cursorSecret = process.env.COMMUNITY_POST_CURSOR_SECRET || 'local-community-post-cursor'
  } = {}) {
    this.postsFile = postsFile;
    this.userRepository = userRepository;
    this.cursorSecret = cursorSecret;
  }

  async readRaw() {
    const posts = await readJsonFile(this.postsFile, POST_FALLBACK);
    return Array.isArray(posts) ? posts : [];
  }

  async readAll() {
    const posts = await this.readRaw();
    return Promise.all(posts.map(post => normalizeCommunityPostRecord(post, this.userRepository)));
  }

  async findById(id) {
    if (!id) return null;
    const post = (await this.readRaw()).find(item => item.id === id);
    return post ? normalizeCommunityPostRecord(post, this.userRepository) : null;
  }

  async findByIdForOwner(id, ownerUserId) {
    const post = await this.findById(id);
    return post?.ownerUserId === ownerUserId ? post : null;
  }

  async findByGenerationForOwner(generationId, ownerUserId) {
    const posts = await this.readAll();
    return posts.find(post => ['image', 'template'].includes(post.postType)
      && post.ownerUserId === ownerUserId
      && (post.sourceGenerationResultId || post.sourceGenerationId) === generationId) || null;
  }

  async findByOwner(ownerUserId, query = {}) {
    const normalizedQuery = normalizeListQuery(query);
    const scope = JSON.stringify({ ownerUserId, sort: normalizedQuery.sort });
    const cursor = normalizedQuery.cursor
      ? decodeRepositoryCursor(normalizedQuery.cursor, scope, this.cursorSecret)
      : null;
    let posts = (await this.readAll())
      .filter(post => post.ownerUserId === ownerUserId && post.status !== 'deleted')
      .sort((left, right) => comparePosts(left, right, normalizedQuery.sort));

    if (cursor) posts = posts.filter(post => comparePosts(post, cursor, normalizedQuery.sort) > 0);
    return toPage(posts, normalizedQuery.limit, scope, this.cursorSecret, normalizedQuery.sort);
  }

  async listPublic(query = {}, viewerContext = null) {
    const normalizedQuery = normalizeListQuery(query);
    const scope = JSON.stringify({
      sort: normalizedQuery.sort,
      visibility: normalizedQuery.filters.visibility || VISIBILITY.PUBLIC,
      officialTag: normalizedQuery.filters.officialTag || null,
      customTag: normalizedQuery.filters.customTag || null,
      search: normalizedQuery.filters.search || null,
      creatorProfileId: normalizedQuery.filters.creatorProfileId || null,
      ownerUserId: normalizedQuery.filters.ownerUserId || null,
      viewer: viewerContext?.userId || 'anonymous'
    });
    const cursor = normalizedQuery.cursor
      ? decodeRepositoryCursor(normalizedQuery.cursor, scope, this.cursorSecret)
      : null;
    let posts = (await this.readAll())
      .filter(isVisiblePublicPost)
      .filter(post => normalizedQuery.sort !== 'trending' || post.status !== 'reported')
      .filter(post => normalizedQuery.sort !== 'trending'
        || normalizeStringArray(post.trendingCategoryCodes).length > 0)
      .filter(post => !normalizedQuery.filters.officialTag
        || taxonomyCodesForQuery(post, normalizedQuery.sort).includes(normalizedQuery.filters.officialTag))
      .filter(post => !normalizedQuery.filters.customTag
        || normalizeStringArray(post.customTags).some(tag => sameSearchTerm(tag, normalizedQuery.filters.customTag)))
      .filter(post => !normalizedQuery.filters.search || communityPostMatchesSearch(post, normalizedQuery.filters.search))
      .filter(post => !normalizedQuery.filters.creatorProfileId
        || post.creatorProfileId === normalizedQuery.filters.creatorProfileId)
      .filter(post => !normalizedQuery.filters.ownerUserId
        || post.ownerUserId === normalizedQuery.filters.ownerUserId)
      .sort((left, right) => comparePosts(left, right, normalizedQuery.sort));

    if (cursor) posts = posts.filter(post => comparePosts(post, cursor, normalizedQuery.sort) > 0);
    return toPage(posts, normalizedQuery.limit, scope, this.cursorSecret, normalizedQuery.sort);
  }

  async listForBackoffice(query = {}) {
    const normalizedQuery = normalizeListQuery(query);
    const status = typeof query.status === 'string' ? query.status.trim() : '';
    const ownerUserId = typeof query.ownerUserId === 'string' ? query.ownerUserId.trim() : '';
    const search = typeof query.search === 'string' ? query.search.trim().toLowerCase() : '';
    const scope = JSON.stringify({ status, ownerUserId, search, sort: normalizedQuery.sort });
    const cursor = normalizedQuery.cursor
      ? decodeRepositoryCursor(normalizedQuery.cursor, scope, this.cursorSecret)
      : null;
    let posts = (await this.readAll())
      .filter(post => !status || post.status === status)
      .filter(post => !ownerUserId || post.ownerUserId === ownerUserId)
      .filter(post => !search || [post.id, post.title, post.ownerUserId, post.ownerUsername]
        .filter(Boolean).some(value => String(value).toLowerCase().includes(search)))
      .sort((left, right) => comparePosts(left, right, normalizedQuery.sort));

    if (cursor) posts = posts.filter(post => comparePosts(post, cursor, normalizedQuery.sort) > 0);
    return toPage(posts, normalizedQuery.limit, scope, this.cursorSecret, normalizedQuery.sort);
  }

  async findPublicById(id) {
    const post = await this.findById(id);
    if (!post || !isVisiblePublicPost(post)) return null;
    return post;
  }

  async findPublicBySourceGenerationResultIds(ids = []) {
    const requestedIds = new Set((Array.isArray(ids) ? ids : []).filter(Boolean));
    if (!requestedIds.size) return [];
    return (await this.readAll()).filter(post =>
      requestedIds.has(post.sourceGenerationResultId) && isVisiblePublicPost(post)
    );
  }

  async create(recordInput = {}, actorContext) {
    const actor = assertActorContext(actorContext);
    const title = String(recordInput.title || '').trim();
    if (!title) {
      throw new RepositoryContractError('post_title_required', 'A community post title is required.');
    }

    const now = new Date().toISOString();
    const postType = normalizeCommunityPostType(recordInput.postType, recordInput);
    const record = applyRecordDefaults({
      ...stripEmbeddedBase64(recordInput),
      postType,
      title,
      description: typeof recordInput.description === 'string' ? recordInput.description.trim() : '',
      creatorProfileId: recordInput.creatorProfileId || null,
      sourceGenerationResultId: recordInput.sourceGenerationResultId || recordInput.sourceGenerationId || null,
      sourceSceneTemplateSnapshotId: recordInput.sourceSceneTemplateSnapshotId || null,
      templateId: recordInput.templateId || null,
      templateVersionId: recordInput.templateVersionId || null,
      templatePricing: recordInput.templatePricing && typeof recordInput.templatePricing === 'object'
        ? structuredClone(recordInput.templatePricing)
        : null,
      sourceComparisonSetId: recordInput.sourceComparisonSetId || null,
      sceneTemplateSnapshot: stripEmbeddedBase64(recordInput.sceneTemplateSnapshot || null),
      sharedPromptSnapshot: stripEmbeddedBase64(recordInput.sharedPromptSnapshot || null),
      providerModelSnapshot: stripEmbeddedBase64(recordInput.providerModelSnapshot || null),
      officialTags: normalizeStringArray(recordInput.officialTags),
      customTags: normalizeStringArray(recordInput.customTags),
      categoryCodes: normalizeStringArray(recordInput.categoryCodes),
      trendingCategoryCodes: normalizeStringArray(recordInput.trendingCategoryCodes),
      taxonomyVersion: typeof recordInput.taxonomyVersion === 'string' ? recordInput.taxonomyVersion : null,
      taxonomyAssignments: normalizeTaxonomyAssignments(recordInput.taxonomyAssignments),
      taxonomyReviewStatus: typeof recordInput.taxonomyReviewStatus === 'string'
        ? recordInput.taxonomyReviewStatus
        : 'unclassified',
      taxonomyConfidence: Number.isFinite(Number(recordInput.taxonomyConfidence))
        ? Math.min(1, Math.max(0, Number(recordInput.taxonomyConfidence)))
        : 0,
      counts: {},
      engagementSummary: normalizeCommunityEngagementSummary({}, {}, now),
      workflowSnapshot: recordInput.workflowSnapshot && typeof recordInput.workflowSnapshot === 'object'
        ? stripEmbeddedBase64(recordInput.workflowSnapshot)
        : {}
    }, {
      idPrefix: 'post',
      ownerUserId: actor.userId,
      ownerUsername: actor.username,
      visibility: pickAllowedValue(
        recordInput.visibility,
        [VISIBILITY.PUBLIC, VISIBILITY.UNLISTED, VISIBILITY.MEMBERS_ONLY, VISIBILITY.PRIVATE],
        VISIBILITY.PUBLIC
      ),
      status: pickAllowedValue(
        recordInput.status,
        ['draft', 'published', 'reported', 'hidden', 'removed', 'owner_unpublished'],
        'published'
      ),
      now
    });

    return mutateJsonFile(this.postsFile, POST_FALLBACK, async posts => {
      if (!Array.isArray(posts)) throw new TypeError('Community posts data must be an array.');
      if (['image', 'template'].includes(postType) && record.sourceGenerationResultId) {
        const normalized = await Promise.all(posts.map(post => normalizeCommunityPostRecord(post, this.userRepository)));
        if (normalized.some(post => ['image', 'template'].includes(post.postType)
          && post.ownerUserId === actor.userId
          && (post.sourceGenerationResultId || post.sourceGenerationId) === record.sourceGenerationResultId)) {
          throw new RepositoryContractError('community_generation_already_shared', 'This image has already been shared.', 409);
        }
      }
      posts.unshift(record);
      return normalizeCommunityPostRecord(record, this.userRepository);
    });
  }

  async updatePresentationById(id, presentation = {}, actorContext) {
    const actor = assertActorContext(actorContext);
    const allowedVisibility = [VISIBILITY.PUBLIC, VISIBILITY.UNLISTED, VISIBILITY.MEMBERS_ONLY, VISIBILITY.PRIVATE];

    return mutateJsonFile(this.postsFile, POST_FALLBACK, async posts => {
      if (!Array.isArray(posts)) throw new TypeError('Community posts data must be an array.');
      const index = posts.findIndex(post => post.id === id);
      if (index < 0) throw new RepositoryContractError('community_post_not_found', 'Community post not found.', 404);

      const current = posts[index];
      if (current.ownerUserId !== actor.userId) {
        throw new RepositoryContractError('community_post_forbidden', 'You do not have permission to edit this post.', 403);
      }
      if (presentation.expectedPostTemplateVersionId !== undefined
        && current.templateVersionId !== presentation.expectedPostTemplateVersionId) {
        throw new RepositoryContractError('template_version_conflict', 'Template changed. Reload its settings before saving.', 409);
      }

      const next = {
        ...current,
        title: typeof presentation.title === 'string' && presentation.title.trim() ? presentation.title.trim() : current.title,
        description: typeof presentation.description === 'string' ? presentation.description.trim() : current.description,
        customTags: presentation.customTags === undefined ? current.customTags : normalizeStringArray(presentation.customTags),
        visibility: presentation.visibility === undefined
          ? current.visibility
          : pickAllowedValue(presentation.visibility, allowedVisibility, current.visibility),
        promptVisibility: presentation.promptVisibility === undefined
          ? current.promptVisibility
          : pickAllowedValue(
            presentation.promptVisibility,
            ['full', 'partial', 'remix_only', 'private'],
            current.promptVisibility
          ),
        templatePricing: presentation.templatePricing === undefined
          ? current.templatePricing
          : structuredClone(presentation.templatePricing),
        templateVersionId: presentation.templateVersionId === undefined
          ? current.templateVersionId : presentation.templateVersionId,
        sharedPromptSnapshot: presentation.sharedPromptSnapshot === undefined
          ? current.sharedPromptSnapshot
          : stripEmbeddedBase64(presentation.sharedPromptSnapshot),
        sceneTemplateSnapshot: presentation.sceneTemplateSnapshot === undefined
          ? current.sceneTemplateSnapshot
          : stripEmbeddedBase64(presentation.sceneTemplateSnapshot),
        updatedAt: new Date().toISOString()
      };
      posts[index] = next;
      return normalizeCommunityPostRecord(next, this.userRepository);
    });
  }

  async activatePreparedTemplateByVersion(templateId, templateVersionId, actorContext) {
    const actor = assertActorContext(actorContext);
    return mutateJsonFile(this.postsFile, POST_FALLBACK, async posts => {
      if (!Array.isArray(posts)) throw new TypeError('Community posts data must be an array.');
      const index = posts.findIndex(post => (
        post.templateId === templateId
        && post.templateVersionId === templateVersionId
        && post.ownerUserId === actor.userId
      ));
      if (index < 0) {
        throw new RepositoryContractError(
          'community_template_setup_not_found',
          'Owned Template setup was not found.',
          404
        );
      }
      const current = posts[index];
      if (current.status === 'published') {
        return normalizeCommunityPostRecord(current, this.userRepository);
      }
      if (current.status !== 'draft') {
        throw new RepositoryContractError(
          'community_template_setup_not_activatable',
          'This Template setup cannot be published from its current state.',
          409
        );
      }
      const next = {
        ...current,
        status: 'published',
        publishedAt: current.publishedAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      posts[index] = next;
      return normalizeCommunityPostRecord(next, this.userRepository);
    });
  }

  async setModerationStatus(id, action, reason, actorContext) {
    const actor = assertActorContext(actorContext);
    if (!['admin', 'support'].includes(actor.role)) {
      throw new RepositoryContractError('community_moderation_forbidden', 'Only admin or support can moderate a post.', 403);
    }
    const status = action === 'hide' ? 'hidden' : action === 'remove' ? 'removed' : null;
    if (!status) throw new RepositoryContractError('community_moderation_action_invalid', 'Moderation action must be hide or remove.');

    return mutateJsonFile(this.postsFile, POST_FALLBACK, async posts => {
      if (!Array.isArray(posts)) throw new TypeError('Community posts data must be an array.');
      const index = posts.findIndex(post => post.id === id);
      if (index < 0) throw new RepositoryContractError('community_post_not_found', 'Community post not found.', 404);
      const current = posts[index];
      const next = {
        ...current,
        status,
        moderation: {
          action,
          reason: String(reason).trim(),
          actorUserId: actor.userId,
          moderatedAt: new Date().toISOString()
        },
        updatedAt: new Date().toISOString()
      };
      posts[index] = next;
      return normalizeCommunityPostRecord(next, this.userRepository);
    });
  }

  async markReported(id) {
    return mutateJsonFile(this.postsFile, POST_FALLBACK, async posts => {
      if (!Array.isArray(posts)) throw new TypeError('Community posts data must be an array.');
      const index = posts.findIndex(post => post.id === id);
      if (index < 0) {
        throw new RepositoryContractError('community_post_not_found', 'Community post not found.', 404);
      }
      if (!['active', 'published', 'reported'].includes(posts[index].status)) {
        return normalizeCommunityPostRecord(posts[index], this.userRepository);
      }
      if (posts[index].status === 'reported') {
        return normalizeCommunityPostRecord(posts[index], this.userRepository);
      }
      const next = {
        ...posts[index],
        status: 'reported',
        reportedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      posts[index] = next;
      return normalizeCommunityPostRecord(next, this.userRepository);
    });
  }

  async unpublishByOwner(id, actorContext) {
    const actor = assertActorContext(actorContext);
    return mutateJsonFile(this.postsFile, POST_FALLBACK, async posts => {
      if (!Array.isArray(posts)) throw new TypeError('Community posts data must be an array.');
      const index = posts.findIndex(post => post.id === id);
      if (index < 0) throw new RepositoryContractError('community_post_not_found', 'Community post not found.', 404);
      if (posts[index].ownerUserId !== actor.userId) {
        throw new RepositoryContractError('community_post_forbidden', 'You do not have permission to unpublish this post.', 403);
      }
      const next = {
        ...posts[index],
        status: 'owner_unpublished',
        visibility: VISIBILITY.PRIVATE,
        updatedAt: new Date().toISOString()
      };
      posts[index] = next;
      return normalizeCommunityPostRecord(next, this.userRepository);
    });
  }

  async updateTaxonomyById(id, taxonomy = {}, actorContext) {
    const actor = assertActorContext(actorContext);
    if (!['admin', 'support'].includes(actor.role)) {
      throw new RepositoryContractError(
        'community_taxonomy_forbidden',
        'Only admin or support can correct published taxonomy.',
        403
      );
    }

    return mutateJsonFile(this.postsFile, POST_FALLBACK, async posts => {
      if (!Array.isArray(posts)) throw new TypeError('Community posts data must be an array.');
      const index = posts.findIndex(post => post.id === id);
      if (index < 0) throw new RepositoryContractError('community_post_not_found', 'Community post not found.', 404);
      const next = {
        ...posts[index],
        taxonomyVersion: typeof taxonomy.taxonomyVersion === 'string'
          ? taxonomy.taxonomyVersion
          : posts[index].taxonomyVersion,
        taxonomyAssignments: normalizeTaxonomyAssignments(taxonomy.taxonomyAssignments),
        officialTags: normalizeStringArray(taxonomy.officialTags),
        customTags: normalizeStringArray(taxonomy.customTags),
        categoryCodes: normalizeStringArray(taxonomy.categoryCodes),
        trendingCategoryCodes: normalizeStringArray(taxonomy.trendingCategoryCodes),
        taxonomyReviewStatus: taxonomy.taxonomyReviewStatus || 'admin_confirmed',
        taxonomyConfidence: Number.isFinite(Number(taxonomy.taxonomyConfidence))
          ? Math.min(1, Math.max(0, Number(taxonomy.taxonomyConfidence)))
          : 1,
        updatedAt: new Date().toISOString()
      };
      posts[index] = next;
      return normalizeCommunityPostRecord(next, this.userRepository);
    });
  }

  async updateEngagementSummary(id, engagementSummary = {}) {
    return mutateJsonFile(this.postsFile, POST_FALLBACK, async posts => {
      if (!Array.isArray(posts)) throw new TypeError('Community posts data must be an array.');
      const index = posts.findIndex(post => post.id === id);
      if (index < 0) {
        throw new RepositoryContractError('community_post_not_found', 'Community post not found.', 404);
      }
      const updatedAt = engagementSummary.updatedAt || new Date().toISOString();
      const next = {
        ...posts[index],
        engagementSummary: {
          viewCount: nonNegativeCount(engagementSummary.viewCount),
          likeCount: nonNegativeCount(engagementSummary.likeCount),
          saveCount: nonNegativeCount(engagementSummary.saveCount),
          commentCount: nonNegativeCount(engagementSummary.commentCount),
          remixSuccessCount: nonNegativeCount(engagementSummary.remixSuccessCount),
          comparisonVoteCount: nonNegativeCount(engagementSummary.comparisonVoteCount),
          updatedAt
        },
        counts: {
          ...(posts[index].counts || {}),
          views: nonNegativeCount(engagementSummary.viewCount),
          likes: nonNegativeCount(engagementSummary.likeCount),
          saves: nonNegativeCount(engagementSummary.saveCount),
          comments: nonNegativeCount(engagementSummary.commentCount),
          remixes: nonNegativeCount(engagementSummary.remixSuccessCount),
          votes: nonNegativeCount(engagementSummary.comparisonVoteCount)
        },
        updatedAt
      };
      posts[index] = next;
      return normalizeCommunityPostRecord(next, this.userRepository);
    });
  }
}

function toPage(posts, limit, scope, secret, sort) {
  const items = posts.slice(0, limit);
  const hasMore = posts.length > limit;
  const last = items.at(-1);
  const nextCursor = hasMore && last
    ? encodeRepositoryCursor({ id: last.id, createdAt: last.createdAt, updatedAt: last.updatedAt }, scope, secret)
    : null;
  return createPage(items, { nextCursor, hasMore, totalApprox: posts.length });
}

function comparePosts(left, right, sort) {
  const field = sort === 'updated' ? 'updatedAt' : 'createdAt';
  const leftTime = Date.parse(left?.[field] || '') || 0;
  const rightTime = Date.parse(right?.[field] || '') || 0;
  const difference = sort === 'oldest' ? leftTime - rightTime : rightTime - leftTime;
  if (difference !== 0) return difference;
  return sort === 'oldest'
    ? String(left?.id || '').localeCompare(String(right?.id || ''))
    : String(right?.id || '').localeCompare(String(left?.id || ''));
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(item => typeof item === 'string').map(item => item.trim()).filter(Boolean))];
}

function normalizeTaxonomyAssignments(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter(item => item && typeof item === 'object' && typeof item.tagId === 'string')
    .map(item => ({
      tagId: item.tagId.trim(),
      dimensionId: typeof item.dimensionId === 'string' ? item.dimensionId.trim() : '',
      confidence: Number.isFinite(Number(item.confidence))
        ? Math.min(1, Math.max(0, Number(item.confidence)))
        : 0,
      confidenceLevel: ['high', 'medium', 'low'].includes(item.confidenceLevel)
        ? item.confidenceLevel
        : 'low',
      sources: normalizeStringArray(item.sources),
      status: typeof item.status === 'string' ? item.status : 'confirmed',
      categoryEligible: item.categoryEligible === true,
      trendingEligible: item.trendingEligible === true
    }))
    .filter(item => item.tagId && item.dimensionId);
}

function taxonomyCodesForQuery(post, sort) {
  if (sort === 'trending') return normalizeStringArray(post.trendingCategoryCodes);
  return normalizeStringArray(post.categoryCodes?.length ? post.categoryCodes : post.officialTags);
}

function communityPostMatchesSearch(post, query) {
  const needle = normalizeSearchTerm(query);
  if (!needle) return true;
  return [
    post.title,
    post.description,
    ...normalizeStringArray(post.customTags),
    ...normalizeStringArray(post.officialTags)
  ].some(value => normalizeSearchTerm(value).includes(needle));
}

function sameSearchTerm(left, right) {
  return normalizeSearchTerm(left) === normalizeSearchTerm(right);
}

function normalizeSearchTerm(value) {
  return typeof value === 'string' ? value.trim().toLocaleLowerCase('en-US') : '';
}

function nonNegativeCount(value) {
  return Number.isFinite(Number(value)) ? Math.max(0, Math.trunc(Number(value))) : 0;
}

function isVisiblePublicPost(post) {
  return post.visibility === VISIBILITY.PUBLIC
    && ['active', 'published', 'reported'].includes(post.status);
}

export const communityPostRepo = new CommunityPostRepository();

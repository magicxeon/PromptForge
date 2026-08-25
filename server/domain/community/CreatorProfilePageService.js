import {
  assertActorContext,
  RepositoryContractError
} from '../../repositories/repositoryContracts.js';
import { creatorProfileRepo } from '../../repositories/community/CreatorProfileRepository.js';
import { communityPostRepo } from '../../repositories/community/CommunityPostRepository.js';
import { buildCommunityPostPublicView } from './communityPostPublicView.js';
import { creatorProfileService } from './CreatorProfileService.js';
import { communityGalleryService } from './CommunityGalleryService.js';

const TABS = Object.freeze([
  'overview',
  'gallery',
  'videos',
  'characters',
  'templates',
  'comparisons',
  'collections'
]);

export class CreatorProfilePageService {
  constructor({
    profileRepository = creatorProfileRepo,
    postRepository = communityPostRepo,
    profileService = creatorProfileService,
    galleryService = communityGalleryService
  } = {}) {
    this.profileRepository = profileRepository;
    this.postRepository = postRepository;
    this.profileService = profileService;
    this.galleryService = galleryService;
  }

  async getPage(profileLocator, query = {}, actorContext) {
    const actor = assertActorContext(actorContext);
    const profileRecord = await this.profileRepository.findById?.(profileLocator)
      || await this.profileRepository.findByHandle(profileLocator);
    if (!profileRecord) {
      throw new RepositoryContractError(
        'creator_profile_not_found',
        'Creator profile not found.',
        404
      );
    }

    const selectedTab = normalizeTab(query.tab);
    const limit = Math.min(30, Math.max(1, Number(query.limit) || 18));
    const [publicProfile, allPosts, galleryPreview, characterPreview] = await Promise.all([
      this.profileService.getPublicProfileByHandle(profileRecord.handle, actor),
      this.listCreatorPosts(profileRecord.userId, actor),
      this.galleryService.listGalleryByHandle(profileRecord.handle, { limit: 8 }, actor),
      this.galleryService.listCharactersByHandle(profileRecord.handle, { limit: 8 }, actor)
    ]);
    const postTypeCounts = countPostTypes(allPosts);
    const tabData = await this.loadTab(
      selectedTab,
      profileRecord,
      allPosts,
      { limit, cursor: query.cursor || null },
      actor
    );
    const overview = selectedTab === 'overview'
      ? this.buildOverview(profileRecord, allPosts, galleryPreview, characterPreview)
      : null;
    const presentation = publicProfile.presentation || {};
    const coverPost = selectEligiblePost(allPosts, presentation.coverPostId)
      || selectEligiblePost(allPosts, presentation.featuredPostIds?.[0])
      || allPosts.find(post => post.imageUrl || post.thumbnailUrl)
      || null;

    return {
      schemaVersion: 1,
      profile: {
        id: publicProfile.id,
        handle: publicProfile.handle,
        displayName: publicProfile.displayName,
        bio: publicProfile.bio,
        profileTheme: presentation.profileTheme || 'default',
        headline: presentation.headline || null,
        avatarUrl: null,
        coverImageUrl: coverPost?.imageUrl || coverPost?.thumbnailUrl || null,
        creatorRoles: [...(presentation.creatorRoles || [])],
        locationText: presentation.locationText || null,
        websiteUrl: presentation.websiteUrl || null,
        languageCodes: [...(presentation.languageCodes || [])],
        contentCategoryCodes: [...(presentation.contentCategoryCodes || [])],
        badgeCodes: [...(publicProfile.badgeCodes || [])],
        createdAt: publicProfile.createdAt
      },
      viewer: {
        isOwner: publicProfile.viewer.isOwner,
        isFollowing: publicProfile.viewer.isFollowing,
        canEditProfile: publicProfile.viewer.isOwner,
        canManageContent: publicProfile.viewer.isOwner,
        canFollow: !publicProfile.viewer.isOwner,
        canReport: !publicProfile.viewer.isOwner
      },
      counts: {
        followers: Number(publicProfile.followerCount) || 0,
        following: Number(publicProfile.followingCount) || 0,
        publicPosts: Number(publicProfile.publicPostCount) || allPosts.length,
        publicCharacters: Number(characterPreview.totalApprox)
          || Number(tabData?.kind === 'characters' ? tabData.page?.totalApprox : 0)
          || Number(overview?.characters?.items?.length)
          || 0,
        gallery: Number(galleryPreview.totalApprox)
          || Number(tabData?.kind === 'gallery' ? tabData.page?.totalApprox : 0)
          || 0,
        videos: postTypeCounts.video,
        templates: postTypeCounts.template,
        comparisons: postTypeCounts.comparison,
        collections: postTypeCounts.collection
      },
      statistics: aggregateStatistics(allPosts),
      capabilities: {
        availableTabs: [...TABS],
        defaultTab: 'overview',
        managementAvailable: publicProfile.viewer.isOwner
      },
      selectedTab,
      tabData,
      overview,
      management: publicProfile.viewer.isOwner
        ? {
          recordVersion: publicProfile.recordVersion,
          presentation: structuredClone(presentation)
        }
        : null
    };
  }

  async listCreatorPosts(ownerUserId, actor) {
    const page = actor.userId === ownerUserId
      ? await this.postRepository.findByOwner(ownerUserId, {
        limit: 50,
        sort: 'newest'
      })
      : await this.postRepository.listPublic({
        limit: 50,
        sort: 'newest',
        filters: { ownerUserId }
      }, actor);
    return page.items.map(buildCommunityPostPublicView);
  }

  async loadTab(tab, profile, allPosts, query, actor) {
    if (tab === 'overview') return { kind: 'overview' };
    if (tab === 'gallery') {
      return {
        kind: 'gallery',
        page: await this.galleryService.listGalleryByHandle(profile.handle, query, actor)
      };
    }
    if (tab === 'characters') {
      return {
        kind: 'characters',
        page: await this.galleryService.listCharactersByHandle(profile.handle, query, actor)
      };
    }
    if (tab === 'videos') {
      const items = allPosts.filter(post => post.postType === 'video');
      return {
        kind: 'videos',
        page: {
          items: items.slice(0, query.limit),
          nextCursor: null,
          hasMore: items.length > query.limit,
          totalApprox: items.length
        }
      };
    }
    const postType = {
      templates: 'template',
      comparisons: 'comparison',
      collections: 'collection'
    }[tab];
    const items = allPosts.filter(post => post.postType === postType);
    return {
      kind: tab,
      page: {
        items: items.slice(0, query.limit),
        nextCursor: null,
        hasMore: items.length > query.limit,
        totalApprox: items.length
      }
    };
  }

  buildOverview(profile, allPosts, gallery, characters) {
    const presentation = profile.presentation || {};
    const featured = selectFeatured(
      allPosts,
      presentation.featuredPostIds,
      4
    );
    const templates = selectFeatured(
      allPosts.filter(post => post.postType === 'template'),
      presentation.featuredTemplatePostIds,
      4
    );
    const featuredCharacters = selectFeaturedById(
      characters.items,
      presentation.featuredCharacterProfileIds,
      4
    );
    const videos = selectFeatured(
      allPosts.filter(post => post.postType === 'video'),
      presentation.featuredVideoPostIds,
      4
    );
    return {
      sectionOrder: normalizeSectionOrder(presentation.sectionOrder),
      featured: { items: featured },
      gallery: { items: gallery.items.slice(0, 6) },
      videos: { items: videos },
      characters: { items: featuredCharacters },
      templates: { items: templates },
      comparisons: {
        items: allPosts.filter(post => post.postType === 'comparison').slice(0, 2)
      },
      latestCollection: allPosts.find(post => post.postType === 'collection') || null
    };
  }
}

function normalizeTab(value) {
  return TABS.includes(value) ? value : 'overview';
}

function selectEligiblePost(posts, postId) {
  return postId ? posts.find(post => post.id === postId) || null : null;
}

function selectFeatured(items, preferredIds = [], limit = 4) {
  const byId = new Map(items.map(item => [item.id, item]));
  const preferred = (Array.isArray(preferredIds) ? preferredIds : [])
    .map(id => byId.get(id))
    .filter(Boolean);
  return uniqueById([...preferred, ...items]).slice(0, limit);
}

function selectFeaturedById(items, preferredIds = [], limit = 4) {
  return selectFeatured(items, preferredIds, limit);
}

function uniqueById(items) {
  const seen = new Set();
  return items.filter(item => {
    if (!item?.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function normalizeSectionOrder(value) {
  const defaults = ['featured', 'characters', 'templates', 'comparisons'];
  const selected = Array.isArray(value)
    ? [...new Set(value.filter(item => defaults.includes(item)))]
    : [];
  return [...selected, ...defaults.filter(item => !selected.includes(item))];
}

function countPostTypes(posts) {
  const counts = { image: 0, video: 0, template: 0, comparison: 0, collection: 0 };
  posts.forEach(post => {
    if (Object.hasOwn(counts, post.postType)) counts[post.postType] += 1;
  });
  return counts;
}

function aggregateStatistics(posts) {
  return posts.reduce((stats, post) => {
    const summary = post.engagementSummary || {};
    stats.likes += Number(summary.likeCount) || 0;
    stats.uses += Number(summary.remixSuccessCount) || 0;
    stats.remixes += Number(summary.remixSuccessCount) || 0;
    stats.votes += Number(summary.comparisonVoteCount) || 0;
    return stats;
  }, {
    likes: 0,
    uses: 0,
    remixes: 0,
    votes: 0,
    updatedAt: new Date().toISOString()
  });
}

export const creatorProfilePageService = new CreatorProfilePageService();

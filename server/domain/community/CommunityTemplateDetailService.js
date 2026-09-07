import { assertActorContext, RepositoryContractError } from '../../repositories/repositoryContracts.js';
import { encodeRepositoryCursor, decodeRepositoryCursor } from '../../repositories/RepositoryCursor.js';
import { assertCanViewCommunityPost, isCommunityPostFeedVisible } from './communityPostPolicy.js';
import { buildCommunityPostPublicView } from './communityPostPublicView.js';

const emptyPage = () => ({ template: null, items: [], nextCursor: null, hasMore: false });
const visible = post => Boolean(post && !post.deletedAt && isCommunityPostFeedVisible(post));

export class CommunityTemplateDetailService {
  constructor({ postRepository, generationRepository }) {
    this.postRepository = postRepository;
    this.generationRepository = generationRepository;
  }

  async getPreviews(query = {}, actorContext) {
    assertActorContext(actorContext);
    const ids = typeof query.postIds === 'string' ? query.postIds.split(',') : [];
    if (!ids.length || ids.length > 24 || ids.some(id => !/^[a-zA-Z0-9_-]{1,160}$/.test(id))) {
      throw new RepositoryContractError('template_preview_query_invalid', 'Choose between 1 and 24 Template post IDs.');
    }
    const { candidates, generations, roots } = await this.readFamilySnapshot();
    return { items: [...new Set(ids)].flatMap(id => {
      const root = roots.find(post => post.id === id);
      if (!root) return [];
      const matches = familyMatches(root, candidates, generations, roots, 'likes');
      return [{ templatePostId: id, items: matches.slice(0, 3).map(item => buildTemplatePreviewView(item.post)), hasMore: matches.length > 3 }];
    }) };
  }

  async readFamilySnapshot(source) {
    const posts = (await this.postRepository.readAll()).filter(visible);
    const candidates = posts.filter(post => post.postType === 'image');
    const ids = [...new Set([...(source ? [source] : []), ...candidates].map(generationId).filter(Boolean))];
    const generations = new Map((await this.generationRepository.findByIds(ids)).map(item => [item.id, item]));
    return { candidates, generations, roots: posts.filter(post => post.postType === 'template') };
  }

  async getForPost(postId, query = {}, actorContext) {
    const actor = assertActorContext(actorContext);
    const sort = query.sort || 'likes';
    const limit = query.limit === undefined ? 12 : Number(query.limit);
    if (!['likes', 'latest'].includes(sort) || !Number.isInteger(limit) || limit < 1 || limit > 24) {
      throw new RepositoryContractError('template_detail_query_invalid', 'Choose likes or latest and a page size from 1 to 24.');
    }
    const source = await this.postRepository.findById(postId);
    assertCanViewCommunityPost(source, actor, { directLink: true });
    if (source.deletedAt || !['image', 'template'].includes(source.postType)) return emptyPage();

    const { candidates, generations, roots } = await this.readFamilySnapshot(source);
    const root = source.postType === 'template'
      ? roots.find(post => post.id === source.id)
      : resolveRoot(source, generations.get(generationId(source)), roots);
    if (!root) return emptyPage();

    const scope = JSON.stringify({ kind: 'template-creations-v1', postId: root.id, templateId: root.templateId || null, actor: actor.userId, sort });
    const cursor = query.cursor ? decodeRepositoryCursor(query.cursor, scope) : null;
    const compare = (left, right) => compareCreations(left, right, sort);
    let matches = familyMatches(root, candidates, generations, roots, sort);
    if (cursor) matches = matches.filter(item => compare(item, cursor) > 0);
    const selected = matches.slice(0, limit);
    const last = selected.at(-1);
    const hasMore = matches.length > limit;
    return {
      template: buildCommunityPostPublicView(root),
      items: selected.map(item => buildCommunityPostPublicView(item.post)),
      nextCursor: hasMore && last ? encodeRepositoryCursor({ id: last.id, createdAt: last.createdAt, likeCount: last.likeCount }, scope) : null,
      hasMore
    };
  }
}

function buildTemplatePreviewView(post) {
  const view = buildCommunityPostPublicView(post);
  // Gallery hydration never needs prompt text, even when a post shares it publicly.
  delete view.promptPreview;
  return view;
}

function familyMatches(root, candidates, generations, roots, sort) {
  return candidates.filter(post => {
    if (post.id === root.id) return false;
    const origin = resolveRoot(post, generations.get(generationId(post)), roots);
    return origin && (root.templateId ? origin.templateId === root.templateId : origin.id === root.id);
  }).map(post => ({ post, id: post.id, createdAt: post.createdAt,
    likeCount: safeCount(post.engagementSummary?.likeCount ?? post.counts?.likes) }))
    .sort((left, right) => compareCreations(left, right, sort));
}

function generationId(post) {
  return post.sourceGenerationResultId || post.sourceGenerationId || null;
}

function resolveRoot(post, generation, roots) {
  if (!generation || generation.status !== 'completed' || generation.deletedAt || generation.ownerUserId !== post.ownerUserId) return null;
  const context = generation.templateUseContext;
  if (!context || typeof context.templateId !== 'string' || !context.templateId || typeof context.templateVersionId !== 'string' || !context.templateVersionId) return null;
  if (context.sourceCommunityPostId) {
    return roots.find(root => root.id === context.sourceCommunityPostId && root.templateId === context.templateId) || null;
  }
  return roots.filter(root => root.templateId === context.templateId)
    .sort((a, b) => compareCreations(a, b, 'latest'))[0] || null;
}

function compareCreations(left, right, sort) {
  return (sort === 'likes' ? safeCount(right.likeCount) - safeCount(left.likeCount) : 0)
    || (Date.parse(right.createdAt || '') || 0) - (Date.parse(left.createdAt || '') || 0)
    || String(right.id).localeCompare(String(left.id));
}

function safeCount(value) {
  return Number.isFinite(Number(value)) ? Math.max(0, Math.trunc(Number(value))) : 0;
}

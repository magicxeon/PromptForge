import { apiRequest } from '../../../lib/api/apiClient';
import {
  commentPageSchema,
  communityFeedPageSchema,
  communityPostSchema,
  createCommentResponseSchema,
  deleteCommentResponseSchema,
  engagementResponseSchema,
  reactionResponseSchema,
  templateHandoffSchema,
  templateDetailPageSchema,
  templatePreviewsSchema
} from '../schemas/communitySchemas';

export type CommunityFilters = {
  sort: 'latest' | 'trending';
  period: 'week' | 'month' | 'year';
  postType: 'all' | 'image' | 'video' | 'template' | 'comparison' | 'collection';
  officialTag: string;
  search: string;
};

export function listCommunityPosts(filters: CommunityFilters, cursor?: string | null) {
  const query = new URLSearchParams({
    sort: filters.sort,
    period: filters.period,
    postType: filters.postType,
    limit: '18'
  });
  if (filters.search) query.set('search', filters.search);
  if (filters.officialTag) query.set('officialTag', filters.officialTag);
  if (cursor) query.set('cursor', cursor);
  return apiRequest(`/api/community/posts?${query}`, { schema: communityFeedPageSchema });
}

export function getCommunityPost(postId: string) {
  return apiRequest(`/api/scene-templates/shared/${encodeURIComponent(postId)}`, {
    schema: communityPostSchema
  });
}

export function getTemplateDetail(postId: string, sort: 'likes' | 'latest' = 'likes', limit = 12, cursor?: string | null) {
  const query = new URLSearchParams({ sort, limit: String(limit) });
  if (cursor) query.set('cursor', cursor);
  return apiRequest(`/api/community/posts/${encodeURIComponent(postId)}/template-detail?${query}`, { schema: templateDetailPageSchema });
}

export function getTemplatePreviews(postIds: string[]) {
  const query = new URLSearchParams({ postIds: postIds.join(',') });
  return apiRequest(`/api/community/template-previews?${query}`, { schema: templatePreviewsSchema });
}

export function updateCommunityPostPresentation(
  postId: string,
  input: {
    title: string;
    description: string;
    customTags: string[];
    visibility: 'public' | 'unlisted' | 'private';
    promptVisibility?: 'full' | 'remix_only';
    templateAccessCredits?: number;
    templateInputOptions?: { characterEnabled: boolean; outfitBackEnabled: boolean };
    expectedTemplateVersionId?: string;
  }
) {
  return apiRequest(`/api/scene-templates/shared/${encodeURIComponent(postId)}`, {
    method: 'PATCH',
    body: input,
    schema: communityPostSchema
  });
}

export function retireCommunityPost(postId: string) {
  return apiRequest(`/api/community/posts/${encodeURIComponent(postId)}`, {
    method: 'DELETE',
    schema: communityPostSchema
  });
}

export function recordCommunityView(postId: string) {
  return apiRequest(`/api/community/posts/${encodeURIComponent(postId)}/views`, {
    method: 'POST',
    body: {}
  });
}

export function getCommunityEngagement(postId: string) {
  return apiRequest(`/api/community/posts/${encodeURIComponent(postId)}/engagement`, {
    schema: engagementResponseSchema
  });
}

export function setCommunityReaction(
  postId: string,
  reaction: 'like' | 'save',
  active: boolean
) {
  return apiRequest(`/api/community/posts/${encodeURIComponent(postId)}/reactions/${reaction}`, {
    method: active ? 'PUT' : 'DELETE',
    schema: reactionResponseSchema
  });
}

export function setCommunityComparisonVote(postId: string, comparisonSlotId: string) {
  return apiRequest(`/api/community/posts/${encodeURIComponent(postId)}/comparison-vote`, {
    method: 'PUT',
    body: { comparisonSlotId },
    schema: engagementResponseSchema
  });
}

export function removeCommunityComparisonVote(postId: string) {
  return apiRequest(`/api/community/posts/${encodeURIComponent(postId)}/comparison-vote`, {
    method: 'DELETE',
    schema: engagementResponseSchema
  });
}

export function listCommunityComments(postId: string, cursor?: string | null) {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
  return apiRequest(`/api/community/posts/${encodeURIComponent(postId)}/comments${query}`, {
    schema: commentPageSchema
  });
}

export function createCommunityComment(postId: string, body: string) {
  return apiRequest(`/api/community/posts/${encodeURIComponent(postId)}/comments`, {
    method: 'POST',
    body: { body },
    schema: createCommentResponseSchema
  });
}

export function deleteCommunityComment(postId: string, commentId: string) {
  return apiRequest(
    `/api/community/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}`,
    { method: 'DELETE', schema: deleteCommentResponseSchema }
  );
}

export function requestCommunityTemplateHandoff(postId: string) {
  return apiRequest(`/api/scene-templates/shared/${encodeURIComponent(postId)}/use-template`, {
    method: 'POST',
    body: {},
    schema: templateHandoffSchema
  });
}

import { describe, expect, it } from 'vitest';
import type { CommunityPost } from '../../community/schemas/communitySchemas';
import { filterFashionReadyCommunityTemplates } from './fashionTemplateDiscovery';

function post(id: string, templateId: string | null): CommunityPost {
  return {
    id,
    postType: 'template',
    mediaType: 'image',
    creator: { displayName: 'Creator' },
    title: id,
    description: '',
    visibility: 'public',
    presentationUrls: {},
    officialTags: [],
    customTags: [],
    promptVisibility: 'hidden',
    generationMetadata: {},
    remixAvailability: true,
    templateAvailability: true,
    templateId,
    templatePricing: null,
    faceReuseAvailability: false,
    characterAttributions: [],
    comparisonSnapshot: null,
    collectionSnapshot: null,
    engagementSummary: {
      viewCount: 0,
      likeCount: 0,
      saveCount: 0,
      commentCount: 0,
      remixSuccessCount: 0,
      comparisonVoteCount: 0
    }
  };
}

describe('Fashion Template discovery', () => {
  it('exposes only Community cards backed by a Fashion-ready canonical Template', () => {
    const result = filterFashionReadyCommunityTemplates([
      post('ready-post', 'tmpl_ready'),
      post('preparing-post', 'tmpl_processing'),
      post('legacy-post', null)
    ], ['tmpl_ready']);

    expect(result.map(item => item.id)).toEqual(['ready-post']);
  });
});

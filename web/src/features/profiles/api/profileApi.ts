import { apiRequest } from '../../../lib/api/apiClient';
import { getOwnCreatorProfileLocator } from '../../../lib/auth/creatorProfileLocator';
import {
  characterDetailSchema,
  characterDirectorySchema,
  characterHandoffSchema,
  ownerCharacterDetailSchema,
  characterWorksSchema,
  characterFeaturedImageCandidatesSchema,
  characterFeaturedImageUpdateSchema,
  characterLookGenerationPlanSchema,
  characterLookSchema,
  characterLooksResponseSchema,
  creatorPageSchema,
  followResponseSchema
} from '../schemas/profileSchemas';

export function getMyCreatorProfile() {
  return getOwnCreatorProfileLocator();
}

export function getCreatorPage(handle: string, tab: string) {
  const query = new URLSearchParams({ tab, limit: '18' });
  return apiRequest(`/api/community/creators/${encodeURIComponent(handle)}/page?${query}`, {
    schema: creatorPageSchema
  });
}

export function setCreatorFollow(profileId: string, active: boolean) {
  return apiRequest(`/api/community/creators/${encodeURIComponent(profileId)}/follow`, {
    method: active ? 'POST' : 'DELETE',
    schema: followResponseSchema
  });
}

export function listCharacters(filters: Record<string, string>) {
  const query = new URLSearchParams(filters);
  if (!query.has('limit')) query.set('limit', '24');
  return apiRequest(`/api/community/characters?${query}`, { schema: characterDirectorySchema });
}

export function getCharacter(characterId: string) {
  return apiRequest(`/api/community/characters/${encodeURIComponent(characterId)}`, {
    schema: characterDetailSchema
  });
}

export function getOwnedCharacter(characterId: string) {
  return apiRequest(`/api/character-profiles/${encodeURIComponent(characterId)}`, {
    schema: ownerCharacterDetailSchema
  });
}

export function listOwnedCharacters(cursor?: string | null, filters: Record<string, string> = {}) {
  const query = new URLSearchParams(filters);
  if (!query.has('limit')) query.set('limit', '24');
  if (cursor) query.set('cursor', cursor);
  return apiRequest(`/api/character-profiles?${query}`, {
    schema: characterDirectorySchema
  });
}

export function listCharacterLooks(characterProfileId: string, characterProfileVersionId: string) {
  const query = new URLSearchParams({ characterProfileVersionId });
  return apiRequest(`/api/character-profiles/${encodeURIComponent(characterProfileId)}/looks?${query}`, {
    schema: characterLooksResponseSchema
  });
}

export function getCharacterLookGenerationPlan(
  characterProfileId: string,
  lookId: string,
  versionId: string
) {
  return apiRequest(
    `/api/character-profiles/${encodeURIComponent(characterProfileId)}/looks/${encodeURIComponent(lookId)}/versions/${encodeURIComponent(versionId)}/generation-plan`,
    { schema: characterLookGenerationPlanSchema }
  );
}

export function reviewGeneratedCharacterLookVersion(
  characterProfileId: string,
  lookId: string,
  versionId: string,
  generationResultId: string
) {
  return apiRequest(
    `/api/character-profiles/${encodeURIComponent(characterProfileId)}/looks/${encodeURIComponent(lookId)}/versions/${encodeURIComponent(versionId)}/generated-review`,
    {
      method: 'POST',
      body: { generationResultId },
      schema: characterLookSchema
    }
  );
}

export function createCharacterLookDraft(characterProfileId: string, input: {
  characterProfileVersionId: string;
  name: string;
  description?: string;
  sourceMode: 'character_default' | 'uploaded' | 'uploaded_character_sheet' | 'ai_suggestion';
  garmentAuthorities?: Record<string, Record<string, string>>;
  sourceSheetAssetId?: string | null;
  suggestionSnapshot?: Record<string, unknown> | null;
  idempotencyKey: string;
}) {
  return apiRequest(`/api/character-profiles/${encodeURIComponent(characterProfileId)}/looks`, {
    method: 'POST', body: input, schema: characterLookSchema
  });
}

export function reviewCharacterLookVersion(
  characterProfileId: string,
  lookId: string,
  versionId: string,
  input: {
    viewAssetIds?: Record<string, string>;
    sheetAssetId?: string;
    cropManifest?: {
      layoutVersion: string;
      regions: Record<string, { x: number; y: number; width: number; height: number }>;
    };
    rightsDeclarationAccepted?: boolean;
  }
) {
  return apiRequest(
    `/api/character-profiles/${encodeURIComponent(characterProfileId)}/looks/${encodeURIComponent(lookId)}/versions/${encodeURIComponent(versionId)}/review`,
    { method: 'POST', body: input, schema: characterLookSchema }
  );
}

export function approveCharacterLookVersion(
  characterProfileId: string,
  lookId: string,
  versionId: string
) {
  return apiRequest(
    `/api/character-profiles/${encodeURIComponent(characterProfileId)}/looks/${encodeURIComponent(lookId)}/versions/${encodeURIComponent(versionId)}/approve`,
    { method: 'POST', schema: characterLookSchema }
  );
}

export function retireCharacterLook(characterProfileId: string, lookId: string) {
  return apiRequest(
    `/api/character-profiles/${encodeURIComponent(characterProfileId)}/looks/${encodeURIComponent(lookId)}/retire`,
    { method: 'POST', schema: characterLookSchema }
  );
}

export function createCharacterProfile(input: {
  sourceGenerationResultId: string;
  displayName: string;
  shortDescription?: string;
  personalitySummary?: string;
  intendedUses: string[];
  idempotencyKey: string;
}) {
  return apiRequest('/api/character-profiles', {
    method: 'POST',
    body: input,
    schema: ownerCharacterDetailSchema
  });
}

export function updateCharacterMetadata(
  characterId: string,
  input: { displayName?: string; personalitySummary?: string; intendedUses?: string[] }
) {
  return apiRequest(`/api/character-profiles/${encodeURIComponent(characterId)}`, {
    method: 'PATCH',
    body: input
  });
}

export function updateCharacterSharing(
  characterId: string,
  input: {
    visibility: string;
    reusePolicy: string;
    rightsDeclarationAccepted?: boolean;
  }
) {
  return apiRequest(`/api/character-profiles/${encodeURIComponent(characterId)}/sharing`, {
    method: 'POST',
    body: input
  });
}

export function approveCharacterProfile(characterId: string) {
  return apiRequest(`/api/character-profiles/${encodeURIComponent(characterId)}/approve`, {
    method: 'POST',
    body: { consentDeclarationVersion: 'react-character-consent-v1' }
  });
}

export function updateMyCreatorProfile(input: {
  displayName: string;
  bio: string;
  recordVersion: number;
  presentation: {
    profileTheme: 'default' | 'fashion' | 'creative';
    headline: string;
    locationText: string;
    websiteUrl: string;
  };
}) {
  return apiRequest('/api/community/creator-profiles/me', {
    method: 'PATCH',
    body: input
  });
}

export function getCharacterWorks(characterId: string) {
  return apiRequest(`/api/community/characters/${encodeURIComponent(characterId)}/works?limit=12`, {
    schema: characterWorksSchema
  });
}

export function getCharacterFeaturedImageCandidates(characterId: string) {
  return apiRequest(`/api/character-profiles/${encodeURIComponent(characterId)}/featured-image-candidates?limit=36`, {
    schema: characterFeaturedImageCandidatesSchema
  });
}

export function updateCharacterFeaturedImage(
  characterId: string,
  input: {
    mode: 'auto' | 'manual';
    sourceType?: 'generation_result' | 'community_post' | null;
    sourceId?: string | null;
    recordVersion: number;
  }
) {
  return apiRequest(`/api/character-profiles/${encodeURIComponent(characterId)}/featured-image`, {
    method: 'PATCH',
    body: input,
    schema: characterFeaturedImageUpdateSchema
  });
}

export function requestCharacterHandoff(
  characterId: string,
  destination: 'fashion_blueprint' | 'scene_builder'
) {
  return apiRequest(`/api/community/characters/${encodeURIComponent(characterId)}/handoffs`, {
    method: 'POST',
    body: { destination },
    schema: characterHandoffSchema
  });
}

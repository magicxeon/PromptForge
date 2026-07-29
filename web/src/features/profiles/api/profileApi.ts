import { apiRequest } from '../../../lib/api/apiClient';
import {
  characterDetailSchema,
  characterDirectorySchema,
  characterHandoffSchema,
  ownerCharacterDetailSchema,
  characterWorksSchema,
  creatorPageSchema,
  followResponseSchema,
  ownCreatorProfileSchema
} from '../schemas/profileSchemas';

export function getMyCreatorProfile() {
  return apiRequest('/api/community/creator-profiles/me', {
    schema: ownCreatorProfileSchema
  });
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
  query.set('limit', '24');
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
  input: { visibility: string; reusePolicy: string }
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
  displayName?: string;
  headline?: string;
  bio?: string;
  locationText?: string;
  websiteUrl?: string;
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

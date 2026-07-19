import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { resolveDataFile } from './config/paths.js';
import { historyRepository } from './historyRepository.js';
import { sanitizeReferenceSlotsForPublic } from './sceneTemplates/sceneTemplateSanitizer.js';
import { readJsonFile, mutateJsonFile } from './repositories/json/jsonFileStore.js';

const POSTS_FILE = resolveDataFile('communityPosts');
const REMIX_FILE = resolveDataFile('remixEvents');

// In-memory drafts registry
const shareDrafts = new Map();

export class CommunityPostLocalRepository {
  async readAll() {
    return readJsonFile(POSTS_FILE, []);
  }

  async getById(postId) {
    return (await this.readAll()).find(p => p.id === postId) || null;
  }

  async createPost(post) {
    return mutateJsonFile(POSTS_FILE, [], async (posts) => {
      posts.unshift(post);
      return post;
    });
  }
}

export class CommunityRemixLocalRepository {
  async readAll() {
    return readJsonFile(REMIX_FILE, []);
  }

  async recordRemix(event) {
    return mutateJsonFile(REMIX_FILE, [], async (events) => {
      const entry = {
        ...event,
        timestamp: Date.now()
      };
      events.push(entry);
      return entry;
    });
  }
}

export const communityPostRepo = new CommunityPostLocalRepository();
export const communityRemixRepo = new CommunityRemixLocalRepository();

export async function createSceneShareDraft(sourceGenerationId, username) {
  if (!sourceGenerationId) throw new Error('Missing source generation ID');

  const historyItem = await historyRepository.getById(sourceGenerationId);
  if (!historyItem) throw new Error('Source generation result not found');

  // Verify ownership (Phase 8 draft check)
  if ((historyItem.username || 'user_demo') !== username) {
    throw new Error('Unauthorized: You do not own this image reference');
  }

  const snapshot = historyItem.sceneTemplateSnapshot;
  if (!snapshot || typeof snapshot !== 'object') {
    throw new Error('This image was not generated from a scene template');
  }

  // Pre-sanitize face/character reference values using Phase 7 policies for safety
  const viewerContext = { username: 'anonymous_pre_share' }; // force sanitization
  const sanitizedSnapshot = sanitizeReferenceSlotsForPublic(snapshot, viewerContext, username);

  const draftId = 'draft_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
  const draft = {
    id: draftId,
    sourceGenerationId,
    ownerUsername: username,
    imageUrl: historyItem.imageUrl || '',
    thumbnailUrl: historyItem.thumbnailUrl || '',
    sceneTemplateSnapshot: sanitizedSnapshot,
    createdAt: Date.now()
  };

  shareDrafts.set(draftId, draft);
  return draft;
}

export function getShareDraft(draftId) {
  return shareDrafts.get(draftId) || null;
}

export async function publishSceneTemplateShare(draftId, title, description, promptVisibility) {
  const draft = getShareDraft(draftId);
  if (!draft) throw new Error('Draft not found or expired');

  if (!title || !title.trim()) throw new Error('Title is required');
  if (!promptVisibility) throw new Error('Prompt visibility setting is required');

  const snapshot = draft.sceneTemplateSnapshot;
  const isManual = snapshot.authoringMode === 'manual';

  // Server-side Manual Remix-Only Protection Block (High priority validation)
  if (isManual && promptVisibility === 'remix_only') {
    throw new Error('Manual prompts cannot be hidden during remix. Please share as Full Prompt.');
  }

  // Clone snapshot to apply visibility sanitization
  const finalSnapshot = JSON.parse(JSON.stringify(snapshot));
  if (promptVisibility === 'remix_only') {
    finalSnapshot.finalPromptSnapshot = ''; // Strip prompt text completely for Remix Only
  }

  const postId = 'post_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
  const post = {
    id: postId,
    title: title.trim(),
    description: (description || '').trim(),
    promptVisibility,
    imageUrl: draft.imageUrl,
    thumbnailUrl: draft.thumbnailUrl,
    ownerUsername: draft.ownerUsername,
    sceneTemplateSnapshot: finalSnapshot,
    createdAt: Date.now()
  };

  await communityPostRepo.createPost(post);
  shareDrafts.delete(draftId); // Clean up draft
  return post;
}

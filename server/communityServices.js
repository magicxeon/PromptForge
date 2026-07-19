import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { historyRepository } from './historyRepository.js';
import { sanitizeReferenceSlotsForPublic } from './sceneTemplates/sceneTemplateSanitizer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const POSTS_FILE = path.join(__dirname, 'communityPosts.json');
const REMIX_FILE = path.join(__dirname, 'remixEvents.json');

// Safe atomic file-writer with rename
async function safeWriteJson(filePath, data) {
  const tempPath = `${filePath}.${Date.now()}.${Math.random().toString(36).substring(2, 7)}.tmp`;
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf8');

  let retries = 5;
  while (retries > 0) {
    try {
      await fs.rename(tempPath, filePath);
      return;
    } catch (err) {
      if ((err.code === 'EPERM' || err.code === 'EBUSY') && retries > 1) {
        retries--;
        await new Promise(resolve => setTimeout(resolve, 100));
      } else {
        throw err;
      }
    }
  }
}

// In-memory drafts registry
const shareDrafts = new Map();

export class CommunityPostLocalRepository {
  async readAll() {
    try {
      const raw = await fs.readFile(POSTS_FILE, 'utf8');
      return JSON.parse(raw) || [];
    } catch {
      return [];
    }
  }

  async saveAll(posts) {
    await safeWriteJson(POSTS_FILE, posts);
  }

  async getById(postId) {
    return (await this.readAll()).find(p => p.id === postId) || null;
  }

  async createPost(post) {
    const posts = await this.readAll();
    posts.unshift(post);
    await this.saveAll(posts);
    return post;
  }
}

export class CommunityRemixLocalRepository {
  async readAll() {
    try {
      const raw = await fs.readFile(REMIX_FILE, 'utf8');
      return JSON.parse(raw) || [];
    } catch {
      return [];
    }
  }

  async saveAll(events) {
    await safeWriteJson(REMIX_FILE, events);
  }

  async recordRemix(event) {
    const events = await this.readAll();
    events.push({
      ...event,
      timestamp: Date.now()
    });
    await this.saveAll(events);
    return event;
  }
}

export const communityPostRepo = new CommunityPostLocalRepository();
export const communityRemixRepo = new CommunityRemixLocalRepository();

export async function createSceneShareDraft(sourceGenerationId, username) {
  if (!sourceGenerationId) throw new Error('Missing source generation ID');

  const historyItem = await historyRepository.getById(sourceGenerationId);
  if (!historyItem) throw new Error('Source generation result not found');

  // Verify ownership (Phase 8 draft check)
  if (historyItem.username && historyItem.username !== username) {
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

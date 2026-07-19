import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { historyRepository } from '../server/historyRepository.js';
import {
  createSceneShareDraft,
  publishSceneTemplateShare,
  communityPostRepo,
  communityRemixRepo
} from '../server/communityServices.js';

// Setup in-memory stubs for repositories to avoid polluting production json files
const testPosts = [];
const testEvents = [];

communityPostRepo.readAll = async () => testPosts;
communityPostRepo.saveAll = async (posts) => {
  testPosts.length = 0;
  testPosts.push(...posts);
};
communityPostRepo.createPost = async (post) => {
  testPosts.unshift(post);
  return post;
};

communityRemixRepo.readAll = async () => testEvents;
communityRemixRepo.saveAll = async (events) => {
  testEvents.length = 0;
  testEvents.push(...events);
};
communityRemixRepo.recordRemix = async (event) => {
  testEvents.push(event);
  return event;
};

const originalGetById = historyRepository.getById;

test('createSceneShareDraft validates owner and returns draft', async () => {
  historyRepository.getById = async (jobId) => {
    if (jobId === 'job_alice123') {
      return {
        id: 'job_alice123',
        username: 'user_alice',
        imageUrl: '/outputs/job_alice123.png',
        sceneTemplateSnapshot: {
          sceneTemplateVersion: 1,
          authoringMode: 'guided',
          finalPromptSnapshot: 'A beautiful sunset scene',
          replaceableVariables: []
        }
      };
    }
    return null;
  };

  // 1. Correct owner draft creation
  const draft = await createSceneShareDraft('job_alice123', 'user_alice');
  assert.ok(draft);
  assert.equal(draft.ownerUsername, 'user_alice');
  assert.equal(draft.sceneTemplateSnapshot.finalPromptSnapshot, 'A beautiful sunset scene');

  // 2. Mismatch owner creation throws error
  await assert.rejects(
    async () => {
      await createSceneShareDraft('job_alice123', 'user_bob');
    },
    /Unauthorized/
  );

  historyRepository.getById = originalGetById;
});

test('publishSceneTemplateShare blocks manual remix_only and publishes guided remix_only templates', async () => {
  historyRepository.getById = async (jobId) => {
    if (jobId === 'job_manual123') {
      return {
        id: 'job_manual123',
        username: 'user_alice',
        sceneTemplateSnapshot: {
          authoringMode: 'manual',
          finalPromptSnapshot: 'Manual Prompt Text'
        }
      };
    }
    if (jobId === 'job_guided123') {
      return {
        id: 'job_guided123',
        username: 'user_alice',
        sceneTemplateSnapshot: {
          authoringMode: 'guided',
          finalPromptSnapshot: 'Guided Prompt Text'
        }
      };
    }
    return null;
  };

  // 1. Create drafts
  const manualDraft = await createSceneShareDraft('job_manual123', 'user_alice');
  const guidedDraft = await createSceneShareDraft('job_guided123', 'user_alice');

  // 2. Publish manual draft as remix_only -> should throw error (High)
  await assert.rejects(
    async () => {
      await publishSceneTemplateShare(manualDraft.id, 'My Manual Template', 'Desc', 'remix_only');
    },
    /Manual prompts cannot be hidden during remix/
  );

  // 3. Publish guided draft as remix_only -> should succeed and clear prompt
  const post = await publishSceneTemplateShare(guidedDraft.id, 'My Guided Template', 'Desc', 'remix_only');
  assert.ok(post);
  assert.equal(post.title, 'My Guided Template');
  assert.equal(post.promptVisibility, 'remix_only');
  assert.equal(post.sceneTemplateSnapshot.finalPromptSnapshot, ''); // Prompt stripped!

  // Clean up mock posts
  const posts = await communityPostRepo.readAll();
  const filtered = posts.filter(p => p.id !== post.id);
  await communityPostRepo.saveAll(filtered);

  historyRepository.getById = originalGetById;
});

test('communityRemixRepo logs remix events successfully', async () => {
  const event = await communityRemixRepo.recordRemix({
    templateId: 'temp_123',
    sourcePostId: 'post_123',
    username: 'user_bob',
    generatedJobId: 'job_remix_completed'
  });

  assert.ok(event);
  assert.equal(event.templateId, 'temp_123');
  assert.equal(event.generatedJobId, 'job_remix_completed');

  // Clean up
  const events = await communityRemixRepo.readAll();
  const filtered = events.filter(e => e.generatedJobId !== 'job_remix_completed');
  await communityRemixRepo.saveAll(filtered);
});

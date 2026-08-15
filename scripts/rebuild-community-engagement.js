import { communityEngagementService } from '../server/domain/community/CommunityEngagementService.js';
import { communityPostRepo } from '../server/repositories/community/CommunityPostRepository.js';
import { communityRemixRepo } from '../server/repositories/community/RemixEventRepository.js';
import { generationResultRepo } from '../server/repositories/generation/GenerationResultRepository.js';

const posts = await communityPostRepo.readAll();
const remixEvents = await communityRemixRepo.readAll();
let rebuilt = 0;
let migratedRemixes = 0;
let skippedRemixes = 0;

for (const remix of remixEvents) {
  if (!remix.sourcePostId || !remix.generatedJobId || !remix.actorUserId) {
    skippedRemixes += 1;
    continue;
  }
  try {
    const generation = await generationResultRepo.findByIdForOwner(
      remix.generatedJobId,
      remix.actorUserId
    );
    if (!generation || generation.status !== 'completed') {
      skippedRemixes += 1;
      continue;
    }
    const result = await communityEngagementService.recordSuccessfulRemix({
      postId: remix.sourcePostId,
      generatedJobId: remix.generatedJobId,
      templateId: remix.templateId || remix.sourcePostId,
      requestId: `remix_backfill:${remix.id}`
    }, {
      userId: remix.actorUserId,
      username: remix.actorUsername || null,
      role: 'user'
    });
    if (result.created) migratedRemixes += 1;
  } catch {
    skippedRemixes += 1;
  }
}

for (const post of posts) {
  if (!post.id) continue;
  await communityEngagementService.reconcile(post.id);
  rebuilt += 1;
}

console.log(
  `Rebuilt ${rebuilt} Community posts; migrated ${migratedRemixes} remix events; skipped ${skippedRemixes}.`
);

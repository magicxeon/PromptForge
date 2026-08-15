import {
  assertActorContext,
  RepositoryContractError
} from '../../repositories/repositoryContracts.js';
import { communityPostRepo } from '../../repositories/community/CommunityPostRepository.js';
import { creatorProfileService } from './CreatorProfileService.js';
import { communityClassificationService } from './CommunityClassificationService.js';
import { buildCommunityPostPublicView } from './communityPostPublicView.js';

export class CommunityComparisonShareService {
  constructor({
    comparisonOrchestrator,
    postRepository = communityPostRepo,
    profileService = creatorProfileService,
    classificationService = communityClassificationService
  } = {}) {
    this.comparisonOrchestrator = comparisonOrchestrator;
    this.postRepository = postRepository;
    this.profileService = profileService;
    this.classificationService = classificationService;
  }

  async publish(setId, input = {}, actorContext) {
    const actor = assertActorContext(actorContext);
    const set = await this.comparisonOrchestrator.get(setId, actor);
    const run = [...(set?.runs || [])].reverse().find(candidate => {
      const completedSlots = (candidate?.slots || []).filter(slot =>
        slot.status === 'completed' && typeof slot.result?.imageUrl === 'string'
      );
      return ['completed', 'partially_completed'].includes(candidate?.status)
        && completedSlots.length >= 2;
    });
    const slots = (run?.slots || []).filter(slot =>
      slot.status === 'completed' && typeof slot.result?.imageUrl === 'string'
    );
    if (!run || !['completed', 'partially_completed'].includes(run.status) || slots.length < 2) {
      throw new RepositoryContractError(
        'community_comparison_incomplete',
        'At least two completed comparison results are required.',
        409
      );
    }
    const existing = (await this.postRepository.readAll()).find(post =>
      post.ownerUserId === actor.userId
      && post.sourceComparisonSetId === set.id
      && post.status !== 'removed'
    );
    if (existing) {
      throw new RepositoryContractError(
        'community_comparison_already_shared',
        'This comparison is already shared.',
        409
      );
    }
    const profile = await this.profileService.ensureProfileForActor(actor);
    const primary = slots.find(slot => slot.jobId === set.winnerJobId) || slots[0];
    const generationLike = {
      prompt: run.sourcePrompt,
      mode: run.configurationSnapshot?.mode,
      selections: run.configurationSnapshot?.selections
    };
    const classification = await this.classificationService.classifyGeneration(generationLike);
    const taxonomy = await this.classificationService.preparePublishTaxonomy(classification, {
      officialTags: input.officialTags,
      customTags: input.customTags
    });
    const comparisonSnapshot = {
      schemaVersion: 1,
      criteria: String(input.criteria || '').trim().slice(0, 240) || null,
      slots: slots.map(slot => ({
        slotId: slot.id,
        position: slot.position,
        providerDisplayName: slot.providerDisplayName,
        modelDisplayName: slot.modelDisplayName,
        imageUrl: slot.result.imageUrl,
        generationDuration: slot.result.generationDuration || null
      }))
    };
    const post = await this.postRepository.create({
      title: String(input.title || set.name || 'AI model comparison').trim().slice(0, 120),
      description: String(input.description || set.description || '').trim().slice(0, 1000),
      postType: 'comparison',
      creatorProfileId: profile.id,
      sourceComparisonSetId: set.id,
      imageUrl: primary.result.imageUrl,
      thumbnailUrl: primary.result.imageUrl,
      promptVisibility: input.promptVisibility === 'private' ? 'private' : 'full',
      sharedPromptSnapshot: {
        schemaVersion: 1,
        authoringMode: 'guided',
        source: 'comparison',
        publicPromptText: input.promptVisibility === 'private'
          ? null
          : String(run.sourcePrompt || '')
      },
      workflowSnapshot: { comparison: comparisonSnapshot },
      comparisonSnapshot,
      visibility: 'public',
      reusePolicy: 'view_only',
      ...taxonomy
    }, actor);
    return {
      ...buildCommunityPostPublicView(post),
      viewer: { isOwner: true }
    };
  }
}
